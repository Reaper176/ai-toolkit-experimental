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

export const DATASET_PRESET_EXTERNAL_AUXILIARY_PATH_KEYS = [
  'mask_path',
  'control_path',
  'control_path_1',
  'control_path_2',
  'control_path_3',
  'unconditional_path',
  'inpaint_path',
  'clip_image_path',
] as const;

const EXTERNAL_PATH_KEYS = new Set([
  'folder_path',
  'dataset_path',
  ...DATASET_PRESET_EXTERNAL_AUXILIARY_PATH_KEYS,
]);
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

export function validateCaptionExtension(value: unknown, path: string): string {
  if (typeof value !== 'string' || !CAPTION_EXTENSION.test(value)) {
    throw new Error(`${path} must be a safe caption extension`);
  }
  return value;
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
  if (!Array.isArray(value.resolution) || value.resolution.length === 0) {
    throw new Error('Loader config.resolution must be a nonempty array');
  }
  const resolution = value.resolution.map((item, index) =>
    requirePositiveInteger(item, `Loader config.resolution[${index}]`),
  );
  if (!Array.isArray(value.controls)) throw new Error('Loader config.controls must be an array');
  const controls = value.controls.map((item, index) => requireText(item, `Loader config.controls[${index}]`));
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
