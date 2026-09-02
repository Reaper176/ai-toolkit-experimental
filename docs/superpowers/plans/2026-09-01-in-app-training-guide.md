# In-App Training Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline, server-rendered Training Guide reader to the AI Toolkit UI with chapter navigation, an article outline, and safe in-app Markdown links.

**Architecture:** A server-only loader resolves pages exclusively through `docs/book/book-manifest.json` and returns one requested chapter plus lightweight navigation metadata. Pure Markdown helpers provide deterministic headings and URL rewriting; focused React components render the responsive reader, while an optional catch-all Next route handles `/book` and nested chapters.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, `react-markdown`, `remark-gfm`, Node assertions, `react-test-renderer`.

---

## File structure

- Create `ui/src/helpers/trainingGuideMarkdown.ts`: pure path, heading, slug, and link-rewrite functions shared by loader and renderer.
- Create `ui/src/server/trainingGuideReader.ts`: manifest validation, repository-root resolution, confined file loading, and page model construction.
- Create `ui/src/components/TrainingGuideMarkdown.tsx`: trusted Markdown-to-React adapter and article styling.
- Create `ui/src/components/TrainingGuideNavigation.tsx`: focused chapter/drawer, page-outline, and previous/next exports.
- Create `ui/src/app/book/[[...slug]]/page.tsx`: optional catch-all server route and metadata.
- Create `ui/src/app/book/[[...slug]]/error.tsx`: concise reader failure boundary.
- Modify `ui/src/components/Sidebar.tsx`: add the in-app item in the approved position and expose active state.
- Delete `ui/src/components/TrainingGuideLink.tsx`: remove the duplicate GitHub-only navigation component.
- Create `ui/testing/trainingGuideReader.test.ts`: pure helper and confined-loader tests.
- Create `ui/testing/trainingGuideNavigation.test.tsx`: navigation and drawer interaction tests.
- Replace `ui/testing/trainingGuideLink.test.tsx` with `ui/testing/trainingGuidePageIntegration.test.ts`: route and sidebar integration assertions.
- Create `ui/testing/runTrainingGuideTests.mjs` and `ui/testing/tsconfig.trainingGuide.json`: fast mandatory focused gate.
- Modify `ui/testing/runTrainingBookTests.mjs` and `ui/testing/tsconfig.trainingBook.json`: keep the full book gate aware of the renamed/new artifacts.
- Modify `ui/package.json` and `ui/package-lock.json`: lock Markdown dependencies and expose `test:training-guide`.

### Task 1: Focused gate and pure Markdown behavior

**Files:**
- Create: `ui/testing/runTrainingGuideTests.mjs`
- Create: `ui/testing/tsconfig.trainingGuide.json`
- Create: `ui/testing/trainingGuideReader.test.ts`
- Create: `ui/src/helpers/trainingGuideMarkdown.ts`
- Modify: `ui/package.json`

- [ ] **Step 1: Create the focused TypeScript runner and initial failing helper tests**

Create `tsconfig.trainingGuide.json` with CommonJS output, the existing `@/*` path alias, and only the guide helper/server/component test sources. Create a runner that compiles into a uniquely named `mkdtempSync()` directory, verifies the directory is a direct child of the OS temp directory, executes every compiled `trainingGuide*.test.js`, and removes only that validated directory in `finally`.

The first test must assert these concrete contracts:

```ts
assert.equal(trainingGuideSlugFromPath('README.md'), '');
assert.equal(trainingGuideSlugFromPath('getting-started/first-lora.md'), 'getting-started/first-lora');
assert.equal(trainingGuidePathFromSlug([]), 'README.md');
assert.equal(trainingGuidePathFromSlug(['getting-started', 'first-lora']), 'getting-started/first-lora.md');
assert.equal(trainingGuidePathFromSlug(['..', 'README']), undefined);

assert.deepEqual(extractTrainingGuideHeadings('# Title\n\n## Start Here\n\n## Start Here\n\n```md\n## ignored\n```'), [
  { depth: 1, text: 'Title', id: 'title' },
  { depth: 2, text: 'Start Here', id: 'start-here' },
  { depth: 2, text: 'Start Here', id: 'start-here-1' },
]);

const allowed = new Set(['README.md', 'getting-started/first-lora.md', 'datasets/curation.md']);
assert.equal(
  rewriteTrainingGuideHref('getting-started/first-lora.md', '../datasets/curation.md#masks', allowed),
  '/book/datasets/curation#masks',
);
assert.equal(rewriteTrainingGuideHref('getting-started/first-lora.md', '#launch', allowed), '#launch');
assert.equal(rewriteTrainingGuideHref('README.md', 'https://example.com/guide', allowed), 'https://example.com/guide');
assert.equal(rewriteTrainingGuideHref('README.md', '../README.md', allowed), undefined);
```

- [ ] **Step 2: Add the package script and run the focused gate to verify RED**

Add:

```json
"test:training-guide": "node testing/runTrainingGuideTests.mjs"
```

Run: `cd ui && npm run test:training-guide`

Expected: compilation fails because `@/helpers/trainingGuideMarkdown` does not exist.

- [ ] **Step 3: Implement the minimal pure helper API**

Export these types and functions:

```ts
export interface TrainingGuideHeading {
  depth: number;
  text: string;
  id: string;
}

export function trainingGuideSlugFromPath(path: string): string;
export function trainingGuidePathFromSlug(segments: readonly string[]): string | undefined;
export function extractTrainingGuideHeadings(markdown: string): TrainingGuideHeading[];
export function createTrainingGuideHeadingSlugger(): (text: string) => string;
export function rewriteTrainingGuideHref(
  currentPath: string,
  href: string,
  allowedPaths: ReadonlySet<string>,
): string | undefined;
```

Use POSIX path normalization, accept only lowercase alphanumeric/hyphen URL segments, preserve query-free fragments, reject non-allowlisted relative Markdown targets, and ignore headings inside fenced code blocks. Generate duplicate IDs with `-1`, `-2`, and so on.

- [ ] **Step 4: Run the focused gate to verify GREEN**

Run: `cd ui && npm run test:training-guide`

Expected: all helper assertions pass and the runner removes its temporary output.

- [ ] **Step 5: Commit Task 1**

```bash
git add ui/package.json ui/src/helpers/trainingGuideMarkdown.ts ui/testing/runTrainingGuideTests.mjs ui/testing/tsconfig.trainingGuide.json ui/testing/trainingGuideReader.test.ts
git commit -m "test: add focused training guide gate"
```

### Task 2: Manifest-confined server loader

**Files:**
- Create: `ui/src/server/trainingGuideReader.ts`
- Modify: `ui/testing/trainingGuideReader.test.ts`
- Modify: `ui/testing/tsconfig.trainingGuide.json`

- [ ] **Step 1: Add failing loader fixtures**

Build each fixture below under `mkdtempSync(join(tmpdir(), 'training-guide-reader-'))`, creating `docs/book/book-manifest.json` and its Markdown pages. Clean it with a realpath/direct-child safety check.

Assert the found result shape:

```ts
const result = loadTrainingGuidePage(root, ['getting-started', 'first-lora']);
assert.equal(result.kind, 'found');
assert.equal(result.page.path, 'getting-started/first-lora.md');
assert.equal(result.page.slug, 'getting-started/first-lora');
assert.equal(result.page.title, 'First LoRA');
assert.equal(result.page.previous?.path, 'README.md');
assert.equal(result.page.next?.path, 'datasets/curation.md');
assert.deepEqual(result.page.groups.map(group => group.label), ['Overview', 'Getting Started', 'Datasets']);
```

Also assert:

```ts
const introduction = loadTrainingGuidePage(root, []);
assert.equal(introduction.kind, 'found');
assert.equal(introduction.page.path, 'README.md');
assert.deepEqual(loadTrainingGuidePage(root, ['missing']), { kind: 'not-found' });
assert.deepEqual(loadTrainingGuidePage(root, ['..', 'README']), { kind: 'not-found' });
```

Replace a manifest page with a symlink outside `docs/book` and assert `{ kind: 'unavailable' }`. Remove a listed file and assert `{ kind: 'unavailable' }`. Add an unexpected manifest key or duplicate path and assert `{ kind: 'unavailable' }` without an absolute path in the serialized result.

- [ ] **Step 2: Run the loader tests to verify RED**

Run: `cd ui && npm run test:training-guide`

Expected: compilation fails because `loadTrainingGuidePage` is missing.

- [ ] **Step 3: Implement the loader and page model**

Export:

```ts
export type TrainingGuideLoadResult =
  | { kind: 'found'; page: TrainingGuidePageModel }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

export interface TrainingGuideNavigationItem {
  path: string;
  slug: string;
  label: string;
}

export interface TrainingGuideNavigationGroup {
  key: string;
  label: string;
  items: TrainingGuideNavigationItem[];
}

export interface TrainingGuidePageModel extends TrainingGuideNavigationItem {
  markdown: string;
  title: string;
  headings: TrainingGuideHeading[];
  groups: TrainingGuideNavigationGroup[];
  previous?: TrainingGuideNavigationItem;
  next?: TrainingGuideNavigationItem;
  allowedPaths: string[];
}

export function trainingGuideRepositoryRoot(): string;
export function loadTrainingGuidePage(repositoryRoot: string, slug: readonly string[]): TrainingGuideLoadResult;
```

Resolve the default root from `TRAINING_GUIDE_REPOSITORY_ROOT` or `resolve(process.cwd(), '..')`. Validate manifest schema/version, exact page keys, unique normalized paths, reciprocal previous/next values, and `realpath` confinement under the real book directory. Derive navigation labels from filename segments without reading every chapter; derive the current title from its first H1.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `cd ui && npm run test:training-guide`

Expected: helper and loader tests pass, including symlink/traversal cases.

- [ ] **Step 5: Commit Task 2**

```bash
git add ui/src/server/trainingGuideReader.ts ui/testing/trainingGuideReader.test.ts ui/testing/tsconfig.trainingGuide.json
git commit -m "feat: load manifest-confined training guide pages"
```

### Task 3: Markdown renderer and responsive navigation

**Files:**
- Create: `ui/src/components/TrainingGuideMarkdown.tsx`
- Create: `ui/src/components/TrainingGuideNavigation.tsx`
- Create: `ui/testing/trainingGuideNavigation.test.tsx`
- Modify: `ui/testing/trainingGuideReader.test.ts`
- Modify: `ui/testing/tsconfig.trainingGuide.json`
- Modify: `ui/package.json`
- Modify: `ui/package-lock.json`

- [ ] **Step 1: Install the locked Markdown dependencies**

Run: `cd ui && npm install --save react-markdown remark-gfm`

Expected: both dependencies appear in `package.json` and exact transitive versions are recorded in `package-lock.json`.

- [ ] **Step 2: Write failing drawer and rendering-contract tests**

In `trainingGuideNavigation.test.tsx`, render `TrainingGuideChapterNavigation` with two groups and an active chapter. Render `TrainingGuidePageOutline` with two headings and `TrainingGuidePreviousNext` with both adjacent items. Assert semantic labels, `aria-current="page"`, and the collapsed mobile toggle. Open the drawer, assert `aria-expanded=true`, then dispatch Escape and an outside pointer event through a fake document listener registry; both must close it and unmount must remove listeners.

In `trainingGuideReader.test.ts`, source-check `TrainingGuideMarkdown.tsx` for `ReactMarkdown`, `remarkGfm`, rewritten anchors, deterministic heading IDs, `overflow-x-auto` on code/table containers, and the absence of `rehypeRaw` or `dangerouslySetInnerHTML`.

- [ ] **Step 3: Run focused tests to verify RED**

Run: `cd ui && npm run test:training-guide`

Expected: compilation fails because the two components do not exist.

- [ ] **Step 4: Implement the Markdown adapter**

`TrainingGuideMarkdown` accepts:

```ts
interface TrainingGuideMarkdownProps {
  markdown: string;
  currentPath: string;
  allowedPaths: readonly string[];
}
```

Create one heading slugger per render. Pass `[remarkGfm]` to `ReactMarkdown`. Map `h1` through `h4` to styled headings with deterministic IDs, map links through `rewriteTrainingGuideHref`, add `_blank`/`noopener noreferrer` only for HTTP(S) targets, and wrap `pre` and `table` in keyboard-focusable horizontal overflow containers. Do not enable raw HTML.

- [ ] **Step 5: Implement responsive navigation**

Export three focused components: `TrainingGuideChapterNavigation` accepts groups/current path, `TrainingGuidePageOutline` accepts headings, and `TrainingGuidePreviousNext` accepts the adjacent items. Render desktop chapter navigation and the right outline as separately labelled `<nav>` elements. Add a mobile `Chapters` button and fixed drawer to the chapter component; register pointerdown and keydown listeners only while open, close on outside target or Escape, and clean both listeners on close/unmount.

- [ ] **Step 6: Run focused tests and the Next type/build boundary**

Run:

```bash
cd ui
npm run test:training-guide
npx tsc --noEmit --project tsconfig.json
```

Expected: focused tests pass. Record existing unrelated TypeScript errors if the repository-wide command is not clean; no new error may originate from Training Guide files.

- [ ] **Step 7: Commit Task 3**

```bash
git add ui/package.json ui/package-lock.json ui/src/components/TrainingGuideMarkdown.tsx ui/src/components/TrainingGuideNavigation.tsx ui/testing/trainingGuideNavigation.test.tsx ui/testing/trainingGuideReader.test.ts ui/testing/tsconfig.trainingGuide.json
git commit -m "feat: render responsive training guide content"
```

### Task 4: App route and sidebar integration

**Files:**
- Create: `ui/src/app/book/[[...slug]]/page.tsx`
- Create: `ui/src/app/book/[[...slug]]/error.tsx`
- Create: `ui/testing/trainingGuidePageIntegration.test.ts`
- Modify: `ui/src/components/Sidebar.tsx`
- Delete: `ui/src/components/TrainingGuideLink.tsx`
- Delete: `ui/testing/trainingGuideLink.test.tsx`
- Modify: `ui/testing/tsconfig.trainingGuide.json`
- Modify: `ui/testing/runTrainingBookTests.mjs`
- Modify: `ui/testing/tsconfig.trainingBook.json`

- [ ] **Step 1: Write failing route/sidebar integration assertions**

Parse or source-inspect the route and sidebar to assert:

```ts
assert.deepEqual(navigationNames, ['Dashboard', 'New Job', 'Queue', 'Datasets', 'Training Guide', 'Settings']);
assert.equal(trainingGuideHref, '/book');
assert.equal(sidebarSource.includes('TrainingGuideLink'), false);
assert.match(sidebarSource, /aria-current/);
assert.match(pageSource, /loadTrainingGuidePage/);
assert.match(pageSource, /notFound\(\)/);
assert.match(pageSource, /TrainingGuideMarkdown/);
assert.match(pageSource, /TrainingGuideNavigation/);
```

Assert the error boundary visibly contains `Training Guide unavailable` and does not render an error message, stack, or path. Update the full training-book runner’s artifact contract so the deleted link test/component are no longer required and all `trainingGuide*.test.tsx?` files are mandatory.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `cd ui && npm run test:training-guide`

Expected: integration assertions fail because `/book` and the sidebar item do not exist.

- [ ] **Step 3: Add the optional catch-all server route**

Implement:

```tsx
export default async function TrainingGuidePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const result = loadTrainingGuidePage(trainingGuideRepositoryRoot(), (await params).slug ?? []);
  if (result.kind === 'not-found') notFound();
  if (result.kind === 'unavailable') return <TrainingGuideUnavailable />;
  const { page } = result;
  return (
    <div className="grid h-full min-w-0 grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      <TrainingGuideChapterNavigation
        groups={page.groups}
        currentPath={page.path}
      />
      <main className="min-w-0 overflow-y-auto px-4 py-8 sm:px-8">
        <article className="mx-auto max-w-4xl">
          <TrainingGuideMarkdown
            markdown={page.markdown}
            currentPath={page.path}
            allowedPaths={page.allowedPaths}
          />
          <TrainingGuidePreviousNext previous={page.previous} next={page.next} />
        </article>
      </main>
      <TrainingGuidePageOutline headings={page.headings} />
    </div>
  );
}
```

Use a normal document title based on the chapter title. Keep the route server-rendered and pass only serializable navigation/page data into the client navigation component.

- [ ] **Step 4: Replace the external sidebar link**

Import `BookOpen` with the existing navigation icons, insert `{ name: 'Training Guide', href: '/book', icon: BookOpen }` between Datasets and Settings, and set active state for exact routes plus nested descendants. Apply `aria-current="page"` and the existing active visual class. Remove the bottom `TrainingGuideLink` render and delete its component.

- [ ] **Step 5: Add the concise error boundary and update full-gate contracts**

The route-level client `error.tsx` must show a heading, a short offline-file availability explanation, and a retry button invoking `reset()`. It must not interpolate the caught error. Update `runTrainingBookTests.mjs` and `tsconfig.trainingBook.json` to compile/require the new integration test and pure reader/helper files instead of the deleted GitHub-link component.

- [ ] **Step 6: Run the focused guide gate and inspect the full-gate plan**

Run:

```bash
cd ui
npm run test:training-guide
npm run test:training-book -- --describe-plan
```

Expected: focused tests pass. The full runner describes the new guide test artifacts as mandatory without executing the long 452-test matrix. Run that long matrix only if the user explicitly requests it.

- [ ] **Step 7: Commit Task 4**

```bash
git add ui/src/app/book ui/src/components/Sidebar.tsx ui/testing/runTrainingBookTests.mjs ui/testing/tsconfig.trainingBook.json ui/testing/tsconfig.trainingGuide.json ui/testing/trainingGuidePageIntegration.test.ts
git rm ui/src/components/TrainingGuideLink.tsx ui/testing/trainingGuideLink.test.tsx
git commit -m "feat: add offline Training Guide route"
```

### Task 5: Acceptance, documentation integrity, and review

**Files:**
- Modify only files required by verified findings.

- [ ] **Step 1: Run final focused and regression gates**

Run:

```bash
cd ui
npm run test:training-guide
npm run test:training-presets
npm run build
```

Expected: guide tests pass; preset TAP reports 63/63 and Python reports 24 tests; Next generates all routes successfully with only known optional sensor warnings.

- [ ] **Step 2: Check generated book integrity and repository formatting**

Run from the repository root:

```bash
python scripts/generate_training_book_reference.py --check
python scripts/generate_training_book_navigation.py --check
git diff --check
git status --short --branch
```

Expected: both generators exit zero without output, diff check exits zero, and status contains only intentional Training Guide changes.

- [ ] **Step 3: Request code review against the approved specification**

Review the complete feature range against `docs/superpowers/specs/2026-09-01-in-app-training-guide-design.md`. Fix every Critical or Important finding with a new failing test first, rerun the affected gate, and request re-review until approved.

- [ ] **Step 4: Perform final verification after review fixes**

Repeat Step 1 and Step 2 after the last code change. Do not claim completion from an earlier run.

- [ ] **Step 5: Commit any review fixes and preserve the branch**

Stage each file named by `git status --short` only after confirming it belongs to a review finding, then run `git commit -m "fix: address Training Guide review"`.

If review requires no changes, do not create an empty commit. Preserve the `training-guide-ui` branch and worktree for user testing; do not merge or push without explicit authorization.
