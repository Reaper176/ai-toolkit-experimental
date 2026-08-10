import assert from 'node:assert/strict';
import {
  runDatasetPresetStartupMaintenance,
  startWorkerAfterMaintenance,
} from '../src/server/datasetPresetMaintenance';

async function main(): Promise<void> {
  const now = new Date('2026-08-10T12:00:00.000Z');
  const calls: string[] = [];
  const info: string[] = [];
  const warn: string[] = [];
  let cutoff: Date | undefined;

  await runDatasetPresetStartupMaintenance({
    now: () => now,
    cleanupStaging: async value => {
      calls.push('cleanup');
      cutoff = value;
      return ['preset/.staging-old'];
    },
    listManifestPaths: async () => {
      calls.push('db');
      return ['preset/v1/manifest.json'];
    },
    findPublishedOrphans: async paths => {
      calls.push(`scan:${paths.join(',')}`);
      return ['preset/v2'];
    },
    info: message => info.push(message),
    warn: message => warn.push(message),
  });

  assert.deepEqual(calls, ['cleanup', 'db', 'scan:preset/v1/manifest.json']);
  assert.equal(cutoff?.toISOString(), '2026-08-09T12:00:00.000Z');
  assert.deepEqual(info, [
    'Dataset preset recovery removed stale staging: preset/.staging-old',
    'Dataset preset recovery found published orphan: preset/v2',
  ]);
  assert.equal(warn.length, 0);

  let laterRan = false;
  await runDatasetPresetStartupMaintenance({
    now: () => now,
    cleanupStaging: async () => {
      throw new Error('/secret/root must not escape into logs ' + 'x'.repeat(1_000));
    },
    listManifestPaths: async () => {
      laterRan = true;
      return [];
    },
    findPublishedOrphans: async () => [],
    info: () => undefined,
    warn: message => warn.push(message),
  });
  assert.equal(laterRan, false);
  assert.equal(warn.at(-1), 'Dataset preset startup maintenance failed (Error)');

  const noisyInfo: string[] = [];
  await runDatasetPresetStartupMaintenance({
    now: () => now,
    cleanupStaging: async () => Array.from({ length: 150 }, (_, index) => `p/.staging-${index}`),
    listManifestPaths: async () => [],
    findPublishedOrphans: async () => Array.from({ length: 150 }, (_, index) => `p/v${index + 1}`),
    info: message => noisyInfo.push(message),
    warn: () => undefined,
  });
  assert.equal(noisyInfo.length, 200, 'maintenance logging must remain bounded');
  assert.ok(noisyInfo.every(message => !message.startsWith('/')));

  const startupCalls: string[] = [];
  const started = await startWorkerAfterMaintenance({
    ensureJournalMode: async () => {
      startupCalls.push('journal');
      throw new Error('journal unavailable');
    },
    maintenance: async () => {
      startupCalls.push('maintenance');
    },
    start: () => {
      startupCalls.push('start');
      return { started: true };
    },
    warn: () => startupCalls.push('journal-warning'),
  });
  assert.deepEqual(startupCalls, ['journal', 'journal-warning', 'maintenance', 'start']);
  assert.deepEqual(started, { started: true });

  const isolatedCalls: string[] = [];
  await startWorkerAfterMaintenance({
    ensureJournalMode: async () => undefined,
    maintenance: async () => { throw new Error('/private/maintenance/failure'); },
    start: () => isolatedCalls.push('start'),
    warn: message => isolatedCalls.push(message),
  });
  assert.deepEqual(isolatedCalls, ['Dataset preset startup maintenance failed (Error)', 'start']);

  console.log('Dataset preset maintenance tests passed');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
