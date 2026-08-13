# Dataset Mask Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure grayscale mask editing to dataset selection, freeze masks into immutable preset versions, and expose the relevant loader and inverted-prior settings in job creation.

**Architecture:** A pure mask storage service owns `<dataset>_masks`; a focused canvas modal uses pure brush/history helpers. Preset manifests gain optional frozen-mask metadata, while job resolution derives managed `mask_path` and keeps training-level prior settings separate.

**Tech Stack:** Next.js 15, React 19, TypeScript, HTML Canvas, Node filesystem/crypto, `pngjs`, Prisma preset services, Python/Pillow compatibility tests.

---

### Task 1: Secure Live Mask Storage

**Files:**
- Modify: `ui/package.json`
- Modify: `ui/package-lock.json`
- Create: `ui/src/server/datasetMaskService.ts`
- Create: `ui/testing/datasetMaskService.test.ts`
- Modify: `ui/testing/tsconfig.datasetPresets.json`
- Modify: `ui/testing/runDatasetPresetTests.mjs`

- [ ] **Step 1: Add PNG decoding**

Run `npm install pngjs @types/pngjs image-size --save` from `ui/`. `pngjs` decodes and normalizes masks; `image-size` reads trusted source dimensions for PNG/JPEG/WebP without decoding full source images.

- [ ] **Step 2: Write failing service tests**

Specify this contract:

```typescript
const masks = createDatasetMaskService({ datasetsRoot, maxPngBytes: 16 * 1024 * 1024 });
await masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 128));
assert.equal((await masks.read('spade', 'sub/portrait.jpg')).exists, true);
await masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 255));
assert.equal((await masks.read('spade', 'sub/portrait.jpg')).exists, false);
```

Also reject traversal, symlink escape, unsupported/missing sources, mismatched dimensions, oversized/invalid PNG, and duplicate basenames (`a/x.jpg`, `b/x.png`). Inject rename failure and assert no partial destination or temporary files remain.

- [ ] **Step 3: Verify RED**

Run `npm run test:dataset-presets`; expect failure because `createDatasetMaskService` is missing.

- [ ] **Step 4: Implement the service**

Export:

```typescript
export interface DatasetMaskReadResult { exists: boolean; width: number; height: number; png: Buffer | null }
export function maskDatasetName(dataset: string): string;
export function maskFilename(sourcePath: string): string;
export function assertUniqueMaskBasenames(paths: readonly string[]): void;
export function createDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService;
```

Accept only PNG/JPEG/WebP source images. Use normalized paths, realpath/lstat confinement, `image-size` for source dimensions, `PNG.sync.read` for masks, `colorType: 0` output, all-white deletion, same-directory exclusive temporary creation, fsync, and atomic rename.

- [ ] **Step 5: Verify GREEN and commit**

Run `npm run test:dataset-presets`, then commit `ui/package*.json`, the service, and tests as `feat: add secure dataset mask storage`.

### Task 2: Dataset-Scoped Mask API

**Files:**
- Create: `ui/src/server/datasetMaskRouteHandlers.ts`
- Create: `ui/src/app/api/datasets/[datasetName]/masks/route.ts`
- Modify: `ui/src/app/api/img/delete/route.ts`
- Create: `ui/testing/datasetMaskRouteHandlers.test.ts`

- [ ] **Step 1: Write failing route tests**

Exercise GET/PUT/DELETE with `?source=sub/portrait.jpg`. GET returns 204 or `image/png`; PUT requires `image/png` and a bounded body; DELETE is idempotent. Assert traversal is 400, duplicate basenames are 409, and source deletion calls `deleteByAbsoluteSource(imgPath)` only after the image unlink succeeds.

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect missing route-handler exports.

- [ ] **Step 3: Implement handlers and route**

Handlers accept injected mask service dependencies. The Next route obtains `getDatasetsRoot()`, validates `datasetName`, reads only the relative `source` query value, and never accepts an absolute mask path. Refactor image deletion to use the same confined resolver and preserve caption deletion.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: add dataset mask API`.

### Task 3: Pure Canvas Mask Engine

**Files:**
- Create: `ui/src/helpers/maskEditor.ts`
- Create: `ui/testing/maskEditor.test.ts`
- Modify: `ui/testing/tsconfig.datasetPresets.json`

- [ ] **Step 1: Write failing helper tests**

Specify:

```typescript
screenToImage(point, { zoom, offsetX, offsetY });
paintStroke(mask, width, height, from, to, { value, size, hardness, opacity });
isAllWhite(mask);
createMaskHistory(initial, 20);
```

Assert zoom/pan mapping, clipped edges, soft radial falloff, opacity blending, erase-to-white, continuous strokes, input immutability, bounded undo/redo, and redo truncation.

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect the helper module to be missing.

- [ ] **Step 3: Implement minimal helpers**

Use source-pixel coordinates and deterministic interpolation between pointer samples. Blend toward `value` by `opacity * hardnessFalloff`; return new typed arrays.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: add grayscale mask editing engine`.

### Task 4: Focused Mask Editor Modal

**Files:**
- Create: `ui/src/components/DatasetMaskEditor.tsx`
- Create: `ui/src/components/DatasetMaskBadge.tsx`
- Modify: `ui/src/components/DatasetImageCard.tsx`
- Modify: `ui/src/components/DatasetSelectionToolbar.tsx`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Modify: `ui/testing/datasetPresetSelection.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing component tests**

Cover selected-live-only ordering, navigation bounds, white missing-mask initialization, save, dirty confirmation, error retention, archived preview, shortcuts, brush/eraser settings, overlay opacity, zoom/fit, and badges. Assert the page passes `datasetName`, `selectedLiveImages`, `archivedReadOnly`, and a status-refresh callback to the modal.

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect missing modal/badge/toolbar contracts.

- [ ] **Step 3: Implement the modal**

Use stacked source and overlay canvases while retaining source-resolution mask bytes. Serialize with an offscreen canvas to PNG. Add `Edit masks` to the toolbar, disabled without selected live images. Derive navigation from full selection, independent of the selected-only view filter.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: add focused dataset mask editor`.

### Task 5: Extend Preset Contracts

**Files:**
- Modify: `ui/src/types.ts`
- Modify: `ui/src/helpers/datasetPresetValidation.ts`
- Modify: `ui/src/helpers/datasetPresets.ts`
- Modify: `ui/src/components/DatasetPresetDialog.tsx`
- Modify: `ui/testing/datasetPresets.test.ts`
- Modify: `ui/testing/datasetPresetDialog.test.tsx`

- [ ] **Step 1: Write failing contract tests**

Add `invert_mask?: boolean` to `DatasetConfig`. Add `mask_min_value: number` and `invert_mask: boolean` to preset loader config; require 0–1 and boolean respectively. Keep client `mask_path` rejected. Add optional per-file fields:

```typescript
mask_path?: string | null;
mask_bytes?: number | null;
mask_sha256?: string | null;
mask_missing?: boolean;
```

Require all four together, constrain paths to `masks/<basename>.png`, and accept old manifests with none present.

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect unknown loader/manifest fields.

- [ ] **Step 3: Implement validation and controls**

Default `mask_min_value` to 0.1 and `invert_mask` to false. Add numeric and checkbox fields to the preset dialog while continuing to omit `mask_path` from requests.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: add mask settings to preset contracts`.

### Task 6: Snapshot and Verify Immutable Masks

**Files:**
- Modify: `ui/src/server/datasetPresetSnapshotService.ts`
- Modify: `ui/src/server/datasetPresetService.ts`
- Modify: `ui/testing/datasetPresetSnapshotService.test.ts`
- Modify: `ui/testing/datasetPresetService.test.ts`
- Modify: `ui/testing/datasetPresetMaintenance.test.ts`

- [ ] **Step 1: Write failing snapshot tests**

Cover new live masks, retained live masks, source-missing retained frozen masks, absent/all-white masks, duplicate basenames, mask bytes/digests, tampering, staging cleanup, and unchanged version counters after failure. A frozen entry must contain:

```json
{"mask_path":"masks/portrait.png","mask_bytes":1234,"mask_sha256":"<64 lowercase hex>","mask_missing":false}
```

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect missing copies and metadata.

- [ ] **Step 3: Implement staged snapshot behavior**

Resolve live masks through `datasetMaskService`. Carry forward prior managed masks only for source-missing retained entries. Include mask bytes in `total_bytes`, assert unique basenames before staging, and add verification mismatch kinds `mask_missing`, `mask_size`, and `mask_sha256`.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: freeze masks in dataset presets`.

### Task 7: Resolve Mask Paths and Preflight Jobs

**Files:**
- Modify: `ui/src/server/jobDatasetPresetService.ts`
- Modify: `ui/src/helpers/jobDatasetPresetClient.ts`
- Modify: `ui/src/components/DatasetSourceControl.tsx`
- Modify: `ui/testing/jobDatasetPresets.test.ts`
- Modify: `ui/testing/datasetSourceControl.test.tsx`
- Modify: `ui/testing/datasetPresetPreflightIntegration.test.ts`
- Modify: `ui/testing/jobDatasetPresetPrismaIntegration.test.ts`
- Modify: `ui/testing/datasetPresetPythonCompatibility.py`

- [ ] **Step 1: Write failing resolution tests**

Assert versions with frozen masks resolve `mask_path` to `<version-root>/masks`; maskless versions resolve null; browser overrides cannot replace it; tampering blocks preflight. Live datasets resolve `<dataset>_masks` only when matching masks exist. Assert dataset controls display read-only resolved mask status/path plus editable `mask_min_value` and `invert_mask`.

Add a Python fixture with two images and one matching mask; assert the loader attaches one mask, leaves the other unmasked, and honors `mask_min_value` plus `invert_mask`.

- [ ] **Step 2: Verify RED**

Run `npm run test:dataset-presets`; expect unresolved paths/preflight gaps.

- [ ] **Step 3: Implement server-derived paths**

After manifest verification, derive the absolute version root from `manifest_path` and set its `masks` directory only when a file has `mask_missing === false`. Never store absolute paths in manifests. Include preset version and source filename in integrity errors.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:dataset-presets`; commit as `feat: resolve immutable mask datasets`.

### Task 8: Expose Inverted Mask Prior

**Files:**
- Modify: `ui/src/types.ts`
- Modify: `ui/src/app/jobs/new/jobConfig.ts`
- Modify: `ui/src/app/jobs/new/SimpleJob.tsx`
- Modify: `ui/src/app/api/jobs/route.ts`
- Modify: `ui/src/server/jobDatasetPresetService.ts`
- Modify: `ui/src/docs.tsx`
- Create: `ui/src/helpers/maskTrainingValidation.ts`
- Create: `ui/testing/maskTrainingValidation.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Write failing validation tests**

Specify:

```typescript
validateMaskTraining({
  invertedMaskPrior: true,
  multiplier: 0.5,
  trainTurbo: false,
  datasets: [{ mask_path: '/managed/masks' }],
});
```

Accept that input; reject negative/NaN multiplier, no masked datasets, and turbo training. Assert defaults serialize as false and 0.5.

- [ ] **Step 2: Verify RED**

Run `npm run test:training-presets`; expect missing validator/type fields.

- [ ] **Step 3: Implement controls and boundary validation**

Add optional-compatible fields:

```typescript
inverted_mask_prior?: boolean;
inverted_mask_prior_multiplier?: number;
train_turbo?: boolean;
```

Place controls near differential-output preservation. Disable the toggle without resolved masks, show the reason, and validate again in `ui/src/app/api/jobs/route.ts` and preset preflight so hand-authored requests cannot bypass UI checks. Document the extra prior prediction and runtime/VRAM cost.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm run test:training-presets`; commit as `feat: expose inverted mask prior settings`.

### Task 9: Final Integration Verification

**Files:**
- Verify all files changed in Tasks 1–8.

- [ ] **Step 1: Run UI suites**

```bash
cd ui
npm run test:dataset-presets
npm run test:training-presets
npm run test:dinov3-tagger-captioner
```

Expected: all commands exit zero.

- [ ] **Step 2: Run Python verification**

```bash
cd ..
python -m pytest testing/test_dinov3_tagger_captioner.py -q
python -m py_compile toolkit/config_modules.py toolkit/dataloader_mixins.py extensions_built_in/sd_trainer/SDTrainer.py
```

Expected: tests and compilation pass.

- [ ] **Step 3: Run production build**

Run `npm run build` from `ui/`. Expected: successful Next.js build; the known optional `macos-temperature-sensor` warning may remain on Linux.

- [ ] **Step 4: Run isolated live-mask smoke test**

Use a `mktemp -d` root injected into `createDatasetMaskService`; save/read/delete one soft mask and verify normalized PNG output. Use only test preset stores. Do not touch `datasets/spade`, `aitk_db.db`, or live preset storage.

- [ ] **Step 5: Inspect final state**

Run `git diff --check` and `git status --short`. If verification requires test-only corrections, commit only those corrections as `test: verify dataset mask workflow`.
