# Built-in LoRA Preset Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 14 immutable, exact-architecture LoRA starting presets that coexist safely with existing user presets, preserve protected job/dataset/prompt state, link to the training book, and cannot ship with invalid configuration or unsupported evidence.

**Architecture:** Keep canonical built-in definitions in pure TypeScript, separate strict validation from fail-soft runtime loading, and merge copied built-ins with SQLite-backed user records only at the service boundary. Preserve the existing snapshot-only user-preset sanitizer/application functions; dispatch built-ins through a record-aware wrapper that additionally protects the current global negative prompt. A build-only validator checks the complete golden catalog, UI/backend mappings, recipes, reverse links, and attestations without adding Prisma rows or runtime filesystem work.

**Tech Stack:** TypeScript, React 19, Next.js route handlers, Node `crypto`/`fs`, Python AST source verification, existing Prisma-backed training preset service, existing temporary TypeScript test runners.

**Design source:** `docs/superpowers/specs/2026-08-14-built-in-lora-presets-design.md`

---

## Preconditions and boundaries

Complete Tasks 1–15 of `docs/superpowers/plans/2026-08-14-lora-training-book.md` first so `docs/book/book-manifest.json` and all six recipe pages exist. After this plan passes its automated gate, return to Tasks 16–17 of the book plan for the real GPU smoke and final combined release gate.

Do not modify `ui/prisma/schema.prisma`, add a migration/seed, change Python training behavior, or store built-in catalog provenance on jobs. Existing user presets remain SQLite-owned and retain their saved-negative-prompt behavior.

Before Task 1, run `npm run test:training-presets` from `ui/`. It passed when this plan was written; stop and diagnose any new baseline failure before changing preset contracts.

## File structure

Create:

- `ui/src/helpers/builtInTrainingPresetDefinitions.ts` — nonthrowing raw common snapshot, profiles, and literal rows.
- `ui/src/helpers/builtInTrainingPresetBindings.ts` — dependency-free architecture/category/recipe orders and exact path/class bindings.
- `ui/src/helpers/builtInTrainingPresetGolden.ts` — independent literal 14-row expected release, never derived from raw rows.
- `ui/src/helpers/builtInTrainingPresets.ts` — browser-safe strict validation, canonical JSON, ordering, applicability, defensive copy/freeze, application, and safe recipe URLs.
- `ui/src/server/trainingPresetCatalogDigest.ts` — Node-only SHA-256 helpers for runtime logs and evidence.
- `ui/src/server/trainingPresetCatalogRuntime.ts` — fail-soft entry validation, raw-ID collision exclusion, redacted logging, and copied handoffs.
- `ui/src/server/trainingPresetCatalogBuildValidation.ts` — whole-release, docs, evidence, and source-mapping checks.
- `ui/src/components/TrainingPresetDetails.tsx` — built-in metadata and recipe link.
- `ui/testing/trainingPresetCatalog.test.ts`
- `ui/testing/trainingPresetCatalogRuntime.test.ts`
- `ui/testing/trainingPresetCatalogBuildValidation.test.ts`
- `ui/testing/trainingPresetBackendMapping.test.py`
- `ui/testing/trainingPresetDetails.test.tsx`
- `ui/testing/runTrainingPresetCatalogBuildValidation.mjs`
- `ui/testing/trainingPresetCatalogBuildValidationCli.ts`

Modify the existing helper, service, route-handler, control/select, focused tests/runner/tsconfig, `ui/package.json`, and six recipe pages named in the approved design.

### Task 1: Introduce the source-discriminated record contract without changing user semantics

**Files:**
- Modify: `ui/src/helpers/trainingPresets.ts`
- Modify: `ui/src/server/trainingPresetService.ts`
- Modify: `ui/src/components/TrainingPresetSelect.tsx`
- Modify: `ui/src/components/TrainingPresetControl.tsx`
- Modify: `ui/testing/trainingPresets.test.ts`
- Modify: `ui/testing/trainingPresetService.test.ts`
- Modify: `ui/testing/trainingPresetRouteHandlers.test.ts`
- Modify: `ui/testing/trainingPresetSelect.test.tsx`
- Modify: `ui/testing/trainingPresetControl.test.tsx`
- Modify: `ui/testing/datasetSourceControl.test.tsx`

- [ ] **Step 1: Write failing compatibility/application tests**

Add a user fixture with a saved global negative prompt. Assert the sanitizer and ordinary user path retain current behavior:

```ts
assert.equal(sanitizeTrainingPreset(userJob).config.process[0].sample.neg, 'saved user negative');
assert.equal(appliedUser.config.process[0].sample.neg, 'saved user negative');
```

Update every existing production caller and test fixture returned as a user record to include `source: 'user'` and `read_only: false`; reject catalog-only metadata on the user branch. Also cover absent versus present `sample.neg`, legacy `sample.prompts` migration, `sample.samples` including control images, source immutability, and result isolation. Built-in application/protected-field/undo assertions are introduced only after strict built-in validation exists in Task 3.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because built-in record types/application do not exist.

- [ ] **Step 3: Add the discriminated record union**

Keep `TrainingPresetSnapshotV1` unchanged. Replace the public record with:

```ts
interface TrainingPresetRecordBase {
  id: string;
  name: string;
  schema_version: 1;
  snapshot: TrainingPresetSnapshotV1;
  created_at: string;
  updated_at: string;
}

export interface UserTrainingPresetRecord extends TrainingPresetRecordBase {
  source: 'user';
  read_only: false;
}

export interface BuiltInTrainingPresetRecord extends TrainingPresetRecordBase {
  source: 'builtin';
  read_only: true;
  category: 'character' | 'style' | 'object' | 'refinement' | 'low-vram' | 'diagnostic';
  intent_slug: string;
  model_arch: string;
  catalog_revision: number;
  summary: string;
  recipe_path: string;
  prerequisites: string[];
  warnings: string[];
  evidence: 'configuration-validated' | 'launch-tested' | 'training-tested';
}

export type TrainingPresetRecord = UserTrainingPresetRecord | BuiltInTrainingPresetRecord;
```

- [ ] **Step 4: Preserve the current user path and migrate every user-record caller**

Do not alter the public behavior of `sanitizeTrainingPreset(jobConfig)` or `applyTrainingPreset(currentJob, snapshot, migrate)`. Make service deserialization emit the explicit user discriminator, make client validation accept only that strict user branch for current API rows, and update all current UI/tests without adding built-ins to service output yet. Keep `preparePresetApplication` snapshot-based in this task. Never add origin metadata to `JobConfig`.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS, including the unchanged user negative-prompt assertions.

```bash
git add ui/src/helpers/trainingPresets.ts ui/src/server/trainingPresetService.ts ui/src/components/TrainingPresetSelect.tsx ui/src/components/TrainingPresetControl.tsx ui/testing/trainingPresets.test.ts ui/testing/trainingPresetService.test.ts ui/testing/trainingPresetRouteHandlers.test.ts ui/testing/trainingPresetSelect.test.tsx ui/testing/trainingPresetControl.test.tsx ui/testing/datasetSourceControl.test.tsx
git commit -m "feat: add source-aware training preset records"
```

### Task 2: Implement canonical JSON, digest, recipe-path, and strict built-in primitives

**Files:**
- Create: `ui/src/helpers/builtInTrainingPresetBindings.ts`
- Create: `ui/src/helpers/builtInTrainingPresets.ts`
- Create: `ui/testing/trainingPresetCatalog.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Write failing canonicalization and path tests**

Cover recursive Unicode-code-point key ordering, array-order retention, compact JSON stability, and rejection of sparse arrays, `undefined`, nonfinite numbers, cycles, nonplain objects, functions, symbols, and bigint. Cover normalized recipe paths below `docs/book/recipes/`, encoded URL segments, and rejection of absolute/backslash/traversal/query/fragment paths. Hashing is deliberately absent from this browser-importable module.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because `canonicalizePresetJson` and recipe helpers are missing.

- [ ] **Step 3: Implement browser-safe canonical JSON**

Use a code-point comparator, not locale ordering:

```ts
function canonicalJsonError(path: string, reason: string): never {
  throw new TypeError(`Unsupported canonical JSON value at ${path}: ${reason}`);
}

function assertCanonicalJson(value: unknown, path: string, ancestors: Set<object>): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) canonicalJsonError(path, 'number must be finite');
    return;
  }
  if (typeof value !== 'object') canonicalJsonError(path, typeof value);
  if (ancestors.has(value)) canonicalJsonError(path, 'cycle');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      for (const key of ownKeys) {
        if (key === 'length') continue;
        if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) {
          canonicalJsonError(path, 'array has a symbol or non-index property');
        }
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
          canonicalJsonError(path, 'array has an out-of-range index property');
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!descriptor.enumerable || !('value' in descriptor)) {
          canonicalJsonError(`${path}[${key}]`, 'non-enumerable or accessor element');
        }
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          canonicalJsonError(`${path}[${index}]`, 'sparse array');
        }
        assertCanonicalJson(value[index], `${path}[${index}]`, ancestors);
      }
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      canonicalJsonError(path, 'non-plain object');
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') canonicalJsonError(path, 'symbol key');
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!descriptor.enumerable || !('value' in descriptor)) {
        canonicalJsonError(`${path}.${key}`, 'non-enumerable or accessor property');
      }
      assertCanonicalJson(descriptor.value, `${path}.${key}`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, char => char.codePointAt(0)!);
  const b = Array.from(right, char => char.codePointAt(0)!);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function encodeCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError('Unsupported canonical JSON value at $');
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(encodeCanonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort(compareCodePoints)
    .map(key => `${JSON.stringify(key)}:${encodeCanonicalJson(object[key])}`)
    .join(',')}}`;
}

export function canonicalizePresetJson(value: unknown): string {
  assertCanonicalJson(value, '$', new Set());
  return encodeCanonicalJson(value);
}
```

Tests exercise the exact rejection branches above: sparse arrays, extra array keys, cycles, `undefined`, nonfinite numbers, non-plain objects, accessors/non-enumerable properties, symbol keys/values, functions, and `bigint`. Shared but acyclic plain subobjects remain valid. Do not import Node `crypto`, `fs`, or any `ui/src/server` module here; client components import this helper. Server/build hashing is introduced in Task 4.

- [ ] **Step 4: Implement dependency-free bindings and strict built-in validation**

Put the nine exact architecture bindings, architecture/category order, six allowed recipe paths, release timestamp, and revision in `builtInTrainingPresetBindings.ts`. The validator imports that module; the raw definitions module added later imports both, so validation never imports definitions and no cycle is possible.

| UI architecture | required model path | engine architecture | model class |
|---|---|---|---|
| `anima` | `circlestone-labs/Anima-Base-v1.0-Diffusers` | `anima` | `AnimaModel` |
| `flux` | `black-forest-labs/FLUX.1-dev` | `flux` | `StableDiffusion` |
| `flex1` | `ostris/Flex.1-alpha` | `flux` | `StableDiffusion` |
| `qwen_image` | `Qwen/Qwen-Image` | `qwen_image` | `QwenImageModel` |
| `qwen_image_edit_plus` | `Qwen/Qwen-Image-Edit-2509` | `qwen_image_edit_plus` | `QwenImageEditPlusModel` |
| `sdxl` | `stabilityai/stable-diffusion-xl-base-1.0` | `sdxl` | `StableDiffusion` |
| `sd15` | `stable-diffusion-v1-5/stable-diffusion-v1-5` | `sd15` | `StableDiffusion` |
| `wan21:1b` | `Wan-AI/Wan2.1-T2V-1.3B-Diffusers` | `wan21` | `Wan21` |
| `wan22_14b:t2v` | `ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16` | `wan22_14b` | `Wan2214bModel` |

Architecture order is the table order. Category order is `character`, `style`, `object`, `refinement`, `low-vram`, `diagnostic`. Release timestamp is `2026-08-14T00:00:00.000Z`; revision is `1`; recipes are exactly the six `docs/book/recipes/*.md` paths named in the book plan.

Export `validateBuiltInTrainingPresetRecord`, `normalizeTrainingPresetRecipePath`, `trainingPresetRecipeUrl`, `compareBuiltInTrainingPresetRecords`, `builtInsForArchitecture`, `deepFreezePreset`, and `copyBuiltInPreset`. Reject metadata/snapshot architecture mismatch, malformed ID/revision/slug, nonliteral timestamp, protected process fields, `sample.samples`, legacy prompts, built-in `sample.neg`, W&B/Hub activation, placeholders, personal/mutable paths, nonfinite/range-invalid values, unsupported recipe/category/evidence, and mutable handoffs.

Use valid and one-field-mutated fixtures to require exact `diffusion_trainer`, `network.type: lora`, plain `model`/`network`/`train`/`save`/`sample`/`logging` sections, an allowed model path, `push_to_hub: false`, no `hf_repo_id` or other Hub destination even while pushing is false, no datasets/trigger/job/output/device fields, and all finite nonnegative interval/rate constraints. General user snapshot validation remains permissive.

- [ ] **Step 5: Make the new test mandatory, run, and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS and fail if `trainingPresetCatalog.test.js` is removed from the runner.

```bash
git add ui/src/helpers/builtInTrainingPresetBindings.ts ui/src/helpers/builtInTrainingPresets.ts ui/testing/trainingPresetCatalog.test.ts ui/testing/tsconfig.trainingPresets.json ui/testing/runTrainingPresetTests.mjs
git commit -m "feat: validate built-in training preset contracts"
```

### Task 3: Materialize the exact 14-entry revision-1 catalog

**Files:**
- Create: `ui/src/helpers/builtInTrainingPresetDefinitions.ts`
- Create: `ui/src/helpers/builtInTrainingPresetGolden.ts`
- Modify: `ui/src/helpers/trainingPresets.ts`
- Modify: `ui/src/helpers/builtInTrainingPresets.ts`
- Modify: `ui/testing/trainingPresetCatalog.test.ts`
- Modify: `ui/testing/trainingPresets.test.ts`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Add the failing golden-manifest test**

Hard-code the exact ordered IDs before implementation:

```ts
const expectedIds = [
  'builtin:anima:character-identity@1',
  'builtin:anima:focused-refinement@1',
  'builtin:anima:low-vram-starting-point@1',
  'builtin:anima:short-diagnostic-run@1',
  'builtin:flux:character-general-concept@1',
  'builtin:flux:style-aesthetic@1',
  'builtin:flex1:object-general-concept@1',
  'builtin:qwen_image:object-general-concept@1',
  'builtin:qwen_image_edit_plus:focused-refinement@1',
  'builtin:sdxl:character-identity@1',
  'builtin:sdxl:style-aesthetic@1',
  'builtin:sd15:character-identity@1',
  'builtin:wan21:1b:subject-motion-diagnostic@1',
  'builtin:wan22_14b:t2v:subject-motion-starting-point@1',
] as const;
```

Define the raw boundary explicitly:

```ts
export interface BuiltInTrainingPresetRow {
  id: string;
  model_arch: BuiltInPresetArchitecture;
  intent_slug: string;
  catalog_revision: 1;
  name: string;
  summary: string;
  category: BuiltInPresetCategory;
  recipe_path: BuiltInPresetRecipePath;
  prerequisites: readonly string[];
  warnings: readonly string[];
  evidence: 'configuration-validated';
  memory_profile: 'A' | 'A-low' | 'F' | 'Flex' | 'Q' | 'QE' | 'SD' | 'W21' | 'W22';
  sample_profile: 'A' | 'Flux' | 'Flex' | 'Qwen' | 'SDXL' | 'SD15' | 'W21' | 'W22';
  linear_rank: 16 | 32;
  steps: 250 | 2000 | 3000;
  noise_scheduler: 'flowmatch' | 'ddpm';
  timestep_type: 'weighted' | 'sigmoid' | 'linear';
  content_or_style: 'content' | 'style' | 'balanced';
  max_step_saves_to_keep: 1 | 4;
}
```

For every row, reconstruct `` `builtin:${row.model_arch}:${row.intent_slug}@${row.catalog_revision}` `` and compare the complete string with `row.id`; never split an ID on `:`. The literal raw `id` exists specifically so runtime collision detection can happen before materialization/validation.

The independent golden metadata rows are exactly:

| # | name | category | recipe | summary |
|---:|---|---|---|---|
| 1 | `Anima — Character / Identity` | `character` | `character-identity.md` | `Anima LoRA starting point biased toward recurring character or identity learning.` |
| 2 | `Anima — Focused Refinement` | `refinement` | `focused-refinement.md` | `Anima starting point biased toward low-noise detail and focused refinement.` |
| 3 | `Anima — Low-VRAM Starting Point` | `low-vram` | `low-vram.md` | `Anima character starting point with low-VRAM mode enabled; dataset memory settings remain unchanged.` |
| 4 | `Anima — Short Diagnostic Run` | `diagnostic` | `diagnostic-run.md` | `One-interval Anima run for validating configuration, samples, saving, and queue behavior.` |
| 5 | `FLUX.1 — Character / General Concept` | `character` | `character-identity.md` | `FLUX.1 starting point biased toward subject and general concept learning.` |
| 6 | `FLUX.1 — Style / Aesthetic` | `style` | `style.md` | `FLUX.1 starting point biased toward style and aesthetic learning.` |
| 7 | `Flex.1 — Object / General Concept` | `object` | `object-concept.md` | `Flex.1 starting point for objects and general concepts with its required guidance behavior.` |
| 8 | `Qwen Image — Object / General Concept` | `object` | `object-concept.md` | `Qwen Image low-VRAM starting point for objects and general concepts.` |
| 9 | `Qwen Image Edit 2509 — Focused Refinement` | `refinement` | `focused-refinement.md` | `Qwen Image Edit 2509 starting point for paired edit/refinement training; control data is required.` |
| 10 | `SDXL — Character / Identity` | `character` | `character-identity.md` | `SDXL LoRA starting point biased toward character and identity learning.` |
| 11 | `SDXL — Style / Aesthetic` | `style` | `style.md` | `SDXL LoRA starting point biased toward style and aesthetic learning.` |
| 12 | `SD 1.5 — Character / Identity` | `character` | `character-identity.md` | `SD 1.5 LoRA starting point biased toward character and identity learning.` |
| 13 | `Wan 2.1 1.3B T2V — Subject / Motion Diagnostic` | `diagnostic` | `diagnostic-run.md` | `One-interval Wan 2.1 1.3B T2V run for validating a video dataset and training pipeline.` |
| 14 | `Wan 2.2 14B T2V — Subject / Motion Starting Point` | `character` | `character-identity.md` | `Wan 2.2 14B T2V starting point for subject and motion learning across both noise stages.` |

Recipe cells expand to `docs/book/recipes/<cell>`. `intent_slug` is the literal middle slug in each ID; every row uses revision `1`, evidence `configuration-validated`, and both timestamps `2026-08-14T00:00:00.000Z`.

Every prerequisites array begins, in order, with:

1. `Select the exact model architecture shown by this preset.`
2. `Review the linked recipe and provide a compatible dataset; dataset settings are not changed.`

Every warnings array begins with `Configuration validation does not guarantee output quality or a specific VRAM requirement.` Append only these ordered extras:

| entries | additional prerequisite | additional warning |
|---|---|---|
| 2 | none | `Masks and inverted-mask prior are not enabled automatically.` |
| 3 | none | `Low-VRAM mode may reduce throughput and does not guarantee a specific VRAM requirement.` |
| 5, 6 | `Access to the gated black-forest-labs/FLUX.1-dev repository is required.` | none |
| 9 | `Filename-matched edit/control data is required.` | `Masks and inverted-mask prior are not enabled automatically.` |
| 13 | `Video frame-count and FPS settings must be compatible with the linked Wan chapter.` | none |
| 14 | `Video frame-count and FPS settings must be compatible with the linked Wan chapter.` | `The Wan 2.2 14B model remains resource intensive despite quantization and low-VRAM settings.` |
| 1, 4, 7, 8, 10, 11, 12 | none | none |

In `builtInTrainingPresetGolden.ts`, declare the independent literal expected release without importing or deriving it from `BUILT_IN_PRESET_ROWS`. Assert every exact name, summary, category, slug, recipe, prerequisite/warning order, timestamp, evidence, architecture/path/class binding, full snapshot, profile result, rank/alpha, steps, scheduler/timestep/bias, retention, and sample setting against that independent value.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because the definitions module is absent.

- [ ] **Step 3: Implement the common snapshot and profile builders**

Export raw immutable data `BUILT_IN_PRESET_ROWS`, `COMMON_BUILT_IN_SNAPSHOT`, memory profiles A/A-low/F/Flex/Q/QE/SD/W21/W22, and sample profiles A/Flux/Flex/Qwen/SDXL/SD15/W21/W22. Export `materializeBuiltInTrainingPresetRow(row)` from `builtInTrainingPresetDefinitions.ts`; that module may import the dependency-free bindings and strict validator, while the validator never imports definitions. Precedence is common snapshot, architecture/memory/sample profile, then row override. Raw module initialization must perform no validation, hashing, filesystem access, or whole-array materialization and therefore cannot throw because one row is malformed; materialization occurs only when the exported function is called.

The common snapshot is literal: schema 1, `job: extension`, one `diffusion_trainer`; LoRA network with row-equal `linear`/`linear_alpha` and empty `ignore_if_contains`; batch/accumulation 1; UNet true; text encoder false; gradient checkpointing true; `adamw8bit`, weight decay `0.0001`, LR `0.0001`, constant LR scheduler, bf16, MSE; inverted prior false/multiplier `0.5`; unload/cache-TE false; EMA false/`0.99`; first/force/disable sampling false; differential preservation and bypass guidance false; switch boundary every 1; bf16 diffusers save every 250 with row keep count and Hub false; sample every 250 from step 0, seed 42, walk seed true; UI logger true every step and W&B false. It contains no datasets, prompt items, global negative prompt, trigger, identity, paths, devices, accuracy-recovery adapter, or assistant adapter.

The exact row overlay is:

| # | rank/alpha | steps | noise scheduler | timestep | content/style | memory | sample | keep |
|---:|---:|---:|---|---|---|---|---|---:|
| 1 | 32 | 3000 | `flowmatch` | `weighted` | `content` | A | A | 4 |
| 2 | 32 | 3000 | `flowmatch` | `weighted` | `style` | A | A | 4 |
| 3 | 32 | 3000 | `flowmatch` | `weighted` | `balanced` | A-low | A | 4 |
| 4 | 32 | 250 | `flowmatch` | `weighted` | `balanced` | A | A | 1 |
| 5 | 16 | 2000 | `flowmatch` | `sigmoid` | `content` | F | Flux | 4 |
| 6 | 16 | 2000 | `flowmatch` | `sigmoid` | `style` | F | Flux | 4 |
| 7 | 16 | 2000 | `flowmatch` | `sigmoid` | `content` | Flex | Flex | 4 |
| 8 | 16 | 2000 | `flowmatch` | `weighted` | `content` | Q | Qwen | 4 |
| 9 | 16 | 3000 | `flowmatch` | `weighted` | `style` | QE | Qwen | 4 |
| 10 | 32 | 3000 | `ddpm` | `sigmoid` | `content` | SD | SDXL | 4 |
| 11 | 32 | 3000 | `ddpm` | `sigmoid` | `style` | SD | SDXL | 4 |
| 12 | 32 | 3000 | `ddpm` | `sigmoid` | `content` | SD | SD15 | 4 |
| 13 | 32 | 250 | `flowmatch` | `sigmoid` | `balanced` | W21 | W21 | 1 |
| 14 | 32 | 2000 | `flowmatch` | `linear` | `content` | W22 | W22 | 4 |

Memory profiles are exact:

- A: model/TE quantization false; empty qtypes; low-VRAM false; offloading false with transformer/TE percentages 1; empty model kwargs; compile false.
- A-low: A with low-VRAM true.
- F: model/TE quantization true at `qfloat8`; low-VRAM/offloading/compile false; percentages 1.
- Flex: F plus quantize exclusion `*time_text_embed*` and bypass-guidance true.
- Q: model/TE quantization true at `qfloat8`; low-VRAM true; offloading/compile false; percentages 1.
- QE: Q plus `model_kwargs.match_target_res: false`.
- SD: model/TE quantization false while stored qtypes are `qfloat8`; low-VRAM/offloading/compile false; SDXL/SD15 set convolution rank/alpha 16 while transformer profiles omit them.
- W21: model quantization false, TE quantization true, both stored qtypes `qfloat8`; low-VRAM/offloading/compile false.
- W22: both quantized `qfloat8`; low-VRAM true; offloading/compile false; percentages 1; train both high/low noise; switch boundary every 10.

Sample profiles are exact `(scheduler, width, height, guidance, steps, frames, fps)`: A `(flowmatch,1024,1024,4,30,1,1)`; Flux `(flowmatch,1024,1024,4,20,1,1)`; Flex `(flowmatch,1024,1024,4,25,1,1)`; Qwen `(flowmatch,1024,1024,3,25,1,1)`; SDXL `(ddpm,1024,1024,6,30,1,1)`; SD15 `(ddpm,512,512,6,30,1,1)`; W21 `(flowmatch,832,480,5,30,41,16)`; W22 `(flowmatch,1024,1024,3.5,25,41,16)`.

The expected classes are `AnimaModel`; intentional `StableDiffusion` for `flux`, `flex1`, `sdxl`, and `sd15`; `QwenImageModel`; `QwenImageEditPlusModel`; `Wan21`; and `Wan2214bModel`.

- [ ] **Step 4: Test and add Anima rows 1–4**

First assert the four independent golden records, then add only rows 1–4 to `BUILT_IN_PRESET_ROWS`. Add a tested closed runner selector set `anima | image-modern | sd-wan`; reject a missing value or unknown value when `--catalog-slice` is supplied. Run `npm run test:training-presets -- --catalog-slice=anima` and require exact rows 1–4 with no other slice executed.

- [ ] **Step 5: Test and add FLUX/Flex/Qwen rows 5–9**

Add failing equality cases for rows 5–9, implement those five raw rows, and run `npm run test:training-presets -- --catalog-slice=image-modern`. Require exact rows 5–9 with no other slice executed. Include gated FLUX prerequisites, Flex quantization exclusion/bypass guidance, Q/QE low-VRAM differences, and Qwen Edit control/mask warnings.

- [ ] **Step 6: Test and add SD/Wan rows 10–14**

Add failing equality cases for rows 10–14, implement those five raw rows, and run `npm run test:training-presets -- --catalog-slice=sd-wan`. Require exact rows 10–14 with no other slice executed. Include convolution rank/alpha for SD only, SD15 sample size, Wan frame/FPS settings, Wan diagnostic retention, and dual-noise W22 settings.

- [ ] **Step 7: Add the strict, source-aware built-in application wrapper**

Refactor `trainingPresets.ts` to expose an internal shared engine:

```ts
export interface TrainingPresetApplicationPolicy {
  preserveCurrentNegativePrompt: boolean;
}

export function applyTrainingPresetWithPolicy(
  currentJob: JobConfig,
  untrustedSnapshot: unknown,
  migrate: (jobConfig: JobConfig) => JobConfig,
  policy: TrainingPresetApplicationPolicy,
): JobConfig
```

Keep `applyTrainingPreset(currentJob, snapshot, migrate)` as the unchanged public user wrapper calling that engine with `preserveCurrentNegativePrompt: false`. The shared engine owns current-sample capture and protected-field restoration; when the policy is true it captures the migrated current `sample.neg` with property-presence semantics and restores it both before and after candidate migration.

Add `applyBuiltInTrainingPreset(currentJob, preset, migrate)` in `builtInTrainingPresets.ts`. Re-run `validateBuiltInTrainingPresetRecord(preset)` immediately before application, require exact current `model.arch`, and call the shared engine with `preserveCurrentNegativePrompt: true`; validate the resulting current job shape before returning. Never add catalog metadata to `JobConfig`.

Tests use different current/user negative values and a valid built-in with `sample.neg` absent to prove built-in preservation, user replacement, absent/present behavior, legacy prompt migration, source immutability, result isolation, every protected job/dataset/control field, and full undo input. A separate malformed built-in containing `sample.neg` is rejected before application.

- [ ] **Step 8: Materialize each row independently and return isolated accepted values**

`materializeBuiltInTrainingPresetRow` builds one complete record and strictly validates it. It recursively freezes that accepted record internally and returns a defensive copy. Mutating a returned record, nested snapshot, warning, or profile must not affect a later materialization. Do not export a module-level validated whole catalog; runtime isolation is implemented in Task 4 and whole-release failure in Task 9.

- [ ] **Step 9: Run the golden/application tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS for all 14 exact records.

```bash
git add ui/src/helpers/builtInTrainingPresetDefinitions.ts ui/src/helpers/builtInTrainingPresetGolden.ts ui/src/helpers/trainingPresets.ts ui/src/helpers/builtInTrainingPresets.ts ui/testing/trainingPresetCatalog.test.ts ui/testing/trainingPresets.test.ts ui/testing/runTrainingPresetTests.mjs
git commit -m "feat: add revision one built-in LoRA presets"
```

### Task 4: Add the fail-soft runtime catalog loader

**Files:**
- Create: `ui/src/server/trainingPresetCatalogDigest.ts`
- Create: `ui/src/server/trainingPresetCatalogRuntime.ts`
- Create: `ui/testing/trainingPresetCatalogRuntime.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Write failing invalid-entry/collision tests**

Test valid copies, one malformed row, two raw duplicate IDs, a valid/invalid raw collision, case-sensitive complete IDs, missing/nonstring IDs, and mutation isolation. Collision detection must occur on raw complete string IDs before accepting either participant.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because the runtime loader is absent.

- [ ] **Step 3: Implement redacted events and fail-soft loading**

```ts
export type TrainingPresetCatalogEntryEvent = {
  code: 'BUILTIN_PRESET_INVALID' | 'BUILTIN_PRESET_ID_COLLISION';
  id_digest: string;
};

export type TrainingPresetCatalogProviderEvent = {
  code: 'BUILTIN_PRESET_PROVIDER_FAILED';
};

export function loadBuiltInTrainingPresetCatalog(
  rows: readonly unknown[],
  logger: (event: TrainingPresetCatalogEntryEvent) => void,
): BuiltInTrainingPresetRecord[]

export function getBuiltInTrainingPresetCatalog(
  logger: (event: TrainingPresetCatalogEntryEvent) => void,
): BuiltInTrainingPresetRecord[]
```

Implement full lowercase SHA-256 and its 12-character log prefix only in `trainingPresetCatalogDigest.ts`. For a string ID, hash its exact UTF-8 bytes; for a missing/nonstring ID, hash `invalid-entry:<zero-based-index>`. Log only the entry code/digest—never exceptions, snapshots, prompts, paths, or filesystem detail. Detect raw complete-string collisions first, exclude every participant, then call `materializeBuiltInTrainingPresetRow` independently for each remaining raw row; one bad row cannot throw during module import or hide unrelated entries. Freeze accepted internals and return deep copies. `getBuiltInTrainingPresetCatalog()` obtains raw rows from the nonthrowing definitions provider. Provider-wide failure is caught at the service boundary and emits only `TrainingPresetCatalogProviderEvent`, which intentionally has no fabricated ID digest.

- [ ] **Step 4: Run tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS.

```bash
git add ui/src/server/trainingPresetCatalogDigest.ts ui/src/server/trainingPresetCatalogRuntime.ts ui/testing/trainingPresetCatalogRuntime.test.ts ui/testing/tsconfig.trainingPresets.json ui/testing/runTrainingPresetTests.mjs
git commit -m "feat: load built-in preset catalog fail soft"
```

### Task 5: Prepare the service merge seam without activating built-ins

**Files:**
- Modify: `ui/src/server/trainingPresetService.ts`
- Modify: `ui/testing/trainingPresetService.test.ts`
- Modify: `ui/testing/trainingPresetRouteHandlers.test.ts`
- Modify: `ui/testing/trainingPresetPrismaIntegration.test.ts`

- [ ] **Step 1: Write failing merge/backward-compatibility tests**

Cover an explicitly injected catalog first/users second, exact built-in architecture/category/name/ID ordering, unchanged user comparator, same display name across sources, copied handoffs, an injected provider throw retaining users and emitting only the provider event, reserved-prefix stored rows excluded/logged, create/update/delete touching user rows only, an injected GET route/service harness preserving the two groups/discriminators, and a real Prisma count proving an injected listing of 14 built-ins creates zero database rows. Also prove the production default still returns only user rows in this task.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because deserialized rows have no source and `list()` has no catalog.

- [ ] **Step 3: Add an injectable catalog seam**

```ts
export interface TrainingPresetServiceDependencies {
  listBuiltIns: (
    logger: (event: TrainingPresetCatalogEntryEvent) => void,
  ) => BuiltInTrainingPresetRecord[];
  logCatalogEvent: (event: TrainingPresetCatalogEntryEvent) => void;
  logCatalogProviderFailure: (event: TrainingPresetCatalogProviderEvent) => void;
  logCorruptUserPreset: (idDigest: string) => void;
}

export function createTrainingPresetService(
  store: TrainingPresetStore,
  dependencies?: Partial<TrainingPresetServiceDependencies>,
): TrainingPresetService
```

Through Task 9, the production default for `listBuiltIns` is exactly `(_logger) => []`; tests inject `getBuiltInTrainingPresetCatalog` explicitly. (`deserializeRow` already emits `source: 'user'` and `read_only: false` from Task 1.) `list()` calls the provider with `logCatalogEvent`, retrieves copied injected built-ins, independently deserializes/sorts users, filters any case-insensitive reserved-prefix row as corrupt, and concatenates groups without global sorting. Catch an unexpected injected provider failure, emit only the provider event, and still return users. This explicitly uses the entry logger rather than leaving an inert dependency. Do not make a production GET return built-ins yet: Task 8 finishes compatible client/application behavior, Task 9 finishes whole-release validation/reverse links, and Task 10 atomically activates the provider with the mandatory build gate.

- [ ] **Step 4: Run service/Prisma tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS; injected service tests see the catalog, the production-default service remains user-only, and the Prisma table contains only explicitly created user rows.

```bash
git add ui/src/server/trainingPresetService.ts ui/testing/trainingPresetService.test.ts ui/testing/trainingPresetRouteHandlers.test.ts ui/testing/trainingPresetPrismaIntegration.test.ts
git commit -m "refactor: prepare built-in preset service merge"
```

### Task 6: Enforce API immutability and provenance boundaries

**Files:**
- Modify: `ui/src/server/trainingPresetService.ts`
- Modify: `ui/src/server/trainingPresetRouteHandlers.ts`
- Modify: `ui/testing/trainingPresetService.test.ts`
- Modify: `ui/testing/trainingPresetRouteHandlers.test.ts`

- [ ] **Step 1: Write failing API-boundary tests**

Assert case-insensitive, whitespace-trimmed `builtin:` PUT/DELETE rejection occurs before `findUnique`, `update`, or `delete`. Assert POST top-level provenance fields are rejected individually, nested fields under `job_config` are not mistaken for provenance, and ordinary user create/update/delete responses stay compatible.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because reserved IDs currently reach the store and errors have no code.

- [ ] **Step 3: Add exact errors and response codes**

Add `TrainingPresetReadOnlyError` and `TrainingPresetProvenanceError`. Map the first to HTTP 409 with exactly:

```json
{"error":"Built-in training presets are read-only","code":"BUILTIN_PRESET_READ_ONLY"}
```

Map the second to HTTP 400 with exactly:

```json
{"error":"Preset catalog provenance is server-owned","code":"PRESET_PROVENANCE_NOT_ALLOWED"}
```

Reject own top-level request properties `source`, `read_only`, `category`, `intent_slug`, `model_arch`, `catalog_revision`, `recipe_path`, or `evidence`. Include `code` in JSON only when mapped. Validate the reserved ID before any database lookup.

- [ ] **Step 4: Run tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS with zero store calls for forbidden mutation.

```bash
git add ui/src/server/trainingPresetService.ts ui/src/server/trainingPresetRouteHandlers.ts ui/testing/trainingPresetService.test.ts ui/testing/trainingPresetRouteHandlers.test.ts
git commit -m "feat: protect built-in preset API provenance"
```

### Task 7: Validate, partition, order, and filter records at the client boundary

**Files:**
- Modify: `ui/src/components/TrainingPresetSelect.tsx`
- Modify: `ui/src/components/TrainingPresetControl.tsx`
- Modify: `ui/testing/trainingPresetSelect.test.tsx`
- Modify: `ui/testing/trainingPresetControl.test.tsx`

- [ ] **Step 1: Write failing client-boundary tests**

Cover strict user/built-in branches; user rejection of catalog fields; built-in required metadata; malformed built-in dropped without dropping valid users; malformed user isolated; built-ins first/users second; exact separate sort orders; exact architecture filtering; incompatible built-in selection clearing; user selection retention; and colon-bearing Wan IDs parsed as complete opaque IDs.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because records are monomorphic and the response is globally sorted/all-or-nothing.

- [ ] **Step 3: Implement individual validation and partitioned ordering**

`validateTrainingPresetRecord` returns the correct union branch. `validateTrainingPresetListResponse` validates each element independently, partitions by source, sorts built-ins by the fixed architecture order then category order then English case-insensitive name/exact name/ID, sorts users with the existing comparator, and concatenates without a global sort. Replace all three current global-sort/narrowing sites: normal response validation, `runTrainingPresetMutation`'s refresh-failure fallback, and the component-level sort inside `TrainingPresetSelect`. Export a diagnostic callback for dropped records that receives only source/index/reason code, never snapshots.

- [ ] **Step 4: Render three exact select groups**

Widen `TrainingPresetSelectProps.presets` from `Pick<TrainingPresetRecord, 'id' | 'name'>[]` to complete validated `TrainingPresetRecord[]`; no component may re-sort or erase the discriminator/metadata after the boundary ordering. Add required `currentModelArch` and update `TrainingPresetControl` in the same task to pass `jobConfig.config.process[0].model.arch`, keeping compilation green. Render `Built-in recipes` containing only exact-compatible built-ins, `My presets` containing every user preset, and `Actions`. Built-in option labels include intent and architecture. Update/Delete options are disabled for a selected built-in; Save preset and Undo remain available. A direct handler call must still reject built-in mutation actions. Production responses remain user-only through Task 9 and activate only in Task 10; these mounted tests supply mixed records directly.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS.

```bash
git add ui/src/components/TrainingPresetSelect.tsx ui/src/components/TrainingPresetControl.tsx ui/testing/trainingPresetSelect.test.tsx ui/testing/trainingPresetControl.test.tsx
git commit -m "feat: group compatible built-in training presets"
```

### Task 8: Add mounted built-in details, application, and undo behavior

**Files:**
- Create: `ui/src/components/TrainingPresetDetails.tsx`
- Create: `ui/testing/trainingPresetDetails.test.tsx`
- Create: `ui/testing/trainingPresetApplicationIntegration.test.ts`
- Modify: `ui/src/components/TrainingPresetControl.tsx`
- Modify: `ui/src/components/TrainingPresetSelect.tsx`
- Modify: `ui/testing/trainingPresetControl.test.tsx`
- Modify: `ui/testing/trainingPresetSelect.test.tsx`
- Modify: `ui/testing/trainingPresetPageIntegration.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Write failing mounted behavior tests**

Mount the control with mixed records supplied directly or through Task 5's explicitly injected service harness. Cover built-in application; complete protected-field equality; current negative preservation; ordinary user negative replacement; one-level full undo; direct architecture mismatch rejection; invalid post-application job validation blocking the UI state commit; Update/Delete disabled and handler-guarded; Save Current as New after built-in application; mutation refresh retaining built-ins/grouping; selection clearing after external architecture change; GPU state remaining outside the control; no catalog fields in `JobConfig`/POST; and error/retry behavior. Keep the production-default service user-only through this task.

- [ ] **Step 2: Write the failing all-catalog save-boundary integration test**

For each of the 14 independent golden records, build a current job with its exact architecture plus distinctive datasets, masks, controls, prompt items, negative prompt, trigger, paths, identity, and metadata. Apply through `applyBuiltInTrainingPreset`, then assert the editor job's protected state and dataset references remain structurally/property-presence equal. Next run `migrateJobConfig`, `validateTrainingJobForSave`, and `buildTrainingJobSaveRequest`; assert the established save sanitization still clones datasets, clears browser-supplied `mask_path`, strips `resolved_mask_available`, preserves dataset-preset provenance/other fields, and emits no `source`, `read_only`, category, intent, recipe, revision, summary, warning, prerequisite, or evidence metadata. Server-side dataset/mask resolution remains authoritative.

- [ ] **Step 3: Write the failing details/link test**

Require exact name, summary, evidence label, ordered prerequisite/warning lists, and:

```tsx
assert.equal(anchor.props.href,
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/recipes/focused-refinement.md');
assert.equal(anchor.props.target, '_blank');
assert.equal(anchor.props.rel, 'noopener noreferrer');
```

- [ ] **Step 4: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because details and record-aware application are not wired.

- [ ] **Step 5: Implement record-aware application and UI guards**

Change `preparePresetApplication` to accept a complete `TrainingPresetRecord`; update every call in `trainingPresetSelect.test.tsx` in this same task, dispatch built-ins to `applyBuiltInTrainingPreset` and users to existing `applyTrainingPreset`, and validate the migrated candidate before returning the transaction. Derive current architecture from `jobConfig.config.process[0].model.arch`. Reconcile on external architecture changes. Guard all mutation handlers by `source/read_only`, not just disabled markup.

- [ ] **Step 6: Render details and safe recipe navigation**

Render `TrainingPresetDetails` only for a selected built-in, before or immediately after application. Use only validated metadata and `trainingPresetRecipeUrl`; encode individual segments while preserving `/`. Keep Save as New enabled and existing dialogs limited to user records.

- [ ] **Step 7: Verify the ready-but-not-yet-visible client/application boundary**

Run the mounted control against the injected mixed response and prove it consumes every built-in through strict validation and record-aware application. Reassert that a production-default service still returns users only. Whole-release/backend/recipe validation is added in Task 9 and made a mandatory normal build gate in Task 10; production activation waits for that same Task-10 commit.

- [ ] **Step 8: Run mounted/page/integration tests and commit**

Run: `cd ui && npm run test:training-presets`

Expected: PASS.

```bash
git add ui/src/components/TrainingPresetDetails.tsx ui/src/components/TrainingPresetControl.tsx ui/src/components/TrainingPresetSelect.tsx ui/testing/trainingPresetDetails.test.tsx ui/testing/trainingPresetApplicationIntegration.test.ts ui/testing/trainingPresetControl.test.tsx ui/testing/trainingPresetSelect.test.tsx ui/testing/trainingPresetPageIntegration.test.ts ui/testing/tsconfig.trainingPresets.json ui/testing/runTrainingPresetTests.mjs
git commit -m "feat: add built-in preset details and undo flow"
```

### Task 9: Add whole-release, backend-mapping, evidence, and recipe validation

**Files:**
- Create: `ui/src/server/trainingPresetCatalogBuildValidation.ts`
- Create: `ui/testing/trainingPresetCatalogBuildValidation.test.ts`
- Create: `ui/testing/trainingPresetBackendMapping.test.py`
- Create: `ui/testing/trainingPresetCatalogBuildValidationCli.ts`
- Create: `ui/testing/runTrainingPresetCatalogBuildValidation.mjs`
- Modify: `docs/book/recipes/character-identity.md`
- Modify: `docs/book/recipes/style.md`
- Modify: `docs/book/recipes/object-concept.md`
- Modify: `docs/book/recipes/focused-refinement.md`
- Modify: `docs/book/recipes/low-vram.md`
- Modify: `docs/book/recipes/diagnostic-run.md`
- Modify: `ui/testing/tsconfig.trainingPresets.json`
- Modify: `ui/testing/runTrainingPresetTests.mjs`

- [ ] **Step 1: Write failing whole-catalog tests**

Reject duplicate/omitted/extra rows, mixed revision, ID/field mismatch, category/recipe coverage loss, ordering ambiguity, book preset-architecture drift, missing/escaping recipe, wrong reverse link, missing/wrong/extra model-family deviation link, UI path drift, backend class drift, and unsupported stronger evidence. For every preset architecture, join its recipe's ordinary Markdown model links to the target page's generated `model-facts` architecture membership; link text or mere file existence is insufficient. Assert runtime validation never performs filesystem checks.

- [ ] **Step 2: Write failing AST backend tests**

Use Python `ast` and source reads only—never import model modules. Verify `ModelConfig` suffix stripping and `flex1 -> flux`; intentional `StableDiffusion` resolution for `flux`, `flex1`, `sdxl`, `sd15`; and registered classes for Anima, Qwen Image, Qwen Image Edit Plus, Wan 2.1, and Wan 2.2 14B.

The Python command accepts `--emit <owned-json-path>` and writes this strict handoff:

```json
{
  "schema_version": 1,
  "bindings": [
    {
      "ui_architecture": "anima",
      "normalized_architecture": "anima",
      "model_class": "AnimaModel",
      "source_path": "extensions_built_in/diffusion_models/anima/anima.py",
      "symbol": "AnimaModel"
    }
  ]
}
```

All nine bindings appear exactly once in canonical architecture order; source paths are repository-relative and symbols must still exist.

- [ ] **Step 3: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL because build validation and reverse references are absent.

- [ ] **Step 4: Implement `validateBuiltInTrainingPresetRelease`**

```ts
export function validateBuiltInTrainingPresetRelease(options: {
  repositoryRoot: string;
  records?: readonly BuiltInTrainingPresetRecord[];
  backendReport: TrainingPresetBackendMappingReport;
  uiFacts: TrainingPresetUiMappingReport;
}): void
```

Define `TrainingPresetUiMappingReport` locally as the strict projection of the book collector's facts needed here: schema version plus ordered `{name, model_path, gate_url, controls}` architecture rows. The guarded MJS runner creates an owned temporary directory, invokes the Python AST command to emit `backendReport`, uses the book plan's single `collectTrainingBookUiFacts` helper to project `uiFacts`, and runs `python scripts/generate_training_book_reference.py --check` before trusting any model-facts block; no second architecture fixture or import from production client code into the server validator is introduced. Validate the exact golden release, `docs/book/book-manifest.json`, recipe existence/confinement, both directions of marker membership, live UI identifiers/paths, AST backend report, and evidence files. Parse each recipe's Model-specific deviations links outside generated markers and each verified target page's generated `model-facts` block; require the exact recipe link sets specified by Book Task 11, then require every record's `model_arch` to occur in at least one linked target block and reject a linked block with no architecture mapped to that recipe. Reject missing/extra/duplicate report rows or disagreement across ID/metadata/snapshot/UI/backend. Runtime modules must not call this function.

When `records` is omitted, build validation reads every raw `BUILT_IN_PRESET_ROWS` entry and materializes all of them strictly, collecting errors and failing the release; it must not call the fail-soft runtime catalog getter, because an omitted invalid row must appear as a golden omission/error rather than silently disappearing.

For stronger evidence, require `docs/book/preset-evidence/<full-id-sha256>.json` with this exact strict shape:

```ts
interface PresetEvidenceAttestation {
  schema_version: 1;
  preset_id: string;
  catalog_revision: number;
  snapshot_sha256: string;
  repository_commit: string;
  tested_at: string;
  hardware_model: string;
  model_identifier: string;
  test_scope: 'launch-tested' | 'training-tested';
  result: 'passed';
  reviewer: string;
}
```

The filename is the full lowercase SHA-256 of the exact preset ID, snapshot digest covers only canonical snapshot JSON, repository commit is 40 lowercase hex, `tested_at` is UTC RFC 3339 ending in `Z`, and all strings are nonblank. Tests reject missing/extra fields, malformed filename digest, wrong ID/revision, stale snapshot, nonancestor/unknown commit, non-UTC date, unsuccessful result, scope/label mismatch, and missing reviewer. All revision-1 records remain `configuration-validated`, so no evidence directory/file is created now.

- [ ] **Step 5: Generate exact recipe reverse references**

The marker membership is:

```text
character-identity.md: entries 1, 5, 10, 12, 14
style.md: entries 6, 11
object-concept.md: entries 7, 8
focused-refinement.md: entries 2, 9
low-vram.md: entry 3
diagnostic-run.md: entries 4, 13
```

The CLI supports `--write-recipes` for implementation, `--check` for tests/build, and `--emit-book-facts <owned-path>` for final book validation. The emitted strict JSON contains only schema version plus ordered `{id,name,model_arch,recipe_path}` rows. Recipe generation rewrites only `<!-- built-in-presets:start -->` through `<!-- built-in-presets:end -->`, listing exact IDs and names once in canonical order.

- [ ] **Step 6: Run build validation tests and commit**

Run: `cd ui && node testing/runTrainingPresetCatalogBuildValidation.mjs --write-recipes`

Expected: six marker blocks updated.

Run: `cd ui && node testing/runTrainingPresetCatalogBuildValidation.mjs --check`

Expected: PASS.

Run: `cd ui && npm run test:training-presets`

Expected: PASS including the Python AST test.

```bash
git add ui/src/server/trainingPresetCatalogBuildValidation.ts ui/testing/trainingPresetCatalogBuildValidation.test.ts ui/testing/trainingPresetBackendMapping.test.py ui/testing/trainingPresetCatalogBuildValidationCli.ts ui/testing/runTrainingPresetCatalogBuildValidation.mjs ui/testing/tsconfig.trainingPresets.json ui/testing/runTrainingPresetTests.mjs docs/book/recipes
git commit -m "test: validate built-in preset release evidence"
```

### Task 10: Enforce the release gate and atomically activate built-ins

**Files:**
- Modify: `ui/testing/runTrainingPresetTests.mjs`
- Modify: `ui/testing/trainingPresetPageIntegration.test.ts`
- Modify: `ui/src/server/trainingPresetService.ts`
- Modify: `ui/testing/trainingPresetService.test.ts`
- Modify: `ui/testing/trainingPresetRouteHandlers.test.ts`
- Modify: `ui/testing/trainingPresetPrismaIntegration.test.ts`
- Modify: `ui/package.json`

- [ ] **Step 1: Add failing runner/build contract tests**

Assert every `trainingPreset*.test.tsx?`, runtime/catalog test, Python mapping test, and catalog release check is mandatory. Assert `--catalog-only` runs strict release validation without Prisma/UI lifecycle suites. Assert `build` invokes catalog validation before TypeScript/Next compilation. Add default-service/route tests requiring 14 built-ins ahead of users, redacted entry logging, provider failure retaining users, zero built-in Prisma rows, and the same response accepted by the now-ready client/application integration; these remain RED while the production dependency is still the empty provider.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-presets`

Expected: FAIL until the runner exposes/enforces catalog-only mode and build script order.

- [ ] **Step 3: Add exact scripts and guarded orchestration**

Add:

```json
"validate:training-presets": "node testing/runTrainingPresetTests.mjs --catalog-only",
"build": "npm run validate:training-presets && tsc -p tsconfig.worker.json && next build"
```

`--catalog-only` must compile/run pure catalog, build validation, recipe checks, Python mapping, and the training-book reference generator's `--check` mode used to authenticate model-family fact blocks. Normal mode runs those plus all existing user-preset/service/Prisma/UI tests. Preserve guarded `mkdtemp` cleanup and mandatory artifact checks.

- [ ] **Step 4: Activate the catalog in the same release-gate commit**

Only after the strict catalog-only runner and build prefix exist, change the production default `listBuiltIns` dependency in `createTrainingPresetService` from `(_logger) => []` to `getBuiltInTrainingPresetCatalog`. Prove the default service passes its redacted entry logger, GET returns canonical built-ins plus users, Prisma remains user-only, provider failure is fail-soft, and all records traverse the strict client/source-aware application path. The final Task-10 diff and commit must contain both the mandatory normal-release gate and this default switch; there is no intermediate commit with a visible but ungated catalog.

- [ ] **Step 5: Run focused, service, and build validation**

Run: `cd ui && npm run validate:training-presets`

Expected: PASS.

Run: `cd ui && npm run test:training-presets`

Expected: PASS.

Run: `cd ui && npm run build`

Expected: PASS with no catalog fallback or recipe drift.

- [ ] **Step 6: Commit the atomic gate/activation boundary**

```bash
git add ui/src/server/trainingPresetService.ts ui/testing/runTrainingPresetTests.mjs ui/testing/trainingPresetPageIntegration.test.ts ui/testing/trainingPresetService.test.ts ui/testing/trainingPresetRouteHandlers.test.ts ui/testing/trainingPresetPrismaIntegration.test.ts ui/package.json
git commit -m "feat: activate validated built-in preset catalog"
```

### Task 11: Verify the combined automated edition and hand off to GPU smoke

**Files:**
- Modify only if a test exposes a specification mismatch; do not broaden scope during verification.

- [ ] **Step 1: Run the exact four-command automated gate**

From `ui/`, run:

```bash
npm run test:training-book
npm run test:training-presets
npm run test:dataset-presets
npm run build
```

Expected: all four PASS. The known Node/npm compatibility and React renderer deprecation warnings may remain.

- [ ] **Step 2: Verify immutable/database/documentation boundaries**

Run: `cd ui && node testing/runTrainingPresetCatalogBuildValidation.mjs --check`

Expected: PASS.

Run: `git diff --check`

Expected: no output.

Confirm no Prisma schema/migration/seed diff, all 14 records remain configuration-validated, user CRUD tests pass unchanged, and all six recipe blocks match the canonical export.

- [ ] **Step 3: Commit any verification-only test correction separately**

If no correction was necessary, do not create an empty commit. If a test contract required a correction, stage only that test/validator change and use:

```bash
git commit -m "test: close built-in preset release gate"
```

- [ ] **Step 4: Return to the book plan**

Execute Tasks 16–17 of `2026-08-14-lora-training-book.md`: commit the complete combined edition, perform the real supported-GPU diagnostic/resume smoke against that exact commit, commit its record separately, and rerun the four-command final gate.
