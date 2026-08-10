import type { JobConfig } from '../types';
import { JobDatasetPresetError, JobDatasetPresetPreflightError } from './jobDatasetPresetService';

export interface StoredStartJob {
  id: string;
  job_config: string;
}

export async function prepareAndQueueJob(
  job: StoredStartJob,
  deps: {
    prepare(jobConfig: JobConfig): Promise<JobConfig>;
    nextQueuePosition(): Promise<number>;
    setQueuePosition(position: number): Promise<void>;
    ensureQueue(): Promise<void>;
    markQueued(): Promise<void>;
  },
): Promise<void> {
  const parsed = JSON.parse(job.job_config) as JobConfig;
  await deps.prepare(parsed);
  const position = await deps.nextQueuePosition();
  await deps.setQueuePosition(position);
  await deps.ensureQueue();
  await deps.markQueued();
}

export async function prepareClaimAndLaunchJob(
  job: StoredStartJob,
  deps: {
    prepare(jobConfig: JobConfig): Promise<JobConfig>;
    claim(): Promise<boolean>;
    fail(error: unknown): Promise<boolean>;
    launch(jobConfig: JobConfig): void;
  },
): Promise<'started' | 'cancelled' | 'failed'> {
  let prepared: JobConfig;
  try {
    prepared = await deps.prepare(JSON.parse(job.job_config) as JobConfig);
  } catch (error) {
    return (await deps.fail(error)) ? 'failed' : 'cancelled';
  }
  if (!(await deps.claim())) return 'cancelled';
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
  if (error instanceof SyntaxError || error instanceof JobDatasetPresetError) {
    return { status: 400, body: { error: 'Job dataset preset configuration is invalid' } };
  }
  return { status: 500, body: { error: 'Unable to verify job dataset presets' } };
}
