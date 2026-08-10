import assert from 'node:assert/strict';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { PrismaClient as RepositoryPrismaClient } from '@prisma/client';
import {
  buildDatasetPresetManifest,
  manifestSha256,
  type DatasetPresetLoaderConfig,
} from '../src/helpers/datasetPresets';
import {
  DatasetPresetConflictError,
  DatasetPresetReferencedError,
  DatasetPresetStoreError,
  createDatasetPresetService,
} from '../src/server/datasetPresetService';
import { createDatasetPresetPrismaStore, type DatasetPresetPrismaClient } from '../src/server/datasetPresetPrismaStore';
import { createDatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
import {
  createJobDatasetVersionPrismaStore,
  createJobWritePrismaStore,
  jobWithDatasetPresetUsagesInclude,
  jobWithDatasetPresetUsagesResponse,
} from '../src/server/jobDatasetPresetPrismaStore';
import {
  preflightJobDatasetPresets,
  saveJobWithDatasetUsages,
} from '../src/server/jobDatasetPresetService';
import { prepareClaimAndLaunchJob } from '../src/server/jobStartOrchestration';
import {
  createDatasetPresetStartupMaintenance,
  startWorkerAfterMaintenance,
} from '../src/server/datasetPresetMaintenance';
import DatasetProvenance from '../src/components/DatasetProvenance';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import type {
  DatasetPresetSnapshotStore,
  SnapshotQuarantine,
  StageVersionInput,
  StagedPublication,
} from '../src/server/datasetPresetSnapshotService';
import type { JobConfig } from '../src/types';

const TEMP_PREFIX = 'ai-toolkit-dataset-preset-db-';
const uiRoot = resolve(process.cwd());
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type GeneratedClientHarness = DatasetPresetPrismaClient &
  Pick<RepositoryPrismaClient, 'job'> & { $disconnect(): Promise<void> };

function assertSafe(directory: string): void {
  const realTemp = realpathSync(tmpdir());
  const realDirectory = realpathSync(directory);
  const child = relative(realTemp, realDirectory);
  if (
    realpathSync(dirname(realDirectory)) !== realTemp ||
    child === '' ||
    child === '..' ||
    child.startsWith(`..${sep}`) ||
    isAbsolute(child) ||
    !basename(realDirectory).startsWith(TEMP_PREFIX)
  )
    throw new Error(`Refusing unsafe integration test directory: ${realDirectory}`);
}

function runPrisma(args: string[]): void {
  const result = spawnSync(process.execPath, [join(uiRoot, 'node_modules', 'prisma', 'build', 'index.js'), ...args], {
    cwd: uiRoot,
    // This Arch-hosted test environment's schema engine exits without a useful
    // diagnostic at its inherited `RUST_LOG=warn`; `info` is stable and output
    // remains captured unless Prisma fails.
    env: { ...process.env, RUST_LOG: 'info' },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma failed: ${result.stdout}\n${result.stderr}`);
}

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : renderedText(child))).join('');
}

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

class FakeSnapshots implements DatasetPresetSnapshotStore {
  manifests = new Map<string, ReturnType<typeof buildDatasetPresetManifest>>();
  async stageVersion(input: StageVersionInput): Promise<StagedPublication> {
    const manifest = buildDatasetPresetManifest({
      preset_id: input.presetId,
      version: input.version,
      preset_name: input.presetName,
      source_dataset: input.sourceDataset,
      created_at: '2026-04-01T00:00:00.000Z',
      note: input.note,
      loader_config: input.loaderConfig,
      files: [...input.selectedPaths, ...(input.retainedPaths ?? [])].map((path, index) => ({
        source_path: path,
        managed_path: `media/${path}`,
        media_bytes: index + 10,
        media_sha256: String(index + 1).repeat(64),
        caption_ext: 'txt',
        caption_text: null,
        caption_bytes: null,
        caption_sha256: null,
        caption_missing: true,
      })),
    });
    const manifestPath = `${input.presetId}/v${input.version}/manifest.json`;
    return {
      versionRoot: manifestPath,
      manifestPath,
      manifest,
      manifestSha256: manifestSha256(manifest),
      publish: async () => {
        this.manifests.set(manifestPath, structuredClone(manifest));
      },
      rollback: async () => {
        this.manifests.delete(manifestPath);
      },
    };
  }
  async readManifest(path: string) {
    const value = this.manifests.get(path);
    if (!value) throw new Error('missing');
    return structuredClone(value);
  }
  async verifyFast(path: string) {
    return this.readManifest(path);
  }
  async verifyFull(path: string) {
    return this.readManifest(path);
  }
  resolveMediaRoot(path: string): string {
    return path;
  }
  async quarantineVersion(path: string): Promise<SnapshotQuarantine> {
    const value = this.manifests.get(path);
    this.manifests.delete(path);
    return {
      restore: async () => {
        if (value) this.manifests.set(path, value);
      },
      remove: async () => undefined,
    };
  }
  async cleanupStaging(): Promise<string[]> {
    return [];
  }
  async findPublishedOrphans(): Promise<string[]> {
    return [];
  }
}

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  let client: GeneratedClientHarness | undefined;
  let secondClient: GeneratedClientHarness | undefined;
  try {
    assertSafe(directory);
    writeFileSync(join(directory, 'package.json'), '{"private":true}', 'utf8');
    symlinkSync(
      join(uiRoot, 'node_modules'),
      join(directory, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const schemaPath = join(directory, 'schema.prisma');
    const databasePath = join(directory, 'presets.sqlite').replace(/\\/g, '/');
    const clientOutput = join(directory, 'generated-client').replace(/\\/g, '/');
    const sourceSchema = readFileSync(join(uiRoot, 'prisma', 'schema.prisma'), 'utf8');
    assert.ok(sourceSchema.includes('provider = "prisma-client-js"'), 'schema client generator marker changed');
    assert.ok(sourceSchema.includes('url      = "file:../../aitk_db.db"'), 'schema datasource marker changed');
    const temporarySchema = sourceSchema
      .replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${clientOutput}"`)
      .replace('url      = "file:../../aitk_db.db"', `url      = "file://${databasePath}"`);
    assert.ok(temporarySchema.includes(`output = "${clientOutput}"`));
    assert.ok(temporarySchema.includes(`url      = "file://${databasePath}"`));
    assert.equal(relative(directory, databasePath), 'presets.sqlite');
    writeFileSync(schemaPath, temporarySchema, 'utf8');
    runPrisma(['generate', '--schema', schemaPath]);
    runPrisma(['db', 'push', '--schema', schemaPath, '--skip-generate']);
    const { PrismaClient: GeneratedPrismaClient } = require(clientOutput) as { PrismaClient: new () => unknown };
    client = new GeneratedPrismaClient() as GeneratedClientHarness;
    secondClient = new GeneratedPrismaClient() as GeneratedClientHarness;

    const store = createDatasetPresetPrismaStore(client);
    const secondStore = createDatasetPresetPrismaStore(secondClient);
    const snapshots = new FakeSnapshots();
    const service = createDatasetPresetService({ store, snapshots, datasetsRoot: directory });
    const input = {
      name: '  Portrait  ',
      source_dataset: 'photos',
      selected_paths: ['a.jpg'],
      caption_ext: 'txt',
      loader_config: loaderConfig,
      note: null,
    };
    const v1Preset = await service.createPreset(input);
    await assert.rejects(service.createPreset({ ...input, name: 'PORTRAIT' }), DatasetPresetConflictError);
    const v2 = await service.publishVersion(v1Preset.id, {
      ...input,
      base_version_id: v1Preset.versions[0].id,
      retained_paths: ['a.jpg'],
      selected_paths: ['b.jpg'],
    });
    assert.equal(v2.version, 2);
    assert.deepEqual(await store.listManifestPaths(), [
      v1Preset.versions[0].manifest_path,
      v2.manifest_path,
    ]);
    assert.deepEqual(
      (await service.getPreset(v1Preset.id)).versions.map(version => version.version),
      [1, 2],
    );
    assert.equal((await client.datasetPreset.findUnique({ where: { id: v1Preset.id } }))?.next_version, 3);

    await client.datasetPreset.update({ where: { id: v1Preset.id }, data: { next_version: 1 } });
    assert.equal(
      await store.reserveNextVersion(v1Preset.id),
      3,
      'reservation must repair a counter introduced below existing versions during db push',
    );
    assert.equal((await client.datasetPreset.findUnique({ where: { id: v1Preset.id } }))?.next_version, 4);

    const reservationPreset = await store.createPreset({ name: 'Reservation', name_key: 'reservation' });
    const reservations = await Promise.all([
      store.reserveNextVersion(reservationPreset.id),
      secondStore.reserveNextVersion(reservationPreset.id),
    ]);
    assert.deepEqual(
      reservations.sort((left, right) => left - right),
      [1, 2],
    );
    assert.equal((await client.datasetPreset.findUnique({ where: { id: reservationPreset.id } }))?.next_version, 3);

    const archivedInsertPreset = await store.createPreset({ name: 'Archived insert', name_key: 'archived insert' });
    const archivedReservedVersion = await store.reserveNextVersion(archivedInsertPreset.id);
    await store.setArchived(archivedInsertPreset.id, new Date('2026-04-01T00:00:00.000Z'));
    await assert.rejects(
      store.reserveNextVersion(archivedInsertPreset.id),
      error => error instanceof DatasetPresetStoreError && error.code === 'archived',
    );
    await assert.rejects(
      store.insertReservedVersionIfActive({
        preset_id: archivedInsertPreset.id,
        version: archivedReservedVersion,
        source_dataset: 'photos',
        manifest_path: 'archived',
        manifest_sha256: 'a'.repeat(64),
        loader_config: JSON.stringify(loaderConfig),
        note: null,
        media_count: 1,
        total_bytes: BigInt(1),
      }),
      error => error instanceof DatasetPresetStoreError && error.code === 'archived',
    );

    const highWaterPreset = await service.createPreset({ ...input, name: 'High water' });
    const highWaterV2 = await service.publishVersion(highWaterPreset.id, {
      ...input,
      base_version_id: highWaterPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['high-water-v2.jpg'],
    });
    await service.deleteVersion(highWaterV2.id);
    const highWaterV3 = await service.publishVersion(highWaterPreset.id, {
      ...input,
      base_version_id: highWaterPreset.versions[0].id,
      retained_paths: [],
      selected_paths: ['high-water-v3.jpg'],
    });
    assert.equal(highWaterV3.version, 3);
    assert.equal((await client.datasetPreset.findUnique({ where: { id: highWaterPreset.id } }))?.next_version, 4);

    const emptyPreset = await service.createPreset({ ...input, name: 'Empty stable preset' });
    await service.deleteVersion(emptyPreset.versions[0].id);
    assert.equal((await service.getPreset(emptyPreset.id)).version_count, 0);
    assert.notEqual(
      await client.datasetPreset.findUnique({ where: { id: emptyPreset.id } }),
      null,
      'deleting a sole version must retain the stable preset row',
    );

    await assert.rejects(
      store.insertReservedVersionIfActive({
        preset_id: v1Preset.id,
        version: 2,
        source_dataset: 'photos',
        manifest_path: 'duplicate',
        manifest_sha256: 'a'.repeat(64),
        loader_config: JSON.stringify(loaderConfig),
        note: null,
        media_count: 1,
        total_bytes: BigInt(1),
      }),
      error => error instanceof DatasetPresetStoreError && error.code === 'version_conflict',
    );

    const huge = BigInt('9007199254740993000');
    await store.insertReservedVersionIfActive({
      preset_id: v1Preset.id,
      version: 3,
      source_dataset: 'photos',
      manifest_path: 'huge',
      manifest_sha256: 'b'.repeat(64),
      loader_config: JSON.stringify(loaderConfig),
      note: null,
      media_count: 1,
      total_bytes: huge,
    });
    assert.equal((await service.getPreset(v1Preset.id)).total_bytes, huge.toString());

    const stalePreset = await store.createPreset({ name: 'Stale', name_key: 'stale' });
    await client.datasetPreset.delete({ where: { id: stalePreset.id } });
    await assert.rejects(
      store.updateName(stalePreset.id, 'Gone', 'gone'),
      error => error instanceof DatasetPresetStoreError && error.code === 'not_found',
    );
    const staleVersion = await store.insertReservedVersionIfActive({
      preset_id: v1Preset.id,
      version: 4,
      source_dataset: 'photos',
      manifest_path: 'stale',
      manifest_sha256: 'c'.repeat(64),
      loader_config: JSON.stringify(loaderConfig),
      note: null,
      media_count: 1,
      total_bytes: BigInt(1),
    });
    await client.datasetPresetVersion.delete({ where: { id: staleVersion.id } });
    await assert.rejects(
      store.deleteVersion(staleVersion.id),
      error => error instanceof DatasetPresetStoreError && error.code === 'not_found',
    );

    const job = await client.job.create({
      data: { name: 'usage-job', gpu_ids: '0', job_config: '{}', job_type: 'train' },
    });
    await client.jobDatasetPresetUsage.create({
      data: {
        job_id: job.id,
        preset_version_id: v2.id,
        dataset_index: 0,
        preset_name: 'Portrait',
        preset_version: 2,
        manifest_sha256: v2.manifest_sha256,
        resolved_loader_config: JSON.stringify(loaderConfig),
      },
    });
    await assert.rejects(
      store.deleteVersion(v2.id),
      error => error instanceof DatasetPresetStoreError && error.code === 'referenced',
    );
    assert.notEqual(await store.getVersion(v2.id), null, 'a restricted direct delete must retain the version row');
    await assert.rejects(
      client.jobDatasetPresetUsage.create({
        data: {
          job_id: job.id,
          preset_version_id: v1Preset.versions[0].id,
          dataset_index: 0,
          preset_name: 'Portrait',
          preset_version: 1,
          manifest_sha256: v1Preset.versions[0].manifest_sha256,
          resolved_loader_config: JSON.stringify(loaderConfig),
        },
      }),
      error => typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002',
    );
    await client.jobDatasetPresetUsage.create({
      data: {
        job_id: job.id,
        preset_version_id: v1Preset.versions[0].id,
        dataset_index: 1,
        preset_name: 'Portrait',
        preset_version: 1,
        manifest_sha256: v1Preset.versions[0].manifest_sha256,
        resolved_loader_config: JSON.stringify(loaderConfig),
      },
    });
    assert.equal(await store.countVersionUsages(v1Preset.versions[0].id), 1);
    await assert.rejects(service.deleteVersion(v2.id), DatasetPresetReferencedError);
    await client.job.delete({ where: { id: job.id } });
    assert.equal(await store.countVersionUsages(v2.id), 0);
    assert.equal(await store.countVersionUsages(v1Preset.versions[0].id), 0);
    await service.deleteVersion(v2.id);
    assert.equal(await store.getVersion(v2.id), null);

    // Reproducible service-level smoke: real snapshots plus the temporary Prisma DB.
    const smokeDatasetsRoot = join(directory, 'smoke-datasets');
    const smokeSourceRoot = join(smokeDatasetsRoot, 'my-images');
    const smokeDataRoot = join(directory, 'smoke-data');
    mkdirSync(smokeSourceRoot, { recursive: true });
    mkdirSync(smokeDataRoot);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    for (const [name, caption] of [['a.png', 'alpha'], ['b.png', 'beta'], ['c.png', 'gamma']] as const) {
      writeFileSync(join(smokeSourceRoot, name), png);
      writeFileSync(join(smokeSourceRoot, name.replace('.png', '.txt')), caption);
    }
    const smokeSnapshots = createDatasetPresetSnapshotStore(smokeDataRoot);
    const smokeService = createDatasetPresetService({ store, snapshots: smokeSnapshots, datasetsRoot: smokeDatasetsRoot });
    const smokePreset = await smokeService.createPreset({
      name: 'smoke-preset', source_dataset: 'my-images', selected_paths: ['a.png', 'b.png'],
      caption_ext: 'txt', loader_config: loaderConfig, note: 'smoke v1',
    });
    const smokeV1 = smokePreset.versions[0];
    writeFileSync(join(smokeSourceRoot, 'a.png'), Buffer.from([9, 9, 9]));
    rmSync(join(smokeSourceRoot, 'b.png'));
    assert.equal((await smokeService.verifyVersion(smokeV1.id, true)).media_count, 2);
    const smokeV2 = await smokeService.publishVersion(smokePreset.id, {
      source_dataset: 'my-images', selected_paths: ['c.png'], retained_paths: ['b.png'],
      base_version_id: smokeV1.id, caption_ext: 'txt', loader_config: loaderConfig, note: 'smoke v2',
    });
    assert.equal(smokeV2.version, 2);

    const versions = createJobDatasetVersionPrismaStore(client as never);
    const jobs = createJobWritePrismaStore(client as never);
    const smokeDataset = (version: typeof smokeV1, repeats: number) => ({
      ...loaderConfig,
      num_repeats: repeats,
      folder_path: '/browser/live/path',
      dataset_preset: {
        version_id: version.id, preset_id: version.preset_id, preset_name: 'smoke-preset',
        version: version.version, manifest_sha256: version.manifest_sha256,
      },
    });
    const smokeJobConfig = {
      config: { process: [{ datasets: [smokeDataset(smokeV1, 2), smokeDataset(smokeV2, 5)] }] },
    } as unknown as JobConfig;
    const smokeJob = await saveJobWithDatasetUsages({
      id: null, clone: false, name: 'smoke-job', gpu_ids: '0', job_config: smokeJobConfig,
      jobs, versions, snapshots: smokeSnapshots,
    });
    const smokeResponse = jobWithDatasetPresetUsagesResponse(await client.job.findUnique({
      where: { id: smokeJob.id }, include: jobWithDatasetPresetUsagesInclude,
    }))!;
    assert.deepEqual(smokeResponse.dataset_preset_usages.map(usage => [
      usage.preset_version, usage.resolved_loader_config.num_repeats,
    ]), [[1, 2], [2, 5]]);

    const versionDetails = new Map([
      [smokeV1.id, await smokeService.getVersion(smokeV1.id)],
      [smokeV2.id, await smokeService.getVersion(smokeV2.id)],
    ]);
    globalThis.fetch = (async (input: string | URL | Request) => {
      const versionId = decodeURIComponent(String(input).split('/').at(-1) ?? '');
      const detail = versionDetails.get(versionId);
      return new Response(JSON.stringify(detail ?? { error: 'missing' }), { status: detail ? 200 : 404 });
    }) as typeof fetch;
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (!String(args[0]).includes('react-test-renderer is deprecated')) originalConsoleError(...args);
    };
    let provenanceRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      provenanceRenderer = TestRenderer.create(React.createElement(DatasetProvenance, {
        usages: smokeResponse.dataset_preset_usages,
      }));
    });
    const provenanceCards = provenanceRenderer.root.findAllByType('article');
    assert.equal(provenanceCards.length, 2);
    assert.match(renderedText(provenanceCards[0]), /Dataset 1.*smoke-preset.*Version 1/);
    assert.match(renderedText(provenanceCards[1]), /Dataset 2.*smoke-preset.*Version 2/);
    await act(async () => {
      for (const card of provenanceCards) card.findByType('button').props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.match(renderedText(provenanceRenderer.root.findAllByType('article')[0]), /num_repeats2/);
    assert.match(renderedText(provenanceRenderer.root.findAllByType('article')[1]), /num_repeats5/);
    await act(async () => provenanceRenderer.unmount());
    console.error = originalConsoleError;

    const maintenancePresetRoot = join(smokeDataRoot, 'dataset_presets', smokePreset.id);
    const oldStaging = join(maintenancePresetRoot, '.staging-startup-old');
    const newStaging = join(maintenancePresetRoot, '.staging-startup-new');
    const orphanRoot = join(smokeDataRoot, 'dataset_presets', 'startup-orphan', 'v1');
    mkdirSync(oldStaging);
    mkdirSync(newStaging);
    mkdirSync(orphanRoot, { recursive: true });
    writeFileSync(join(orphanRoot, 'manifest.json'), '{}');
    const startupNow = new Date('2026-08-10T12:00:00.000Z');
    utimesSync(oldStaging, new Date('2026-08-09T11:59:59.000Z'), new Date('2026-08-09T11:59:59.000Z'));
    utimesSync(newStaging, new Date('2026-08-09T12:00:00.000Z'), new Date('2026-08-09T12:00:00.000Z'));
    const maintenanceInfo: string[] = [];
    let maintenanceStarts = 0;
    await startWorkerAfterMaintenance({
      ensureJournalMode: async () => undefined,
      maintenance: createDatasetPresetStartupMaintenance({
        getDataRoot: async () => smokeDataRoot,
        prisma: client,
        now: () => startupNow,
        info: message => maintenanceInfo.push(message),
        warn: message => maintenanceInfo.push(message),
      }),
      start: () => { maintenanceStarts += 1; },
      warn: message => maintenanceInfo.push(message),
    });
    assert.equal(maintenanceStarts, 1);
    assert.equal(existsSync(oldStaging), false);
    assert.equal(existsSync(newStaging), true);
    assert.equal(existsSync(join(smokeDataRoot, 'dataset_presets', smokeV1.manifest_path)), true);
    assert.equal(existsSync(orphanRoot), true);
    assert.ok(maintenanceInfo.includes(`Dataset preset recovery removed stale staging: ${smokePreset.id}/.staging-startup-old`));
    assert.ok(maintenanceInfo.includes('Dataset preset recovery found published orphan: startup-orphan/v1'));

    const failedMaintenanceRoot = join(directory, 'maintenance-root-file');
    writeFileSync(failedMaintenanceRoot, 'not a directory');
    let failureStarts = 0;
    const failureWarnings: string[] = [];
    await startWorkerAfterMaintenance({
      ensureJournalMode: async () => undefined,
      maintenance: createDatasetPresetStartupMaintenance({
        getDataRoot: async () => failedMaintenanceRoot,
        prisma: client,
        now: () => startupNow,
        info: () => undefined,
        warn: message => failureWarnings.push(message),
      }),
      start: () => { failureStarts += 1; },
      warn: () => undefined,
    });
    assert.equal(failureStarts, 1, 'production-wired maintenance failure never blocks worker startup');
    assert.deepEqual(failureWarnings, ['Dataset preset startup maintenance failed (Error)']);

    let launched = false;
    assert.equal(await prepareClaimAndLaunchJob({
      id: smokeJob.id, name: smokeJob.name, gpu_ids: smokeJob.gpu_ids,
      queue_position: 1, updated_at: smokeJob.updated_at, job_config: smokeJob.job_config,
    }, {
      prepare: config => preflightJobDatasetPresets(config, { versions, snapshots: smokeSnapshots }).then(() => config),
      claim: async () => false,
      fail: async () => false,
      launch: () => { launched = true; },
    }), 'cancelled');
    assert.equal(launched, false, 'smoke orchestration cancels before a launcher/model load');

    const smokeV1Manifest = await smokeSnapshots.readManifest(smokeV1.manifest_path);
    const corruptPath = join(smokeSnapshots.resolveMediaRoot(smokeV1.manifest_path), 'a.png');
    const originalSnapshotBytes = readFileSync(corruptPath);
    writeFileSync(corruptPath, Buffer.from([0]));
    await assert.rejects(smokeService.verifyVersion(smokeV1.id, true));
    await assert.rejects(preflightJobDatasetPresets(smokeJobConfig, { versions, snapshots: smokeSnapshots }));
    writeFileSync(corruptPath, originalSnapshotBytes);
    assert.equal((await smokeService.verifyVersion(smokeV1.id, true)).media_count, smokeV1Manifest.media_count);
    await preflightJobDatasetPresets(smokeJobConfig, { versions, snapshots: smokeSnapshots });

    await smokeService.setArchived(smokePreset.id, true);
    await saveJobWithDatasetUsages({
      id: smokeJob.id, clone: false, name: smokeJob.name, gpu_ids: smokeJob.gpu_ids,
      job_config: smokeJobConfig, jobs, versions, snapshots: smokeSnapshots,
    });
    await preflightJobDatasetPresets(smokeJobConfig, { versions, snapshots: smokeSnapshots });
    await assert.rejects(saveJobWithDatasetUsages({
      id: null, clone: false, name: 'new-after-archive', gpu_ids: '0', job_config: smokeJobConfig,
      jobs, versions, snapshots: smokeSnapshots,
    }), /active/i);
    await assert.rejects(smokeService.deleteVersion(smokeV1.id), DatasetPresetReferencedError);
    await assert.rejects(smokeService.deleteVersion(smokeV2.id), DatasetPresetReferencedError);

    await assert.rejects(
      client.datasetPreset.delete({ where: { id: v1Preset.id } }),
      error => typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2003',
    );
    console.log('Dataset preset Prisma integration tests passed');
  } finally {
    try {
      await secondClient?.$disconnect();
      await client?.$disconnect();
    } finally {
      if (existsSync(directory)) {
        assertSafe(directory);
        rmSync(directory, { recursive: true });
      }
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
