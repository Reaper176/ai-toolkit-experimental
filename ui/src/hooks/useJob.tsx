'use client';

import { useCallback, useRef, useState } from 'react';
import { Job } from '@prisma/client';
import type { JobDatasetPresetUsageView } from '@/types';
import { apiClient } from '@/utils/api';
import usePollLoop from '@/hooks/usePollLoop';

export type JobWithDatasetPresetUsages = Job & { dataset_preset_usages?: JobDatasetPresetUsageView[] };

export default function useJob(jobID: string, reloadInterval: null | number = null) {
  const [jobState, setJobState] = useState<{ jobID: string; job: JobWithDatasetPresetUsages | null }>({
    jobID,
    job: null,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const requestSequence = useRef(0);
  const activeJobID = useRef(jobID);
  activeJobID.current = jobID;
  const job = jobState.jobID === jobID ? jobState.job : null;

  const refreshJob = useCallback(() => {
    const requestedJobID = jobID;
    const sequence = ++requestSequence.current;
    setStatus('loading');
    return apiClient
      .get(`/api/jobs?id=${requestedJobID}`)
      .then(res => res.data)
      .then((data: JobWithDatasetPresetUsages) => {
        if (activeJobID.current !== requestedJobID || sequence !== requestSequence.current) return;
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
      .catch(error => {
        if (activeJobID.current !== requestedJobID || sequence !== requestSequence.current) return;
        console.error('Error fetching datasets:', error);
        setStatus('error');
      });
  }, [jobID]);

  usePollLoop(refreshJob, reloadInterval, [jobID]);

  const setJob = useCallback(
    (next: JobWithDatasetPresetUsages | null) => setJobState({ jobID: activeJobID.current, job: next }),
    [],
  );

  return { job, setJob, status, refreshJob };
}
