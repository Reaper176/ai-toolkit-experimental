import processQueue from './actions/processQueue';
import prisma from './prisma';
import { getDataRoot } from './paths';
import {
  createDatasetPresetStartupMaintenanceSessionFromWiring,
  type DatasetPresetStartupMaintenanceSession,
  startWorkerAfterMaintenance,
} from '../src/server/datasetPresetMaintenance';

// Journal mode for the main sqlite db. WAL keeps readers from blocking while
// the trainer/worker write, which is what we want on a local disk. Users on
// setups where WAL can't work (e.g. db on a network filesystem) can override
// with AI_TOOLKIT_DB_JOURNAL_MODE=DELETE (or any other valid sqlite mode).
const DEFAULT_JOURNAL_MODE = 'WAL';
const VALID_JOURNAL_MODES = ['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF'];

async function ensureJournalMode() {
  const envMode = process.env.AI_TOOLKIT_DB_JOURNAL_MODE;
  let targetMode = (envMode || DEFAULT_JOURNAL_MODE).toUpperCase();
  if (!VALID_JOURNAL_MODES.includes(targetMode)) {
    console.warn(
      `Invalid AI_TOOLKIT_DB_JOURNAL_MODE "${envMode}", expected one of ${VALID_JOURNAL_MODES.join(', ')}. Using ${DEFAULT_JOURNAL_MODE}.`,
    );
    targetMode = DEFAULT_JOURNAL_MODE;
  }

  const current = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode;');
  const currentMode = current[0]?.journal_mode?.toUpperCase();
  if (currentMode === targetMode) {
    return;
  }

  console.log(`Converting database journal mode from ${currentMode} to ${targetMode}...`);
  // targetMode is validated against VALID_JOURNAL_MODES above, safe to interpolate
  const result = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>(`PRAGMA journal_mode = ${targetMode};`);
  const resultMode = result[0]?.journal_mode?.toUpperCase();
  if (resultMode === targetMode) {
    console.log(`Database journal mode is now ${resultMode}.`);
  } else {
    // sqlite refuses the switch rather than corrupting anything (e.g. WAL on a
    // network filesystem), so just report what we're actually running with.
    console.warn(`Could not convert database journal mode to ${targetMode}, still using ${resultMode}.`);
  }
}

class CronWorker {
  interval: number;
  is_running: boolean;
  intervalId: NodeJS.Timeout;
  constructor() {
    this.interval = 1000; // Default interval of 1 second
    this.is_running = false;
    this.intervalId = setInterval(() => {
      this.run();
    }, this.interval);
  }
  async run() {
    if (this.is_running) {
      return;
    }
    this.is_running = true;
    try {
      // Loop logic here
      await this.loop();
    } catch (error) {
      console.error('Error in cron worker loop:', error);
    }
    this.is_running = false;
  }

  async loop() {
    await processQueue();
  }
}

export interface CronWorkerStartupDependencies {
  ensureJournalMode?: () => Promise<void>;
  createMaintenance?: () => () => Promise<void>;
  createMaintenanceSession?: () =>
    | DatasetPresetStartupMaintenanceSession
    | Promise<DatasetPresetStartupMaintenanceSession>;
  maintenanceYield?: () => Promise<void>;
  scheduleMaintenanceContinuation?: (task: () => Promise<void>) => void;
  start?: () => CronWorker;
  warn?: (message: string) => void;
}

function yieldMaintenance(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

// Journal setup and one bounded recovery page finish before the interval can accept work.
export async function startCronWorker(dependencies: CronWorkerStartupDependencies = {}): Promise<CronWorker> {
  const wiring = {
    getDataRoot,
    prisma,
    now: () => new Date(),
    info: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
  };
  const start =
    dependencies.start ??
    (() => {
      const cronWorker = new CronWorker();
      console.log('Cron worker started with interval:', cronWorker.interval, 'ms');
      return cronWorker;
    });
  const warn = dependencies.warn ?? (message => console.warn(message));

  // Preserve the direct/manual exhaustive hook for callers that explicitly
  // inject it. Production uses the resumable session below.
  if (dependencies.createMaintenance !== undefined && dependencies.createMaintenanceSession === undefined) {
    const createMaintenance = dependencies.createMaintenance;
    return startWorkerAfterMaintenance({
      ensureJournalMode: dependencies.ensureJournalMode ?? ensureJournalMode,
      maintenance: async () => createMaintenance()(),
      start,
      warn,
    });
  }

  try {
    await (dependencies.ensureJournalMode ?? ensureJournalMode)();
  } catch {
    warn('Could not check/convert database journal mode');
  }

  const createSession =
    dependencies.createMaintenanceSession ?? createDatasetPresetStartupMaintenanceSessionFromWiring(wiring);
  let session: DatasetPresetStartupMaintenanceSession | undefined;
  let initialDone = true;
  try {
    session = await createSession();
    initialDone = (await session.nextPage()).done;
  } catch {
    if (session !== undefined) await session.close().catch(() => undefined);
    warn('Dataset preset startup maintenance failed (Error)');
    session = undefined;
  }

  const worker = start();
  if (session !== undefined && !initialDone) {
    const activeSession = session;
    const schedule =
      dependencies.scheduleMaintenanceContinuation ??
      (task => {
        void task();
      });
    const yieldPage = dependencies.maintenanceYield ?? yieldMaintenance;
    schedule(async () => {
      try {
        let done = false;
        while (!done) {
          await yieldPage();
          done = (await activeSession.nextPage()).done;
        }
      } catch {
        await activeSession.close().catch(() => undefined);
        warn('Dataset preset startup maintenance continuation failed (Error)');
      }
    });
  }
  return worker;
}

if (require.main === module) void startCronWorker();
