import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { PrismaClient as RepositoryPrismaClient } from '@prisma/client';
import { buildDatasetPresetManifest, manifestSha256, type DatasetPresetLoaderConfig } from '../src/helpers/datasetPresets';
import { saveJobWithDatasetUsages, type JobWriteStore } from '../src/server/jobDatasetPresetService';
import {
  createJobDatasetVersionPrismaStore,
  createJobWritePrismaStore,
  jobWithDatasetPresetUsagesInclude,
  jobWithDatasetPresetUsagesResponse,
  type JobDatasetPresetPrismaClient,
} from '../src/server/jobDatasetPresetPrismaStore';
import type { DatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
import type { DatasetConfig, JobConfig } from '../src/types';

const TEMP_PREFIX = 'ai-toolkit-job-dataset-preset-db-';
const uiRoot = resolve(process.cwd());
type GeneratedClient = JobDatasetPresetPrismaClient &
  Pick<RepositoryPrismaClient, 'datasetPreset' | '$disconnect'>;

const loader: DatasetPresetLoaderConfig = {
  caption_ext: 'txt', default_caption: '', caption_dropout_rate: 0, shuffle_tokens: false,
  num_repeats: 1, resolution: [512], is_reg: false, network_weight: 1,
  cache_latents_to_disk: false, flip_x: false, flip_y: false, num_frames: 1,
  shrink_video_to_frames: true, fps: 24, auto_frame_count: false, do_i2v: false,
  do_audio: false, audio_normalize: false, audio_preserve_pitch: false, mask_min_value: 0.1, invert_mask: false, controls: [],
};

function assertSafe(directory: string): void {
  const realTemp = realpathSync(tmpdir());
  const realDirectory = realpathSync(directory);
  const child = relative(realTemp, realDirectory);
  if (
    realpathSync(dirname(realDirectory)) !== realTemp || child === '' || child === '..' ||
    child.startsWith(`..${sep}`) || isAbsolute(child) || !basename(realDirectory).startsWith(TEMP_PREFIX)
  ) throw new Error(`Refusing unsafe integration test directory: ${realDirectory}`);
}

function runPrisma(args: string[]): void {
  const result = spawnSync(process.execPath, [join(uiRoot, 'node_modules', 'prisma', 'build', 'index.js'), ...args], {
    cwd: uiRoot,
    env: { ...process.env, RUST_LOG: 'info' },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma failed: ${result.stdout}\n${result.stderr}`);
}

function dataset(versionId: string, presetId: string, version: number, hash: string): DatasetConfig {
  return {
    folder_path: '/browser/path', mask_path: null, mask_min_value: 0,
    default_caption: '', caption_ext: 'txt', caption_dropout_rate: 0, shuffle_tokens: false,
    is_reg: false, network_weight: 1, cache_latents_to_disk: false, resolution: [512], controls: [],
    num_frames: 1, shrink_video_to_frames: true, do_i2v: false, do_audio: false,
    audio_normalize: false, audio_preserve_pitch: false, fps: 24, flip_x: false, flip_y: false,
    num_repeats: 1, auto_frame_count: false,
    dataset_preset: { version_id: versionId, preset_id: presetId, preset_name: 'browser', version, manifest_sha256: hash },
  };
}

function jobConfig(datasets: DatasetConfig[]): JobConfig {
  return { job: 'extension', meta: { name: 'x', version: '1' }, config: { name: 'job', process: [{
    type: 'trainer', training_folder: '/train', performance_log_every: 1, trigger_word: null, device: 'cuda',
    save: {} as never, datasets, train: {} as never, logging: {} as never, model: {} as never, sample: {} as never,
  }] } };
}

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  let client: GeneratedClient | undefined;
  try {
    assertSafe(directory);
    writeFileSync(join(directory, 'package.json'), '{"private":true}', 'utf8');
    symlinkSync(join(uiRoot, 'node_modules'), join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    const schemaPath = join(directory, 'schema.prisma');
    const databasePath = join(directory, 'jobs.sqlite').replace(/\\/g, '/');
    const clientOutput = join(directory, 'generated-client').replace(/\\/g, '/');
    const sourceSchema = readFileSync(join(uiRoot, 'prisma', 'schema.prisma'), 'utf8');
    const temporarySchema = sourceSchema
      .replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${clientOutput}"`)
      .replace('url      = "file:../../aitk_db.db"', `url      = "file://${databasePath}"`);
    writeFileSync(schemaPath, temporarySchema, 'utf8');
    runPrisma(['generate', '--schema', schemaPath]);
    runPrisma(['db', 'push', '--schema', schemaPath, '--skip-generate']);
    const { PrismaClient: GeneratedPrismaClient } = require(clientOutput) as { PrismaClient: new () => unknown };
    client = new GeneratedPrismaClient() as GeneratedClient;

    const manifests = new Map<string, ReturnType<typeof buildDatasetPresetManifest>>();
    async function seed(id: string, presetId: string, version: number) {
      const path = `${presetId}/v${version}/manifest.json`;
      const manifest = buildDatasetPresetManifest({
        preset_id: presetId, version, preset_name: `Preset ${presetId}`, source_dataset: 'source',
        created_at: '2026-08-10T00:00:00.000Z', note: null, loader_config: loader,
        files: [{ source_path: `${id}.png`, managed_path: `${id}.png`, media_bytes: 3,
          media_sha256: 'a'.repeat(64), caption_ext: 'txt', caption_text: null,
          caption_bytes: null, caption_sha256: null, caption_missing: true }],
      });
      manifests.set(path, manifest);
      await client!.datasetPreset.create({ data: { id: presetId, name: `Preset ${presetId}`, name_key: presetId } });
      await client!.datasetPresetVersion.create({ data: {
        id, preset_id: presetId, version, source_dataset: 'source', manifest_path: path,
        manifest_sha256: manifestSha256(manifest), loader_config: JSON.stringify(loader), note: null,
        media_count: 1, total_bytes: BigInt(3),
      } });
      return { id, presetId, version, hash: manifestSha256(manifest), path };
    }
    const first = await seed('v1', 'p1', 1);
    const second = await seed('v2', 'p2', 2);
    const snapshots = {
      async verifyFast(path: string) {
        const value = manifests.get(path);
        if (!value) throw new Error('missing');
        return structuredClone(value);
      },
      resolveMediaRoot(path: string) { return join(directory, path, '..', 'media'); },
    } as DatasetPresetSnapshotStore;
    const versions = createJobDatasetVersionPrismaStore(client);
    const jobs = createJobWritePrismaStore(client);

    const created = await saveJobWithDatasetUsages({
      id: null, clone: false, name: 'created', gpu_ids: '0',
      job_config: jobConfig([dataset(second.id, second.presetId, second.version, second.hash),
        { folder_path: '/live' } as DatasetConfig,
        dataset(first.id, first.presetId, first.version, first.hash)]),
      jobs, versions, snapshots,
    });
    const included = await client.job.findUnique({ where: { id: created.id }, include: jobWithDatasetPresetUsagesInclude });
    const response = jobWithDatasetPresetUsagesResponse(included)!;
    assert.deepEqual(response.dataset_preset_usages.map(usage => usage.dataset_index), [0, 2], 'single job usages are ordered');
    assert.deepEqual(response.dataset_preset_usages.map(usage => usage.preset_version_id), ['v2', 'v1']);
    assert.deepEqual(response.dataset_preset_usages[0].resolved_loader_config, { ...loader, mask_min_value: 0 });
    const compact = await client.job.findMany();
    assert.equal(Object.prototype.hasOwnProperty.call(compact[0], 'dataset_preset_usages'), false, 'list rows remain compact');

    await saveJobWithDatasetUsages({ id: created.id, clone: false, name: 'updated', gpu_ids: '1',
      job_config: jobConfig([dataset(first.id, first.presetId, first.version, first.hash)]),
      jobs, versions, snapshots });
    assert.deepEqual((await client.jobDatasetPresetUsage.findMany({ where: { job_id: created.id } }))
      .map(usage => [usage.dataset_index, usage.preset_version_id]), [[0, 'v1']], 'update replaces stale usages');

    const beforeConflict = await client.job.findUniqueOrThrow({ where: { id: created.id } });
    const persistedUsage = await client.jobDatasetPresetUsage.findFirstOrThrow({ where: { job_id: created.id } });
    await assert.rejects(jobs.transaction(async tx => {
      await tx.createOrUpdateJob({ id: created.id, clone: false, name: 'must rollback', gpu_ids: '9',
        job_config: jobConfig([]) });
      await tx.createUsages(created.id, [{
        dataset_index: persistedUsage.dataset_index, preset_version_id: persistedUsage.preset_version_id,
        preset_name: persistedUsage.preset_name, preset_version: persistedUsage.preset_version,
        manifest_sha256: persistedUsage.manifest_sha256, resolved_loader_config: loader,
      }]);
    }));
    assert.equal((await client.job.findUniqueOrThrow({ where: { id: created.id } })).name, beforeConflict.name,
      'usage conflict rolls back the job update');

    await client.datasetPreset.update({ where: { id: first.presetId }, data: { archived_at: new Date() } });
    await saveJobWithDatasetUsages({ id: created.id, clone: false, name: 'historical', gpu_ids: '1',
      job_config: jobConfig([dataset(first.id, first.presetId, first.version, first.hash)]), jobs, versions, snapshots });

    await client.datasetPreset.update({ where: { id: second.presetId }, data: { archived_at: null } });
    const raceJobs: JobWriteStore = { async transaction(operation) {
      await client!.datasetPreset.update({ where: { id: second.presetId }, data: { archived_at: new Date() } });
      return jobs.transaction(operation);
    } };
    const beforeRace = await client.job.findUniqueOrThrow({ where: { id: created.id } });
    await assert.rejects(saveJobWithDatasetUsages({ id: created.id, clone: false, name: 'race', gpu_ids: '8',
      job_config: jobConfig([dataset(second.id, second.presetId, second.version, second.hash)]),
      jobs: raceJobs, versions, snapshots }), /active/i);
    assert.deepEqual(await client.job.findUniqueOrThrow({ where: { id: created.id } }), beforeRace,
      'transactional archive recheck rejects and rolls back a changed usage');

    console.log('job dataset preset Prisma integration tests passed');
  } finally {
    try { await client?.$disconnect(); } finally {
      if (existsSync(directory)) { assertSafe(directory); rmSync(directory, { recursive: true }); }
    }
  }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
