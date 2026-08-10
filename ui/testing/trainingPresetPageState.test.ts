import assert from 'node:assert/strict';
import { createTrainingPresetPageState, trainingPresetPageReducer } from '../src/app/jobs/new/trainingPresetPageState';
import { canSaveTrainingJob, removeArchivedPresetSourcesFromClone } from '../src/helpers/jobDatasetPresetClient';
import type { JobConfig } from '../src/types';

const validJob = { config: { process: [{ datasets: [{ folder_path: '/live' }] }] } } as JobConfig;

let edit = createTrainingPresetPageState('edit:job-1');
assert.equal(edit.presetReady, false, 'edit presets stay disabled before hydration');
assert.equal(canSaveTrainingJob(edit.presetReady, validJob), false, 'save is blocked during edit hydration');
edit = trainingPresetPageReducer(edit, { type: 'external-load-succeeded', sourceKey: 'edit:job-1' });
assert.equal(edit.presetReady, true, 'edit presets enable after hydration');
assert.equal(canSaveTrainingJob(edit.presetReady, validJob), true, 'save is allowed after successful hydration');
assert.equal(edit.generation, 1);

let clone = createTrainingPresetPageState('clone:job-2');
const pendingCloneImport = trainingPresetPageReducer(clone, { type: 'import-started' });
assert.equal(pendingCloneImport, clone, 'import cannot start while clone hydration is pending');
clone = trainingPresetPageReducer(clone, {
  type: 'external-load-failed',
  sourceKey: 'clone:job-2',
  error: 'Unable to load training job for cloning.',
});
assert.equal(clone.presetReady, false, 'failed clone hydration remains disabled');
assert.equal(canSaveTrainingJob(clone.presetReady, validJob), false, 'save remains blocked after hydration failure');
assert.match(clone.loadError ?? '', /unable to load/i);
const staleClone = trainingPresetPageReducer(clone, {
  type: 'external-load-succeeded',
  sourceKey: 'clone:old-job',
});
assert.deepEqual(staleClone, clone, 'stale fetch completion must not hydrate a different route');

let fresh = createTrainingPresetPageState('new');
assert.equal(fresh.presetReady, false, 'new presets wait for automatic initialization');
fresh = trainingPresetPageReducer(fresh, { type: 'new-job-initialized', sourceKey: 'new' });
assert.equal(fresh.presetReady, true);
assert.equal(fresh.generation, 0, 'initialization is not an external replacement');

const beforeImport = fresh;
const importing = trainingPresetPageReducer(fresh, { type: 'import-started' });
assert.equal(importing.presetReady, false, 'preset actions are disabled while an import is pending');
const overlappingImport = trainingPresetPageReducer(importing, { type: 'import-started' });
assert.equal(overlappingImport.readyBeforeImport, true, 'a newer import retains readiness from before imports began');
const failedImport = trainingPresetPageReducer(importing, { type: 'import-failed' });
assert.equal(failedImport.presetReady, true, 'failed import restores prior readiness');
assert.equal(failedImport.generation, beforeImport.generation, 'failed import does not reset the preset session');

const successfulImport = trainingPresetPageReducer(importing, { type: 'import-succeeded' });
assert.equal(successfulImport.presetReady, true);
assert.equal(successfulImport.generation, beforeImport.generation + 1, 'successful import resets the preset session');
assert.equal(successfulImport.loadError, null);

const afterPresetApply = trainingPresetPageReducer(successfulImport, { type: 'preset-applied' });
assert.equal(afterPresetApply, successfulImport, 'preset apply must not reset its own session generation');

const archivedClone = {
  config: { process: [{ datasets: [{ folder_path: '/managed', dataset_preset: { preset_id: 'archived' } }] }] },
} as JobConfig;
let cloneHydration = createTrainingPresetPageState('clone:archived');
const cloneAvailability = removeArchivedPresetSourcesFromClone(archivedClone, async id => ({
  id,
  archived_at: '2026-08-03T00:00:00.000Z',
}));
assert.equal(cloneHydration.presetReady, false, 'clone stays blocked while preset availability is pending');
void cloneAvailability
  .then(sanitizedClone => {
    cloneHydration = trainingPresetPageReducer(cloneHydration, {
      type: 'external-load-succeeded', sourceKey: 'clone:archived',
    });
    assert.equal(sanitizedClone.config.process[0].datasets[0].folder_path, '', 'archived source clears before readiness');
    assert.equal(canSaveTrainingJob(cloneHydration.presetReady, sanitizedClone), false, 'cleared source still blocks save');
    console.log('training preset page state tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
