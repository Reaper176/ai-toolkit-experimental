import assert from 'node:assert/strict';
import {
  buildDatasetPresetManifest,
  manifestSha256,
  type DatasetPresetLoaderConfig,
} from '../src/helpers/datasetPresets';
import {
  DatasetPresetConflictError,
  DatasetPresetNotFoundError,
  DatasetPresetReferencedError,
  DatasetPresetStorageError,
  DatasetPresetValidationError,
  createDatasetPresetService,
  type DatasetPresetCreateData,
  type DatasetPresetRow,
  type DatasetPresetStore,
  type DatasetPresetVersionCreateData,
  type DatasetPresetVersionRow,
} from '../src/server/datasetPresetService';
import type {
  DatasetPresetSnapshotStore,
  SnapshotQuarantine,
  StageVersionInput,
  StagedPublication,
} from '../src/server/datasetPresetSnapshotService';

const loaderConfig: DatasetPresetLoaderConfig = {
  caption_ext: 'txt',
  default_caption: '',
  caption_dropout_rate: 0,
  shuffle_tokens: false,
  num_repeats: 1,
  resolution: [512],
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  flip_x: false,
  flip_y: false,
  num_frames: 1,
  shrink_video_to_frames: true,
  fps: 24,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: [],
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

class MemoryStore implements DatasetPresetStore {
  presets: Array<DatasetPresetRow & { next_version: number }> = [];
  versions: DatasetPresetVersionRow[] = [];
  usages = new Map<string, number>();
  insertFailures: unknown[] = [];
  deleteVersionError: unknown;
  listVersionsError: unknown;
  listActiveWithVersionsCalls = 0;
  listVersionsCalls = 0;
  beforeInsertReservedVersion?: () => void | Promise<void>;
  beforeDeleteVersionIfNotLast?: () => void | Promise<void>;

  async listActive(): Promise<DatasetPresetRow[]> {
    return clone(this.presets.filter(row => row.archived_at === null));
  }
  async listActiveWithVersions() {
    this.listActiveWithVersionsCalls += 1;
    return clone(
      this.presets
        .filter(row => row.archived_at === null)
        .map(row => ({
          ...row,
          versions: this.versions
            .filter(version => version.preset_id === row.id)
            .sort((left, right) => left.version - right.version),
        })),
    );
  }
  async getPreset(id: string): Promise<DatasetPresetRow | null> {
    return clone(this.presets.find(row => row.id === id) ?? null);
  }
  async findPresetByNameKey(nameKey: string): Promise<DatasetPresetRow | null> {
    return clone(this.presets.find(row => row.name_key === nameKey) ?? null);
  }
  async createPreset(data: DatasetPresetCreateData): Promise<DatasetPresetRow> {
    if (this.presets.some(row => row.name_key === data.name_key)) throw { code: 'name_conflict' };
    const now = new Date(`2026-01-${String(this.presets.length + 1).padStart(2, '0')}T00:00:00.000Z`);
    const row = {
      id: `preset-${this.presets.length + 1}`,
      ...data,
      next_version: 1,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    this.presets.push(clone(row));
    return clone(row);
  }
  async deleteEmptyPreset(id: string): Promise<void> {
    if (this.versions.some(version => version.preset_id === id)) return;
    this.presets = this.presets.filter(row => row.id !== id);
  }
  async listVersions(presetId: string): Promise<DatasetPresetVersionRow[]> {
    this.listVersionsCalls += 1;
    if (this.listVersionsError !== undefined) throw this.listVersionsError;
    return clone(this.versions.filter(row => row.preset_id === presetId).sort((a, b) => a.version - b.version));
  }
  async getLatestVersion(presetId: string): Promise<DatasetPresetVersionRow | null> {
    return clone(
      this.versions.filter(row => row.preset_id === presetId).sort((a, b) => b.version - a.version)[0] ?? null,
    );
  }
  async reserveNextVersion(presetId: string): Promise<number> {
    const row = this.presets.find(candidate => candidate.id === presetId);
    if (!row) throw { code: 'not_found' };
    if (row.archived_at !== null) throw { code: 'archived' };
    const latestVersion = Math.max(
      0,
      ...this.versions.filter(version => version.preset_id === presetId).map(version => version.version),
    );
    const reserved = Math.max(row.next_version, latestVersion + 1);
    row.next_version = reserved + 1;
    row.updated_at = new Date('2026-01-20T00:00:00.000Z');
    return reserved;
  }
  async insertVersion(data: DatasetPresetVersionCreateData): Promise<DatasetPresetVersionRow> {
    const failure = this.insertFailures.shift();
    if (failure !== undefined) throw failure;
    if (this.versions.some(row => row.preset_id === data.preset_id && row.version === data.version)) {
      throw { code: 'version_conflict' };
    }
    const row = {
      id: `version-${this.versions.length + 1}`,
      ...data,
      created_at: new Date('2026-02-01T00:00:00.000Z'),
    };
    this.versions.push(clone(row));
    return clone(row);
  }
  async insertReservedVersionIfActive(data: DatasetPresetVersionCreateData): Promise<DatasetPresetVersionRow> {
    await this.beforeInsertReservedVersion?.();
    const preset = this.presets.find(row => row.id === data.preset_id);
    if (!preset) throw { code: 'not_found' };
    if (preset.archived_at !== null) throw { code: 'archived' };
    return this.insertVersion(data);
  }
  async updateName(id: string, name: string, nameKey: string): Promise<DatasetPresetRow> {
    if (this.presets.some(row => row.id !== id && row.name_key === nameKey)) throw { code: 'name_conflict' };
    const row = this.presets.find(candidate => candidate.id === id);
    if (!row) throw { code: 'not_found' };
    row.name = name;
    row.name_key = nameKey;
    row.updated_at = new Date('2026-03-01T00:00:00.000Z');
    return clone(row);
  }
  async setArchived(id: string, archivedAt: Date | null): Promise<DatasetPresetRow> {
    const row = this.presets.find(candidate => candidate.id === id);
    if (!row) throw { code: 'not_found' };
    row.archived_at = archivedAt;
    row.updated_at = new Date('2026-03-02T00:00:00.000Z');
    return clone(row);
  }
  async getVersion(id: string): Promise<DatasetPresetVersionRow | null> {
    return clone(this.versions.find(row => row.id === id) ?? null);
  }
  async countVersionUsages(id: string): Promise<number> {
    return this.usages.get(id) ?? 0;
  }
  async countVersions(presetId: string): Promise<number> {
    return this.versions.filter(row => row.preset_id === presetId).length;
  }
  async deleteVersionIfNotLast(id: string, presetId: string): Promise<void> {
    await this.beforeDeleteVersionIfNotLast?.();
    if (this.deleteVersionError !== undefined) throw this.deleteVersionError;
    const index = this.versions.findIndex(row => row.id === id);
    if (index < 0) throw { code: 'not_found' };
    if (this.versions.filter(row => row.preset_id === presetId).length <= 1) throw { code: 'last_version' };
    this.versions.splice(index, 1);
  }
}

class FakeSnapshots implements DatasetPresetSnapshotStore {
  stageInputs: StageVersionInput[] = [];
  manifests = new Map<string, ReturnType<typeof buildDatasetPresetManifest>>();
  rollbacks = 0;
  quarantines = 0;
  restores = 0;
  removes = 0;
  fastChecks = 0;
  fullChecks = 0;
  stageError: unknown;
  removeError: unknown;
  rollbackError: unknown;
  restoreError: unknown;

  async stageVersion(input: StageVersionInput): Promise<StagedPublication> {
    if (this.stageError !== undefined) throw this.stageError;
    this.stageInputs.push(clone(input));
    const manifest = buildDatasetPresetManifest({
      preset_id: input.presetId,
      version: input.version,
      preset_name: input.presetName,
      source_dataset: input.sourceDataset,
      created_at: '2026-02-01T00:00:00.000Z',
      note: input.note,
      loader_config: input.loaderConfig,
      files: [...input.selectedPaths, ...(input.retainedPaths ?? [])].map((path, index) => ({
        source_path: path,
        managed_path: `media/${path}`,
        media_bytes: index + 1,
        media_sha256: String(index + 1).repeat(64),
        caption_ext: input.captionExt,
        caption_text: null,
        caption_bytes: null,
        caption_sha256: null,
        caption_missing: true,
      })),
    });
    const manifestPath = `${input.presetId}/v${input.version}/manifest.json`;
    return {
      versionRoot: `/private/${input.presetId}/v${input.version}`,
      manifestPath,
      manifest,
      manifestSha256: manifestSha256(manifest),
      publish: async () => {
        this.manifests.set(manifestPath, clone(manifest));
      },
      rollback: async () => {
        this.rollbacks += 1;
        if (this.rollbackError !== undefined) throw this.rollbackError;
        this.manifests.delete(manifestPath);
      },
    };
  }
  async readManifest(path: string) {
    const result = this.manifests.get(path);
    if (!result) throw new Error('/private/missing manifest');
    return clone(result);
  }
  async verifyFast(path: string) {
    this.fastChecks += 1;
    return this.readManifest(path);
  }
  async verifyFull(path: string) {
    this.fullChecks += 1;
    return this.readManifest(path);
  }
  resolveMediaRoot(path: string): string {
    return path;
  }
  async quarantineVersion(path: string): Promise<SnapshotQuarantine> {
    this.quarantines += 1;
    const manifest = this.manifests.get(path);
    this.manifests.delete(path);
    return {
      restore: async () => {
        this.restores += 1;
        if (this.restoreError !== undefined) throw this.restoreError;
        if (manifest) this.manifests.set(path, manifest);
      },
      remove: async () => {
        this.removes += 1;
        if (this.removeError !== undefined) throw this.removeError;
      },
    };
  }
  async cleanupStaging(): Promise<string[]> {
    return [];
  }
}

const publishInput = {
  name: '  Faces  ',
  source_dataset: 'photos',
  selected_paths: ['a.jpg'],
  caption_ext: 'txt',
  loader_config: loaderConfig,
  note: null,
};

async function main(): Promise<void> {
  const store = new MemoryStore();
  const snapshots = new FakeSnapshots();
  const service = createDatasetPresetService({ store, snapshots, datasetsRoot: '/datasets' });
  const created = await service.createPreset(publishInput);
  assert.equal(created.name, 'Faces');
  assert.equal(created.latest_version, 1);
  assert.equal(created.version_count, 1);
  assert.equal(created.total_bytes, '1');
  assert.equal(store.presets[0].name_key, 'faces');
  assert.equal(snapshots.stageInputs[0].sourceRoot, '/datasets/photos');

  await assert.rejects(service.createPreset({ ...publishInput, name: 'FACES' }), DatasetPresetConflictError);
  assert.equal(snapshots.stageInputs.length, 1, 'duplicate name must not perform snapshot work');

  const v2 = await service.publishVersion(created.id, {
    ...publishInput,
    base_version_id: created.versions[0].id,
    retained_paths: ['a.jpg'],
    selected_paths: ['b.jpg'],
  });
  assert.equal(v2.version, 2);
  assert.deepEqual(snapshots.stageInputs[1].retainedPaths, ['a.jpg']);
  assert.equal(snapshots.stageInputs[1].priorManifestPath, created.versions[0].manifest_path);
  assert.equal(created.versions.length, 1, 'publishing must not mutate prior DTOs');

  const renamed = await service.rename(created.id, ' Portraits ');
  assert.equal(renamed.name, 'Portraits');
  assert.deepEqual(
    renamed.versions.map(version => version.version),
    [1, 2],
  );
  await service.setArchived(created.id, true);
  assert.deepEqual(await service.listActive(), []);
  await assert.rejects(
    service.publishVersion(created.id, {
      ...publishInput,
      base_version_id: v2.id,
      retained_paths: ['a.jpg'],
      selected_paths: ['c.jpg'],
    }),
    DatasetPresetValidationError,
  );
  const historical = await service.getVersion(v2.id);
  assert.equal(historical.manifest.version, 2);
  await service.verifyVersion(v2.id, false);
  await service.verifyVersion(v2.id, true);
  assert.equal(snapshots.fastChecks, 2, 'base publication and explicit verification must both fast-check');
  assert.equal(snapshots.fullChecks, 1);
  await service.setArchived(created.id, false);

  store.usages.set(v2.id, 1);
  await assert.rejects(service.deleteVersion(v2.id), DatasetPresetReferencedError);
  assert.equal(snapshots.quarantines, 0);
  store.usages.set(v2.id, 0);
  store.deleteVersionError = new Error('db unavailable');
  await assert.rejects(service.deleteVersion(v2.id), DatasetPresetStorageError);
  assert.equal(snapshots.restores, 1);
  store.deleteVersionError = undefined;
  await service.deleteVersion(v2.id);
  assert.equal(snapshots.removes, 1);

  const removeFailureStore = new MemoryStore();
  const removeFailureSnapshots = new FakeSnapshots();
  const removeFailureService = createDatasetPresetService({
    store: removeFailureStore,
    snapshots: removeFailureSnapshots,
    datasetsRoot: '/datasets',
  });
  const removeFailurePreset = await removeFailureService.createPreset({ ...publishInput, name: 'Remove failure' });
  const removeFailureV2 = await removeFailureService.publishVersion(removeFailurePreset.id, {
    ...publishInput,
    base_version_id: removeFailurePreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['remove-failure.jpg'],
  });
  removeFailureSnapshots.removeError = new Error('/private/quarantine cleanup failed');
  await assert.rejects(removeFailureService.deleteVersion(removeFailureV2.id), error => {
    assert(error instanceof DatasetPresetStorageError);
    assert.match(error.message, /maintenance/i);
    assert(!error.message.includes('/private/'));
    return true;
  });
  assert.equal(await removeFailureStore.getVersion(removeFailureV2.id), null);
  assert.equal(removeFailureSnapshots.restores, 0, 'final cleanup failure must not recreate committed metadata');
  assert.equal(removeFailureSnapshots.removes, 1);

  const lateReferenceStore = new MemoryStore();
  const lateReferenceSnapshots = new FakeSnapshots();
  const lateReferenceService = createDatasetPresetService({
    store: lateReferenceStore,
    snapshots: lateReferenceSnapshots,
    datasetsRoot: '/datasets',
  });
  const lateReferencePreset = await lateReferenceService.createPreset({ ...publishInput, name: 'Late reference' });
  const lateReferenceV2 = await lateReferenceService.publishVersion(lateReferencePreset.id, {
    ...publishInput,
    base_version_id: lateReferencePreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['late-reference.jpg'],
  });
  lateReferenceStore.deleteVersionError = { code: 'referenced' };
  await assert.rejects(lateReferenceService.deleteVersion(lateReferenceV2.id), DatasetPresetReferencedError);
  assert.equal(lateReferenceSnapshots.quarantines, 1);
  assert.equal(lateReferenceSnapshots.restores, 1);
  assert.notEqual(await lateReferenceStore.getVersion(lateReferenceV2.id), null);

  await assert.rejects(service.getPreset('missing'), DatasetPresetNotFoundError);
  await assert.rejects(
    service.createPreset({ ...publishInput, source_dataset: 'nested/photos' }),
    DatasetPresetValidationError,
  );
  const emptySelectionStore = new MemoryStore();
  const emptySelectionSnapshots = new FakeSnapshots();
  await assert.rejects(
    createDatasetPresetService({
      store: emptySelectionStore,
      snapshots: emptySelectionSnapshots,
      datasetsRoot: '/datasets',
    }).createPreset({ ...publishInput, name: 'Empty', selected_paths: [] }),
    DatasetPresetValidationError,
  );
  assert.equal(emptySelectionStore.presets.length, 0, 'invalid empty selection must be rejected before persistence');
  assert.equal(emptySelectionSnapshots.stageInputs.length, 0);

  const rollbackStore = new MemoryStore();
  const rollbackSnapshots = new FakeSnapshots();
  rollbackStore.insertFailures.push(new Error('/private/database.sqlite unavailable'));
  await assert.rejects(
    createDatasetPresetService({
      store: rollbackStore,
      snapshots: rollbackSnapshots,
      datasetsRoot: '/datasets',
    }).createPreset({ ...publishInput, name: 'Rollback' }),
    error => error instanceof DatasetPresetStorageError && !error.message.includes('/private/'),
  );
  assert.equal(rollbackSnapshots.rollbacks, 1);
  assert.equal(rollbackStore.presets.length, 0);

  const cleanupFailureStore = new MemoryStore();
  const cleanupFailureSnapshots = new FakeSnapshots();
  const primaryInsertError = new Error('primary insert failure');
  cleanupFailureStore.insertFailures.push(primaryInsertError);
  cleanupFailureSnapshots.rollbackError = new Error('/private/rollback failure');
  await assert.rejects(
    createDatasetPresetService({
      store: cleanupFailureStore,
      snapshots: cleanupFailureSnapshots,
      datasetsRoot: '/datasets',
    }).createPreset({ ...publishInput, name: 'Cleanup failure' }),
    error => {
      assert(error instanceof DatasetPresetStorageError);
      assert(!error.message.includes('/private/'));
      assert(error.cause instanceof AggregateError);
      assert.equal(error.cause.errors[0], primaryInsertError);
      return true;
    },
  );

  const restoreFailureStore = new MemoryStore();
  const restoreFailureSnapshots = new FakeSnapshots();
  const restoreFailureService = createDatasetPresetService({
    store: restoreFailureStore,
    snapshots: restoreFailureSnapshots,
    datasetsRoot: '/datasets',
  });
  const restoreFailurePreset = await restoreFailureService.createPreset({ ...publishInput, name: 'Restore failure' });
  const restoreFailureV2 = await restoreFailureService.publishVersion(restoreFailurePreset.id, {
    ...publishInput,
    base_version_id: restoreFailurePreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['restore-failure.jpg'],
  });
  const primaryDeleteError = new Error('primary delete failure');
  restoreFailureStore.deleteVersionError = primaryDeleteError;
  restoreFailureSnapshots.restoreError = new Error('/private/restore failure');
  await assert.rejects(restoreFailureService.deleteVersion(restoreFailureV2.id), error => {
    assert(error instanceof DatasetPresetStorageError);
    assert(!error.message.includes('/private/'));
    assert(error.cause instanceof AggregateError);
    assert.equal(error.cause.errors[0], primaryDeleteError);
    return true;
  });

  const stageFailureStore = new MemoryStore();
  const stageFailureSnapshots = new FakeSnapshots();
  stageFailureSnapshots.stageError = new Error('/private/source disappeared');
  await assert.rejects(
    createDatasetPresetService({
      store: stageFailureStore,
      snapshots: stageFailureSnapshots,
      datasetsRoot: '/datasets',
    }).createPreset({ ...publishInput, name: 'Stage failure' }),
    error => error instanceof DatasetPresetStorageError && !error.message.includes('/private/'),
  );
  assert.equal(stageFailureStore.presets.length, 0, 'failed staging must remove the stable empty preset');

  const postInsertStore = new MemoryStore();
  const postInsertSnapshots = new FakeSnapshots();
  const postInsertService = createDatasetPresetService({
    store: postInsertStore,
    snapshots: postInsertSnapshots,
    datasetsRoot: '/datasets',
  });
  postInsertStore.listVersionsError = new Error('readback failed');
  await assert.rejects(
    postInsertService.createPreset({ ...publishInput, name: 'Committed' }),
    DatasetPresetStorageError,
  );
  assert.equal(
    postInsertStore.versions.length,
    1,
    'a committed metadata row must remain intact after readback failure',
  );
  assert.equal(postInsertSnapshots.rollbacks, 0, 'a committed snapshot must not roll back after readback failure');

  const mismatchStore = new MemoryStore();
  const mismatchSnapshots = new FakeSnapshots();
  const mismatchService = createDatasetPresetService({
    store: mismatchStore,
    snapshots: mismatchSnapshots,
    datasetsRoot: '/datasets',
  });
  const mismatch = await mismatchService.createPreset({ ...publishInput, name: 'Mismatch' });
  mismatchSnapshots.manifests.get(mismatch.versions[0].manifest_path)!.version = 99;
  await assert.rejects(mismatchService.getVersion(mismatch.versions[0].id), DatasetPresetStorageError);
  await assert.rejects(mismatchService.verifyVersion(mismatch.versions[0].id, false), DatasetPresetStorageError);

  for (const [label, mutate] of [
    [
      'manifest checksum',
      (row: DatasetPresetVersionRow) => {
        row.manifest_sha256 = 'f'.repeat(64);
      },
    ],
    [
      'loader config',
      (row: DatasetPresetVersionRow) => {
        row.loader_config = JSON.stringify({ ...loaderConfig, num_repeats: 2 });
      },
    ],
    [
      'media count',
      (row: DatasetPresetVersionRow) => {
        row.media_count += 1;
      },
    ],
    [
      'total bytes',
      (row: DatasetPresetVersionRow) => {
        row.total_bytes += BigInt(1);
      },
    ],
  ] as const) {
    const agreementStore = new MemoryStore();
    const agreementSnapshots = new FakeSnapshots();
    const agreementService = createDatasetPresetService({
      store: agreementStore,
      snapshots: agreementSnapshots,
      datasetsRoot: '/datasets',
    });
    const agreementPreset = await agreementService.createPreset({ ...publishInput, name: `Mismatch ${label}` });
    mutate(agreementStore.versions[0]);
    await assert.rejects(
      agreementService.getVersion(agreementPreset.versions[0].id),
      DatasetPresetStorageError,
      `${label} mismatch must reject getVersion`,
    );
    await assert.rejects(
      agreementService.verifyVersion(agreementPreset.versions[0].id, true),
      DatasetPresetStorageError,
      `${label} mismatch must reject verifyVersion`,
    );
  }

  const defensiveStore = new MemoryStore();
  const defensiveSnapshots = new FakeSnapshots();
  const defensiveService = createDatasetPresetService({
    store: defensiveStore,
    snapshots: defensiveSnapshots,
    datasetsRoot: '/datasets',
  });
  const defensivePreset = await defensiveService.createPreset({ ...publishInput, name: 'Defensive' });
  const firstDetail = await defensiveService.getVersion(defensivePreset.versions[0].id);
  firstDetail.loader_config.num_repeats = 999;
  firstDetail.manifest.loader_config.num_repeats = 999;
  firstDetail.manifest.files[0].source_path = 'mutated.jpg';
  const secondDetail = await defensiveService.getVersion(defensivePreset.versions[0].id);
  assert.equal(secondDetail.loader_config.num_repeats, 1);
  assert.equal(secondDetail.manifest.loader_config.num_repeats, 1);
  assert.equal(secondDetail.manifest.files[0].source_path, 'a.jpg');

  const sortingStore = new MemoryStore();
  sortingStore.presets = [
    {
      id: 'z-tie',
      name: 'ábaco',
      name_key: 'ábaco',
      next_version: 1,
      archived_at: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      id: 'z-zoo',
      name: 'Zoo',
      name_key: 'zoo',
      next_version: 1,
      archived_at: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      id: 'a-tie',
      name: 'abaco',
      name_key: 'abaco',
      next_version: 1,
      archived_at: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      id: 'apple',
      name: 'apple',
      name_key: 'apple',
      next_version: 1,
      archived_at: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];
  assert.deepEqual(
    (
      await createDatasetPresetService({
        store: sortingStore,
        snapshots: new FakeSnapshots(),
        datasetsRoot: '/datasets',
      }).listActive()
    ).map(summary => summary.id),
    ['a-tie', 'z-tie', 'apple', 'z-zoo'],
  );

  const retryStore = new MemoryStore();
  const retrySnapshots = new FakeSnapshots();
  const retryService = createDatasetPresetService({
    store: retryStore,
    snapshots: retrySnapshots,
    datasetsRoot: '/datasets',
  });
  const retryPreset = await retryService.createPreset({ ...publishInput, name: 'Retry' });
  retryStore.insertFailures.push({ code: 'version_conflict' });
  await assert.rejects(
    retryService.publishVersion(retryPreset.id, {
      ...publishInput,
      base_version_id: retryPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['retry.jpg'],
    }),
    DatasetPresetConflictError,
  );
  const afterConflict = await retryService.publishVersion(retryPreset.id, {
    ...publishInput,
    base_version_id: retryPreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['after-conflict.jpg'],
  });
  assert.equal(afterConflict.version, 3, 'a failed reserved insert must leave a monotonic gap');
  assert.deepEqual(
    retrySnapshots.stageInputs.map(input => input.version),
    [1, 2, 3],
  );
  assert.equal(retrySnapshots.rollbacks, 1);

  const concurrentStore = new MemoryStore();
  const concurrentSnapshots = new FakeSnapshots();
  const concurrentService = createDatasetPresetService({
    store: concurrentStore,
    snapshots: concurrentSnapshots,
    datasetsRoot: '/datasets',
  });
  const concurrentPreset = await concurrentService.createPreset({ ...publishInput, name: 'Concurrent' });
  const concurrentVersions = await Promise.all([
    concurrentService.publishVersion(concurrentPreset.id, {
      ...publishInput,
      base_version_id: concurrentPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['two.jpg'],
    }),
    concurrentService.publishVersion(concurrentPreset.id, {
      ...publishInput,
      base_version_id: concurrentPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['three.jpg'],
    }),
  ]);
  assert.deepEqual(
    concurrentVersions.map(version => version.version),
    [2, 3],
  );
  assert.deepEqual(
    concurrentSnapshots.stageInputs.map(input => input.version),
    [1, 2, 3],
    'publishes for one preset must serialize without a uniqueness rollback',
  );
  assert.equal(concurrentSnapshots.rollbacks, 0);

  const monotonicStore = new MemoryStore();
  const monotonicSnapshots = new FakeSnapshots();
  const monotonicService = createDatasetPresetService({
    store: monotonicStore,
    snapshots: monotonicSnapshots,
    datasetsRoot: '/datasets',
  });
  const monotonicPreset = await monotonicService.createPreset({ ...publishInput, name: 'Monotonic' });
  assert.equal(monotonicStore.presets[0].next_version, 2, 'v1 creation must reserve the first high-water value');
  assert.equal(
    monotonicPreset.updated_at,
    monotonicStore.presets[0].updated_at.toISOString(),
    'create must return the parent timestamp updated by reservation',
  );
  const monotonicV2 = await monotonicService.publishVersion(monotonicPreset.id, {
    ...publishInput,
    base_version_id: monotonicPreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['v2.jpg'],
  });
  await monotonicService.deleteVersion(monotonicV2.id);
  const monotonicV3 = await monotonicService.publishVersion(monotonicPreset.id, {
    ...publishInput,
    base_version_id: monotonicPreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['v3.jpg'],
  });
  assert.equal(monotonicV3.version, 3, 'deleting the latest version must not reuse its number');

  const soleStore = new MemoryStore();
  const soleSnapshots = new FakeSnapshots();
  const soleService = createDatasetPresetService({
    store: soleStore,
    snapshots: soleSnapshots,
    datasetsRoot: '/datasets',
  });
  const solePreset = await soleService.createPreset({ ...publishInput, name: 'Sole' });
  await assert.rejects(soleService.deleteVersion(solePreset.versions[0].id), DatasetPresetConflictError);
  assert.equal(soleSnapshots.quarantines, 0, 'last-version deletion must reject before quarantine');
  assert.notEqual(await soleStore.getVersion(solePreset.versions[0].id), null);

  const deleteRaceStore = new MemoryStore();
  const deleteRaceSnapshots = new FakeSnapshots();
  const deleteRaceService = createDatasetPresetService({
    store: deleteRaceStore,
    snapshots: deleteRaceSnapshots,
    datasetsRoot: '/datasets',
  });
  const deleteRacePreset = await deleteRaceService.createPreset({ ...publishInput, name: 'Delete race' });
  const deleteRaceV2 = await deleteRaceService.publishVersion(deleteRacePreset.id, {
    ...publishInput,
    base_version_id: deleteRacePreset.versions[0].id,
    retained_paths: [],
    selected_paths: ['delete-race.jpg'],
  });
  deleteRaceStore.beforeDeleteVersionIfNotLast = () => {
    deleteRaceStore.versions = deleteRaceStore.versions.filter(row => row.id !== deleteRacePreset.versions[0].id);
  };
  await assert.rejects(deleteRaceService.deleteVersion(deleteRaceV2.id), DatasetPresetConflictError);
  assert.equal(deleteRaceSnapshots.quarantines, 1, 'the destructive race is detected by the transactional recheck');
  assert.equal(deleteRaceSnapshots.restores, 1, 'a last-version race must restore the quarantined snapshot');
  assert.notEqual(await deleteRaceStore.getVersion(deleteRaceV2.id), null, 'the last row must remain stored');

  for (const failurePoint of ['stage', 'insert'] as const) {
    const gapStore = new MemoryStore();
    const gapSnapshots = new FakeSnapshots();
    const gapService = createDatasetPresetService({
      store: gapStore,
      snapshots: gapSnapshots,
      datasetsRoot: '/datasets',
    });
    const gapPreset = await gapService.createPreset({ ...publishInput, name: `Gap ${failurePoint}` });
    if (failurePoint === 'stage') gapSnapshots.stageError = new Error('stage failed');
    else gapStore.insertFailures.push(new Error('insert failed'));
    await assert.rejects(
      gapService.publishVersion(gapPreset.id, {
        ...publishInput,
        base_version_id: gapPreset.versions[0].id,
        retained_paths: [],
        selected_paths: ['failed.jpg'],
      }),
      DatasetPresetStorageError,
    );
    gapSnapshots.stageError = undefined;
    const afterGap = await gapService.publishVersion(gapPreset.id, {
      ...publishInput,
      base_version_id: gapPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['after-gap.jpg'],
    });
    assert.equal(afterGap.version, 3, `${failurePoint} failure must consume its reserved version`);
  }

  const archiveRaceStore = new MemoryStore();
  const archiveRaceSnapshots = new FakeSnapshots();
  const archiveRaceService = createDatasetPresetService({
    store: archiveRaceStore,
    snapshots: archiveRaceSnapshots,
    datasetsRoot: '/datasets',
  });
  const archiveRacePreset = await archiveRaceService.createPreset({ ...publishInput, name: 'Archive race' });
  archiveRaceStore.beforeInsertReservedVersion = () => {
    const row = archiveRaceStore.presets.find(candidate => candidate.id === archiveRacePreset.id)!;
    row.archived_at = new Date('2026-04-01T00:00:00.000Z');
  };
  await assert.rejects(
    archiveRaceService.publishVersion(archiveRacePreset.id, {
      ...publishInput,
      base_version_id: archiveRacePreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['archived.jpg'],
    }),
    DatasetPresetConflictError,
  );
  assert.equal(archiveRaceSnapshots.rollbacks, 1, 'archive-before-insert must roll the publication back');
  assert.deepEqual(
    archiveRaceStore.versions.map(version => version.version),
    [1],
  );

  const sharedStore = new MemoryStore();
  const sharedSnapshots = new FakeSnapshots();
  const sharedServiceA = createDatasetPresetService({
    store: sharedStore,
    snapshots: sharedSnapshots,
    datasetsRoot: '/datasets',
  });
  const sharedServiceB = createDatasetPresetService({
    store: sharedStore,
    snapshots: sharedSnapshots,
    datasetsRoot: '/datasets',
  });
  const sharedPreset = await sharedServiceA.createPreset({ ...publishInput, name: 'Shared services' });
  const sharedVersions = await Promise.all([
    sharedServiceA.publishVersion(sharedPreset.id, {
      ...publishInput,
      base_version_id: sharedPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['service-a.jpg'],
    }),
    sharedServiceB.publishVersion(sharedPreset.id, {
      ...publishInput,
      base_version_id: sharedPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['service-b.jpg'],
    }),
  ]);
  assert.deepEqual(
    sharedVersions.map(version => version.version).sort((left, right) => left - right),
    [2, 3],
  );
  assert.equal(
    sharedSnapshots.rollbacks,
    0,
    'shared-store reservations must avoid cross-service publication conflicts',
  );

  const exactDeleteStore = new MemoryStore();
  const exactDeleteSnapshots = new FakeSnapshots();
  const exactDeleteService = createDatasetPresetService({
    store: exactDeleteStore,
    snapshots: exactDeleteSnapshots,
    datasetsRoot: '/datasets',
  });
  const exactDeleteA = await exactDeleteService.createPreset({ ...publishInput, name: 'Exact delete A' });
  const exactDeleteB = await exactDeleteService.createPreset({ ...publishInput, name: 'Exact delete B' });
  const exactDeleteV2 = await exactDeleteService.publishVersion(exactDeleteA.id, {
    ...publishInput,
    base_version_id: exactDeleteA.versions[0].id,
    retained_paths: [],
    selected_paths: ['exact-delete.jpg'],
  });
  exactDeleteStore.versions.find(version => version.id === exactDeleteV2.id)!.manifest_path =
    exactDeleteB.versions[0].manifest_path;
  await assert.rejects(exactDeleteService.deleteVersion(exactDeleteV2.id), DatasetPresetStorageError);
  assert.equal(exactDeleteSnapshots.quarantines, 0, 'foreign valid manifest path must reject before quarantine');

  for (const [label, mutate] of [
    ['checksum', (row: DatasetPresetVersionRow) => (row.manifest_sha256 = 'e'.repeat(64))],
    [
      'loader',
      (row: DatasetPresetVersionRow) => (row.loader_config = JSON.stringify({ ...loaderConfig, num_repeats: 9 })),
    ],
    ['count', (row: DatasetPresetVersionRow) => (row.media_count += 1)],
    ['bytes', (row: DatasetPresetVersionRow) => (row.total_bytes += BigInt(1))],
  ] as const) {
    const checkedStore = new MemoryStore();
    const checkedSnapshots = new FakeSnapshots();
    const checkedService = createDatasetPresetService({
      store: checkedStore,
      snapshots: checkedSnapshots,
      datasetsRoot: '/datasets',
    });
    const checkedPreset = await checkedService.createPreset({ ...publishInput, name: `Checked delete ${label}` });
    const checkedV2 = await checkedService.publishVersion(checkedPreset.id, {
      ...publishInput,
      base_version_id: checkedPreset.versions[0].id,
      retained_paths: [],
      selected_paths: [`${label}.jpg`],
    });
    mutate(checkedStore.versions.find(version => version.id === checkedV2.id)!);
    await assert.rejects(checkedService.deleteVersion(checkedV2.id), DatasetPresetStorageError);
    assert.equal(checkedSnapshots.quarantines, 0, `${label} mismatch must reject before quarantine`);
  }

  for (const [label, mutate] of [
    [
      'path',
      (row: DatasetPresetVersionRow, other: DatasetPresetVersionRow) => (row.manifest_path = other.manifest_path),
    ],
    ['checksum', (row: DatasetPresetVersionRow) => (row.manifest_sha256 = 'd'.repeat(64))],
    [
      'loader',
      (row: DatasetPresetVersionRow) => (row.loader_config = JSON.stringify({ ...loaderConfig, num_repeats: 7 })),
    ],
    ['count', (row: DatasetPresetVersionRow) => (row.media_count += 1)],
    ['bytes', (row: DatasetPresetVersionRow) => (row.total_bytes += BigInt(1))],
  ] as const) {
    const baseStore = new MemoryStore();
    const baseSnapshots = new FakeSnapshots();
    const baseService = createDatasetPresetService({
      store: baseStore,
      snapshots: baseSnapshots,
      datasetsRoot: '/datasets',
    });
    const basePreset = await baseService.createPreset({ ...publishInput, name: `Base ${label}` });
    const otherPreset = await baseService.createPreset({ ...publishInput, name: `Other ${label}` });
    const baseRow = baseStore.versions.find(version => version.id === basePreset.versions[0].id)!;
    const otherRow = baseStore.versions.find(version => version.id === otherPreset.versions[0].id)!;
    mutate(baseRow, otherRow);
    const stagesBefore = baseSnapshots.stageInputs.length;
    await assert.rejects(
      baseService.publishVersion(basePreset.id, {
        ...publishInput,
        base_version_id: basePreset.versions[0].id,
        retained_paths: ['a.jpg'],
        selected_paths: ['new.jpg'],
      }),
      DatasetPresetStorageError,
    );
    assert.equal(baseSnapshots.stageInputs.length, stagesBefore, `${label} base mismatch must block staging`);
  }

  const bulkStore = new MemoryStore();
  const bulkSnapshots = new FakeSnapshots();
  const bulkService = createDatasetPresetService({
    store: bulkStore,
    snapshots: bulkSnapshots,
    datasetsRoot: '/datasets',
  });
  await bulkService.createPreset({ ...publishInput, name: 'Bulk B' });
  await bulkService.createPreset({ ...publishInput, name: 'Bulk A' });
  bulkStore.listActiveWithVersionsCalls = 0;
  bulkStore.listVersionsCalls = 0;
  assert.deepEqual(
    (await bulkService.listActive()).map(summary => summary.name),
    ['Bulk A', 'Bulk B'],
  );
  assert.equal(bulkStore.listActiveWithVersionsCalls, 1, 'active listing must use one bulk store call');
  assert.equal(bulkStore.listVersionsCalls, 0, 'active listing must not query versions once per preset');

  console.log('Dataset preset service tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
