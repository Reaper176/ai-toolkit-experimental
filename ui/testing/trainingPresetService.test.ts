import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import {
  MAX_PRESET_REQUEST_BYTES,
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
          sample: { sampler: 'flowmatch', samples: [{ prompt: 'private' }], prompts: ['private'] },
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

  const source = jobFixture('isolated/model');
  const isolatedStore = new FakeStore();
  const isolated = await createTrainingPresetService(isolatedStore).create('Isolated', source);
  (source.config.process[0] as any).model.name_or_path = 'mutated/source';
  assert.equal((isolated.snapshot.config.process[0] as any).model.name_or_path, 'isolated/model');
  (isolated.snapshot.config.process[0] as any).model.name_or_path = 'mutated/output';
  assert.equal(JSON.parse(isolatedStore.rows[0].preset_config).config.process[0].model.name_or_path, 'isolated/model');

  const updateStore = new FakeStore([row('keep', 'Keep Name', 'old/model')]);
  const updated = await createTrainingPresetService(updateStore).update('keep', jobFixture('new/model'));
  assert.equal(updated.name, 'Keep Name');
  assert.equal((updated.snapshot.config.process[0] as any).model.name_or_path, 'new/model');
  assert.deepEqual(Object.keys(updateStore.lastUpdate ?? {}).sort(), ['preset_config', 'schema_version']);

  const deleteStore = new FakeStore([row('remove-me', 'Remove Me')]);
  await createTrainingPresetService(deleteStore).remove('remove-me');
  assert.equal(deleteStore.rows.length, 0);

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
