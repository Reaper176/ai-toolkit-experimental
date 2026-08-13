import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { DatasetSelectionToolbar } from '../src/components/DatasetSelectionToolbar';
import DatasetReviewEmptyState from '../src/components/DatasetReviewEmptyState';
import DatasetSourceMissingList from '../src/components/DatasetSourceMissingList';
import { createLatestDatasetPresetRequestGate } from '../src/hooks/useDatasetPresets';
import {
  areSelectionsEqual,
  createDirtySelectionLeaveGuard,
  filterDatasetImagesBySelection,
  filterPathsBySelection,
  getInterceptableInternalNavigationHref,
  normalizeRelativeMediaPath,
  reconcileSelection,
  type SelectionHistoryWindow,
} from '../src/helpers/datasetSelection';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

class TestIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
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

function emptyStateMessages(props: React.ComponentProps<typeof DatasetReviewEmptyState>): string[] {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<DatasetReviewEmptyState {...props} />);
  });
  const messages = renderer.root
    .findAll(node => node.type === 'h3' || node.type === 'p')
    .map(node => node.children.join(''));
  assert.equal(
    renderer.root.findAllByProps({ role: 'status' }).length,
    messages.includes('No selected images to show.') ? 1 : 0,
    'the selected-only empty message is the sole announced status',
  );
  act(() => renderer.unmount());
  return messages;
}

class PositionAwareHistory {
  private readonly listeners = new Set<() => void>();
  private readonly entries: Array<{ state: unknown; url: string }>;
  private position: number;

  constructor(
    priorUrl = 'http://localhost/previous',
    pageUrl = 'http://localhost/datasets/example',
    private readonly asyncPopstate = false,
  ) {
    this.entries = [
      { state: null, url: priorUrl },
      { state: null, url: pageUrl },
    ];
    this.position = 1;
  }

  get currentUrl(): string {
    return this.entries[this.position].url;
  }

  get index(): number {
    return this.position;
  }

  get length(): number {
    return this.entries.length;
  }

  get listenerCount(): number {
    return this.listeners.size;
  }

  get value(): SelectionHistoryWindow {
    const positionHistory = this;
    return {
      location: {
        get href() {
          return positionHistory.currentUrl;
        },
      } as Pick<Location, 'href'>,
      history: {
        pushState: (state, _title, url) => {
          this.entries.splice(this.position + 1);
          this.entries.push({ state, url: url === undefined || url === null ? this.currentUrl : String(url) });
          this.position = this.entries.length - 1;
        },
        back: () => this.move(-1),
        forward: () => this.move(1),
        go: (delta: number) => this.move(delta),
      } as SelectionHistoryWindow['history'],
      addEventListener: (_type, listener) => this.listeners.add(listener),
      removeEventListener: (_type, listener) => this.listeners.delete(listener),
    };
  }

  private move(delta: number): void {
    const target = this.position + delta;
    if (target < 0 || target >= this.entries.length || target === this.position) return;
    this.position = target;
    const emit = () => {
      for (const listener of [...this.listeners]) listener();
    };
    if (this.asyncPopstate) queueMicrotask(emit);
    else emit();
  }
}

function navigationEvent(
  href: string,
  options: Partial<{ modified: boolean; external: boolean; download: boolean; target: string; button: number }> = {},
) {
  const destination = options.external ? 'https://example.test/outside' : href;
  const anchor = {
    href: destination,
    target: options.target ?? '',
    hasAttribute: (name: string) => name === 'download' && options.download === true,
  };
  return {
    defaultPrevented: false,
    button: options.button ?? 0,
    metaKey: options.modified === true,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: { closest: () => anchor },
  } as unknown as MouseEvent;
}

async function run(): Promise<void> {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.equal(areSelectionsEqual(new Set(['a', 'b']), new Set(['b', 'a'])), true);
    assert.equal(areSelectionsEqual(new Set(['a']), new Set(['b'])), false);
    const images = [
      { img_path: '/dataset/a.png', relative_path: 'a.png' },
      { img_path: '/dataset/b.png', relative_path: 'b.png' },
      { img_path: '/dataset/c.png', relative_path: 'c.png' },
    ];
    const selected = new Set(['b.png', 'missing.png']);
    assert.equal(filterDatasetImagesBySelection(images, selected, false), images);
    assert.deepEqual(filterDatasetImagesBySelection(images, selected, true), [images[1]]);
    const missingPaths = ['missing.png', 'unselected-missing.png'];
    assert.equal(filterPathsBySelection(missingPaths, selected, false), missingPaths);
    assert.deepEqual(filterPathsBySelection(missingPaths, selected, true), ['missing.png']);
    assert.deepEqual(filterDatasetImagesBySelection(images, new Set(), true), []);
    assert.deepEqual(
      emptyStateMessages({
        status: 'success',
        liveCount: 0,
        missingCount: 0,
        selectionMode: false,
        showOnlySelected: false,
        visibleLiveCount: 0,
        visibleMissingCount: 0,
      }),
      ['No Images Found', 'This dataset is empty. Click "Add Images" to get started.'],
      'an empty underlying review set renders the generic empty state once',
    );
    assert.deepEqual(
      emptyStateMessages({
        status: 'success',
        liveCount: 0,
        missingCount: 1,
        selectionMode: true,
        showOnlySelected: true,
        visibleLiveCount: 0,
        visibleMissingCount: 1,
      }),
      [],
      'a selected missing-only preset leaves its visible missing list as the sole content',
    );
    assert.deepEqual(
      emptyStateMessages({
        status: 'success',
        liveCount: 0,
        missingCount: 1,
        selectionMode: true,
        showOnlySelected: true,
        visibleLiveCount: 0,
        visibleMissingCount: 0,
      }),
      ['No selected images to show.'],
      'a filtered missing-only preset renders only the selected-only empty state',
    );
    assert.deepEqual(
      emptyStateMessages({
        status: 'success',
        liveCount: 1,
        missingCount: 0,
        selectionMode: true,
        showOnlySelected: true,
        visibleLiveCount: 0,
        visibleMissingCount: 0,
      }),
      ['No selected images to show.'],
      'a filtered live dataset renders only the selected-only empty state',
    );
    assert.deepEqual(reconcileSelection(new Set(['a', 'missing']), ['a', 'b']), new Set(['a']));
    assert.equal(normalizeRelativeMediaPath('nested\\portrait.jpg'), 'nested/portrait.jpg');
    const requestGate = createLatestDatasetPresetRequestGate();
    const firstRequest = requestGate.begin();
    const secondRequest = requestGate.begin();
    assert.equal(firstRequest.isCurrent(), false, 'starting B makes pending A stale');
    assert.equal(secondRequest.isCurrent(), true);
    secondRequest.cancel();
    assert.equal(secondRequest.isCurrent(), false, 'cancelled current request cannot apply a result or error');
    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<T>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
      });
      return { promise, resolve, reject };
    };
    let appliedRequest: string | undefined;
    let currentRequestError: string | undefined;
    const applyWhenCurrent = async (request: ReturnType<typeof requestGate.begin>, result: Promise<string>) => {
      try {
        const value = await result;
        if (request.isCurrent()) appliedRequest = value;
      } catch (error) {
        if (request.isCurrent()) currentRequestError = error instanceof Error ? error.message : String(error);
      }
    };
    const slowA = deferred<string>();
    const fastB = deferred<string>();
    const pendingA = applyWhenCurrent(requestGate.begin(), slowA.promise);
    const pendingB = applyWhenCurrent(requestGate.begin(), fastB.promise);
    fastB.resolve('B');
    await pendingB;
    slowA.resolve('A');
    await pendingA;
    assert.equal(appliedRequest, 'B', 'out-of-order A cannot overwrite newer B');
    const staleSuccess = deferred<string>();
    const currentFailure = deferred<string>();
    const stalePending = applyWhenCurrent(requestGate.begin(), staleSuccess.promise);
    const failurePending = applyWhenCurrent(requestGate.begin(), currentFailure.promise);
    currentFailure.reject(new Error('B failed'));
    await failurePending;
    staleSuccess.resolve('A stale');
    await stalePending;
    assert.equal(appliedRequest, 'B', 'stale success cannot overwrite a failed current request');
    assert.equal(currentRequestError, 'B failed', 'only the current failure is surfaced');
    assert.doesNotMatch(
      readFileSync(resolve(process.cwd(), 'src/helpers/datasetSelection.ts'), 'utf8'),
      /from\s+['"]node:/,
      'browser-safe selection helpers cannot import Node modules',
    );
    const nativeHistory = new PositionAwareHistory();
    let leaveAttempts = 0;
    const guard = createDirtySelectionLeaveGuard(nativeHistory.value, () => leaveAttempts++);
    guard.setDirty(true);
    assert.equal(nativeHistory.length, 3, 'dirty state appends one same-URL sentinel');
    assert.equal(nativeHistory.index, 2);
    assert.equal(nativeHistory.currentUrl, 'http://localhost/datasets/example');
    assert.equal(nativeHistory.listenerCount, 1);

    nativeHistory.value.history.back();
    assert.equal(leaveAttempts, 1, 'native back opens one leave attempt');
    assert.equal(nativeHistory.length, 3, 'restoring a sentinel never appends another entry');
    assert.equal(nativeHistory.index, 2, 'cancel confirmation returns to the existing sentinel');
    guard.cancelLeaveAttempt();
    assert.equal(nativeHistory.index, 2, 'cancel keeps the one sentinel armed');
    assert.equal(nativeHistory.length, 3);
    assert.equal(nativeHistory.listenerCount, 1);

    nativeHistory.value.history.back();
    assert.equal(leaveAttempts, 2);
    guard.allowLeave();
    assert.equal(nativeHistory.index, 0, 'confirm leaves past the duplicate same-page entries');
    assert.equal(nativeHistory.currentUrl, 'http://localhost/previous');
    assert.equal(nativeHistory.listenerCount, 0);

    const topbarHistory = new PositionAwareHistory();
    let topbarAttempts = 0;
    const topbarGuard = createDirtySelectionLeaveGuard(topbarHistory.value, () => topbarAttempts++);
    topbarGuard.setDirty(true);
    topbarGuard.requestLeave();
    assert.equal(topbarAttempts, 1, 'page-owned Back follows the same native popstate path');
    assert.equal(topbarHistory.index, 2);
    topbarGuard.allowLeave();
    assert.equal(topbarHistory.index, 0);
    assert.equal(topbarHistory.currentUrl, 'http://localhost/previous');

    const cleanHistory = new PositionAwareHistory();
    const cleanGuard = createDirtySelectionLeaveGuard(cleanHistory.value, () => undefined);
    cleanGuard.setDirty(true);
    cleanGuard.setDirty(false);
    assert.equal(cleanHistory.length, 3, 'consumed sentinels remain only in forward history');
    assert.equal(cleanHistory.index, 1, 'clean transition consumes the sentinel without leaving this page');
    cleanHistory.value.history.back();
    assert.equal(cleanHistory.index, 0, 'the next Back reaches the actual prior page');

    const repeatedHistory = new PositionAwareHistory();
    let repeatedAttempts = 0;
    const repeatedGuard = createDirtySelectionLeaveGuard(repeatedHistory.value, () => repeatedAttempts++);
    repeatedGuard.setDirty(true);
    repeatedHistory.value.history.back();
    repeatedHistory.value.history.back();
    assert.equal(repeatedAttempts, 1, 'repeat popstate while a modal is pending does not reopen it');
    assert.equal(repeatedHistory.index, 2, 'repeat popstate also restores the existing sentinel');

    const disposeHistory = new PositionAwareHistory();
    const disposeGuard = createDirtySelectionLeaveGuard(disposeHistory.value, () => undefined);
    disposeGuard.setDirty(true);
    disposeGuard.dispose();
    assert.equal(disposeHistory.length, 3, 'dispose does not create or remove history entries');
    assert.equal(disposeHistory.index, 2, 'dispose never reverses an unmount navigation');
    assert.equal(disposeHistory.listenerCount, 0);

    const internalNavigation = new PositionAwareHistory(
      'http://localhost/previous',
      'http://localhost/datasets/example',
      true,
    );
    const internalGuard = createDirtySelectionLeaveGuard(internalNavigation.value, () => undefined);
    internalGuard.setDirty(true);
    let navigatedTo: string | undefined;
    internalGuard.consumeSentinelBeforeNavigation(() => {
      navigatedTo = '/jobs';
    });
    assert.equal(navigatedTo, undefined, 'router navigation waits until the sentinel has been consumed');
    await Promise.resolve();
    assert.equal(internalNavigation.index, 1, 'internal navigation returns to the underlying same-page entry first');
    assert.equal(navigatedTo, '/jobs');
    assert.equal(internalNavigation.listenerCount, 0);

    assert.equal(
      getInterceptableInternalNavigationHref(
        navigationEvent('http://localhost/jobs'),
        'http://localhost/datasets/example',
      ),
      '/jobs',
    );
    for (const event of [
      navigationEvent('http://localhost/jobs', { modified: true }),
      navigationEvent('http://localhost/jobs', { external: true }),
      navigationEvent('http://localhost/jobs', { download: true }),
      navigationEvent('http://localhost/jobs', { target: '_blank' }),
      navigationEvent('http://localhost/jobs', { button: 1 }),
    ]) {
      assert.equal(getInterceptableInternalNavigationHref(event, 'http://localhost/datasets/example'), undefined);
    }

    let missingChanges = 0;
    let missingList!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      missingList = TestRenderer.create(
        <DatasetSourceMissingList
          paths={['gone.png']}
          selectedPaths={new Set(['gone.png'])}
          selectionMode={false}
          saving={false}
          onSelectionChange={() => missingChanges++}
        />,
      );
    });
    assert.equal(
      missingList.root.findAllByType('input').length,
      0,
      'missing entries are read-only outside selection mode',
    );
    await act(async () => {
      missingList.update(
        <DatasetSourceMissingList
          paths={['gone.png']}
          selectedPaths={new Set(['gone.png'])}
          selectionMode
          saving={false}
          onSelectionChange={() => missingChanges++}
        />,
      );
    });
    const missingCheckbox = missingList.root.findByType('input');
    await act(async () => missingCheckbox.props.onChange({ target: { checked: false } }));
    assert.equal(missingChanges, 1, 'missing entries are editable only in selection mode');
    await act(async () => missingList.unmount());

    const actions: string[] = [];
    const filterChanges: boolean[] = [];
    let cancelled = 0;
    let toolbar!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      toolbar = TestRenderer.create(
        <DatasetSelectionToolbar
          selectedCount={2}
          totalCount={5}
          dirty
          saving={false}
          showOnlySelected={false}
          onShowOnlySelectedChange={showOnlySelected => filterChanges.push(showOnlySelected)}
          onAction={action => actions.push(action)}
          onCancel={() => cancelled++}
        />,
      );
    });
    const status = toolbar.root.findByProps({ role: 'status' });
    assert.match(status.children.join(''), /2 of 5 enabled/);
    assert.match(status.children.join(''), /unsaved/i);
    const selectedOnlyCheckbox = toolbar.root.findByProps({
      type: 'checkbox',
      'aria-label': 'Show only selected',
    });
    assert.equal(selectedOnlyCheckbox.props.checked, false);
    act(() => selectedOnlyCheckbox.props.onChange({ currentTarget: { checked: true } }));
    assert.deepEqual(filterChanges, [true]);
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
          showOnlySelected={false}
          onShowOnlySelectedChange={() => undefined}
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
          showOnlySelected={false}
          onShowOnlySelectedChange={() => undefined}
          onAction={action => actions.push(action)}
          onSave={() => saves++}
          onCancel={() => cancelled++}
        />,
      );
    });
    assert.equal(
      toolbar.root.findByProps({ children: 'Save preset' }).props.disabled,
      true,
      'zero selections cannot save',
    );
    await act(async () => {
      toolbar.update(
        <DatasetSelectionToolbar
          selectedCount={1}
          totalCount={5}
          dirty={false}
          saving
          showOnlySelected={false}
          onShowOnlySelectedChange={() => undefined}
          onAction={action => actions.push(action)}
          onSave={() => saves++}
          onCancel={() => cancelled++}
        />,
      );
    });
    for (const label of ['Select all', 'Select none', 'Invert selection', 'Save preset', 'Cancel']) {
      assert.equal(
        toolbar.root.findByProps({ children: label }).props.disabled,
        true,
        `${label} disables while saving`,
      );
    }
    assert.equal(
      toolbar.root.findByProps({ type: 'checkbox', 'aria-label': 'Show only selected' }).props.disabled,
      undefined,
      'selected-only view filtering remains available while saving',
    );
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
    const selectionMedia = card.root.findByProps({ 'data-selection-media': true });
    assert.equal(selectionMedia.type, 'div', 'the checkbox is the only keyboard selection control');
    assert.equal(selectionMedia.props.tabIndex, undefined);
    assert.equal(checkbox.props.checked, false);
    act(() => checkbox.props.onChange({ currentTarget: { checked: true }, stopPropagation() {} }));
    assert.deepEqual(selectionChanges, [true]);
    act(() => click(selectionMedia));
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
    await act(async () => {
      card.update(
        <DatasetImageCard
          imageUrl="photos/portrait.jpg"
          alt="portrait.jpg"
          isAutoCaptioning={false}
          selectionMode
          selectionDisabled
          selected
          onSelectionChange={(selected: boolean) => selectionChanges.push(selected)}
        />,
      );
    });
    const lockedCheckbox = card.root.findByProps({ type: 'checkbox', 'aria-label': 'Select portrait.jpg' });
    assert.equal(lockedCheckbox.props.disabled, true);
    const lockedMedia = card.root.findByProps({ 'data-selection-media': true });
    act(() => click(lockedMedia));
    assert.deepEqual(selectionChanges, [true, true], 'pending lifecycle work locks media selection');
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
