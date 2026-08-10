import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/server/prisma';
import { isMac } from '@/helpers/basic';
import { cached } from '@/server/apiCache';
import { resolveGpuIds } from '@/server/jobGpu';
import { validateLoaderConfig } from '@/helpers/datasetPresets';
import { createDatasetPresetSnapshotStore } from '@/server/datasetPresetSnapshotService';
import {
  JobDatasetPresetError,
  saveJobWithDatasetUsages,
  type JobDatasetVersionStore,
  type JobWriteStore,
} from '@/server/jobDatasetPresetService';
import type { DatasetPresetVersionRecord } from '@/server/datasetPresetService';
import { getDataRoot } from '@/server/settings';
import type { JobConfig } from '@/types';

const versionForResolutionSelect = {
  id: true,
  preset_id: true,
  version: true,
  source_dataset: true,
  manifest_path: true,
  manifest_sha256: true,
  loader_config: true,
  note: true,
  media_count: true,
  total_bytes: true,
  created_at: true,
  preset: { select: { id: true, name: true, archived_at: true } },
} as const satisfies Prisma.DatasetPresetVersionSelect;

const usageForGetSelect = {
  dataset_index: true,
  preset_version_id: true,
  preset_name: true,
  preset_version: true,
  manifest_sha256: true,
  resolved_loader_config: true,
  preset_version_record: {
    select: {
      source_dataset: true,
      media_count: true,
      total_bytes: true,
      created_at: true,
      note: true,
    },
  },
} as const satisfies Prisma.JobDatasetPresetUsageSelect;

const singleJobInclude = {
  dataset_preset_usages: { orderBy: { dataset_index: 'asc' as const }, select: usageForGetSelect },
} as const satisfies Prisma.JobInclude;

function versionRecord(value: Prisma.DatasetPresetVersionGetPayload<{ select: typeof versionForResolutionSelect }>): DatasetPresetVersionRecord {
  return {
    id: value.id,
    preset_id: value.preset_id,
    version: value.version,
    source_dataset: value.source_dataset,
    manifest_path: value.manifest_path,
    manifest_sha256: value.manifest_sha256,
    loader_config: validateLoaderConfig(JSON.parse(value.loader_config)),
    note: value.note,
    media_count: value.media_count,
    total_bytes: value.total_bytes.toString(),
    created_at: value.created_at.toISOString(),
  };
}

const versions: JobDatasetVersionStore = {
  async getVersionForResolution(versionId) {
    const value = await prisma.datasetPresetVersion.findUnique({
      where: { id: versionId },
      select: versionForResolutionSelect,
    });
    return value === null
      ? null
      : {
          preset: value.preset,
          version: versionRecord(value),
        };
  },
  async existingUsage(jobId, datasetIndex) {
    return prisma.jobDatasetPresetUsage.findUnique({
      where: { job_id_dataset_index: { job_id: jobId, dataset_index: datasetIndex } },
      select: { preset_version_id: true },
    });
  },
};

const jobs: JobWriteStore = {
  transaction(operation) {
    return prisma.$transaction(async transaction => operation({
      async createOrUpdateJob(input) {
        const optional = {
          ...(input.job_ref === undefined ? {} : { job_ref: input.job_ref }),
          ...(input.job_type === undefined ? {} : { job_type: input.job_type }),
        };
        if (input.id !== null && !input.clone) {
          return transaction.job.update({
            where: { id: input.id },
            data: {
              name: input.name,
              gpu_ids: input.gpu_ids,
              job_config: JSON.stringify(input.job_config),
              ...optional,
            },
          });
        }
        const highest = await transaction.job.aggregate({ _max: { queue_position: true } });
        return transaction.job.create({
          data: {
            name: input.name,
            gpu_ids: input.gpu_ids,
            job_config: JSON.stringify(input.job_config),
            queue_position: (highest._max.queue_position ?? 0) + 1000,
            ...optional,
          },
        });
      },
      async deleteUsages(jobId) {
        await transaction.jobDatasetPresetUsage.deleteMany({ where: { job_id: jobId } });
      },
      async createUsages(jobId, usages) {
        if (usages.length === 0) return;
        await transaction.jobDatasetPresetUsage.createMany({
          data: usages.map(usage => ({
            job_id: jobId,
            preset_version_id: usage.preset_version_id,
            dataset_index: usage.dataset_index,
            preset_name: usage.preset_name,
            preset_version: usage.preset_version,
            manifest_sha256: usage.manifest_sha256,
            resolved_loader_config: JSON.stringify(usage.resolved_loader_config),
          })),
        });
      },
    }));
  },
};

function singleJobResponse(job: Prisma.JobGetPayload<{ include: typeof singleJobInclude }> | null) {
  if (job === null) return null;
  return {
    ...job,
    dataset_preset_usages: job.dataset_preset_usages.map(usage => ({
      dataset_index: usage.dataset_index,
      preset_version_id: usage.preset_version_id,
      preset_name: usage.preset_name,
      preset_version: usage.preset_version,
      manifest_sha256: usage.manifest_sha256,
      resolved_loader_config: validateLoaderConfig(JSON.parse(usage.resolved_loader_config)),
      source_dataset: usage.preset_version_record.source_dataset,
      media_count: usage.preset_version_record.media_count,
      total_bytes: usage.preset_version_record.total_bytes.toString(),
      version_created_at: usage.preset_version_record.created_at.toISOString(),
      note: usage.preset_version_record.note,
    })),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(body: Record<string, unknown>, key: 'job_ref' | 'job_type'): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
  const value = body[key];
  if (typeof value !== 'string') throw new JobDatasetPresetError('Job request is invalid');
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const job_ref = searchParams.get('job_ref');
  const job_type = searchParams.get('job_type');
  const only_active = searchParams.get('only_active');

  try {
    if (id) {
      const job = await prisma.job.findUnique({ where: { id }, include: singleJobInclude });
      return NextResponse.json(singleJobResponse(job));
    }
    if (job_ref) {
      const job = await prisma.job.findFirst({
        where: { job_ref },
        orderBy: { updated_at: 'desc' },
        include: singleJobInclude,
      });
      return NextResponse.json(singleJobResponse(job));
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
