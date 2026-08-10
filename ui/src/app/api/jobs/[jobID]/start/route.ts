import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createDatasetPresetSnapshotStore } from '@/server/datasetPresetSnapshotService';
import { prepareJobDatasetPresetsForTraining } from '@/server/jobDatasetPresetService';
import { createJobDatasetVersionPrismaStore } from '@/server/jobDatasetPresetPrismaStore';
import {
  classifyQueuePreflightError,
  prepareAndQueueJob,
  QueueRevisionConflictError,
} from '@/server/jobStartOrchestration';
import { getDataRoot } from '@/server/settings';

const versions = createJobDatasetVersionPrismaStore(prisma);

export async function GET(request: NextRequest, { params }: { params: { jobID: string } }) {
  const { jobID } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobID },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  try {
    await prepareAndQueueJob(job, {
      async prepare(jobConfig) {
        return prepareJobDatasetPresetsForTraining(jobConfig, {
          versions,
          snapshots: createDatasetPresetSnapshotStore(await getDataRoot()),
        });
      },
      async mutateQueue(attempt) {
        await prisma.$transaction(async transaction => {
          const highest = await transaction.job.aggregate({ _max: { queue_position: true } });
          const queuePosition = (highest._max.queue_position || 0) + 1000;
          const queued = await transaction.job.updateMany({
            where: {
              id: attempt.id,
              updated_at: attempt.updated_at,
              job_config: attempt.job_config,
              name: attempt.name,
              gpu_ids: attempt.gpu_ids,
              queue_position: attempt.queue_position,
              status: attempt.status,
              stop: attempt.stop,
              return_to_queue: attempt.return_to_queue,
            },
            data: {
              queue_position: queuePosition,
              status: 'queued',
              stop: false,
              return_to_queue: false,
              info: 'Job queued',
            },
          });
          if (queued.count !== 1) throw new QueueRevisionConflictError();
          const queue = await transaction.queue.findFirst({ where: { gpu_ids: attempt.gpu_ids } });
          if (!queue) {
            await transaction.queue.create({ data: { gpu_ids: attempt.gpu_ids, is_running: false } });
          }
        });
      },
    });
  } catch (error) {
    const response = classifyQueuePreflightError(error);
    if (response.status === 500) console.error('Unable to queue job after dataset preset preflight:', error);
    return NextResponse.json(response.body, { status: response.status });
  }

  // Return the response immediately
  return NextResponse.json(job);
}
