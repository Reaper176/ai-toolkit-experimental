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

type CapturedListener = EventListenerOrEventListenerObject;
const documentListeners = new Map<string, CapturedListener>();
const browserGlobal = globalThis as unknown as { document?: Document };
const originalDocument = browserGlobal.document;
const insideTarget = {};
const outsideTarget = {};
const toggleTarget = {};

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    addEventListener: (type: string, listener: CapturedListener) => documentListeners.set(type, listener),
    removeEventListener: (type: string, listener: CapturedListener) => {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    },
  },
});

function dispatchDocumentEvent(type: string, event: object): void {
  const listener = documentListeners.get(type);
  assert.ok(listener, `${type} listener is registered while the chapter drawer is open`);
  if (typeof listener === 'function') listener(event as Event);
  else listener.handleEvent(event as Event);
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
            ? { contains: (target: unknown) => target === insideTarget }
            : element.type === 'button'
              ? { contains: (target: unknown) => target === toggleTarget }
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

  const chaptersButton = root.findByType('button');
  assert.equal(textOf(chaptersButton), 'Chapters');
  assert.equal(chaptersButton.props['aria-expanded'], false);
  assert.equal(root.findAllByProps({ 'data-training-guide-drawer': true }).length, 0);
  assert.equal(documentListeners.size, 0, 'closed drawer registers no document listeners');

  act(() => chaptersButton.props.onClick());
  assert.equal(root.findByType('button').props['aria-expanded'], true);
  assert.equal(root.findAllByProps({ 'data-training-guide-drawer': true }).length, 1);
  assert.deepEqual([...documentListeners.keys()].sort(), ['keydown', 'pointerdown']);

  act(() => dispatchDocumentEvent('pointerdown', { target: toggleTarget }));
  assert.equal(root.findByType('button').props['aria-expanded'], true, 'toggle pointerdown leaves click in control');
  act(() => root.findByType('button').props.onClick());
  assert.equal(root.findByType('button').props['aria-expanded'], false, 'the open drawer closes through its toggle');

  act(() => root.findByType('button').props.onClick());
  act(() => dispatchDocumentEvent('keydown', { key: 'Escape' }));
  assert.equal(root.findByType('button').props['aria-expanded'], false);
  assert.equal(documentListeners.size, 0, 'Escape closes the drawer and removes listeners');

  act(() => root.findByType('button').props.onClick());
  act(() => dispatchDocumentEvent('pointerdown', { target: outsideTarget }));
  assert.equal(root.findByType('button').props['aria-expanded'], false);
  assert.equal(documentListeners.size, 0, 'outside interaction closes the drawer and removes listeners');

  act(() => root.findByType('button').props.onClick());
  assert.equal(documentListeners.size, 2);
  act(() => renderer.unmount());
  assert.equal(documentListeners.size, 0, 'unmount removes open-drawer listeners');
} finally {
  console.error = originalConsoleError;
  if (originalDocument === undefined) delete browserGlobal.document;
  else {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
}
