import {
  BUILT_IN_ARCHITECTURE_BINDINGS,
  BUILT_IN_ARCHITECTURE_ORDER,
  BUILT_IN_CATEGORY_ORDER,
  BUILT_IN_PRESET_RELEASE_TIMESTAMP,
  BUILT_IN_PRESET_REVISION,
  BUILT_IN_RECIPE_PATHS,
} from './builtInTrainingPresetBindings';
import {
  SNAPSHOT_SCHEMA_VERSION,
  validateTrainingPresetSnapshot,
  type BuiltInTrainingPresetRecord,
} from './trainingPresets';

const RECIPE_URL_BASE = 'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/';
const RECORD_KEYS = [
  'id',
  'name',
  'source',
  'read_only',
  'schema_version',
  'snapshot',
  'created_at',
  'updated_at',
  'category',
  'intent_slug',
  'model_arch',
  'catalog_revision',
  'summary',
  'recipe_path',
  'prerequisites',
  'warnings',
  'evidence',
] as const;
const PROTECTED_PROCESS_KEYS = new Set([
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
]);
const POSITIVE_INTEGER_KEYS = new Set([
  'linear',
  'linear_alpha',
  'conv',
  'conv_alpha',
  'steps',
  'batch_size',
  'gradient_accumulation',
  'max_step_saves_to_keep',
  'width',
  'height',
  'num_inference_steps',
  'num_frames',
  'fps',
]);

function canonicalJsonError(path: string, reason: string): never {
  throw new TypeError(`Unsupported canonical JSON value at ${path}: ${reason}`);
}

function encodeCanonicalJson(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) canonicalJsonError(path, 'number must be finite');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') canonicalJsonError(path, typeof value);
  if (ancestors.has(value)) canonicalJsonError(path, 'cycle');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      if (
        lengthDescriptor === undefined ||
        !('value' in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        canonicalJsonError(path, 'array length is invalid');
      }
      const length = lengthDescriptor.value as number;
      const elements = new Map<number, unknown>();
      for (const key of ownKeys) {
        if (key === 'length') continue;
        if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) {
          canonicalJsonError(path, 'array has a symbol or non-index property');
        }
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
          canonicalJsonError(path, 'array has an out-of-range index property');
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          canonicalJsonError(`${path}[${key}]`, 'non-enumerable or accessor element');
        }
        elements.set(index, descriptor.value);
      }
      if (elements.size !== length) {
        let expected = 0;
        for (const index of Array.from(elements.keys()).sort((left, right) => left - right)) {
          if (index !== expected) break;
          expected += 1;
        }
        canonicalJsonError(`${path}[${expected}]`, 'sparse array');
      }
      const encoded: string[] = [];
      for (let index = 0; index < length; index += 1) {
        encoded.push(encodeCanonicalJson(elements.get(index), `${path}[${index}]`, ancestors));
      }
      return `[${encoded.join(',')}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) canonicalJsonError(path, 'non-plain object');
    const entries: Array<{ key: string; value: unknown }> = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') canonicalJsonError(path, 'symbol key');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        canonicalJsonError(`${path}.${key}`, 'non-enumerable or accessor property');
      }
      entries.push({ key, value: descriptor.value });
    }
    entries.sort((left, right) => compareCodePoints(left.key, right.key));
    return `{${entries
      .map(
        entry => `${JSON.stringify(entry.key)}:${encodeCanonicalJson(entry.value, `${path}.${entry.key}`, ancestors)}`,
      )
      .join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, char => char.codePointAt(0)!);
  const b = Array.from(right, char => char.codePointAt(0)!);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

export function canonicalizePresetJson(value: unknown): string {
  return encodeCanonicalJson(value, '$', new Set());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requirePlainObject(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) throw new Error(`${path} must be a plain object`);
}

function requireOwn(object: Record<string, unknown>, key: string, path: string): void {
  if (!Object.prototype.hasOwnProperty.call(object, key))
    throw new Error(`${path}.${key} must be an own required field`);
}

function requireNonblank(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new Error(`${path} must be a nonblank trimmed string`);
  }
}

function requireStringArray(value: unknown, path: string): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  value.forEach((item, index) => requireNonblank(item, `${path}[${index}]`));
}

function requireNonnegativeNumbers(value: unknown, path: string, key = ''): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be finite`);
    if (value < 0) throw new Error(`${path} must be nonnegative`);
    if (POSITIVE_INTEGER_KEYS.has(key) && (!Number.isInteger(value) || value <= 0)) {
      throw new Error(`${path} must be a positive integer`);
    }
    if ((key.endsWith('_percent') || key === 'percent') && value > 1) {
      throw new Error(`${path} must be between 0 and 1`);
    }
    if ((key === 'lr' || key.endsWith('_rate') || key === 'weight_decay' || key === 'ema_decay') && value > 1) {
      throw new Error(`${path} must be between 0 and 1`);
    }
    if ((key.endsWith('_every') || key.endsWith('_step') || key === 'seed') && !Number.isInteger(value)) {
      throw new Error(`${path} must be an integer`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => requireNonnegativeNumbers(item, `${path}[${index}]`));
  } else if (isPlainObject(value)) {
    for (const [childKey, child] of Object.entries(value)) {
      requireNonnegativeNumbers(child, `${path}.${childKey}`, childKey);
    }
  }
}

function rejectUnsafeRuntimeValues(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (/\$\{[^}]*\}|\{\{[^}]*\}\}|<(?:dataset|output|model|path|job)[^>]*>/i.test(value)) {
      throw new Error(`${path} contains a runtime placeholder`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectUnsafeRuntimeValues(item, `${path}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (path !== '$.snapshot.config.process[0].model' || key !== 'name_or_path') {
      if (/(?:^|_)(?:path|folder|directory|dir)$/.test(lower)) {
        throw new Error(`${path}.${key} is a personal or mutable path`);
      }
    }
    rejectUnsafeRuntimeValues(child, `${path}.${key}`);
  }
}

export function normalizeTrainingPresetRecipePath(untrustedPath: unknown): string {
  if (typeof untrustedPath !== 'string' || untrustedPath.length === 0) {
    throw new Error('Training preset recipe path must be a nonblank string');
  }
  if (
    untrustedPath.startsWith('/') ||
    untrustedPath.includes('\\') ||
    untrustedPath.includes('?') ||
    untrustedPath.includes('#') ||
    untrustedPath.includes('\0') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(untrustedPath)
  ) {
    throw new Error('Training preset recipe path must be a repository-relative path');
  }
  const segments = untrustedPath.split('/');
  if (segments.some(segment => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error('Training preset recipe path contains an invalid segment');
  }
  if (segments.length < 4 || segments.slice(0, 3).join('/') !== 'docs/book/recipes' || !untrustedPath.endsWith('.md')) {
    throw new Error('Training preset recipe path must be below docs/book/recipes');
  }
  return segments.join('/');
}

export function trainingPresetRecipeUrl(recipePath: unknown): string {
  const normalized = normalizeTrainingPresetRecipePath(recipePath);
  return `${RECIPE_URL_BASE}${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

function freezeRecursively(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length' && Array.isArray(value)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && 'value' in descriptor) freezeRecursively(descriptor.value, seen);
  }
  Object.freeze(value);
}

export function deepFreezePreset<T>(value: T): T {
  canonicalizePresetJson(value);
  freezeRecursively(value, new WeakSet());
  return value;
}

export function copyBuiltInPreset<T>(value: T): T {
  return JSON.parse(canonicalizePresetJson(value)) as T;
}

export function validateBuiltInTrainingPresetRecord(untrusted: unknown): BuiltInTrainingPresetRecord {
  untrusted = JSON.parse(canonicalizePresetJson(untrusted)) as unknown;
  requirePlainObject(untrusted, 'Built-in training preset');
  const extraKeys = Object.keys(untrusted).filter(key => !(RECORD_KEYS as readonly string[]).includes(key));
  if (extraKeys.length > 0) throw new Error(`Built-in training preset has unsupported field ${extraKeys[0]}`);
  for (const key of RECORD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(untrusted, key))
      throw new Error(`Built-in training preset.${key} is required`);
  }
  if (untrusted.source !== 'builtin') throw new Error('Built-in training preset source must be builtin');
  if (untrusted.read_only !== true) throw new Error('Built-in training preset read_only must be true');
  if (untrusted.schema_version !== SNAPSHOT_SCHEMA_VERSION)
    throw new Error('Built-in training preset schema_version must be 1');
  requireNonblank(untrusted.name, 'Built-in training preset name');
  requireNonblank(untrusted.summary, 'Built-in training preset summary');
  requireNonblank(untrusted.model_arch, 'Built-in training preset model_arch');
  if (!BUILT_IN_ARCHITECTURE_ORDER.includes(untrusted.model_arch as never)) {
    throw new Error('Built-in training preset model_arch is unsupported');
  }
  if (untrusted.catalog_revision !== BUILT_IN_PRESET_REVISION) {
    throw new Error(`Built-in training preset catalog_revision must be ${BUILT_IN_PRESET_REVISION}`);
  }
  if (typeof untrusted.intent_slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(untrusted.intent_slug)) {
    throw new Error('Built-in training preset intent_slug is malformed');
  }
  const expectedId = `builtin:${untrusted.model_arch}:${untrusted.intent_slug}@${untrusted.catalog_revision}`;
  if (untrusted.id !== expectedId) throw new Error(`Built-in training preset id must be ${expectedId}`);
  if (untrusted.created_at !== BUILT_IN_PRESET_RELEASE_TIMESTAMP)
    throw new Error('Built-in training preset created_at is invalid');
  if (untrusted.updated_at !== BUILT_IN_PRESET_RELEASE_TIMESTAMP)
    throw new Error('Built-in training preset updated_at is invalid');
  if (!BUILT_IN_CATEGORY_ORDER.includes(untrusted.category as never))
    throw new Error('Built-in training preset category is unsupported');
  if (!['configuration-validated', 'launch-tested', 'training-tested'].includes(untrusted.evidence as string)) {
    throw new Error('Built-in training preset evidence is unsupported');
  }
  const recipePath = normalizeTrainingPresetRecipePath(untrusted.recipe_path);
  if (!BUILT_IN_RECIPE_PATHS.includes(recipePath as never))
    throw new Error('Built-in training preset recipe_path is unsupported');
  requireStringArray(untrusted.prerequisites, 'Built-in training preset prerequisites');
  requireStringArray(untrusted.warnings, 'Built-in training preset warnings');

  requirePlainObject(untrusted.snapshot, 'Built-in training preset snapshot');
  for (const key of ['schema_version', 'job', 'config']) {
    requireOwn(untrusted.snapshot, key, 'Built-in training preset snapshot');
  }
  for (const key of Object.keys(untrusted.snapshot)) {
    if (!['schema_version', 'job', 'config'].includes(key)) {
      throw new Error(`Built-in training preset snapshot.${key} leaks job identity`);
    }
  }
  requirePlainObject(untrusted.snapshot.config, 'Built-in training preset snapshot.config');
  requireOwn(untrusted.snapshot.config, 'process', 'Built-in training preset snapshot.config');
  for (const key of Object.keys(untrusted.snapshot.config)) {
    if (key !== 'process') throw new Error(`Built-in training preset snapshot.config.${key} leaks job identity`);
  }
  const snapshot = validateTrainingPresetSnapshot(untrusted.snapshot);
  const process = snapshot.config.process[0];
  if (process.type !== 'diffusion_trainer') throw new Error('config.process[0].type must be diffusion_trainer');
  for (const key of PROTECTED_PROCESS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(process, key)) throw new Error(`config.process[0].${key} is protected`);
  }
  for (const section of ['model', 'network', 'train', 'save', 'sample', 'logging'] as const) {
    requirePlainObject(process[section], `config.process[0].${section}`);
  }
  const model = process.model as Record<string, unknown>;
  const network = process.network as Record<string, unknown>;
  const save = process.save as Record<string, unknown>;
  const sample = process.sample as Record<string, unknown>;
  const logging = process.logging as Record<string, unknown>;
  if (model.arch !== untrusted.model_arch) throw new Error('config.process[0].model.arch must match model_arch');
  const binding = BUILT_IN_ARCHITECTURE_BINDINGS.find(candidate => candidate.ui_arch === untrusted.model_arch)!;
  if (model.name_or_path !== binding.model_path)
    throw new Error(`config.process[0].model.name_or_path must be ${binding.model_path}`);
  if (network.type !== 'lora') throw new Error('config.process[0].network.type must be lora');
  for (const key of ['samples', 'prompts', 'neg']) {
    if (Object.prototype.hasOwnProperty.call(sample, key))
      throw new Error(`config.process[0].sample.${key} is forbidden`);
  }
  if (save.push_to_hub !== false) throw new Error('config.process[0].save.push_to_hub must be false');
  for (const key of Object.keys(save)) {
    if (key !== 'push_to_hub' && /(?:hub|repo|destination)/i.test(key)) {
      throw new Error(`config.process[0].save.${key} is a Hub destination`);
    }
  }
  if (logging.use_wandb !== false) throw new Error('config.process[0].logging.use_wandb must be false');
  for (const key of Object.keys(logging)) {
    if (key !== 'use_wandb' && /wandb/i.test(key)) throw new Error(`config.process[0].logging.${key} activates W&B`);
    if (key === 'project_name') throw new Error('config.process[0].logging.project_name is a W&B destination');
    if (key !== 'use_ui_logger' && key.startsWith('use_') && logging[key] === true) {
      throw new Error(`config.process[0].logging.${key} activates remote logging`);
    }
  }
  rejectUnsafeRuntimeValues(snapshot, '$.snapshot');
  requireNonnegativeNumbers(snapshot, '$.snapshot');

  const copied = copyBuiltInPreset({ ...untrusted, snapshot }) as BuiltInTrainingPresetRecord;
  return deepFreezePreset(copied);
}

export function compareBuiltInTrainingPresetRecords(
  left: Pick<BuiltInTrainingPresetRecord, 'id' | 'name' | 'model_arch' | 'category'>,
  right: Pick<BuiltInTrainingPresetRecord, 'id' | 'name' | 'model_arch' | 'category'>,
): number {
  const architectureOrder = BUILT_IN_ARCHITECTURE_ORDER as readonly string[];
  const architecture = architectureOrder.indexOf(left.model_arch) - architectureOrder.indexOf(right.model_arch);
  if (architecture !== 0) return architecture;
  const category = BUILT_IN_CATEGORY_ORDER.indexOf(left.category) - BUILT_IN_CATEGORY_ORDER.indexOf(right.category);
  return category || compareCodePoints(left.name, right.name) || compareCodePoints(left.id, right.id);
}

export function builtInsForArchitecture(
  records: readonly BuiltInTrainingPresetRecord[],
  modelArchitecture: string,
): BuiltInTrainingPresetRecord[] {
  return records
    .filter(record => record.model_arch === modelArchitecture)
    .sort(compareBuiltInTrainingPresetRecords)
    .map(record => copyBuiltInPreset(record));
}
