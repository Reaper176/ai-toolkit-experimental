import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import type { JobConfig } from '../src/types';
import { sanitizeTrainingPreset, type UserTrainingPresetRecord } from '../src/helpers/trainingPresets';
import {
  BUILT_IN_PRESET_ROWS,
  materializeBuiltInTrainingPresetRow,
} from '../src/helpers/builtInTrainingPresetDefinitions';
import { TrainingPresetControl } from '../src/components/TrainingPresetControl';
import type { TrainingPresetDialogViewProps } from '../src/components/TrainingPresetDialog';
import {
  PRESET_ACTION_DELETE,
  PRESET_ACTION_UNDO,
  PRESET_ACTION_SAVE,
  PRESET_ACTION_UPDATE,
  TRAINING_PRESET_REQUEST_TIMEOUT_MS,
  presetValue,
  type TrainingPresetApi,
} from '../src/components/TrainingPresetSelect';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

function jobFixture(steps = 100, arch = 'flux'): JobConfig {
  return {
    job: 'extension',
    config: {
      name: 'job',
      process: [
        {
          type: 'diffusion_trainer',
          training_folder: '/output',
          device: 'cuda:0',
          trigger_word: 'TOK',
          datasets: [],
          train: { steps },
          save: {},
          model: { name_or_path: 'model', arch },
          sample: { samples: [] },
        },
      ],
    },
    meta: { name: '[name]', version: '1' },
  } as unknown as JobConfig;
}

function record(id: string, name: string): UserTrainingPresetRecord {
  return {
    id,
    name,
    source: 'user',
    read_only: false,
    schema_version: 1,
    snapshot: sanitizeTrainingPreset(jobFixture(200)),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function TestDialog(props: TrainingPresetDialogViewProps) {
  if (props.state.kind === 'closed') return null;
  return (
    <section data-dialog={props.state.kind}>
      <h2 data-dialog-title>
        {props.state.kind === 'save'
          ? 'Save training preset'
          : `${props.state.kind === 'update' ? 'Update' : 'Delete'} “${props.state.presetName}”`}
      </h2>
      {props.state.kind === 'save' && (
        <input
          aria-label="Test preset name"
          value={props.state.name}
          onChange={event => props.onNameChange(event.currentTarget.value)}
        />
      )}
      {props.state.error && <span data-dialog-error>{props.state.error}</span>}
      <button data-close="cancel" onClick={props.onClose}>
        Cancel
      </button>
      <button data-close="dismiss" onClick={props.onClose}>
        Dismiss
      </button>
      <button data-confirm disabled={props.pending} onClick={props.onConfirm}>
        Confirm
      </button>
    </section>
  );
}

function select(root: ReactTestInstance): ReactTestInstance {
  return root.findByProps({ 'aria-label': 'Training preset' });
}

function chooseSave(root: ReactTestInstance): void {
  const target = { value: PRESET_ACTION_SAVE };
  select(root).props.onChange({ currentTarget: target });
}

async function run(): Promise<void> {
  const originalConsoleError = console.error;
  const rendererWarnings: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    rendererWarnings.push(args);
  };
  try {
    let unmountSignal: AbortSignal | undefined;
    let unmountAborted = false;
    const neverApi: TrainingPresetApi = {
      get: async (_url, options) => {
        unmountSignal = options.signal;
        assert.equal(options.timeout, TRAINING_PRESET_REQUEST_TIMEOUT_MS);
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => {
              unmountAborted = true;
              reject({ code: 'ERR_CANCELED' });
            },
            { once: true },
          );
        });
      },
      post: async () => {
        throw new Error('unexpected POST');
      },
      put: async () => {
        throw new Error('unexpected PUT');
      },
      delete: async () => {
        throw new Error('unexpected DELETE');
      },
    };
    let unmountRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      unmountRenderer = TestRenderer.create(
        <TrainingPresetControl
          jobConfig={jobFixture()}
          onJobConfigChange={() => undefined}
          migrateJobConfig={value => value}
          dependencies={{ api: neverApi, Dialog: TestDialog }}
        />,
      );
    });
    assert.equal(unmountSignal?.aborted, false);
    await act(async () => {
      unmountRenderer.unmount();
      await Promise.resolve();
    });
    assert.equal(unmountAborted, true);
    assert.equal(unmountSignal?.aborted, true);

    const disabledApi: TrainingPresetApi = {
      get: async () => ({ data: { presets: [] } }),
      post: async () => {
        throw new Error('disabled control must not POST');
      },
      put: async () => {
        throw new Error('disabled control must not PUT');
      },
      delete: async () => {
        throw new Error('disabled control must not DELETE');
      },
    };
    let disabledRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      disabledRenderer = TestRenderer.create(
        <TrainingPresetControl
          disabled
          jobConfig={jobFixture()}
          onJobConfigChange={() => undefined}
          migrateJobConfig={value => value}
          dependencies={{ api: disabledApi, Dialog: TestDialog }}
        />,
      );
    });
    assert.equal(select(disabledRenderer.root).props.disabled, true);
    act(() => chooseSave(disabledRenderer.root));
    assert.equal(disabledRenderer.root.findAllByProps({ 'data-dialog': 'save' }).length, 0);
    await act(async () => {
      disabledRenderer.update(
        <TrainingPresetControl
          disabled={false}
          jobConfig={jobFixture()}
          onJobConfigChange={() => undefined}
          migrateJobConfig={value => value}
          dependencies={{ api: disabledApi, Dialog: TestDialog }}
        />,
      );
    });
    act(() => chooseSave(disabledRenderer.root));
    assert.equal(disabledRenderer.root.findAllByProps({ 'data-dialog': 'save' }).length, 1);
    await act(async () => disabledRenderer.unmount());

    const remountPreset = record('remount-preset', 'Remount preset');
    const remountApi: TrainingPresetApi = {
      get: async () => ({ data: { presets: [remountPreset] } }),
      post: async () => {
        throw new Error('unexpected POST');
      },
      put: async () => {
        throw new Error('unexpected PUT');
      },
      delete: async () => {
        throw new Error('unexpected DELETE');
      },
    };
    const remountChanges: JobConfig[] = [];
    let remountRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      remountRenderer = TestRenderer.create(
        <TrainingPresetControl
          key={0}
          jobConfig={jobFixture(100)}
          onJobConfigChange={value => remountChanges.push(value)}
          migrateJobConfig={value => value}
          dependencies={{ api: remountApi, Dialog: TestDialog }}
        />,
      );
    });
    const oldSelectionHandler = select(remountRenderer.root).props.onChange;
    act(() => oldSelectionHandler({ currentTarget: { value: presetValue(remountPreset.id) } }));
    assert.equal(remountChanges.length, 1, 'preset applies before external replacement');
    const oldUndoHandler = select(remountRenderer.root).props.onChange;
    await act(async () => {
      remountRenderer.update(
        <TrainingPresetControl
          key={1}
          jobConfig={jobFixture(900)}
          onJobConfigChange={value => remountChanges.push(value)}
          migrateJobConfig={value => value}
          dependencies={{ api: remountApi, Dialog: TestDialog }}
        />,
      );
    });
    act(() => oldUndoHandler({ currentTarget: { value: PRESET_ACTION_UNDO } }));
    assert.equal(remountChanges.length, 1, 'stale undo cannot overwrite externally hydrated config after remount');
    assert.equal(
      select(remountRenderer.root).props.value,
      '',
      'remounted control resets preset selection and undo state',
    );
    await act(async () => remountRenderer.unmount());

    const created = record('created', 'Created');
    const calls: string[] = [];
    const requestOptions: Array<{ signal: AbortSignal; timeout: number }> = [];
    let postMode: 'deferred' | 'reject' | 'timeout' | 'cancel' = 'deferred';
    let resolvePost!: (value: { data: unknown }) => void;
    const api: TrainingPresetApi = {
      get: async (url, options) => {
        calls.push(`GET ${url}`);
        requestOptions.push(options);
        return { data: { presets: calls.some(call => call.startsWith('POST')) ? [created] : [] } };
      },
      post: async (url, _body, options) => {
        calls.push(`POST ${url}`);
        requestOptions.push(options);
        if (postMode === 'reject') throw { response: { data: { error: 'Duplicate preset' } } };
        if (postMode === 'timeout') throw { code: 'ECONNABORTED' };
        if (postMode === 'cancel') throw { code: 'ERR_CANCELED' };
        return new Promise(resolve => {
          resolvePost = resolve;
        });
      },
      put: async () => {
        throw new Error('unexpected PUT');
      },
      delete: async () => {
        throw new Error('unexpected DELETE');
      },
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TrainingPresetControl
          jobConfig={jobFixture()}
          onJobConfigChange={() => undefined}
          migrateJobConfig={value => value}
          dependencies={{ api, Dialog: TestDialog }}
        />,
      );
    });
    const root = renderer.root;
    assert.equal(select(root).props.disabled, false);

    act(() => chooseSave(root));
    assert.equal(select(root).props.disabled, true);
    const staleConfirm = root.findByProps({ 'data-confirm': true }).props.onClick;
    act(() => root.findByProps({ 'data-close': 'cancel' }).props.onClick());
    assert.equal(select(root).props.disabled, false);
    act(() => staleConfirm());
    assert.equal(calls.filter(call => call.startsWith('POST')).length, 0);

    act(() => chooseSave(root));
    act(() =>
      root.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'Dialog B' } }),
    );
    act(() => staleConfirm());
    assert.equal(calls.filter(call => call.startsWith('POST')).length, 0);
    assert.equal(root.findByProps({ 'data-confirm': true }).props.disabled, false);
    act(() => root.findByProps({ 'data-close': 'dismiss' }).props.onClick());
    assert.equal(select(root).props.disabled, false);

    act(() => chooseSave(root));
    act(() => root.findByProps({ 'data-confirm': true }).props.onClick());
    assert.equal(root.findByProps({ 'data-dialog': 'save' }).props['data-dialog'], 'save');
    assert.match(String(root.findByProps({ 'data-dialog-error': true }).children[0]), /required/i);

    act(() =>
      root.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'New' } }),
    );
    act(() => root.findByProps({ 'data-confirm': true }).props.onClick());
    assert.equal(root.findByProps({ 'data-confirm': true }).props.disabled, true);
    assert.equal(select(root).props.disabled, true);
    await act(async () => {
      resolvePost({ data: created });
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(root.findAllByProps({ 'data-dialog': 'save' }).length, 0);
    assert.equal(select(root).props.disabled, false);
    assert.deepEqual(calls.slice(-2), ['POST /api/training-presets', 'GET /api/training-presets']);

    postMode = 'reject';
    act(() => chooseSave(root));
    act(() =>
      root.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'Dup' } }),
    );
    await act(async () => {
      root.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
    });
    assert.equal(root.findByProps({ 'data-confirm': true }).props.disabled, false);
    assert.match(String(root.findByProps({ 'data-dialog-error': true }).children[0]), /duplicate/i);
    act(() => root.findByProps({ 'data-close': 'cancel' }).props.onClick());
    assert.equal(select(root).props.disabled, false);

    postMode = 'timeout';
    act(() => chooseSave(root));
    act(() =>
      root.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'Slow' } }),
    );
    await act(async () => {
      root.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
    });
    assert.equal(root.findByProps({ 'data-confirm': true }).props.disabled, false);
    assert.match(String(root.findByProps({ 'data-dialog-error': true }).children[0]), /unable to save/i);
    act(() => root.findByProps({ 'data-close': 'cancel' }).props.onClick());

    postMode = 'cancel';
    const getsBeforeCancel = calls.filter(call => call.startsWith('GET')).length;
    act(() => chooseSave(root));
    act(() =>
      root.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'Cancelled' } }),
    );
    await act(async () => {
      root.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
    });
    assert.equal(root.findByProps({ 'data-confirm': true }).props.disabled, false);
    assert.equal(root.findAllByProps({ 'data-dialog-error': true }).length, 0);
    assert.equal(calls.filter(call => call.startsWith('GET')).length, getsBeforeCancel);
    act(() => root.findByProps({ 'data-close': 'cancel' }).props.onClick());

    for (const options of requestOptions) {
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.timeout, TRAINING_PRESET_REQUEST_TIMEOUT_MS);
    }
    act(() => chooseSave(root));
    const staleAfterUnmount = root.findByProps({ 'data-confirm': true }).props.onClick;
    const postsBeforeUnmount = calls.filter(call => call.startsWith('POST')).length;
    await act(async () => renderer.unmount());
    staleAfterUnmount();
    await Promise.resolve();
    assert.equal(calls.filter(call => call.startsWith('POST')).length, postsBeforeUnmount);

    const originalJob = jobFixture(100);
    const loaded = record('loaded', 'Loaded preset');
    const updated = { ...record('loaded', 'Updated preset'), updated_at: '2026-02-01T00:00:00.000Z' };
    const authoritativeLists = [[loaded], [updated], []];
    const actionCalls: Array<{
      method: string;
      url: string;
      body?: unknown;
      signal: AbortSignal;
      timeout: number;
    }> = [];
    const actionApi: TrainingPresetApi = {
      get: async (url, options) => {
        actionCalls.push({ method: 'GET', url, signal: options.signal, timeout: options.timeout });
        const presets = authoritativeLists.shift();
        assert.ok(presets, 'unexpected extra GET');
        return { data: { presets } };
      },
      post: async () => {
        throw new Error('unexpected POST');
      },
      put: async (url, body, options) => {
        actionCalls.push({ method: 'PUT', url, body, signal: options.signal, timeout: options.timeout });
        return { data: updated };
      },
      delete: async (url, options) => {
        actionCalls.push({ method: 'DELETE', url, signal: options.signal, timeout: options.timeout });
        return { data: { ok: true } };
      },
    };
    const actionDependencies = { api: actionApi, Dialog: TestDialog };
    const configChanges: JobConfig[] = [];
    const actionElement = (config: JobConfig) => (
      <TrainingPresetControl
        jobConfig={config}
        onJobConfigChange={value => configChanges.push(value)}
        migrateJobConfig={value => value}
        dependencies={actionDependencies}
      />
    );
    let actionRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      actionRenderer = TestRenderer.create(actionElement(originalJob));
    });
    const actionRoot = actionRenderer.root;
    assert.deepEqual(
      actionCalls.map(call => call.method),
      ['GET'],
    );

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: presetValue(loaded.id) } }));
    const firstApplied = configChanges[0];
    assert.equal(firstApplied.config.process[0].train.steps, 200);
    act(() => actionRenderer.update(actionElement(firstApplied)));
    assert.equal(actionRoot.findAllByProps({ value: PRESET_ACTION_UNDO }).length, 1);

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_UNDO } }));
    assert.deepEqual(configChanges[1], originalJob);
    act(() => actionRenderer.update(actionElement(configChanges[1])));
    assert.equal(actionRoot.findAllByProps({ value: PRESET_ACTION_UNDO }).length, 0);
    assert.equal(select(actionRoot).props.value, presetValue(loaded.id));
    const stillSelectedOption = actionRoot.findAll(
      node => node.type === 'option' && node.props.value === presetValue(loaded.id),
    )[0];
    assert.deepEqual(stillSelectedOption.children, [loaded.name]);

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: presetValue(loaded.id) } }));
    const currentApplied = configChanges[2];
    act(() => actionRenderer.update(actionElement(currentApplied)));
    assert.equal(actionRoot.findAllByProps({ value: PRESET_ACTION_UNDO }).length, 1);

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_UPDATE } }));
    assert.match(String(actionRoot.findByProps({ 'data-dialog-title': true }).children[0]), /Loaded preset/);
    const staleUpdateConfirm = actionRoot.findByProps({ 'data-confirm': true }).props.onClick;
    act(() => actionRoot.findByProps({ 'data-close': 'cancel' }).props.onClick());
    act(() => select(actionRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_DELETE } }));
    assert.match(String(actionRoot.findByProps({ 'data-dialog-title': true }).children[0]), /Delete/);
    act(() => staleUpdateConfirm());
    assert.deepEqual(
      actionCalls.map(call => call.method),
      ['GET'],
    );
    assert.equal(actionRoot.findByProps({ 'data-confirm': true }).props.disabled, false);
    act(() => actionRoot.findByProps({ 'data-close': 'cancel' }).props.onClick());

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_UPDATE } }));
    assert.match(String(actionRoot.findByProps({ 'data-dialog-title': true }).children[0]), /Loaded preset/);
    await act(async () => {
      actionRoot.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.deepEqual(
      actionCalls.map(call => call.method),
      ['GET', 'PUT', 'GET'],
    );
    assert.equal(actionCalls[1].url, '/api/training-presets/loaded');
    assert.deepEqual(actionCalls[1].body, { job_config: currentApplied });
    assert.equal(configChanges.length, 3);
    assert.equal(actionRoot.findAllByProps({ 'data-dialog': 'update' }).length, 0);
    assert.equal(select(actionRoot).props.disabled, false);
    assert.equal(select(actionRoot).props.value, presetValue(updated.id));
    assert.equal(actionRoot.findAllByProps({ value: PRESET_ACTION_UNDO }).length, 1);

    act(() => select(actionRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_DELETE } }));
    assert.match(String(actionRoot.findByProps({ 'data-dialog-title': true }).children[0]), /Updated preset/);
    await act(async () => {
      actionRoot.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.deepEqual(
      actionCalls.map(call => call.method),
      ['GET', 'PUT', 'GET', 'DELETE', 'GET'],
    );
    assert.deepEqual(
      actionCalls.map(call => `${call.method} ${call.url}`),
      [
        'GET /api/training-presets',
        'PUT /api/training-presets/loaded',
        'GET /api/training-presets',
        'DELETE /api/training-presets/loaded',
        'GET /api/training-presets',
      ],
    );
    assert.equal(actionCalls[3].url, '/api/training-presets/loaded');
    assert.equal(configChanges.length, 3);
    assert.equal(actionRoot.findAllByProps({ 'data-dialog': 'delete' }).length, 0);
    assert.equal(select(actionRoot).props.disabled, false);
    assert.equal(select(actionRoot).props.value, '');
    assert.equal(actionRoot.findAllByProps({ value: PRESET_ACTION_UNDO }).length, 1);
    for (const call of actionCalls) {
      assert.ok(call.signal instanceof AbortSignal);
      assert.equal(call.timeout, TRAINING_PRESET_REQUEST_TIMEOUT_MS);
    }
    assert.equal(actionCalls[1].signal, actionCalls[2].signal, 'PUT and its GET share one controller');
    assert.equal(actionCalls[3].signal, actionCalls[4].signal, 'DELETE and its GET share one controller');
    assert.notEqual(actionCalls[1].signal, actionCalls[3].signal);
    assert.equal(actionCalls[0].signal.aborted, true, 'first mutation supersedes the initial GET controller');
    assert.equal(actionCalls[1].signal.aborted, true, 'delete supersedes the completed update controller');
    assert.equal(actionCalls[3].signal.aborted, false);
    await act(async () => actionRenderer.unmount());
    assert.equal(actionCalls[3].signal.aborted, true, 'unmount aborts the current delete controller');

    const builtinFlux = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[4]);
    const builtinWan = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[12]);
    const personal = record('personal', 'Personal');
    let savedFromBuiltin: UserTrainingPresetRecord | undefined;
    let builtinPostBody: unknown;
    const builtinApi: TrainingPresetApi = {
      get: async () => ({ data: { presets: [personal, builtinWan, builtinFlux, ...(savedFromBuiltin ? [savedFromBuiltin] : [])] } }),
      post: async (_url, body) => {
        builtinPostBody = body;
        savedFromBuiltin = record('saved-from-builtin', 'Saved from built-in');
        return { data: savedFromBuiltin };
      },
      put: async () => {
        throw new Error('built-ins must not PUT');
      },
      delete: async () => {
        throw new Error('built-ins must not DELETE');
      },
    };
    const builtinChanges: JobConfig[] = [];
    const builtinElement = (config: JobConfig) => (
      <TrainingPresetControl
        jobConfig={config}
        onJobConfigChange={value => builtinChanges.push(value)}
        migrateJobConfig={value => value}
        dependencies={{ api: builtinApi, Dialog: TestDialog }}
      />
    );
    let builtinRenderer!: TestRenderer.ReactTestRenderer;
    const builtinInitial = jobFixture(100, 'flux');
    (builtinInitial.config.process[0].sample as any).neg = 'retain-current-negative';
    builtinInitial.config.process[0].datasets = [{ folder_path: '/distinctive-dataset' } as any];
    await act(async () => {
      builtinRenderer = TestRenderer.create(builtinElement(builtinInitial));
    });
    const builtinRoot = builtinRenderer.root;
    assert.equal(
      builtinRoot.findAll(node => node.type === 'option' && node.props.value === presetValue(builtinWan.id)).length,
      0,
      'incompatible built-ins are not options',
    );
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: presetValue(builtinFlux.id) } }));
    const builtinApplied = builtinChanges[0];
    assert.equal(builtinApplied.config.process[0].train.steps, (builtinFlux.snapshot.config.process[0].train as any).steps);
    assert.equal((builtinApplied.config.process[0].sample as any).neg, 'retain-current-negative');
    assert.deepEqual(builtinApplied.config.process[0].datasets, builtinInitial.config.process[0].datasets);
    assert.notEqual(builtinApplied.config.process[0].datasets, builtinInitial.config.process[0].datasets);
    assert.equal(builtinRoot.findByProps({ 'data-preset-summary': true }).children.join(''), builtinFlux.summary);
    assert.equal(select(builtinRoot).props.value, presetValue(builtinFlux.id));
    assert.equal(builtinRoot.findByProps({ value: PRESET_ACTION_UPDATE }).props.disabled, true);
    assert.equal(builtinRoot.findByProps({ value: PRESET_ACTION_DELETE }).props.disabled, true);
    assert.equal(builtinRoot.findByProps({ value: PRESET_ACTION_SAVE }).props.disabled, undefined);
    assert.equal(builtinRoot.findByProps({ value: PRESET_ACTION_UNDO }).props.disabled, undefined);
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_UPDATE } }));
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_DELETE } }));
    assert.equal(builtinRoot.findAllByProps({ 'data-dialog': 'update' }).length, 0);
    assert.equal(builtinRoot.findAllByProps({ 'data-dialog': 'delete' }).length, 0);

    await act(async () => builtinRenderer.update(builtinElement(builtinApplied)));
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: PRESET_ACTION_UNDO } }));
    assert.deepEqual(builtinChanges[1], builtinInitial, 'built-in apply has a full one-level undo snapshot');
    await act(async () => builtinRenderer.update(builtinElement(builtinApplied)));

    await act(async () => {
      builtinRenderer.update(builtinElement(jobFixture(100, 'sdxl')));
    });
    assert.equal(select(builtinRoot).props.value, '', 'architecture change clears a selected incompatible built-in');
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: presetValue(personal.id) } }));
    assert.equal(select(builtinRoot).props.value, presetValue(personal.id));
    await act(async () => {
      builtinRenderer.update(builtinElement(jobFixture(100, 'wan21:1b')));
    });
    assert.equal(
      select(builtinRoot).props.value,
      presetValue(personal.id),
      'architecture change retains a user preset',
    );
    assert.equal(
      builtinRoot.findAll(node => node.type === 'option' && node.props.value === presetValue(builtinWan.id)).length,
      1,
      'colon-bearing Wan architecture IDs are matched as opaque strings',
    );

    await act(async () => builtinRenderer.update(builtinElement(builtinApplied)));
    act(() => select(builtinRoot).props.onChange({ currentTarget: { value: presetValue(builtinFlux.id) } }));
    await act(async () => builtinRenderer.update(builtinElement(builtinChanges.at(-1)!)));
    act(() => chooseSave(builtinRoot));
    act(() => builtinRoot.findByProps({ 'aria-label': 'Test preset name' }).props.onChange({ currentTarget: { value: 'Saved from built-in' } }));
    await act(async () => {
      builtinRoot.findByProps({ 'data-confirm': true }).props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.ok(builtinPostBody, 'Save as New remains functional after built-in application');
    assert.equal(JSON.stringify(builtinPostBody).includes('catalog_revision'), false, 'catalog metadata is never posted');
    assert.ok(builtinRoot.findAll(node => node.type === 'optgroup' && node.props.label === 'Built-in recipes').length === 1);
    await act(async () => builtinRenderer.unmount());

    const rejectedChanges: JobConfig[] = [];
    let rejectedRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      rejectedRenderer = TestRenderer.create(
        <TrainingPresetControl
          jobConfig={jobFixture()}
          onJobConfigChange={value => rejectedChanges.push(value)}
          migrateJobConfig={value => {
            (value.config.process[0].model as any).name_or_path = '';
            return value;
          }}
          dependencies={{ api: { ...builtinApi, get: async () => ({ data: { presets: [personal] } }) }, Dialog: TestDialog }}
        />,
      );
    });
    act(() => select(rejectedRenderer.root).props.onChange({ currentTarget: { value: presetValue(personal.id) } }));
    assert.equal(rejectedChanges.length, 0, 'invalid post-application validation blocks the mounted state commit');
    assert.match(rejectedRenderer.root.findByProps({ role: 'alert' }).findByType('span').children.join(''), /could not apply/i);
    await act(async () => rejectedRenderer.unmount());

    const catalog = BUILT_IN_PRESET_ROWS.map(materializeBuiltInTrainingPresetRow);
    for (const catalogPreset of catalog) {
      const catalogChanges: JobConfig[] = [];
      const catalogApi: TrainingPresetApi = {
        get: async () => ({ data: { presets: catalog } }),
        post: async () => { throw new Error('unexpected POST'); },
        put: async () => { throw new Error('unexpected PUT'); },
        delete: async () => { throw new Error('unexpected DELETE'); },
      };
      let catalogRenderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        catalogRenderer = TestRenderer.create(
          <TrainingPresetControl
            jobConfig={jobFixture(100, catalogPreset.model_arch)}
            onJobConfigChange={value => catalogChanges.push(value)}
            migrateJobConfig={value => value}
            dependencies={{ api: catalogApi, Dialog: TestDialog }}
          />,
        );
      });
      act(() => select(catalogRenderer.root).props.onChange({ currentTarget: { value: presetValue(catalogPreset.id) } }));
      assert.equal(catalogChanges.length, 1, `${catalogPreset.id} is consumed by the mounted mixed-record control`);
      await act(async () => catalogRenderer.unmount());
    }

    const unexpectedWarnings = rendererWarnings.filter(
      args => !String(args[0]).includes('react-test-renderer is deprecated'),
    );
    assert.deepEqual(unexpectedWarnings, []);
  } finally {
    console.error = originalConsoleError;
    delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
  console.log('training preset controller lifecycle tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
