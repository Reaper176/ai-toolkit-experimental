import assert from 'node:assert/strict';
import {
  DATASET_PRESET_SCHEMA_VERSION,
  applySelectionAction,
  buildDatasetPresetManifest,
  manifestSha256,
  normalizePresetName,
  normalizeRelativeMediaPath,
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
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.media_count, 1);
assert.equal(manifest.total_bytes, 9);
assert.deepEqual(validateManifest(manifest), manifest);
assert.notEqual(validateManifest(manifest), manifest);
assert.equal(manifestSha256(manifest), manifestSha256(manifest));
assert.match(manifestSha256(manifest), /^[a-f0-9]{64}$/);
assert.deepEqual(normalizePresetName('  Faces  '), { name: 'Faces', nameKey: 'faces' });
assert.equal(normalizeRelativeMediaPath('sub\\nested/a.jpg'), 'sub/nested/a.jpg');

for (const path of ['', '../a.jpg', 'a/../b.jpg', '/a.jpg', 'C:\\a.jpg', 'a\0b.jpg']) {
  expectThrows(() => normalizeRelativeMediaPath(path), /path/i);
}

expectThrows(() => validateLoaderConfig({ ...loaderConfig, mask_path: '/outside' }), /mask_path|external/i);
expectThrows(() => validateLoaderConfig({ ...loaderConfig, future_option: true }), /unknown|key/i);

const source = new Set(['a', 'b']);
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'all'), new Set(['a', 'b', 'c']));
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'none'), new Set());
assert.deepEqual(applySelectionAction(source, ['a', 'b', 'c'], 'invert'), new Set(['c']));
assert.deepEqual(source, new Set(['a', 'b']));
