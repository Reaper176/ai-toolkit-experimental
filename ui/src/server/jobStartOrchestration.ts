import type { JobConfig } from '../types';
import { JobDatasetPresetError, JobDatasetPresetPreflightError } from './jobDatasetPresetService';

export interface StoredStartJob {
  id: string;
  job_config: string;
}

export interface WorkerStartAttempt extends StoredStartJob {
  updated_at: Date;
  name: string;
  gpu_ids: string;
  queue_position: number;
}

export class QueueMutationError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Queue mutation failed', options);
    this.name = 'QueueMutationError';
  }
}

export async function prepareAndQueueJob(
  job: StoredStartJob,
  deps: {
    prepare(jobConfig: JobConfig): Promise<JobConfig>;
    mutateQueue(): Promise<void>;
  },
): Promise<void> {
  const parsed = JSON.parse(job.job_config) as JobConfig;
  await deps.prepare(parsed);
  try {
    await deps.mutateQueue();
  } catch (error) {
    throw new QueueMutationError({ cause: error });
  }
}

export async function prepareClaimAndLaunchJob(
  job: WorkerStartAttempt,
  deps: {
    prepare(jobConfig: JobConfig): Promise<JobConfig>;
    claim(attempt: WorkerStartAttempt): Promise<boolean>;
    fail(error: unknown, attempt: WorkerStartAttempt): Promise<boolean>;
    launch(jobConfig: JobConfig): void;
  },
): Promise<'started' | 'cancelled' | 'failed'> {
  const attempt = Object.freeze({
    id: job.id,
    job_config: job.job_config,
    updated_at: new Date(job.updated_at.getTime()),
    name: job.name,
    gpu_ids: job.gpu_ids,
    queue_position: job.queue_position,
  });
  let prepared: JobConfig;
  try {
    prepared = await deps.prepare(JSON.parse(job.job_config) as JobConfig);
  } catch (error) {
    return (await deps.fail(error, attempt)) ? 'failed' : 'cancelled';
  }
  if (!(await deps.claim(attempt))) return 'cancelled';
  deps.launch(prepared);
  return 'started';
}

export function classifyQueuePreflightError(error: unknown): {
  status: 400 | 409 | 500;
  body: Record<string, unknown>;
} {
  if (error instanceof JobDatasetPresetPreflightError) {
    return {
      status: 409,
      body: { error: error.message, preset: error.preset, version: error.version, missing: error.missing },
    };
  }
  if (error instanceof QueueMutationError) {
    return { status: 500, body: { error: 'Failed to queue job' } };
  }
  if (error instanceof SyntaxError || error instanceof JobDatasetPresetError) {
    return { status: 400, body: { error: 'Job dataset preset configuration is invalid' } };
  }
  return { status: 500, body: { error: 'Unable to verify job dataset presets' } };
}
