import assert from 'node:assert/strict';
import { createTrainingPresetPageState, trainingPresetPageReducer } from '../src/app/jobs/new/trainingPresetPageState';

let edit = createTrainingPresetPageState('edit:job-1');
assert.equal(edit.presetReady, false, 'edit presets stay disabled before hydration');
edit = trainingPresetPageReducer(edit, { type: 'external-load-succeeded', sourceKey: 'edit:job-1' });
assert.equal(edit.presetReady, true, 'edit presets enable after hydration');
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

console.log('training preset page state tests passed');
