import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';

const repositoryRoot = process.env.TRAINING_BOOK_REPOSITORY_ROOT;
assert.ok(repositoryRoot, 'TRAINING_BOOK_REPOSITORY_ROOT is required');

const sidebarPath = join(repositoryRoot, 'ui', 'src', 'components', 'Sidebar.tsx');
const pagePath = join(repositoryRoot, 'ui', 'src', 'app', 'book', '[[...slug]]', 'page.tsx');
const errorBoundaryPath = join(repositoryRoot, 'ui', 'src', 'app', 'book', '[[...slug]]', 'error.tsx');

function sourceAt(path: string): string {
  assert.equal(existsSync(path), true, `required source is missing: ${path}`);
  return readFileSync(path, 'utf8');
}

test('puts the offline Training Guide in the primary sidebar navigation', () => {
  const sidebarSource = sourceAt(sidebarPath);
  const navigationSource = sidebarSource.match(/const navigation = \[([\s\S]*?)\n  \];/u)?.[1];
  assert.ok(navigationSource, 'Sidebar declares its primary navigation array');

  const navigationEntries = [...navigationSource.matchAll(/\{ name: '([^']+)', href: '([^']+)'/gu)].map(match => ({
    name: match[1],
    href: match[2],
  }));
  assert.deepEqual(
    navigationEntries.map(entry => entry.name),
    ['Dashboard', 'New Job', 'Queue', 'Datasets', 'Training Guide', 'Settings'],
  );
  assert.equal(navigationEntries.find(entry => entry.name === 'Training Guide')?.href, '/book');
  assert.equal(sidebarSource.includes('TrainingGuideLink'), false);
  assert.match(sidebarSource, /BookOpen/u);
  assert.match(sidebarSource, /pathname === item\.href/u);
  assert.match(sidebarSource, /pathname\.startsWith\(`\$\{item\.href\}\/[`]?\)/u);
  assert.match(sidebarSource, /aria-current=\{active \? 'page' : undefined\}/u);
  assert.match(sidebarSource, /active[\s\S]*?bg-gray-800/u);
});

test('marks only the most-specific matching sidebar destination as current', () => {
  type CommonJsLoad = (request: string, parent: unknown, isMain: boolean) => unknown;
  const commonJsModule = Module as unknown as { _load: CommonJsLoad };
  const originalLoad = commonJsModule._load;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const ignoredComponents = new Set(['./ThemeToggle', './ThemeLogo', './ActiveJobWidget', './OstrisCloudBalance']);
  let pathname = '/jobs/new';

  commonJsModule._load = (request, parent, isMain) => {
    if (request === 'next/link') {
      const Link = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement('a', props, children);
      return { __esModule: true, default: Link };
    }
    if (request === 'next/navigation') return { usePathname: () => pathname };
    if (request === 'lucide-react' || request === 'react-icons/fa6') {
      const Icon = (props: Record<string, unknown>) => React.createElement('svg', props);
      return new Proxy({}, { get: () => Icon });
    }
    if (request === 'react-global-hooks') {
      return { createGlobalState: () => ({ use: () => [false, () => undefined] }) };
    }
    if (ignoredComponents.has(request)) return { __esModule: true, default: () => null };
    return originalLoad(request, parent, isMain);
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { body: { style: { overflow: '' } } },
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (!String(args[0]).includes('react-test-renderer is deprecated')) originalConsoleError(...args);
  };
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  try {
    const Sidebar = (require('../src/components/Sidebar') as { default: React.ComponentType }).default;
    const currentDestinations = () => [
      ...new Set(
        renderer?.root
          .findAllByType('a')
          .filter(link => link.props['aria-current'] === 'page')
          .map(link => link.props.href),
      ),
    ];

    act(() => {
      renderer = TestRenderer.create(React.createElement(Sidebar));
    });
    assert.deepEqual(currentDestinations(), ['/jobs/new']);

    pathname = '/book/reference/training';
    act(() => renderer?.update(React.createElement(Sidebar)));
    assert.deepEqual(currentDestinations(), ['/book']);
  } finally {
    if (renderer !== undefined) act(() => renderer?.unmount());
    console.error = originalConsoleError;
    commonJsModule._load = originalLoad;
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document');
    else Object.defineProperty(globalThis, 'document', originalDocument);
  }
});

test('defines a server-rendered optional catch-all guide page', () => {
  const pageSource = sourceAt(pagePath);

  assert.equal(pageSource.includes("'use client'"), false);
  assert.match(pageSource, /params:\s*Promise<\{ slug\?: string\[\] \}>/u);
  assert.match(pageSource, /loadTrainingGuidePage\(repositoryRoot, slug\)/u);
  assert.match(pageSource, /loadTrainingGuideRoutePage\(trainingGuideRepositoryRoot\(\), \.\.\.slug\)/u);
  assert.match(pageSource, /if \(result\.kind === 'not-found'\) notFound\(\);/u);
  assert.match(pageSource, /if \(result\.kind === 'unavailable'\)[\s\S]*?<TrainingGuideUnavailable/u);
  assert.match(pageSource, /TrainingGuideChapterNavigation/u);
  assert.match(pageSource, /groups=\{page\.groups\}/u);
  assert.match(pageSource, /currentPath=\{page\.path\}/u);
  assert.match(pageSource, /TrainingGuideMarkdown/u);
  assert.match(pageSource, /markdown=\{page\.markdown\}/u);
  assert.match(pageSource, /allowedPaths=\{page\.allowedPaths\}/u);
  assert.match(pageSource, /TrainingGuidePreviousNext/u);
  assert.match(pageSource, /TrainingGuidePageOutline/u);
  assert.match(pageSource, /grid-cols-1 lg:grid-cols-\[16rem_minmax\(0,1fr\)_14rem\]/u);
  assert.doesNotMatch(pageSource, /<main\b/u);
  assert.match(pageSource, /<div[^>]*overflow-y-auto/u);
  assert.equal(pageSource.match(/loadTrainingGuidePage\(/gu)?.length, 1);
  assert.match(pageSource, /cache\(/u);
  assert.match(pageSource, /generateMetadata/u);
  assert.match(pageSource, /title:\s*result\.page\.title/u);
});

test('shares route loading across metadata and body while preserving all outcomes', async () => {
  type CommonJsLoad = (request: string, parent: unknown, isMain: boolean) => unknown;
  const commonJsModule = Module as unknown as { _load: CommonJsLoad };
  const originalLoad = commonJsModule._load;
  const notFoundError = new Error('not-found sentinel');
  const loadCalls: Array<{ repositoryRoot: string; slug: readonly string[] }> = [];
  let result: Record<string, unknown> = {
    kind: 'found',
    page: {
      groups: [],
      path: 'getting-started/first-lora.md',
      markdown: '# First LoRA',
      title: 'First LoRA',
      allowedPaths: ['getting-started/first-lora.md'],
      headings: [{ depth: 1, text: 'First LoRA', id: 'first-lora' }],
      previous: undefined,
      next: undefined,
    },
  };

  commonJsModule._load = (request, parent, isMain) => {
    if (request === 'react') {
      const realReact = originalLoad(request, parent, isMain) as typeof React;
      return {
        ...realReact,
        cache:
          (load: (...args: never[]) => unknown) =>
          (...args: never[]) => {
            const memoized = routeCache.get(JSON.stringify(args));
            if (memoized !== undefined) return memoized;
            const value = load(...args);
            routeCache.set(JSON.stringify(args), value);
            return value;
          },
      };
    }
    if (request === 'next/navigation') {
      return {
        notFound: () => {
          throw notFoundError;
        },
      };
    }
    if (request === '@/server/trainingGuideReader') {
      return {
        trainingGuideRepositoryRoot: () => '/repository',
        loadTrainingGuidePage: (repositoryRoot: string, slug: readonly string[]) => {
          loadCalls.push({ repositoryRoot, slug });
          return result;
        },
      };
    }
    if (request === '@/components/TrainingGuideMarkdown') {
      const Markdown = ({ markdown }: { markdown: string }) =>
        React.createElement('div', { 'data-markdown': markdown });
      return { __esModule: true, default: Markdown };
    }
    if (request === '@/components/TrainingGuideNavigation') {
      return {
        TrainingGuideChapterNavigation: ({ currentPath }: { currentPath: string }) =>
          React.createElement('nav', { 'data-current-path': currentPath }),
        TrainingGuidePreviousNext: () => React.createElement('nav', { 'data-pagination': true }),
        TrainingGuidePageOutline: () => React.createElement('aside', { 'data-outline': true }),
      };
    }
    return originalLoad(request, parent, isMain);
  };
  const routeCache = new Map<string, unknown>();

  try {
    const route = require('../src/app/book/[[...slug]]/page') as {
      default: (props: { params: Promise<{ slug?: string[] }> }) => Promise<React.ReactElement>;
      generateMetadata: (props: { params: Promise<{ slug?: string[] }> }) => Promise<{ title?: string }>;
    };
    const foundParams = Promise.resolve({ slug: ['getting-started', 'first-lora'] });
    assert.deepEqual(await route.generateMetadata({ params: foundParams }), { title: 'First LoRA' });
    const foundMarkup = renderToStaticMarkup(await route.default({ params: foundParams }));
    assert.equal(foundMarkup.includes('<main'), false);
    assert.match(foundMarkup, /<article/u);
    assert.match(foundMarkup, /data-markdown="# First LoRA"/u);
    assert.match(foundMarkup, /data-current-path="getting-started\/first-lora\.md"/u);
    assert.equal(loadCalls.length, 1, 'metadata and page share one request-memoized guide load');

    result = { kind: 'unavailable' };
    const unavailableMarkup = renderToStaticMarkup(
      await route.default({ params: Promise.resolve({ slug: ['unavailable'] }) }),
    );
    assert.match(unavailableMarkup, /Training Guide unavailable/u);
    assert.match(unavailableMarkup, /offline training guide files/u);

    result = { kind: 'not-found' };
    const missingParams = Promise.resolve({ slug: ['missing'] });
    assert.deepEqual(await route.generateMetadata({ params: missingParams }), { title: 'Training Guide' });
    await assert.rejects(
      () => route.default({ params: missingParams }),
      error => error === notFoundError,
    );
    assert.equal(loadCalls.length, 3, 'each distinct slug loads once across route consumers');
  } finally {
    commonJsModule._load = originalLoad;
  }
});

test('keeps route failures concise without disclosing caught error details', () => {
  const errorSource = sourceAt(errorBoundaryPath);

  assert.match(errorSource, /^'use client';/u);
  assert.match(errorSource, /Training Guide unavailable/u);
  assert.match(errorSource, /offline/u);
  assert.match(errorSource, /file/iu);
  assert.match(errorSource, /onClick=\{reset\}/u);
  assert.doesNotMatch(errorSource, /\.message|\.stack|pathname|error\.toString|\{error\}/u);
});
