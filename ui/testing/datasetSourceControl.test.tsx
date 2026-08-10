import assert from 'node:assert/strict';
import React, { useState } from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import DatasetSourceControl from '../src/components/DatasetSourceControl';
import { SelectInput } from '../src/components/formInputs';
import type { DatasetConfig } from '../src/types';
import type { DatasetPresetLoaderConfig } from '../src/helpers/datasetPresetValidation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args);
};

const loaderOne: DatasetPresetLoaderConfig = {
  caption_ext: 'caption',
  default_caption: 'saved caption',
  caption_dropout_rate: 0.2,
  shuffle_tokens: true,
  num_repeats: 12,
  resolution: [768],
  is_reg: true,
  network_weight: 0.75,
  cache_latents_to_disk: true,
  flip_x: true,
  flip_y: false,
  num_frames: 9,
  shrink_video_to_frames: false,
  fps: 16,
  auto_frame_count: true,
  do_i2v: true,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: ['depth'],
};
const loaderTwo: DatasetPresetLoaderConfig = {
  ...loaderOne,
  default_caption: 'version two',
  num_repeats: 15,
  resolution: [1024],
  controls: ['pose'],
};

const initialDataset: DatasetConfig = {
  folder_path: '/datasets/live',
  mask_path: '/masks/architecture-specific',
  mask_min_value: 0.35,
  default_caption: 'live caption',
  caption_ext: 'txt',
  caption_dropout_rate: 0.05,
  shuffle_tokens: false,
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  resolution: [512],
  controls: [],
  control_path: '/controls/architecture-specific',
  num_frames: 1,
  shrink_video_to_frames: true,
  fps: 24,
  flip_x: false,
  flip_y: false,
  num_repeats: 1,
};

const activePreset = {
  id: 'preset-1',
  name: 'Faces',
  archived_at: null,
  latest_version: 2,
  version_count: 2,
  media_count: 15,
  total_bytes: '1500',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-02T00:00:00.000Z',
};
const versions = [
  {
    id: 'version-1', preset_id: 'preset-1', version: 1, source_dataset: 'my-images',
    manifest_path: 'preset-1/1/manifest.json', manifest_sha256: 'a'.repeat(64), loader_config: loaderOne,
    note: null, media_count: 12, total_bytes: '1200', created_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'version-2', preset_id: 'preset-1', version: 2, source_dataset: 'my-images',
    manifest_path: 'preset-1/2/manifest.json', manifest_sha256: 'b'.repeat(64), loader_config: loaderTwo,
    note: 'second', media_count: 15, total_bytes: '1500', created_at: '2026-08-02T00:00:00.000Z',
  },
];

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function textOf(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');
}

function button(root: ReactTestInstance, text: string): ReactTestInstance {
  const match = root.findAllByType('button').find(candidate => textOf(candidate).includes(text));
  assert.ok(match, `rendered button ${text}`);
  return match;
}

function select(root: ReactTestInstance, label: string): ReactTestInstance {
  const match = root.findAllByType(SelectInput).find(candidate => candidate.props.label === label);
  assert.ok(match, `rendered select ${label}`);
  return match;
}

async function runActivePresetBehavior(): Promise<void> {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-1') return response({ ...versions[0], manifest: {} });
    if (url === '/api/dataset-preset-versions/version-2') return response({ ...versions[1], manifest: {} });
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;

  let current = initialDataset;
  let editDataset!: (change: Partial<DatasetConfig>) => void;
  function Harness() {
    const [dataset, setDataset] = useState(initialDataset);
    current = dataset;
    editDataset = change => setDataset(previous => ({ ...previous, ...change }));
    return (
      <DatasetSourceControl
        dataset={dataset}
        liveOptions={[{ value: '/datasets/live', label: 'Live images' }]}
        onChange={setDataset}
      />
    );
  }

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
    await Promise.resolve();
  });
  assert.equal(select(renderer.root, 'Target Dataset').props.value, '/datasets/live', 'live mode owns target selector');
  await act(async () => {
    button(renderer.root, 'Live folder').props.onClick();
  });
  assert.equal(current.folder_path, '/datasets/live', 'reselecting the current live mode does not erase its folder');
  await act(async () => {
    button(renderer.root, 'Saved preset').props.onClick();
    await Promise.resolve();
  });
  const presetSelect = select(renderer.root, 'Dataset preset');
  assert.deepEqual(
    presetSelect.props.options.map((option: { value: string; label: string }) => [option.value, option.label]),
    [['preset-1', 'Faces']],
    'only active presets are listed for new selection',
  );
  await act(async () => {
    await presetSelect.props.onChange('preset-1');
  });
  const versionSelect = select(renderer.root, 'Preset version');
  assert.deepEqual(
    versionSelect.props.options.map((option: { value: string; label: string }) => option.value),
    ['version-2', 'version-1'],
    'immutable versions are selected explicitly, newest first',
  );
  await act(async () => {
    await versionSelect.props.onChange('version-1');
  });
  assert.deepEqual(current.dataset_preset, {
    version_id: 'version-1', preset_id: 'preset-1', preset_name: 'Faces', version: 1,
    manifest_sha256: 'a'.repeat(64),
  });
  for (const [key, value] of Object.entries(loaderOne)) {
    assert.deepEqual((current as unknown as Record<string, unknown>)[key], value, `saved loader key ${key} is applied`);
  }
  assert.equal(current.mask_path, initialDataset.mask_path, 'mask architecture field is untouched');
  assert.equal(current.mask_min_value, initialDataset.mask_min_value, 'mask threshold architecture field is untouched');
  assert.equal(current.control_path, initialDataset.control_path, 'control path architecture field is untouched');
  assert.equal(current.folder_path, initialDataset.folder_path, 'selecting a preset does not forge a managed path in the browser');

  await act(async () => {
    editDataset({ default_caption: 'user override', num_repeats: 21 });
  });
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(current.default_caption, 'user override', 'rerenders do not overwrite a user loader edit');
  assert.equal(current.num_repeats, 21, 'existing setting controls remain authoritative');
  await act(async () => {
    await select(renderer.root, 'Preset version').props.onChange('version-2');
  });
  assert.equal(current.default_caption, 'version two', 'changing versions intentionally applies the selected defaults');
  assert.equal(current.num_repeats, 15);

  await act(async () => {
    button(renderer.root, 'Live folder').props.onClick();
  });
  assert.equal(current.dataset_preset, undefined, 'live mode removes immutable preset metadata');
  assert.equal(current.folder_path, '', 'switching from a preset requires an explicit live folder selection');
  assert.ok(urls.includes('/api/dataset-presets'), 'active preset list is loaded from the API');
  await act(async () => renderer.unmount());
}

async function runArchivedBehavior(): Promise<void> {
  const archived = { ...activePreset, id: 'preset-old', name: 'Archived faces', archived_at: '2026-08-03T00:00:00.000Z' };
  const archivedVersion = { ...versions[0], id: 'version-old', preset_id: 'preset-old', version: 7 };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-old') return response({ ...archived, versions: [archivedVersion] });
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  const dataset: DatasetConfig = {
    ...initialDataset,
    dataset_preset: {
      version_id: 'version-old', preset_id: 'preset-old', preset_name: 'Archived faces', version: 7,
      manifest_sha256: 'a'.repeat(64),
    },
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetSourceControl dataset={dataset} liveOptions={[]} onChange={() => undefined} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.match(textOf(renderer.root), /Archived faces/);
  assert.match(textOf(renderer.root), /Version 7/);
  assert.match(textOf(renderer.root), /archived/i, 'historical metadata explains why it is read-only');
  assert.equal(select(renderer.root, 'Preset version').props.disabled, true, 'archived historical version is read-only');
  await act(async () => renderer.unmount());
}

async function main(): Promise<void> {
  await runActivePresetBehavior();
  await runArchivedBehavior();
  console.error = originalError;
  console.log('dataset source control behavior tests passed');
}

void main().catch(error => {
  console.error = originalError;
  console.error(error);
  process.exitCode = 1;
});
