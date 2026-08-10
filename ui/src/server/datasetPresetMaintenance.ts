import { normalizeRelativeMediaPath } from '../helpers/datasetPresets';
import { createDatasetPresetPrismaStore, type DatasetPresetPrismaClient } from './datasetPresetPrismaStore';
import {
  createDatasetPresetSnapshotStore,
  DATASET_PRESET_MAINTENANCE_MAX_REPORT,
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
