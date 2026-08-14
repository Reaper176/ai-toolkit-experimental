# Built-in LoRA Preset Catalog Design

**Date:** 2026-08-14

## Goal

Ship a small, safe, versioned catalog of immutable LoRA training presets for the core model families documented by the LoRA Training Book. Built-ins provide current, architecture-specific starting configurations while preserving the explicitly protected identity, path, device, trigger, dataset, and prompt values enumerated below. They are configuration starters, not quality or hardware guarantees.

This catalog extends the existing server-backed training preset feature. User-created presets retain their existing SQLite lifecycle and behavior.

## Product Boundary

Built-in presets modify training behavior only. Applying one must preserve:

- job name and metadata;
- output/training folder and SQLite path;
- device and GPU selection;
- trigger word;
- the complete datasets array, including selected dataset versions, resolutions, repeats, captions, controls, masks, caching, and provenance;
- sample prompts, global negative prompt, and control images.

Dataset advice lives in linked recipe/model chapters. A built-in never silently changes a dataset to meet a claimed VRAM target.

## Static Immutable Catalog

Built-ins are release-managed definitions in a pure source module. They are not seeded into the `TrainingPreset` table. The service merges validated catalog records with user rows for list responses.

Reasons for a static catalog:

- no startup seed/update/delete lifecycle is required;
- catalog revisions ship atomically with compatible code and documentation;
- user rows remain entirely user-owned;
- immutable records cannot be accidentally updated through Prisma;
- invalid definitions can be caught at build/test time.

Catalog IDs use a reserved deterministic namespace:

```text
builtin:<architecture>:<intent>@<catalog-revision>
```

User-generated UUIDs and action values cannot collide with that namespace.

## Record Contract

The public preset record becomes a discriminated union. Stored user snapshots remain backward-compatible; API records add explicit origin metadata:

```ts
type TrainingPresetSource = 'builtin' | 'user';

interface UserTrainingPresetRecord extends TrainingPresetRecord {
  source: 'user';
  read_only: false;
}

interface BuiltInTrainingPresetRecord extends TrainingPresetRecord {
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
```

User records are returned with `source: 'user'` and `read_only: false`; catalog-only metadata is absent. Built-ins use the release timestamp `2026-08-14T00:00:00.000Z` for both inherited timestamp fields. The snapshot schema version remains the configuration shape version and is not reused as a catalog revision.

All records remain untrusted at the client boundary and are validated individually before rendering or applying. Canonical static definitions are recursively frozen after validation, and every service/client handoff receives a defensive deep copy.

## Strict Built-in Validation

Built-ins pass the existing `validateTrainingPresetSnapshot` and a stricter catalog-only validator. The stricter validator requires:

- deterministic ID matching the declared architecture, intent, and revision;
- `source: builtin` and `read_only: true`;
- `diffusion_trainer` process type;
- `network.type: lora`;
- an exact current UI architecture identifier from the approved first-edition allowlist;
- a nonblank supported model path;
- plain `model`, `network`, `train`, `save`, `sample`, and logging sections;
- finite numeric values and nonnegative intervals/rates where appropriate;
- no datasets, trigger, job identity, output path, device, or sample prompt leakage;
- `push_to_hub: false` and no Hub repository fields;
- no W&B or other remote logging activation;
- an existing recipe path under `docs/book/recipes/`;
- nonblank summary and explicit warnings/prerequisites arrays;
- a recognized evidence value.

The first global `catalog_revision` is `1`. IDs are reconstructed from already validated fields as `builtin:${model_arch}:${intent_slug}@${catalog_revision}` and compared as complete strings; they are never parsed by splitting on `:` because architecture identifiers such as `wan21:1b` contain colons.

For every entry:

```text
record.model_arch
  === snapshot.config.process[0].model.arch
  === the architecture used to reconstruct the ID
```

The strict validator also binds `model.name_or_path` and backend normalization to this exact allowlist:

| UI architecture | Required model path | Expected engine architecture | Expected model class |
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

Unknown/missing architectures, suffix mismatches, metadata/snapshot disagreement, unexpected model paths, and disagreement with the expected resolved model class are catalog errors. The legacy `StableDiffusion` fallback is intentional and required for `flux`, `flex1`, `sdxl`, and `sd15`; it is rejected for every other row. Tests source-verify this mapping against backend normalization and model registration without treating every fallback as a failure.

General user-preset validation remains permissive for legacy, advanced, and future configurations. It is not tightened to catalog policy.

## Architecture Applicability

The initial catalog is exact-architecture only. A built-in is shown and may be applied only when its `model_arch` equals the editor’s current UI architecture identifier. This avoids applying a snapshot across architectures without running the full model-selection normalization in `handleModelArchChange`.

Changing architectures clears an incompatible built-in selection. The catalog does not automatically switch the user’s model architecture. A user first selects the model, then chooses a compatible built-in.

Architecture identifiers with variant suffixes remain distinct. Backend normalization that strips suffixes does not make two UI variants interchangeable for catalog purposes.

## Initial Catalog Scope

The first catalog is curated and contains the following 14 entries. Every entry has revision `1`, evidence `configuration-validated`, and a literal ID reconstructed by the rule above:

### Anima (`anima`)

1. `builtin:anima:character-identity@1` — name `Anima — Character / Identity` — category `character` — recipe `docs/book/recipes/character-identity.md`
2. `builtin:anima:focused-refinement@1` — name `Anima — Focused Refinement` — category `refinement` — recipe `docs/book/recipes/focused-refinement.md`
3. `builtin:anima:low-vram-starting-point@1` — name `Anima — Low-VRAM Starting Point` — category `low-vram` — recipe `docs/book/recipes/low-vram.md`
4. `builtin:anima:short-diagnostic-run@1` — name `Anima — Short Diagnostic Run` — category `diagnostic` — recipe `docs/book/recipes/diagnostic-run.md`

### FLUX.1 (`flux`)

5. `builtin:flux:character-general-concept@1` — name `FLUX.1 — Character / General Concept` — category `character` — recipe `docs/book/recipes/character-identity.md`
6. `builtin:flux:style-aesthetic@1` — name `FLUX.1 — Style / Aesthetic` — category `style` — recipe `docs/book/recipes/style.md`

### Flex.1 (`flex1`)

7. `builtin:flex1:object-general-concept@1` — name `Flex.1 — Object / General Concept` — category `object` — recipe `docs/book/recipes/object-concept.md`

### Qwen

8. `builtin:qwen_image:object-general-concept@1` — name `Qwen Image — Object / General Concept` — category `object` — recipe `docs/book/recipes/object-concept.md`
9. `builtin:qwen_image_edit_plus:focused-refinement@1` — name `Qwen Image Edit 2509 — Focused Refinement` — category `refinement` — recipe `docs/book/recipes/focused-refinement.md`

### Stable Diffusion

10. `builtin:sdxl:character-identity@1` — name `SDXL — Character / Identity` — category `character` — recipe `docs/book/recipes/character-identity.md`
11. `builtin:sdxl:style-aesthetic@1` — name `SDXL — Style / Aesthetic` — category `style` — recipe `docs/book/recipes/style.md`
12. `builtin:sd15:character-identity@1` — name `SD 1.5 — Character / Identity` — category `character` — recipe `docs/book/recipes/character-identity.md`

### Wan

13. `builtin:wan21:1b:subject-motion-diagnostic@1` — name `Wan 2.1 1.3B T2V — Subject / Motion Diagnostic` — category `diagnostic` — recipe `docs/book/recipes/diagnostic-run.md`
14. `builtin:wan22_14b:t2v:subject-motion-starting-point@1` — name `Wan 2.2 14B T2V — Subject / Motion Starting Point` — category `character` — recipe `docs/book/recipes/character-identity.md`

This is not a Cartesian product. Unsupported intent/model combinations are omitted. The proposed FLUX low-VRAM entry is deliberately excluded because current `modelArchs` does not declare `low_vram` for `flux`; a commented historical YAML option is insufficient catalog evidence. Additional Qwen revisions, edit variants, Wan I2V variants, FLUX Kontext, Flex.2, and other UI architectures require later catalog revisions with dedicated compatibility evidence.

Every approved recipe category is represented at least once. Video-specific dataset requirements are explained in the Wan model chapter and linked character/diagnostic recipe sections.

The exact revision-1 summaries are:

| Entry | Literal `summary` |
|---:|---|
| 1 | Anima LoRA starting point biased toward recurring character or identity learning. |
| 2 | Anima starting point biased toward low-noise detail and focused refinement. |
| 3 | Anima character starting point with low-VRAM mode enabled; dataset memory settings remain unchanged. |
| 4 | One-interval Anima run for validating configuration, samples, saving, and queue behavior. |
| 5 | FLUX.1 starting point biased toward subject and general concept learning. |
| 6 | FLUX.1 starting point biased toward style and aesthetic learning. |
| 7 | Flex.1 starting point for objects and general concepts with its required guidance behavior. |
| 8 | Qwen Image low-VRAM starting point for objects and general concepts. |
| 9 | Qwen Image Edit 2509 starting point for paired edit/refinement training; control data is required. |
| 10 | SDXL LoRA starting point biased toward character and identity learning. |
| 11 | SDXL LoRA starting point biased toward style and aesthetic learning. |
| 12 | SD 1.5 LoRA starting point biased toward character and identity learning. |
| 13 | One-interval Wan 2.1 1.3B T2V run for validating a video dataset and training pipeline. |
| 14 | Wan 2.2 14B T2V starting point for subject and motion learning across both noise stages. |

## Normative Snapshot Matrix

Catalog construction is deterministic. Value precedence is:

1. the exact common snapshot below;
2. the exact architecture/memory/sample profile below;
3. the exact row override below.

Historical YAML and book prose are evidence inputs only and never override these definitions at runtime. UI defaults are verification fixtures, not hidden merge inputs. Catalog definitions build full snapshots, validate them, recursively freeze the canonical values, and expose defensive copies.

Every snapshot uses this common process configuration unless a later table explicitly overrides it:

```yaml
schema_version: 1
job: extension
config:
  process:
    - type: diffusion_trainer
      network:
        type: lora
        linear_alpha: "equal to row linear rank"
        network_kwargs:
          ignore_if_contains: []
      train:
        batch_size: 1
        gradient_accumulation: 1
        train_unet: true
        train_text_encoder: false
        gradient_checkpointing: true
        optimizer: adamw8bit
        optimizer_params:
          weight_decay: 0.0001
        lr: 0.0001
        lr_scheduler: constant
        dtype: bf16
        loss_type: mse
        inverted_mask_prior: false
        inverted_mask_prior_multiplier: 0.5
        unload_text_encoder: false
        cache_text_embeddings: false
        ema_config:
          use_ema: false
          ema_decay: 0.99
        skip_first_sample: false
        force_first_sample: false
        disable_sampling: false
        diff_output_preservation: false
        bypass_guidance_embedding: false
        switch_boundary_every: 1
      save:
        dtype: bf16
        save_every: 250
        max_step_saves_to_keep: "row value"
        save_format: diffusers
        push_to_hub: false
      sample:
        sample_every: 250
        sample_start_step: 0
        seed: 42
        walk_seed: true
      logging:
        log_every: 1
        use_ui_logger: true
        use_wandb: false
```

The entry overlays are below. “Steps” maps to `train.steps`, “Timestep” to `train.timestep_type`, “Bias” to `train.content_or_style`, and rank/alpha are literal equal values.

| Entry | Linear rank/alpha | Steps | Noise scheduler | Timestep | Bias | Memory | Sample | Keep |
|---:|---:|---:|---|---|---|---|---|---:|
| 1 | 32 | 3000 | flowmatch | weighted | content | A | A | 4 |
| 2 | 32 | 3000 | flowmatch | weighted | style | A | A | 4 |
| 3 | 32 | 3000 | flowmatch | weighted | balanced | A-low | A | 4 |
| 4 | 32 | 250 | flowmatch | weighted | balanced | A | A | 1 |
| 5 | 16 | 2000 | flowmatch | sigmoid | content | F | Flux | 4 |
| 6 | 16 | 2000 | flowmatch | sigmoid | style | F | Flux | 4 |
| 7 | 16 | 2000 | flowmatch | sigmoid | content | Flex | Flex | 4 |
| 8 | 16 | 2000 | flowmatch | weighted | content | Q | Qwen | 4 |
| 9 | 16 | 3000 | flowmatch | weighted | style | QE | Qwen | 4 |
| 10 | 32 | 3000 | ddpm | sigmoid | content | SD | SDXL | 4 |
| 11 | 32 | 3000 | ddpm | sigmoid | style | SD | SDXL | 4 |
| 12 | 32 | 3000 | ddpm | sigmoid | content | SD | SD15 | 4 |
| 13 | 32 | 250 | flowmatch | sigmoid | balanced | W21 | W21 | 1 |
| 14 | 32 | 2000 | flowmatch | linear | content | W22 | W22 | 4 |

Transformer profiles omit `network.conv` and `conv_alpha`. SDXL/SD 1.5 set both to `16`. Every architecture sets `model.arch` and `model.name_or_path` from the strict mapping table.

Memory profiles are exact:

- **A:** model/TE quantization false; `qtype`/`qtype_te` empty; `low_vram:false`; layer offloading false with transformer/TE percentages `1`; `model_kwargs:{}`; compile false.
- **A-low:** A plus `low_vram:true`; layer offloading remains false.
- **F:** model/TE quantization true, both `qfloat8`; `low_vram:false`; layer offloading false with percentages `1`; compile false.
- **Flex:** F plus `model.quantize_kwargs.exclude:['*time_text_embed*']` and `train.bypass_guidance_embedding:true`.
- **Q:** model/TE quantization true, both `qfloat8`; `low_vram:true`; layer offloading false with percentages `1`; compile false.
- **QE:** Q plus `model.model_kwargs.match_target_res:false`.
- **SD:** model/TE quantization false; stored qtypes `qfloat8`; `low_vram:false`; layer offloading false; compile false.
- **W21:** model quantization false; TE quantization true; qtypes `qfloat8`; `low_vram:false`; layer offloading false; compile false.
- **W22:** model/TE quantization true with `qfloat8`; `low_vram:true`; layer offloading false with percentages `1`; `model_kwargs:{train_high_noise:true,train_low_noise:true}`; compile false; `switch_boundary_every:10`.

No accuracy-recovery or assistant adapter is included in revision 1.

Non-prompt sample profiles are exact:

- **A:** flowmatch, 1024×1024, guidance 4, 30 steps, one frame, FPS 1.
- **Flux:** flowmatch, 1024×1024, guidance 4, 20 steps, one frame, FPS 1.
- **Flex:** flowmatch, 1024×1024, guidance 4, 25 steps, one frame, FPS 1.
- **Qwen:** flowmatch, 1024×1024, guidance 3, 25 steps, one frame, FPS 1.
- **SDXL:** DDPM, 1024×1024, guidance 6, 30 steps, one frame, FPS 1.
- **SD15:** DDPM, 512×512, guidance 6, 30 steps, one frame, FPS 1.
- **W21:** flowmatch, 832×480, guidance 5, 30 steps, 41 frames, FPS 16.
- **W22:** flowmatch, 1024×1024, guidance 3.5, 25 steps, 41 frames, FPS 16.

The catalog deliberately adopts three new revision-1 policies: diagnostic runs use 250 total steps with one retained periodic save; character/object/subject intents use `content`, style/refinement uses `style`, and low-VRAM/diagnostic uses `balanced`; intent slugs and global revision are the literal values declared above. These are disclosed catalog policies, not claims recovered from historical examples.

Every record's `prerequisites` array begins with these exact strings in this order:

1. `Select the exact model architecture shown by this preset.`
2. `Review the linked recipe and provide a compatible dataset; dataset settings are not changed.`

Every record's `warnings` array begins with `Configuration validation does not guarantee output quality or a specific VRAM requirement.` The following exact arrays are appended in the listed order; `[]` means no additional item:

| Entry | Additional `prerequisites` | Additional `warnings` |
|---:|---|---|
| 1 | `[]` | `[]` |
| 2 | `[]` | `["Masks and inverted-mask prior are not enabled automatically."]` |
| 3 | `[]` | `["Low-VRAM mode may reduce throughput and does not guarantee a specific VRAM requirement."]` |
| 4 | `[]` | `[]` |
| 5 | `["Access to the gated black-forest-labs/FLUX.1-dev repository is required."]` | `[]` |
| 6 | `["Access to the gated black-forest-labs/FLUX.1-dev repository is required."]` | `[]` |
| 7 | `[]` | `[]` |
| 8 | `[]` | `[]` |
| 9 | `["Filename-matched edit/control data is required."]` | `["Masks and inverted-mask prior are not enabled automatically."]` |
| 10 | `[]` | `[]` |
| 11 | `[]` | `[]` |
| 12 | `[]` | `[]` |
| 13 | `["Video frame-count and FPS settings must be compatible with the linked Wan chapter."]` | `[]` |
| 14 | `["Video frame-count and FPS settings must be compatible with the linked Wan chapter."]` | `["The Wan 2.2 14B model remains resource intensive despite quantization and low-VRAM settings."]` |

## Preset Content Rules

Preset values use the normative matrix rather than being copied verbatim from historical YAML. Each entry contains architecture-appropriate:

- model path and architecture;
- network rank/alpha and safe target exclusions;
- optimizer, learning rate, weight decay, scheduler/timestep, loss, and step count;
- precision, quantization, low-VRAM/offloading flags where applicable;
- save/sample cadence and retention;
- fixed non-prompt sampling behavior;
- architecture-required adapters or model kwargs only when they are current and explicitly disclosed.

Mask-dependent settings such as inverted-mask prior remain disabled because datasets are preserved and may not contain masks. The focused-refinement recipe explains how to enable mask settings after the UI confirms resolved masks.

No preset may contain placeholders that would reach runtime, personal paths, workstation-specific directories, or mutable dataset paths. Both preset sources omit `sample.samples` and legacy `sample.prompts`. Built-in definitions additionally forbid `sample.neg`, and the built-in application path captures and restores the current job's global negative prompt with property-presence semantics. Existing user-preset compatibility remains unchanged: `sanitizeTrainingPreset` may retain `sample.neg`, and applying a user preset may replace the current global negative prompt with the saved user-preset value.

## Application and Undo

Built-ins use the existing deep-copy preset application semantics:

1. Validate the catalog record and snapshot.
2. Confirm exact architecture compatibility.
3. Capture one undo snapshot of the current complete job configuration.
4. Apply the authoritative preset process.
5. Restore protected job identity, dataset, trigger, device, path, sample items/controls, and—for built-ins only—the current global negative-prompt field.
6. Validate the resulting job configuration before committing UI state.

Applying a built-in does not create a live relationship. The resulting settings are saved into the job. Later catalog revisions cannot mutate existing jobs.

Built-in preservation uses structural deep equality plus property-presence semantics. `config.name`, root `meta`, `training_folder`, `sqlite_db_path`, `device`, `trigger_word`, and `datasets` equal the original pre-application input, including absent versus present properties. `sample.samples` and `sample.neg` equal the migrated current representation; legacy `sample.prompts` is allowed to become `sample.samples` through the existing migration and is not resurrected alongside it. User-preset negative-prompt semantics remain the current saved-value behavior. GPU state, which lives outside `JobConfig`, remains unchanged. Undo restores the complete original editor `JobConfig` snapshot, not merely protected fields.

## API and Service Behavior

`GET /api/training-presets` returns validated built-ins first and user records second in one response. Built-in architecture order is `anima`, `flux`, `flex1`, `qwen_image`, `qwen_image_edit_plus`, `sdxl`, `sd15`, `wan21:1b`, `wan22_14b:t2v`. Category order is `character`, `style`, `object`, `refinement`, `low-vram`, `diagnostic`; ties use the existing English case-insensitive name comparator, exact name, then ID. User records retain their existing case-insensitive name/exact-name/ID ordering. The client preserves the two groups and never globally re-sorts the merged response.

`PUT` and `DELETE` reject any case-insensitive `builtin:` ID prefix before database access with HTTP 409 and `{ "error": "Built-in training presets are read-only", "code": "BUILTIN_PRESET_READ_ONLY" }`. `POST` continues creating user presets but rejects request bodies containing `source`, `read_only`, `category`, `intent_slug`, `model_arch`, `catalog_revision`, `recipe_path`, or `evidence` with HTTP 400 and code `PRESET_PROVENANCE_NOT_ALLOWED`. A user may use the same display name as a built-in because grouping and IDs disambiguate them.

Whole-catalog validation rejects an entry error, duplicate ID, missing or extra normative entry, mixed revision, duplicate manifest row, ID/field mismatch, category/recipe coverage loss, ordering ambiguity, or stronger evidence without a valid attestation. `npm run test:training-presets` invokes this validator, and `npm run build` runs the same validator before Next compilation.

One invalid built-in must not make user presets unavailable in production. Runtime catalog loading validates entries independently; all built-ins participating in an ID collision are excluded, other invalid built-ins are excluded, and a redacted error code plus deterministic ID digest is logged without snapshot contents, prompts, paths, or filesystem details. The log digest is the first 12 lowercase hexadecimal characters of SHA-256 over the UTF-8 bytes of the exact complete preset ID. The server still returns valid built-ins plus user records. The client also validates records individually and drops malformed built-in records without discarding valid user records. Tests/build make this fail-safe unreachable in a normal release.

If a stored user row somehow uses the case-insensitive reserved ID prefix, it is treated as corrupt user data and excluded with the existing generic corruption logging; it never shadows a built-in. Display-name collisions across sources remain allowed.

No Prisma migration or seed operation is introduced.

## UI Behavior

The preset selector displays two groups:

- **Built-in recipes** for compatible catalog entries;
- **My presets** for saved user records.

Built-in labels include intent and architecture. Selecting a built-in applies it immediately, records the ordinary one-level undo state, and exposes a **View recipe** link. The detail area shows summary, evidence level, prerequisites, and warnings before or immediately after application without blocking ordinary editing.

Update and Delete remain disabled for built-ins. Server enforcement is authoritative. Save Current as New remains available, allowing the user to apply a built-in, modify it, and save a separate user-owned preset.

When no built-in matches the current architecture, the group displays no entries rather than offering incompatible configurations. User presets remain visible because they preserve their existing behavior and may intentionally switch architectures.

## Evidence Labels

Evidence is explicit:

- `configuration-validated`: schema, source compatibility, safety, and job-application tests passed;
- `launch-tested`: a representative job reached model/dataset initialization;
- `training-tested`: a representative run completed far enough for manual checkpoint/sample evaluation.

All 14 revision-1 entries are unconditionally `configuration-validated`. This label means static schema/catalog validation, protected-field application tests, semantic configuration validation, and verified UI-architecture-to-engine mapping; it does not mean a model was downloaded or a job was launched.

Any future stronger label requires `docs/book/preset-evidence/<preset-id-digest>.json` containing preset ID/revision, canonical snapshot SHA-256, repository commit, UTC date, hardware/model identifier, test scope, result, and reviewer. `<preset-id-digest>` is the full 64-character lowercase hexadecimal SHA-256 of the UTF-8 bytes of the exact complete preset ID. The snapshot digest is the full lowercase SHA-256 of its canonical JSON UTF-8 bytes. Canonical JSON recursively sorts object keys by Unicode code point, preserves array order, emits `JSON.stringify`-equivalent JSON with no insignificant whitespace, and rejects `undefined`, non-finite numbers, sparse arrays, and non-JSON values rather than coercing them. Changing the canonical snapshot changes its digest and invalidates the attestation until evidence is repeated. Build validation rejects stronger labels with missing, stale, mismatched, or unsuccessful attestations.

Memory labels are descriptive test conditions, not guarantees. A “Low-VRAM starting point” states which quantization/offloading choices it sets and directs users to the recipe; it does not promise a specific card capacity because dataset resolutions and caches are preserved.

## Documentation Coupling

Every built-in `recipe_path` must normalize beneath `docs/book/recipes/` and point to one of the six recipe chapters. The UI resolves it against `https://github.com/Reaper176/ai-toolkit-experimental/blob/main/` only after path normalization and encoding each path segment while preserving `/` separators. Filesystem/link existence is build-time validation and is not performed by the runtime server.

Each recipe contains a committed generated reverse-reference block delimited by `<!-- built-in-presets:start -->` and `<!-- built-in-presets:end -->`; it lists every mapped deterministic preset ID exactly once. Model-specific deviations link onward to the matching model-family chapter. Validation checks record-to-recipe and recipe-to-record relationships in both directions.

Preset descriptions remain concise. Dataset curation, parameter trade-offs, and troubleshooting belong in the book so guidance is reviewable and does not become duplicated UI prose.

## Testing

Focused tests cover:

### Pure catalog and preset helpers

- the exact golden 14-entry manifest, snapshots, IDs, names, summaries, intent slugs, architectures, categories, revisions, evidence labels, model paths, ordered warning/prerequisite arrays, and recipe links;
- catalog-level duplicate/omission/extra/mixed-revision failures;
- strict LoRA/process/model validation;
- no protected fields, external side effects, placeholders, or mutable references;
- exact-architecture applicability;
- UI/snapshot/ID/backend architecture agreement, variant mismatches, the four intentional `StableDiffusion` fallbacks, and rejection of fallback for every other catalog architecture;
- deterministic sorting and name/ID collision behavior;
- stronger evidence without a matching attestation is rejected;
- apply/undo preserves every protected job and dataset field and property presence; a built-in preserves a differing current global negative prompt while a user preset retains the existing saved-negative-prompt behavior; legacy prompt migration semantics remain covered.

### Service and routes

- merged list behavior with empty and populated user stores;
- invalid built-in isolation plus redacted logging and build-time failure coverage;
- read-only PUT/DELETE rejection before database access;
- POST provenance spoofing rejection;
- unchanged user create/update/delete behavior;
- no built-in rows are seeded into Prisma.

### UI

- separate built-in and user groups;
- current-architecture filtering and selection clearing;
- summary, warnings, evidence, and recipe link rendering;
- built-in update/delete disabled;
- direct UI mutation attempts remain blocked even when controls are bypassed;
- apply, edit, save-as-user-preset, and undo behavior;
- protected datasets, masks, controls, prompts, GPU, trigger, and paths remain unchanged.

### Integration

- each built-in produces a valid current job configuration for its exact architecture;
- client save request strips UI-only catalog state;
- job save/preflight remains authoritative for datasets and masks;
- the exact four-command automated gate remains successful.

## Acceptance Criteria

The catalog's automated acceptance gate is the same exact four-command gate defined by the book design: from the repository root, run `cd ui`, then `npm run test:training-book`, `npm run test:training-presets`, `npm run test:dataset-presets`, and `npm run build`. Full combined-edition acceptance additionally requires the current-edition supported-GPU smoke record defined by the book design; that smoke does not promote any catalog entry beyond `configuration-validated`.

The catalog phase is accepted when:

- all 14 declared built-ins are available only under their exact architectures;
- every record passes strict validation and links to an existing recipe;
- protected user data and job identity retain structural equality and property presence after application, migrated prompt representation is preserved, and undo restores the full original configuration;
- user presets remain fully mutable and backward-compatible;
- built-ins are immutable in UI and API;
- invalid definitions cannot silently ship through tests/build;
- applying and undoing built-ins is covered by mounted UI tests;
- no catalog entry claims evidence it has not earned;
- no database migration or seed side effect occurs;
- the exact four-command automated gate passes and the combined edition's current supported-GPU smoke record is not stale.

## Non-Goals

The first catalog does not apply dataset settings, automatically switch model architecture, provide presets for every visible model, guarantee VRAM or output quality, seed SQLite, sync from a remote catalog, add preset marketplace/sharing, store catalog provenance on jobs, or empirically train all 14 entries. Full-fine-tune, slider, Redux, OmniGen2, SD3.5, experimental, audio, and unlisted edit/video variants remain outside the initial catalog.
