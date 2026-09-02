import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';

import {
  extractTrainingGuideHeadings,
  rewriteTrainingGuideHref,
  trainingGuidePathFromSlug,
  trainingGuideSlugFromPath,
} from '../src/helpers/trainingGuideMarkdown';
import { loadTrainingGuidePage, trainingGuideRepositoryRoot } from '../src/server/trainingGuideReader';

const FIXTURE_PREFIX = 'training-guide-reader-';

interface ManifestPageFixture {
  path: string;
  previous: string | null;
  next: string | null;
  [key: string]: unknown;
}

interface ManifestFixture {
  schema_version: number;
  book_revision: number;
  verified_date: string;
  pages: ManifestPageFixture[];
  preset_architectures: string[];
  focused_architectures: string[];
  full_architectures: string[];
  required_footer: string;
  [key: string]: unknown;
}

interface TrainingGuideFixture {
  root: string;
  bookDirectory: string;
  manifest: ManifestFixture;
  writeManifest(): void;
}

function assertSafeFixtureRoot(root: string): void {
  const realTempDirectory = realpathSync(tmpdir());
  const realRoot = realpathSync(root);
  const relativeRoot = relative(realTempDirectory, realRoot);
  const isDirectChild =
    realpathSync(dirname(realRoot)) === realTempDirectory &&
    relativeRoot !== '' &&
    relativeRoot !== '..' &&
    !relativeRoot.startsWith(`..${sep}`) &&
    !isAbsolute(relativeRoot) &&
    !relativeRoot.includes(sep);
  if (!isDirectChild || !basename(realRoot).startsWith(FIXTURE_PREFIX)) {
    throw new Error(`Refusing unsafe fixture cleanup: ${realRoot}`);
  }
}

function withTrainingGuideFixture(run: (fixture: TrainingGuideFixture) => void): void {
  const root = mkdtempSync(join(tmpdir(), FIXTURE_PREFIX));
  const bookDirectory = join(root, 'docs', 'book');
  mkdirSync(join(bookDirectory, 'getting-started'), { recursive: true });
  mkdirSync(join(bookDirectory, 'datasets'), { recursive: true });
  writeFileSync(join(bookDirectory, 'README.md'), '# Overview\n\nWelcome.\n');
  writeFileSync(join(bookDirectory, 'getting-started', 'first-lora.md'), '# First LoRA\n\n## Configure\n\nTrain it.\n');
  writeFileSync(join(bookDirectory, 'datasets', 'curation.md'), '# Dataset Curation\n');

  const manifest: ManifestFixture = {
    schema_version: 1,
    book_revision: 1,
    verified_date: '2026-09-01',
    pages: [
      { path: 'README.md', previous: null, next: 'getting-started/first-lora.md' },
      {
        path: 'getting-started/first-lora.md',
        previous: 'README.md',
        next: 'datasets/curation.md',
      },
      {
        path: 'datasets/curation.md',
        previous: 'getting-started/first-lora.md',
        next: null,
      },
    ],
    preset_architectures: [],
    focused_architectures: [],
    full_architectures: [],
    required_footer: 'Fixture footer.',
  };
  const writeManifest = () => {
    writeFileSync(join(bookDirectory, 'book-manifest.json'), JSON.stringify(manifest));
  };
  writeManifest();

  try {
    run({ root, bookDirectory, manifest, writeManifest });
  } finally {
    assertSafeFixtureRoot(root);
    rmSync(root, { recursive: true });
  }
}

function withFileSwapAfterRealpath<T>(logicalPath: string, replacementPath: string, run: () => T): T {
  const originalRealpathSync = fs.realpathSync;
  let swapped = false;
  const racingRealpathSync = ((target: string) => {
    const result = originalRealpathSync(target);
    if (!swapped && target === logicalPath) {
      rmSync(logicalPath);
      symlinkSync(replacementPath, logicalPath);
      swapped = true;
    }
    return result;
  }) as unknown as typeof fs.realpathSync;
  Object.defineProperty(fs, 'realpathSync', { configurable: true, value: racingRealpathSync, writable: true });
  try {
    const result = run();
    assert.equal(swapped, true, 'fixture must replace the target after realpath resolution');
    return result;
  } finally {
    Object.defineProperty(fs, 'realpathSync', { configurable: true, value: originalRealpathSync, writable: true });
  }
}

function withFileSwapAfterStat<T>(logicalPath: string, replacementPath: string, run: () => T): T {
  const originalStatSync = fs.statSync;
  let swapped = false;
  const racingStatSync = ((target: string, options?: { bigint?: boolean }) => {
    const result = (originalStatSync as unknown as (path: string, statOptions?: { bigint?: boolean }) => unknown)(
      target,
      options,
    );
    if (!swapped && target === logicalPath) {
      rmSync(logicalPath);
      symlinkSync(replacementPath, logicalPath);
      swapped = true;
    }
    return result;
  }) as unknown as typeof fs.statSync;
  Object.defineProperty(fs, 'statSync', { configurable: true, value: racingStatSync, writable: true });
  try {
    const result = run();
    assert.equal(swapped, true, 'fixture must replace the target after stat identity verification');
    return result;
  } finally {
    Object.defineProperty(fs, 'statSync', { configurable: true, value: originalStatSync, writable: true });
  }
}

test('converts guide paths and URL segments', () => {
  assert.equal(trainingGuideSlugFromPath('README.md'), '');
  assert.equal(trainingGuideSlugFromPath('getting-started/first-lora.md'), 'getting-started/first-lora');
  assert.equal(trainingGuidePathFromSlug([]), 'README.md');
  assert.equal(trainingGuidePathFromSlug(['getting-started', 'first-lora']), 'getting-started/first-lora.md');
  assert.equal(trainingGuidePathFromSlug(['..', 'README']), undefined);
});

test('extracts unique heading IDs and ignores fenced code', () => {
  const markdown = '# Title\n\n## Start Here\n\n## Start Here\n\n```md\n## ignored\n```';

  assert.deepEqual(extractTrainingGuideHeadings(markdown), [
    { depth: 1, text: 'Title', id: 'title' },
    { depth: 2, text: 'Start Here', id: 'start-here' },
    { depth: 2, text: 'Start Here', id: 'start-here-1' },
  ]);
});

test('rewrites allowlisted Markdown links and preserves safe links', () => {
  const allowedPaths = new Set(['README.md', 'getting-started/first-lora.md', 'datasets/curation.md']);

  assert.equal(
    rewriteTrainingGuideHref('getting-started/first-lora.md', '../datasets/curation.md#masks', allowedPaths),
    '/book/datasets/curation#masks',
  );
  assert.equal(rewriteTrainingGuideHref('README.md', '#launch', allowedPaths), '#launch');
  assert.equal(
    rewriteTrainingGuideHref('README.md', 'https://example.com/guide', allowedPaths),
    'https://example.com/guide',
  );
  assert.equal(rewriteTrainingGuideHref('README.md', '../README.md', allowedPaths), undefined);
});

test('rejects ambiguous or unsafe relative guide links', () => {
  const allowedPaths = new Set(['README.md', 'datasets/curation.md']);

  assert.equal(rewriteTrainingGuideHref('README.md', '/README.md', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', '%2e%2e/README.md', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', '..\\README.md', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', 'datasets/curation.md?mode=full', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', 'datasets/image.png', allowedPaths), undefined);
});

test('loads a manifest-listed chapter and derives its page model', () => {
  withTrainingGuideFixture(({ root }) => {
    const result = loadTrainingGuidePage(root, ['getting-started', 'first-lora']);

    assert.equal(result.kind, 'found');
    if (result.kind !== 'found') return;
    assert.equal(result.page.path, 'getting-started/first-lora.md');
    assert.equal(result.page.slug, 'getting-started/first-lora');
    assert.equal(result.page.label, 'First Lora');
    assert.equal(result.page.title, 'First LoRA');
    assert.equal(result.page.markdown, '# First LoRA\n\n## Configure\n\nTrain it.\n');
    assert.deepEqual(result.page.headings, [
      { depth: 1, text: 'First LoRA', id: 'first-lora' },
      { depth: 2, text: 'Configure', id: 'configure' },
    ]);
    assert.equal(result.page.previous?.path, 'README.md');
    assert.equal(result.page.next?.path, 'datasets/curation.md');
    assert.deepEqual(
      result.page.groups.map(group => group.label),
      ['Overview', 'Getting Started', 'Datasets'],
    );
    assert.deepEqual(result.page.allowedPaths, ['README.md', 'getting-started/first-lora.md', 'datasets/curation.md']);
  });
});

test('loads the root introduction and returns not-found for missing or malformed slugs', () => {
  withTrainingGuideFixture(({ root }) => {
    const introduction = loadTrainingGuidePage(root, []);

    assert.equal(introduction.kind, 'found');
    if (introduction.kind === 'found') assert.equal(introduction.page.path, 'README.md');
    assert.deepEqual(loadTrainingGuidePage(root, ['missing']), { kind: 'not-found' });
    assert.deepEqual(loadTrainingGuidePage(root, ['..', 'README']), { kind: 'not-found' });
  });
});

test('resolves the configured repository root and otherwise defaults above the UI cwd', () => {
  const previousRoot = process.env.TRAINING_GUIDE_REPOSITORY_ROOT;
  try {
    process.env.TRAINING_GUIDE_REPOSITORY_ROOT = '/configured/training-guide-root';
    assert.equal(trainingGuideRepositoryRoot(), '/configured/training-guide-root');
    delete process.env.TRAINING_GUIDE_REPOSITORY_ROOT;
    assert.equal(trainingGuideRepositoryRoot(), resolve(process.cwd(), '..'));
  } finally {
    if (previousRoot === undefined) delete process.env.TRAINING_GUIDE_REPOSITORY_ROOT;
    else process.env.TRAINING_GUIDE_REPOSITORY_ROOT = previousRoot;
  }
});

test('fails closed when any manifest-listed page resolves outside the real book directory', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    const listedPage = join(bookDirectory, 'datasets', 'curation.md');
    const outsidePage = join(root, 'outside.md');
    rmSync(listedPage);
    writeFileSync(outsidePage, '# Outside\n');
    symlinkSync(outsidePage, listedPage);

    assert.deepEqual(loadTrainingGuidePage(root, ['getting-started', 'first-lora']), {
      kind: 'unavailable',
    });
  });
});

test('fails closed when any manifest-listed page is missing', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    rmSync(join(bookDirectory, 'datasets', 'curation.md'));

    assert.deepEqual(loadTrainingGuidePage(root, ['getting-started', 'first-lora']), {
      kind: 'unavailable',
    });
  });
});

test('rejects unexpected manifest keys and duplicate paths without exposing absolute paths', () => {
  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.unexpected = true;
    writeManifest();

    const result = loadTrainingGuidePage(root, []);
    assert.deepEqual(result, { kind: 'unavailable' });
    assert.equal(JSON.stringify(result).includes(root), false);
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.pages[1].unexpected = true;
    writeManifest();

    const result = loadTrainingGuidePage(root, []);
    assert.deepEqual(result, { kind: 'unavailable' });
    assert.equal(JSON.stringify(result).includes(root), false);
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.pages.push({ ...manifest.pages[2] });
    writeManifest();

    const result = loadTrainingGuidePage(root, []);
    assert.deepEqual(result, { kind: 'unavailable' });
    assert.equal(JSON.stringify(result).includes(root), false);
  });
});

test('rejects unsupported versions and non-reciprocal manifest navigation', () => {
  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.schema_version = 2;
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.pages[1].previous = null;
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });
});

test('rejects duplicate JSON object keys before exact manifest validation', () => {
  withTrainingGuideFixture(({ root, bookDirectory, manifest }) => {
    const source = JSON.stringify(manifest).replace('"schema_version":1,', '"schema_version":1,"schema_version":1,');
    writeFileSync(join(bookDirectory, 'book-manifest.json'), source);

    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });

  withTrainingGuideFixture(({ root, bookDirectory, manifest }) => {
    const source = JSON.stringify(manifest).replace('"path":"README.md",', '"path":"README.md","path":"README.md",');
    writeFileSync(join(bookDirectory, 'book-manifest.json'), source);

    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });
});

test('rejects invalid dates, empty strings, and duplicate architecture entries', () => {
  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.verified_date = 'not-a-date';
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.required_footer = '';
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.full_architectures = ['anima', 'anima'];
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });

  withTrainingGuideFixture(({ root, manifest, writeManifest }) => {
    manifest.full_architectures = [''];
    writeManifest();
    assert.deepEqual(loadTrainingGuidePage(root, []), { kind: 'unavailable' });
  });
});

test('loads canonical nested README slugs through the manifest', () => {
  withTrainingGuideFixture(({ root, bookDirectory, manifest, writeManifest }) => {
    manifest.pages[1].next = 'examples/README.md';
    manifest.pages[2] = {
      path: 'examples/README.md',
      previous: 'getting-started/first-lora.md',
      next: null,
    };
    mkdirSync(join(bookDirectory, 'examples'));
    writeFileSync(join(bookDirectory, 'examples', 'README.md'), '# Configuration Examples\n');
    rmSync(join(bookDirectory, 'datasets', 'curation.md'));
    writeManifest();

    const result = loadTrainingGuidePage(root, ['examples', 'readme']);
    assert.equal(result.kind, 'found');
    if (result.kind !== 'found') return;
    assert.equal(result.page.path, 'examples/README.md');
    assert.equal(result.page.slug, 'examples/readme');
    assert.equal(result.page.label, 'Examples');
    assert.equal(result.page.title, 'Configuration Examples');
  });
});

test('derives navigation without requiring headings from non-current chapters', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    writeFileSync(
      join(bookDirectory, 'datasets', 'curation.md'),
      'This listed chapter intentionally has no heading.\n',
    );

    const result = loadTrainingGuidePage(root, ['getting-started', 'first-lora']);
    assert.equal(result.kind, 'found');
    if (result.kind === 'found') {
      assert.equal(result.page.groups[2].items[0].label, 'Curation');
    }
  });
});

test('preserves manifest page order when a root page follows section groups', () => {
  withTrainingGuideFixture(({ root, bookDirectory, manifest, writeManifest }) => {
    manifest.pages[2].next = 'glossary.md';
    manifest.pages.push({ path: 'glossary.md', previous: 'datasets/curation.md', next: null });
    writeFileSync(join(bookDirectory, 'glossary.md'), '# Glossary\n');
    writeManifest();

    const result = loadTrainingGuidePage(root, []);
    assert.equal(result.kind, 'found');
    if (result.kind !== 'found') return;
    assert.deepEqual(
      result.page.groups.map(group => group.label),
      ['Overview', 'Getting Started', 'Datasets', 'Glossary'],
    );
    assert.deepEqual(
      result.page.groups.flatMap(group => group.items.map(item => item.path)),
      manifest.pages.map(page => page.path),
    );
  });
});

test('returns not-found for an unknown valid slug before validating listed page files', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    rmSync(join(bookDirectory, 'datasets', 'curation.md'));

    assert.deepEqual(loadTrainingGuidePage(root, ['missing']), { kind: 'not-found' });
  });
});

test('rejects a manifest whose pathname identity changes after realpath resolution', () => {
  withTrainingGuideFixture(({ root, bookDirectory, manifest }) => {
    const manifestPath = join(bookDirectory, 'book-manifest.json');
    const outsideManifestPath = join(root, 'outside-manifest.json');
    writeFileSync(outsideManifestPath, JSON.stringify(manifest));

    const result = withFileSwapAfterRealpath(manifestPath, outsideManifestPath, () => loadTrainingGuidePage(root, []));
    assert.deepEqual(result, { kind: 'unavailable' });
    assert.equal(JSON.stringify(result).includes(root), false);
  });
});

test('rejects a requested page whose pathname identity changes after realpath resolution', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    const pagePath = join(bookDirectory, 'getting-started', 'first-lora.md');
    const outsidePagePath = join(root, 'outside-page.md');
    writeFileSync(outsidePagePath, '# Escaped Page\n');

    const result = withFileSwapAfterRealpath(pagePath, outsidePagePath, () =>
      loadTrainingGuidePage(root, ['getting-started', 'first-lora']),
    );
    assert.deepEqual(result, { kind: 'unavailable' });
    assert.equal(JSON.stringify(result).includes(root), false);
  });
});

test('uses exact bigint file identity stats', () => {
  withTrainingGuideFixture(({ root }) => {
    const originalFstatSync = fs.fstatSync;
    const originalStatSync = fs.statSync;
    const fstatOptions: Array<boolean> = [];
    const statOptions: Array<boolean> = [];
    const observingFstatSync = ((descriptor: number, options?: { bigint?: boolean }) => {
      fstatOptions.push(options?.bigint === true);
      return (originalFstatSync as unknown as (fd: number, statOptions?: { bigint?: boolean }) => unknown)(
        descriptor,
        options,
      );
    }) as unknown as typeof fs.fstatSync;
    const observingStatSync = ((target: string, options?: { bigint?: boolean }) => {
      statOptions.push(options?.bigint === true);
      return (originalStatSync as unknown as (path: string, statOptions?: { bigint?: boolean }) => unknown)(
        target,
        options,
      );
    }) as unknown as typeof fs.statSync;
    Object.defineProperty(fs, 'fstatSync', { configurable: true, value: observingFstatSync, writable: true });
    Object.defineProperty(fs, 'statSync', { configurable: true, value: observingStatSync, writable: true });
    let result;
    try {
      result = loadTrainingGuidePage(root, []);
    } finally {
      Object.defineProperty(fs, 'fstatSync', { configurable: true, value: originalFstatSync, writable: true });
      Object.defineProperty(fs, 'statSync', { configurable: true, value: originalStatSync, writable: true });
    }

    assert.equal(result.kind, 'found');
    assert.ok(fstatOptions.length > 0);
    assert.ok(statOptions.length > 0);
    assert.equal(fstatOptions.every(Boolean), true);
    assert.equal(statOptions.every(Boolean), true);
  });
});

test('reads verified manifest and Markdown descriptors after their pathnames change', () => {
  withTrainingGuideFixture(({ root, bookDirectory }) => {
    const manifestPath = join(bookDirectory, 'book-manifest.json');
    const outsideManifestPath = join(root, 'outside-manifest.json');
    writeFileSync(outsideManifestPath, '{"invalid":true}');

    const result = withFileSwapAfterStat(manifestPath, outsideManifestPath, () => loadTrainingGuidePage(root, []));
    assert.equal(result.kind, 'found');
    if (result.kind === 'found') assert.equal(result.page.title, 'Overview');
  });

  withTrainingGuideFixture(({ root, bookDirectory }) => {
    const pagePath = join(bookDirectory, 'getting-started', 'first-lora.md');
    const outsidePagePath = join(root, 'outside-page.md');
    writeFileSync(outsidePagePath, '# Escaped Page\n');

    const result = withFileSwapAfterStat(pagePath, outsidePagePath, () =>
      loadTrainingGuidePage(root, ['getting-started', 'first-lora']),
    );
    assert.equal(result.kind, 'found');
    if (result.kind === 'found') assert.equal(result.page.title, 'First LoRA');
  });
});

test('keeps the Markdown renderer deterministic, safe, and horizontally scrollable', () => {
  const source = fs.readFileSync(join(process.cwd(), 'src', 'components', 'TrainingGuideMarkdown.tsx'), 'utf8');

  assert.match(source, /import ReactMarkdown from ['"]react-markdown['"]/u);
  assert.match(source, /import remarkGfm from ['"]remark-gfm['"]/u);
  assert.match(source, /remarkPlugins=\{\[remarkGfm\]\}/u);
  assert.match(source, /rewriteTrainingGuideHref/u);
  assert.match(source, /createTrainingGuideHeadingSlugger/u);
  assert.match(source, /headingTextFromSource/u);
  assert.match(source, /markdown\.slice/u);
  assert.doesNotMatch(
    source,
    /\{ children, \.\.\.props \}/u,
    'renderer-only AST nodes are not spread onto DOM elements',
  );
  assert.ok(
    (source.match(/overflow-x-auto/gu)?.length ?? 0) >= 2,
    'code and table renderers both use horizontally scrollable containers',
  );
  assert.doesNotMatch(source, /rehypeRaw/u);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/u);
});
