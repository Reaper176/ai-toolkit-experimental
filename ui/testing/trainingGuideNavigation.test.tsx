import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';

import {
  TrainingGuideChapterNavigation,
  TrainingGuidePageOutline,
  TrainingGuidePreviousNext,
} from '../src/components/TrainingGuideNavigation';
import type { TrainingGuideNavigationGroup, TrainingGuideNavigationItem } from '../src/server/trainingGuideReader';

const groups: TrainingGuideNavigationGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [{ path: 'README.md', slug: '', label: 'Overview' }],
  },
  {
    key: 'getting-started',
    label: 'Getting Started',
    items: [
      {
        path: 'getting-started/first-lora.md',
        slug: 'getting-started/first-lora',
        label: 'First Lora',
      },
    ],
  },
];
const previous: TrainingGuideNavigationItem = {
  path: 'README.md',
  slug: '',
  label: 'Overview',
};
const next: TrainingGuideNavigationItem = {
  path: 'datasets/curation.md',
  slug: 'datasets/curation',
  label: 'Dataset Curation',
};

function textOf(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');
}

function button(root: ReactTestInstance, text: string): ReactTestInstance {
  const match = root.findAllByType('button').find(candidate => textOf(candidate) === text);
  assert.ok(match, `rendered button ${text}`);
  return match;
}

type CapturedListener = EventListenerOrEventListenerObject;
const documentListeners = new Map<string, CapturedListener>();
const mediaListeners = new Set<CapturedListener>();
const browserGlobal = globalThis as unknown as { document?: Document; window?: Window & typeof globalThis };
const originalDocument = browserGlobal.document;
const originalWindow = browserGlobal.window;
const insideTarget = {};
const outsideTarget = {};
const toggleTarget = {};
let activeElement: unknown;
const firstDrawerControl = {
  focus: () => {
    activeElement = firstDrawerControl;
  },
};
const lastDrawerControl = {
  focus: () => {
    activeElement = lastDrawerControl;
  },
};
const toggleNode = {
  contains: (target: unknown) => target === toggleTarget,
  focus: () => {
    activeElement = toggleNode;
  },
};
const drawerNode = {
  contains: (target: unknown) => target === insideTarget,
  focus: () => {
    activeElement = drawerNode;
  },
  querySelectorAll: () => [firstDrawerControl, lastDrawerControl],
};
const mediaQueryList = {
  matches: false,
  addEventListener: (type: string, listener: CapturedListener) => {
    assert.equal(type, 'change');
    mediaListeners.add(listener);
  },
  removeEventListener: (type: string, listener: CapturedListener) => {
    assert.equal(type, 'change');
    mediaListeners.delete(listener);
  },
};

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    get activeElement() {
      return activeElement;
    },
    addEventListener: (type: string, listener: CapturedListener) => documentListeners.set(type, listener),
    removeEventListener: (type: string, listener: CapturedListener) => {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    },
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    matchMedia: (query: string) => {
      assert.equal(query, '(min-width: 1024px)');
      return mediaQueryList;
    },
  },
});

function dispatchDocumentEvent(type: string, event: object): void {
  const listener = documentListeners.get(type);
  assert.ok(listener, `${type} listener is registered while the chapter drawer is open`);
  if (typeof listener === 'function') listener(event as Event);
  else listener.handleEvent(event as Event);
}

function dispatchMediaChange(matches: boolean): void {
  mediaQueryList.matches = matches;
  for (const listener of mediaListeners) {
    const event = { matches } as MediaQueryListEvent;
    if (typeof listener === 'function') listener(event);
    else listener.handleEvent(event);
  }
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalConsoleError(...args);
};

let renderer!: TestRenderer.ReactTestRenderer;
try {
  act(() => {
    renderer = TestRenderer.create(
      <>
        <TrainingGuideChapterNavigation groups={groups} currentPath="getting-started/first-lora.md" />
        <TrainingGuidePageOutline
          headings={[
            { depth: 1, text: 'First LoRA', id: 'first-lora' },
            { depth: 2, text: 'Configure', id: 'configure' },
          ]}
        />
        <TrainingGuidePreviousNext previous={previous} next={next} />
      </>,
      {
        createNodeMock: element =>
          (element.props as Record<string, unknown>)['data-training-guide-drawer']
            ? drawerNode
            : element.type === 'button'
              ? toggleNode
              : {},
      },
    );
  });

  const root = renderer.root;
  assert.equal(root.findByProps({ 'aria-label': 'Training guide chapters' }).type, 'nav');
  assert.equal(root.findByProps({ 'aria-label': 'On this page' }).type, 'nav');
  assert.equal(root.findByProps({ 'aria-label': 'Chapter pagination' }).type, 'nav');
  assert.equal(root.findByProps({ 'aria-current': 'page' }).props.href, '/book/getting-started/first-lora');
  assert.deepEqual(
    root
      .findByProps({ 'aria-label': 'On this page' })
      .findAllByType('a')
      .map(link => link.props.href),
    ['#first-lora', '#configure'],
  );
  assert.deepEqual(
    root
      .findByProps({ 'aria-label': 'Chapter pagination' })
      .findAllByType('a')
      .map(link => [link.props.href, textOf(link)]),
    [
      ['/book', 'PreviousOverview'],
      ['/book/datasets/curation', 'NextDataset Curation'],
    ],
  );

  const chaptersButton = button(root, 'Chapters');
  assert.equal(textOf(chaptersButton), 'Chapters');
  assert.equal(chaptersButton.props['aria-expanded'], false);
  assert.equal(root.findAllByProps({ 'data-training-guide-drawer': true }).length, 0);
  assert.equal(documentListeners.size, 0, 'closed drawer registers no document listeners');

  act(() => chaptersButton.props.onClick());
  assert.equal(button(root, 'Chapters').props['aria-expanded'], true);
  const drawer = root.findByProps({ 'data-training-guide-drawer': true });
  assert.equal(drawer.props.role, 'dialog');
  assert.equal(drawer.props['aria-modal'], true);
  assert.equal(activeElement, drawerNode, 'opening the drawer moves focus into it');
  assert.deepEqual([...documentListeners.keys()].sort(), ['keydown', 'pointerdown']);
  assert.equal(mediaListeners.size, 1);

  let tabPrevented = false;
  act(() =>
    dispatchDocumentEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => {
        tabPrevented = true;
      },
    }),
  );
  assert.equal(tabPrevented, true);
  assert.equal(activeElement, firstDrawerControl, 'Tab from the drawer moves to its first control');
  lastDrawerControl.focus();
  tabPrevented = false;
  act(() =>
    dispatchDocumentEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => {
        tabPrevented = true;
      },
    }),
  );
  assert.equal(tabPrevented, true);
  assert.equal(activeElement, firstDrawerControl, 'Tab wraps within the drawer');
  firstDrawerControl.focus();
  act(() =>
    dispatchDocumentEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      preventDefault: () => undefined,
    }),
  );
  assert.equal(activeElement, lastDrawerControl, 'Shift+Tab wraps within the drawer');

  act(() => button(root, 'Close').props.onClick());
  assert.equal(button(root, 'Chapters').props['aria-expanded'], false);
  assert.equal(activeElement, toggleNode, 'explicit close restores focus to the chapter toggle');

  act(() => button(root, 'Chapters').props.onClick());
  act(() => dispatchDocumentEvent('pointerdown', { target: toggleTarget }));
  assert.equal(button(root, 'Chapters').props['aria-expanded'], true, 'toggle pointerdown leaves click in control');
  act(() => button(root, 'Chapters').props.onClick());
  assert.equal(button(root, 'Chapters').props['aria-expanded'], false, 'the open drawer closes through its toggle');

  act(() => button(root, 'Chapters').props.onClick());
  act(() => dispatchDocumentEvent('keydown', { key: 'Escape' }));
  assert.equal(button(root, 'Chapters').props['aria-expanded'], false);
  assert.equal(activeElement, toggleNode, 'Escape restores focus to the chapter toggle');
  assert.equal(documentListeners.size, 0, 'Escape closes the drawer and removes listeners');
  assert.equal(mediaListeners.size, 0);

  act(() => button(root, 'Chapters').props.onClick());
  act(() => dispatchDocumentEvent('pointerdown', { target: outsideTarget }));
  assert.equal(button(root, 'Chapters').props['aria-expanded'], false);
  assert.equal(activeElement, toggleNode, 'outside dismissal restores focus to the chapter toggle');
  assert.equal(documentListeners.size, 0, 'outside interaction closes the drawer and removes listeners');
  assert.equal(mediaListeners.size, 0);

  act(() => button(root, 'Chapters').props.onClick());
  act(() => dispatchMediaChange(true));
  assert.equal(button(root, 'Chapters').props['aria-expanded'], false, 'desktop breakpoint closes the mobile drawer');
  assert.equal(documentListeners.size, 0, 'breakpoint close removes document listeners');
  assert.equal(mediaListeners.size, 0, 'breakpoint close removes its media listener');

  mediaQueryList.matches = false;
  act(() => button(root, 'Chapters').props.onClick());
  assert.equal(documentListeners.size, 2);
  assert.equal(mediaListeners.size, 1);
  act(() => renderer.unmount());
  assert.equal(documentListeners.size, 0, 'unmount removes open-drawer listeners');
  assert.equal(mediaListeners.size, 0, 'unmount removes the breakpoint listener');
} finally {
  console.error = originalConsoleError;
  if (originalDocument === undefined) delete browserGlobal.document;
  else {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }
  if (originalWindow === undefined) delete browserGlobal.window;
  else {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
}
