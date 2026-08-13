import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { manifestSha256, validateManifest, type DatasetPresetLoaderConfig, type DatasetPresetManifestV1 } from '../src/helpers/datasetPresets';
import {
  preflightJobDatasetPresets,
  prepareJobDatasetPresetsForTraining,
  resolveJobDatasetPresets,
  saveJobWithDatasetUsages,
  type JobDatasetVersionStore,
  type JobWriteStore,
} from '../src/server/jobDatasetPresetService';
import type { DatasetPresetVersionRecord } from '../src/server/datasetPresetService';
import type { DatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
import type { DatasetConfig, JobConfig } from '../src/types';
import {
  DATASET_PRESET_EXTERNAL_AUXILIARY_PATH_KEYS,
  DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS,
} from '../src/helpers/datasetPresetValidation';

const loader: DatasetPresetLoaderConfig = {
  caption_ext: 'txt', default_caption: '', caption_dropout_rate: 0.1, shuffle_tokens: true,
  num_repeats: 2, resolution: [512, 768], is_reg: false, network_weight: 1,
  cache_latents_to_disk: true, flip_x: false, flip_y: true, num_frames: 1,
  shrink_video_to_frames: false, fps: 24, auto_frame_count: false, do_i2v: false,
  do_audio: false, audio_normalize: false, audio_preserve_pitch: false, mask_min_value: 0.1, invert_mask: false, controls: [],
};

function dataset(versionId?: string): DatasetConfig {
  return {
    folder_path: versionId ? '/browser/attack' : '/live/images', mask_path: null, mask_min_value: 0,
    default_caption: loader.default_caption, caption_ext: loader.caption_ext,
    caption_dropout_rate: loader.caption_dropout_rate, shuffle_tokens: loader.shuffle_tokens,
    is_reg: loader.is_reg, network_weight: loader.network_weight,
    cache_latents_to_disk: loader.cache_latents_to_disk, resolution: [...loader.resolution], controls: [],
    num_frames: loader.num_frames, shrink_video_to_frames: loader.shrink_video_to_frames,
    do_i2v: loader.do_i2v, do_audio: loader.do_audio, audio_normalize: loader.audio_normalize,
    audio_preserve_pitch: loader.audio_preserve_pitch, fps: loader.fps, flip_x: loader.flip_x,
    flip_y: loader.flip_y, num_repeats: loader.num_repeats, auto_frame_count: loader.auto_frame_count,
    ...(versionId ? { dataset_preset: {
      version_id: versionId, preset_id: 'browser-preset', preset_name: 'Browser lie', version: 999,
      manifest_sha256: 'f'.repeat(64),
    } } : {}),
  };
}

function job(datasets: DatasetConfig[]): JobConfig {
  return { job: 'extension', meta: { name: 'x', version: '1' }, config: {
    name: 'job', process: [{ type: 'sd_trainer', training_folder: '/train', performance_log_every: 1,
      trigger_word: null, device: 'cuda', save: {} as never, datasets, train: {} as never,
      logging: {} as never, model: {} as never, sample: {} as never }],
  } };
}

function manifest(id: string, presetId: string, version: number, config = loader): DatasetPresetManifestV1 {
  return {
    schema_version: 1, preset_id: presetId, version, preset_name: `manifest-${presetId}`,
    source_dataset: 'source', created_at: '2026-08-10T00:00:00.000Z', note: null,
    loader_config: structuredClone(config), media_count: 1, total_bytes: 3,
    files: [{ source_path: 'a.png', managed_path: 'a.png', media_bytes: 3,
      media_sha256: 'a'.repeat(64), caption_ext: 'txt', caption_text: null,
      caption_bytes: null, caption_sha256: null, caption_missing: true }],
  };
}

function fixtures(entries: Array<{ id: string; archived?: boolean; presetId?: string; version?: number }>) {
  const records = new Map<string, { preset: { id: string; name: string; archived_at: Date | null }; version: DatasetPresetVersionRecord }>();
  const manifests = new Map<string, DatasetPresetManifestV1>();
  for (const entry of entries) {
    const presetId = entry.presetId ?? `p-${entry.id}`;
    const versionNumber = entry.version ?? 1;
    const value = manifest(entry.id, presetId, versionNumber);
    const path = `${presetId}/v${versionNumber}/manifest.json`;
    manifests.set(path, value);
    records.set(entry.id, { preset: { id: presetId, name: `Preset ${entry.id}`, archived_at: entry.archived ? new Date() : null }, version: {
      id: entry.id, preset_id: presetId, version: versionNumber, source_dataset: 'source',
      manifest_path: path, manifest_sha256: manifestSha256(value), loader_config: structuredClone(loader),
      note: null, media_count: 1, total_bytes: '3', created_at: '2026-08-10T00:00:00.000Z',
    } });
  }
  const existing = new Map<string, string>();
  const versions: JobDatasetVersionStore = {
    async getVersionForResolution(id) { return structuredClone(records.get(id) ?? null); },
    async existingUsage(jobId, index) {
      const preset_version_id = existing.get(`${jobId}:${index}`);
      return preset_version_id ? { preset_version_id } : null;
    },
  };
  const snapshots = {
    async verifyFast(path: string) {
      const value = manifests.get(path);
      if (!value) throw new Error(`/private/root/${path} is corrupt`);
      return structuredClone(value);
    },
    async verifyFull(path: string) {
      const value = manifests.get(path);
      if (!value) throw new Error(`/private/root/${path} is corrupt`);
      return structuredClone(value);
    },
    resolveMediaRoot(path: string) {
      if (!manifests.has(path)) throw new Error(`/private/root/${path} missing`);
      return `/managed/${path.replace('/manifest.json', '/media')}`;
    },
  } as DatasetPresetSnapshotStore;
  return { records, manifests, existing, versions, snapshots };
}

async function runResolutionTests(): Promise<void> {
  const f = fixtures([{ id: 'v1' }, { id: 'v2', presetId: 'p2', version: 4 }]);
  const masked = f.manifests.get(f.records.get('v1')!.version.manifest_path)!;
  Object.assign(masked.files[0], {
    mask_path: 'masks/a.png', mask_bytes: 2, mask_sha256: 'b'.repeat(64), mask_missing: false,
  });
  masked.total_bytes = 5;
  f.records.get('v1')!.version.manifest_sha256 = manifestSha256(masked);
  f.records.get('v1')!.version.total_bytes = '5';
  const input = job([dataset('v1'), dataset(), dataset('v2'), dataset('v1')]);
  input.config.process[0].datasets[0].caption_dropout_rate = 0.42;
  (input.config.process[0].datasets[0] as DatasetConfig & { browser_only?: string }).browser_only = 'discard me';
  const resolved = await resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: input,
    versions: f.versions, snapshots: f.snapshots });
  assert.equal(input.config.process[0].datasets[0].folder_path, '/browser/attack', 'input is not mutated');
  assert.equal(resolved.jobConfig.config.process[0].datasets[0].folder_path, '/managed/p-v1/v1/media');
  assert.equal(resolved.jobConfig.config.process[0].datasets[0].mask_path, '/managed/p-v1/v1/masks');
  assert.equal(resolved.jobConfig.config.process[0].datasets[2].mask_path, null, 'maskless versions resolve no mask directory');
  assert.equal(resolved.jobConfig.config.process[0].datasets[1].folder_path, '/live/images');
  assert.deepEqual(resolved.usages.map(item => item.dataset_index), [0, 2, 3]);
  assert.deepEqual(resolved.usages.map(item => item.preset_version_id), ['v1', 'v2', 'v1']);
  assert.deepEqual(resolved.jobConfig.config.process[0].datasets[0].dataset_preset, {
    version_id: 'v1', preset_id: 'p-v1', preset_name: 'Preset v1', version: 1,
    manifest_sha256: f.records.get('v1')!.version.manifest_sha256,
  });
  assert.deepEqual(resolved.usages[0].resolved_loader_config, { ...loader, caption_dropout_rate: 0.42, mask_min_value: 0 },
    'usage contains the final user-edited allowlisted settings only');
  assert.equal('browser_only' in resolved.usages[0].resolved_loader_config, false);
  resolved.usages[0].resolved_loader_config.resolution[0] = 99;
  assert.equal(resolved.usages[2].resolved_loader_config.resolution[0], 512, 'duplicate usages do not alias');
  assert.equal(input.config.process[0].datasets[0].resolution[0], 512, 'outputs do not alias input');
}

async function runLegacyChecksumCompatibility(): Promise<void> {
  const f = fixtures([{ id: 'legacy' }]);
  const record = f.records.get('legacy')!;
  const stored = f.manifests.get(record.version.manifest_path)! as unknown as { loader_config: Record<string, unknown> };
  delete stored.loader_config.mask_min_value;
  delete stored.loader_config.invert_mask;
  record.version.manifest_sha256 = manifestSha256(stored);
  record.version.loader_config = structuredClone(stored.loader_config) as never;
  const originalVerify = f.snapshots.verifyFast.bind(f.snapshots);
  f.snapshots.verifyFast = async path => {
    const raw = await originalVerify(path);
    return validateManifest(raw);
  };
  const resolved = await resolveJobDatasetPresets({
    jobId: null,
    clone: false,
    jobConfig: job([dataset('legacy')]),
    versions: f.versions,
    snapshots: f.snapshots,
  });
  assert.equal(resolved.usages[0].manifest_sha256, record.version.manifest_sha256);
  assert.equal(resolved.usages[0].resolved_loader_config.mask_min_value, 0);
}

async function runExternalAuxiliaryPathTests(): Promise<void> {
  const f = fixtures([{ id: 'v1' }]);
  assert.deepEqual(DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS, [
    'dataset_path',
    'mask_path',
    'control_path',
    'control_path_1',
    'control_path_2',
    'control_path_3',
    'unconditional_path',
    'inpaint_path',
    'clip_image_path',
  ]);
  assert.deepEqual(DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS.slice(1), [
    ...DATASET_PRESET_EXTERNAL_AUXILIARY_PATH_KEYS,
  ]);
  for (const key of DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS) {
    const blocked = dataset('v1') as DatasetConfig & Record<string, unknown>;
    blocked[key] = '/external/assets';
    await assert.rejects(
      resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([blocked]), versions: f.versions, snapshots: f.snapshots }),
      new RegExp(key),
      `${key} is rejected on a preset-backed dataset`,
    );
    const allowedEmptyValues = key === 'dataset_path' ? [null] : [null, ''];
    for (const empty of allowedEmptyValues) {
      const allowed = dataset('v1') as DatasetConfig & Record<string, unknown>;
      allowed[key] = empty;
      await resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([allowed]), versions: f.versions, snapshots: f.snapshots });
    }
  }
  for (const invalidDatasetPath of ['', '   ', [], 0, false, {}]) {
    const blocked = dataset('v1') as DatasetConfig & Record<string, unknown>;
    (blocked as Record<string, unknown>).dataset_path = invalidDatasetPath;
    await assert.rejects(
      resolveJobDatasetPresets({
        jobId: null, clone: false, jobConfig: job([blocked]), versions: f.versions, snapshots: f.snapshots,
      }),
      /dataset_path/,
      'only an absent or null dataset_path may coexist with preset provenance',
    );
  }
  const live = dataset() as DatasetConfig & Record<string, unknown>;
  live.dataset_path = '/external/live-dataset.json';
  live.mask_path = null;
  const resolved = await resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([live]), versions: f.versions, snapshots: f.snapshots });
  assert.equal(resolved.jobConfig.config.process[0].datasets[0].mask_path, null);
  assert.equal(
    (resolved.jobConfig.config.process[0].datasets[0] as DatasetConfig & Record<string, unknown>).dataset_path,
    '/external/live-dataset.json',
  );

  const root = await mkdtemp(join(tmpdir(), 'job-live-masks-'));
  try {
    const images = join(root, 'training');
    const masks = join(root, 'training_masks');
    await mkdir(images);
    await mkdir(masks);
    await writeFile(join(images, 'one.png'), PNG.sync.write(new PNG({ width: 1, height: 1 })));
    await writeFile(join(images, 'two.png'), PNG.sync.write(new PNG({ width: 1, height: 1 })));
    await writeFile(join(masks, 'one.png'), PNG.sync.write(new PNG({ width: 1, height: 1 })));
    const matching = dataset();
    matching.folder_path = images;
    matching.mask_path = null;
    const liveResolved = await resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([matching]), versions: f.versions, snapshots: f.snapshots, datasetsRoot: root });
    assert.equal(liveResolved.jobConfig.config.process[0].datasets[0].mask_path, masks);
    const explicit = dataset();
    explicit.folder_path = images;
    explicit.mask_path = masks;
    const explicitResolved = await prepareJobDatasetPresetsForTraining(job([explicit]), { versions: f.versions, snapshots: f.snapshots, datasetsRoot: root });
    assert.equal(explicitResolved.config.process[0].datasets[0].mask_path, masks, 'trusted persisted explicit live mask path is preserved');
    await assert.rejects(
      resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([explicit]), versions: f.versions, snapshots: f.snapshots }),
      /save request/i,
      'server save resolution rejects canonical browser-supplied live mask paths',
    );

    const nested = join(images, 'nested');
    await mkdir(nested);
    await writeFile(join(nested, 'deep.png'), PNG.sync.write(new PNG({ width: 1, height: 1 })));
    await writeFile(join(masks, 'deep.png'), PNG.sync.write(new PNG({ width: 1, height: 1 })));
    const nestedOnly = dataset();
    nestedOnly.folder_path = images;
    const nestedResolved = await resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([nestedOnly]), versions: f.versions, snapshots: f.snapshots, datasetsRoot: root });
    assert.equal(nestedResolved.jobConfig.config.process[0].datasets[0].mask_path, masks, 'nested media participates in live mask discovery');
    await writeFile(join(nested, 'one.jpg'), Buffer.from('not-needed-for-basename-check'));
    await assert.rejects(
      resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([nestedOnly]), versions: f.versions, snapshots: f.snapshots, datasetsRoot: root }),
      /duplicate mask basename/i,
    );
    for (const invalidRoot of ['/', root]) {
      const invalid = dataset(); invalid.folder_path = invalidRoot;
      await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([invalid]), versions: f.versions, snapshots: f.snapshots, datasetsRoot: root }), /invalid|ambiguous|escape/i);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function runArchiveAndFailureTests(): Promise<void> {
  const f = fixtures([{ id: 'archived', archived: true }, { id: 'active' }]);
  await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([dataset('archived')]), versions: f.versions, snapshots: f.snapshots }), /active/i);
  f.existing.set('job-1:0', 'archived');
  await resolveJobDatasetPresets({ jobId: 'job-1', clone: false, jobConfig: job([dataset('archived')]), versions: f.versions, snapshots: f.snapshots });
  await assert.rejects(resolveJobDatasetPresets({ jobId: 'job-1', clone: true, jobConfig: job([dataset('archived')]), versions: f.versions, snapshots: f.snapshots }), /active/i);
  f.existing.set('job-1:0', 'active');
  await assert.rejects(resolveJobDatasetPresets({ jobId: 'job-1', clone: false, jobConfig: job([dataset('archived')]), versions: f.versions, snapshots: f.snapshots }), /active/i);
  await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([dataset('missing')]), versions: f.versions, snapshots: f.snapshots }), /unavailable/i);

  const corrupt = fixtures([{ id: 'v1' }]);
  corrupt.manifests.get('p-v1/v1/manifest.json')!.preset_id = 'wrong';
  await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([dataset('v1')]), versions: corrupt.versions, snapshots: corrupt.snapshots }), error => {
    assert.equal(String(error).includes('/private/root'), false, 'errors do not leak managed roots');
    return /unavailable|invalid|inconsistent/i.test(String(error));
  });
  const missingSnapshot = fixtures([{ id: 'v1' }]);
  missingSnapshot.manifests.delete('p-v1/v1/manifest.json');
  await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: job([dataset('v1')]),
    versions: missingSnapshot.versions, snapshots: missingSnapshot.snapshots }), error => {
    assert.equal(String(error).includes('/private/root'), false, 'snapshot errors do not leak managed roots');
    return /unavailable/i.test(String(error));
  });

  for (const malformed of [null, {}, { config: null }, { config: { process: [{ datasets: {} }] } }]) {
    await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: malformed as JobConfig,
      versions: f.versions, snapshots: f.snapshots }), /job configuration/i);
  }
  const malformedDataset = job([null as unknown as DatasetConfig]);
  await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: malformedDataset,
    versions: f.versions, snapshots: f.snapshots }), /dataset/i);
}

function transactionalStore(options: { failJob?: boolean; failUsage?: boolean } = {}) {
  let state: { jobs: Array<{ id: string; job_config: JobConfig }>; usages: Array<{ jobId: string; dataset_index: number }> } = {
    jobs: [], usages: [{ jobId: 'edit', dataset_index: 9 }],
  };
  const store: JobWriteStore = { async transaction(operation) {
    const draft = structuredClone(state);
    const result = await operation({
      async createOrUpdateJob(input) {
        if (options.failJob) throw new Error('job write failed');
        const id = input.id ?? 'created';
        draft.jobs = draft.jobs.filter(item => item.id !== id);
        draft.jobs.push({ id, job_config: structuredClone(input.job_config) });
        return { id } as never;
      },
      async assertDatasetPresetEligibility() {},
      async deleteUsages(jobId) { draft.usages = draft.usages.filter(item => item.jobId !== jobId); },
      async createUsages(jobId, usages) {
        if (options.failUsage) throw new Error('usage write failed');
        draft.usages.push(...usages.map(item => ({ jobId, dataset_index: item.dataset_index })));
      },
    });
    state = draft;
    return result;
  } };
  return { store, state: () => structuredClone(state) };
}

async function runSaveTests(): Promise<void> {
  const f = fixtures([{ id: 'v1' }]);
  const success = transactionalStore();
  const saved = await saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
    job_config: job([dataset('v1')]), jobs: success.store, versions: f.versions, snapshots: f.snapshots });
  assert.equal(saved.id, 'edit');
  assert.deepEqual(success.state().usages, [{ jobId: 'edit', dataset_index: 0 }], 'stale usages are replaced');
  await saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
    job_config: job([dataset()]), jobs: success.store, versions: f.versions, snapshots: f.snapshots });
  assert.deepEqual(success.state().usages, [], 'switching to live removes stale provenance');
  for (const failure of [{ failJob: true }, { failUsage: true }]) {
    const target = transactionalStore(failure);
    const before = target.state();
    await assert.rejects(saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
      job_config: job([dataset('v1')]), jobs: target.store, versions: f.versions, snapshots: f.snapshots }));
    assert.deepEqual(target.state(), before, 'transaction rolls back every write');
  }
  const wrongId: JobWriteStore = { async transaction(operation) { return operation({
    async createOrUpdateJob() { return { id: 'wrong' } as never; },
    async assertDatasetPresetEligibility() {}, async deleteUsages() {}, async createUsages() {},
  }); } };
  await assert.rejects(saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
    job_config: job([]), jobs: wrongId, versions: f.versions, snapshots: f.snapshots }), /identity/i);

  const race = transactionalStore();
  const raceBefore = race.state();
  const raceStore: JobWriteStore = {
    async transaction(operation) {
      return race.store.transaction(tx => operation({
        ...tx,
        async assertDatasetPresetEligibility() {
          f.records.get('v1')!.preset.archived_at = new Date();
          throw new Error('transactional archived eligibility rejected');
        },
      }));
    },
  };
  await assert.rejects(saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
    job_config: job([dataset('v1')]), jobs: raceStore, versions: f.versions, snapshots: f.snapshots }),
  /transactional archived eligibility/);
  assert.deepEqual(race.state(), raceBefore, 'archive race rejects and rolls back the job write');

  const historical = fixtures([{ id: 'historical', archived: true }]);
  historical.existing.set('edit:0', 'historical');
  const historicalStore = transactionalStore();
  await saveJobWithDatasetUsages({ id: 'edit', clone: false, name: 'name', gpu_ids: '0',
    job_config: job([dataset('historical')]), jobs: historicalStore.store,
    versions: historical.versions, snapshots: historical.snapshots });

  for (const mode of [
    { label: 'new', id: null, clone: false },
    { label: 'edit', id: 'edit', clone: false },
    { label: 'clone', id: null, clone: true },
  ] as const) {
    for (const override of ['/attacker/override.json', '', '   ']) {
      const malicious = dataset('v1') as DatasetConfig & Record<string, unknown>;
      malicious.dataset_path = override;
      const target = transactionalStore();
      const before = target.state();
      let verified = 0;
      const snapshots = {
        ...f.snapshots,
        async verifyFast(path: string) {
          verified += 1;
          return f.snapshots.verifyFast(path);
        },
      } as DatasetPresetSnapshotStore;
      await assert.rejects(
        saveJobWithDatasetUsages({
          id: mode.id, clone: mode.clone, name: mode.label, gpu_ids: '0',
          job_config: job([malicious]), jobs: target.store, versions: f.versions, snapshots,
        }),
        /dataset_path/,
        `${mode.label} rejects Python's primary dataset path override ${JSON.stringify(override)}`,
      );
      assert.equal(verified, 0, `${mode.label} rejects dataset_path before snapshot verification`);
      assert.deepEqual(target.state(), before, `${mode.label} rejects before transaction writes provenance`);
    }
  }
}

async function runLaterProcessValidationTests(): Promise<void> {
  const f = fixtures([{ id: 'v1' }]);
  for (const datasets of [null, {}, [null]]) {
    const input = job([]) as unknown as { config: { process: Array<Record<string, unknown>> } };
    input.config.process.push({ datasets });
    await assert.rejects(resolveJobDatasetPresets({ jobId: null, clone: false, jobConfig: input as unknown as JobConfig,
      versions: f.versions, snapshots: f.snapshots }), /dataset|configuration/i);
  }
}

async function runPreflightTests(): Promise<void> {
  const f = fixtures([{ id: 'v1' }]);
  const input = job([dataset('v1')]);
  const before = structuredClone(input);
  await preflightJobDatasetPresets(input, { versions: f.versions, snapshots: f.snapshots });
  assert.deepEqual(input, before, 'preflight does not mutate its input');

  const archived = fixtures([{ id: 'historical', archived: true }]);
  await preflightJobDatasetPresets(job([dataset('historical')]), {
    versions: archived.versions,
    snapshots: archived.snapshots,
  });
  archived.manifests.delete('p-historical/v1/manifest.json');
  await assert.rejects(
    preflightJobDatasetPresets(job([dataset('historical')]), {
      versions: archived.versions,
      snapshots: archived.snapshots,
    }),
    /unavailable/i,
    'archived preflight still verifies snapshot integrity',
  );
  await assert.rejects(
    preflightJobDatasetPresets(job([dataset('missing')]), {
      versions: archived.versions,
      snapshots: archived.snapshots,
    }),
    /unavailable/i,
    'preflight still rejects a missing authoritative version',
  );
  const malicious = dataset('v1') as DatasetConfig & Record<string, unknown>;
  malicious.dataset_path = '/attacker/resolved-config.json';
  await assert.rejects(
    preflightJobDatasetPresets(job([malicious]), { versions: f.versions, snapshots: f.snapshots }),
    /dataset_path/,
    'resolved training configuration can never retain a primary dataset path override with provenance',
  );
}

async function main(): Promise<void> {
  await runLegacyChecksumCompatibility();
  await runResolutionTests();
  await runExternalAuxiliaryPathTests();
  await runArchiveAndFailureTests();
  await runSaveTests();
  await runLaterProcessValidationTests();
  await runPreflightTests();
  console.log('job dataset preset provenance tests passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
