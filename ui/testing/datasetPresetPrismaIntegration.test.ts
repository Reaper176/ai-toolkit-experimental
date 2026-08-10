import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
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
import { createDatasetPresetPrismaStore } from '../src/server/datasetPresetPrismaStore';
import type {
  DatasetPresetSnapshotStore,
  SnapshotQuarantine,
  StageVersionInput,
  StagedPublication,
} from '../src/server/datasetPresetSnapshotService';

const TEMP_PREFIX = 'ai-toolkit-dataset-preset-db-';
const uiRoot = resolve(process.cwd());

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
}

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  let client: any;
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
    const { PrismaClient } = require(clientOutput) as { PrismaClient: new () => any };
    client = new PrismaClient();

    const store = createDatasetPresetPrismaStore(client);
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
    assert.deepEqual(
      (await service.getPreset(v1Preset.id)).versions.map(version => version.version),
      [1, 2],
    );

    await assert.rejects(
      store.insertVersion({
        preset_id: v1Preset.id,
        version: 2,
        source_dataset: 'photos',
        manifest_path: 'duplicate',
        manifest_sha256: 'a'.repeat(64),
        loader_config: JSON.stringify(loaderConfig),
        note: null,
        media_count: 1,
        total_bytes: 1n,
      }),
      error => error instanceof DatasetPresetStoreError && error.code === 'version_conflict',
    );

    const huge = 9007199254740993000n;
    await store.insertVersion({
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
    const staleVersion = await store.insertVersion({
      preset_id: v1Preset.id,
      version: 4,
      source_dataset: 'photos',
      manifest_path: 'stale',
      manifest_sha256: 'c'.repeat(64),
      loader_config: JSON.stringify(loaderConfig),
      note: null,
      media_count: 1,
      total_bytes: 1n,
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

    await assert.rejects(
      client.datasetPreset.delete({ where: { id: v1Preset.id } }),
      error => typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2003',
    );
    console.log('Dataset preset Prisma integration tests passed');
  } finally {
    try {
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
