import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createDatasetPresetSnapshotStore } from '@/server/datasetPresetSnapshotService';
import { prepareJobDatasetPresetsForTraining } from '@/server/jobDatasetPresetService';
import { createJobDatasetVersionPrismaStore } from '@/server/jobDatasetPresetPrismaStore';
import { classifyQueuePreflightError, prepareAndQueueJob } from '@/server/jobStartOrchestration';
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
      async mutateQueue() {
        await prisma.$transaction(async transaction => {
          const highest = await transaction.job.aggregate({ _max: { queue_position: true } });
          const queuePosition = (highest._max.queue_position || 0) + 1000;
          const queue = await transaction.queue.findFirst({ where: { gpu_ids: job.gpu_ids } });
          if (!queue) {
            await transaction.queue.create({ data: { gpu_ids: job.gpu_ids, is_running: false } });
          }
          await transaction.job.update({
            where: { id: jobID },
            data: {
              queue_position: queuePosition,
              status: 'queued',
              stop: false,
              return_to_queue: false,
              info: 'Job queued',
            },
          });
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
