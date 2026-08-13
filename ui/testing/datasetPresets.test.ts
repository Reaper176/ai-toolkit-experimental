import assert from 'node:assert/strict';
import {
  DATASET_PRESET_SCHEMA_VERSION,
  applySelectionAction,
  buildDatasetPresetManifest,
  manifestSha256,
  normalizePresetName,
  normalizeRelativeMediaPath,
  isSupportedDatasetMediaPath,
  serializeManifest,
  validateLoaderConfig,
  validateManifest,
} from '../src/helpers/datasetPresets';

function expectThrows(value: () => unknown, pattern: RegExp): void {
  assert.throws(value, pattern);
}

const loaderConfig = {
  caption_ext: 'txt',
  default_caption: '',
  caption_dropout_rate: 0.05,
  shuffle_tokens: false,
  num_repeats: 1,
  resolution: [512, 768, 1024],
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  flip_x: false,
  flip_y: false,
  num_frames: 1,
  shrink_video_to_frames: true,
  fps: 24,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  mask_min_value: 0.25,
  invert_mask: true,
  controls: [],
};

const manifest = buildDatasetPresetManifest({
  preset_id: 'preset-1',
  version: 1,
  preset_name: 'Faces',
  source_dataset: 'my-images',
  created_at: '2026-01-02T03:04:05.000Z',
  note: null,
  loader_config: loaderConfig,
  files: [
    {
      source_path: 'sub/a.jpg',
      managed_path: 'media/sub/a.jpg',
      media_bytes: 3,
      media_sha256: 'a'.repeat(64),
      caption_ext: 'txt',
      caption_text: 'person',
      caption_bytes: 6,
      caption_sha256: 'b'.repeat(64),
      caption_missing: false,
    },
  ],
});

assert.equal(DATASET_PRESET_SCHEMA_VERSION, 1);
for (const path of ['image.JPG', 'video.Mp4', 'audio.FLAC', 'nested/a.webp']) {
  assert.equal(isSupportedDatasetMediaPath(path), true, `${path} is supported by dataset listing and publication`);
}
for (const path of ['README', 'caption.txt', 'archive.zip', 'sidecar.json']) {
  assert.equal(isSupportedDatasetMediaPath(path), false, `${path} is not publishable media`);
}
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.media_count, 1);
assert.equal(manifest.total_bytes, 9);
assert.deepEqual(validateManifest(manifest), manifest);
assert.notEqual(validateManifest(manifest), manifest);
assert.equal(manifestSha256(manifest), manifestSha256(manifest));
assert.match(manifestSha256(manifest), /^[a-f0-9]{64}$/);
assert.deepEqual(
  validateLoaderConfig(Object.fromEntries(Object.entries(loaderConfig).filter(([key]) => !['mask_min_value', 'invert_mask'].includes(key)))),
  { ...loaderConfig, mask_min_value: 0.1, invert_mask: false },
  'legacy loader configs receive stable mask defaults',
);
for (const maskMinValue of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
  expectThrows(() => validateLoaderConfig({ ...loaderConfig, mask_min_value: maskMinValue }), /mask_min_value/i);
}
expectThrows(() => validateLoaderConfig({ ...loaderConfig, invert_mask: 'false' }), /invert_mask/i);
expectThrows(() => validateLoaderConfig({ ...loaderConfig, mask_min_value: null }), /mask_min_value/i);
expectThrows(() => validateLoaderConfig({ ...loaderConfig, invert_mask: null }), /invert_mask/i);
assert.equal(
  serializeManifest(manifest),
  `{
  "schema_version": 1,
  "preset_id": "preset-1",
  "version": 1,
  "preset_name": "Faces",
  "source_dataset": "my-images",
  "created_at": "2026-01-02T03:04:05.000Z",
  "note": null,
  "loader_config": {
    "caption_ext": "txt",
    "default_caption": "",
    "caption_dropout_rate": 0.05,
    "shuffle_tokens": false,
    "num_repeats": 1,
    "resolution": [
      512,
      768,
      1024
    ],
    "is_reg": false,
    "network_weight": 1,
    "cache_latents_to_disk": false,
    "flip_x": false,
    "flip_y": false,
    "num_frames": 1,
    "shrink_video_to_frames": true,
    "fps": 24,
    "auto_frame_count": false,
    "do_i2v": false,
    "do_audio": false,
    "audio_normalize": false,
    "audio_preserve_pitch": false,
    "mask_min_value": 0.25,
    "invert_mask": true,
    "controls": []
  },
  "media_count": 1,
  "total_bytes": 9,
  "files": [
    {
      "source_path": "sub/a.jpg",
      "managed_path": "media/sub/a.jpg",
      "media_bytes": 3,
      "media_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "caption_ext": "txt",
      "caption_text": "person",
      "caption_bytes": 6,
      "caption_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "caption_missing": false
    }
  ]
}
`,
);
assert.equal(manifestSha256(manifest), '463b4c9c54c0b6793fa91522d582834bb7514292094a99bc0a6d9e1628dbca58');

const { schema_version: _schemaVersion, media_count: _mediaCount, total_bytes: _totalBytes, ...manifestInput } = manifest;
expectThrows(() => buildDatasetPresetManifest({ ...manifestInput, files: [] }), /files|media_count/i);
expectThrows(
  () => validateManifest({ ...manifest, files: [], media_count: 0, total_bytes: 0 }),
  /files|media_count/i,
);
for (const timestamp of ['2026-01-02', 'January 2, 2026', '2026-01-02T03:04:05+01:00', '2026-02-30T03:04:05.000Z']) {
  expectThrows(() => validateManifest({ ...manifest, created_at: timestamp }), /created_at|ISO/i);
}
assert.equal(validateManifest(manifest).created_at, '2026-01-02T03:04:05.000Z');

const maxIntegers = validateLoaderConfig({
  ...loaderConfig,
  num_repeats: Number.MAX_SAFE_INTEGER,
  resolution: [Number.MAX_SAFE_INTEGER],
  num_frames: Number.MAX_SAFE_INTEGER,
  fps: Number.MAX_SAFE_INTEGER,
});
assert.equal(maxIntegers.fps, Number.MAX_SAFE_INTEGER);
assert.equal(buildDatasetPresetManifest({ ...manifestInput, version: Number.MAX_SAFE_INTEGER }).version, Number.MAX_SAFE_INTEGER);
for (const [key, invalid] of [
  ['num_repeats', { ...loaderConfig, num_repeats: Number.MAX_SAFE_INTEGER + 1 }],
  ['resolution', { ...loaderConfig, resolution: [Number.MAX_SAFE_INTEGER + 1] }],
  ['num_frames', { ...loaderConfig, num_frames: Number.MAX_SAFE_INTEGER + 1 }],
  ['fps', { ...loaderConfig, fps: Number.MAX_SAFE_INTEGER + 1 }],
] as const) {
  expectThrows(() => validateLoaderConfig(invalid), new RegExp(key));
}
expectThrows(() => validateManifest({ ...manifest, version: Number.MAX_SAFE_INTEGER + 1 }), /version/i);

assert.deepEqual(normalizePresetName('  Faces  '), { name: 'Faces', nameKey: 'faces' });
assert.equal(normalizeRelativeMediaPath('sub\\nested/a.jpg'), 'sub/nested/a.jpg');

for (const path of [
  '',
  '../a.jpg',
  'a/../b.jpg',
  '/a.jpg',
  'C:\\a.jpg',
  'a\0b.jpg',
  'a:b.jpg',
  'a?.jpg',
  'a*.jpg',
  'a|b.jpg',
  'a"b.jpg',
  '<a>.jpg',
  'a\u0001b.jpg',
  'CON',
  'aux.txt',
  'LPT9.json',
  'folder/name. ',
  'folder/name.',
]) {
  expectThrows(() => normalizeRelativeMediaPath(path), /path|segment/i);
}
assert.equal(normalizeRelativeMediaPath('space folder/üñïçødé file.jpg'), 'space folder/üñïçødé file.jpg');

expectThrows(() => validateLoaderConfig({ ...loaderConfig, mask_path: '/outside' }), /mask_path|external/i);
expectThrows(() => validateLoaderConfig({ ...loaderConfig, future_option: true }), /unknown|key/i);
for (const extension of ['txt', '.txt', 'json', 'caption', 'A_1-z']) {
  assert.equal(validateLoaderConfig({ ...loaderConfig, caption_ext: extension }).caption_ext, extension);
}
for (const extension of ['', 'two words', 'a/b', 'a:b', '\0', '..txt', '.txt.', '../txt']) {
  expectThrows(() => validateLoaderConfig({ ...loaderConfig, caption_ext: extension }), /caption_ext/i);
  expectThrows(
    () => buildDatasetPresetManifest({ ...manifestInput, files: [{ ...manifest.files[0], caption_ext: extension }] }),
    /caption_ext/i,
  );
}

const secondFile = {
  ...manifest.files[0],
  source_path: 'z.jpg',
  managed_path: 'media/z.jpg',
  media_sha256: 'c'.repeat(64),
  caption_text: null,
  caption_bytes: null,
  caption_sha256: null,
  caption_missing: true,
};

const maskedManifest = buildDatasetPresetManifest({
  ...manifestInput,
  files: [{
    ...manifest.files[0],
    mask_path: 'masks/a.png',
    mask_bytes: 12,
    mask_sha256: 'd'.repeat(64),
    mask_missing: false,
  }],
});
assert.equal(maskedManifest.files[0].mask_path, 'masks/a.png');
assert.equal(maskedManifest.total_bytes, 21, 'manifest byte totals include frozen masks');
assert.deepEqual(validateManifest(manifest), manifest, 'legacy manifests without mask metadata remain valid');
const missingMaskManifest = buildDatasetPresetManifest({
  ...manifestInput,
  files: [{
    ...manifest.files[0],
    mask_path: null,
    mask_bytes: null,
    mask_sha256: null,
    mask_missing: true,
  }],
});
assert.equal(missingMaskManifest.files[0].mask_missing, true);
for (const invalidFile of [
  { ...manifest.files[0], mask_path: 'masks/a.png' },
  { ...manifest.files[0], mask_path: '../masks/a.png', mask_bytes: 1, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/sub/a.png', mask_bytes: 1, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/a.jpg', mask_bytes: 1, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/b.png', mask_bytes: 1, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/A.png', mask_bytes: 1, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/a.png', mask_bytes: 0, mask_sha256: 'd'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: 'masks/a.png', mask_bytes: 1, mask_sha256: 'D'.repeat(64), mask_missing: false },
  { ...manifest.files[0], mask_path: null, mask_bytes: 1, mask_sha256: null, mask_missing: true },
  { ...manifest.files[0], mask_path: null, mask_bytes: null, mask_sha256: null, mask_missing: 'true' },
]) {
  expectThrows(() => buildDatasetPresetManifest({ ...manifestInput, files: [invalidFile as never] }), /mask/i);
}
const sortedFiles = buildDatasetPresetManifest({ ...manifestInput, files: [manifest.files[0], secondFile] });
const unsortedFiles = buildDatasetPresetManifest({ ...manifestInput, files: [secondFile, manifest.files[0]] });
assert.equal(serializeManifest(sortedFiles), serializeManifest(unsortedFiles));
assert.equal(manifestSha256(sortedFiles), manifestSha256(unsortedFiles));
const reorderedObject = validateManifest({
  files: manifest.files,
  total_bytes: manifest.total_bytes,
  media_count: manifest.media_count,
  loader_config: manifest.loader_config,
  note: manifest.note,
  created_at: manifest.created_at,
  source_dataset: manifest.source_dataset,
  preset_name: manifest.preset_name,
  version: manifest.version,
  preset_id: manifest.preset_id,
  schema_version: manifest.schema_version,
});
assert.equal(serializeManifest(reorderedObject), serializeManifest(manifest));
expectThrows(() => validateManifest({ ...manifest, unknown_key: true }), /unknown|key/i);
const { note: _note, ...missingNote } = manifest;
expectThrows(() => validateManifest(missingNote), /note|required/i);

expectThrows(
  () => buildDatasetPresetManifest({
    ...manifestInput,
    files: [manifest.files[0], { ...manifest.files[0], source_path: 'sub/a.jpg', managed_path: 'media/other.jpg' }],
  }),
  /unique|collision/i,
);
expectThrows(
  () => buildDatasetPresetManifest({
    ...manifestInput,
    files: [manifest.files[0], { ...manifest.files[0], source_path: 'sub/B.jpg', managed_path: 'media/sub/A.jpg' }],
  }),
  /unique|collision/i,
);
expectThrows(
  () => buildDatasetPresetManifest({
    ...manifestInput,
    files: [manifest.files[0], { ...manifest.files[0], source_path: 'SUB/A.JPG', managed_path: 'media/sub/other.jpg' }],
  }),
  /unique|collision/i,
);

const zeroByte = buildDatasetPresetManifest({
  ...manifestInput,
  files: [
    {
      ...manifest.files[0],
      media_bytes: 0,
      caption_text: null,
      caption_bytes: null,
      caption_sha256: null,
      caption_missing: true,
    },
  ],
});
assert.equal(zeroByte.total_bytes, 0);

const mutableInput = structuredClone({ ...manifestInput, loader_config: { ...loaderConfig, controls: ['pose'] } });
const builtCopy = buildDatasetPresetManifest(mutableInput);
builtCopy.loader_config.resolution[0] = 1;
builtCopy.loader_config.controls[0] = 'changed';
builtCopy.files[0].source_path = 'changed.jpg';
builtCopy.files[0].caption_text = 'changed';
assert.equal(mutableInput.loader_config.resolution[0], 512);
assert.equal(mutableInput.loader_config.controls[0], 'pose');
assert.equal(mutableInput.files[0].source_path, 'sub/a.jpg');
assert.equal(mutableInput.files[0].caption_text, 'person');
const firstValidated = validateManifest(manifest);
const secondValidated = validateManifest(manifest);
firstValidated.loader_config.resolution[0] = 1;
firstValidated.loader_config.controls.push('mutated');
firstValidated.files[0].managed_path = 'changed.jpg';
assert.equal(secondValidated.loader_config.resolution[0], 512);
assert.deepEqual(secondValidated.loader_config.controls, []);
assert.equal(secondValidated.files[0].managed_path, 'media/sub/a.jpg');

const source = new Set(['a', 'b']);
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'all'), new Set(['a', 'b', 'c']));
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'none'), new Set());
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'invert'), new Set(['c']));
assert.deepEqual(source, new Set(['a', 'b']));
const selectedAll = applySelectionAction(source, ['a', 'b', 'c'], 'all');
selectedAll.delete('a');
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'all'), new Set(['a', 'b', 'c']));
