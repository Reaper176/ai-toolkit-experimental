import { normalizeRelativeMediaPath } from './datasetSelection';

export { applySelectionAction, normalizeRelativeMediaPath, type SelectionAction } from './datasetSelection';

export const DATASET_PRESET_SCHEMA_VERSION = 1 as const;
export const DATASET_PRESET_NAME_MAX = 80;
export const DATASET_PRESET_NOTE_MAX = 500;
export const LOADER_CONFIG_KEYS = [
  'caption_ext',
  'default_caption',
  'caption_dropout_rate',
  'shuffle_tokens',
  'num_repeats',
  'resolution',
  'is_reg',
  'network_weight',
  'cache_latents_to_disk',
  'flip_x',
  'flip_y',
  'num_frames',
  'shrink_video_to_frames',
  'fps',
  'auto_frame_count',
  'do_i2v',
  'do_audio',
  'audio_normalize',
  'audio_preserve_pitch',
  'controls',
] as const;

export interface DatasetPresetLoaderConfig {
  caption_ext: string;
  default_caption: string;
  caption_dropout_rate: number;
  shuffle_tokens: boolean;
  num_repeats: number;
  resolution: number[];
  is_reg: boolean;
  network_weight: number;
  cache_latents_to_disk: boolean;
  flip_x: boolean;
  flip_y: boolean;
  num_frames: number;
  shrink_video_to_frames: boolean;
  fps: number;
  auto_frame_count: boolean;
  do_i2v: boolean;
  do_audio: boolean;
  audio_normalize: boolean;
  audio_preserve_pitch: boolean;
  controls: string[];
}

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
const CAPTION_EXTENSION = /^\.?[A-Za-z0-9_-]{1,32}$/;

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
    if (EXTERNAL_PATH_KEYS.has(key)) throw new Error(`${path}.${key} is an external path and is not allowed`);
    if (!allowed.has(key)) throw new Error(`${path} contains unknown key ${key}`);
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

function validateCaptionExtension(value: unknown, path: string): string {
  if (typeof value !== 'string' || !CAPTION_EXTENSION.test(value)) {
    throw new Error(`${path} must be a safe caption extension`);
  }
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

export function normalizePresetName(input: unknown): { name: string; nameKey: string } {
  if (typeof input !== 'string') throw new Error('Preset name must be a string');
  const name = input.trim();
  if (name.length === 0) throw new Error('Preset name is required');
  if (name.length > DATASET_PRESET_NAME_MAX) {
    throw new Error(`Preset name must be at most ${DATASET_PRESET_NAME_MAX} characters`);
  }
  return { name, nameKey: name.toLowerCase() };
}

export function validateLoaderConfig(untrusted: unknown): DatasetPresetLoaderConfig {
  const value = requirePlainObject(untrusted, 'Loader config');
  requireExactKeys(value, LOADER_CONFIG_KEYS, 'Loader config');
  const captionExt = validateCaptionExtension(value.caption_ext, 'Loader config.caption_ext');
  const defaultCaption = requireText(value.default_caption, 'Loader config.default_caption', true);
  const captionDropoutRate = requireFiniteNumber(value.caption_dropout_rate, 'Loader config.caption_dropout_rate');
  if (captionDropoutRate < 0 || captionDropoutRate > 1) {
    throw new Error('Loader config.caption_dropout_rate must be between 0 and 1');
  }
  const resolutionInput = value.resolution;
  if (!Array.isArray(resolutionInput) || resolutionInput.length === 0) {
    throw new Error('Loader config.resolution must be a nonempty array');
  }
  const resolution = resolutionInput.map((item, index) =>
    requirePositiveInteger(item, `Loader config.resolution[${index}]`),
  );
  const controlsInput = value.controls;
  if (!Array.isArray(controlsInput)) throw new Error('Loader config.controls must be an array');
  const controls = controlsInput.map((item, index) => requireText(item, `Loader config.controls[${index}]`));

  return {
    caption_ext: captionExt,
    default_caption: defaultCaption,
    caption_dropout_rate: captionDropoutRate,
    shuffle_tokens: requireBoolean(value.shuffle_tokens, 'Loader config.shuffle_tokens'),
    num_repeats: requirePositiveInteger(value.num_repeats, 'Loader config.num_repeats'),
    resolution,
    is_reg: requireBoolean(value.is_reg, 'Loader config.is_reg'),
    network_weight: requireFiniteNumber(value.network_weight, 'Loader config.network_weight'),
    cache_latents_to_disk: requireBoolean(value.cache_latents_to_disk, 'Loader config.cache_latents_to_disk'),
    flip_x: requireBoolean(value.flip_x, 'Loader config.flip_x'),
    flip_y: requireBoolean(value.flip_y, 'Loader config.flip_y'),
    num_frames: requirePositiveInteger(value.num_frames, 'Loader config.num_frames'),
    shrink_video_to_frames: requireBoolean(value.shrink_video_to_frames, 'Loader config.shrink_video_to_frames'),
    fps: requirePositiveInteger(value.fps, 'Loader config.fps'),
    auto_frame_count: requireBoolean(value.auto_frame_count, 'Loader config.auto_frame_count'),
    do_i2v: requireBoolean(value.do_i2v, 'Loader config.do_i2v'),
    do_audio: requireBoolean(value.do_audio, 'Loader config.do_audio'),
    audio_normalize: requireBoolean(value.audio_normalize, 'Loader config.audio_normalize'),
    audio_preserve_pitch: requireBoolean(value.audio_preserve_pitch, 'Loader config.audio_preserve_pitch'),
    controls,
  };
}

function validateFile(untrusted: unknown, path: string): DatasetPresetManifestFile {
  const value = requirePlainObject(untrusted, path);
  requireExactKeys(
    value,
    [
      'source_path',
      'managed_path',
      'media_bytes',
      'media_sha256',
      'caption_ext',
      'caption_text',
      'caption_bytes',
      'caption_sha256',
      'caption_missing',
    ],
    path,
  );
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
  return {
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
  const derivedBytes = files.reduce((total, file) => total + file.media_bytes + (file.caption_bytes ?? 0), 0);
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
    total_bytes: files.reduce((total, file) => total + file.media_bytes + (file.caption_bytes ?? 0), 0),
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
  const crypto = process.getBuiltinModule('node:crypto');
  if (!crypto) throw new Error('Node crypto module is unavailable');
  return crypto.createHash('sha256').update(serializeManifest(untrusted)).digest('hex');
}
