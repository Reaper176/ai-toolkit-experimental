import assert from 'node:assert/strict';
import {
  runDatasetPresetStartupMaintenance,
  startWorkerAfterMaintenance,
} from '../src/server/datasetPresetMaintenance';
import { startCronWorker } from '../cron/worker';

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
      return {
        reportedRemoved: ['preset/.staging-old'], totalRemoved: 1, truncatedRemoved: 0,
        skippedCandidates: 0, reportedSkippedCandidates: [],
      };
    },
    listManifestPaths: async () => {
      calls.push('db');
      return ['preset/v1/manifest.json'];
    },
    findPublishedOrphans: async paths => {
      calls.push(`scan:${paths.join(',')}`);
      return {
        reportedOrphans: ['preset/v2'], totalOrphans: 1, truncatedOrphans: 0,
        skippedCandidates: 0, reportedSkippedCandidates: [],
      };
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
    findPublishedOrphans: async () => ({
      reportedOrphans: [], totalOrphans: 0, truncatedOrphans: 0,
      skippedCandidates: 0, reportedSkippedCandidates: [],
    }),
    info: () => undefined,
    warn: message => warn.push(message),
  });
  assert.equal(laterRan, false);
  assert.equal(warn.at(-1), 'Dataset preset startup maintenance failed (Error)');

  const noisyInfo: string[] = [];
  await runDatasetPresetStartupMaintenance({
    now: () => now,
    cleanupStaging: async () => ({
      reportedRemoved: Array.from({ length: 100 }, (_, index) => `p/.staging-${index}`),
      totalRemoved: 150,
      truncatedRemoved: 50,
      skippedCandidates: 0,
      reportedSkippedCandidates: [],
    }),
    listManifestPaths: async () => [],
    findPublishedOrphans: async () => ({
      reportedOrphans: Array.from({ length: 100 }, (_, index) => `p/v${index + 1}`),
      totalOrphans: 150,
      truncatedOrphans: 50,
      skippedCandidates: 2,
      reportedSkippedCandidates: ['unsafe/v1', '/absolute/must-not-log'],
    }),
    info: message => noisyInfo.push(message),
    warn: () => undefined,
  });
  assert.equal(noisyInfo.length, 202, 'maintenance logging and truncation summaries must remain bounded');
  assert.ok(noisyInfo.every(message => !message.startsWith('/')));
  assert.ok(noisyInfo.includes('Dataset preset recovery removed 150 stale staging directories; 50 paths omitted'));
  assert.ok(noisyInfo.includes('Dataset preset recovery found 150 published orphans; 50 paths omitted'));

  const scanWarnings: string[] = [];
  await runDatasetPresetStartupMaintenance({
    now: () => now,
    cleanupStaging: async () => ({
      reportedRemoved: [], totalRemoved: 0, truncatedRemoved: 0,
      skippedCandidates: 0, reportedSkippedCandidates: [],
    }),
    listManifestPaths: async () => [],
    findPublishedOrphans: async () => ({
      reportedOrphans: [], totalOrphans: 0, truncatedOrphans: 0,
      skippedCandidates: 3, reportedSkippedCandidates: ['safe/v1', '/private/root', 'bad:name'],
    }),
    info: () => undefined,
    warn: message => scanWarnings.push(message),
  });
  assert.deepEqual(scanWarnings, ['Dataset preset recovery skipped 3 unsafe, inaccessible, or raced candidates: safe/v1']);

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

  const actualStartupCalls: string[] = [];
  await startCronWorker({
    ensureJournalMode: async () => { actualStartupCalls.push('journal'); },
    createMaintenance: () => {
      actualStartupCalls.push('factory');
      return async () => { actualStartupCalls.push('maintenance'); };
    },
    start: () => {
      actualStartupCalls.push('start');
      return { interval: 0 } as never;
    },
    warn: message => actualStartupCalls.push(message),
  });
  assert.deepEqual(actualStartupCalls, ['journal', 'factory', 'maintenance', 'start']);

  const failedActualStartupCalls: string[] = [];
  await startCronWorker({
    ensureJournalMode: async () => { throw new Error('journal'); },
    createMaintenance: () => async () => { throw new Error('maintenance'); },
    start: () => {
      failedActualStartupCalls.push('start');
      return { interval: 0 } as never;
    },
    warn: message => failedActualStartupCalls.push(message),
  });
  assert.deepEqual(failedActualStartupCalls, [
    'Could not check/convert database journal mode',
    'Dataset preset startup maintenance failed (Error)',
    'start',
  ]);

  console.log('Dataset preset maintenance tests passed');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
