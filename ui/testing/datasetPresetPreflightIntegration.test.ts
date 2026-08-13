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
  QueueRevisionConflictError,
} from '../src/server/jobStartOrchestration';
import { manifestSha256, type DatasetPresetManifestV1 } from '../src/helpers/datasetPresets';
import type { DatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
import type { JobConfig } from '../src/types';

const loader = {
  caption_ext: 'txt', default_caption: '', caption_dropout_rate: 0, shuffle_tokens: false,
  num_repeats: 1, resolution: [512], is_reg: false, network_weight: 1,
  cache_latents_to_disk: false, flip_x: false, flip_y: false, num_frames: 1,
  shrink_video_to_frames: false, fps: 24, auto_frame_count: false, do_i2v: false,
  do_audio: false, audio_normalize: false, audio_preserve_pitch: false, mask_min_value: 0.1, invert_mask: false, controls: [],
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
  const queueAttemptA = {
    id: 'job', job_config: JSON.stringify(config([])), updated_at: new Date('2026-08-10T00:00:00.123Z'),
    name: 'queue-a', gpu_ids: '0', queue_position: 500, status: 'stopped', stop: false,
    return_to_queue: false,
  };
  await prepareAndQueueJob(queueAttemptA, {
    async prepare(value) { queueEvents.push('preflight'); return structuredClone(value); },
    async mutateQueue(attempt) {
      assert.equal(attempt.updated_at.getTime(), queueAttemptA.updated_at.getTime());
      assert.equal(attempt.job_config, queueAttemptA.job_config);
      assert.equal(attempt.gpu_ids, '0');
      queueEvents.push('queue-transaction');
    },
  });
  assert.deepEqual(queueEvents, ['preflight', 'queue-transaction']);

  const noMutationEvents: string[] = [];
  await assert.rejects(
    prepareAndQueueJob({ ...queueAttemptA, job_config: JSON.stringify(config(refs)) }, {
      async prepare() { throw caught; },
      async mutateQueue() { noMutationEvents.push('queue-transaction'); },
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
  let queueMutationFailure: unknown;
  try {
    await prepareAndQueueJob(queueAttemptA, {
      async prepare(value) { return value; },
      async mutateQueue() { throw new Error('database unavailable after preflight'); },
    });
  } catch (error) {
    queueMutationFailure = error;
  }
  assert.deepEqual(classifyQueuePreflightError(queueMutationFailure), {
    status: 500, body: { error: 'Failed to queue job' },
  }, 'post-preflight database errors are not mislabeled as snapshot verification failures');

  let releaseQueuePreflight!: (value: JobConfig) => void;
  const deferredQueuePreflight = new Promise<JobConfig>(resolve => { releaseQueuePreflight = resolve; });
  let liveQueueJob = { ...queueAttemptA, updated_at: new Date(queueAttemptA.updated_at) };
  const createdQueues: string[] = [];
  const mutateLiveQueue = async (attempt: typeof queueAttemptA) => {
    const sameRevision = attempt.updated_at.getTime() === liveQueueJob.updated_at.getTime() &&
      attempt.job_config === liveQueueJob.job_config && attempt.name === liveQueueJob.name &&
      attempt.gpu_ids === liveQueueJob.gpu_ids && attempt.queue_position === liveQueueJob.queue_position &&
      attempt.status === liveQueueJob.status && attempt.stop === liveQueueJob.stop &&
      attempt.return_to_queue === liveQueueJob.return_to_queue;
    if (!sameRevision) throw new QueueRevisionConflictError();
    liveQueueJob = { ...liveQueueJob, status: 'queued', stop: false, return_to_queue: false };
    createdQueues.push(attempt.gpu_ids);
  };
  let firstQueueError: unknown;
  const firstQueueRequest = prepareAndQueueJob(queueAttemptA, {
    async prepare() { return deferredQueuePreflight; },
    mutateQueue: mutateLiveQueue,
  }).catch(error => { firstQueueError = error; });
  const queueConfigB = JSON.stringify(config(refs));
  liveQueueJob = {
    ...liveQueueJob,
    updated_at: new Date('2026-08-10T00:00:00.124Z'),
    job_config: queueConfigB,
    name: 'queue-b',
    gpu_ids: '1',
    queue_position: 700,
    status: 'stopped',
    stop: false,
    return_to_queue: false,
  };
  releaseQueuePreflight(config([]));
  await firstQueueRequest;
  assert.ok(firstQueueError instanceof QueueRevisionConflictError);
  assert.deepEqual(classifyQueuePreflightError(firstQueueError), {
    status: 409, body: { error: 'Job changed while being queued; retry the request' },
  });
  assert.deepEqual(createdQueues, [], 'stale attempt A creates no stale GPU queue');
  assert.equal(liveQueueJob.status, 'stopped');
  assert.equal(liveQueueJob.job_config, queueConfigB);

  let preflightedB = false;
  await prepareAndQueueJob(liveQueueJob, {
    async prepare(value) { preflightedB = JSON.stringify(value) === queueConfigB; return value; },
    mutateQueue: mutateLiveQueue,
  });
  assert.equal(preflightedB, true, 'retry preflights revision B rather than stale A');
  assert.deepEqual(createdQueues, ['1'], 'retry queues only the current GPU revision');
  assert.equal(liveQueueJob.status, 'queued');

  let releasePreparation!: (value: JobConfig) => void;
  const delayedPreparation = new Promise<JobConfig>(resolve => { releasePreparation = resolve; });
  const attemptA = {
    id: 'job', job_config: JSON.stringify(malicious), updated_at: new Date('2026-08-10T01:00:00.123Z'),
    name: 'job-a', gpu_ids: '0', queue_position: 1000,
  };
  let liveAttempt = { ...attemptA, updated_at: new Date(attemptA.updated_at), status: 'queued' };
  let launches = 0;
  const workerStart = prepareClaimAndLaunchJob(
    attemptA,
    {
      async prepare() { return delayedPreparation; },
      async claim(attempt) {
        if (liveAttempt.status !== 'queued' || liveAttempt.updated_at.getTime() !== attempt.updated_at.getTime() ||
          liveAttempt.job_config !== attempt.job_config) return false;
        liveAttempt.status = 'running';
        return true;
      },
      async fail() { assert.fail('cancellation is not a preflight failure'); },
      launch() { launches += 1; },
    },
  );
  liveAttempt = {
    ...liveAttempt,
    status: 'queued',
    job_config: JSON.stringify(config([])),
    updated_at: new Date('2026-08-10T01:00:00.124Z'),
  };
  releasePreparation(prepared);
  assert.equal(await workerStart, 'cancelled');
  assert.equal(liveAttempt.status, 'queued', 'stop/edit/requeue revision B remains queued');
  assert.equal(launches, 0, 'cancelled job has no training side effects');

  liveAttempt = { ...attemptA, updated_at: new Date(attemptA.updated_at), status: 'queued' };
  let rejectPreparation!: (error: Error) => void;
  const rejectedPreparation = new Promise<JobConfig>((_resolve, reject) => { rejectPreparation = reject; });
  const stoppedFailure = prepareClaimAndLaunchJob(
    attemptA,
    {
      async prepare() { return rejectedPreparation; },
      async claim() { assert.fail('failed preflight must not claim'); },
      async fail(_error, attempt) {
        if (liveAttempt.status !== 'queued' || liveAttempt.updated_at.getTime() !== attempt.updated_at.getTime() ||
          liveAttempt.job_config !== attempt.job_config) return false;
        liveAttempt.status = 'error';
        return true;
      },
      launch() { assert.fail('failed preflight must not launch'); },
    },
  );
  liveAttempt = {
    ...liveAttempt,
    status: 'queued',
    job_config: JSON.stringify(config([])),
    updated_at: new Date('2026-08-10T01:00:00.124Z'),
  };
  rejectPreparation(new Error('snapshot disappeared'));
  assert.equal(await stoppedFailure, 'cancelled', 'a requeued revision racing a failed preflight is preserved');
  assert.equal(liveAttempt.status, 'queued', 'failed attempt A does not overwrite queued revision B');

  let launchedConfig: JobConfig | null = null;
  assert.equal(await prepareClaimAndLaunchJob(
    attemptA,
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
  assert.match(route, /prisma\.\$transaction/,
    'post-preflight queue position, queue creation, and status writes are atomic');
  const queueTransaction = route.slice(route.indexOf('async mutateQueue('), route.indexOf('});\n  } catch', route.indexOf('async mutateQueue(')));
  assert.match(queueTransaction, /transaction\.job\.updateMany/);
  for (const revisionField of [
    'updated_at', 'job_config', 'name', 'gpu_ids', 'queue_position', 'status', 'stop', 'return_to_queue',
  ]) {
    assert.match(queueTransaction, new RegExp(`${revisionField}: attempt\\.${revisionField}`),
      `queue transaction pins the preflighted ${revisionField}`);
  }
  assert.match(queueTransaction, /QueueRevisionConflictError/,
    'a stale queue attempt aborts and rolls back its transaction');

  const worker = readFileSync(join(process.cwd(), 'cron/actions/startJob.ts'), 'utf8');
  const authoritativeRead = worker.indexOf('prisma.job.findUnique');
  const workerPreflight = worker.indexOf('prepareClaimAndLaunchJob', authoritativeRead);
  assert.ok(workerPreflight > authoritativeRead, 'worker delegates after its authoritative job read');
  const claimBlock = worker.slice(worker.indexOf('async claim(', workerPreflight), worker.indexOf('async fail(', workerPreflight));
  assert.match(claimBlock, /updateMany/);
  assert.match(claimBlock, /status: 'queued',\s+stop: false/,
    'production worker claims only a still-queued, non-stopped job');
  for (const revisionField of ['updated_at', 'job_config', 'name', 'gpu_ids', 'queue_position']) {
    assert.match(claimBlock, new RegExp(`${revisionField}: attempt\\.${revisionField}`),
      `production claim pins the read ${revisionField}`);
  }
  assert.match(claimBlock, /status: 'running'/);
  const failureBlock = worker.slice(worker.indexOf('async fail(', workerPreflight), worker.indexOf('launch(jobConfig)', workerPreflight));
  assert.match(failureBlock, /updateMany/);
  assert.match(failureBlock, /status: 'queued',\s+stop: false/,
    'production worker does not overwrite a stop racing a failed preflight');
  for (const revisionField of ['updated_at', 'job_config', 'name', 'gpu_ids', 'queue_position']) {
    assert.match(failureBlock, new RegExp(`${revisionField}: attempt\\.${revisionField}`),
      `production failure transition pins the read ${revisionField}`);
  }
  const appendFailure = worker.slice(
    worker.indexOf('async function appendPreflightFailureToExistingLog'),
    worker.indexOf('export async function startAndWatchJob'),
  );
  assert.match(appendFailure, /openSync\(logPath, 'r\+'\)/,
    'failure logging opens an existing file without a create-capable append flag');

  console.log('dataset preset queue and worker preflight integration tests passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
