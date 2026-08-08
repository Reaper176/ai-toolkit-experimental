import type { JobConfig } from '../types';

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const MAX_PRESET_NAME_LENGTH = 80;
export const MAX_PRESET_SNAPSHOT_BYTES = 512 * 1024;

type PlainProcess = Record<string, unknown>;

export interface TrainingPresetSnapshotV1 {
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  job: 'extension';
  config: {
    process: [PlainProcess];
  };
}

export interface TrainingPresetRecord {
  id: string;
  name: string;
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  snapshot: TrainingPresetSnapshotV1;
  created_at: string;
  updated_at: string;
}

type PropertyCapture = { present: boolean; value?: unknown };

const PROCESS_PROTECTED_KEYS = ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function serializeJson(value: unknown, context: string): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('not JSON serializable');
    return serialized;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${context} must be JSON serializable: ${detail}`);
  }
}

function deepCopy<T>(value: T, context: string): T {
  return JSON.parse(serializeJson(value, context)) as T;
}

function requireSingleProcess(value: unknown, context: string): PlainProcess {
  if (!isPlainObject(value)) throw new Error(`${context} config must be a plain object`);
  const processes = value.process;
  if (!Array.isArray(processes) || processes.length !== 1) {
    throw new Error(`${context} config.process must contain exactly one process`);
  }
  if (!isPlainObject(processes[0])) {
    throw new Error(`${context} config.process[0] must be a plain object`);
  }
  return processes[0];
}

function captureProperty(object: Record<string, unknown>, key: string): PropertyCapture {
  return Object.prototype.hasOwnProperty.call(object, key)
    ? { present: true, value: deepCopy(object[key], `Protected field ${key}`) }
    : { present: false };
}

function restoreProperty(object: Record<string, unknown>, key: string, capture: PropertyCapture): void {
  if (capture.present) object[key] = deepCopy(capture.value, `Protected field ${key}`);
  else delete object[key];
}

function getJobParts(
  job: unknown,
  context: string,
): {
  root: Record<string, unknown>;
  config: Record<string, unknown>;
  process: PlainProcess;
} {
  if (!isPlainObject(job)) throw new Error(`${context} must be an object`);
  if (!isPlainObject(job.config)) throw new Error(`${context} config must be a plain object`);
  return { root: job, config: job.config, process: requireSingleProcess(job.config, context) };
}

export function normalizePresetName(input: unknown): { name: string; nameKey: string } {
  if (typeof input !== 'string') throw new Error('Preset name must be a string');
  const name = input.trim();
  if (name.length === 0) throw new Error('Preset name is required');
  if (name.length > MAX_PRESET_NAME_LENGTH) {
    throw new Error(`Preset name must be at most ${MAX_PRESET_NAME_LENGTH} characters`);
  }
  return { name, nameKey: name.toLowerCase() };
}

export function validateTrainingPresetSnapshot(untrusted: unknown): TrainingPresetSnapshotV1 {
  if (!isPlainObject(untrusted)) throw new Error('Training preset snapshot must be a plain object');
  if (untrusted.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Training preset snapshot schema_version must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  if (untrusted.job !== 'extension') {
    throw new Error('Training preset snapshot job must be extension');
  }
  if (!isPlainObject(untrusted.config)) {
    throw new Error('Training preset snapshot config must be a plain object');
  }
  requireSingleProcess(untrusted.config, 'Training preset snapshot');

  const serialized = serializeJson(untrusted, 'Training preset snapshot');
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MAX_PRESET_SNAPSHOT_BYTES) {
    throw new Error('Training preset snapshot must not exceed 512 KiB');
  }

  const copied = JSON.parse(serialized) as Record<string, unknown>;
  const copiedConfig = copied.config as Record<string, unknown>;
  const copiedProcess = requireSingleProcess(copiedConfig, 'Training preset snapshot');
  return {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    job: 'extension',
    config: { process: [copiedProcess] },
  };
}

export function sanitizeTrainingPreset(jobConfig: JobConfig): TrainingPresetSnapshotV1 {
  const copied = deepCopy(jobConfig, 'Job config');
  const { process } = getJobParts(copied, 'Job config');
  const sanitizedProcess = deepCopy(process, 'Job process');

  for (const key of PROCESS_PROTECTED_KEYS) delete sanitizedProcess[key];
  if (isPlainObject(sanitizedProcess.sample)) {
    delete sanitizedProcess.sample.samples;
    delete sanitizedProcess.sample.prompts;
  }

  return validateTrainingPresetSnapshot({
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    job: 'extension',
    config: { process: [sanitizedProcess] },
  });
}

export function applyTrainingPreset(
  currentJob: JobConfig,
  untrustedSnapshot: unknown,
  migrate: (jobConfig: JobConfig) => JobConfig,
): JobConfig {
  const snapshot = validateTrainingPresetSnapshot(untrustedSnapshot);
  const currentCopy = deepCopy(currentJob, 'Current job config');
  const normalizedCurrent = deepCopy(migrate(currentCopy), 'Migrated current job config');
  const current = getJobParts(normalizedCurrent, 'Migrated current job config');

  const configName = captureProperty(current.config, 'name');
  const meta = captureProperty(current.root, 'meta');
  const protectedProcess = Object.fromEntries(
    PROCESS_PROTECTED_KEYS.map(key => [key, captureProperty(current.process, key)]),
  ) as Record<(typeof PROCESS_PROTECTED_KEYS)[number], PropertyCapture>;
  const currentSample = isPlainObject(current.process.sample) ? current.process.sample : {};
  const samples = captureProperty(currentSample, 'samples');

  const candidateProcess = deepCopy(snapshot.config.process[0], 'Training preset process');
  const candidate: Record<string, unknown> = {
    job: 'extension',
    config: { process: [candidateProcess] },
  };

  const restoreProtected = (job: Record<string, unknown>): void => {
    const parts = getJobParts(job, 'Preset candidate');
    restoreProperty(parts.config, 'name', configName);
    restoreProperty(parts.root, 'meta', meta);
    for (const key of PROCESS_PROTECTED_KEYS) {
      restoreProperty(parts.process, key, protectedProcess[key]);
    }
    if (samples.present) {
      if (!isPlainObject(parts.process.sample)) parts.process.sample = {};
      restoreProperty(parts.process.sample as Record<string, unknown>, 'samples', samples);
    } else if (isPlainObject(parts.process.sample)) {
      delete parts.process.sample.samples;
    }
    if (isPlainObject(parts.process.sample)) delete parts.process.sample.prompts;
  };

  restoreProtected(candidate);
  const migratedCandidate = deepCopy(
    migrate(deepCopy(candidate, 'Preset candidate') as unknown as JobConfig),
    'Migrated preset candidate',
  ) as unknown as Record<string, unknown>;
  restoreProtected(migratedCandidate);
  return deepCopy(migratedCandidate, 'Applied training preset') as unknown as JobConfig;
}
