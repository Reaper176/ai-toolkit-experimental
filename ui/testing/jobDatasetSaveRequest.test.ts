import assert from 'node:assert/strict';
import { buildTrainingJobSaveRequest } from '../src/helpers/jobDatasetPresetClient';
import type { JobConfig } from '../src/types';

const config = { config: { name: 'training' } } as JobConfig;

const presetConfig = { config: { process: [{ datasets: [{
  folder_path: '/browser/stale', mask_path: '/browser/attack',
  dataset_preset: { version_id: 'v1', preset_id: 'p1', preset_name: 'Preset', version: 1, manifest_sha256: 'a'.repeat(64) },
}]}] } } as unknown as JobConfig;
const presetRequest = buildTrainingJobSaveRequest({ runId: null, cloneId: null, name: 'preset', gpuIds: '0', jobConfig: presetConfig });
assert.equal(presetRequest.job_config.config.process[0].datasets[0].mask_path, null,
  'client never submits a browser-derived mask path for preset resolution');
assert.equal(presetConfig.config.process[0].datasets[0].mask_path, '/browser/attack', 'request building does not mutate UI state');
const liveConfig = { config: { process: [{ datasets: [{
  folder_path: '/datasets/live', mask_path: '/browser/live-attack', resolved_mask_available: true,
}] }] } } as unknown as JobConfig;
const liveRequest = buildTrainingJobSaveRequest({ runId: null, cloneId: null, name: 'live', gpuIds: '0', jobConfig: liveConfig });
assert.equal(liveRequest.job_config.config.process[0].datasets[0].mask_path, null,
  'browser requests cannot submit explicit live mask paths');
assert.equal('resolved_mask_available' in liveRequest.job_config.config.process[0].datasets[0], false,
  'UI-only live mask status is not persisted');

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
