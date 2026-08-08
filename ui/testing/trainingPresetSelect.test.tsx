import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JobConfig } from '../src/types';
import { sanitizeTrainingPreset, type TrainingPresetRecord } from '../src/helpers/trainingPresets';
import {
  PRESET_ACTION_DELETE,
  PRESET_ACTION_SAVE,
  PRESET_ACTION_UNDO,
  PRESET_ACTION_UPDATE,
  TrainingPresetSelect,
  createTrainingPreset,
  createTrainingPresetActionLock,
  deleteTrainingPreset,
  deleteTrainingPresetAndRefresh,
  extractTrainingPresetApiError,
  handleTrainingPresetSelection,
  parseTrainingPresetSelection,
  preparePresetApplication,
  presetValue,
  reconcileSelectedPresetId,
  restorePresetUndo,
  sortTrainingPresetRecords,
  updateTrainingPreset,
  validateTrainingPresetListResponse,
} from '../src/components/TrainingPresetSelect';

function jobFixture(steps = 100): JobConfig {
  return {
    job: 'extension',
    config: {
      name: 'job',
      process: [
        {
          type: 'diffusion_trainer',
          training_folder: '/output',
          device: 'cuda:0',
          trigger_word: 'TOK',
          datasets: [],
          train: { steps },
          save: {},
          model: { name_or_path: 'model' },
          sample: { samples: [] },
        },
      ],
    },
    meta: { name: '[name]', version: '1' },
  } as unknown as JobConfig;
}

function record(id: string, name: string, steps = 200): TrainingPresetRecord {
  return {
    id,
    name,
    schema_version: 1,
    snapshot: sanitizeTrainingPreset(jobFixture(steps)),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

assert.deepEqual(parseTrainingPresetSelection(presetValue('id:with/punctuation?!')), {
  type: 'preset',
  id: 'id:with/punctuation?!',
});
assert.deepEqual(parseTrainingPresetSelection(PRESET_ACTION_SAVE), { type: 'save' });
assert.deepEqual(parseTrainingPresetSelection(PRESET_ACTION_UPDATE), { type: 'update' });
assert.deepEqual(parseTrainingPresetSelection(PRESET_ACTION_DELETE), { type: 'delete' });
assert.deepEqual(parseTrainingPresetSelection(PRESET_ACTION_UNDO), { type: 'undo' });
for (const value of ['', 'preset:', 'action:wat', 'wat', ' save ']) {
  assert.deepEqual(parseTrainingPresetSelection(value), { type: 'none' });
}

const actionTarget = { value: PRESET_ACTION_DELETE };
let dispatchedWhileShowing = '';
handleTrainingPresetSelection(actionTarget, presetValue('still-selected'), selection => {
  assert.deepEqual(selection, { type: 'delete' });
  dispatchedWhileShowing = actionTarget.value;
});
assert.equal(dispatchedWhileShowing, presetValue('still-selected'));

const unsorted = [record('z', 'beta'), record('b', 'Alpha'), record('a', 'alpha')];
const originalOrder = unsorted.map(item => item.id);
const markup = renderToStaticMarkup(
  <TrainingPresetSelect presets={unsorted} selectedPresetId="b" canUndo disabled={false} onSelect={() => undefined} />,
);
assert.deepEqual(
  unsorted.map(item => item.id),
  originalOrder,
  'render must not mutate presets',
);
assert.match(markup, /aria-label="Training preset"/);
assert.match(markup, /<span class="sr-only">Training preset<\/span>/);
assert.match(markup, /w-32 sm:w-48/);
assert.doesNotMatch(markup, /hidden sm:/);
assert.match(markup, /<option value="">Preset<\/option>/);
assert.match(markup, /<optgroup label="Saved presets">/);
assert.match(markup, /<optgroup label="Actions">/);
assert.ok(markup.indexOf('>Alpha<') < markup.indexOf('>alpha<'));
assert.ok(markup.indexOf('>alpha<') < markup.indexOf('>beta<'));
assert.match(markup, /value="action:save">Save preset…/);
assert.match(markup, /value="action:update">Update preset…/);
assert.match(markup, /value="action:delete">Delete preset…/);
assert.match(markup, /value="action:undo">Undo preset/);
assert.doesNotMatch(markup, /value="action:update" disabled=""/);

const unavailableMarkup = renderToStaticMarkup(
  <TrainingPresetSelect
    presets={unsorted}
    selectedPresetId={null}
    canUndo={false}
    disabled={false}
    onSelect={() => undefined}
  />,
);
assert.match(unavailableMarkup, /value="action:update" disabled=""/);
assert.match(unavailableMarkup, /value="action:delete" disabled=""/);
assert.doesNotMatch(unavailableMarkup, /action:undo/);
assert.doesNotMatch(unavailableMarkup, /value="action:save" disabled/);

const disabledMarkup = renderToStaticMarkup(
  <TrainingPresetSelect presets={[]} selectedPresetId={null} canUndo={false} disabled onSelect={() => undefined} />,
);
assert.match(disabledMarkup, /<select[^>]*disabled=""/);

assert.deepEqual(
  sortTrainingPresetRecords(unsorted).map(item => item.id),
  ['b', 'a', 'z'],
);
assert.deepEqual(
  originalOrder,
  unsorted.map(item => item.id),
);
assert.deepEqual(
  validateTrainingPresetListResponse({ presets: unsorted }).map(item => item.id),
  ['b', 'a', 'z'],
);
for (const malformed of [null, {}, { presets: 'no' }, { presets: [{ id: '', name: 'x', snapshot: {} }] }]) {
  assert.throws(() => validateTrainingPresetListResponse(malformed), /training preset/i);
}
assert.throws(
  () => validateTrainingPresetListResponse({ presets: [{ ...record('bad', 'Bad'), snapshot: {} }] }),
  /snapshot/i,
);
assert.equal(reconcileSelectedPresetId('b', unsorted), 'b');
assert.equal(reconcileSelectedPresetId('missing', unsorted), null);
assert.equal(reconcileSelectedPresetId(null, unsorted), null);

const current = jobFixture(100);
const applied = preparePresetApplication(current, record('p', 'Preset', 777).snapshot, value => value);
assert.equal(applied.jobConfig.config.process[0].train.steps, 777);
assert.equal(applied.undoConfig.config.process[0].train.steps, 100);
(current.config.process[0].train as { steps: number }).steps = 300;
assert.equal(applied.undoConfig.config.process[0].train.steps, 100, 'undo must be isolated from current config');

const beforeFailure = jobFixture(123);
assert.throws(() => preparePresetApplication(beforeFailure, { schema_version: 1 }, value => value), /snapshot|config/i);
assert.equal(beforeFailure.config.process[0].train.steps, 123);

const undo = jobFixture(456);
let restored: JobConfig | undefined;
assert.equal(
  restorePresetUndo(undo, value => (restored = value)),
  null,
);
assert.equal(restored?.config.process[0].train.steps, 456);
assert.notEqual(restored, undo);
(restored!.config.process[0].train as { steps: number }).steps = 999;
assert.equal(undo.config.process[0].train.steps, 456);
assert.throws(
  () =>
    restorePresetUndo(undo, () => {
      throw new Error('consumer failed');
    }),
  /consumer failed/,
);
assert.equal(undo.config.process[0].train.steps, 456);

assert.equal(
  extractTrainingPresetApiError({ response: { data: { error: '  Duplicate preset  ' } } }, 'Save failed'),
  'Duplicate preset',
);
assert.equal(extractTrainingPresetApiError({ response: { data: { error: '   ' } } }, 'Save failed'), 'Save failed');
assert.equal(
  extractTrainingPresetApiError({ response: { data: { error: { stack: 'secret' } } } }, 'Save failed'),
  'Save failed',
);
assert.equal(extractTrainingPresetApiError(new Error('raw stack'), 'Save failed'), 'Save failed');

const calls: Array<{ method: string; url: string; body?: unknown }> = [];
const returned = record('new', 'Server Name');
const api = {
  post: async (url: string, body: unknown) => {
    calls.push({ method: 'post', url, body });
    return { data: returned };
  },
  put: async (url: string, body: unknown) => {
    calls.push({ method: 'put', url, body });
    return { data: returned };
  },
  delete: async (url: string) => {
    calls.push({ method: 'delete', url });
    return { data: { ok: true } };
  },
};
async function testRequestContracts(): Promise<void> {
  assert.equal((await createTrainingPreset(api, ' Named ', current)).id, 'new');
  assert.equal((await updateTrainingPreset(api, 'a:b/c', current)).id, 'new');
  await deleteTrainingPreset(api, 'a:b/c');
  assert.deepEqual(calls, [
    { method: 'post', url: '/api/training-presets', body: { name: 'Named', job_config: current } },
    { method: 'put', url: '/api/training-presets/a%3Ab%2Fc', body: { job_config: current } },
    { method: 'delete', url: '/api/training-presets/a%3Ab%2Fc' },
  ]);

  const deleted = record('deleted', 'Deleted');
  const stale = record('stale', 'Stale');
  const concurrent = record('concurrent', 'Concurrent');
  const orchestrationCalls: string[] = [];
  const jobBeforeDelete = jobFixture(501);
  const undoBeforeDelete = jobFixture(502);
  const refreshed = await deleteTrainingPresetAndRefresh(
    {
      delete: async url => {
        orchestrationCalls.push(`DELETE ${url}`);
        return { data: { ok: true } };
      },
      get: async url => {
        orchestrationCalls.push(`GET ${url}`);
        return { data: { presets: [concurrent] } };
      },
    },
    createTrainingPresetActionLock(),
    deleted.id,
    {
      presets: [deleted, stale],
      selectedPresetId: deleted.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
  );
  assert.deepEqual(orchestrationCalls, ['DELETE /api/training-presets/deleted', 'GET /api/training-presets']);
  assert.equal(refreshed.status, 'refreshed');
  if (refreshed.status === 'refreshed') {
    assert.deepEqual(
      refreshed.state.presets.map(item => item.id),
      ['concurrent'],
    );
    assert.equal(refreshed.state.selectedPresetId, null);
    assert.equal(refreshed.state.jobConfig, jobBeforeDelete);
    assert.equal(refreshed.state.undoConfig, undoBeforeDelete);
  }
  assert.equal(jobBeforeDelete.config.process[0].train.steps, 501);
  assert.equal(undoBeforeDelete.config.process[0].train.steps, 502);

  const reconciled = await deleteTrainingPresetAndRefresh(
    {
      delete: async () => ({ data: { ok: true } }),
      get: async () => ({ data: { presets: [concurrent] } }),
    },
    createTrainingPresetActionLock(),
    deleted.id,
    {
      presets: [deleted, stale],
      selectedPresetId: stale.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
  );
  assert.equal(reconciled.status === 'refreshed' ? reconciled.state.selectedPresetId : 'wrong-status', null);

  const refreshFailed = await deleteTrainingPresetAndRefresh(
    {
      delete: async () => ({ data: { ok: true } }),
      get: async () => {
        throw { response: { data: { error: 'List temporarily unavailable' } } };
      },
    },
    createTrainingPresetActionLock(),
    deleted.id,
    {
      presets: [deleted, stale],
      selectedPresetId: deleted.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
  );
  assert.equal(refreshFailed.status, 'refresh-failed');
  if (refreshFailed.status === 'refresh-failed') {
    assert.deepEqual(
      refreshFailed.state.presets.map(item => item.id),
      ['stale'],
    );
    assert.equal(refreshFailed.state.selectedPresetId, null);
    assert.equal(refreshFailed.state.jobConfig, jobBeforeDelete);
    assert.equal(refreshFailed.state.undoConfig, undoBeforeDelete);
    assert.equal(refreshFailed.error, 'List temporarily unavailable');
    assert.equal(refreshFailed.retryable, true);
  }

  let releaseDelete!: () => void;
  const deleteStarted = new Promise<void>(resolve => {
    releaseDelete = resolve;
  });
  let concurrentDeleteCalls = 0;
  const lockedApi = {
    delete: async () => {
      concurrentDeleteCalls += 1;
      await deleteStarted;
      return { data: { ok: true } };
    },
    get: async () => ({ data: { presets: [] } }),
  };
  const sharedLock = createTrainingPresetActionLock();
  const firstDelete = deleteTrainingPresetAndRefresh(lockedApi, sharedLock, deleted.id, {
    presets: [deleted],
    selectedPresetId: deleted.id,
    jobConfig: jobBeforeDelete,
    undoConfig: undoBeforeDelete,
  });
  await Promise.resolve();
  const blockedDelete = await deleteTrainingPresetAndRefresh(lockedApi, sharedLock, stale.id, {
    presets: [stale],
    selectedPresetId: stale.id,
    jobConfig: jobBeforeDelete,
    undoConfig: undoBeforeDelete,
  });
  assert.equal(blockedDelete.status, 'busy');
  assert.equal(concurrentDeleteCalls, 1);
  releaseDelete();
  assert.equal((await firstDelete).status, 'refreshed');
}

testRequestContracts()
  .then(() => console.log('training preset select tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
