# Dataset Review Selected Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the gap above dataset preset controls and add an accessible view-only “Show only selected” filter without changing whole-dataset selection semantics.

**Architecture:** Add browser-safe pure helpers for filtering live image entries and missing paths, expose the filter as controlled state through `DatasetSelectionToolbar`, and wire memoized visible lists into the page’s virtualized grid. The page conditionally matches `MainContent` padding to the fixed header only while selection mode is active and resets the view filter when that mode closes.

**Tech Stack:** React 19, Next.js 15, TypeScript, Tailwind CSS, React Virtuoso, Node assertions, react-test-renderer

---

### Task 1: Define Pure Selected-Only Filtering

**Files:**
- Modify: `ui/src/helpers/datasetSelection.ts`
- Test: `ui/testing/datasetPresetSelection.test.tsx`

- [ ] **Step 1: Add failing helper tests**

Extend the helper import in `ui/testing/datasetPresetSelection.test.tsx` with:

```ts
  filterDatasetImagesBySelection,
  filterPathsBySelection,
```

At the beginning of `run()`, after the existing selection equality assertions, add:

```ts
    const images = [
      { img_path: '/dataset/a.png', relative_path: 'a.png' },
      { img_path: '/dataset/b.png', relative_path: 'b.png' },
      { img_path: '/dataset/c.png', relative_path: 'c.png' },
    ];
    const selected = new Set(['b.png', 'missing.png']);
    assert.equal(
      filterDatasetImagesBySelection(images, selected, false),
      images,
      'disabled filter preserves the original image list',
    );
    assert.deepEqual(
      filterDatasetImagesBySelection(images, selected, true),
      [images[1]],
      'enabled filter shows only selected live images',
    );
    const missingPaths = ['missing.png', 'unselected-missing.png'];
    assert.equal(
      filterPathsBySelection(missingPaths, selected, false),
      missingPaths,
      'disabled filter preserves the original missing-path list',
    );
    assert.deepEqual(
      filterPathsBySelection(missingPaths, selected, true),
      ['missing.png'],
      'enabled filter preserves only selected missing paths',
    );
    assert.deepEqual(
      filterDatasetImagesBySelection(images, new Set(), true),
      [],
      'selected-only filtering supports an empty result',
    );
```

- [ ] **Step 2: Run the focused suite and verify the test fails**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: TypeScript compilation fails because `filterDatasetImagesBySelection` and `filterPathsBySelection` are not exported.

- [ ] **Step 3: Implement the pure helpers**

Add to `ui/src/helpers/datasetSelection.ts` after `applySelectionAction`:

```ts
export function filterDatasetImagesBySelection<T extends { relative_path: string }>(
  images: T[],
  selectedPaths: ReadonlySet<string>,
  showOnlySelected: boolean,
): T[] {
  if (!showOnlySelected) return images;
  return images.filter(image => selectedPaths.has(image.relative_path));
}

export function filterPathsBySelection(
  paths: string[],
  selectedPaths: ReadonlySet<string>,
  showOnlySelected: boolean,
): string[] {
  if (!showOnlySelected) return paths;
  return paths.filter(path => selectedPaths.has(path));
}
```

The disabled path deliberately returns the original array so ordinary browsing and selection mode do not allocate redundant lists.

- [ ] **Step 4: Run the focused suite and verify it passes**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: all dataset preset test artifacts compile and every test exits 0, ending with the existing success messages including `dataset selection component tests passed`.

- [ ] **Step 5: Commit the filtering helpers**

Run:

```bash
git add ui/src/helpers/datasetSelection.ts ui/testing/datasetPresetSelection.test.tsx
git commit -m "test: define selected-only dataset filtering"
```

Expected: one commit containing the helper behavior and its focused assertions.

### Task 2: Add the Controlled Toolbar Toggle

**Files:**
- Modify: `ui/src/components/DatasetSelectionToolbar.tsx`
- Test: `ui/testing/datasetPresetSelection.test.tsx`

- [ ] **Step 1: Add failing controlled-toggle tests**

Add the following required props to every `DatasetSelectionToolbar` instance in `ui/testing/datasetPresetSelection.test.tsx`:

```tsx
showOnlySelected={false}
onShowOnlySelectedChange={() => undefined}
```

For the first toolbar render, replace those two values with:

```tsx
showOnlySelected={false}
onShowOnlySelectedChange={value => filterChanges.push(value)}
```

Declare `const filterChanges: boolean[] = [];` beside `actions`. After asserting the status text, add:

```ts
    const selectedOnlyToggle = toolbar.root.findByProps({
      type: 'checkbox',
      'aria-label': 'Show only selected',
    });
    assert.equal(selectedOnlyToggle.props.checked, false);
    act(() => selectedOnlyToggle.props.onChange({ currentTarget: { checked: true } }));
    assert.deepEqual(filterChanges, [true]);
```

In the saving-state assertions, add:

```ts
    assert.equal(
      toolbar.root.findByProps({ type: 'checkbox', 'aria-label': 'Show only selected' }).props.disabled,
      undefined,
      'view filtering remains available while selection mutations are locked',
    );
```

- [ ] **Step 2: Run the focused suite and verify the test fails**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: TypeScript reports that `showOnlySelected` and `onShowOnlySelectedChange` do not exist on `DatasetSelectionToolbarProps`, or the renderer cannot find the labeled checkbox.

- [ ] **Step 3: Extend the toolbar contract**

Add to `DatasetSelectionToolbarProps`:

```ts
  showOnlySelected: boolean;
  onShowOnlySelectedChange(showOnlySelected: boolean): void;
```

Destructure both values in `DatasetSelectionToolbar`.

- [ ] **Step 4: Render the accessible controlled toggle**

Inside the toolbar’s `mx-auto` flex container, immediately after the selection status paragraph, add:

```tsx
        <label className="mr-1 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            aria-label="Show only selected"
            checked={showOnlySelected}
            onChange={event => onShowOnlySelectedChange(event.currentTarget.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span>Show only selected</span>
        </label>
```

Do not bind the toggle’s disabled state to `saving` or `readOnly`; it changes presentation, not preset data.

- [ ] **Step 5: Run the focused suite and verify it passes**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: all dataset preset tests exit 0, including the controlled toggle and saving-state assertions.

- [ ] **Step 6: Commit the toolbar control**

Run:

```bash
git add ui/src/components/DatasetSelectionToolbar.tsx ui/testing/datasetPresetSelection.test.tsx
git commit -m "feat: add selected-only dataset toggle"
```

Expected: one commit containing the toolbar API, rendered control, and component tests.

### Task 3: Wire Filtering, Empty State, and Flush Layout Into the Page

**Files:**
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Test: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Add failing page integration assertions**

In `ui/testing/datasetPresetPageIntegration.test.ts`, after parsing `pageSource`, add:

```ts
assert.match(
  pageSource,
  /const \[showOnlySelected, setShowOnlySelected\] = useState\(false\)/,
  'dataset review owns selected-only view state',
);
assert.match(
  pageSource,
  /const visibleImages = useMemo\([\s\S]*filterDatasetImagesBySelection\([\s\S]*imgList,[\s\S]*selectedPaths,[\s\S]*showOnlySelected/,
  'the virtualized image source is derived from selected-only state',
);
assert.match(
  pageSource,
  /const visibleMissingPaths = useMemo\([\s\S]*filterPathsBySelection\([\s\S]*sourceMissingPaths,[\s\S]*selectedPaths,[\s\S]*showOnlySelected/,
  'missing sources use the same selected-only view',
);
assert.match(
  pageSource,
  /<MainContent ref=\{scrollParentCallback\} className=\{selectionMode \? 'pt-12' : undefined\}>/,
  'selection controls begin flush beneath the h-12 top bar',
);
assert.match(pageSource, /showOnlySelected=\{showOnlySelected\}/, 'toolbar receives controlled filter state');
assert.match(
  pageSource,
  /onShowOnlySelectedChange=\{setShowOnlySelected\}/,
  'toolbar changes page-owned filter state',
);
assert.match(pageSource, /totalCount=\{visibleImages\.length\}/, 'virtualized count uses filtered images');
assert.match(pageSource, /const img = visibleImages\[index\]/, 'virtualized lookup uses filtered images');
assert.match(
  pageSource,
  /computeItemKey=\{index => visibleImages\[index\]\?\.relative_path \?\? index\}/,
  'virtualized keys use filtered images',
);
assert.match(pageSource, /paths=\{visibleMissingPaths\}/, 'missing-source rendering uses filtered paths');
assert.match(
  pageSource,
  /showOnlySelected && visibleImages\.length === 0 && visibleMissingPaths\.length === 0/,
  'an empty selected-only view is explained',
);
assert.match(
  pageSource,
  /setShowOnlySelected\(false\)[\s\S]*setSelectionMode\(false\)/,
  'closing selection mode resets selected-only filtering',
);
```

- [ ] **Step 2: Run the focused suite and verify the integration test fails**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: `datasetPresetPageIntegration.test.js` fails on the first missing selected-only page assertion.

- [ ] **Step 3: Add page state and memoized visible lists**

Extend the selection-helper import in `page.tsx` with:

```ts
  filterDatasetImagesBySelection,
  filterPathsBySelection,
```

Add beside the existing selection state:

```ts
  const [showOnlySelected, setShowOnlySelected] = useState(false);
```

Immediately after `sourceMissingPaths`, add:

```ts
  const visibleImages = useMemo(
    () => filterDatasetImagesBySelection(imgList, selectedPaths, showOnlySelected),
    [imgList, selectedPaths, showOnlySelected],
  );
  const visibleMissingPaths = useMemo(
    () => filterPathsBySelection(sourceMissingPaths, selectedPaths, showOnlySelected),
    [sourceMissingPaths, selectedPaths, showOnlySelected],
  );
```

- [ ] **Step 4: Reset the filter only when selection mode closes**

Update `discardSelectionRef.current` to reset the view before leaving selection mode:

```ts
  discardSelectionRef.current = () => {
    setSelectedPaths(new Set(baseSelectionRef.current));
    setShowOnlySelected(false);
    setSelectionMode(false);
  };
```

Do not reset it inside `applyLoadedVersion`; switching presets or versions while still reviewing a selection must preserve the reviewer’s chosen view.

- [ ] **Step 5: Remove the selection-mode header gap and connect the toolbar**

Change the content opening tag to:

```tsx
      <MainContent ref={scrollParentCallback} className={selectionMode ? 'pt-12' : undefined}>
```

Pass the controlled filter props to `DatasetSelectionToolbar`:

```tsx
              showOnlySelected={showOnlySelected}
              onShowOnlySelectedChange={setShowOnlySelected}
```

Keep the sticky wrapper at `top-12`; together with `pt-12`, it aligns directly beneath the `h-12` top bar.

- [ ] **Step 6: Drive both rendered lists from the filtered data**

Change the grid condition and virtualization inputs to:

```tsx
        {status === 'success' && visibleImages.length > 0 && scrollParent && (
          <VirtuosoGrid
            totalCount={visibleImages.length}
```

Within `itemContent`, use:

```ts
              const img = visibleImages[index];
```

Use the filtered list for keys:

```tsx
            computeItemKey={index => visibleImages[index]?.relative_path ?? index}
```

Pass filtered missing paths:

```tsx
        <DatasetSourceMissingList
          paths={visibleMissingPaths}
```

Do not change `handleSelectionAction`; it must continue receiving `imgList` and `sourceMissingPaths`, preserving whole-dataset bulk semantics.

- [ ] **Step 7: Add the empty-filter explanation**

Immediately before the virtualized grid, add:

```tsx
        {selectionMode &&
          showOnlySelected &&
          status === 'success' &&
          visibleImages.length === 0 &&
          visibleMissingPaths.length === 0 && (
            <p role="status" className="py-10 text-center text-sm text-gray-400">
              No selected images to show.
            </p>
          )}
```

- [ ] **Step 8: Run focused tests and verify they pass**

Run:

```bash
cd ui && npm run test:dataset-presets
```

Expected: all dataset preset tests compile and exit 0, including page integration, selection helper, and toolbar tests.

- [ ] **Step 9: Run the production build**

Run:

```bash
cd ui && npm run build
```

Expected: worker TypeScript and the Next.js production build finish successfully with exit status 0.

- [ ] **Step 10: Commit the page integration**

Run:

```bash
git add ui/src/app/datasets/'[datasetName]'/page.tsx ui/testing/datasetPresetPageIntegration.test.ts
git commit -m "fix: refine dataset preset review layout"
```

Expected: one commit containing the page state, filtered virtualization, missing-path filtering, empty state, flush layout, and integration assertions.

### Task 4: Final Behavioral and Visual Verification

**Files:**
- Verify only; no expected modifications

- [ ] **Step 1: Re-run the complete scoped verification**

Run:

```bash
cd ui && npm run test:dataset-presets && npm run build
```

Expected: every dataset preset test and the production build exit 0.

- [ ] **Step 2: Verify the implementation diff is focused**

Run from the repository root:

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git status --short --branch
```

Expected: no whitespace errors; changes are limited to the approved spec/plan, selection helper/tests, toolbar/tests, and dataset page integration; the working tree is clean.

- [ ] **Step 3: Inspect the running desktop layout**

Open the dataset review page, enter selection mode, and load a preset. Verify:

```text
The preset panel touches the bottom edge of the fixed top bar with no background strip between them.
The panel remains sticky while scrolling.
The “Show only selected” control is visible without pushing Save preset or Cancel out of the toolbar.
```

- [ ] **Step 4: Exercise filter behavior**

With a preset loaded, verify this exact sequence:

```text
1. Turn on “Show only selected”: only selected live images and selected missing paths remain.
2. Deselect a visible item: it disappears immediately.
3. Click “Invert selection”: selection changes across the full dataset, not only visible cards.
4. Click “Select none”: the empty message “No selected images to show.” appears.
5. Turn the filter off: the complete dataset returns.
6. Cancel selection mode and re-enter it: the filter is off.
7. At a narrow viewport, all controls wrap without horizontal page overflow.
```

- [ ] **Step 5: Record the final repository state**

Run:

```bash
git status --short --branch
git log -4 --oneline --decorate
```

Expected: the feature branch is clean and its recent commits correspond to the helper, toolbar, and page integration tasks.
