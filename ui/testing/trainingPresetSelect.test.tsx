import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JobConfig } from '../src/types';
import {
  sanitizeTrainingPreset,
  type BuiltInTrainingPresetRecord,
  type UserTrainingPresetRecord,
} from '../src/helpers/trainingPresets';
import {
  BUILT_IN_PRESET_ROWS,
  materializeBuiltInTrainingPresetRow,
} from '../src/helpers/builtInTrainingPresetDefinitions';
import {
  CLOSED_TRAINING_PRESET_DIALOG,
  TrainingPresetDialogContent,
  trainingPresetDialogReducer,
} from '../src/components/TrainingPresetDialog';
import {
  PRESET_ACTION_DELETE,
  PRESET_ACTION_SAVE,
  PRESET_ACTION_UNDO,
  PRESET_ACTION_UPDATE,
  TrainingPresetSelect,
  TRAINING_PRESET_REQUEST_TIMEOUT_MS,
  createTrainingPreset,
  createTrainingPresetActionLock,
  createTrainingPresetAndRefresh,
  commitTrainingPresetMutationResult,
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
  updateTrainingPresetAndRefresh,
  validateTrainingPresetRecord,
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

function record(id: string, name: string, steps = 200): UserTrainingPresetRecord {
  return {
    id,
    name,
    source: 'user',
    read_only: false,
    schema_version: 1,
    snapshot: sanitizeTrainingPreset(jobFixture(steps)),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function builtin(index: number, name?: string): BuiltInTrainingPresetRecord {
  const materialized = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[index]);
  return {
    ...materialized,
    ...(name === undefined ? {} : { name }),
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
  <TrainingPresetSelect
    presets={sortTrainingPresetRecords(unsorted)}
    selectedPresetId="b"
    currentModelArch="flux"
    canUndo
    disabled={false}
    onSelect={() => undefined}
  />,
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
assert.match(markup, /<optgroup label="Built-in recipes">/);
assert.match(markup, /<optgroup label="My presets">/);
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
    currentModelArch="flux"
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
  <TrainingPresetSelect
    presets={[]}
    selectedPresetId={null}
    currentModelArch="flux"
    canUndo={false}
    disabled
    onSelect={() => undefined}
  />,
);
assert.match(disabledMarkup, /<select[^>]*disabled=""/);

let dialogState = trainingPresetDialogReducer(CLOSED_TRAINING_PRESET_DIALOG, { type: 'open-save' });
assert.equal(dialogState.kind, 'save');
dialogState = trainingPresetDialogReducer(dialogState, { type: 'set-name', value: '   ' });
dialogState = trainingPresetDialogReducer(dialogState, { type: 'validate-save' });
assert.equal(dialogState.kind, 'save');
assert.match(dialogState.error ?? '', /required/i);
dialogState = trainingPresetDialogReducer(dialogState, {
  type: 'open-update',
  presetId: 'p:1',
  presetName: 'Named preset',
});
assert.equal(dialogState.kind, 'update');
dialogState = trainingPresetDialogReducer(dialogState, { type: 'close' });
assert.deepEqual(dialogState, CLOSED_TRAINING_PRESET_DIALOG);
dialogState = trainingPresetDialogReducer(CLOSED_TRAINING_PRESET_DIALOG, {
  type: 'open-delete',
  presetId: 'p:2',
  presetName: 'Delete me',
});
assert.equal(dialogState.kind, 'delete');
dialogState = trainingPresetDialogReducer(dialogState, { type: 'success' });
assert.deepEqual(dialogState, CLOSED_TRAINING_PRESET_DIALOG);
const saveDialogMarkup = renderToStaticMarkup(
  <TrainingPresetDialogContent
    state={trainingPresetDialogReducer(CLOSED_TRAINING_PRESET_DIALOG, { type: 'open-save' })}
    pending={false}
    onClose={() => undefined}
    onNameChange={() => undefined}
    onConfirm={() => undefined}
  />,
);
assert.match(saveDialogMarkup, /Save training preset/);
assert.match(saveDialogMarkup, /<h2 id="training-preset-dialog-title"/);
assert.match(saveDialogMarkup, /aria-label="Preset name"/);
assert.match(saveDialogMarkup, /value=""/);
const invalidSaveDialogMarkup = renderToStaticMarkup(
  <TrainingPresetDialogContent
    state={{ kind: 'save', name: '', error: 'Preset name is required' }}
    pending={false}
    onClose={() => undefined}
    onNameChange={() => undefined}
    onConfirm={() => undefined}
  />,
);
assert.match(invalidSaveDialogMarkup, /aria-invalid="true"/);
assert.match(invalidSaveDialogMarkup, /aria-describedby="training-preset-name-error"/);
assert.match(invalidSaveDialogMarkup, /id="training-preset-name-error"/);
assert.match(invalidSaveDialogMarkup, /role="alert"/);

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

const fluxCharacter = builtin(4, 'alpha');
const fluxStyleUpper = builtin(5, 'Alpha');
const sdxlCharacter = builtin(9, 'Zulu');
const mixed = validateTrainingPresetListResponse({
  presets: [record('u-z', 'zulu'), sdxlCharacter, record('u-a', 'Alpha'), fluxStyleUpper, fluxCharacter],
});
assert.deepEqual(
  mixed.map(item => item.id),
  [fluxCharacter.id, fluxStyleUpper.id, sdxlCharacter.id, 'u-a', 'u-z'],
  'built-ins use fixed architecture/category/name ordering, then users use the existing comparator without a global sort',
);
assert.equal(validateTrainingPresetRecord(fluxCharacter).source, 'builtin');
assert.equal(validateTrainingPresetRecord(record('strict-user', 'Strict user')).source, 'user');

for (const [field, value] of [
  ['category', undefined],
  ['intent_slug', undefined],
  ['model_arch', undefined],
  ['catalog_revision', undefined],
  ['summary', undefined],
  ['recipe_path', undefined],
  ['prerequisites', undefined],
  ['warnings', undefined],
  ['evidence', undefined],
] as const) {
  assert.throws(
    () => validateTrainingPresetRecord({ ...fluxCharacter, [field]: value }),
    new RegExp(String(field), 'i'),
    `built-in ${field} is required`,
  );
}

const dropped: Array<{ source: string; index: number; reason: string }> = [];
const isolated = validateTrainingPresetListResponse(
  {
    presets: [
      record('kept-user', 'Kept user'),
      { ...record('bad-user', 'Bad user'), category: 'style' },
      { ...fluxCharacter, snapshot: {} },
      builtin(12),
      { source: 'mystery', snapshot: { secret: true } },
    ],
  },
  diagnostic => dropped.push(diagnostic),
);
assert.deepEqual(
  isolated.map(item => item.id),
  [builtin(12).id, 'kept-user'],
  'one malformed record must not poison the list',
);
assert.deepEqual(dropped, [
  { source: 'user', index: 1, reason: 'invalid-user-record' },
  { source: 'builtin', index: 2, reason: 'invalid-builtin-record' },
  { source: 'unknown', index: 4, reason: 'invalid-record-source' },
]);
assert.equal(JSON.stringify(dropped).includes('snapshot'), false, 'drop diagnostics never expose snapshots');

let sourceAccessorCalls = 0;
const sourceAccessorRecord = {
  get source(): never {
    sourceAccessorCalls += 1;
    throw new Error('source getter must not execute');
  },
  snapshot: { secret: 'accessor snapshot' },
};
const throwingPrototypeProxy = new Proxy(
  { snapshot: { secret: 'prototype snapshot' } },
  {
    getPrototypeOf() {
      throw new Error('hostile getPrototypeOf');
    },
  },
);
const throwingDescriptorProxy = new Proxy(
  { snapshot: { secret: 'descriptor snapshot' } },
  {
    getOwnPropertyDescriptor() {
      throw new Error('hostile getOwnPropertyDescriptor');
    },
  },
);
const throwingGetProxy = new Proxy(
  { source: 'user', snapshot: { secret: 'get snapshot' } },
  {
    get() {
      throw new Error('hostile get');
    },
  },
);
const hostileDiagnostics: Array<{ source: string; index: number; reason: string }> = [];
const hostileIsolated = validateTrainingPresetListResponse(
  {
    presets: [
      record('before-hostile', 'Before hostile'),
      sourceAccessorRecord,
      throwingPrototypeProxy,
      throwingDescriptorProxy,
      throwingGetProxy,
      builtin(12),
    ],
  },
  diagnostic => hostileDiagnostics.push(diagnostic),
);
assert.equal(sourceAccessorCalls, 0, 'source accessors are classified without executing their getter');
assert.deepEqual(
  hostileIsolated.map(item => item.id),
  [builtin(12).id, 'before-hostile'],
  'hostile reflection traps cannot abort validation of surrounding records',
);
assert.deepEqual(hostileDiagnostics, [
  { source: 'unknown', index: 1, reason: 'invalid-record-source' },
  { source: 'unknown', index: 2, reason: 'invalid-record-source' },
  { source: 'unknown', index: 3, reason: 'invalid-record-source' },
  { source: 'user', index: 4, reason: 'invalid-user-record' },
]);
assert.equal(hostileDiagnostics.length, 4, 'each malformed hostile record emits exactly one diagnostic');
assert.equal(
  JSON.stringify(hostileDiagnostics).includes('snapshot'),
  false,
  'hostile drop diagnostics remain redacted',
);

const groupedMarkup = renderToStaticMarkup(
  <TrainingPresetSelect
    presets={sortTrainingPresetRecords([builtin(12), record('mine', 'Mine'), fluxStyleUpper, fluxCharacter])}
    selectedPresetId={fluxCharacter.id}
    currentModelArch="flux"
    canUndo
    disabled={false}
    onSelect={() => undefined}
  />,
);
assert.equal((groupedMarkup.match(/<optgroup /g) ?? []).length, 3, 'the select has exactly three groups');
assert.match(groupedMarkup, /<optgroup label="Built-in recipes">/);
assert.match(groupedMarkup, /alpha — character-general-concept \(flux\)/);
assert.match(groupedMarkup, /Alpha — style-aesthetic \(flux\)/);
assert.doesNotMatch(groupedMarkup, /Wan 2\.1/, 'built-ins require exact architecture compatibility');
assert.match(groupedMarkup, /<optgroup label="My presets"><option value="preset:mine">Mine<\/option><\/optgroup>/);
assert.match(groupedMarkup, /value="action:update" disabled=""/);
assert.match(groupedMarkup, /value="action:delete" disabled=""/);
assert.doesNotMatch(groupedMarkup, /value="action:save" disabled/);
assert.doesNotMatch(groupedMarkup, /value="action:undo" disabled/);

assert.equal(
  reconcileSelectedPresetId(fluxCharacter.id, [fluxCharacter, record('mine', 'Mine')], 'wan21:1b'),
  null,
  'an incompatible built-in selection is cleared',
);
assert.equal(
  reconcileSelectedPresetId('mine', [fluxCharacter, record('mine', 'Mine')], 'wan21:1b'),
  'mine',
  'user selections survive architecture changes',
);
assert.equal(
  reconcileSelectedPresetId(builtin(12).id, [builtin(12)], 'wan21:1b'),
  builtin(12).id,
  'colon-bearing Wan architecture IDs remain opaque and exact-compatible',
);
const originalLocaleCompare = String.prototype.localeCompare;
let localeCompareCalls = 0;
String.prototype.localeCompare = function (
  other: string,
  locales?: Intl.LocalesArgument,
  options?: Intl.CollatorOptions,
) {
  localeCompareCalls += 1;
  return originalLocaleCompare.call(this, other, locales, options);
};
try {
  sortTrainingPresetRecords([record('zulu', 'Zulu'), record('abaco', 'ábaco')]);
} finally {
  String.prototype.localeCompare = originalLocaleCompare;
}
assert.ok(localeCompareCalls > 0, 'preset sorting must use localeCompare');
for (const malformed of [null, {}, { presets: 'no' }]) {
  assert.throws(() => validateTrainingPresetListResponse(malformed), /training preset/i);
}
assert.deepEqual(validateTrainingPresetListResponse({ presets: [{ id: '', name: 'x', snapshot: {} }] }), []);
assert.deepEqual(validateTrainingPresetListResponse({ presets: [{ ...record('bad', 'Bad'), snapshot: {} }] }), []);
for (const invalidUserRecord of [
  { ...record('missing-source', 'Missing source'), source: undefined },
  { ...record('builtin', 'Built in'), source: 'builtin', read_only: true },
  { ...record('writable', 'Writable mismatch'), read_only: true },
  { ...record('catalog-field', 'Catalog field'), category: 'style' },
  { ...record('catalog-summary', 'Catalog summary'), summary: 'catalog only' },
]) {
  assert.throws(
    () => validateTrainingPresetRecord(invalidUserRecord),
    /training preset.*(source|read_only|catalog|category)/i,
  );
}
const validatedUserInput = record('isolated-user', 'Isolated user');
const validatedUsers = validateTrainingPresetListResponse({ presets: [validatedUserInput] });
assert.equal(validatedUsers[0].source, 'user');
assert.equal(validatedUsers[0].read_only, false);
assert.equal(validatedUserInput.source, 'user', 'validation must not mutate the source discriminator');
(validatedUsers[0].snapshot.config.process[0] as any).model.name_or_path = 'mutated result';
assert.equal(
  (validatedUserInput.snapshot.config.process[0] as any).model.name_or_path,
  'model',
  'validated user records must isolate their snapshot result',
);
assert.equal(reconcileSelectedPresetId('b', unsorted), 'b');
assert.equal(reconcileSelectedPresetId('missing', unsorted), null);
assert.equal(reconcileSelectedPresetId(null, unsorted), null);

const current = jobFixture(100);
const applied = preparePresetApplication(current, record('p', 'Preset', 777), value => value);
assert.equal(applied.jobConfig.config.process[0].train.steps, 777);
assert.equal(applied.undoConfig.config.process[0].train.steps, 100);
(current.config.process[0].train as { steps: number }).steps = 300;
assert.equal(applied.undoConfig.config.process[0].train.steps, 100, 'undo must be isolated from current config');

const beforeFailure = jobFixture(123);
assert.throws(
  () => preparePresetApplication(beforeFailure, { ...record('invalid', 'Invalid'), snapshot: { schema_version: 1 } } as never, value => value),
  /snapshot|config/i,
);

const builtinApplication = preparePresetApplication(
  { ...jobFixture(), config: { ...jobFixture().config, process: [{ ...jobFixture().config.process[0], model: { name_or_path: 'current', arch: fluxCharacter.model_arch }, sample: { samples: [], neg: 'keep current negative' } }] } } as unknown as JobConfig,
  fluxCharacter,
  value => value,
);
assert.equal(builtinApplication.jobConfig.config.process[0].model.arch, fluxCharacter.model_arch);
assert.equal((builtinApplication.jobConfig.config.process[0].sample as any).neg, 'keep current negative');
const mismatchedArchitecture = jobFixture();
(mismatchedArchitecture.config.process[0].model as any).arch = 'sdxl';
assert.throws(
  () => preparePresetApplication(mismatchedArchitecture, fluxCharacter, value => value),
  /model\.arch must be exactly flux/i,
);

const userWithNegative = record('negative', 'Negative');
(userWithNegative.snapshot.config.process[0].sample as any).neg = 'use preset negative';
const userNegativeApplication = preparePresetApplication(
  { ...jobFixture(), config: { ...jobFixture().config, process: [{ ...jobFixture().config.process[0], sample: { samples: [], neg: 'replace me' } }] } } as unknown as JobConfig,
  userWithNegative,
  value => value,
);
assert.equal((userNegativeApplication.jobConfig.config.process[0].sample as any).neg, 'use preset negative');
assert.throws(
  () => preparePresetApplication(jobFixture(), record('bad-migration', 'Bad migration'), value => {
    (value.config.process[0].model as any).name_or_path = '';
    return value;
  }),
  /name_or_path/i,
  'invalid migrated candidates are rejected before a state transaction is returned',
);
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

  const immutableBuiltin = builtin(12);
  let builtinMutationCalls = 0;
  const immutableApi = {
    put: async () => {
      builtinMutationCalls += 1;
      return { data: returned };
    },
    delete: async () => {
      builtinMutationCalls += 1;
      return { data: { ok: true } };
    },
    get: async () => {
      builtinMutationCalls += 1;
      return { data: { presets: [] } };
    },
  };
  const immutableState = {
    presets: [immutableBuiltin],
    selectedPresetId: immutableBuiltin.id,
    jobConfig: current,
    undoConfig: null,
  };
  await assert.rejects(
    updateTrainingPresetAndRefresh(
      immutableApi,
      createTrainingPresetActionLock(),
      immutableBuiltin.id,
      immutableState,
      new AbortController().signal,
    ),
    /built-in.*read-only/i,
  );
  await assert.rejects(
    deleteTrainingPresetAndRefresh(immutableApi, createTrainingPresetActionLock(), immutableBuiltin.id, immutableState),
    /built-in.*read-only/i,
  );
  assert.equal(builtinMutationCalls, 0, 'direct built-in mutation helpers reject before making requests');

  const deleted = record('deleted', 'Deleted');
  const stale = record('stale', 'Stale');
  const concurrent = record('concurrent', 'Concurrent');
  const orchestrationCalls: string[] = [];
  const jobBeforeDelete = jobFixture(501);
  const undoBeforeDelete = jobFixture(502);
  const deleteController = new AbortController();
  const refreshed = await deleteTrainingPresetAndRefresh(
    {
      delete: async (url, options) => {
        assert.equal(options.signal, deleteController.signal);
        assert.equal(options.timeout, TRAINING_PRESET_REQUEST_TIMEOUT_MS);
        orchestrationCalls.push(`DELETE ${url}`);
        return { data: { ok: true } };
      },
      get: async (url, options) => {
        assert.equal(options.signal, deleteController.signal);
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
    deleteController.signal,
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

  const staleDeleteResult = await deleteTrainingPresetAndRefresh(
    {
      delete: async () => ({ data: { ok: true } }),
      get: async () => ({ data: { presets: [deleted, concurrent] } }),
    },
    createTrainingPresetActionLock(),
    deleted.id,
    {
      presets: [deleted],
      selectedPresetId: deleted.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
  );
  assert.equal(staleDeleteResult.status, 'reconciliation-failed');
  if (staleDeleteResult.status === 'reconciliation-failed') {
    assert.deepEqual(
      staleDeleteResult.state.presets.map(item => item.id),
      ['concurrent'],
    );
    assert.equal(staleDeleteResult.state.selectedPresetId, null);
    assert.equal(staleDeleteResult.retryable, true);
    assert.match(staleDeleteResult.error, /deleted.*refreshed list/i);
  }

  const preservedSelectionResult = await deleteTrainingPresetAndRefresh(
    {
      delete: async () => ({ data: { ok: true } }),
      get: async () => ({ data: { presets: [deleted, concurrent] } }),
    },
    createTrainingPresetActionLock(),
    deleted.id,
    {
      presets: [deleted, concurrent],
      selectedPresetId: concurrent.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
  );
  assert.equal(preservedSelectionResult.status, 'reconciliation-failed');
  if (preservedSelectionResult.status === 'reconciliation-failed') {
    assert.equal(preservedSelectionResult.state.selectedPresetId, concurrent.id);
  }

  const concurrentlyMissingSelection = await deleteTrainingPresetAndRefresh(
    {
      delete: async () => ({ data: { ok: true } }),
      get: async () => ({ data: { presets: [deleted] } }),
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
  assert.equal(concurrentlyMissingSelection.status, 'reconciliation-failed');
  if (concurrentlyMissingSelection.status === 'reconciliation-failed') {
    assert.equal(concurrentlyMissingSelection.state.selectedPresetId, null);
  }

  const createController = new AbortController();
  const createCalls: string[] = [];
  const createResult = await createTrainingPresetAndRefresh(
    {
      post: async (url, _body, options) => {
        assert.equal(options.signal, createController.signal);
        assert.equal(options.timeout, TRAINING_PRESET_REQUEST_TIMEOUT_MS);
        createCalls.push(`POST ${url}`);
        return { data: returned };
      },
      get: async (url, options) => {
        assert.equal(options.signal, createController.signal);
        createCalls.push(`GET ${url}`);
        return { data: { presets: [concurrent, returned] } };
      },
    },
    createTrainingPresetActionLock(),
    'Server Name',
    {
      presets: [stale],
      selectedPresetId: stale.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
    createController.signal,
  );
  assert.deepEqual(createCalls, ['POST /api/training-presets', 'GET /api/training-presets']);
  assert.equal(createResult.status, 'refreshed');
  if (createResult.status === 'refreshed') {
    assert.deepEqual(
      createResult.state.presets.map(item => item.id),
      ['concurrent', 'new'],
    );
    assert.equal(createResult.state.selectedPresetId, returned.id);
    assert.equal(createResult.state.jobConfig, jobBeforeDelete);
    assert.equal(createResult.state.undoConfig, undoBeforeDelete);
  }

  const updateCalls: string[] = [];
  const updateResult = await updateTrainingPresetAndRefresh(
    {
      put: async url => {
        updateCalls.push(`PUT ${url}`);
        return { data: returned };
      },
      get: async url => {
        updateCalls.push(`GET ${url}`);
        return { data: { presets: [concurrent] } };
      },
    },
    createTrainingPresetActionLock(),
    stale.id,
    {
      presets: [stale],
      selectedPresetId: stale.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
    new AbortController().signal,
  );
  assert.deepEqual(updateCalls, ['PUT /api/training-presets/stale', 'GET /api/training-presets']);
  assert.equal(updateResult.status, 'reconciliation-failed');
  if (updateResult.status === 'reconciliation-failed') {
    assert.equal(updateResult.state.selectedPresetId, null);
    assert.deepEqual(
      updateResult.state.presets.map(item => item.id),
      ['concurrent'],
    );
    assert.equal(updateResult.retryable, true);
    assert.match(updateResult.error, /not present/i);
  }

  const fallbackResult = await updateTrainingPresetAndRefresh(
    {
      put: async () => ({ data: returned }),
      get: async () => {
        throw new Error('offline');
      },
    },
    createTrainingPresetActionLock(),
    stale.id,
    {
      presets: [stale, concurrent],
      selectedPresetId: stale.id,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
    new AbortController().signal,
  );
  assert.equal(fallbackResult.status, 'refresh-failed');
  if (fallbackResult.status === 'refresh-failed') {
    assert.deepEqual(
      fallbackResult.state.presets.map(item => item.id),
      ['concurrent', 'new'],
    );
    assert.equal(fallbackResult.state.selectedPresetId, returned.id);
    assert.equal(fallbackResult.state.jobConfig, jobBeforeDelete);
    assert.equal(fallbackResult.state.undoConfig, undoBeforeDelete);
  }

  const cancelledController = new AbortController();
  let cancelledGets = 0;
  const cancelledLock = createTrainingPresetActionLock();
  const cancelledRequest = createTrainingPresetAndRefresh(
    {
      post: async (_url, _body, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject({ code: 'ERR_CANCELED' }), { once: true });
        }),
      get: async () => {
        cancelledGets += 1;
        return { data: { presets: [] } };
      },
    },
    cancelledLock,
    'Cancelled',
    {
      presets: [],
      selectedPresetId: null,
      jobConfig: jobBeforeDelete,
      undoConfig: undoBeforeDelete,
    },
    cancelledController.signal,
  );
  cancelledController.abort();
  assert.equal((await cancelledRequest).status, 'cancelled');
  assert.equal(cancelledGets, 0);
  assert.equal(cancelledLock.active, false);
  let cancelledStateCallbacks = 0;
  assert.equal(
    commitTrainingPresetMutationResult(
      { status: 'cancelled' },
      {
        onState: () => {
          cancelledStateCallbacks += 1;
        },
        onSuccess: () => {
          cancelledStateCallbacks += 1;
        },
        onListError: () => {
          cancelledStateCallbacks += 1;
        },
      },
    ),
    false,
  );
  assert.equal(cancelledStateCallbacks, 0);

  const timeoutLock = createTrainingPresetActionLock();
  await assert.rejects(() =>
    createTrainingPresetAndRefresh(
      {
        post: async () => {
          throw { code: 'ECONNABORTED' };
        },
        get: async () => ({ data: { presets: [] } }),
      },
      timeoutLock,
      'Timeout',
      {
        presets: [],
        selectedPresetId: null,
        jobConfig: jobBeforeDelete,
        undoConfig: undoBeforeDelete,
      },
      new AbortController().signal,
    ),
  );
  assert.equal(timeoutLock.active, false);
}

testRequestContracts()
  .then(() => console.log('training preset select tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
