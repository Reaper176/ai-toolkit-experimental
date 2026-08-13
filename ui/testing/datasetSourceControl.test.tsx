import assert from 'node:assert/strict';
import React, { useEffect, useState } from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import DatasetSourceControl from '../src/components/DatasetSourceControl';
import { SelectInput } from '../src/components/formInputs';
import type { DatasetConfig } from '../src/types';
import type { DatasetPresetLoaderConfig } from '../src/helpers/datasetPresetValidation';
import {
  canSaveTrainingJob,
  hasMissingDatasetSource,
  removeArchivedPresetSourcesFromClone,
} from '../src/helpers/jobDatasetPresetClient';
import type { JobConfig } from '../src/types';
import useDatasetPresets, { type UseDatasetPresetsResult } from '../src/hooks/useDatasetPresets';
import { TrainingPresetControl } from '../src/components/TrainingPresetControl';
import { sanitizeTrainingPreset, type TrainingPresetRecord } from '../src/helpers/trainingPresets';
import {
  PRESET_ACTION_UNDO,
  presetValue,
  type TrainingPresetApi,
} from '../src/components/TrainingPresetSelect';

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
  mask_min_value: 0.1,
  invert_mask: false,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

  let current: DatasetConfig = initialDataset;
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
  assert.equal(current.folder_path, '', 'entering preset mode clears the live source until a version is selected');
  assert.equal(hasMissingDatasetSource({ config: { process: [{ datasets: [current] }] } } as JobConfig), true);
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
  assert.equal(current.mask_min_value, loaderOne.mask_min_value, 'saved mask threshold is applied');
  assert.equal(current.control_path, initialDataset.control_path, 'control path architecture field is untouched');
  assert.equal(current.folder_path, '', 'selecting a preset does not forge a managed path in the browser');

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

async function runPendingVersionSafetyBehavior(): Promise<void> {
  const versionOneResponse = deferred<Response>();
  const versionTwoResponse = deferred<Response>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-1') return versionOneResponse.promise;
    if (url === '/api/dataset-preset-versions/version-2') return versionTwoResponse.promise;
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;

  let current: DatasetConfig = initialDataset;
  let editDataset!: (change: Partial<DatasetConfig>) => void;
  function Harness() {
    const [dataset, setDataset] = useState(initialDataset);
    current = dataset;
    editDataset = change => setDataset(previous => ({ ...previous, ...change }));
    return <DatasetSourceControl dataset={dataset} liveOptions={[]} onChange={setDataset} />;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
    await Promise.resolve();
  });
  await act(async () => {
    button(renderer.root, 'Saved preset').props.onClick();
  });
  await act(async () => {
    await select(renderer.root, 'Dataset preset').props.onChange('preset-1');
  });
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-1');
    await Promise.resolve();
  });
  await act(async () => {
    editDataset({
      mask_path: '/masks/edited-while-pending',
      control_path: '/controls/edited-while-pending',
      default_caption: 'allowlisted edit while pending',
    });
  });
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-2');
    await Promise.resolve();
  });
  await act(async () => {
    versionOneResponse.resolve(response({ ...versions[0], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(current.dataset_preset, undefined, 'a stale version response cannot update the dataset');
  assert.equal(current.mask_path, '/masks/edited-while-pending');
  await act(async () => {
    versionTwoResponse.resolve(response({ ...versions[1], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal((current as DatasetConfig).dataset_preset?.version_id, 'version-2', 'the latest explicit version wins');
  assert.equal(current.mask_path, '/masks/edited-while-pending', 'latest architecture edits survive async resolution');
  assert.equal(current.control_path, '/controls/edited-while-pending', 'non-loader fields are merged from latest state');
  assert.equal(
    current.default_caption,
    loaderTwo.default_caption,
    'the selected version intentionally replaces allowlisted loader edits',
  );
  await act(async () => renderer.unmount());

  const unmountVersionResponse = deferred<Response>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-1') return unmountVersionResponse.promise;
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  let changes = 0;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetSourceControl dataset={initialDataset} liveOptions={[]} onChange={() => { changes += 1; }} />,
    );
    await Promise.resolve();
  });
  await act(async () => {
    button(renderer.root, 'Saved preset').props.onClick();
  });
  await act(async () => {
    await select(renderer.root, 'Dataset preset').props.onChange('preset-1');
  });
  const changesBeforePendingVersion = changes;
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-1');
    await Promise.resolve();
    renderer.unmount();
  });
  await act(async () => {
    unmountVersionResponse.resolve(response({ ...versions[0], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(changes, changesBeforePendingVersion, 'a version response after unmount cannot call onChange');
}

async function runExternalReplacementSafetyBehavior(): Promise<void> {
  const pendingVersion = deferred<Response>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-1') return pendingVersion.promise;
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  let current: DatasetConfig = initialDataset;
  let replaceDataset!: (next: DatasetConfig) => void;
  function Harness() {
    const [dataset, setDataset] = useState(initialDataset);
    current = dataset;
    replaceDataset = setDataset;
    return <DatasetSourceControl dataset={dataset} liveOptions={[{ value: '/external-live', label: 'External' }]} onChange={setDataset} />;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
    await Promise.resolve();
  });
  await act(async () => button(renderer.root, 'Saved preset').props.onClick());
  await act(async () => select(renderer.root, 'Dataset preset').props.onChange('preset-1'));
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-1');
    await Promise.resolve();
  });
  await act(async () => {
    replaceDataset({ ...initialDataset, folder_path: '/external-live', control_path: '/external-control' });
  });
  assert.equal(select(renderer.root, 'Target Dataset').props.value, '/external-live', 'external live replacement resynchronizes mode');
  await act(async () => {
    pendingVersion.resolve(response({ ...versions[0], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(current.folder_path, '/external-live', 'stale version cannot apply to a reused component instance');
  assert.equal(current.control_path, '/external-control');
  assert.equal(current.dataset_preset, undefined);

  const externalPresetDataset: DatasetConfig = {
    ...initialDataset,
    folder_path: '/managed/external',
    dataset_preset: {
      version_id: 'version-2', preset_id: 'preset-1', preset_name: 'Faces', version: 2,
      manifest_sha256: 'b'.repeat(64),
    },
  };
  await act(async () => {
    replaceDataset(externalPresetDataset);
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(button(renderer.root, 'Saved preset').props['aria-pressed'], true, 'external preset replacement hydrates preset mode');
  assert.equal(select(renderer.root, 'Preset version').props.value, 'version-2');
  await act(async () => renderer.unmount());
}

async function runPresetIdentitySwitchBehavior(): Promise<void> {
  const presetTwo = { ...activePreset, id: 'preset-2', name: 'Products', latest_version: 1, version_count: 1 };
  const versionTwoPreset = {
    ...versions[0],
    id: 'preset-2-version-1',
    preset_id: 'preset-2',
    version: 1,
    manifest_sha256: 'd'.repeat(64),
    loader_config: loaderTwo,
  };
  let versionFetches = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset, presetTwo] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-presets/preset-2') return response({ ...presetTwo, versions: [versionTwoPreset] });
    if (url === '/api/dataset-preset-versions/preset-2-version-1') {
      versionFetches += 1;
      return response({ ...versionTwoPreset, manifest: {} });
    }
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  const presetOneDataset: DatasetConfig = {
    ...initialDataset,
    folder_path: '',
    dataset_preset: {
      version_id: 'version-1', preset_id: 'preset-1', preset_name: 'Faces', version: 1,
      manifest_sha256: 'a'.repeat(64),
    },
  };
  let current: DatasetConfig = presetOneDataset;
  function Harness() {
    const [dataset, setDataset] = useState(presetOneDataset);
    current = dataset;
    return <DatasetSourceControl dataset={dataset} liveOptions={[]} onChange={setDataset} />;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(current.dataset_preset?.preset_id, 'preset-1');
  await act(async () => {
    await select(renderer.root, 'Dataset preset').props.onChange('preset-2');
  });
  assert.equal(current.dataset_preset, undefined, 'choosing preset B immediately removes preset A provenance');
  assert.equal(current.folder_path, '', 'preset B remains pending until an explicit version is selected');
  assert.equal(
    canSaveTrainingJob(true, { config: { process: [{ datasets: [current] }] } } as JobConfig),
    false,
    'the pending B source cannot be saved using stale A metadata',
  );
  await act(async () => {
    await select(renderer.root, 'Preset version').props.onChange('preset-2-version-1');
  });
  assert.equal((current as DatasetConfig).dataset_preset?.preset_id, 'preset-2');
  assert.equal(canSaveTrainingJob(true, { config: { process: [{ datasets: [current] }] } } as JobConfig), true);
  const committed = current;
  await act(async () => {
    await select(renderer.root, 'Dataset preset').props.onChange('preset-2');
    await select(renderer.root, 'Preset version').props.onChange('preset-2-version-1');
  });
  assert.equal(current, committed, 'reselecting the committed preset and version is idempotent');
  assert.equal(versionFetches, 1, 'idempotent version reselect does not refetch or reapply');
  await act(async () => renderer.unmount());
}

async function runInstanceIdentitySafetyBehavior(): Promise<void> {
  const pendingReplacementVersion = deferred<Response>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-2') return pendingReplacementVersion.promise;
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  const sharedSource: DatasetConfig = {
    ...initialDataset,
    folder_path: '',
    dataset_preset: {
      version_id: 'version-1', preset_id: 'preset-1', preset_name: 'Faces', version: 1,
      manifest_sha256: 'a'.repeat(64),
    },
  };
  let replacementChanges = 0;
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetSourceControl
        dataset={{ ...sharedSource, mask_min_value: 0.1 }}
        liveOptions={[]}
        instanceToken="block-a"
        onChange={() => { replacementChanges += 1; }}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-2');
    await Promise.resolve();
  });
  await act(async () => {
    renderer.update(
      <DatasetSourceControl
        dataset={{ ...sharedSource, mask_min_value: 0.9 }}
        liveOptions={[]}
        instanceToken="block-b"
        onChange={() => { replacementChanges += 1; }}
      />,
    );
  });
  await act(async () => {
    pendingReplacementVersion.resolve(response({ ...versions[1], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(replacementChanges, 0, 'same-source whole-instance replacement cancels stale version work');
  assert.equal(select(renderer.root, 'Preset version').props.value, 'version-1');
  await act(async () => renderer.unmount());

  const removedBlockVersion = deferred<Response>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-2') return removedBlockVersion.promise;
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  const secondDataset = { ...sharedSource, mask_min_value: 0.8 };
  let secondChanges = 0;
  let removeFirst!: () => void;
  function BlocksHarness() {
    const [blocks, setBlocks] = useState([
      { id: 'first', dataset: { ...sharedSource, mask_min_value: 0.2 } },
      { id: 'second', dataset: secondDataset },
    ]);
    removeFirst = () => setBlocks(previous => previous.slice(1));
    return <>{blocks.map(block => (
      <DatasetSourceControl
        key={block.id}
        instanceToken={block.id}
        dataset={block.dataset}
        liveOptions={[]}
        onChange={() => { if (block.id === 'second') secondChanges += 1; }}
      />
    ))}</>;
  }
  await act(async () => {
    renderer = TestRenderer.create(<BlocksHarness />);
    await Promise.resolve();
    await Promise.resolve();
  });
  const firstControl = renderer.root.findAllByType(DatasetSourceControl)[0];
  await act(async () => {
    void select(firstControl, 'Preset version').props.onChange('version-2');
    await Promise.resolve();
  });
  await act(async () => removeFirst());
  assert.equal(renderer.root.findAllByType(DatasetSourceControl)[0].props.instanceToken, 'second');
  await act(async () => {
    removedBlockVersion.resolve(response({ ...versions[1], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(secondChanges, 0, 'removed identical-source block response cannot mutate the shifted block');
  await act(async () => renderer.unmount());
}

async function runTrainingPresetReplacementBehavior(): Promise<void> {
  const firstPendingVersion = deferred<Response>();
  const undoPendingVersion = deferred<Response>();
  let versionRequest = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/dataset-presets') return response({ presets: [activePreset] });
    if (url === '/api/dataset-presets/preset-1') return response({ ...activePreset, versions });
    if (url === '/api/dataset-preset-versions/version-2') {
      versionRequest += 1;
      return versionRequest === 1 ? firstPendingVersion.promise : undoPendingVersion.promise;
    }
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;
  const dataset: DatasetConfig = {
    ...initialDataset,
    folder_path: '',
    mask_min_value: 0.42,
    dataset_preset: {
      version_id: 'version-1', preset_id: 'preset-1', preset_name: 'Faces', version: 1,
      manifest_sha256: 'a'.repeat(64),
    },
  };
  const job = (steps: number): JobConfig => ({
    job: 'extension',
    config: {
      name: 'job',
      process: [{
        type: 'diffusion_trainer', training_folder: '/output', device: 'cuda', trigger_word: null,
        datasets: [dataset], train: { steps }, save: {}, model: { name_or_path: 'model' }, sample: { samples: [] },
      }],
    },
    meta: { name: '[name]', version: '1' },
  } as unknown as JobConfig);
  const trainingPreset: TrainingPresetRecord = {
    id: 'training-preset', name: 'Training defaults', schema_version: 1,
    snapshot: sanitizeTrainingPreset(job(200)),
    created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z',
  };
  const trainingApi: TrainingPresetApi = {
    get: async () => ({ data: { presets: [trainingPreset] } }),
    post: async () => { throw new Error('unexpected POST'); },
    put: async () => { throw new Error('unexpected PUT'); },
    delete: async () => { throw new Error('unexpected DELETE'); },
  };
  let currentJob = job(100);
  let datasetGeneration = 0;
  let editOrdinaryField!: () => void;
  function Harness() {
    const [jobConfig, setJobConfig] = useState(job(100));
    const [generation, setGeneration] = useState(0);
    currentJob = jobConfig;
    datasetGeneration = generation;
    editOrdinaryField = () => setJobConfig(previous => ({
      ...previous,
      config: {
        ...previous.config,
        process: [{
          ...previous.config.process[0],
          datasets: [{ ...previous.config.process[0].datasets[0], mask_min_value: 0.43 }],
        }],
      },
    }));
    const replaceWholeConfig = (next: JobConfig) => {
      setJobConfig(next);
      setGeneration(value => value + 1);
    };
    return <>
      <TrainingPresetControl
        jobConfig={jobConfig}
        onJobConfigChange={replaceWholeConfig}
        migrateJobConfig={value => value}
        dependencies={{ api: trainingApi, Dialog: () => null }}
      />
      <DatasetSourceControl
        dataset={jobConfig.config.process[0].datasets[0]}
        liveOptions={[]}
        instanceToken={`training-replacement-${generation}`}
        onChange={next => setJobConfig(previous => ({
          ...previous,
          config: {
            ...previous.config,
            process: [{ ...previous.config.process[0], datasets: [next] }],
          },
        }))}
      />
    </>;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => editOrdinaryField());
  assert.equal(datasetGeneration, 0, 'ordinary field edits do not advance dataset-source generation');
  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-2');
    await Promise.resolve();
  });
  await act(async () => {
    renderer.root.findByProps({ 'aria-label': 'Training preset' }).props.onChange({
      currentTarget: { value: presetValue(trainingPreset.id) },
    });
  });
  assert.equal(datasetGeneration, 1, 'training preset apply advances only dataset-source generation');
  assert.equal(currentJob.config.process[0].train.steps, 200);
  await act(async () => {
    firstPendingVersion.resolve(response({ ...versions[1], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(currentJob.config.process[0].datasets[0].dataset_preset?.version_id, 'version-1');
  assert.equal(currentJob.config.process[0].datasets[0].mask_min_value, 0.43, 'stale apply request cannot overwrite protected overrides');

  await act(async () => {
    void select(renderer.root, 'Preset version').props.onChange('version-2');
    await Promise.resolve();
  });
  await act(async () => {
    renderer.root.findByProps({ 'aria-label': 'Training preset' }).props.onChange({
      currentTarget: { value: PRESET_ACTION_UNDO },
    });
  });
  assert.equal(datasetGeneration, 2, 'training preset undo advances dataset-source generation');
  assert.equal(currentJob.config.process[0].train.steps, 100, 'controller retains undo state across source invalidation');
  await act(async () => {
    undoPendingVersion.resolve(response({ ...versions[1], manifest: {} }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(currentJob.config.process[0].datasets[0].dataset_preset?.version_id, 'version-1');
  assert.equal(currentJob.config.process[0].datasets[0].mask_min_value, 0.43);
  await act(async () => renderer.unmount());
}

async function runSharedListBehavior(): Promise<void> {
  const listResponse = deferred<Response>();
  let fetchCount = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.equal(String(input), '/api/dataset-presets');
    fetchCount += 1;
    return fetchCount === 1 ? listResponse.promise : response({ presets: [activePreset] });
  }) as typeof fetch;
  const results: UseDatasetPresetsResult[] = [];
  function Probe({ index }: { index: number }) {
    const result = useDatasetPresets();
    results[index] = result;
    useEffect(() => {
      void result.refresh().catch(() => undefined);
    }, [result.refresh]);
    return <span>{result.status}</span>;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<><Probe index={0} /><Probe index={1} /></>);
    await Promise.resolve();
  });
  assert.equal(fetchCount, 1, 'concurrent hook refreshes share one active-preset request');
  await act(async () => {
    listResponse.resolve(response({ presets: [activePreset] }));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(results[0].status, 'success');
  assert.equal(results[1].status, 'success');
  assert.equal(results[0].presets[0].name, 'Faces');
  assert.equal(results[1].presets[0].name, 'Faces');
  await act(async () => results[0].refresh());
  assert.equal(fetchCount, 2, 'an explicit later refresh performs a new request');
  await act(async () => renderer.unmount());
}

async function runCloneHydrationBehavior(): Promise<void> {
  const baseJob = {
    config: { process: [{ datasets: [
      { ...initialDataset, dataset_preset: { version_id: 'v-active', preset_id: 'active', preset_name: 'Active', version: 1, manifest_sha256: 'a'.repeat(64) } },
      { ...initialDataset, folder_path: '/managed/archived', dataset_preset: { version_id: 'v-old', preset_id: 'archived', preset_name: 'Archived', version: 2, manifest_sha256: 'b'.repeat(64) } },
    ] }] },
  } as unknown as JobConfig;
  const result = await removeArchivedPresetSourcesFromClone(baseJob, async (presetId: string) => ({
    id: presetId,
    archived_at: presetId === 'archived' ? '2026-08-03T00:00:00.000Z' : null,
  }));
  assert.equal(result.config.process[0].datasets[0].dataset_preset?.preset_id, 'active', 'active clone reference remains');
  assert.equal(result.config.process[0].datasets[0].folder_path, '/datasets/live');
  assert.equal(result.config.process[0].datasets[1].dataset_preset, undefined, 'archived clone metadata is cleared');
  assert.equal(result.config.process[0].datasets[1].folder_path, '', 'archived clone cannot reuse its managed path');
  assert.equal(hasMissingDatasetSource(result), true, 'cleared archived source blocks saving');
  result.config.process[0].datasets[1].folder_path = '/datasets/replacement';
  assert.equal(hasMissingDatasetSource(result), false, 'choosing a live replacement permits saving');
  result.config.process[0].datasets[1].folder_path = '';
  result.config.process[0].datasets[1].dataset_preset = {
    version_id: 'v-new', preset_id: 'active', preset_name: 'Active', version: 1, manifest_sha256: 'c'.repeat(64),
  };
  assert.equal(hasMissingDatasetSource(result), false, 'choosing an active preset permits saving');
  await assert.rejects(
    removeArchivedPresetSourcesFromClone(baseJob, async () => { throw new Error('availability check failed'); }),
    /availability check failed/,
    'clone hydration rejects when availability cannot be established',
  );
}

async function main(): Promise<void> {
  await runActivePresetBehavior();
  await runArchivedBehavior();
  await runPendingVersionSafetyBehavior();
  await runExternalReplacementSafetyBehavior();
  await runPresetIdentitySwitchBehavior();
  await runInstanceIdentitySafetyBehavior();
  await runTrainingPresetReplacementBehavior();
  await runSharedListBehavior();
  await runCloneHydrationBehavior();
  console.error = originalError;
  console.log('dataset source control behavior tests passed');
}

void main().catch(error => {
  console.error = originalError;
  console.error(error);
  process.exitCode = 1;
});
