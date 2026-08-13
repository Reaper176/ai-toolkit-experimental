import { createHash } from 'node:crypto';
import { normalizeRelativeMediaPath } from './datasetSelection';
import {
  DATASET_PRESET_NOTE_MAX,
  normalizePresetName,
  validateCaptionExtension,
  validateLoaderConfig,
  type DatasetPresetLoaderConfig,
} from './datasetPresetValidation';

export {
  applySelectionAction,
  isSupportedDatasetMediaPath,
  normalizeRelativeMediaPath,
  SUPPORTED_DATASET_MEDIA_EXTENSIONS,
  type SelectionAction,
} from './datasetSelection';
export {
  DATASET_PRESET_NAME_MAX,
  DATASET_PRESET_NOTE_MAX,
  LOADER_CONFIG_KEYS,
  normalizePresetName,
  validateLoaderConfig,
  type DatasetPresetLoaderConfig,
} from './datasetPresetValidation';

export const DATASET_PRESET_SCHEMA_VERSION = 1 as const;

export interface DatasetPresetManifestFile {
  source_path: string;
  managed_path: string;
  media_bytes: number;
  media_sha256: string;
  caption_ext: string;
  caption_text: string | null;
  caption_bytes: number | null;
  caption_sha256: string | null;
  caption_missing: boolean;
  mask_path?: string | null;
  mask_bytes?: number | null;
  mask_sha256?: string | null;
  mask_missing?: boolean;
}

export interface DatasetPresetManifestV1 {
  schema_version: typeof DATASET_PRESET_SCHEMA_VERSION;
  preset_id: string;
  version: number;
  preset_name: string;
  source_dataset: string;
  created_at: string;
  note: string | null;
  loader_config: DatasetPresetLoaderConfig;
  media_count: number;
  total_bytes: number;
  files: DatasetPresetManifestFile[];
}

export interface DatasetPresetReference {
  version_id: string;
  preset_id: string;
  preset_name: string;
  version: number;
  manifest_sha256: string;
}

const EXTERNAL_PATH_KEYS = new Set([
  'folder_path',
  'dataset_path',
  'control_path',
  'control_path_1',
  'control_path_2',
  'control_path_3',
  'mask_path',
  'unconditional_path',
  'inpaint_path',
  'clip_image_path',
]);
const SHA256 = /^[a-f0-9]{64}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requirePlainObject(value: unknown, path: string): Record<string, unknown> {
  if (!isPlainObject(value)) throw new Error(`${path} must be a plain object`);
  return value;
}

function requireExactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      if (EXTERNAL_PATH_KEYS.has(key)) throw new Error(`${path}.${key} is an external path and is not allowed`);
      throw new Error(`${path} contains unknown key ${key}`);
    }
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(`${path}.${key} is required`);
  }
}

function requireText(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    throw new Error(`${path} must be ${allowEmpty ? 'a string' : 'a nonempty string'}`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`);
  return value;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  const number = requireFiniteNumber(value, path);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${path} must be a positive safe integer`);
  return number;
}

function requireNonnegativeSafeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${path} must be a nonnegative safe integer`);
  }
  return value;
}

function requireSha256(value: unknown, path: string): string {
  if (typeof value !== 'string' || !SHA256.test(value)) throw new Error(`${path} must be a lowercase SHA-256 hash`);
  return value;
}

function portablePathKey(path: string): string {
  return path.toLowerCase();
}

function requireCanonicalUtcMillisecondTimestamp(value: unknown, path: string): string {
  const timestamp = requireText(value, path);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== timestamp) {
    throw new Error(`${path} must be a canonical UTC millisecond ISO timestamp`);
  }
  return timestamp;
}

function sortFiles(files: DatasetPresetManifestFile[]): DatasetPresetManifestFile[] {
  return [...files].sort((left, right) => {
    const leftKey = `${left.source_path}\0${left.managed_path}`;
    const rightKey = `${right.source_path}\0${right.managed_path}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

function validateFile(untrusted: unknown, path: string): DatasetPresetManifestFile {
  const value = requirePlainObject(untrusted, path);
  const requiredKeys = [
      'source_path',
      'managed_path',
      'media_bytes',
      'media_sha256',
      'caption_ext',
      'caption_text',
      'caption_bytes',
      'caption_sha256',
      'caption_missing',
  ] as const;
  const maskKeys = ['mask_path', 'mask_bytes', 'mask_sha256', 'mask_missing'] as const;
  const maskKeyCount = maskKeys.filter(key => Object.prototype.hasOwnProperty.call(value, key)).length;
  requireExactKeys(value, [...requiredKeys, ...(maskKeyCount ? maskKeys : [])], path);
  if (maskKeyCount !== 0 && maskKeyCount !== maskKeys.length) {
    throw new Error(`${path} mask fields must all be present together`);
  }
  const captionMissing = requireBoolean(value.caption_missing, `${path}.caption_missing`);
  const captionText = value.caption_text;
  const captionBytes = value.caption_bytes;
  const captionSha256 = value.caption_sha256;
  if (captionMissing) {
    if (captionText !== null || captionBytes !== null || captionSha256 !== null) {
      throw new Error(`${path} missing caption fields must be null`);
    }
  } else {
    requireText(captionText, `${path}.caption_text`, true);
    requireNonnegativeSafeInteger(captionBytes, `${path}.caption_bytes`);
    requireSha256(captionSha256, `${path}.caption_sha256`);
  }
  const result: DatasetPresetManifestFile = {
    source_path: normalizeRelativeMediaPath(value.source_path),
    managed_path: normalizeRelativeMediaPath(value.managed_path),
    media_bytes: requireNonnegativeSafeInteger(value.media_bytes, `${path}.media_bytes`),
    media_sha256: requireSha256(value.media_sha256, `${path}.media_sha256`),
    caption_ext: validateCaptionExtension(value.caption_ext, `${path}.caption_ext`),
    caption_text: captionMissing ? null : (captionText as string),
    caption_bytes: captionMissing ? null : (captionBytes as number),
    caption_sha256: captionMissing ? null : (captionSha256 as string),
    caption_missing: captionMissing,
  };
  if (maskKeyCount) {
    const maskMissing = requireBoolean(value.mask_missing, `${path}.mask_missing`);
    if (maskMissing) {
      if (value.mask_path !== null || value.mask_bytes !== null || value.mask_sha256 !== null) {
        throw new Error(`${path} missing mask fields must be null`);
      }
      Object.assign(result, { mask_path: null, mask_bytes: null, mask_sha256: null, mask_missing: true });
    } else {
      if (typeof value.mask_path !== 'string' || !/^masks\/[^/\\]+\.png$/.test(value.mask_path)) {
        throw new Error(`${path}.mask_path must be masks/<basename>.png`);
      }
      const maskBytes = requireNonnegativeSafeInteger(value.mask_bytes, `${path}.mask_bytes`);
      if (maskBytes === 0) throw new Error(`${path}.mask_bytes must be positive when mask is present`);
      Object.assign(result, {
        mask_path: value.mask_path,
        mask_bytes: maskBytes,
        mask_sha256: requireSha256(value.mask_sha256, `${path}.mask_sha256`),
        mask_missing: false,
      });
    }
  }
  return result;
}

function validateManifestFields(untrusted: unknown): DatasetPresetManifestV1 {
  const value = requirePlainObject(untrusted, 'Dataset preset manifest');
  requireExactKeys(
    value,
    [
      'schema_version',
      'preset_id',
      'version',
      'preset_name',
      'source_dataset',
      'created_at',
      'note',
      'loader_config',
      'media_count',
      'total_bytes',
      'files',
    ],
    'Dataset preset manifest',
  );
  if (value.schema_version !== DATASET_PRESET_SCHEMA_VERSION) {
    throw new Error(`Dataset preset manifest schema_version must be ${DATASET_PRESET_SCHEMA_VERSION}`);
  }
  const filesInput = value.files;
  if (!Array.isArray(filesInput)) throw new Error('Dataset preset manifest.files must be an array');
  if (filesInput.length === 0) throw new Error('Dataset preset manifest.files must contain at least one entry');
  const files = sortFiles(filesInput.map((file, index) => validateFile(file, `Dataset preset manifest.files[${index}]`)));
  const sourcePaths = new Set<string>();
  const managedPaths = new Set<string>();
  for (const file of files) {
    const sourcePathKey = portablePathKey(file.source_path);
    const managedPathKey = portablePathKey(file.managed_path);
    if (sourcePaths.has(sourcePathKey) || managedPaths.has(managedPathKey)) {
      throw new Error('Dataset preset manifest files must have unique portable paths');
    }
    sourcePaths.add(sourcePathKey);
    managedPaths.add(managedPathKey);
  }
  const mediaCount = requirePositiveInteger(value.media_count, 'Dataset preset manifest.media_count');
  const totalBytes = requireNonnegativeSafeInteger(value.total_bytes, 'Dataset preset manifest.total_bytes');
  const derivedBytes = files.reduce(
    (total, file) => total + file.media_bytes + (file.caption_bytes ?? 0) + (file.mask_bytes ?? 0),
    0,
  );
  if (!Number.isSafeInteger(derivedBytes)) throw new Error('Dataset preset manifest total bytes exceed safe integer range');
  if (mediaCount !== files.length) throw new Error('Dataset preset manifest.media_count must match files');
  if (totalBytes !== derivedBytes) throw new Error('Dataset preset manifest.total_bytes must match files');
  const presetName = normalizePresetName(value.preset_name).name;
  const note = value.note;
  if (note !== null && typeof note !== 'string') throw new Error('Dataset preset manifest.note must be a string or null');
  if (typeof note === 'string' && note.length > DATASET_PRESET_NOTE_MAX) {
    throw new Error(`Dataset preset manifest.note must be at most ${DATASET_PRESET_NOTE_MAX} characters`);
  }
  const createdAt = requireCanonicalUtcMillisecondTimestamp(value.created_at, 'Dataset preset manifest.created_at');
  return {
    schema_version: DATASET_PRESET_SCHEMA_VERSION,
    preset_id: requireText(value.preset_id, 'Dataset preset manifest.preset_id'),
    version: requirePositiveInteger(value.version, 'Dataset preset manifest.version'),
    preset_name: presetName,
    source_dataset: requireText(value.source_dataset, 'Dataset preset manifest.source_dataset'),
    created_at: createdAt,
    note,
    loader_config: validateLoaderConfig(value.loader_config),
    media_count: mediaCount,
    total_bytes: totalBytes,
    files,
  };
}

export function buildDatasetPresetManifest(
  input: Omit<DatasetPresetManifestV1, 'schema_version' | 'media_count' | 'total_bytes'>,
): DatasetPresetManifestV1 {
  const value = requirePlainObject(input, 'Dataset preset manifest input');
  requireExactKeys(
    value,
    ['preset_id', 'version', 'preset_name', 'source_dataset', 'created_at', 'note', 'loader_config', 'files'],
    'Dataset preset manifest input',
  );
  const filesInput = value.files;
  if (!Array.isArray(filesInput)) throw new Error('Dataset preset manifest input.files must be an array');
  const files = sortFiles(filesInput.map((file, index) => validateFile(file, `Dataset preset manifest input.files[${index}]`)));
  return validateManifestFields({
    schema_version: DATASET_PRESET_SCHEMA_VERSION,
    preset_id: value.preset_id,
    version: value.version,
    preset_name: value.preset_name,
    source_dataset: value.source_dataset,
    created_at: value.created_at,
    note: value.note,
    loader_config: value.loader_config,
    media_count: files.length,
    total_bytes: files.reduce(
      (total, file) => total + file.media_bytes + (file.caption_bytes ?? 0) + (file.mask_bytes ?? 0),
      0,
    ),
    files,
  });
}

export function validateManifest(untrusted: unknown): DatasetPresetManifestV1 {
  return validateManifestFields(untrusted);
}

export function serializeManifest(untrusted: unknown): string {
  return `${JSON.stringify(validateManifest(untrusted), null, 2)}\n`;
}

export function manifestSha256(untrusted: unknown): string {
  return createHash('sha256').update(serializeManifest(untrusted)).digest('hex');
}
