import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/server/prisma';
import { isMac } from '@/helpers/basic';
import { cached } from '@/server/apiCache';
import { resolveGpuIds } from '@/server/jobGpu';
import { createDatasetPresetSnapshotStore } from '@/server/datasetPresetSnapshotService';
import { JobDatasetPresetError, saveJobWithDatasetUsages } from '@/server/jobDatasetPresetService';
import {
  createJobDatasetVersionPrismaStore,
  createJobWritePrismaStore,
  jobWithDatasetPresetUsagesInclude,
  jobWithDatasetPresetUsagesResponse,
} from '@/server/jobDatasetPresetPrismaStore';
import { getDataRoot } from '@/server/settings';
import type { JobConfig } from '@/types';

const versions = createJobDatasetVersionPrismaStore(prisma);
const jobs = createJobWritePrismaStore(prisma);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(body: Record<string, unknown>, key: 'job_ref' | 'job_type'): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
  const value = body[key];
  if (typeof value !== 'string') throw new JobDatasetPresetError('Job request is invalid');
  return value;
}

function hasClientMaskPath(jobConfig: unknown): boolean {
  if (!isPlainObject(jobConfig) || !isPlainObject(jobConfig.config) || !Array.isArray(jobConfig.config.process)) return false;
  return jobConfig.config.process.some(process => isPlainObject(process) && Array.isArray(process.datasets) &&
    process.datasets.some(dataset => isPlainObject(dataset) && dataset.mask_path !== null && dataset.mask_path !== undefined && dataset.mask_path !== ''));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const job_ref = searchParams.get('job_ref');
  const job_type = searchParams.get('job_type');
  const only_active = searchParams.get('only_active');

  try {
    if (id) {
      const job = await prisma.job.findUnique({ where: { id }, include: jobWithDatasetPresetUsagesInclude });
      return NextResponse.json(jobWithDatasetPresetUsagesResponse(job));
    }
    if (job_ref) {
      const job = await prisma.job.findFirst({
        where: { job_ref },
        orderBy: { updated_at: 'desc' },
        include: jobWithDatasetPresetUsagesInclude,
      });
      return NextResponse.json(jobWithDatasetPresetUsagesResponse(job));
    }

    const where: Prisma.JobWhereInput = {};
    if (job_type) where.job_type = job_type;
    if (only_active === 'true') {
      where.status = { in: ['running', 'queued', 'stopping'] };
      const activeJobs = await cached(
        'jobs-active',
        () => prisma.job.findMany({ where, orderBy: { created_at: 'desc' } }),
        5000,
        { job_type },
      );
      return NextResponse.json({ jobs: activeJobs });
    }

    const allJobs = await prisma.job.findMany({ where, orderBy: { created_at: 'desc' } });
    return NextResponse.json({ jobs: allJobs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch training data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const bodyInput: unknown = await request.json();
    if (!isPlainObject(bodyInput)) return NextResponse.json({ error: 'Invalid job request' }, { status: 400 });
    const body = bodyInput;
    const id = body.id === null || body.id === undefined ? null : body.id;
    if (id !== null && (typeof id !== 'string' || id.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid job request' }, { status: 400 });
    }
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'A job name is required' }, { status: 400 });
    }
    if (!Object.prototype.hasOwnProperty.call(body, 'job_config')) {
      return NextResponse.json({ error: 'A job configuration is required' }, { status: 400 });
    }
    if (hasClientMaskPath(body.job_config)) {
      return NextResponse.json({ error: 'Job dataset preset configuration is invalid' }, { status: 400 });
    }
    const clone = body.clone === undefined ? false : body.clone;
    if (typeof clone !== 'boolean') return NextResponse.json({ error: 'Invalid job request' }, { status: 400 });
    const gpu_ids = resolveGpuIds(body.gpu_ids, isMac());
    if (gpu_ids === null) {
      return NextResponse.json({ error: 'A GPU selection is required' }, { status: 400 });
    }

    const training = await saveJobWithDatasetUsages({
      id,
      clone,
      name: body.name,
      gpu_ids,
      job_config: body.job_config as JobConfig,
      job_ref: optionalString(body, 'job_ref'),
      job_type: optionalString(body, 'job_type'),
      jobs,
      versions,
      snapshots: createDatasetPresetSnapshotStore(await getDataRoot()),
    });
    return NextResponse.json(training);
  } catch (error: unknown) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Job name already exists' }, { status: 409 });
    }
    if (error instanceof JobDatasetPresetError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Job dataset preset configuration is invalid' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to save training data' }, { status: 500 });
  }
}
