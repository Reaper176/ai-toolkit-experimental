# Versioned Dataset Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immutable, versioned dataset presets that freeze selected media, captions, and loader settings and record exact preset provenance on every training job.

**Architecture:** Pure TypeScript helpers define the manifest, selection, loader-setting, and job-resolution contracts. Server-only snapshot and persistence services securely publish managed files under `<DATA_ROOT>/dataset_presets`, while thin Next.js routes expose them to focused dataset-browser and training-editor components. Dedicated usage rows connect immutable versions to jobs, and queue/worker preflight prevents training from a missing snapshot.

**Tech Stack:** TypeScript, React 19, Next.js 15 route handlers, Prisma 6 with SQLite, Node filesystem/crypto APIs, Python dataset configuration compatibility, Node assertions and `react-test-renderer` for focused tests.

---

## Execution Preconditions

Before Task 1, use `superpowers:using-git-worktrees` to create an isolated
feature worktree. Run `cd ui && npm run test:training-presets` and
`cd ui && npm run build` there once to establish the baseline. Do not change
or regenerate the user's root `aitk_db.db` during tests; Prisma integration
tests must use a temporary copied schema and temporary SQLite database.

## File Map

### Pure contracts and tests

- Create `ui/src/helpers/datasetPresets.ts`: manifest schema, loader allowlist,
  validation, deterministic serialization, selection reducer, and job dataset
  metadata helpers.
- Create `ui/testing/datasetPresets.test.ts`: pure manifest, path, settings,
  selection, and resolution tests.
- Create `ui/testing/tsconfig.datasetPresets.json`: focused compilation graph.
- Create `ui/testing/runDatasetPresetTests.mjs`: guarded temporary-build runner.
- Modify `ui/package.json`: add `test:dataset-presets`.

### Snapshot storage and persistence

- Create `ui/src/server/datasetPresetSnapshotService.ts`: safe source/snapshot
  paths, staging, streamed copy/hash, publication, verification, quarantine,
  and stale-staging cleanup.
- Create `ui/src/server/datasetPresetService.ts`: Prisma-independent business
  service over a store interface.
- Create `ui/src/server/datasetPresetPrismaStore.ts`: Prisma implementation of
  preset, version, and usage persistence.
- Create `ui/src/server/datasetPresetRouteHandlers.ts`: request limits and
  framework-independent HTTP results.
- Modify `ui/prisma/schema.prisma`: preset, immutable version, and job-usage
  relations.
- Create focused service, filesystem, route, and Prisma integration tests under
  `ui/testing/datasetPreset*.test.ts`.

### Routes and client UI

- Create `ui/src/app/api/dataset-presets/route.ts`: list and create.
- Create `ui/src/app/api/dataset-presets/[presetId]/route.ts`: rename,
  archive/restore, and preset detail.
- Create `ui/src/app/api/dataset-presets/[presetId]/versions/route.ts`: list and
  publish versions.
- Create `ui/src/app/api/dataset-preset-versions/[versionId]/route.ts`: detail
  and eligible permanent deletion.
- Create `ui/src/app/api/dataset-preset-versions/[versionId]/verify/route.ts`:
  full integrity verification.
- Create `ui/src/hooks/useDatasetPresets.tsx`: reusable list/detail loading.
- Create `ui/src/components/DatasetSelectionToolbar.tsx`: selection mode and
  complete-list batch actions.
- Create `ui/src/components/DatasetPresetDialog.tsx`: name, note, caption, and
  loader-setting form.
- Create `ui/src/components/DatasetSourceControl.tsx`: live-versus-preset and
  version selection for one training dataset block.
- Create `ui/src/components/DatasetProvenance.tsx`: read-only job usage panel.
- Modify `ui/src/components/DatasetImageCard.tsx`: accessible selection overlay.
- Modify `ui/src/app/datasets/[datasetName]/page.tsx`: selection draft and
  create/edit flows.
- Modify `ui/src/app/jobs/new/SimpleJob.tsx`: render dataset source control.
- Modify `ui/src/app/jobs/new/page.tsx`: preserve preset metadata through job
  hydration and save.
- Modify `ui/src/components/JobOverview.tsx`: render provenance.
- Modify `ui/src/hooks/useJob.tsx`: type the single-job response with ordered
  dataset provenance.

### Job resolution and training safety

- Create `ui/src/server/jobDatasetPresetService.ts`: resolve browser dataset
  blocks, transact usage rows, and preflight serialized jobs.
- Modify `ui/src/app/api/jobs/route.ts`: delegate create/update resolution and
  include provenance on single-job reads.
- Modify `ui/src/app/api/jobs/[jobID]/start/route.ts`: queue-time preflight.
- Modify `ui/cron/actions/startJob.ts`: worker-time preflight.
- Modify `ui/src/types.ts`: browser and resolved dataset-preset metadata types.
- Create `ui/testing/jobDatasetPresets.test.ts` and focused source-contract
  integration tests.

## Task 1: Add the Focused Test Harness and Pure Contracts

**Files:**
- Create: `ui/src/helpers/datasetPresets.ts`
- Create: `ui/testing/datasetPresets.test.ts`
- Create: `ui/testing/tsconfig.datasetPresets.json`
- Create: `ui/testing/runDatasetPresetTests.mjs`
- Modify: `ui/package.json`

- [ ] **Step 1: Add the test command and guarded runner**

Add this script to `ui/package.json`:

```json
"test:dataset-presets": "node testing/runDatasetPresetTests.mjs"
```

Create `ui/testing/tsconfig.datasetPresets.json` by copying the compiler options
from `testing/tsconfig.trainingPresets.json`. Set `include` to:

```json
[
  "../src/helpers/datasetPresets.ts",
  "../src/server/datasetPresetSnapshotService.ts",
  "../src/server/datasetPresetService.ts",
  "../src/server/datasetPresetRouteHandlers.ts",
  "../src/server/jobDatasetPresetService.ts",
  "../src/components/DatasetSelectionToolbar.tsx",
  "../src/components/DatasetPresetDialog.tsx",
  "../src/components/DatasetSourceControl.tsx",
  "../src/components/DatasetProvenance.tsx",
  "datasetPreset*.test.ts",
  "datasetPreset*.test.tsx",
  "jobDatasetPresets.test.ts"
]
```

Create `ui/testing/runDatasetPresetTests.mjs` from
`testing/runTrainingPresetTests.mjs`, changing the temporary prefix to
`ai-toolkit-dataset-presets-`, the tsconfig name to
`tsconfig.datasetPresets.json`, and the required compiled test list to:

```js
const testFiles = [
  'datasetPresets.test.js',
  'datasetPresetSnapshotService.test.js',
  'datasetPresetService.test.js',
  'datasetPresetRouteHandlers.test.js',
  'datasetPresetSelection.test.js',
  'datasetPresetDialog.test.js',
  'datasetSourceControl.test.js',
  'datasetPresetPageIntegration.test.js',
  'jobDatasetPresets.test.js',
  'datasetProvenance.test.js',
  'datasetPresetPreflightIntegration.test.js',
];
```

Keep the existing runner's `realpathSync(tmpdir())`, direct argument-array
spawning, exact-parent check, owned-prefix check, alias symlink, and guarded
recursive cleanup unchanged.

- [ ] **Step 2: Write the failing pure-contract tests**

Create `ui/testing/datasetPresets.test.ts` with fixtures that assert the public
contract below:

```ts
import assert from 'node:assert/strict';
import {
  DATASET_PRESET_SCHEMA_VERSION,
  applySelectionAction,
  buildDatasetPresetManifest,
  manifestSha256,
  normalizePresetName,
  normalizeRelativeMediaPath,
  validateLoaderConfig,
  validateManifest,
} from '../src/helpers/datasetPresets';

const loader = validateLoaderConfig({
  caption_ext: 'txt', default_caption: '', caption_dropout_rate: 0.05,
  shuffle_tokens: false, num_repeats: 1, resolution: [512, 768, 1024],
  is_reg: false, network_weight: 1, cache_latents_to_disk: false,
  flip_x: false, flip_y: false, num_frames: 1,
  shrink_video_to_frames: true, fps: 24, auto_frame_count: false,
  do_i2v: false, do_audio: false, audio_normalize: false,
  audio_preserve_pitch: false, controls: [],
});
const manifest = buildDatasetPresetManifest({
  preset_id: 'preset-1', version: 1, preset_name: 'Faces',
  source_dataset: 'my-images', created_at: '2026-08-10T12:00:00.000Z',
  note: null, loader_config: loader,
  files: [{ source_path: 'sub/a.jpg', managed_path: 'media/sub/a.jpg',
    media_bytes: 3, media_sha256: 'a'.repeat(64), caption_ext: 'txt',
    caption_text: 'person', caption_bytes: 6,
    caption_sha256: 'b'.repeat(64), caption_missing: false }],
});
assert.equal(manifest.schema_version, DATASET_PRESET_SCHEMA_VERSION);
assert.deepEqual(validateManifest(manifest), manifest);
assert.equal(manifestSha256(manifest), manifestSha256({ ...manifest }));
assert.deepEqual(normalizePresetName('  Faces  '), { name: 'Faces', nameKey: 'faces' });
assert.equal(normalizeRelativeMediaPath('sub\\a.jpg'), 'sub/a.jpg');
for (const value of ['', '../a.jpg', '/a.jpg', 'C:\\a.jpg', 'a\0.jpg']) {
  assert.throws(() => normalizeRelativeMediaPath(value));
}
assert.throws(() => validateLoaderConfig({ ...loader, mask_path: '/tmp/masks' }));
assert.throws(() => validateLoaderConfig({ ...loader, unknown_key: true }));
assert.deepEqual(applySelectionAction(new Set(['a']), ['a', 'b'], 'invert'), new Set(['b']));
assert.deepEqual(applySelectionAction(new Set(), ['a', 'b'], 'all'), new Set(['a', 'b']));
assert.deepEqual(applySelectionAction(new Set(['a']), ['a', 'b'], 'none'), new Set());
console.log('Dataset preset pure-contract tests passed');
```

- [ ] **Step 3: Run the tests and verify RED**

Run `cd ui && npm run test:dataset-presets`.

Expected: TypeScript reports that `src/helpers/datasetPresets.ts` is missing.

- [ ] **Step 4: Implement the pure module**

Define and export these exact contracts in
`ui/src/helpers/datasetPresets.ts`:

```ts
export const DATASET_PRESET_SCHEMA_VERSION = 1 as const;
export const DATASET_PRESET_NAME_MAX = 80;
export const DATASET_PRESET_NOTE_MAX = 500;

export const LOADER_CONFIG_KEYS = [
  'caption_ext', 'default_caption', 'caption_dropout_rate', 'shuffle_tokens',
  'num_repeats', 'resolution', 'is_reg', 'network_weight',
  'cache_latents_to_disk', 'flip_x', 'flip_y', 'num_frames',
  'shrink_video_to_frames', 'fps', 'auto_frame_count', 'do_i2v', 'do_audio',
  'audio_normalize', 'audio_preserve_pitch', 'controls',
] as const;

export interface DatasetPresetLoaderConfig {
  caption_ext: string; default_caption: string; caption_dropout_rate: number;
  shuffle_tokens: boolean; num_repeats: number; resolution: number[];
  is_reg: boolean; network_weight: number; cache_latents_to_disk: boolean;
  flip_x: boolean; flip_y: boolean; num_frames: number;
  shrink_video_to_frames: boolean; fps: number; auto_frame_count: boolean;
  do_i2v: boolean; do_audio: boolean; audio_normalize: boolean;
  audio_preserve_pitch: boolean; controls: string[];
}
export interface DatasetPresetManifestFile {
  source_path: string; managed_path: string; media_bytes: number;
  media_sha256: string; caption_ext: string; caption_text: string | null;
  caption_bytes: number | null; caption_sha256: string | null;
  caption_missing: boolean;
}
export interface DatasetPresetManifestV1 {
  schema_version: 1; preset_id: string; version: number; preset_name: string;
  source_dataset: string; created_at: string; note: string | null;
  loader_config: DatasetPresetLoaderConfig; media_count: number;
  total_bytes: number; files: DatasetPresetManifestFile[];
}
export interface DatasetPresetReference {
  version_id: string; preset_id: string; preset_name: string; version: number;
  manifest_sha256: string;
}
export type SelectionAction = 'all' | 'none' | 'invert';
```

Implement `normalizePresetName`, `normalizeRelativeMediaPath`,
`validateLoaderConfig`, `buildDatasetPresetManifest`, `validateManifest`,
`serializeManifest`, `manifestSha256`, and `applySelectionAction`. Use
`createHash('sha256')`, stable literal key insertion, sorted normalized file
paths, `JSON.stringify(value, null, 2) + '\n'`, finite-number/range checks,
non-empty resolution arrays, and an exact-key allowlist. Reject every external
path key named in the design. Return defensive copies from every validator.

- [ ] **Step 5: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`.

Expected: `Dataset preset pure-contract tests passed`; the runner then reports
the next required test artifact as missing. Temporarily keep only
`datasetPresets.test.js` in `testFiles` until later tasks add each artifact.

Commit:

```bash
git add ui/package.json ui/src/helpers/datasetPresets.ts ui/testing/datasetPresets.test.ts ui/testing/tsconfig.datasetPresets.json ui/testing/runDatasetPresetTests.mjs
git commit -m "test: define dataset preset contracts"
```

## Task 2: Build Secure Immutable Snapshot Storage

**Files:**
- Create: `ui/src/server/datasetPresetSnapshotService.ts`
- Create: `ui/testing/datasetPresetSnapshotService.test.ts`
- Modify: `ui/testing/runDatasetPresetTests.mjs`

- [ ] **Step 1: Write failing filesystem tests**

Use `mkdtempSync(join(tmpdir(), 'aitk-dataset-snapshot-test-'))` and create a
source tree containing `sub/a.jpg`, `sub/a.txt`, `b.png`, and an empty
`b.txt`. Assert that publishing selected paths:

```ts
const publication = await store.stageVersion({
  presetId: 'preset-1', version: 1, presetName: 'Faces',
  sourceDataset: 'my-images', sourceRoot, selectedPaths: ['sub/a.jpg', 'b.png'],
  captionExt: 'txt', loaderConfig, note: null,
});
await publication.publish();
const verified = await store.verifyFast(publication.manifestPath);
assert.equal(verified.media_count, 2);
assert.equal(readFileSync(join(publication.versionRoot, 'media/sub/a.txt'), 'utf8'), 'person');
assert.equal(verified.files.find(file => file.source_path === 'b.png')?.caption_text, '');
```

Also assert rejection of traversal, symlinks escaping `sourceRoot`, changed
source size/mtime during a test copy hook, and missing newly selected files.
Publish v2 using `retainedPaths: ['sub/a.jpg']`, `priorManifestPath`, and a
deleted original `sub/a.jpg`; assert the retained bytes come from v1. Assert
`rollback()` removes staging/final output, `verifyFull()` detects modified
bytes, and `quarantineVersion()`/`restoreQuarantine()` round-trip the directory.

- [ ] **Step 2: Run the focused test and verify RED**

Add `datasetPresetSnapshotService.test.js` to the runner, run
`cd ui && npm run test:dataset-presets`, and expect the missing module error.

- [ ] **Step 3: Implement the snapshot service**

Export these exact interfaces:

```ts
export interface StageVersionInput {
  presetId: string; version: number; presetName: string; sourceDataset: string;
  sourceRoot: string; selectedPaths: string[]; retainedPaths?: string[];
  priorManifestPath?: string; captionExt: string;
  loaderConfig: DatasetPresetLoaderConfig; note: string | null;
}
export interface StagedPublication {
  versionRoot: string; manifestPath: string; manifest: DatasetPresetManifestV1;
  manifestSha256: string; publish(): Promise<void>; rollback(): Promise<void>;
}
export interface DatasetPresetSnapshotStore {
  stageVersion(input: StageVersionInput): Promise<StagedPublication>;
  readManifest(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  verifyFast(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  verifyFull(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  resolveMediaRoot(relativeManifestPath: string): string;
  quarantineVersion(relativeManifestPath: string): Promise<{ restore(): Promise<void>; remove(): Promise<void> }>;
  cleanupStaging(olderThan: Date): Promise<string[]>;
}
export function createDatasetPresetSnapshotStore(dataRoot: string): DatasetPresetSnapshotStore;
```

Resolve storage under `path.join(dataRoot, 'dataset_presets')`. Open source
files only after `realpath` confirms they remain below the real source root.
Stream each file through `createReadStream`, a SHA-256 hash, and
`createWriteStream`; compare pre/post `stat` size and `mtimeMs`. Write caption
text as exact bytes. Stage below `<preset-id>/.staging-<uuid>`, publish with
same-filesystem `rename`, and make rollback idempotent. Never follow snapshot
symlinks. `verifyFast` validates the manifest and `lstat`s every listed regular
file; `verifyFull` additionally hashes each file.

- [ ] **Step 4: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`; expect both current test files to
pass.

```bash
git add ui/src/server/datasetPresetSnapshotService.ts ui/testing/datasetPresetSnapshotService.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: add immutable dataset snapshot storage"
```

## Task 3: Add Prisma Models and the Preset Business Service

**Files:**
- Modify: `ui/prisma/schema.prisma`
- Create: `ui/src/server/datasetPresetService.ts`
- Create: `ui/src/server/datasetPresetPrismaStore.ts`
- Create: `ui/testing/datasetPresetService.test.ts`
- Create: `ui/testing/datasetPresetPrismaIntegration.test.ts`
- Modify: `ui/testing/runDatasetPresetTests.mjs`

- [ ] **Step 1: Add failing service tests with an in-memory store**

Define an in-memory store implementing the interfaces below. Test create v1,
create v2, stable case-insensitive uniqueness, monotonically increasing
versions, rename, archive/restore, archived-new-use rejection, historical-use
allowance, and referenced-version delete rejection. Simulate a database create
failure after `publish()` and assert the publication is rolled back.

- [ ] **Step 2: Run tests and verify RED**

Add `datasetPresetService.test.js` to the runner and expect the missing service
module error.

- [ ] **Step 3: Extend the Prisma schema**

Add the following models and add
`dataset_preset_usages JobDatasetPresetUsage[]` to `Job`:

```prisma
model DatasetPreset {
  id          String                 @id @default(uuid())
  name        String
  name_key    String                 @unique
  archived_at DateTime?
  created_at  DateTime               @default(now())
  updated_at  DateTime               @updatedAt
  versions    DatasetPresetVersion[]
  @@index([name])
}

model DatasetPresetVersion {
  id              String                  @id @default(uuid())
  preset_id       String
  version         Int
  source_dataset  String
  manifest_path   String
  manifest_sha256 String
  loader_config   String
  note            String?
  media_count     Int
  total_bytes     BigInt
  created_at      DateTime                @default(now())
  preset          DatasetPreset           @relation(fields: [preset_id], references: [id], onDelete: Restrict)
  job_usages      JobDatasetPresetUsage[]
  @@unique([preset_id, version])
  @@index([preset_id])
}

model JobDatasetPresetUsage {
  id                     String               @id @default(uuid())
  job_id                 String
  preset_version_id      String
  dataset_index          Int
  preset_name            String
  preset_version         Int
  manifest_sha256        String
  resolved_loader_config String
  job                    Job                  @relation(fields: [job_id], references: [id], onDelete: Cascade)
  preset_version_record  DatasetPresetVersion @relation(fields: [preset_version_id], references: [id], onDelete: Restrict)
  @@unique([job_id, dataset_index])
  @@index([preset_version_id])
}
```

- [ ] **Step 4: Implement service and Prisma adapter contracts**

Export `DatasetPresetStore`, `DatasetPresetService`, and
`createDatasetPresetService`. The public service methods are:

```ts
export interface DatasetPresetSummary {
  id: string; name: string; archived_at: string | null;
  latest_version: number; version_count: number; media_count: number;
  total_bytes: string; created_at: string; updated_at: string;
}
export interface DatasetPresetVersionRecord {
  id: string; preset_id: string; version: number; source_dataset: string;
  manifest_path: string; manifest_sha256: string;
  loader_config: DatasetPresetLoaderConfig; note: string | null;
  media_count: number; total_bytes: string; created_at: string;
}
export interface DatasetPresetVersionDetail extends DatasetPresetVersionRecord {
  manifest: DatasetPresetManifestV1;
}
export interface DatasetPresetDetail extends DatasetPresetSummary {
  versions: DatasetPresetVersionRecord[];
}
export interface PublishPresetInput {
  name: string; source_dataset: string; selected_paths: string[];
  caption_ext: string; loader_config: DatasetPresetLoaderConfig;
  note: string | null;
}
export interface PublishVersionInput extends Omit<PublishPresetInput, 'name'> {
  base_version_id: string; retained_paths: string[];
}
export interface DatasetPresetStore {
  listActive(): Promise<DatasetPresetSummary[]>;
  getPreset(id: string): Promise<DatasetPresetDetail | null>;
  findPresetByNameKey(nameKey: string): Promise<DatasetPresetDetail | null>;
  createPreset(name: string, nameKey: string): Promise<DatasetPresetDetail>;
  deleteEmptyPreset(id: string): Promise<void>;
  latestVersion(presetId: string): Promise<DatasetPresetVersionRecord | null>;
  insertVersion(input: Omit<DatasetPresetVersionRecord, 'created_at'>): Promise<DatasetPresetVersionRecord>;
  updateName(id: string, name: string, nameKey: string): Promise<DatasetPresetDetail>;
  setArchived(id: string, archivedAt: Date | null): Promise<DatasetPresetDetail>;
  getVersion(id: string): Promise<DatasetPresetVersionRecord | null>;
  countVersionUsages(id: string): Promise<number>;
  deleteVersion(id: string): Promise<void>;
}
export interface DatasetPresetService {
  listActive(): Promise<DatasetPresetSummary[]>;
  getPreset(id: string): Promise<DatasetPresetDetail>;
  createPreset(input: PublishPresetInput): Promise<DatasetPresetDetail>;
  publishVersion(presetId: string, input: PublishVersionInput): Promise<DatasetPresetVersionRecord>;
  rename(presetId: string, name: string): Promise<DatasetPresetDetail>;
  setArchived(presetId: string, archived: boolean): Promise<DatasetPresetDetail>;
  getVersion(versionId: string): Promise<DatasetPresetVersionDetail>;
  deleteVersion(versionId: string): Promise<void>;
  verifyVersion(versionId: string, full: boolean): Promise<DatasetPresetManifestV1>;
}
```

The store exposes only the CRUD and transaction primitives these methods use.
Map Prisma `P2002` to a named conflict error and `P2025` to not-found. Convert
Prisma `BigInt` byte totals to decimal strings in every DTO so route JSON never
receives a `bigint`. Serialize loader configs with stable JSON. Use a
per-preset promise queue in the service plus the Prisma unique constraint;
retry version allocation once on a version conflict. Permanent deletion must
check usage count, quarantine files, delete the row, restore on database
failure, and remove quarantine after success.

- [ ] **Step 5: Add temporary-database Prisma integration coverage**

Copy `prisma/schema.prisma` to a test temporary directory, replace the datasource
URL with the temporary SQLite file, run `prisma generate` and `prisma db push`
against that schema, and test real create/version/usage/restrict/cascade
behavior. Never point this test at `aitk_db.db`.

- [ ] **Step 6: Run tests, generate the normal client, and commit**

Run:

```bash
cd ui
npx prisma validate
npx prisma generate
npm run test:dataset-presets
```

Expected: schema validation and generation succeed; all current focused tests
pass.

```bash
git add ui/prisma/schema.prisma ui/src/server/datasetPresetService.ts ui/src/server/datasetPresetPrismaStore.ts ui/testing/datasetPresetService.test.ts ui/testing/datasetPresetPrismaIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: persist versioned dataset presets"
```

## Task 4: Add Thin, Validated API Routes

**Files:**
- Create: `ui/src/server/datasetPresetRouteHandlers.ts`
- Create: `ui/src/app/api/dataset-presets/route.ts`
- Create: `ui/src/app/api/dataset-presets/[presetId]/route.ts`
- Create: `ui/src/app/api/dataset-presets/[presetId]/versions/route.ts`
- Create: `ui/src/app/api/dataset-preset-versions/[versionId]/route.ts`
- Create: `ui/src/app/api/dataset-preset-versions/[versionId]/verify/route.ts`
- Create: `ui/testing/datasetPresetRouteHandlers.test.ts`

- [ ] **Step 1: Write failing route-handler tests**

Use a fake service and assert status/body mappings for list, create, publish,
rename, archive/restore, detail, delete, and verify. Cover malformed JSON,
non-object bodies, an empty selection, more than 50,000 selected paths, a
1 MiB JSON request, duplicate names (409), not found (404), referenced delete
(409), invalid paths/settings (400), and unexpected storage errors (500 with
no absolute path in the response).

- [ ] **Step 2: Run tests and verify RED**

Add `datasetPresetRouteHandlers.test.js` to the runner. Run the focused suite
and expect the missing route-handler module error.

- [ ] **Step 3: Implement framework-independent handlers and route adapters**

Use this result boundary:

```ts
export interface RouteResult { status: number; body: unknown; }
export interface DatasetPresetRouteHandlers {
  list(): Promise<RouteResult>;
  create(request: Request): Promise<RouteResult>;
  detail(presetId: string): Promise<RouteResult>;
  update(presetId: string, request: Request): Promise<RouteResult>;
  versions(presetId: string): Promise<RouteResult>;
  publish(presetId: string, request: Request): Promise<RouteResult>;
  version(versionId: string): Promise<RouteResult>;
  removeVersion(versionId: string): Promise<RouteResult>;
  verify(versionId: string): Promise<RouteResult>;
}
```

Read request text with a byte-count guard before `JSON.parse`. Route files
construct the Prisma store and snapshot store with `getDataRoot()` and
`getDatasetsRoot()`, call one handler method, and convert `RouteResult` to
`NextResponse.json`. `PATCH /api/dataset-presets/[presetId]` accepts exactly
one of `{ name }`, `{ archived: true }`, or `{ archived: false }`.

- [ ] **Step 4: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`; expect all route tests to pass.

```bash
git add ui/src/server/datasetPresetRouteHandlers.ts ui/src/app/api/dataset-presets ui/src/app/api/dataset-preset-versions ui/testing/datasetPresetRouteHandlers.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: expose dataset preset APIs"
```

## Task 5: Add Virtualization-Safe Dataset Selection

**Files:**
- Create: `ui/src/components/DatasetSelectionToolbar.tsx`
- Modify: `ui/src/components/DatasetImageCard.tsx`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Create: `ui/testing/datasetPresetSelection.test.tsx`
- Create: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing component and source-contract tests**

Render `DatasetSelectionToolbar` with `react-test-renderer` and assert count,
Select all, Select none, Invert, Save, and Cancel callbacks. Render
`DatasetImageCard` with `selectionMode`, `selected`, and `onSelectionChange`;
assert an accessible checkbox exists and its click does not call
`onImageClick`. Add source-contract assertions that the page stores
`relative_path`, holds the complete selection in the page component, passes
selection props by `itemContent` index, and never stores selection in card
mount state.

- [ ] **Step 2: Run tests and verify RED**

Add the two compiled test artifacts to the runner and expect the missing
toolbar/props failures.

- [ ] **Step 3: Implement the selection toolbar and card overlay**

Use this toolbar contract:

```ts
interface DatasetSelectionToolbarProps {
  selectedCount: number; totalCount: number; dirty: boolean; saving: boolean;
  onAction(action: SelectionAction): void; onSave?: () => void; onCancel(): void;
}
```

Add optional card props:

```ts
selectionMode?: boolean;
selected?: boolean;
onSelectionChange?: (selected: boolean) => void;
```

The overlay is a labeled checkbox button at the top-left with a visible focus
ring. In selection mode, clicking the media toggles selection and does not open
the viewer; delete remains a separate action.

- [ ] **Step 4: Integrate complete-list selection state**

Change page image entries to
`{ img_path: string; relative_path: string }`. Populate both from the existing
`root` plus `images` response. Hold `Set<string>` state keyed by normalized
relative path, `selectionMode`, `baseSelection`, and `draftDirty`. Derive batch
actions with `applySelectionAction(selected, allRelativePaths, action)`.
Confirm before Cancel, browser back, or `beforeunload` discards a dirty draft.
The toolbar disables Save when `onSave` is absent; Task 6 supplies the callback
when the dialog is mounted. The Task 5 component test asserts this disabled
intermediate state, so the branch never contains a knowingly throwing action.

- [ ] **Step 5: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`; expect selection tests to pass.

```bash
git add ui/src/components/DatasetSelectionToolbar.tsx ui/src/components/DatasetImageCard.tsx ui/src/app/datasets/'[datasetName]'/page.tsx ui/testing/datasetPresetSelection.test.tsx ui/testing/datasetPresetPageIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: select dataset media for presets"
```

## Task 6: Add the Save/Edit Preset Dialog and Dataset-Page Workflow

**Files:**
- Create: `ui/src/components/DatasetPresetDialog.tsx`
- Create: `ui/src/hooks/useDatasetPresets.tsx`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Create: `ui/testing/datasetPresetDialog.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing dialog and workflow tests**

Assert accessible labels for name, note, caption extension, and every loader
allowlist setting; field-level errors; disabled Save for an empty selection;
pending-state double-submit protection; create POST payload; version POST
payload with `base_version_id`, `selected_paths`, and `retained_paths`; and
server error display. Assert the page can load a version, show source-missing
retained entries, preserve them in selection, and refresh preset/version lists
after publication.

- [ ] **Step 2: Run tests and verify RED**

Add `datasetPresetDialog.test.js` and expect missing dialog/hook failures.

- [ ] **Step 3: Implement hook and dialog**

The hook returns:

```ts
interface UseDatasetPresetsResult {
  presets: DatasetPresetSummary[]; status: 'idle'|'loading'|'success'|'error';
  error: string | null; refresh(): Promise<void>;
  loadPreset(id: string): Promise<DatasetPresetDetail>;
  loadVersion(id: string): Promise<DatasetPresetVersionDetail>;
}
```

The dialog accepts a discriminated `mode: 'create' | 'version'`, controlled
initial values, selected/retained paths, source dataset, and `onSaved`. Reuse
existing `Modal`, `TextInput`, `NumberInput`, `Checkbox`, and
`CreatableSelectInput`. Validate locally with the pure helpers, send relative
paths only, keep the dialog open on failure, and close only after a successful
response and refresh.

- [ ] **Step 4: Finish dataset-page integration**

Supply the Task 5 toolbar's `onSave` callback and add an active preset/version
selector to the selection toolbar area. When editing, compute:

```ts
const retainedPaths = version.manifest.files
  .map(file => file.source_path)
  .filter(path => selected.has(path) && !liveRelativePaths.has(path));
```

Render source-missing retained items as labeled placeholders after the grid.
After save, set the returned immutable version as `baseSelection`, clear dirty
state, and display its name/version.

- [ ] **Step 5: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`; expect dialog and page tests to
pass.

```bash
git add ui/src/components/DatasetPresetDialog.tsx ui/src/hooks/useDatasetPresets.tsx ui/src/app/datasets/'[datasetName]'/page.tsx ui/testing/datasetPresetDialog.test.tsx ui/testing/datasetPresetPageIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: create and version dataset presets"
```

## Task 7: Add Preset Sources to Training Dataset Blocks

**Files:**
- Modify: `ui/src/types.ts`
- Create: `ui/src/components/DatasetSourceControl.tsx`
- Modify: `ui/src/app/jobs/new/SimpleJob.tsx`
- Modify: `ui/src/app/jobs/new/page.tsx`
- Create: `ui/testing/datasetSourceControl.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing source-control tests**

Assert switching between live and preset modes, active-preset listing,
explicit version selection, saved loader settings applied into the dataset
block, user edits retained as final settings, archived historical selection
displayed read-only, and changing back to live removes preset metadata.

- [ ] **Step 2: Add dataset metadata types**

Extend `DatasetConfig` with:

```ts
dataset_preset?: {
  version_id: string;
  preset_id: string;
  preset_name: string;
  version: number;
  manifest_sha256: string;
};
```

Also add the API view type used by the job page:

```ts
export interface JobDatasetPresetUsageView {
  dataset_index: number; preset_version_id: string; preset_name: string;
  preset_version: number; manifest_sha256: string;
  resolved_loader_config: DatasetPresetLoaderConfig;
  source_dataset: string; media_count: number; total_bytes: string;
  version_created_at: string; note: string | null;
}
```

Do not add a separate override object: the existing dataset fields are the
final resolved values, and the server treats them as explicit job settings.

- [ ] **Step 3: Implement and integrate `DatasetSourceControl`**

Use this contract:

```ts
interface DatasetSourceControlProps {
  dataset: DatasetConfig;
  liveOptions: Array<{ value: string; label: string }>;
  onChange(next: DatasetConfig): void;
}
```

In live mode render the current Target Dataset selector. In preset mode load
active presets and explicit versions; selecting a version copies its loader
config into allowlisted dataset keys, sets `dataset_preset`, and leaves
non-loader architecture fields untouched. Switching live deletes
`dataset_preset` and requires a live folder selection. Replace only the target
dataset selector in `SimpleJob`; all existing settings controls continue to
edit the same dataset object.

Ensure job hydration displays metadata already stored in old jobs and clone
mode treats an archived version as unavailable for a new cloned job, requiring
the user to select an active version or live folder before saving.

- [ ] **Step 4: Run tests and commit**

Run `cd ui && npm run test:dataset-presets` and
`cd ui && npm run test:training-presets`.

```bash
git add ui/src/types.ts ui/src/components/DatasetSourceControl.tsx ui/src/app/jobs/new/SimpleJob.tsx ui/src/app/jobs/new/page.tsx ui/testing/datasetSourceControl.test.tsx ui/testing/datasetPresetPageIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: select dataset presets in training jobs"
```

## Task 8: Resolve Presets and Persist Job Provenance Transactionally

**Files:**
- Create: `ui/src/server/jobDatasetPresetService.ts`
- Modify: `ui/src/app/api/jobs/route.ts`
- Create: `ui/testing/jobDatasetPresets.test.ts`

- [ ] **Step 1: Write failing job-resolution tests**

Use fake job/preset stores. Cover one preset, multiple presets, mixed live and
preset blocks, server replacement of a malicious browser `folder_path`, exact
allowlisted settings, metadata replacement, missing/corrupt versions, active
requirements for new/clone/newly changed blocks, archived allowance for the
same existing job usage, stale usage removal on update, and full rollback when
either the job or usage write fails.

- [ ] **Step 2: Run tests and verify RED**

Add `jobDatasetPresets.test.js`; expect the missing module error.

- [ ] **Step 3: Implement resolution and transaction contracts**

Export:

```ts
export interface ResolvedJobDatasets {
  jobConfig: JobConfig;
  usages: Array<{
    dataset_index: number; preset_version_id: string; preset_name: string;
    preset_version: number; manifest_sha256: string;
    resolved_loader_config: DatasetPresetLoaderConfig;
  }>;
}
export interface JobDatasetVersionStore {
  getVersionForResolution(versionId: string): Promise<{
    preset: { id: string; name: string; archived_at: Date | null };
    version: DatasetPresetVersionRecord;
  } | null>;
  existingUsage(jobId: string, datasetIndex: number): Promise<{ preset_version_id: string } | null>;
}
export interface SaveJobInput {
  id: string | null; clone: boolean; name: string; gpu_ids: string;
  job_config: JobConfig; job_ref?: string; job_type?: string;
  jobs: JobWriteStore; versions: JobDatasetVersionStore;
  snapshots: DatasetPresetSnapshotStore;
}
export interface JobWriteTransaction {
  createOrUpdateJob(input: Omit<SaveJobInput, 'jobs'|'versions'|'snapshots'> & { job_config: JobConfig }): Promise<Job>;
  deleteUsages(jobId: string): Promise<void>;
  createUsages(jobId: string, usages: ResolvedJobDatasets['usages']): Promise<void>;
}
export interface JobWriteStore {
  transaction<T>(operation: (tx: JobWriteTransaction) => Promise<T>): Promise<T>;
}
export interface PreflightDeps {
  versions: Pick<JobDatasetVersionStore, 'getVersionForResolution'>;
  snapshots: DatasetPresetSnapshotStore;
}
export async function resolveJobDatasetPresets(input: {
  jobId: string | null; clone: boolean; jobConfig: JobConfig;
  versions: JobDatasetVersionStore; snapshots: DatasetPresetSnapshotStore;
}): Promise<ResolvedJobDatasets>;
export async function saveJobWithDatasetUsages(input: SaveJobInput): Promise<Job>;
export async function preflightJobDatasetPresets(jobConfig: JobConfig, deps: PreflightDeps): Promise<void>;
```

Deep-copy input. For every block with `dataset_preset`, load the version,
validate/fast-verify its manifest, replace `folder_path` with the absolute
managed `media` path computed server-side, copy canonical preset metadata,
validate the final allowlisted settings, and append a usage. Preserve live
blocks unchanged. `saveJobWithDatasetUsages` performs job create/update,
`deleteMany({ job_id })`, and usage `createMany` in one Prisma transaction.

Refactor the jobs POST route to keep GPU/name/job-type validation but delegate
the data write. A single-job GET includes `dataset_preset_usages` ordered by
`dataset_index`; list queries retain their current compact response.

- [ ] **Step 4: Run tests and commit**

Run both focused suites and `npx prisma validate`.

```bash
git add ui/src/server/jobDatasetPresetService.ts ui/src/app/api/jobs/route.ts ui/testing/jobDatasetPresets.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: record exact dataset provenance on jobs"
```

## Task 9: Block Missing Snapshots at Queue and Worker Start

**Files:**
- Modify: `ui/src/app/api/jobs/[jobID]/start/route.ts`
- Modify: `ui/cron/actions/startJob.ts`
- Create: `ui/testing/datasetPresetPreflightIntegration.test.ts`

- [ ] **Step 1: Write failing source-contract and service tests**

Assert `preflightJobDatasetPresets` reports preset name/version plus at most
five missing paths, never exposes the absolute storage root, and accepts jobs
with no preset metadata. Source-contract tests must prove the queue route calls
preflight before changing status/queue position and `startJob.ts` calls it
before rotating logs, creating `.job_config.json`, or spawning Python.

- [ ] **Step 2: Run tests and verify RED**

Add `datasetPresetPreflightIntegration.test.js`; expect call-order assertions
to fail.

- [ ] **Step 3: Integrate both preflight boundaries**

In the queue route, parse `job.job_config`, construct the same snapshot/version
dependencies as the jobs route, and return 409 `{ error, preset, version,
missing }` without mutating the job on failure. In `startAndWatchJob`, run the
same check immediately after reading the job and before any training-folder
side effects. On worker failure update the job to `error`, store a bounded
message in `info`, append it to the existing log only if the log already
exists, and return without spawning.

- [ ] **Step 4: Run tests and commit**

Run `cd ui && npm run test:dataset-presets`.

```bash
git add ui/src/app/api/jobs/'[jobID]'/start/route.ts ui/cron/actions/startJob.ts ui/testing/datasetPresetPreflightIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "fix: preflight dataset snapshots before training"
```

## Task 10: Show Provenance and Complete Lifecycle Controls

**Files:**
- Create: `ui/src/components/DatasetProvenance.tsx`
- Modify: `ui/src/components/JobOverview.tsx`
- Modify: `ui/src/hooks/useJob.tsx`
- Modify: `ui/src/app/datasets/[datasetName]/page.tsx`
- Create: `ui/testing/datasetProvenance.test.tsx`
- Modify: `ui/testing/datasetPresetPageIntegration.test.ts`

- [ ] **Step 1: Write failing provenance and lifecycle tests**

Render no-usage, one-usage, and multi-usage states. Assert preset name,
version, source dataset, media count, creation time, abbreviated checksum,
resolved settings, and integrity status. Dataset-page tests cover rename,
archive/restore, full Verify, storage bytes, delete confirmation containing
name/version/count/bytes, referenced-delete error, and API failure leaving the
current draft unchanged.

- [ ] **Step 2: Run tests and verify RED**

Add `datasetProvenance.test.js`; expect the missing component failure.

- [ ] **Step 3: Implement provenance and management UI**

`DatasetProvenance` accepts the ordered usages returned with the Job GET and
renders a compact card per dataset index. Fetch version detail only when the
user expands a card, then show source dataset, creation time, media count,
bytes, manifest checksum, note, and sorted resolved settings. Add it below the
job information grid in `JobOverview`. Change `useJob`'s state type from `Job`
to `Job & { dataset_preset_usages?: JobDatasetPresetUsageView[] }`; treating the
field as optional preserves compatibility with caption jobs and cached older
responses.

On the dataset page, add a preset management menu next to the active version.
Use existing accessible dialogs/confirmations. Archive is the default removal;
permanent delete appears only on an unreferenced version. Verify calls the full
verification endpoint and reports success or exact bounded mismatches.

- [ ] **Step 4: Run tests and commit**

Run both preset suites.

```bash
git add ui/src/components/DatasetProvenance.tsx ui/src/components/JobOverview.tsx ui/src/hooks/useJob.tsx ui/src/app/datasets/'[datasetName]'/page.tsx ui/testing/datasetProvenance.test.tsx ui/testing/datasetPresetPageIntegration.test.ts ui/testing/runDatasetPresetTests.mjs
git commit -m "feat: show and manage dataset provenance"
```

## Task 11: Add Recovery Coverage and Run Full Verification

**Files:**
- Modify: `ui/src/server/datasetPresetSnapshotService.ts`
- Modify: `ui/cron/worker.ts`
- Modify: `ui/testing/datasetPresetSnapshotService.test.ts`
- Modify: `ui/testing/datasetPresetPrismaIntegration.test.ts`
- Modify: `docs/superpowers/specs/2026-08-10-dataset-presets-design.md` only if
  implementation discovered an approved-design correction

- [ ] **Step 1: Write failing stale-staging recovery tests**

Create staging directories older/newer than 24 hours, a published directory
with a database record, and a published orphan without a record. Assert startup
removes only old `.staging-*` directories, reports but does not remove the
published orphan, and never touches referenced/published versions.

- [ ] **Step 2: Run the test and verify RED**

Run `cd ui && npm run test:dataset-presets`; expect recovery assertions to fail.

- [ ] **Step 3: Add bounded startup maintenance**

At worker startup, call `cleanupStaging(new Date(Date.now() - 24 * 60 * 60 *
1000))` once and log removed staging names. Add `findPublishedOrphans` to the
snapshot/store boundary, compare final version directories with Prisma
manifest paths, and log orphan paths relative to the preset root without
deleting them. Maintenance failure logs and does not prevent the worker from
starting.

- [ ] **Step 4: Run focused and regression verification**

Run:

```bash
cd ui
npx prisma validate
npx prisma generate
npm run test:dataset-presets
npm run test:training-presets
npm run test:dinov3-tagger-captioner
npm run test:anima-model-paths
npm run build
```

Expected: every command exits 0. Inspect the production build output for route
or client/server boundary warnings; there must be none involving dataset
presets.

- [ ] **Step 5: Perform a manual smoke test**

Using a temporary dataset containing three tiny images and captions:

1. Enable two images and create `smoke-preset` v1.
2. Edit/delete the two live source files and confirm v1 full verification still
   succeeds.
3. Create v2 retaining one missing source image and adding the third image.
4. Create a job using v1 and v2 as separate dataset blocks with different
   repeat counts.
5. Confirm Job Overview shows both exact versions and settings.
6. Queue the job, cancel before model loading, and confirm preflight succeeds.
7. Corrupt a copied test snapshot byte, confirm Verify and queue both fail,
   then restore the byte.
8. Archive the preset, confirm the existing job remains retrainable and a new
   job cannot select it.
9. Confirm referenced v1/v2 cannot be permanently deleted.

- [ ] **Step 6: Commit recovery changes**

```bash
git add ui/src/server/datasetPresetSnapshotService.ts ui/cron/worker.ts ui/testing/datasetPresetSnapshotService.test.ts ui/testing/datasetPresetPrismaIntegration.test.ts
git commit -m "test: verify dataset preset recovery and regressions"
```

## Task 12: Request Review and Finish the Branch

**Files:**
- Review all files changed by Tasks 1–11.

- [ ] **Step 1: Confirm a clean, focused diff**

Run:

```bash
git status --short
git diff --check main...HEAD
git log --oneline main..HEAD
```

Expected: no uncommitted files, no whitespace errors, and one focused commit
per task.

- [ ] **Step 2: Request code review**

Invoke `superpowers:requesting-code-review`. Give the reviewer the approved
spec, this plan, `main` as the base, and `HEAD` as the implementation tip.
Address findings with `superpowers:receiving-code-review`, rerunning the
smallest affected test first and then the complete Task 11 verification set.

- [ ] **Step 3: Choose integration behavior**

Invoke `superpowers:finishing-a-development-branch` only after review findings
are resolved and all verification commands pass. Present its merge, PR, keep,
or cleanup choices to the user; do not choose or publish on their behalf.
