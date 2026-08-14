# Built-in LoRA Preset Catalog Design

**Date:** 2026-08-14

## Goal

Ship a small, safe, versioned catalog of immutable LoRA training presets for the core model families documented by the LoRA Training Book. Built-ins provide current, architecture-specific starting configurations while preserving every job- and dataset-specific value. They are configuration starters, not quality or hardware guarantees.

This catalog extends the existing server-backed training preset feature. User-created presets retain their existing SQLite lifecycle and behavior.

## Product Boundary

Built-in presets modify training behavior only. Applying one must preserve:

- job name and metadata;
- output/training folder and SQLite path;
- device and GPU selection;
- trigger word;
- the complete datasets array, including selected dataset versions, resolutions, repeats, captions, controls, masks, caching, and provenance;
- sample prompts and control images.

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

The public preset record is extended with origin and catalog metadata while remaining backward-compatible with user records:

```ts
type TrainingPresetSource = 'builtin' | 'user';

interface BuiltInTrainingPresetRecord extends TrainingPresetRecord {
  source: 'builtin';
  read_only: true;
  category: 'character' | 'style' | 'object' | 'refinement' | 'low-vram' | 'diagnostic';
  model_arch: string;
  catalog_revision: number;
  summary: string;
  recipe_path: string;
  prerequisites: string[];
  warnings: string[];
  evidence: 'configuration-validated' | 'launch-tested' | 'training-tested';
}
```

User records are returned with `source: 'user'` and `read_only: false`; catalog-only metadata is absent. The snapshot schema version remains the configuration shape version and is not reused as a catalog revision.

All records remain untrusted at the client boundary and are validated before rendering or applying.

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

General user-preset validation remains permissive for legacy, advanced, and future configurations. It is not tightened to catalog policy.

## Architecture Applicability

The initial catalog is exact-architecture only. A built-in is shown and may be applied only when its `model_arch` equals the editor’s current UI architecture identifier. This avoids applying a snapshot across architectures without running the full model-selection normalization in `handleModelArchChange`.

Changing architectures clears an incompatible built-in selection. The catalog does not automatically switch the user’s model architecture. A user first selects the model, then chooses a compatible built-in.

Architecture identifiers with variant suffixes remain distinct. Backend normalization that strips suffixes does not make two UI variants interchangeable for catalog purposes.

## Initial Catalog Scope

The first catalog is curated and contains the following 15 entries:

### Anima (`anima`)

1. Character/identity balanced
2. Focused refinement
3. Low-VRAM starting point
4. Short diagnostic run

### FLUX.1 (`flux`)

5. Character/general concept
6. Style/aesthetic
7. Low-VRAM starting point

### Flex.1 (`flex1`)

8. Object/general concept

### Qwen

9. Qwen Image object/general concept (`qwen_image`)
10. Qwen Image Edit focused refinement (`qwen_image_edit_plus`)

### Stable Diffusion

11. SDXL character/identity (`sdxl`)
12. SDXL style/aesthetic (`sdxl`)
13. SD 1.5 character/identity (`sd15`)

### Wan

14. Wan 2.1 1.3B subject/motion diagnostic (`wan21:1b`)
15. Wan 2.2 14B T2V subject/motion starting point (`wan22_14b:t2v`)

This is not a Cartesian product. Unsupported intent/model combinations are omitted. Additional Qwen revisions, edit variants, Wan I2V variants, FLUX Kontext, Flex.2, and other UI architectures require later catalog revisions with dedicated compatibility evidence.

Every approved recipe category is represented at least once. Video-specific dataset requirements are explained in the Wan model chapter and linked character/diagnostic recipe sections.

## Preset Content Rules

Preset values are normalized into the current UI-created job shape rather than copied verbatim from historical YAML. Each entry contains architecture-appropriate:

- model path and architecture;
- network rank/alpha and safe target exclusions;
- optimizer, learning rate, weight decay, scheduler/timestep, loss, and step count;
- precision, quantization, low-VRAM/offloading flags where applicable;
- save/sample cadence and retention;
- fixed non-prompt sampling behavior;
- architecture-required adapters or model kwargs only when they are current and explicitly disclosed.

Mask-dependent settings such as inverted-mask prior remain disabled because datasets are preserved and may not contain masks. The focused-refinement recipe explains how to enable mask settings after the UI confirms resolved masks.

No preset may contain placeholders that would reach runtime, personal paths, workstation-specific directories, or mutable dataset paths.

## Application and Undo

Built-ins use the existing deep-copy preset application semantics:

1. Validate the catalog record and snapshot.
2. Confirm exact architecture compatibility.
3. Capture one undo snapshot of the current complete job configuration.
4. Apply the authoritative preset process.
5. Restore protected job identity, dataset, trigger, device, path, and prompt fields.
6. Validate the resulting job configuration before committing UI state.

Applying a built-in does not create a live relationship. The resulting settings are saved into the job. Later catalog revisions cannot mutate existing jobs.

## API and Service Behavior

`GET /api/training-presets` returns validated built-ins and user records in one response. Ordering is deterministic: built-ins are grouped/sorted by model architecture, category, display name, and ID; user records retain their case-insensitive name ordering.

`PUT` and `DELETE` reject the reserved `builtin:` namespace with a specific read-only 400 or 409 response before any database lookup. `POST` continues creating user presets and rejects attempts to use catalog-only record fields as authority. A user may use the same display name as a built-in because grouping and IDs disambiguate them.

One invalid built-in must not make user presets unavailable in production. Catalog creation validates each entry independently, excludes invalid entries from the runtime list, and logs a generic catalog-definition error without exposing filesystem or internal paths. Tests and builds treat any invalid built-in as a failure, so exclusion is a fail-safe rather than the normal release path.

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

The initial evidence value is `configuration-validated` unless fresh repository-specific evidence supports a stronger label. Existing comments or historical examples alone do not justify `launch-tested` or `training-tested`.

Memory labels are descriptive test conditions, not guarantees. A “Low-VRAM starting point” states which quantization/offloading choices it sets and directs users to the recipe; it does not promise a specific card capacity because dataset resolutions and caches are preserved.

## Documentation Coupling

Every built-in `recipe_path` must point to one of the six recipe chapters. Model-specific deviations link onward to the matching model-family chapter. Book pages may reference deterministic built-in IDs, and validation checks the relationship in both directions.

Preset descriptions remain concise. Dataset curation, parameter trade-offs, and troubleshooting belong in the book so guidance is reviewable and does not become duplicated UI prose.

## Testing

Focused tests cover:

### Pure catalog and preset helpers

- all 15 IDs, architectures, categories, revisions, and recipe links;
- strict LoRA/process/model validation;
- no protected fields, external side effects, placeholders, or mutable references;
- exact-architecture applicability;
- deterministic sorting and name/ID collision behavior;
- apply/undo preserves every protected job and dataset field.

### Service and routes

- merged list behavior with empty and populated user stores;
- invalid built-in isolation plus build-time failure coverage;
- read-only PUT/DELETE rejection before database access;
- unchanged user create/update/delete behavior;
- no built-in rows are seeded into Prisma.

### UI

- separate built-in and user groups;
- current-architecture filtering and selection clearing;
- summary, warnings, evidence, and recipe link rendering;
- built-in update/delete disabled;
- apply, edit, save-as-user-preset, and undo behavior;
- protected datasets, masks, controls, prompts, GPU, trigger, and paths remain unchanged.

### Integration

- each built-in produces a valid current job configuration for its exact architecture;
- client save request strips UI-only catalog state;
- job save/preflight remains authoritative for datasets and masks;
- existing training-preset, dataset-preset, and production build suites remain successful.

## Acceptance Criteria

The catalog phase is accepted when:

- all 15 declared built-ins are available only under their exact architectures;
- every record passes strict validation and links to an existing recipe;
- user data and job identity remain byte-for-byte/deep-equal preserved after application;
- user presets remain fully mutable and backward-compatible;
- built-ins are immutable in UI and API;
- invalid definitions cannot silently ship through tests/build;
- applying and undoing built-ins is covered by mounted UI tests;
- no catalog entry claims evidence it has not earned;
- no database migration or seed side effect occurs;
- focused tests, existing preset suites, dataset suites, and production build pass.

## Non-Goals

The first catalog does not apply dataset settings, automatically switch model architecture, provide presets for every visible model, guarantee VRAM or output quality, seed SQLite, sync from a remote catalog, add preset marketplace/sharing, store catalog provenance on jobs, or empirically train all 15 entries. Full-fine-tune, slider, Redux, OmniGen2, SD3.5, experimental, audio, and unlisted edit/video variants remain outside the initial catalog.
