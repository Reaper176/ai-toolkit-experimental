import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { DatasetSelectionToolbar } from '../src/components/DatasetSelectionToolbar';
import {
  areSelectionsEqual,
  createDirtySelectionLeaveGuard,
  normalizeRelativeMediaPath,
  reconcileSelection,
  type SelectionHistoryWindow,
} from '../src/helpers/datasetSelection';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

class TestIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
}

(globalThis as typeof globalThis & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver =
  TestIntersectionObserver as unknown as typeof IntersectionObserver;

let deleteConfirmations = 0;
const moduleLoad = (Module as typeof Module & { _load: Function })._load;
(Module as typeof Module & { _load: Function })._load = function patchedLoad(
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === './ConfirmModal') {
    return { openConfirm: () => deleteConfirmations++ };
  }
  return moduleLoad.call(this, request, parent, isMain);
};
const DatasetImageCard: React.ComponentType<any> = require('../src/components/DatasetImageCard').default;
(Module as typeof Module & { _load: Function })._load = moduleLoad;

function click(instance: TestRenderer.ReactTestInstance): void {
  instance.props.onClick({ stopPropagation() {} });
}

function historyWindow(): {
  value: SelectionHistoryWindow;
  emitPopstate(): void;
  pushed: unknown[];
  backs: number;
  listenerCount(): number;
} {
  const listeners = new Set<() => void>();
  const pushed: unknown[] = [];
  let backs = 0;
  return {
    value: {
      location: { href: 'http://localhost/datasets/example' },
      history: {
        pushState: state => pushed.push(state),
        back: () => backs++,
      },
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
    },
    emitPopstate: () => listeners.forEach(listener => listener()),
    pushed,
    get backs() {
      return backs;
    },
    listenerCount: () => listeners.size,
  };
}

async function run(): Promise<void> {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.equal(areSelectionsEqual(new Set(['a', 'b']), new Set(['b', 'a'])), true);
    assert.equal(areSelectionsEqual(new Set(['a']), new Set(['b'])), false);
    assert.deepEqual(reconcileSelection(new Set(['a', 'missing']), ['a', 'b']), new Set(['a']));
    assert.equal(normalizeRelativeMediaPath('nested\\portrait.jpg'), 'nested/portrait.jpg');
    assert.doesNotMatch(
      readFileSync(resolve(process.cwd(), 'src/helpers/datasetSelection.ts'), 'utf8'),
      /from\s+['"]node:/,
      'browser-safe selection helpers cannot import Node modules',
    );
    const fakeWindow = historyWindow();
    let leaveAttempts = 0;
    const guard = createDirtySelectionLeaveGuard(fakeWindow.value, () => leaveAttempts++);
    guard.setDirty(true);
    assert.equal(fakeWindow.pushed.length, 1, 'dirty state arms exactly one history sentinel');
    assert.equal(fakeWindow.listenerCount(), 1);
    fakeWindow.emitPopstate();
    assert.equal(leaveAttempts, 1, 'browser back asks the page to confirm leaving');
    assert.equal(fakeWindow.pushed.length, 2, 'cancel path restores the sentinel without navigating');
    guard.allowLeave();
    assert.equal(fakeWindow.backs, 1, 'confirmed leave proceeds one browser-history step');
    assert.equal(fakeWindow.listenerCount(), 0, 'allowing leave removes the popstate listener first');
    guard.setDirty(true);
    guard.setDirty(false);
    assert.equal(fakeWindow.listenerCount(), 0, 'clean state removes the popstate listener without navigation');
    guard.dispose();

    const actions: string[] = [];
    let cancelled = 0;
    let toolbar!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      toolbar = TestRenderer.create(
        <DatasetSelectionToolbar
          selectedCount={2}
          totalCount={5}
          dirty
          saving={false}
          onAction={action => actions.push(action)}
          onCancel={() => cancelled++}
        />,
      );
    });
    const status = toolbar.root.findByProps({ role: 'status' });
    assert.match(status.children.join(''), /2 of 5 enabled/);
    assert.match(status.children.join(''), /unsaved/i);
    click(toolbar.root.findByProps({ children: 'Select all' }));
    click(toolbar.root.findByProps({ children: 'Select none' }));
    click(toolbar.root.findByProps({ children: 'Invert selection' }));
    click(toolbar.root.findByProps({ children: 'Cancel' }));
    assert.deepEqual(actions, ['all', 'none', 'invert']);
    assert.equal(cancelled, 1);
    assert.equal(toolbar.root.findByProps({ children: 'Save preset' }).props.disabled, true);

    let saves = 0;
    await act(async () => {
      toolbar.update(
        <DatasetSelectionToolbar
          selectedCount={1}
          totalCount={5}
          dirty={false}
          saving={false}
          onAction={action => actions.push(action)}
          onSave={() => saves++}
          onCancel={() => cancelled++}
        />,
      );
    });
    const save = toolbar.root.findByProps({ children: 'Save preset' });
    assert.equal(save.props.disabled, false);
    click(save);
    assert.equal(saves, 1);
    await act(async () => {
      toolbar.update(
        <DatasetSelectionToolbar
          selectedCount={0}
          totalCount={5}
          dirty={false}
          saving={false}
          onAction={action => actions.push(action)}
          onSave={() => saves++}
          onCancel={() => cancelled++}
        />,
      );
    });
    assert.equal(toolbar.root.findByProps({ children: 'Save preset' }).props.disabled, true, 'zero selections cannot save');
    await act(async () => {
      toolbar.update(
        <DatasetSelectionToolbar
          selectedCount={1}
          totalCount={5}
          dirty={false}
          saving
          onAction={action => actions.push(action)}
          onSave={() => saves++}
          onCancel={() => cancelled++}
        />,
      );
    });
    for (const label of ['Select all', 'Select none', 'Invert selection', 'Save preset', 'Cancel']) {
      assert.equal(toolbar.root.findByProps({ children: label }).props.disabled, true, `${label} disables while saving`);
    }
    await act(async () => toolbar.unmount());

    const selectionChanges: boolean[] = [];
    let viewerCalls = 0;
    let card!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      card = TestRenderer.create(
        <DatasetImageCard
          imageUrl="photos/portrait.jpg"
          alt="portrait.jpg"
          isAutoCaptioning={false}
          selectionMode
          selected={false}
          onSelectionChange={(selected: boolean) => selectionChanges.push(selected)}
          onImageClick={() => viewerCalls++}
        />,
      );
    });
    const checkbox = card.root.findByProps({ type: 'checkbox', 'aria-label': 'Select portrait.jpg' });
    assert.equal(checkbox.props.checked, false);
    act(() => checkbox.props.onChange({ currentTarget: { checked: true }, stopPropagation() {} }));
    assert.deepEqual(selectionChanges, [true]);
    act(() => click(card.root.findByProps({ 'data-selection-media': true })));
    assert.deepEqual(selectionChanges, [true, true], 'media click uses authoritative selected prop');
    assert.equal(viewerCalls, 0, 'selection media never opens the viewer');
    const deleteButton = card.root.findByProps({ 'aria-label': 'Delete portrait.jpg' });
    act(() => click(deleteButton));
    assert.equal(deleteConfirmations, 1, 'delete remains a separate top-right control');
    assert.deepEqual(selectionChanges, [true, true], 'delete never changes selection');
    await act(async () => {
      card.update(
        <DatasetImageCard
          imageUrl="photos/portrait.jpg"
          alt="portrait.jpg"
          isAutoCaptioning={false}
          selectionMode
          selected
          onSelectionChange={(selected: boolean) => selectionChanges.push(selected)}
          onImageClick={() => viewerCalls++}
        />,
      );
    });
    assert.equal(card.root.findByProps({ type: 'checkbox', 'aria-label': 'Select portrait.jpg' }).props.checked, true);
    await act(async () => card.unmount());

    const originalFetch = globalThis.fetch;
    const testGlobal = globalThis as any;
    const originalWindow = testGlobal.window;
    const originalLocalStorage = testGlobal.localStorage;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    globalThis.fetch = (async () => ({ ok: true, blob: async () => new Blob(['image']) })) as unknown as typeof fetch;
    testGlobal.window = globalThis;
    testGlobal.localStorage = { getItem: () => null, removeItem: () => undefined };
    URL.createObjectURL = () => 'blob:test-image';
    URL.revokeObjectURL = () => undefined;
    try {
      let nonSelectionViewerCalls = 0;
      let normalCard!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        normalCard = TestRenderer.create(
          <DatasetImageCard
            imageUrl="photos/portrait.jpg"
            alt="portrait.jpg"
            isAutoCaptioning={false}
            onImageClick={() => nonSelectionViewerCalls++}
          />,
          { createNodeMock: () => ({}) },
        );
      });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      const viewerImage = normalCard.root.findAllByType('img').find(image => image.props.src === 'blob:test-image');
      assert.ok(viewerImage, 'visible image is loaded for viewer interaction');
      click(viewerImage);
      assert.equal(nonSelectionViewerCalls, 1, 'non-selection media retains viewer clicks');
      await act(async () => normalCard.unmount());
    } finally {
      globalThis.fetch = originalFetch;
      if (originalWindow === undefined) Reflect.deleteProperty(testGlobal, 'window');
      else testGlobal.window = originalWindow;
      if (originalLocalStorage === undefined) Reflect.deleteProperty(testGlobal, 'localStorage');
      else testGlobal.localStorage = originalLocalStorage;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  } finally {
    console.error = originalConsoleError;
    delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  }
  console.log('dataset selection component tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
