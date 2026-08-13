# Mask Editor Stable Save and Badge Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the mask editor on the current image after saving and let each mask-status badge open that image directly in editable or archived read-only mode.

**Architecture:** The dataset page owns a transient requested relative path for each modal launch. `DatasetMaskEditor` resolves that path when a launch occurs but remains mounted across badge-status refreshes; mask badges expose accessible button callbacks without owning navigation state.

**Tech Stack:** Next.js 15, React 19, TypeScript, react-test-renderer, existing dataset preset test runner.

---

### Task 1: Preserve the Active Image Across Save

**Files:**
- Modify: `ui/testing/datasetMaskEditor.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`

- [ ] **Step 1: Write a failing mounted regression test**

Add a parent harness to `datasetMaskEditor.test.tsx` that renders at least two images, opens the editor on the second image, and implements `onStatusRefresh` by changing the same badge refresh state used by the page. After clicking `Save mask`, assert the heading remains the second relative path and the counter remains `2 / 2`.

```tsx
function RefreshHarness() {
  const [refreshKey, setRefreshKey] = useState(0);
  return <>
    <span data-refresh-key={refreshKey} />
    <DatasetMaskEditor
      datasetName="set"
      selectedLiveImages={images}
      initialImagePath="b.png"
      launchToken={1}
      archivedReadOnly={false}
      open
      onClose={() => undefined}
      onStatusRefresh={() => setRefreshKey(value => value + 1)}
    />
  </>;
}
```

Also add a page contract assertion that the editor has no changing `key={maskStatusRefreshKey}`.

- [ ] **Step 2: Run the dataset tests and verify RED**

Run: `cd ui && npm run test:dataset-presets`

Expected: FAIL because `initialImagePath` and `launchToken` are not accepted and/or the page still remounts the editor with the refresh key.

- [ ] **Step 3: Remove refresh-driven remounting**

In the dataset page, remove:

```tsx
key={maskStatusRefreshKey}
```

Keep `maskStatusRefreshKey` on `DatasetImageCard` so badges refresh after a successful save.

- [ ] **Step 4: Add launch-focused editor props**

Extend the editor props:

```ts
initialImagePath?: string;
launchToken?: number;
```

Resolve the requested path only when the modal opens or `launchToken` changes:

```ts
useEffect(() => {
  if (!open || !initialImagePath) return;
  const requested = selectedLiveImages.findIndex(image => image.relative_path === initialImagePath);
  if (requested >= 0) setIndex(requested);
}, [open, launchToken, initialImagePath, selectedLiveImages]);
```

Do not include badge refresh state in this effect. Saving must update the baseline and badge status without changing `index`.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui && npm run test:dataset-presets`

Expected: PASS, including the save-position regression.

Commit:

```bash
git add ui/src/app/datasets/'[datasetName]'/page.tsx ui/src/components/DatasetMaskEditor.tsx ui/testing/datasetMaskEditor.test.tsx ui/testing/datasetPresetPageIntegration.test.ts
git commit -m "fix: preserve mask editor position after save"
```

### Task 2: Launch Mask Editing from Image Badges

**Files:**
- Modify: `ui/src/components/DatasetMaskBadge.tsx`
- Modify: `ui/src/components/DatasetImageCard.tsx`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Modify: `ui/testing/datasetPresetSelection.test.tsx`
- Modify: `ui/testing/datasetMaskEditor.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing badge behavior tests**

Specify a real button contract:

```tsx
<DatasetMaskBadge
  state="available"
  mode="edit"
  imagePath="sub/b.png"
  onActivate={() => launches.push('sub/b.png')}
/>
```

Assert it renders a `button`, exposes an accessible label such as `Edit mask for sub/b.png`, and calls `onActivate` for click and keyboard activation. Add the archived case with label `Preview frozen mask for sub/b.png`.

Add page/editor integration tests asserting a live badge opens editable mode at the clicked path and an archived badge opens read-only mode at the clicked manifest entry.

- [ ] **Step 2: Run the dataset tests and verify RED**

Run: `cd ui && npm run test:dataset-presets`

Expected: FAIL because mask badges are not buttons and the page has no targeted launch state.

- [ ] **Step 3: Implement the accessible badge button**

Give `DatasetMaskBadge` explicit activation props:

```ts
interface DatasetMaskBadgeProps {
  state: 'available' | 'missing' | 'read-only';
  mode: 'edit' | 'preview';
  imagePath: string;
  onActivate(): void;
}
```

Render a native `<button type="button">`; retain the existing visible status text and styling. A native button supplies Enter/Space behavior without custom key handlers. Stop propagation so badge activation does not also trigger card selection or the image viewer.

- [ ] **Step 4: Thread launch callbacks through image cards**

Add this optional card prop:

```ts
onMaskOpen?: (relativePath: string) => void;
```

Pass the card's `relative_path`, current live/archived mode, and callback to `DatasetMaskBadge`. Keep existing mask-status polling unchanged for live cards and disabled for archived cards.

- [ ] **Step 5: Add targeted launch state to the dataset page**

Store a request that changes even when the same badge is clicked twice:

```ts
const [maskEditorLaunch, setMaskEditorLaunch] = useState({ path: '', token: 0 });
const openMaskEditorAt = (path: string) => {
  setMaskEditorLaunch(current => ({ path, token: current.token + 1 }));
  setMaskEditorOpen(true);
};
```

Pass `onMaskOpen={openMaskEditorAt}` to live and archived cards. Pass `initialImagePath={maskEditorLaunch.path}` and `launchToken={maskEditorLaunch.token}` to the editor. The toolbar's general `Edit masks` action may clear the path or select the first current entry, but must not reorder the image list.

- [ ] **Step 6: Verify live, archived, and refresh behavior**

Run: `cd ui && npm run test:dataset-presets`

Expected: PASS with live badge launch, archived read-only launch, keyboard activation, and save-position tests.

Run: `cd ui && npm run build`

Expected: successful Next.js production build; the existing optional `macos-temperature-sensor` warning may remain on Linux.

- [ ] **Step 7: Inspect and commit**

Run:

```bash
git diff --check
git status --short
```

Commit:

```bash
git add ui/src/components/DatasetMaskBadge.tsx ui/src/components/DatasetImageCard.tsx ui/src/app/datasets/'[datasetName]'/page.tsx ui/src/components/DatasetMaskEditor.tsx ui/testing/datasetPresetSelection.test.tsx ui/testing/datasetMaskEditor.test.tsx ui/testing/datasetPresetPageIntegration.test.ts
git commit -m "feat: open mask editor from image badges"
```
