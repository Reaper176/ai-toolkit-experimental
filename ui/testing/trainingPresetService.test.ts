import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import { getBuiltInTrainingPresetCatalog } from '../src/server/trainingPresetCatalogRuntime';
import { trainingPresetCatalogIdLogDigest } from '../src/server/trainingPresetCatalogDigest';
import {
  MAX_PRESET_REQUEST_BYTES,
  TrainingPresetProvenanceError,
  TrainingPresetReadOnlyError,
  TrainingPresetConflictError,
  TrainingPresetCorruptError,
  TrainingPresetNotFoundError,
  TrainingPresetValidationError,
  createTrainingPresetService,
  mapTrainingPresetError,
  parsePresetRequestText,
  type TrainingPresetCreateData,
  type TrainingPresetRow,
  type TrainingPresetStore,
  type TrainingPresetUpdateData,
} from '../src/server/trainingPresetService';

function jobFixture(model = 'current/model'): JobConfig {
  return {
    job: 'extension',
    config: {
      name: 'do-not-store',
      process: [
        {
          type: 'diffusion_trainer',
          training_folder: '/private/output',
          sqlite_db_path: '/private/jobs.sqlite',
          device: 'cuda:1',
          trigger_word: 'PRIVATE',
          datasets: [{ folder_path: '/private/images' }],
          model: { arch: 'flux', name_or_path: model },
          train: { steps: 1000 },
          save: { save_every: 250 },
          sample: {
            sampler: 'flowmatch',
            neg: 'saved user negative',
            samples: [{ prompt: 'private', control_image_path: '/private/control.png' }],
            prompts: ['private'],
          },
        },
      ],
    },
  } as unknown as JobConfig;
}

function storedSnapshot(model: string): string {
  return JSON.stringify({
    schema_version: 1,
    job: 'extension',
    config: {
      process: [
        {
          type: 'diffusion_trainer',
          model: { arch: 'flux', name_or_path: model },
          train: { steps: 1000 },
          save: { save_every: 250 },
          sample: { sampler: 'flowmatch' },
        },
      ],
    },
  });
}

function row(id: string, name: string, model = `${id}/model`): TrainingPresetRow {
  return {
    id,
    name,
    name_key: name.trim().toLowerCase(),
    preset_config: storedSnapshot(model),
    schema_version: 1,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-02T00:00:00.000Z'),
  };
}

class FakeStore implements TrainingPresetStore {
  rows: TrainingPresetRow[];
  findUniqueCalls = 0;
  updateCalls = 0;
  deleteCalls = 0;
  createError: unknown;
  updateError: unknown;
  deleteError: unknown;
  lastUpdate?: TrainingPresetUpdateData;

  constructor(rows: TrainingPresetRow[] = []) {
    this.rows = structuredClone(rows);
  }

  async findMany(): Promise<TrainingPresetRow[]> {
    return structuredClone(this.rows);
  }

  async findUnique(args: { where: { id?: string; name_key?: string } }): Promise<TrainingPresetRow | null> {
    this.findUniqueCalls += 1;
    const found = this.rows.find(candidate =>
      args.where.id !== undefined ? candidate.id === args.where.id : candidate.name_key === args.where.name_key,
    );
    return found === undefined ? null : structuredClone(found);
  }

  async create(args: { data: TrainingPresetCreateData }): Promise<TrainingPresetRow> {
    if (this.createError !== undefined) throw this.createError;
    const now = new Date('2025-02-01T00:00:00.000Z');
    const created: TrainingPresetRow = {
      id: `id-${this.rows.length + 1}`,
      ...args.data,
      created_at: now,
      updated_at: now,
    };
    this.rows.push(structuredClone(created));
    return structuredClone(created);
  }

  async update(args: { where: { id: string }; data: TrainingPresetUpdateData }): Promise<TrainingPresetRow> {
    this.updateCalls += 1;
    if (this.updateError !== undefined) throw this.updateError;
    const index = this.rows.findIndex(candidate => candidate.id === args.where.id);
    if (index < 0) throw { code: 'P2025' };
    this.lastUpdate = structuredClone(args.data);
    this.rows[index] = {
      ...this.rows[index],
      ...structuredClone(args.data),
      updated_at: new Date('2025-03-01T00:00:00Z'),
    };
    return structuredClone(this.rows[index]);
  }

  async delete(args: { where: { id: string } }): Promise<TrainingPresetRow> {
    this.deleteCalls += 1;
    if (this.deleteError !== undefined) throw this.deleteError;
    const index = this.rows.findIndex(candidate => candidate.id === args.where.id);
    if (index < 0) throw { code: 'P2025' };
    return structuredClone(this.rows.splice(index, 1)[0]);
  }
}

class StoreError extends Error {
  constructor(readonly code: string) {
    super('simulated store error');
  }
}

async function main(): Promise<void> {
  assert.equal(MAX_PRESET_REQUEST_BYTES, 1024 * 1024);

  const emptyStore = new FakeStore();
  assert.deepEqual(await createTrainingPresetService(emptyStore).list(), []);

  const unorderedStore = new FakeStore([row('z', 'beta'), row('c', 'Alpha'), row('b', 'alpha'), row('a', 'ALPHA')]);
  const listed = await createTrainingPresetService(unorderedStore).list();
  assert.deepEqual(
    listed.map(preset => `${preset.name}:${preset.id}`),
    ['ALPHA:a', 'Alpha:c', 'alpha:b', 'beta:z'],
  );
  assert.equal(listed[0].created_at, '2025-01-01T00:00:00.000Z');
  assert.equal(listed[0].updated_at, '2025-01-02T00:00:00.000Z');
  assert.equal(listed[0].source, 'user');
  assert.equal(listed[0].read_only, false);

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
    await createTrainingPresetService(new FakeStore([row('zulu', 'Zulu'), row('abaco', 'ábaco')])).list();
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
  assert.ok(localeCompareCalls > 0, 'service preset sorting must use localeCompare');

  const catalogEvents: unknown[] = [];
  const corruptUserDigests: string[] = [];
  const providerOwnedCatalog = getBuiltInTrainingPresetCatalog(event => catalogEvents.push(event));
  const reservedImpostor = row('BuIlTiN:stored-user', 'Reserved impostor');
  reservedImpostor.preset_config = '{broken';
  const mergeStore = new FakeStore([
    row('z-user', 'Zulu'),
    row('a-user', 'Anima — Character / Identity'),
    reservedImpostor,
  ]);
  const mergedService = createTrainingPresetService(mergeStore, {
    listBuiltIns: () => providerOwnedCatalog,
    logCatalogEvent: event => catalogEvents.push(event),
    logCorruptUserPreset: digest => corruptUserDigests.push(digest),
  });
  const merged = await mergedService.list();
  assert.deepEqual(
    merged
      .slice(0, 14)
      .map(preset => [
        'model_arch' in preset ? preset.model_arch : undefined,
        'category' in preset ? preset.category : undefined,
        preset.name,
        preset.id,
      ]),
    [
      ['anima', 'character', 'Anima — Character / Identity', 'builtin:anima:character-identity@1'],
      ['anima', 'refinement', 'Anima — Focused Refinement', 'builtin:anima:focused-refinement@1'],
      ['anima', 'low-vram', 'Anima — Low-VRAM Starting Point', 'builtin:anima:low-vram-starting-point@1'],
      ['anima', 'diagnostic', 'Anima — Short Diagnostic Run', 'builtin:anima:short-diagnostic-run@1'],
      ['flux', 'character', 'FLUX.1 — Character / General Concept', 'builtin:flux:character-general-concept@1'],
      ['flux', 'style', 'FLUX.1 — Style / Aesthetic', 'builtin:flux:style-aesthetic@1'],
      ['flex1', 'object', 'Flex.1 — Object / General Concept', 'builtin:flex1:object-general-concept@1'],
      ['qwen_image', 'object', 'Qwen Image — Object / General Concept', 'builtin:qwen_image:object-general-concept@1'],
      [
        'qwen_image_edit_plus',
        'refinement',
        'Qwen Image Edit 2509 — Focused Refinement',
        'builtin:qwen_image_edit_plus:focused-refinement@1',
      ],
      ['sdxl', 'character', 'SDXL — Character / Identity', 'builtin:sdxl:character-identity@1'],
      ['sdxl', 'style', 'SDXL — Style / Aesthetic', 'builtin:sdxl:style-aesthetic@1'],
      ['sd15', 'character', 'SD 1.5 — Character / Identity', 'builtin:sd15:character-identity@1'],
      [
        'wan21:1b',
        'diagnostic',
        'Wan 2.1 1.3B T2V — Subject / Motion Diagnostic',
        'builtin:wan21:1b:subject-motion-diagnostic@1',
      ],
      [
        'wan22_14b:t2v',
        'character',
        'Wan 2.2 14B T2V — Subject / Motion Starting Point',
        'builtin:wan22_14b:t2v:subject-motion-starting-point@1',
      ],
    ],
  );
  assert.deepEqual(
    merged.slice(14).map(preset => `${preset.name}:${preset.id}`),
    ['Anima — Character / Identity:a-user', 'Zulu:z-user'],
    'built-ins stay first while user records retain their existing comparator',
  );
  assert.equal(merged[0].source, 'builtin');
  assert.equal(merged[0].read_only, true);
  assert.equal(merged[14].source, 'user');
  assert.equal(merged[14].read_only, false);
  assert.deepEqual(catalogEvents, []);
  assert.deepEqual(corruptUserDigests, [trainingPresetCatalogIdLogDigest('BuIlTiN:stored-user')]);

  (merged[0] as any).warnings[0] = 'mutated service result';
  (merged[0].snapshot.config.process[0] as any).model.name_or_path = 'mutated service result';
  assert.notEqual((providerOwnedCatalog[0] as any).warnings[0], 'mutated service result');
  assert.notEqual(
    (providerOwnedCatalog[0].snapshot.config.process[0] as any).model.name_or_path,
    'mutated service result',
    'service does not hand the provider-owned record to callers',
  );
  const mergedAgain = await mergedService.list();
  assert.notEqual((mergedAgain[0] as any).warnings[0], 'mutated service result');
  assert.notEqual(
    (mergedAgain[0].snapshot.config.process[0] as any).model.name_or_path,
    'mutated service result',
    'service list handoffs are independent copies',
  );

  const providerEvents: unknown[] = [];
  const entryEvents: unknown[] = [];
  const entryLogger = (event: unknown) => entryEvents.push(event);
  let receivedEntryLogger: unknown;
  const providerFailureList = await createTrainingPresetService(new FakeStore([row('user', 'User')]), {
    listBuiltIns(logger) {
      receivedEntryLogger = logger;
      throw new Error('private provider detail');
    },
    logCatalogEvent: entryLogger,
    logCatalogProviderFailure: event => providerEvents.push(event),
  }).list();
  assert.deepEqual(
    providerFailureList.map(preset => preset.id),
    ['user'],
  );
  assert.deepEqual(entryEvents, [], 'provider failure does not fabricate an entry event');
  assert.deepEqual(providerEvents, [{ code: 'BUILTIN_PRESET_PROVIDER_FAILED' }]);
  assert.equal(typeof receivedEntryLogger, 'function', 'service passes an entry logger to the provider');

  const successfulProviderEvents: unknown[] = [];
  let entryObserverCalls = 0;
  const successfulProviderList = await createTrainingPresetService(new FakeStore([row('user', 'User')]), {
    listBuiltIns(logger) {
      logger({ code: 'BUILTIN_PRESET_INVALID', id_digest: '0123456789ab' });
      return [providerOwnedCatalog[0]];
    },
    logCatalogEvent: () => {
      entryObserverCalls += 1;
      throw new Error('observer unavailable');
    },
    logCatalogProviderFailure: event => successfulProviderEvents.push(event),
  }).list();
  assert.deepEqual(
    successfulProviderList.map(preset => preset.id),
    ['builtin:anima:character-identity@1', 'user'],
    'a throwing entry observer must not discard a successful provider result',
  );
  assert.deepEqual(
    successfulProviderEvents,
    [],
    'a throwing entry observer must not be misclassified as a provider failure',
  );
  assert.equal(entryObserverCalls, 1, 'the best-effort wrapper still invokes the entry observer');

  const defaultOnlyUsers = await createTrainingPresetService(new FakeStore([row('default-user', 'Default')])).list();
  assert.deepEqual(
    defaultOnlyUsers.map(preset => preset.id),
    ['default-user'],
  );

  const createStore = new FakeStore();
  const created = await createTrainingPresetService(createStore).create('  Useful Preset  ', jobFixture());
  assert.equal(created.name, 'Useful Preset');
  assert.equal(createStore.rows[0].name_key, 'useful preset');
  const createdProcess = JSON.parse(createStore.rows[0].preset_config).config.process[0];
  for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
    assert.equal(key in createdProcess, false, `${key} must not be persisted`);
  }
  assert.equal('samples' in createdProcess.sample, false);
  assert.equal('prompts' in createdProcess.sample, false);
  assert.equal(createdProcess.sample.neg, 'saved user negative');
  assert.equal(created.source, 'user');
  assert.equal(created.read_only, false);

  const invalidCreateStore = new FakeStore();
  await assert.rejects(
    createTrainingPresetService(invalidCreateStore).create('Not training', {
      ...jobFixture(),
      job: 'caption',
    } as unknown as JobConfig),
    error => {
      assert(error instanceof TrainingPresetValidationError);
      assert.match(error.message, /job_config.*job.*extension/i);
      return true;
    },
  );
  assert.equal(invalidCreateStore.rows.length, 0, 'invalid job must not be created');

  const source = jobFixture('isolated/model');
  const isolatedStore = new FakeStore();
  const isolated = await createTrainingPresetService(isolatedStore).create('Isolated', source);
  (source.config.process[0] as any).model.name_or_path = 'mutated/source';
  assert.equal((isolated.snapshot.config.process[0] as any).model.name_or_path, 'isolated/model');
  (isolated.snapshot.config.process[0] as any).model.name_or_path = 'mutated/output';
  assert.equal(JSON.parse(isolatedStore.rows[0].preset_config).config.process[0].model.name_or_path, 'isolated/model');
  (isolated as any).source = 'builtin';
  assert.equal((await createTrainingPresetService(isolatedStore).list())[0].source, 'user');

  const updateStore = new FakeStore([row('keep', 'Keep Name', 'old/model')]);
  const updated = await createTrainingPresetService(updateStore).update('keep', jobFixture('new/model'));
  assert.equal(updated.name, 'Keep Name');
  assert.equal((updated.snapshot.config.process[0] as any).model.name_or_path, 'new/model');
  assert.deepEqual(Object.keys(updateStore.lastUpdate ?? {}).sort(), ['preset_config', 'schema_version']);

  const invalidUpdateStore = new FakeStore([row('keep', 'Keep Name', 'old/model')]);
  await assert.rejects(
    createTrainingPresetService(invalidUpdateStore).update('keep', {
      ...jobFixture(),
      job: 'caption',
    } as unknown as JobConfig),
    TrainingPresetValidationError,
  );
  assert.equal(invalidUpdateStore.lastUpdate, undefined, 'invalid job must not be updated');
  assert.equal(JSON.parse(invalidUpdateStore.rows[0].preset_config).config.process[0].model.name_or_path, 'old/model');

  const deleteStore = new FakeStore([row('remove-me', 'Remove Me')]);
  const mutationProviderCalls: string[] = [];
  const mutationDependencies = {
    listBuiltIns: () => {
      mutationProviderCalls.push('list');
      return getBuiltInTrainingPresetCatalog(() => undefined);
    },
  };
  await createTrainingPresetService(deleteStore, mutationDependencies).remove('remove-me');
  assert.equal(deleteStore.rows.length, 0);
  assert.deepEqual(mutationProviderCalls, [], 'delete does not consult or mutate the built-in provider');

  for (const reservedId of ['builtin:flux:test@1', '  BuIlTiN:flux:test@1  ']) {
    const reservedUpdateStore = new FakeStore([row(reservedId.trim(), 'Reserved')]);
    await assert.rejects(
      createTrainingPresetService(reservedUpdateStore).update(reservedId, jobFixture()),
      TrainingPresetReadOnlyError,
    );
    assert.equal(reservedUpdateStore.findUniqueCalls, 0, 'reserved update must be rejected before lookup');
    assert.equal(reservedUpdateStore.updateCalls, 0, 'reserved update must not reach storage');

    const reservedDeleteStore = new FakeStore([row(reservedId.trim(), 'Reserved')]);
    await assert.rejects(
      createTrainingPresetService(reservedDeleteStore).remove(reservedId),
      TrainingPresetReadOnlyError,
    );
    assert.equal(reservedDeleteStore.findUniqueCalls, 0, 'reserved delete must be rejected before lookup');
    assert.equal(reservedDeleteStore.deleteCalls, 0, 'reserved delete must not reach storage');
  }

  const injectedCreateStore = new FakeStore();
  const injectedMutationService = createTrainingPresetService(injectedCreateStore, mutationDependencies);
  const injectedCreated = await injectedMutationService.create('User Only', jobFixture());
  await injectedMutationService.update(injectedCreated.id, jobFixture('updated/user'));
  assert.equal(injectedCreateStore.rows.length, 1);
  assert.equal(injectedCreateStore.rows[0].id, injectedCreated.id);
  assert.deepEqual(mutationProviderCalls, [], 'create and update touch user storage only');

  await assert.rejects(
    createTrainingPresetService(new FakeStore([row('existing', 'Existing')])).create(' existing ', jobFixture()),
    TrainingPresetConflictError,
  );
  const raceStore = new FakeStore();
  raceStore.createError = new StoreError('P2002');
  await assert.rejects(
    createTrainingPresetService(raceStore).create('Race', jobFixture()),
    TrainingPresetConflictError,
  );

  for (const id of ['', '   ']) {
    await assert.rejects(createTrainingPresetService(new FakeStore()).update(id, jobFixture()), error => {
      assert(error instanceof TrainingPresetValidationError);
      assert.match(error.message, /preset id/i);
      return true;
    });
    await assert.rejects(createTrainingPresetService(new FakeStore()).remove(id), TrainingPresetValidationError);
  }
  await assert.rejects(
    createTrainingPresetService(new FakeStore()).update('missing', jobFixture()),
    TrainingPresetNotFoundError,
  );
  await assert.rejects(createTrainingPresetService(new FakeStore()).remove('missing'), TrainingPresetNotFoundError);
  const staleUpdateStore = new FakeStore([row('stale', 'Stale')]);
  staleUpdateStore.updateError = new StoreError('P2025');
  await assert.rejects(
    createTrainingPresetService(staleUpdateStore).update('stale', jobFixture()),
    TrainingPresetNotFoundError,
  );
  const staleDeleteStore = new FakeStore([row('stale', 'Stale')]);
  staleDeleteStore.deleteError = new StoreError('P2025');
  await assert.rejects(createTrainingPresetService(staleDeleteStore).remove('stale'), TrainingPresetNotFoundError);

  for (const corrupt of [
    { ...row('json', 'JSON'), preset_config: '{broken' },
    { ...row('db-version', 'DB version'), schema_version: 2 },
    {
      ...row('embedded-version', 'Embedded version'),
      preset_config: storedSnapshot('model').replace('"schema_version":1', '"schema_version":2'),
    },
    {
      ...row('shape', 'Shape'),
      preset_config: JSON.stringify({ schema_version: 1, job: 'extension', config: { process: [] } }),
    },
  ]) {
    await assert.rejects(createTrainingPresetService(new FakeStore([corrupt])).list(), error => {
      assert(error instanceof TrainingPresetCorruptError);
      assert.match(error.message, new RegExp(corrupt.id));
      return true;
    });
  }

  assert.throws(() => parsePresetRequestText('{broken'), TrainingPresetValidationError);
  for (const body of ['null', '[]', '"text"']) {
    assert.throws(() => parsePresetRequestText(body), /request body.*object/i);
  }
  assert.throws(() => parsePresetRequestText('{}'), /job_config/i);
  assert.throws(() => parsePresetRequestText(JSON.stringify({ name: 'x' })), /job_config/i);
  const parsed = parsePresetRequestText(JSON.stringify({ name: 42, job_config: jobFixture() }));
  assert.equal(parsed.name, 42);
  assert.equal(parsed.job_config.config.process.length, 1);
  for (const provenanceField of [
    'source',
    'read_only',
    'category',
    'intent_slug',
    'model_arch',
    'catalog_revision',
    'recipe_path',
    'evidence',
  ]) {
    assert.throws(
      () =>
        parsePresetRequestText(
          JSON.stringify({ name: 'Owned', job_config: jobFixture(), [provenanceField]: 'client-owned' }),
          true,
        ),
      TrainingPresetProvenanceError,
      `${provenanceField} must be rejected as top-level provenance`,
    );
    const nestedJobConfig = { ...jobFixture(), [provenanceField]: 'nested-value' } as unknown as JobConfig;
    assert.doesNotThrow(() =>
      parsePresetRequestText(JSON.stringify({ name: 'Nested', job_config: nestedJobConfig }), true),
    );
  }
  const exactAscii = JSON.stringify({ job_config: 'x'.repeat(MAX_PRESET_REQUEST_BYTES - 17) });
  assert.equal(Buffer.byteLength(exactAscii), MAX_PRESET_REQUEST_BYTES);
  parsePresetRequestText(exactAscii);
  assert.throws(() => parsePresetRequestText(`${exactAscii} `), /1 MiB/i);
  const exactMultibyte = JSON.stringify({
    job_config: `${'😀'.repeat(Math.floor((MAX_PRESET_REQUEST_BYTES - 17) / 4))}abc`,
  });
  assert.equal(Buffer.byteLength(exactMultibyte), MAX_PRESET_REQUEST_BYTES);
  parsePresetRequestText(exactMultibyte);
  const oversizedMultibyte = exactMultibyte.replace('abc"}', 'abcé"}');
  assert.equal(Buffer.byteLength(oversizedMultibyte), MAX_PRESET_REQUEST_BYTES + 2);
  assert.throws(() => parsePresetRequestText(oversizedMultibyte), /1 MiB/i);

  const validationMapping = mapTrainingPresetError(new TrainingPresetValidationError('bad input'));
  assert.deepEqual(validationMapping, { status: 400, error: 'bad input', shouldLog: false });
  assert.equal(mapTrainingPresetError(new TrainingPresetConflictError('duplicate')).status, 409);
  assert.equal(mapTrainingPresetError(new TrainingPresetNotFoundError('missing')).status, 404);
  assert.deepEqual(mapTrainingPresetError(new TrainingPresetReadOnlyError()), {
    status: 409,
    error: 'Built-in training presets are read-only',
    code: 'BUILTIN_PRESET_READ_ONLY',
    shouldLog: false,
  });
  assert.deepEqual(mapTrainingPresetError(new TrainingPresetProvenanceError()), {
    status: 400,
    error: 'Preset catalog provenance is server-owned',
    code: 'PRESET_PROVENANCE_NOT_ALLOWED',
    shouldLog: false,
  });
  assert.deepEqual(mapTrainingPresetError(new TrainingPresetCorruptError('secret detail')), {
    status: 500,
    error: 'Training preset storage is unavailable',
    shouldLog: true,
  });
  assert.deepEqual(mapTrainingPresetError(new Error('database password')), {
    status: 500,
    error: 'Training preset storage is unavailable',
    shouldLog: true,
  });

  const listIsolationStore = new FakeStore([row('reference', 'Reference', 'reference/model')]);
  const isolationService = createTrainingPresetService(listIsolationStore);
  const firstList = await isolationService.list();
  (firstList[0].snapshot.config.process[0] as any).model.name_or_path = 'mutated';
  const secondList = await isolationService.list();
  assert.equal((secondList[0].snapshot.config.process[0] as any).model.name_or_path, 'reference/model');

  console.log('Training preset service tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
