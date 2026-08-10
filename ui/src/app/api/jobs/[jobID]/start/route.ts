import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createDatasetPresetSnapshotStore } from '@/server/datasetPresetSnapshotService';
import {
  JobDatasetPresetError,
  JobDatasetPresetPreflightError,
  preflightJobDatasetPresets,
} from '@/server/jobDatasetPresetService';
import { createJobDatasetVersionPrismaStore } from '@/server/jobDatasetPresetPrismaStore';
import { getDataRoot } from '@/server/settings';
import type { JobConfig } from '@/types';

const versions = createJobDatasetVersionPrismaStore(prisma);

export async function GET(request: NextRequest, { params }: { params: { jobID: string } }) {
  const { jobID } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobID },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  let jobConfig: JobConfig;
  try {
    jobConfig = JSON.parse(job.job_config) as JobConfig;
  } catch {
    return NextResponse.json({ error: 'Job configuration is invalid' }, { status: 400 });
  }
  try {
    await preflightJobDatasetPresets(jobConfig, {
      versions,
      snapshots: createDatasetPresetSnapshotStore(await getDataRoot()),
    });
  } catch (error) {
    if (error instanceof JobDatasetPresetPreflightError) {
      return NextResponse.json({
        error: error.message,
        preset: error.preset,
        version: error.version,
        missing: error.missing,
      }, { status: 409 });
    }
    if (error instanceof JobDatasetPresetError) {
      return NextResponse.json({ error: 'Job dataset preset configuration is invalid' }, { status: 400 });
    }
    console.error('Unable to preflight job dataset presets:', error);
    return NextResponse.json({ error: 'Unable to verify job dataset presets' }, { status: 500 });
  }

  // get highest queue position
  const highestQueuePosition = await prisma.job.aggregate({
    _max: {
      queue_position: true,
    },
  });
  const newQueuePosition = (highestQueuePosition._max.queue_position || 0) + 1000;

  await prisma.job.update({
    where: { id: jobID },
    data: { queue_position: newQueuePosition },
  });

  // make sure the queue is running
  const queue = await prisma.queue.findFirst({
    where: {
      gpu_ids: job.gpu_ids,
    },
  });

  // if queue doesn't exist, create it
  if (!queue) {
    await prisma.queue.create({
      data: {
        gpu_ids: job.gpu_ids,
        is_running: false,
      },
    });
  }

  await prisma.job.update({
    where: { id: jobID },
    data: {
      status: 'queued',
      stop: false,
      return_to_queue: false,
      info: 'Job queued',
    },
  });

  // Return the response immediately
  return NextResponse.json(job);
}
