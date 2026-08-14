# Preset Runtime Cache Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit reuse of exact toolkit-managed dataset caches without allowing those runtime derivatives to make an otherwise valid frozen preset fail queue preflight.

**Architecture:** Keep manifest-declared asset verification unchanged. Add a narrowly scoped media-walk classifier for exact root-level cache names; accept `.aitk_size.json` only as a regular file and skip exact `_latent_cache`/`_t_e_cache` directory subtrees without enumerating them. All symlinks, wrong types, near matches, nested matches, and unrelated undeclared entries remain verification mismatches.

**Tech Stack:** TypeScript, Node filesystem APIs, existing dataset preset snapshot service and compiled integration test runner.

---

### Task 1: Specify runtime cache verification behavior with failing tests

**Files:**
- Modify: `ui/testing/datasetPresetSnapshotService.test.ts`

- [ ] **Step 1: Add an exact-cache acceptance regression**

After publishing the existing `verifyPublication` fixture, create the three runtime cache entries and place undeclared content inside both cache directories:

```ts
const verifyMediaRoot = join(verifyPublication.versionRoot, 'media');
writeFileSync(join(verifyMediaRoot, '.aitk_size.json'), '{"__version__":"0.1.2"}');
mkdirSync(join(verifyMediaRoot, '_latent_cache'));
writeFileSync(join(verifyMediaRoot, '_latent_cache/derived.safetensors'), 'runtime latent');
mkdirSync(join(verifyMediaRoot, '_t_e_cache'));
writeFileSync(join(verifyMediaRoot, '_t_e_cache/derived.safetensors'), 'runtime text embedding');
assert.equal((await store.verifyFull(verifyPublication.manifestPath)).media_count, 1);
```

This assertion also proves the verifier does not classify files inside the accepted cache roots as unexpected.

- [ ] **Step 2: Add rejection regressions for boundary cases**

Create isolated staged publications (or reset the fixture between cases) and assert `verifyFull` reports `unexpected` for:

```ts
mkdirSync(join(mediaRoot, '.aitk_size.json'));                  // wrong type
writeFileSync(join(mediaRoot, '_latent_cache'), 'not a dir');  // wrong type
symlinkSync(outsidePath, join(mediaRoot, '_t_e_cache'));       // symlink
mkdirSync(join(mediaRoot, '_latent_cache-copy'));              // near match
mkdirSync(join(mediaRoot, 'nested/_latent_cache'), { recursive: true }); // nested match
writeFileSync(join(mediaRoot, 'unrelated.bin'), 'unexpected');
```

For each case, require the exact source-relative path and actual kind (`directory`, `file`, or `symlink`) in `DatasetPresetSnapshotVerificationError.mismatches`.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
cd ui
npm run test:dataset-presets
```

Expected: FAIL because `.aitk_size.json`, `_latent_cache`, and `_t_e_cache` are currently reported as unexpected.

- [ ] **Step 4: Commit the failing regression**

```bash
git add ui/testing/datasetPresetSnapshotService.test.ts
git commit -m "test: cover preset runtime cache verification"
```

### Task 2: Implement the exact runtime-cache exception

**Files:**
- Modify: `ui/src/server/datasetPresetSnapshotService.ts:1140-1235`
- Test: `ui/testing/datasetPresetSnapshotService.test.ts`

- [ ] **Step 1: Add exact root-level cache predicates beside the media walk**

Define the accepted exact portable root paths:

```ts
const runtimeCacheFile = 'media/.aitk_size.json';
const runtimeCacheDirectories = new Set(['media/_latent_cache', 'media/_t_e_cache']);
```

Keep these constants private to full verification; do not introduce a public type or exported API.

- [ ] **Step 2: Apply the predicates only after symlink rejection**

Inside the existing sorted media walk:

```ts
if (info.isSymbolicLink()) {
  recordMismatch(/* existing symlink mismatch */);
  continue;
}
if (
  (portablePath === runtimeCacheFile && info.isFile()) ||
  (runtimeCacheDirectories.has(portablePath) && info.isDirectory())
) {
  continue;
}
```

Place this before the ordinary directory/file classification. Skipping a recognized cache directory must occur without calling `pinDirectorySync` or recursing, ensuring large cache trees do not affect verification work.

- [ ] **Step 3: Run the focused suite and verify GREEN**

Run:

```bash
cd ui
npm run test:dataset-presets
```

Expected: PASS, including existing declared media/mask size and SHA mismatch cases and the new cache-boundary regressions.

- [ ] **Step 4: Run static and production verification**

Run:

```bash
cd ui
npx tsc --project testing/tsconfig.datasetPresets.json --noEmit
npm run build
git diff --check
```

Expected: both TypeScript/build commands succeed; only the repository's known optional macOS sensor or npm/Node compatibility warnings may appear; `git diff --check` produces no output.

- [ ] **Step 5: Commit the implementation**

```bash
git add ui/src/server/datasetPresetSnapshotService.ts
git commit -m "fix: tolerate managed preset runtime caches"
```

### Task 3: Deploy and prove live recovery

**Files:**
- No source changes expected

- [ ] **Step 1: Restart the UI service on the verified build**

Restart only the UI/file-server child serving port 8675 while keeping the queue worker supervised. Confirm:

```bash
curl -fsS http://127.0.0.1:8675/api/queue
```

Expected: HTTP 200 with queue JSON.

- [ ] **Step 2: Verify the affected frozen preset without deleting caches**

Run:

```bash
curl -fsS -X POST http://127.0.0.1:8675/api/dataset-preset-versions/c8c9f67d-42b3-47eb-96d1-d01289a24870/verify
```

Expected: successful verification for `spade-1` version 6. Confirm `_latent_cache`, `_t_e_cache`, and `.aitk_size.json` still exist.

- [ ] **Step 3: Retry `spade-4` through the real Start endpoint**

Run:

```bash
curl -fsS http://127.0.0.1:8675/api/jobs/d096dca0-f59c-4859-8fa8-f0a90f8412b0/start
```

Expected: success response rather than the previous 409 integrity error.

- [ ] **Step 4: Confirm the worker claims the job**

Query the database and process tree. Expected: `spade-4` transitions from `stopped` to `queued` or `running`, receives a live PID when running, and its info advances beyond queue admission.

- [ ] **Step 5: Confirm repository state**

```bash
git status --short
git log -3 --oneline
```

Expected: clean worktree with the test and implementation commits present.
