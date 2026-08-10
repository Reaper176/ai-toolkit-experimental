import assert from 'node:assert/strict';
import { buildTrainingJobSaveRequest } from '../src/helpers/jobDatasetPresetClient';
import type { JobConfig } from '../src/types';

const config = { config: { name: 'training' } } as JobConfig;

assert.deepEqual(
  buildTrainingJobSaveRequest({ runId: null, cloneId: null, name: 'new', gpuIds: '0', jobConfig: config }),
  { id: null, clone: false, name: 'new', gpu_ids: '0', job_config: config },
  'ordinary new jobs explicitly remain non-clones',
);
assert.deepEqual(
  buildTrainingJobSaveRequest({ runId: 'edit-id', cloneId: null, name: 'edit', gpuIds: '1', jobConfig: config }),
  { id: 'edit-id', clone: false, name: 'edit', gpu_ids: '1', job_config: config },
  'edits preserve their job identity and are not clones',
);
assert.deepEqual(
  buildTrainingJobSaveRequest({ runId: null, cloneId: 'source-id', name: 'copy', gpuIds: '2', jobConfig: config }),
  { id: null, clone: true, name: 'copy', gpu_ids: '2', job_config: config },
  'actual clone mode is explicitly sent without updating the source job',
);

console.log('job dataset save request tests passed');
