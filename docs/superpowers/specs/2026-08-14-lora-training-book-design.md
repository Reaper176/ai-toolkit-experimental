# LoRA Training Book Design

**Date:** 2026-08-14

## Goal

Create a versioned, beginner-first but advanced-complete guide to training LoRAs with this `ai-toolkit-experimental` fork. A new user must be able to curate a dataset, configure and run a first job through the Simple UI, evaluate checkpoints, and resume safely. An experienced user must be able to find every user-configurable UI and Python engine setting, including Advanced YAML and CLI-only controls, with accurate defaults, constraints, interactions, and examples.

The book is repository documentation, not a replacement UI documentation application. It lives under `docs/book/`, is linked from the root README, and is reachable through a **Training Guide** link in the UI sidebar that opens the GitHub-hosted book in a new tab.

## Audience and Teaching Approach

The primary reader is new to LoRA training and may not yet understand ranks, learning rates, captions, masks, loss graphs, checkpoints, or optimizer state. Chapters introduce those concepts in task order and avoid requiring the reference section during the first walkthrough.

The same book also serves intermediate and expert readers. Detailed reference pages distinguish Simple UI behavior, UI-created defaults, architecture overrides, Python engine fallbacks, runtime normalization, Advanced-only options, and CLI-only options. Advanced material is linked from beginner chapters rather than mixed into every first-run step.

Recommendations are starting points, not universal guarantees. The book must state the model, dataset assumptions, configuration, and evidence behind memory or quality guidance. It must never present a configuration-only validation as proof of output quality or a guaranteed VRAM target.

## Information Architecture

The user documentation tree is:

```text
docs/book/
├── README.md
├── book-manifest.json
├── getting-started/
│   ├── prerequisites.md
│   ├── choose-a-model.md
│   ├── first-lora.md
│   └── training-mental-model.md
├── datasets/
│   ├── curation.md
│   ├── captions-and-triggers.md
│   ├── resolution-and-bucketing.md
│   ├── masks.md
│   ├── controls-video-audio.md
│   └── rights-privacy-and-safety.md
├── workflow/
│   ├── simple-ui.md
│   ├── sampling-and-evaluation.md
│   ├── loss-and-checkpoints.md
│   ├── queue-and-multiple-gpus.md
│   └── saving-resuming-and-optimizer-state.md
├── recipes/
│   ├── character-identity.md
│   ├── style.md
│   ├── object-concept.md
│   ├── focused-refinement.md
│   ├── low-vram.md
│   └── diagnostic-run.md
├── models/
│   ├── anima.md
│   ├── flux-and-flex.md
│   ├── qwen-image-and-edit.md
│   ├── sdxl-and-sd15.md
│   └── wan.md
├── reference/
│   ├── settings-catalog.json
│   ├── settings-catalog.schema.json
│   ├── settings-sources.json
│   ├── settings-exclusions.json
│   ├── job-and-model.md
│   ├── network.md
│   ├── training.md
│   ├── dataset.md
│   ├── masks-and-preservation.md
│   ├── saving-and-sampling.md
│   ├── optimizers-and-schedulers.md
│   └── advanced-only-settings.md
├── advanced/
│   ├── yaml-and-cli.md
│   ├── layer-targeting.md
│   ├── performance-and-caching.md
│   └── extending-and-debugging.md
├── troubleshooting/
│   ├── diagnosis-guide.md
│   └── common-failure-patterns.md
├── verification/
│   └── first-run-smoke.md
├── examples/
│   ├── README.md
│   ├── manifest.json
│   ├── first-lora-flex1.yaml
│   ├── character-anima.yaml
│   ├── style-flux.yaml
│   ├── flux-kontext-edit.yaml
│   ├── object-qwen-image.yaml
│   ├── focused-refinement-qwen-image-edit-2509.yaml
│   ├── low-vram-anima.yaml
│   ├── diagnostic-wan21-1b.yaml
│   ├── character-sdxl.yaml
│   ├── character-sd15.yaml
│   ├── motion-wan22-14b-t2v.yaml
│   ├── masked-refinement.yaml
│   └── resume-from-checkpoint.yaml
└── glossary.md
```

`docs/book/README.md` is the canonical table of contents. Every chapter includes links to the table of contents and logical previous/next chapters. Internal implementation records remain under `docs/superpowers/` and are source material only; the book never asks users to read them.

`docs/book/book-manifest.json` is the canonical edition/navigation manifest. It records the schema version, book revision/date, ordered page list, previous/next relationships, preset/focused/full architecture sets, and required verified-revision footer. Navigation and architecture validation derive from that manifest rather than maintaining duplicate lists in test code.

## Core Learning Path

The first-run path is intentionally short:

1. Complete installation, start the UI, and authenticate by following the root README prerequisites.
2. Choose a supported model family and confirm model access/hardware expectations.
3. Curate and caption a small, clean dataset.
4. Create or select a dataset through the UI.
5. Create a job in the Simple editor using a documented starter recipe.
6. Configure fixed-seed samples before training.
7. Add the job to the appropriate GPU queue and start that queue.
8. Compare samples and smoothed loss at saved checkpoints.
9. Select a checkpoint or safely resume with an increased step target.

The walkthrough explains what the tool writes: LoRA checkpoints, final output, samples, `optimizer.pt`, dataset size metadata, latent caches, and text-embedding caches. It distinguishes deleting disposable caches from deleting resumable optimizer/checkpoint state.

## Dataset Coverage

Dataset chapters cover:

- subject, style, object, edit, image, video, and control-dataset goals;
- selection quality, duplicates, near-duplicates, outliers, variety, balance, and validation prompts;
- captions, caption extensions, trigger words, `[trigger]`, caption dropout, token shuffling, and default captions;
- aspect ratios, bucketing, resolution choices, upscaling limitations, repeats, weights, and regularization datasets;
- controls, paired filenames, video frame count/FPS, I2V, audio normalization, and pitch preservation;
- dataset presets, immutable versions, provenance, source-missing retained files, cache reuse, and queue preflight;
- grayscale masks, white/black semantics, mask floor, inversion, inverted-mask prior, focused refinement, and all-white/no-mask behavior;
- rights, licenses, consent, privacy, and content safety considerations.

The text uses current loader support rather than repeating stale README claims about file formats.

## Workflow and Evaluation Coverage

The workflow chapters document Simple and Advanced editing, saving jobs, queue grouping by the exact `gpu_ids` key, queue start/stop behavior, returning a job to its queue, hung-job recovery, Save Next Step, Sample Next Step, cloning, and preflight failures. Multiple physical GPUs may run independent single-process jobs through separate queue keys. The book does not claim that the UI provides distributed multi-GPU training or global physical-GPU exclusion across differently written queue keys.

Evaluation guidance prioritizes fixed-seed samples over individual loss values. It explains noisy batch loss, smoothed trends, valleys versus peaks, overfitting/underfitting signals, checkpoint comparison, sample/save cadence alignment, prompt diversity, and why the numerically lowest loss is not automatically the best LoRA.

Resume guidance covers output-folder/job-name identity, newest-checkpoint discovery, step metadata, `train.start_step`, `network.pretrained_lora_path`, optimizer-state restoration, preservation of configured learning rates, compatible versus incompatible setting changes, retention pruning, interrupted saves, and recovery from corrupt state.

## Model-Family Coverage

The first edition uses three explicit architecture sets.

The focused recipe/preset allowlist is:

```text
anima
flux
flex1
qwen_image
qwen_image_edit_plus
sdxl
sd15
wan21:1b
wan22_14b:t2v
```

The focused model-page allowlist, documented without unverified recipe claims for variants lacking presets, is:

```text
anima
flux
flux_kontext
flex1
qwen_image
qwen_image:2512
qwen_image_edit
qwen_image_edit_plus
qwen_image_edit_plus:2511
sdxl
sd15
wan21:1b
wan22_14b:t2v
```

The full model-selection overview is exact set equality with the current `modelArchs` export (51 entries when this design was written). `docs/book/book-manifest.json` records that ordered set for the edition, while validation reports additions/removals against the live export. Overview-only architectures receive factual registry coverage, not recipe or quality claims.

Those identifiers are organized into focused chapters for:

- Anima;
- FLUX.1, FLUX Kontext, and Flex.1;
- Qwen Image and Qwen Image Edit variants;
- SDXL and SD 1.5;
- the focused Wan 2.1 and Wan 2.2 T2V variants.

Each chapter lists the exact UI architecture identifiers, canonical default model paths, access/gating requirements, scheduler family, supported controls/modality, architecture-specific UI fields, quantization/offloading considerations, dataset expectations, sampling differences, and known incompatibilities. Validation compares the preset and focused-page allowlists with current `modelArchs` data and separately enforces full-overview set equality. Every overview-only entry remains inventoried in the model-selection overview and settings reference but does not receive unverified recipe claims in the first edition.

## Six Recipe Chapters

The reusable recipe chapters are:

1. Character or identity
2. Style or aesthetic
3. Object or general concept
4. Focused detail/refinement
5. Low-VRAM configuration
6. Short diagnostic run

Each recipe states its objective, suitable model families, dataset design, caption pattern, suggested settings and ranges, sampling plan, expected learning signals, common failure modes, and settings that a built-in preset deliberately does not change. Model-family chapters provide architecture-specific deviations. The preset catalog links to these pages rather than duplicating dataset advice inside UI metadata.

## Settings Catalog

The canonical machine-readable catalog is `docs/book/reference/settings-catalog.json`, validated by `settings-catalog.schema.json`. Generated reference sections are committed inside marker-delimited blocks in the reference Markdown files. `scripts/generate_training_book_reference.py` rewrites those blocks, and its `--check` mode fails when committed Markdown differs from catalog output. Hand-written introductions and examples remain outside generated markers.

Each setting has a stable logical ID and orthogonal metadata axes. A representative shape is:

```text
id
locations[]: yaml | cli | environment | inline-prompt | ui-state
surfaces[]: simple-ui | advanced-yaml | cli
persistence: config | job-json | database | runtime | transient
authority: user | ui-derived | server-overwritten | runtime-forced
lifecycle: supported | legacy | deprecated | experimental | unconsumed
applicability: job/process/UI-architecture/engine-architecture predicates
contract: parser/supported/UI/example types and null semantics
defaults: omitted engine/UI/on-select/on-leave values with presence semantics
normalizations[]
interactions[]
aliases[]
section
source_claims[]
render: page/anchor/description/benefits/drawbacks/example
```

Canonical path grammar always uses `[*]` for repeatable arrays, for example `config.process[*].datasets[*].resolution`. Discriminator-owned maps use scoped stable IDs and applicability predicates, such as `optimizer.adamw8bit.param.weight_decay` at `config.process[*].train.optimizer_params.weight_decay`, and `model.kwargs.anima.max_sequence_length` at `config.process[*].model.model_kwargs.max_sequence_length`. The same YAML path may appear for disjoint applicability predicates; validation rejects overlapping `(location, applicability)` claims rather than every duplicate string. Open-map wildcards never cover known first-party keys. Legacy aliases identify their replacement, precedence, migration behavior, and removal status.

Server-owned and truly internal fields are stored separately in `docs/book/reference/settings-exclusions.json` with a reason and source reference. They are not rendered as user-configurable settings.

The exhaustive reference is backed by structured catalog data. A user-configurable setting entry contains:

- stable ID and applicable YAML, CLI, environment, inline-prompt, or UI-state locations;
- UI label where applicable;
- section and scope;
- type and accepted values/range;
- independent surface, persistence, authority, lifecycle, and applicability classifications;
- UI-created default;
- Python engine fallback;
- architecture-specific overrides;
- runtime normalization or expansion;
- practical effect;
- benefits and drawbacks;
- interactions, mutual exclusions, prerequisites, and failure behavior;
- at least one concrete example;
- source file and symbol used for verification.

The LoRA configuration boundary includes process-level controls from `BaseProcess`, `BaseTrainProcess`, `BaseSDTrainProcess`, and `DiffusionTrainer`; user-facing fields parsed by `SaveConfig`, `LoggingConfig`, `SampleConfig`, `SampleItem`, LoRM/module settings, `NetworkConfig`, `AdapterConfig`, validation configuration, `EmbeddingConfig`, `DecoratorConfig`, `TrainConfig`, `ModelConfig`, `EMAConfig`, `GuidanceConfig`, and `DatasetConfig`; optimizer and scheduler dispatch plus locally consumed/injected parameter maps; inline prompt overrides; first-party model-specific `model_kwargs` consumers for every architecture in the full current `modelArchs` set; root/job envelope behavior; config-file environment/name expansion; `run.py` flags and user-relevant environment variables; UI-created defaults, migrations, UI-only state, server-owned state, architecture transition overrides, section visibility, controls, gating metadata, and global settings. Overview-only architectures therefore still receive exhaustive factual settings-reference coverage even when they have no focused recipe. Slider, extraction, generation-only constructors, reference-dataset classes, arbitrary third-party optimizer constructor signatures, external extensions, and model-developer integration APIs are outside the LoRA-setting boundary and are listed by exact symbol in the exclusions ledger rather than silently omitted.

Where UI and engine defaults differ, both values are shown and neither is labeled simply “the default.” Where architecture selection overrides an edited value, the reference states that behavior. Where the UI accepts a wider range than runtime meaningfully supports, the reference states the effective runtime behavior.

## Source Anchoring and Maintenance

Narrative chapters are hand-written. Machine-readable settings metadata and validation fixtures anchor factual fields to the code without attempting to generate teaching prose.

The extraction source union is declared in `docs/book/reference/settings-sources.json`. It combines repository-wide discovery rules with explicit ownership entries for every Python module/class/function, optimizer/scheduler registry, first-party model-kwargs consumer applicable to the full current `modelArchs` set, CLI parser, and UI export included by the inventory. Validation tooling must:

- discover literal `kwargs.get`, `get_conf`, direct configuration-map reads, `model_kwargs` reads, CLI/environment definitions, UI setter paths/default exports, and registry dispatch across declared repository globs; inventory registered optimizer/scheduler choices and locally consumed/injected parameters; then compare the exact discovered union with explicit catalog/exclusion ownership;
- require every discovered key to be documented or explicitly classified;
- fail when a declared source disappears, a new source is unowned, a dynamic configuration read cannot be resolved to a finite set, any source inventory is unexpectedly empty, a stable ID is duplicated, location/applicability claims overlap, an alias has no replacement policy, a source symbol is stale, required metadata/example text is blank, or a page anchor is missing;
- verify every documented UI-created default against `defaultJobConfig`, dataset/sample fixtures, and architecture overrides;
- verify the complete visible `modelArchs` inventory against the edition manifest and the exact preset/focused-page allowlists for default paths, gating, schedulers, controls, model kwargs, and overrides;
- parse every `*.yaml` example shipped under `docs/book/examples/`;
- require exact set equality between `docs/book/examples/*.yaml` and the paths declared by `docs/book/examples/manifest.json`; each YAML entry declares architecture, roles, chapters, validation profile, and typed user-substitution tokens such as `${DATASET_DIR}` and `${OUTPUT_DIR}`, and validation rejects undeclared or unreferenced placeholders;
- separately require exactly one `docs/book/examples/README.md` and one `docs/book/examples/manifest.json`, validate the manifest against its committed schema/contract, and reject any other non-YAML file in that directory;
- reject example keys absent from the settings catalog, then run current preprocessing/config semantic validation so ignored typos, stale aliases, invalid discriminators, and incompatible combinations fail;
- validate internal Markdown links, page anchors, generated-block parity, and preset-to-recipe links;
- report drift without automatically rewriting narrative explanations.

Every book page includes a common “verified against” revision/date footer or generated header. The book landing page explains that rolling model repositories and hardware/software changes may alter results.

Existing invalid or stale example YAML is not silently copied. Examples promoted into the book are normalized to the current `diffusion_trainer` UI/engine shape and validated separately from historical files under `config/examples/`.

## UI and README Integration

The root `README.md` gains a prominent **LoRA Training Book** link near the introductory training material. The UI sidebar gains a keyboard-accessible external **Training Guide** link to:

```text
https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/README.md
```

The link is a semantic keyboard-accessible anchor, opens in a new tab, and uses `rel="noopener noreferrer"`. No Markdown renderer, documentation search index, or `/docs` application route is added in this phase.

## Failure Handling

Documentation validation reports the chapter/catalog entry and exact missing or conflicting source key. A single invalid example or broken link fails the documentation check. Validation errors do not affect normal UI startup or training runtime because documentation data is not imported into training code.

The GPU/network-free automated boundary is `npm run test:training-book` from `ui/`. It AST-extracts Python facts without importing side-effectful model modules, compiles/imports UI fixtures through the existing temporary TypeScript test pattern, checks migrations/aliases with presence semantics, and runs source inventory, catalog/schema checks, semantic example validation with local substitutions, generated-reference parity, Markdown links/anchors/navigation/footer checks, model allowlist checks, and UI link component tests. Semantic config checks instantiate only pure configuration classes, preprocess datasets with fixtures, run central validators and known pre-init rules, and never instantiate a trainer/model, download artifacts, or require optional GPU optimizer libraries.

The exact network/GPU-free regression gate for this phase is, from the repository root:

```bash
cd ui
npm run test:training-book
npm run test:training-presets
npm run test:dataset-presets
npm run build
```

These four commands are the automated acceptance boundary; unrelated repository suites are not implied by the phrase “existing application tests.” Full phase acceptance is the automated gate plus the current-edition supported-GPU smoke record defined below.

A separate manual supported-GPU smoke record under `docs/book/verification/first-run-smoke.md` records the tested commit, exact `book_revision` from `book-manifest.json`, model, hardware, dataset fixture, and result for: UI authentication; creating a diagnostic job; queueing and starting it; producing fixed-seed samples and a checkpoint; comparing the sample; stopping; increasing total steps; resuming from the checkpoint and compatible `optimizer.pt`; and observing continued step progression. The accepted edition requires the smoke record's `book_revision` to equal the current manifest revision and its tested commit to contain that exact edition; a smoke record for an older edition is stale and fails acceptance. Network/model downloads are prerequisites for that manual smoke and are never hidden inside the automated documentation test.

If the external GitHub guide cannot be reached, the UI remains functional; the link is ordinary navigation and does not fetch documentation during rendering.

## Testing and Acceptance Criteria

The book phase is accepted when:

- every file in the approved information architecture exists and is linked from the table of contents;
- every page has table-of-contents, logical previous/next, and verified-revision links/footer;
- installation, UI startup, and authentication are explicit prerequisites linked to current setup documentation;
- the beginner walkthrough reaches a queued/running diagnostic job without requiring Advanced YAML, evaluates a fixed-seed checkpoint sample, and follows the safe resume procedure;
- all six recipe chapters contain dataset, training, sampling, and diagnosis guidance;
- the five model-family chapters cover the declared first-edition architectures without unsupported guarantees;
- every discovered UI, Advanced YAML, CLI, process, optimizer/scheduler, and first-party model-specific field applicable to the full current `modelArchs` set is documented or explicitly classified by the fail-closed source union;
- settings entries distinguish UI defaults from engine fallbacks;
- book YAML examples parse and internal links resolve;
- book example keys and combinations pass catalog-aware semantic validation rather than relying on permissive `**kwargs` parsing;
- README and UI Training Guide links point to the canonical book, and the sidebar link has semantic keyboard behavior, `_blank`, and safe `rel` attributes;
- documentation validation is integrated into the exact focused regression gate above;
- the current-edition supported-GPU smoke record exists and is not stale;
- all four named regression commands pass.

## Non-Goals

The first edition does not add a full in-app documentation center, documentation search, PDF/EPUB generation, automatic prose generation, translations, community editing, distributed multi-GPU training, or empirically train every model/UI architecture. It does not document arbitrary third-party optimizer keyword signatures as first-party contracts. It does not promise a universal “best” learning rate, rank, step count, dataset size, or VRAM requirement.
