'use client';

import { useCallback, useRef, useState } from 'react';
import { Job } from '@prisma/client';
import type { JobDatasetPresetUsageView } from '@/types';
import { validateLoaderConfig } from '@/helpers/datasetPresetValidation';
import { apiClient } from '@/utils/api';
import usePollLoop from '@/hooks/usePollLoop';

export type JobWithDatasetPresetUsages = Job & { dataset_preset_usages?: JobDatasetPresetUsageView[] };

function plainObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Job response was malformed');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Job response was malformed');
  return value as Record<string, unknown>;
}

function textField(value: unknown, maximum: number, allowEmpty = true): string {
  if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && value.trim().length === 0)) {
    throw new Error('Job response was malformed');
  }
  return value;
}

function safeInteger(value: unknown, nullable = false): number | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Job response was malformed');
  }
  return value;
}

function booleanField(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Job response was malformed');
  return value;
}

function dateField(value: unknown): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : typeof value === 'string' ? new Date(value) : null;
  if (date === null || Number.isNaN(date.getTime())) throw new Error('Job response was malformed');
  return date;
}

function jobConfigField(value: unknown, jobType: string): string {
  const serialized = textField(value, 10_000_000, false);
  let parsed: Record<string, unknown>;
  try {
    parsed = plainObject(JSON.parse(serialized));
    const config = plainObject(parsed.config);
    if (!Array.isArray(config.process) || config.process.length === 0) throw new Error('Job response was malformed');
    const process = plainObject(config.process[0]);
    if (jobType === 'train') {
      const train = plainObject(process.train);
      if (safeInteger(train.steps) === 0) throw new Error('Job response was malformed');
      const sample = plainObject(process.sample);
      if (!Array.isArray(sample.samples) || (sample.prompts !== undefined && !Array.isArray(sample.prompts))) {
        throw new Error('Job response was malformed');
      }
    }
  } catch {
    throw new Error('Job response was malformed');
  }
  return serialized;
}

function usageField(value: unknown): JobDatasetPresetUsageView {
  const usage = plainObject(value);
  const datasetIndex = safeInteger(usage.dataset_index);
  const presetVersion = safeInteger(usage.preset_version);
  const mediaCount = safeInteger(usage.media_count);
  if (datasetIndex === null || presetVersion === null || presetVersion === 0 || mediaCount === null) {
    throw new Error('Job response was malformed');
  }
  const totalBytes = textField(usage.total_bytes, 19, false);
  if (!/^(?:0|[1-9]\d*)$/.test(totalBytes) || BigInt(totalBytes) > BigInt('9223372036854775807')) {
    throw new Error('Job response was malformed');
  }
  const createdAt = textField(usage.version_created_at, 40, false);
  const parsedCreatedAt = new Date(createdAt);
  if (Number.isNaN(parsedCreatedAt.getTime()) || parsedCreatedAt.toISOString() !== createdAt) {
    throw new Error('Job response was malformed');
  }
  const manifestSha256 = textField(usage.manifest_sha256, 64, false);
  if (!/^[0-9a-f]{64}$/.test(manifestSha256)) throw new Error('Job response was malformed');
  const note = usage.note === null ? null : textField(usage.note, 500);
  return {
    dataset_index: datasetIndex,
    preset_version_id: textField(usage.preset_version_id, 200, false),
    preset_name: textField(usage.preset_name, 80, false),
    preset_version: presetVersion,
    manifest_sha256: manifestSha256,
    resolved_loader_config: validateLoaderConfig(usage.resolved_loader_config),
    source_dataset: textField(usage.source_dataset, 240, false),
    media_count: mediaCount,
    total_bytes: totalBytes,
    version_created_at: createdAt,
    note,
  };
}

function validatedJobResponse(value: unknown, requestedJobID: string): JobWithDatasetPresetUsages | null {
  if (value === null) return null;
  const candidate = plainObject(value);
  const id = textField(candidate.id, 200, false);
  if (id !== requestedJobID) throw new Error('Job response was malformed');
  if (candidate.dataset_preset_usages !== undefined && !Array.isArray(candidate.dataset_preset_usages)) {
    throw new Error('Job response was malformed');
  }
  const totalSteps = safeInteger(candidate.total_steps, true);
  const pid = safeInteger(candidate.pid, true);
  const gpuIds = textField(candidate.gpu_ids, 240, false);
  if (gpuIds !== 'mps' && !/^\d+(?:,\s*\d+)*$/.test(gpuIds)) throw new Error('Job response was malformed');
  const jobType = textField(candidate.job_type, 80, false);
  const parsed: JobWithDatasetPresetUsages = {
    id,
    name: textField(candidate.name, 240, false),
    gpu_ids: gpuIds,
    job_config: jobConfigField(candidate.job_config, jobType),
    created_at: dateField(candidate.created_at),
    updated_at: dateField(candidate.updated_at),
    status: textField(candidate.status, 80, false),
    stop: booleanField(candidate.stop),
    return_to_queue: booleanField(candidate.return_to_queue),
    step: safeInteger(candidate.step) as number,
    total_steps: totalSteps,
    info: textField(candidate.info, 10_000),
    speed_string: textField(candidate.speed_string, 1_000),
    queue_position: safeInteger(candidate.queue_position) as number,
    pid,
    job_type: jobType,
    job_ref: candidate.job_ref === null ? null : textField(candidate.job_ref, 10_000),
    save_now: booleanField(candidate.save_now),
    sample_now: booleanField(candidate.sample_now),
  };
  if (candidate.dataset_preset_usages !== undefined) {
    parsed.dataset_preset_usages = candidate.dataset_preset_usages.map(usageField);
  }
  return parsed;
}

export default function useJob(jobID: string, reloadInterval: null | number = null) {
  const [jobState, setJobState] = useState<{ jobID: string; job: JobWithDatasetPresetUsages | null }>({
    jobID,
    job: null,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const activeJobID = useRef(jobID);
  activeJobID.current = jobID;
  const job = jobState.jobID === jobID ? jobState.job : null;

  const refreshJob = useCallback(() => {
    const requestedJobID = jobID;
    const sequence = ++requestSequence.current;
    setStatus('loading');
    setError(null);
    return apiClient
      .get(`/api/jobs?id=${requestedJobID}`)
      .then(res => res.data)
      .then((untrusted: unknown) => {
        if (activeJobID.current !== requestedJobID || sequence !== requestSequence.current) return;
        const data = validatedJobResponse(untrusted, requestedJobID);
        if (data === null) {
          setJobState({ jobID: requestedJobID, job: null });
          setStatus('success');
          return;
        }
        setJobState(previous => ({
          jobID: requestedJobID,
          job: {
            ...data,
            ...(data.dataset_preset_usages === undefined && previous.jobID === requestedJobID
              ? { dataset_preset_usages: previous.job?.dataset_preset_usages }
              : {}),
          },
        }));
        setStatus('success');
      })
      .catch(caught => {
        if (activeJobID.current !== requestedJobID || sequence !== requestSequence.current) return;
        const message = caught instanceof Error ? caught.message.slice(0, 240) : 'Unable to load job';
        setError(message);
        setStatus('error');
      });
  }, [jobID]);

  usePollLoop(refreshJob, reloadInterval, [jobID]);

  const setJob = useCallback(
    (next: JobWithDatasetPresetUsages | null) => setJobState({ jobID: activeJobID.current, job: next }),
    [],
  );

  return { job, setJob, status, error, refreshJob };
}
