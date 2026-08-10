import { normalizeRelativeMediaPath } from '../helpers/datasetPresets';
import { createDatasetPresetPrismaStore, type DatasetPresetPrismaClient } from './datasetPresetPrismaStore';
import {
  createDatasetPresetSnapshotStore,
  DATASET_PRESET_MAINTENANCE_MAX_SCAN,
  DATASET_PRESET_MAINTENANCE_MAX_REPORT,
  type DatasetPresetMaintenanceScan,
  type PublishedOrphanScanResult,
  type StagingCleanupResult,
} from './datasetPresetSnapshotService';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DatasetPresetStartupMaintenanceDependencies {
  now(): Date;
  cleanupStaging(cutoff: Date): Promise<StagingCleanupResult>;
  listManifestPaths(): Promise<string[]>;
  findPublishedOrphans(authoritativeManifestPaths: readonly string[]): Promise<PublishedOrphanScanResult>;
  info(message: string): void;
  warn(message: string): void;
}

export interface WorkerStartupDependencies<T> {
  ensureJournalMode(): Promise<void>;
  maintenance(): Promise<void>;
  start(): T;
  warn(message: string): void;
}

export interface DatasetPresetStartupMaintenanceWiring {
  getDataRoot(): Promise<string>;
  prisma: DatasetPresetPrismaClient;
  now(): Date;
  info(message: string): void;
  warn(message: string): void;
}

export interface DatasetPresetMaintenancePage {
  inspectedEntries: number;
  done: boolean;
}

export interface DatasetPresetStartupMaintenanceSession {
  nextPage(): Promise<DatasetPresetMaintenancePage>;
  close(): Promise<void>;
}

export interface DatasetPresetStartupMaintenanceSessionDependencies {
  now(): Date;
  maxScanEntries?: number;
  createScan(cutoff: Date): DatasetPresetMaintenanceScan;
  listManifestPaths(): Promise<string[]>;
  info(message: string): void;
  warn(message: string): void;
}

function safeRelativePath(value: string): string | undefined {
  try {
    const normalized = normalizeRelativeMediaPath(value);
    return normalized.length <= 512 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

export async function runDatasetPresetStartupMaintenance(
  dependencies: DatasetPresetStartupMaintenanceDependencies,
): Promise<void> {
  try {
    const now = dependencies.now();
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('Invalid maintenance clock');
    const removed = await dependencies.cleanupStaging(new Date(now.getTime() - DAY_MS));
    for (const path of removed.reportedRemoved.slice(0, DATASET_PRESET_MAINTENANCE_MAX_REPORT)) {
      const safe = safeRelativePath(path);
      if (safe !== undefined) dependencies.info(`Dataset preset recovery removed stale staging: ${safe}`);
    }
    if (removed.truncatedRemoved > 0) {
      dependencies.info(
        `Dataset preset recovery removed ${removed.totalRemoved} stale staging directories; ${removed.truncatedRemoved} paths omitted`,
      );
    }
    if (removed.skippedCandidates > 0) {
      const safeLabels = removed.reportedSkippedCandidates
        .map(safeRelativePath)
        .filter((value): value is string => value !== undefined)
        .slice(0, 10);
      dependencies.warn(
        `Dataset preset recovery skipped ${removed.skippedCandidates} unsafe, inaccessible, or raced staging candidates${
          safeLabels.length > 0 ? `: ${safeLabels.join(', ')}` : ''
        }`,
      );
    }
    const authoritative = await dependencies.listManifestPaths();
    const orphans = await dependencies.findPublishedOrphans(authoritative);
    for (const path of orphans.reportedOrphans.slice(0, DATASET_PRESET_MAINTENANCE_MAX_REPORT)) {
      const safe = safeRelativePath(path);
      if (safe !== undefined) dependencies.info(`Dataset preset recovery found published orphan: ${safe}`);
    }
    if (orphans.truncatedOrphans > 0) {
      dependencies.info(
        `Dataset preset recovery found ${orphans.totalOrphans} published orphans; ${orphans.truncatedOrphans} paths omitted`,
      );
    }
    if (orphans.skippedCandidates > 0) {
      const safeLabels = orphans.reportedSkippedCandidates
        .map(safeRelativePath)
        .filter((value): value is string => value !== undefined)
        .slice(0, 10);
      dependencies.warn(
        `Dataset preset recovery skipped ${orphans.skippedCandidates} unsafe, inaccessible, or raced candidates${
          safeLabels.length > 0 ? `: ${safeLabels.join(', ')}` : ''
        }`,
      );
    }
  } catch (error) {
    const label = error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name) ? error.name : 'Error';
    dependencies.warn(`Dataset preset startup maintenance failed (${label})`);
  }
}

export function createDatasetPresetStartupMaintenanceSession(
  dependencies: DatasetPresetStartupMaintenanceSessionDependencies,
): DatasetPresetStartupMaintenanceSession {
  const now = dependencies.now();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('Invalid maintenance clock');
  const maxScanEntries = dependencies.maxScanEntries ?? DATASET_PRESET_MAINTENANCE_MAX_SCAN;
  if (!Number.isSafeInteger(maxScanEntries) || maxScanEntries <= 0) {
    throw new Error('Maintenance scan limit must be a positive safe integer');
  }
  const scan = dependencies.createScan(new Date(now.getTime() - DAY_MS));
  let phase: 'cleanup' | 'database' | 'orphans' | 'done' = 'cleanup';
  let closed = false;
  let cleanupSummaryLogged = false;
  let orphanSummaryLogged = false;
  const loggedRemoved = new Set<string>();
  const loggedOrphans = new Set<string>();

  const logNewRemoved = (result: StagingCleanupResult): void => {
    for (const path of result.reportedRemoved) {
      if (loggedRemoved.size >= DATASET_PRESET_MAINTENANCE_MAX_REPORT || loggedRemoved.has(path)) continue;
      const safe = safeRelativePath(path);
      if (safe === undefined) continue;
      loggedRemoved.add(path);
      dependencies.info(`Dataset preset recovery removed stale staging: ${safe}`);
    }
  };
  const logNewOrphans = (result: PublishedOrphanScanResult): void => {
    for (const path of result.reportedOrphans) {
      if (loggedOrphans.size >= DATASET_PRESET_MAINTENANCE_MAX_REPORT || loggedOrphans.has(path)) continue;
      const safe = safeRelativePath(path);
      if (safe === undefined) continue;
      loggedOrphans.add(path);
      dependencies.info(`Dataset preset recovery found published orphan: ${safe}`);
    }
  };
  const logCleanupSummary = (result: StagingCleanupResult): void => {
    if (cleanupSummaryLogged) return;
    cleanupSummaryLogged = true;
    if (result.totalRemoved > 0) {
      dependencies.info(
        `Dataset preset recovery removed ${result.totalRemoved} stale staging director${result.totalRemoved === 1 ? 'y' : 'ies'}; ${result.truncatedRemoved} paths omitted`,
      );
    }
    if (result.skippedCandidates > 0) {
      const labels = result.reportedSkippedCandidates
        .map(safeRelativePath)
        .filter((value): value is string => value !== undefined)
        .slice(0, 10);
      dependencies.warn(
        `Dataset preset recovery skipped ${result.skippedCandidates} unsafe, inaccessible, or raced staging candidates${
          labels.length > 0 ? `: ${labels.join(', ')}` : ''
        }`,
      );
    }
  };
  const logOrphanSummary = (result: PublishedOrphanScanResult): void => {
    if (orphanSummaryLogged) return;
    orphanSummaryLogged = true;
    if (result.totalOrphans > 0) {
      dependencies.info(
        `Dataset preset recovery found ${result.totalOrphans} published orphan${result.totalOrphans === 1 ? '' : 's'}; ${result.truncatedOrphans} paths omitted`,
      );
    }
    if (result.skippedCandidates > 0) {
      const labels = result.reportedSkippedCandidates
        .map(safeRelativePath)
        .filter((value): value is string => value !== undefined)
        .slice(0, 10);
      dependencies.warn(
        `Dataset preset recovery skipped ${result.skippedCandidates} unsafe, inaccessible, or raced candidates${
          labels.length > 0 ? `: ${labels.join(', ')}` : ''
        }`,
      );
    }
  };

  return {
    async nextPage(): Promise<DatasetPresetMaintenancePage> {
      if (closed) throw new Error('Maintenance session is closed');
      if (phase === 'done') return { inspectedEntries: 0, done: true };
      if (phase === 'cleanup') {
        const page = await scan.cleanupPage(maxScanEntries);
        logNewRemoved(page.result);
        if (page.done) {
          logCleanupSummary(page.result);
          phase = 'database';
        }
        return { inspectedEntries: page.inspectedEntries, done: false };
      }
      if (phase === 'database') {
        const authoritative = await dependencies.listManifestPaths();
        scan.beginOrphanScan(authoritative);
        phase = 'orphans';
      }
      const page = await scan.orphanPage(maxScanEntries);
      logNewOrphans(page.result);
      if (page.done) {
        logOrphanSummary(page.result);
        phase = 'done';
        await scan.close();
        closed = true;
      }
      return { inspectedEntries: page.inspectedEntries, done: phase === 'done' };
    },
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await scan.close();
    },
  };
}

export function createDatasetPresetStartupMaintenanceSessionFromWiring(
  wiring: DatasetPresetStartupMaintenanceWiring,
): () => Promise<DatasetPresetStartupMaintenanceSession> {
  return async () => {
    const dataRoot = await wiring.getDataRoot();
    const snapshots = createDatasetPresetSnapshotStore(dataRoot);
    const store = createDatasetPresetPrismaStore(wiring.prisma);
    return createDatasetPresetStartupMaintenanceSession({
      now: wiring.now,
      createScan: cutoff => snapshots.createMaintenanceScan(cutoff),
      listManifestPaths: () => store.listManifestPaths(),
      info: wiring.info,
      warn: wiring.warn,
    });
  };
}

export function createDatasetPresetStartupMaintenance(
  wiring: DatasetPresetStartupMaintenanceWiring,
): () => Promise<void> {
  return async () => {
    let dataRoot: string;
    try {
      dataRoot = await wiring.getDataRoot();
    } catch {
      wiring.warn('Dataset preset startup maintenance failed (Error)');
      return;
    }
    const snapshots = createDatasetPresetSnapshotStore(dataRoot);
    const store = createDatasetPresetPrismaStore(wiring.prisma);
    await runDatasetPresetStartupMaintenance({
      now: wiring.now,
      cleanupStaging: cutoff => snapshots.cleanupStaging(cutoff),
      listManifestPaths: () => store.listManifestPaths(),
      findPublishedOrphans: paths => snapshots.findPublishedOrphans(paths),
      info: wiring.info,
      warn: wiring.warn,
    });
  };
}

export async function startWorkerAfterMaintenance<T>(dependencies: WorkerStartupDependencies<T>): Promise<T> {
  try {
    await dependencies.ensureJournalMode();
  } catch {
    dependencies.warn('Could not check/convert database journal mode');
  }
  try {
    await dependencies.maintenance();
  } catch {
    dependencies.warn('Dataset preset startup maintenance failed (Error)');
  }
  return dependencies.start();
}
