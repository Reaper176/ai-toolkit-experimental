# Masked Job Queue Preflight Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow saved jobs with server-managed preset mask paths to pass queue preflight while continuing to reject client-supplied preset paths.

**Architecture:** Dataset preset resolution distinguishes untrusted save requests from integrity-only queue/worker preflight. Save mode rejects external preset paths; preflight discards persisted managed paths, verifies the immutable version, and overwrites them with paths derived from the verified manifest.

**Tech Stack:** Next.js 15 route handlers, TypeScript, Prisma test stores, existing dataset preset and queue orchestration test runners.

---

### Task 1: Re-derive Persisted Preset Paths During Preflight

**Files:**
- Modify: `ui/src/server/jobDatasetPresetService.ts`
- Modify: `ui/testing/jobDatasetPresets.test.ts`
- Modify: `ui/testing/datasetPresetPreflightIntegration.test.ts`

- [ ] **Step 1: Write the failing resolver regression**

In `jobDatasetPresets.test.ts`, construct the same masked preset job in two phases:

```ts
const saved = await resolveJobDatasetPresets({
  jobId: 'job-1',
  clone: false,
  jobConfig: requestWithoutManagedPaths,
  versions,
  snapshots,
});

assert.equal(saved.jobConfig.config.process[0].datasets[0].mask_path, '/managed/p-v1/v1/masks');

const prepared = await prepareJobDatasetPresetsForTraining(saved.jobConfig, {
  versions,
  snapshots,
});

assert.equal(prepared.config.process[0].datasets[0].folder_path, '/managed/p-v1/v1/media');
assert.equal(prepared.config.process[0].datasets[0].mask_path, '/managed/p-v1/v1/masks');
```

Before preflight, replace the stored paths with canonical but incorrect absolute paths and assert the prepared result still uses the verified snapshot paths. Retain an existing save-mode assertion that a fresh request containing `mask_path` is rejected.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd ui && npm run test:dataset-presets`

Expected: FAIL with `Dataset preset cannot use external path field mask_path` during `prepareJobDatasetPresetsForTraining`.

- [ ] **Step 3: Separate save rejection from preflight replacement**

In the preset branch of `resolveJobDatasetPresetsInternal`, apply external-path rejection only in save mode:

```ts
if (eligibility === 'save') {
  rejectPresetExternalPaths(dataset);
} else {
  for (const key of DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS) {
    delete dataset[key as keyof DatasetConfig];
  }
}
```

Also clear persisted `folder_path` before resolution in integrity-only mode. Continue deriving both paths only after `getVerified()` and `canonicalVersionAgreement()` succeed:

```ts
dataset.folder_path = mediaRoot;
dataset.mask_path = manifest.files.some(file => file.mask_missing === false)
  ? join(dirname(mediaRoot), 'masks')
  : null;
```

Use a small named helper for clearing preset-managed paths if TypeScript's `delete` typing would otherwise obscure the trust-boundary intent.

- [ ] **Step 4: Add maskless and tamper assertions**

Assert a verified maskless version overwrites an arbitrary persisted `mask_path` with `null`. Assert snapshot verification failure occurs before any prepared configuration is returned and retains the existing safe preset/version error metadata.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui && npm run test:dataset-presets`

Expected: PASS.

Commit:

```bash
git add ui/src/server/jobDatasetPresetService.ts ui/testing/jobDatasetPresets.test.ts ui/testing/datasetPresetPreflightIntegration.test.ts
git commit -m "fix: rederive preset mask paths during preflight"
```

### Task 2: Prove Saved Masked Jobs Reach Queue Mutation

**Files:**
- Modify: `ui/testing/datasetPresetPreflightIntegration.test.ts`
- Modify: `ui/testing/jobsRoute.test.ts`

- [ ] **Step 1: Write an orchestration regression**

Create a stored stopped-job attempt whose JSON contains the server-resolved media and masks paths produced in Task 1. Invoke `prepareAndQueueJob` with real preset preflight dependencies and a recording queue mutation:

```ts
let queued = false;
await prepareAndQueueJob(storedMaskedJob, {
  prepare: config => prepareJobDatasetPresetsForTraining(config, { versions, snapshots }),
  async mutateQueue() { queued = true; },
});
assert.equal(queued, true);
```

Add a tampered snapshot case and assert `queued === false` with the existing HTTP 409 classification.

- [ ] **Step 2: Verify the route boundary response**

In `jobsRoute.test.ts` or the existing start-route contract test, assert valid prepared jobs proceed to the optimistic queue update, while invalid JSON/client preset path failures remain HTTP 400 and integrity failures remain HTTP 409.

- [ ] **Step 3: Run full verification**

Run:

```bash
cd ui
npm run test:dataset-presets
npm run build
```

Expected: tests and production build exit zero. The existing optional `macos-temperature-sensor` warning may remain on Linux.

- [ ] **Step 4: Inspect and commit**

Run:

```bash
git diff --check
git status --short
```

Commit:

```bash
git add ui/testing/datasetPresetPreflightIntegration.test.ts ui/testing/jobsRoute.test.ts
git commit -m "test: cover masked job queue preflight"
```

### Task 3: Live Instance Confirmation

**Files:**
- No source files modified.

- [ ] **Step 1: Merge and restart the current UI/worker instance**

Use the repository's existing process lifecycle so the running Next server and compiled worker load the merged build. Do not edit `aitk_db.db`.

- [ ] **Step 2: Retry `spade-3` through the Start API**

Run:

```bash
curl -sS -i http://127.0.0.1:8675/api/jobs/059db286-35c9-4291-bee7-0cb54e83b78a/start
```

Expected: HTTP 200 and the job transitions to `queued` (or immediately `running` if the idle worker claims it).

- [ ] **Step 3: Verify database state read-only**

Run:

```bash
sqlite3 -header -column aitk_db.db \
  "select name,status,queue_position,info from Job where id='059db286-35c9-4291-bee7-0cb54e83b78a';"
```

Expected: `spade-3` is `queued` or `running`; no direct database mutation was used.
