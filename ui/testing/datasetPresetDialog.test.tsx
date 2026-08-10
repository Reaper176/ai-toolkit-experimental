import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import DatasetPresetDialog, { DEFAULT_DATASET_PRESET_LOADER_CONFIG } from '../src/components/DatasetPresetDialog';
import { CreatableSelectInput } from '../src/components/formInputs';

const dialogPath = resolve(process.cwd(), 'src/components/DatasetPresetDialog.tsx');
const hookPath = resolve(process.cwd(), 'src/hooks/useDatasetPresets.tsx');
const validationPath = resolve(process.cwd(), 'src/helpers/datasetPresetValidation.ts');

assert.ok(existsSync(dialogPath), 'dataset preset dialog must exist');
assert.ok(existsSync(hookPath), 'dataset preset browser hook must exist');
assert.ok(existsSync(validationPath), 'browser-safe dataset preset validation module must exist');

const dialogSource = readFileSync(dialogPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');
const validationSource = readFileSync(validationPath, 'utf8');
const presetContractSource = readFileSync(resolve(process.cwd(), 'src/helpers/datasetPresets.ts'), 'utf8');

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
for (const sharedControl of ['TextInput', 'NumberInput', 'Checkbox', 'CreatableSelectInput']) {
  assert.match(
    dialogSource,
    new RegExp(`import[\\s\\S]{0,300}\\b${sharedControl}\\b[\\s\\S]{0,100}from '@/components/formInputs'`),
    `dialog imports shared ${sharedControl}`,
  );
  assert.match(dialogSource, new RegExp(`<${sharedControl}\\b`), `dialog renders shared ${sharedControl}`);
}
assert.match(dialogSource, /normalizePresetName\(/, 'dialog uses canonical preset-name validation');
assert.match(dialogSource, /validateLoaderConfig\(/, 'dialog uses canonical loader validation');
assert.doesNotMatch(dialogSource, /\^\\\.?\[A-Za-z0-9_-\]/, 'dialog does not duplicate caption-extension validation');
assert.match(dialogSource, /from '@\/helpers\/datasetPresetValidation'/, 'dialog imports the browser-safe validators');
assert.doesNotMatch(
  validationSource,
  /node:crypto|getBuiltinModule/,
  'browser-safe validation has no Node crypto dependency',
);
assert.match(presetContractSource, /from 'node:crypto'/, 'server manifest hashing retains static Node crypto');
assert.doesNotMatch(presetContractSource, /getBuiltinModule/, 'manifest hashing supports the full declared Node range');

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
  const nested = match.findAll(
    node => node.type === 'input' || node.type === 'textarea' || node.props.role === 'switch',
  );
  if (nested[0]) return nested[0];
  assert.equal(typeof match.props.htmlFor, 'string', `${label} identifies its shared control`);
  return root.findAll(node => node.props.id === match.props.htmlFor)[0] ?? match;
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
  const captionOptions = [
    { value: 'txt', label: 'txt' },
    { value: 'json', label: 'json' },
  ];
  let controlledCaption = 'txt';
  let creatableRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    creatableRenderer = TestRenderer.create(
      <CreatableSelectInput
        label="Caption extension"
        value={controlledCaption}
        options={captionOptions}
        onChange={value => {
          controlledCaption = value;
        }}
      />,
    );
  });
  await act(async () => {
    creatableRenderer!.update(
      <CreatableSelectInput
        label="Caption extension"
        value=".cap"
        options={captionOptions}
        onChange={value => {
          controlledCaption = value;
        }}
      />,
    );
  });
  const customCaptionInput = creatableRenderer!.root.findAllByType('input').find(input => input.props.type === 'text');
  assert.ok(customCaptionInput, 'controlled standard-to-custom value change shows the custom input');
  assert.equal(customCaptionInput.props.value, '.cap');
  await act(async () => {
    creatableRenderer!.update(
      <CreatableSelectInput
        label="Caption extension"
        value=".cap"
        options={[...captionOptions, { value: '.cap', label: '.cap' }]}
        onChange={value => {
          controlledCaption = value;
        }}
      />,
    );
  });
  assert.equal(
    creatableRenderer!.root.findAllByType('input').filter(input => input.props.type === 'text').length,
    0,
    'adding the controlled value to options switches custom mode back to standard',
  );
  await act(async () => {
    creatableRenderer!.update(
      <CreatableSelectInput
        label="Caption extension"
        value=".cap"
        options={captionOptions}
        onChange={value => {
          controlledCaption = value;
        }}
      />,
    );
  });
  assert.ok(
    creatableRenderer!.root.findAllByType('input').find(input => input.props.type === 'text'),
    'removing the controlled value from options restores custom mode',
  );
  await act(async () => {
    creatableRenderer!.update(
      <CreatableSelectInput
        label="Caption extension"
        value="json"
        options={captionOptions}
        onChange={value => {
          controlledCaption = value;
        }}
      />,
    );
  });
  assert.equal(
    creatableRenderer!.root.findAllByType('input').filter(input => input.props.type === 'text').length,
    0,
    'controlled custom-to-standard value change hides the custom input',
  );

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

  const customInitialValues = {
    ...initialValues,
    captionExt: '.cap',
    loaderConfig: { ...DEFAULT_DATASET_PRESET_LOADER_CONFIG, caption_ext: '.cap' },
  };
  const syncedDialogProps = { ...createProps, initialValues };
  let syncedDialogRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    syncedDialogRenderer = TestRenderer.create(<DatasetPresetDialog {...syncedDialogProps} />);
  });
  await act(async () => {
    syncedDialogRenderer!.update(<DatasetPresetDialog {...syncedDialogProps} initialValues={customInitialValues} />);
  });
  let syncedPayload: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    syncedPayload = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        id: 'custom-caption-preset',
        name: 'My images',
        versions: [{ id: 'custom-caption-version', preset_id: 'custom-caption-preset', version: 1 }],
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  await act(async () => {
    await syncedDialogRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.equal(syncedPayload?.caption_ext, '.cap', 'controlled custom caption value is submitted');
  assert.equal(
    (syncedPayload?.loader_config as { caption_ext?: string }).caption_ext,
    '.cap',
    'controlled custom caption value remains synchronized in loader config',
  );

  fetchCalls = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 'version-2', preset_id: 'preset-1', version: 2 }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  let versionRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    versionRenderer = TestRenderer.create(
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
    await versionRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
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

  let recoveryPosts = 0;
  let recoveryFinalizations = 0;
  let recoveryCloses = 0;
  globalThis.fetch = (async () => {
    recoveryPosts += 1;
    return new Response(
      JSON.stringify({
        id: 'published-preset',
        name: 'My images',
        versions: [{ id: 'published-version', preset_id: 'published-preset', version: 1 }],
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  let recoveryRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    recoveryRenderer = TestRenderer.create(
      <DatasetPresetDialog
        {...createProps}
        onClose={() => {
          recoveryCloses += 1;
        }}
        onSaved={() => {
          recoveryFinalizations += 1;
          if (recoveryFinalizations === 1) throw new Error('Refresh temporarily unavailable');
        }}
      />,
    );
  });
  await act(async () => {
    await recoveryRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.equal(recoveryPosts, 1, 'publication POST succeeds once before refresh failure');
  assert.equal(recoveryCloses, 0, 'dialog remains open when post-publication refresh fails');
  assert.ok(
    recoveryRenderer!.root
      .findAll(node => node.props.role === 'alert')
      .some(node => textOf(node).includes('Refresh temporarily unavailable')),
    'post-publication recovery error is visible',
  );
  const retryButton = recoveryRenderer!.root
    .findAllByType('button')
    .find(button => textOf(button).includes('Retry refresh'));
  assert.ok(retryButton, 'published dialog offers explicit finalization retry');
  await act(async () => {
    await recoveryRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.equal(recoveryPosts, 1, 'retrying finalization never repeats publication POST');
  assert.equal(recoveryFinalizations, 2);
  assert.equal(recoveryCloses, 1, 'successful finalization retry closes the dialog');

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

  const numericFields = [
    ['Caption dropout rate', 'caption_dropout_rate'],
    ['Number of repeats', 'num_repeats'],
    ['Network weight', 'network_weight'],
    ['Number of frames', 'num_frames'],
    ['Frames per second', 'fps'],
  ] as const;
  const numericRenderers: TestRenderer.ReactTestRenderer[] = [];
  for (const [label, canonicalKey] of numericFields) {
    let numericFetches = 0;
    globalThis.fetch = (async () => {
      numericFetches += 1;
      return new Response(
        JSON.stringify({
          id: 'stale-number-preset',
          name: 'My images',
          versions: [{ id: 'stale-number-version', preset_id: 'stale-number-preset', version: 1 }],
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    let numericRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      numericRenderer = TestRenderer.create(<DatasetPresetDialog {...createProps} />);
    });
    numericRenderers.push(numericRenderer!);
    const control = labelControl(numericRenderer!.root, label);
    await act(async () => control.props.onChange({ target: { value: '' } }));
    await act(async () => {
      await numericRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
    });
    assert.equal(numericFetches, 0, `clearing ${label} cannot publish its stale prior number`);
    assert.ok(
      numericRenderer!.root
        .findAll(node => node.props.role === 'alert')
        .some(node => textOf(node).includes(canonicalKey)),
      `${label} displays its canonical field validation error`,
    );
  }

  let partialRenderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    partialRenderer = TestRenderer.create(<DatasetPresetDialog {...createProps} />);
  });
  let partialFetches = 0;
  globalThis.fetch = (async () => {
    partialFetches += 1;
    return new Response('{}', { status: 201 });
  }) as typeof fetch;
  await act(async () =>
    labelControl(partialRenderer!.root, 'Number of repeats').props.onChange({ target: { value: '-' } }),
  );
  await act(async () => {
    await partialRenderer!.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.equal(partialFetches, 0, 'a partial negative numeric input cannot publish its stale prior number');

  await act(async () => {
    creatableRenderer!.unmount();
    renderer!.unmount();
    versionRenderer!.unmount();
    serverErrorRenderer!.unmount();
    recoveryRenderer!.unmount();
    invalidRenderer!.unmount();
    syncedDialogRenderer!.unmount();
    partialRenderer!.unmount();
    for (const numericRenderer of numericRenderers) numericRenderer.unmount();
  });
  console.error = originalError;
}

testDialogBehavior()
  .then(() => console.log('dataset preset dialog contracts passed'))
  .catch(error => {
    console.error = originalError;
    throw error;
  });
