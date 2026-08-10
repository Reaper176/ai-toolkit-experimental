'use client';

import { useCallback, useRef, useState } from 'react';
import { Job } from '@prisma/client';
import type { JobDatasetPresetUsageView } from '@/types';
import { apiClient } from '@/utils/api';
import usePollLoop from '@/hooks/usePollLoop';

export type JobWithDatasetPresetUsages = Job & { dataset_preset_usages?: JobDatasetPresetUsageView[] };

function validatedJobResponse(value: unknown, requestedJobID: string): JobWithDatasetPresetUsages | null {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Job response was malformed');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id !== requestedJobID) throw new Error('Job response was malformed');
  if (candidate.dataset_preset_usages !== undefined && !Array.isArray(candidate.dataset_preset_usages)) {
    throw new Error('Job response was malformed');
  }
  return value as JobWithDatasetPresetUsages;
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
