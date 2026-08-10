import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  JobDatasetPresetError,
  preflightJobDatasetPresets,
} from '../src/server/jobDatasetPresetService';
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

  const route = readFileSync(join(process.cwd(), 'src/app/api/jobs/[jobID]/start/route.ts'), 'utf8');
  const routePreflight = route.indexOf('preflightJobDatasetPresets');
  assert.ok(routePreflight >= 0, 'queue route calls dataset preset preflight');
  for (const mutation of ["queue_position: newQueuePosition", "status: 'queued'", 'prisma.queue.create']) {
    assert.ok(routePreflight < route.indexOf(mutation), `queue preflight precedes ${mutation}`);
  }

  const worker = readFileSync(join(process.cwd(), 'cron/actions/startJob.ts'), 'utf8');
  const authoritativeRead = worker.indexOf('prisma.job.findUnique');
  const workerPreflight = worker.indexOf('preflightJobDatasetPresets', authoritativeRead);
  assert.ok(workerPreflight > authoritativeRead, 'worker preflights after its authoritative job read');
  for (const sideEffect of ["status: 'running'", 'launchAndWatchJob(job']) {
    assert.ok(workerPreflight < worker.indexOf(sideEffect, authoritativeRead), `worker preflight precedes ${sideEffect}`);
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
