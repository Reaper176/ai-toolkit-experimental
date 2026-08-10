import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  JobDatasetPresetError,
  prepareJobDatasetPresetsForTraining,
  preflightJobDatasetPresets,
} from '../src/server/jobDatasetPresetService';
import {
  classifyQueuePreflightError,
  prepareClaimAndLaunchJob,
  prepareAndQueueJob,
} from '../src/server/jobStartOrchestration';
import { manifestSha256, type DatasetPresetManifestV1 } from '../src/helpers/datasetPresets';
import type { DatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
import type { JobConfig } from '../src/types';

const loader = {
  caption_ext: 'txt', default_caption: '', caption_dropout_rate: 0, shuffle_tokens: false,
  num_repeats: 1, resolution: [512], is_reg: false, network_weight: 1,
  cache_latents_to_disk: false, flip_x: false, flip_y: false, num_frames: 1,
  shrink_video_to_frames: false, fps: 24, auto_frame_count: false, do_i2v: false,
  do_audio: false, audio_normalize: false, audio_preserve_pitch: false, controls: [],
};

function config(references: Array<{ id: string; name: string; version: number }>): JobConfig {
  return {
    config: { process: [{ datasets: references.map(reference => ({
      folder_path: '/managed/private/root', ...loader,
      dataset_preset: {
        version_id: reference.id,
        preset_id: `preset-${reference.id}`,
        preset_name: reference.name,
        version: reference.version,
        manifest_sha256: 'a'.repeat(64),
      },
    })) }] },
  } as unknown as JobConfig;
}

function snapshotStore(overrides: Partial<DatasetPresetSnapshotStore> = {}): DatasetPresetSnapshotStore {
  const unavailable = async () => { throw new Error('unused'); };
  return {
    stageVersion: unavailable,
    readManifest: unavailable,
    verifyFast: unavailable,
    verifyFull: unavailable,
    resolveMediaRoot: () => '/managed/private/root/preset/v1/media',
    quarantineVersion: unavailable,
    cleanupStaging: unavailable,
    ...overrides,
  } as DatasetPresetSnapshotStore;
}

async function main(): Promise<void> {
  let versionReads = 0;
  await preflightJobDatasetPresets(config([]), {
    versions: { async getVersionForResolution() { versionReads += 1; return null; } },
    snapshots: snapshotStore(),
  });
  assert.equal(versionReads, 0, 'jobs without presets are accepted without snapshot access');

  const absoluteRoot = '/managed/private/root/that-must-never-leak';
  const missing = ['z.png', 'a.png', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png'];
  const refs = [{ id: 'v2', name: 'My Images', version: 2 }];
  const authoritative = {
    preset: { id: 'preset-v2', name: 'My Images', archived_at: new Date() },
    version: {
      id: 'v2', preset_id: 'preset-v2', version: 2, source_dataset: 'source',
      manifest_path: 'preset-v2/v2/manifest.json', manifest_sha256: 'a'.repeat(64),
      loader_config: loader, note: null, media_count: 7, total_bytes: '7',
      created_at: '2026-08-10T00:00:00.000Z',
    },
  };
  let caught: unknown;
  try {
    await preflightJobDatasetPresets(config(refs), {
      versions: { async getVersionForResolution() { return authoritative; } },
      snapshots: snapshotStore({
        async verifyFast() {
          const error = new Error(`ENOENT at ${absoluteRoot}/z.png`) as Error & { missingPaths?: string[] };
          error.missingPaths = missing;
          throw error;
        },
      }),
    });
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof JobDatasetPresetError);
  const publicFailure = caught as JobDatasetPresetError & { preset?: string; version?: number; missing?: string[] };
  assert.equal(publicFailure.preset, 'My Images');
  assert.equal(publicFailure.version, 2);
  assert.deepEqual(publicFailure.missing, missing.slice(0, 5));
  assert.doesNotMatch(publicFailure.message, new RegExp(absoluteRoot));
  assert.doesNotMatch(JSON.stringify(caught), new RegExp(absoluteRoot));

  let dependencyFailure: unknown;
  try {
    await preflightJobDatasetPresets(config(refs), {
      versions: { async getVersionForResolution() { throw new Error(`database failed at ${absoluteRoot}`); } },
      snapshots: snapshotStore(),
    });
  } catch (error) {
    dependencyFailure = error;
  }
  assert.ok(dependencyFailure instanceof Error);
  assert.ok(!(dependencyFailure instanceof JobDatasetPresetError),
    'internal database errors remain distinguishable from client/configuration failures');
  assert.doesNotMatch(dependencyFailure.message, new RegExp(absoluteRoot));

  const manifest: DatasetPresetManifestV1 = {
    schema_version: 1, preset_id: 'preset-v2', version: 2, preset_name: 'My Images',
    source_dataset: 'source', created_at: '2026-08-10T00:00:00.000Z', note: null,
    loader_config: loader, media_count: 1, total_bytes: 1,
    files: [{ source_path: 'safe.png', managed_path: 'media/safe.png', media_bytes: 1,
      media_sha256: 'b'.repeat(64), caption_ext: 'txt', caption_text: null,
      caption_bytes: null, caption_sha256: null, caption_missing: true }],
  };
  const canonical = structuredClone(authoritative);
  canonical.version.manifest_sha256 = manifestSha256(manifest);
  canonical.version.media_count = 1;
  canonical.version.total_bytes = '1';
  const malicious = config(refs);
  malicious.config.process[0].datasets![0].folder_path = '/attacker/changed/after-save';
  const prepared = await prepareJobDatasetPresetsForTraining(malicious, {
    versions: { async getVersionForResolution() { return canonical; } },
    snapshots: snapshotStore({ async verifyFast() { return manifest; } }),
  });
  assert.equal(prepared.config.process[0].datasets![0].folder_path, '/managed/private/root/preset/v1/media');
  assert.equal(malicious.config.process[0].datasets![0].folder_path, '/attacker/changed/after-save',
    'authoritative preparation does not mutate stored input');
  assert.deepEqual(prepared.config.process[0].datasets![0].dataset_preset, {
    version_id: 'v2', preset_id: 'preset-v2', preset_name: 'My Images', version: 2,
    manifest_sha256: manifestSha256(manifest),
  });

  const queueEvents: string[] = [];
  await prepareAndQueueJob({ id: 'job', job_config: JSON.stringify(config([])) }, {
    async prepare(value) { queueEvents.push('preflight'); return structuredClone(value); },
    async nextQueuePosition() { queueEvents.push('position-read'); return 1000; },
    async setQueuePosition() { queueEvents.push('position-write'); },
    async ensureQueue() { queueEvents.push('ensure-queue'); },
    async markQueued() { queueEvents.push('queued'); },
  });
  assert.deepEqual(queueEvents, ['preflight', 'position-read', 'position-write', 'ensure-queue', 'queued']);

  const noMutationEvents: string[] = [];
  await assert.rejects(
    prepareAndQueueJob({ id: 'job', job_config: JSON.stringify(config(refs)) }, {
      async prepare() { throw caught; },
      async nextQueuePosition() { noMutationEvents.push('position-read'); return 1000; },
      async setQueuePosition() { noMutationEvents.push('position-write'); },
      async ensureQueue() { noMutationEvents.push('ensure-queue'); },
      async markQueued() { noMutationEvents.push('queued'); },
    }),
    error => error === caught,
  );
  assert.deepEqual(noMutationEvents, [], 'integrity failure performs no queue mutation');
  assert.deepEqual(classifyQueuePreflightError(caught), {
    status: 409,
    body: { error: publicFailure.message, preset: 'My Images', version: 2, missing: missing.slice(0, 5) },
  });
  assert.deepEqual(classifyQueuePreflightError(dependencyFailure), {
    status: 500, body: { error: 'Unable to verify job dataset presets' },
  });

  let releasePreparation!: (value: JobConfig) => void;
  const delayedPreparation = new Promise<JobConfig>(resolve => { releasePreparation = resolve; });
  let status = 'queued';
  let launches = 0;
  const workerStart = prepareClaimAndLaunchJob(
    { id: 'job', job_config: JSON.stringify(malicious) },
    {
      async prepare() { return delayedPreparation; },
      async claim() { if (status !== 'queued') return false; status = 'running'; return true; },
      async fail() { assert.fail('cancellation is not a preflight failure'); },
      launch() { launches += 1; },
    },
  );
  status = 'stopped';
  releasePreparation(prepared);
  assert.equal(await workerStart, 'cancelled');
  assert.equal(status, 'stopped');
  assert.equal(launches, 0, 'cancelled job has no training side effects');

  status = 'queued';
  let rejectPreparation!: (error: Error) => void;
  const rejectedPreparation = new Promise<JobConfig>((_resolve, reject) => { rejectPreparation = reject; });
  const stoppedFailure = prepareClaimAndLaunchJob(
    { id: 'job', job_config: JSON.stringify(malicious) },
    {
      async prepare() { return rejectedPreparation; },
      async claim() { assert.fail('failed preflight must not claim'); },
      async fail() { return status === 'queued'; },
      launch() { assert.fail('failed preflight must not launch'); },
    },
  );
  status = 'stopped';
  rejectPreparation(new Error('snapshot disappeared'));
  assert.equal(await stoppedFailure, 'cancelled', 'a stop racing a failed preflight is preserved');
  assert.equal(status, 'stopped');

  let launchedConfig: JobConfig | null = null;
  assert.equal(await prepareClaimAndLaunchJob(
    { id: 'job', job_config: JSON.stringify(malicious) },
    {
      async prepare() { return prepared; }, async claim() { return true; },
      async fail() { assert.fail('valid job must not fail'); },
      launch(value) { launchedConfig = value; },
    },
  ), 'started');
  assert.equal(launchedConfig!.config.process[0].datasets![0].folder_path,
    '/managed/private/root/preset/v1/media', 'launcher observes only the authoritative managed path');

  const route = readFileSync(join(process.cwd(), 'src/app/api/jobs/[jobID]/start/route.ts'), 'utf8');
  assert.match(route, /prepareAndQueueJob/, 'queue route delegates to executable tested orchestration');

  const worker = readFileSync(join(process.cwd(), 'cron/actions/startJob.ts'), 'utf8');
  const authoritativeRead = worker.indexOf('prisma.job.findUnique');
  const workerPreflight = worker.indexOf('prepareClaimAndLaunchJob', authoritativeRead);
  assert.ok(workerPreflight > authoritativeRead, 'worker delegates after its authoritative job read');
  const claimBlock = worker.slice(worker.indexOf('async claim()', workerPreflight), worker.indexOf('async fail(', workerPreflight));
  assert.match(claimBlock, /updateMany/);
  assert.match(claimBlock, /status: 'queued', stop: false/,
    'production worker claims only a still-queued, non-stopped job');
  assert.match(claimBlock, /status: 'running'/);
  const failureBlock = worker.slice(worker.indexOf('async fail(', workerPreflight), worker.indexOf('launch(jobConfig)', workerPreflight));
  assert.match(failureBlock, /updateMany/);
  assert.match(failureBlock, /status: 'queued', stop: false/,
    'production worker does not overwrite a stop racing a failed preflight');
  const appendFailure = worker.slice(
    worker.indexOf('async function appendPreflightFailureToExistingLog'),
    worker.indexOf('export async function startAndWatchJob'),
  );
  assert.match(appendFailure, /openSync\(logPath, 'r\+'\)/,
    'failure logging opens an existing file without a create-capable append flag');

  console.log('dataset preset queue and worker preflight integration tests passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
