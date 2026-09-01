import type { JobConfig } from '../types';

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const MAX_PRESET_NAME_LENGTH = 80;
export const MAX_PRESET_SNAPSHOT_BYTES = 512 * 1024;

type PlainProcess = Record<string, unknown>;
type CopyValue = <T>(value: T, context: string) => T;

export interface TrainingPresetSnapshotV1 {
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  job: 'extension';
  config: {
    process: [PlainProcess];
  };
}

export interface TrainingPresetRecordBase {
  id: string;
  name: string;
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  snapshot: TrainingPresetSnapshotV1;
  created_at: string;
  updated_at: string;
}

export interface UserTrainingPresetRecord extends TrainingPresetRecordBase {
  readonly source: 'user';
  readonly read_only: false;
}

export type BuiltInTrainingPresetCategory =
  | 'character'
  | 'style'
  | 'object'
  | 'refinement'
  | 'low-vram'
  | 'diagnostic';

export type BuiltInTrainingPresetEvidence =
  | 'configuration-validated'
  | 'launch-tested'
  | 'training-tested';

export interface BuiltInTrainingPresetRecord extends TrainingPresetRecordBase {
  readonly source: 'builtin';
  readonly read_only: true;
  category: BuiltInTrainingPresetCategory;
  intent_slug: string;
  model_arch: string;
  catalog_revision: number;
  summary: string;
  recipe_path: string;
  prerequisites: string[];
  warnings: string[];
  evidence: BuiltInTrainingPresetEvidence;
}

export type TrainingPresetRecord = UserTrainingPresetRecord | BuiltInTrainingPresetRecord;

type PropertyCapture = { present: boolean; value?: unknown };

const PROCESS_PROTECTED_KEYS = [
  'datasets',
  'trigger_word',
  'trigger',
  'job',
  'name',
  'meta',
  'training_folder',
  'sqlite_db_path',
  'device',
  'output',
  'output_dir',
  'output_path',
  'output_folder',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonSafe(value: unknown, path: string, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
    return;
  }
  if (typeof value === 'undefined') throw new Error(`${path} must not be undefined`);
  if (typeof value !== 'object') throw new Error(`${path} contains unsupported ${typeof value}`);
  if (ancestors.has(value)) throw new Error(`${path} contains a circular reference`);
  if (!Array.isArray(value) && !isPlainObject(value)) {
    throw new Error(`${path} must be a plain object or array`);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonSafe(value[index], `${path}[${index}]`, ancestors);
    }
  } else {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(`${path} contains an unsupported symbol key`);
    }
    for (const [key, child] of Object.entries(value)) {
      // Optional object properties commonly use explicit undefined; JSON treats them as absent.
      if (child !== undefined) assertJsonSafe(child, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function serializeJson(value: unknown, context: string): string {
  assertJsonSafe(value, '$');
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('not JSON serializable');
    return serialized;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${context} must be JSON serializable: ${detail}`);
  }
}

function requireNonblankString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path} must be a nonblank string`);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateTrainingProcess(process: PlainProcess, path: string): void {
  requireNonblankString(process.type, `${path}.type`);
  if (!isPlainObject(process.model)) throw new Error(`${path}.model must be a plain object`);
  if (process.model.arch !== undefined) {
    requireNonblankString(process.model.arch, `${path}.model.arch`);
  }
  requireNonblankString(process.model.name_or_path, `${path}.model.name_or_path`);
  for (const section of ['train', 'save', 'sample'] as const) {
    if (!isPlainObject(process[section])) throw new Error(`${path}.${section} must be a plain object`);
  }
}

function deepCopy<T>(value: T, context: string): T {
  return JSON.parse(serializeJson(value, context)) as T;
}

function clonePreservingOwnUndefined(value: unknown, path: string, ancestors: Set<object>): unknown {
  if (value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
    return value;
  }
  if (typeof value !== 'object') throw new Error(`${path} contains unsupported ${typeof value}`);
  if (ancestors.has(value)) throw new Error(`${path} contains a circular reference`);

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      if (
        lengthDescriptor === undefined ||
        !('value' in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        throw new Error(`${path} array length is invalid`);
      }
      const length = lengthDescriptor.value as number;
      const descriptors = new Map<number, PropertyDescriptor>();
      for (const key of Reflect.ownKeys(value)) {
        if (key === 'length') continue;
        if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) {
          throw new Error(`${path} array has a symbol or non-index property`);
        }
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
          throw new Error(`${path} array has an out-of-range index property`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          throw new Error(`${path}[${key}] must be an enumerable data property, not an accessor`);
        }
        descriptors.set(index, descriptor);
      }
      if (descriptors.size !== length) throw new Error(`${path} array must not be sparse`);
      const copy: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const child = descriptors.get(index)!.value;
        if (child === undefined) throw new Error(`${path}[${index}] must not be undefined`);
        copy.push(clonePreservingOwnUndefined(child, `${path}[${index}]`, ancestors));
      }
      return copy;
    }

    if (!isPlainObject(value)) throw new Error(`${path} must be a plain object or array`);
    const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') throw new Error(`${path} contains an unsupported symbol key`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new Error(`${path}.${key} must be an enumerable data property, not an accessor`);
      }
      Object.defineProperty(copy, key, {
        value: clonePreservingOwnUndefined(descriptor.value, `${path}.${key}`, ancestors),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return copy;
  } finally {
    ancestors.delete(value);
  }
}

function deepCopyPreservingOwnUndefined<T>(value: T, _context: string): T {
  return clonePreservingOwnUndefined(value, '$', new Set()) as T;
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

function captureProperty(object: Record<string, unknown>, key: string, copyValue: CopyValue = deepCopy): PropertyCapture {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined) return { present: false };
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new Error(`Protected field ${key} must be an own enumerable data property, not an accessor`);
  }
  return {
    present: true,
    value: descriptor.value === undefined ? undefined : copyValue(descriptor.value, `Protected field ${key}`),
  };
}

function restoreProperty(
  object: Record<string, unknown>,
  key: string,
  capture: PropertyCapture,
  copyValue: CopyValue = deepCopy,
): void {
  if (capture.present) {
    object[key] = capture.value === undefined ? undefined : copyValue(capture.value, `Protected field ${key}`);
  }
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

export function compareTrainingPresetRecords(
  left: Pick<TrainingPresetRecord, 'id' | 'name'>,
  right: Pick<TrainingPresetRecord, 'id' | 'name'>,
): number {
  const caseInsensitive = left.name.localeCompare(right.name, 'en', { sensitivity: 'base' });
  return caseInsensitive || compareText(left.name, right.name) || compareText(left.id, right.id);
}

export function validateTrainingPresetSnapshot(untrusted: unknown): TrainingPresetSnapshotV1 {
  if (!isPlainObject(untrusted)) throw new Error('Training preset snapshot must be a plain object');
  assertJsonSafe(untrusted, '$');
  if (untrusted.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Training preset snapshot schema_version must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  if (untrusted.job !== 'extension') {
    throw new Error('Training preset snapshot job must be extension');
  }
  if (!isPlainObject(untrusted.config)) {
    throw new Error('Training preset snapshot config must be a plain object');
  }
  const process = requireSingleProcess(untrusted.config, 'Training preset snapshot');
  validateTrainingProcess(process, 'config.process[0]');

  const serialized = serializeJson(untrusted, 'Training preset snapshot');
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MAX_PRESET_SNAPSHOT_BYTES) {
    throw new Error('Training preset snapshot must not exceed 512 KiB');
  }

  const copied = JSON.parse(serialized) as Record<string, unknown>;
  const copiedConfig = copied.config as Record<string, unknown>;
  const copiedProcess = requireSingleProcess(copiedConfig, 'Training preset snapshot');
  validateTrainingProcess(copiedProcess, 'config.process[0]');
  return {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    job: 'extension',
    config: { process: [copiedProcess] },
  };
}

export function sanitizeTrainingPreset(jobConfig: JobConfig): TrainingPresetSnapshotV1 {
  if (!isPlainObject(jobConfig) || jobConfig.job !== 'extension') {
    throw new Error('Job config job must be extension');
  }
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

export interface TrainingPresetApplicationPolicy {
  preserveCurrentNegativePrompt: boolean;
}

export function applyTrainingPresetWithPolicy(
  currentJob: JobConfig,
  untrustedSnapshot: unknown,
  migrate: (jobConfig: JobConfig) => JobConfig,
  policy: TrainingPresetApplicationPolicy,
): JobConfig {
  const snapshot = validateTrainingPresetSnapshot(untrustedSnapshot);
  const copyForApplication: CopyValue = policy.preserveCurrentNegativePrompt
    ? deepCopyPreservingOwnUndefined
    : deepCopy;
  const currentCopy = copyForApplication(currentJob, 'Current job config');
  const original = getJobParts(currentCopy, 'Current job config');
  const configName = captureProperty(original.config, 'name', copyForApplication);
  const meta = captureProperty(original.root, 'meta', copyForApplication);
  const protectedProcess = Object.fromEntries(
    PROCESS_PROTECTED_KEYS.map(key => [key, captureProperty(original.process, key, copyForApplication)]),
  ) as Record<(typeof PROCESS_PROTECTED_KEYS)[number], PropertyCapture>;
  const originalSample = isPlainObject(original.process.sample) ? original.process.sample : {};
  const preserveSamples =
    Object.prototype.hasOwnProperty.call(originalSample, 'samples') ||
    Object.prototype.hasOwnProperty.call(originalSample, 'prompts');

  const normalizedCurrent = copyForApplication(migrate(currentCopy), 'Migrated current job config');
  const current = getJobParts(normalizedCurrent, 'Migrated current job config');
  validateTrainingProcess(current.process, 'config.process[0]');

  const currentSample = isPlainObject(current.process.sample) ? current.process.sample : {};
  const negativePrompt = policy.preserveCurrentNegativePrompt
    ? captureProperty(currentSample, 'neg', copyForApplication)
    : undefined;
  const samples = preserveSamples
    ? captureProperty(currentSample, 'samples', copyForApplication)
    : { present: false };

  const candidateProcess = deepCopy(snapshot.config.process[0], 'Training preset process');
  const candidate: Record<string, unknown> = {
    job: 'extension',
    config: { process: [candidateProcess] },
  };

  const restoreProtected = (job: Record<string, unknown>): void => {
    const parts = getJobParts(job, 'Preset candidate');
    restoreProperty(parts.config, 'name', configName, copyForApplication);
    restoreProperty(parts.root, 'meta', meta, copyForApplication);
    for (const key of PROCESS_PROTECTED_KEYS) {
      restoreProperty(parts.process, key, protectedProcess[key], copyForApplication);
    }
    if (samples.present) {
      if (!isPlainObject(parts.process.sample)) parts.process.sample = {};
      restoreProperty(parts.process.sample as Record<string, unknown>, 'samples', samples, copyForApplication);
    } else if (isPlainObject(parts.process.sample)) {
      delete parts.process.sample.samples;
    }
    if (isPlainObject(parts.process.sample)) delete parts.process.sample.prompts;
    if (negativePrompt !== undefined) {
      if (negativePrompt.present) {
        if (!isPlainObject(parts.process.sample)) parts.process.sample = {};
        restoreProperty(parts.process.sample as Record<string, unknown>, 'neg', negativePrompt, copyForApplication);
      } else if (isPlainObject(parts.process.sample)) {
        delete parts.process.sample.neg;
      }
    }
  };

  const candidateForMigration = copyForApplication(candidate, 'Preset candidate') as unknown as Record<string, unknown>;
  restoreProtected(candidateForMigration);
  const migratedCandidate = copyForApplication(
    migrate(candidateForMigration as unknown as JobConfig),
    'Migrated preset candidate',
  ) as unknown as Record<string, unknown>;
  validateTrainingProcess(getJobParts(migratedCandidate, 'Migrated preset candidate').process, 'config.process[0]');
  restoreProtected(migratedCandidate);
  validateTrainingProcess(getJobParts(migratedCandidate, 'Applied training preset').process, 'config.process[0]');
  const result = copyForApplication(migratedCandidate, 'Applied training preset') as unknown as Record<string, unknown>;
  restoreProtected(result);
  validateTrainingProcess(getJobParts(result, 'Applied training preset').process, 'config.process[0]');
  return result as unknown as JobConfig;
}

export function applyTrainingPreset(
  currentJob: JobConfig,
  untrustedSnapshot: unknown,
  migrate: (jobConfig: JobConfig) => JobConfig,
): JobConfig {
  return applyTrainingPresetWithPolicy(currentJob, untrustedSnapshot, migrate, {
    preserveCurrentNegativePrompt: false,
  });
}
