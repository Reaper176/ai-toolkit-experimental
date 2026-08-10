import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createDatasetPresetStartupMaintenanceSession,
  runDatasetPresetStartupMaintenance,
  startWorkerAfterMaintenance,
} from '../src/server/datasetPresetMaintenance';
import { createDatasetPresetSnapshotStore } from '../src/server/datasetPresetSnapshotService';
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

  const pagedRoot = mkdtempSync(join(tmpdir(), 'dataset-preset-maintenance-pages-'));
  try {
    const managedRoot = join(pagedRoot, 'dataset_presets');
    const earlyStaging = join(managedRoot, 'early/.staging-old');
    mkdirSync(earlyStaging, { recursive: true });
    const stagingPaths = [earlyStaging];
    for (let index = 0; index < 28; index += 1) {
      const staging = join(managedRoot, `middle-${index}/.staging-old`);
      mkdirSync(staging, { recursive: true });
      stagingPaths.push(staging);
    }
    const lateStaging = join(managedRoot, 'late/.staging-old');
    mkdirSync(lateStaging, { recursive: true });
    stagingPaths.push(lateStaging);
    const referenced = join(managedRoot, 'referenced/v1');
    mkdirSync(referenced, { recursive: true });
    writeFileSync(join(referenced, 'manifest.json'), '{}');
    const lateOrphan = join(managedRoot, 'zz-orphan/v1');
    mkdirSync(lateOrphan, { recursive: true });
    writeFileSync(join(lateOrphan, 'manifest.json'), '{}');
    const old = new Date('2026-08-01T00:00:00.000Z');
    for (const staging of stagingPaths) utimesSync(staging, old, old);

    const events: string[] = [];
    const pagedInfo: string[] = [];
    const pagedWarn: string[] = [];
    const pages: Array<{ inspectedEntries: number; done: boolean }> = [];
    const filesystem = createDatasetPresetSnapshotStore(pagedRoot);
    const session = createDatasetPresetStartupMaintenanceSession({
      now: () => now,
      maxScanEntries: 8,
      createScan: (value: Date) => filesystem.createMaintenanceScan(value),
      listManifestPaths: async () => {
        events.push('db');
        return [
          ...Array.from({ length: 10_000 }, (_, index) => `missing/v${index + 1}/manifest.json`),
          'referenced/v1/manifest.json',
        ];
      },
      info: (message: string) => {
        pagedInfo.push(message);
        if (message.includes('published orphan:')) events.push('orphan-info');
      },
      warn: (message: string) => pagedWarn.push(message),
    });
    const observedSession = {
      async nextPage() {
        const page = await session.nextPage();
        pages.push(page);
        events.push(`page:${pages.length}`);
        return page;
      },
      close: () => session.close(),
    };
    let continuation: Promise<void> | undefined;
    let starts = 0;
    await startCronWorker({
      ensureJournalMode: async () => {
        events.push('journal');
      },
      createMaintenanceSession: () => observedSession,
      maintenanceYield: async () => {
        events.push('yield');
        await new Promise<void>(resolve => setImmediate(resolve));
      },
      scheduleMaintenanceContinuation: (task: () => Promise<void>) => {
        continuation = task();
      },
      start: () => {
        starts += 1;
        events.push('start');
        return { interval: 0 } as never;
      },
      warn: (message: string) => pagedWarn.push(message),
    });
    assert.equal(starts, 1);
    const removedBeforeStart = stagingPaths.filter(path => !existsSync(path));
    assert.ok(
      removedBeforeStart.length > 0,
      `a real eligible staging entry is handled before start: ${JSON.stringify(pages)}`,
    );
    assert.ok(
      stagingPaths.some(path => existsSync(path)),
      'startup does not traverse beyond its entry budget',
    );
    assert.ok(pages[0].inspectedEntries > 0 && pages[0].inspectedEntries <= 8);
    assert.deepEqual(events.slice(0, 3), ['journal', 'page:1', 'start']);
    assert.ok(continuation, 'remaining maintenance is scheduled after worker start');
    await continuation;
    assert.ok(
      stagingPaths.every(path => !existsSync(path)),
      'continuation eventually completes cleanup traversal',
    );
    assert.ok(pagedInfo.some(message => message.includes('zz-orphan/v1')));
    assert.ok(!pagedInfo.some(message => message.includes('referenced/v1') && message.includes('orphan')));
    assert.ok(pagedInfo.some(message => message.includes('removed 30 stale staging directories')));
    assert.ok(events.indexOf('db') > events.indexOf('start'), 'authoritative paths are loaded after bounded startup');
    assert.ok(events.indexOf('orphan-info') > events.indexOf('db'), 'orphan classification waits for all DB paths');
    assert.ok(events.indexOf('yield') > events.indexOf('start'), 'continuation yields after worker start');
    for (let pageNumber = 2; pageNumber <= pages.length; pageNumber += 1) {
      const priorPage = events.indexOf(`page:${pageNumber - 1}`);
      const currentPage = events.indexOf(`page:${pageNumber}`);
      assert.ok(
        events.slice(priorPage + 1, currentPage).includes('yield'),
        `continuation yields between page ${pageNumber - 1} and page ${pageNumber}`,
      );
    }
    assert.equal(
      pagedInfo.filter(message => message.includes('published orphan: zz-orphan/v1')).length,
      1,
      'paged traversal does not report an orphan twice',
    );
    assert.equal(pagedWarn.length, 0);
  } finally {
    rmSync(pagedRoot, { recursive: true, force: true });
  }

  const backgroundEvents: string[] = [];
  let failedContinuation: Promise<void> | undefined;
  let failedSessionCalls = 0;
  await startCronWorker({
    ensureJournalMode: async () => undefined,
    createMaintenanceSession: () => ({
      async nextPage() {
        failedSessionCalls += 1;
        if (failedSessionCalls === 1) return { inspectedEntries: 1, done: false };
        throw new Error('/private/root must not be logged');
      },
      async close() {
        backgroundEvents.push('closed');
      },
    }),
    maintenanceYield: async () => undefined,
    scheduleMaintenanceContinuation: (task: () => Promise<void>) => {
      failedContinuation = task();
    },
    start: () => {
      backgroundEvents.push('start');
      return { interval: 0 } as never;
    },
    warn: (message: string) => backgroundEvents.push(message),
  });
  await failedContinuation;
  assert.deepEqual(backgroundEvents, [
    'start',
    'closed',
    'Dataset preset startup maintenance continuation failed (Error)',
  ]);

  console.log('Dataset preset maintenance tests passed');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
