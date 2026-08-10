import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import DatasetPresetDialog, { DEFAULT_DATASET_PRESET_LOADER_CONFIG } from '../src/components/DatasetPresetDialog';

const dialogPath = resolve(process.cwd(), 'src/components/DatasetPresetDialog.tsx');
const hookPath = resolve(process.cwd(), 'src/hooks/useDatasetPresets.tsx');

assert.ok(existsSync(dialogPath), 'dataset preset dialog must exist');
assert.ok(existsSync(hookPath), 'dataset preset browser hook must exist');

const dialogSource = readFileSync(dialogPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');


assert.match(dialogSource, /fieldErrors/, 'local validation exposes field-level errors');
assert.match(dialogSource, /selectedPaths\.length === 0/, 'Save is disabled for an empty selection');
assert.match(dialogSource, /pending/, 'pending state prevents a second submission');
assert.match(dialogSource, /method:\s*['"]POST['"]/, 'publications use POST');
assert.match(dialogSource, /base_version_id/, 'version payload includes its immutable base');
assert.match(dialogSource, /selected_paths/, 'publication payload sends selected relative paths');
assert.match(dialogSource, /retained_paths/, 'version payload sends retained paths');
assert.match(dialogSource, /responseError/, 'server errors remain visible in the open dialog');
assert.match(
  dialogSource,
  /await props\.onSaved[\s\S]{0,100}props\.onClose/,
  'successful publication refreshes page state before closing',
);

assert.match(
  hookSource,
  /status:\s*['"]idle['"]\s*\|\s*['"]loading['"]\s*\|\s*['"]success['"]\s*\|\s*['"]error['"]/,
  'hook exposes the required status contract',
);
assert.match(hookSource, /requestSequence/, 'hook ignores stale list responses');
assert.match(hookSource, /mountedRef/, 'hook ignores updates after unmount');
assert.match(hookSource, /response\.ok/, 'hook rejects non-OK responses');
assert.match(hookSource, /\/api\/dataset-presets/, 'hook uses dataset preset APIs');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args);
};
const documentStub = {
  addEventListener() {},
  removeEventListener() {},
  body: { style: { overflow: 'auto' } },
};
Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true });

const initialValues = {
  name: 'My images',
  note: 'first version',
  captionExt: 'txt',
  loaderConfig: DEFAULT_DATASET_PRESET_LOADER_CONFIG,
};

function textOf(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');
}

function labelControl(root: ReactTestInstance, label: string): ReactTestInstance {
  const match = root.findAll(node => node.type === 'label' && textOf(node).includes(label))[0];
  assert.ok(match, `rendered label ${label}`);
  return match.find(node => node.type === 'input' || node.type === 'textarea');
}

const accessibleLabels = [
  'Preset name',
  'Version note',
  'Caption extension',
  'Default caption',
  'Caption dropout rate',
  'Shuffle tokens',
  'Number of repeats',
  'Resolution',
  'Regularization dataset',
  'Network weight',
  'Cache latents to disk',
  'Flip horizontally',
  'Flip vertically',
  'Number of frames',
  'Shrink video to frames',
  'Frames per second',
  'Automatic frame count',
  'Image to video',
  'Process audio',
  'Normalize audio',
  'Preserve audio pitch',
  'Controls',
];

async function testDialogBehavior(): Promise<void> {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <DatasetPresetDialog
        mode="create"
        isOpen
        sourceDataset="my-images"
        selectedPaths={[]}
        retainedPaths={[]}
        initialValues={initialValues}
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
  });
  for (const label of accessibleLabels) labelControl(renderer!.root, label);
  const saveButton = renderer!.root.findAllByType('button').find(button => textOf(button).includes('Save preset'))!;
  assert.equal(saveButton.props.disabled, true, 'Save is disabled when no image is selected');

  let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let resolveFetch: ((response: Response) => void) | undefined;
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });
  }) as typeof fetch;

  const createProps = {
    mode: 'create' as const,
    isOpen: true,
    sourceDataset: 'my-images',
    selectedPaths: ['folder/a.png'],
    retainedPaths: [] as string[],
    initialValues,
    onClose: () => undefined,
    onSaved: () => undefined,
  };
  await act(async () => {
    renderer!.update(<DatasetPresetDialog {...createProps} />);
  });
  const form = renderer!.root.findByType('form');
  let firstSubmit!: Promise<void>;
  await act(async () => {
    firstSubmit = form.props.onSubmit({ preventDefault() {} });
    void form.props.onSubmit({ preventDefault() {} });
    await Promise.resolve();
  });
  assert.equal(fetchCalls.length, 1, 'pending publication cannot be double submitted');
  assert.equal(fetchCalls[0].url, '/api/dataset-presets');
  assert.equal(fetchCalls[0].init?.method, 'POST');
  const createPayload = JSON.parse(String(fetchCalls[0].init?.body));
  assert.equal(createPayload.name, 'My images');
  assert.equal(createPayload.source_dataset, 'my-images');
  assert.deepEqual(createPayload.selected_paths, ['folder/a.png']);
  assert.equal(createPayload.caption_ext, 'txt');
  assert.deepEqual(createPayload.loader_config, DEFAULT_DATASET_PRESET_LOADER_CONFIG);
  assert.equal(createPayload.note, 'first version');
  resolveFetch!(
    new Response(
      JSON.stringify({
        id: 'preset-1',
        name: 'My images',
        versions: [{ id: 'version-1', preset_id: 'preset-1', version: 1 }],
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    ),
  );
  await act(async () => {
    await firstSubmit;
  });

  fetchCalls = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 'version-2', preset_id: 'preset-1', version: 2 }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  await act(async () => {
    renderer!.update(
      <DatasetPresetDialog
        mode="version"
        presetId="preset-1"
        presetName="My images"
        baseVersionId="version-1"
        isOpen
        sourceDataset="my-images"
        selectedPaths={['folder/a.png', 'gone/b.png']}
        retainedPaths={['gone/b.png']}
        initialValues={initialValues}
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
  });
  await act(async () => {
    await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  const versionPayload = JSON.parse(String(fetchCalls[0].init?.body));
  assert.equal(fetchCalls[0].url, '/api/dataset-presets/preset-1/versions');
  assert.equal(versionPayload.base_version_id, 'version-1');
  assert.deepEqual(versionPayload.selected_paths, ['folder/a.png']);
  assert.deepEqual(versionPayload.retained_paths, ['gone/b.png']);

  let serverErrorRenderer: TestRenderer.ReactTestRenderer;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Preset name already exists' }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
  await act(async () => {
    serverErrorRenderer = TestRenderer.create(<DatasetPresetDialog {...createProps} />);
  });
  await act(async () => {
    await serverErrorRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.ok(
    serverErrorRenderer!.root
      .findAll(node => node.props.role === 'alert')
      .some(node => textOf(node).includes('Preset name already exists')),
    'server error remains visible',
  );

  let invalidRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    invalidRenderer = TestRenderer.create(
      <DatasetPresetDialog {...createProps} initialValues={{ ...initialValues, name: '' }} />,
    );
  });
  await act(async () => {
    await invalidRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.ok(
    invalidRenderer!.root
      .findAll(node => node.props.role === 'alert')
      .some(node => textOf(node).includes('Preset name is required')),
    'field-level validation is visible',
  );

  await act(async () => {
    renderer!.unmount();
    serverErrorRenderer!.unmount();
    invalidRenderer!.unmount();
  });
  console.error = originalError;
}

testDialogBehavior()
  .then(() => console.log('dataset preset dialog contracts passed'))
  .catch(error => {
    console.error = originalError;
    throw error;
  });
