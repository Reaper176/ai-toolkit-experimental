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
├── getting-started/
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
│   ├── queue-and-multi-gpu.md
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
├── examples/
└── glossary.md
```

`docs/book/README.md` is the canonical table of contents. Every chapter includes links to the table of contents and logical previous/next chapters. Internal implementation records remain under `docs/superpowers/` and are source material only; the book never asks users to read them.

## Core Learning Path

The first-run path is intentionally short:

1. Choose a supported model family and confirm model access/hardware expectations.
2. Curate and caption a small, clean dataset.
3. Create or select a dataset through the UI.
4. Create a job in the Simple editor using a documented starter recipe.
5. Configure fixed-seed samples before training.
6. Add the job to the appropriate GPU queue and start that queue.
7. Compare samples and smoothed loss at saved checkpoints.
8. Select a checkpoint or safely resume with an increased step target.

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

The workflow chapters document Simple and Advanced editing, saving jobs, queue grouping by GPU, queue start/stop behavior, one-running-job-per-GPU behavior, returning a job to the queue, hung-job recovery, Save Next Step, Sample Next Step, cloning, and preflight failures.

Evaluation guidance prioritizes fixed-seed samples over individual loss values. It explains noisy batch loss, smoothed trends, valleys versus peaks, overfitting/underfitting signals, checkpoint comparison, sample/save cadence alignment, prompt diversity, and why the numerically lowest loss is not automatically the best LoRA.

Resume guidance covers output-folder/job-name identity, newest-checkpoint discovery, step metadata, `train.start_step`, `network.pretrained_lora_path`, optimizer-state restoration, preservation of configured learning rates, compatible versus incompatible setting changes, retention pruning, interrupted saves, and recovery from corrupt state.

## Model-Family Coverage

The first edition contains focused chapters for:

- Anima;
- FLUX.1, FLUX Kontext, and Flex.1;
- Qwen Image and Qwen Image Edit variants;
- SDXL and SD 1.5;
- Wan 2.1 and Wan 2.2 variants represented by the initial preset catalog.

Each chapter lists the exact UI architecture identifiers, canonical default model paths, access/gating requirements, scheduler family, supported controls/modality, architecture-specific UI fields, quantization/offloading considerations, dataset expectations, sampling differences, and known incompatibilities. Other visible architectures remain listed in the model-selection overview and settings reference but do not receive unverified recipe claims in the first edition.

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

The exhaustive reference is backed by structured catalog data. A user-configurable setting entry contains:

- canonical YAML path;
- UI label where applicable;
- section and scope;
- type and accepted values/range;
- Simple UI, Advanced UI, CLI-only, UI-only, server-owned, deprecated, or internal classification;
- UI-created default;
- Python engine fallback;
- architecture-specific overrides;
- runtime normalization or expansion;
- practical effect;
- benefits and drawbacks;
- interactions, mutual exclusions, prerequisites, and failure behavior;
- at least one concrete example;
- source file and symbol used for verification.

Coverage includes process-level controls and the user-facing fields parsed by `SaveConfig`, `SampleConfig`, `SampleItem`, `NetworkConfig`, `TrainConfig`, `ModelConfig`, `EMAConfig`, validation configuration, `DatasetConfig`, logging configuration, optimizers, schedulers, inline prompt overrides, and model-specific settings. Internal implementation attributes are not presented as configurable fields; they are explicitly classified so coverage checks do not repeatedly report them.

Where UI and engine defaults differ, both values are shown and neither is labeled simply “the default.” Where architecture selection overrides an edited value, the reference states that behavior. Where the UI accepts a wider range than runtime meaningfully supports, the reference states the effective runtime behavior.

## Source Anchoring and Maintenance

Narrative chapters are hand-written. Machine-readable settings metadata and validation fixtures anchor factual fields to the code without attempting to generate teaching prose.

Validation tooling must:

- inventory configurable keys from `toolkit/config_modules.py` and compare them with the settings catalog;
- require every discovered key to be documented or explicitly classified;
- verify selected UI-created defaults against `defaultJobConfig` and dataset/sample fixtures;
- verify first-edition architecture identifiers against `modelArchs`;
- parse every YAML example shipped under `docs/book/examples/`;
- validate internal Markdown links and preset-to-recipe links;
- report drift without automatically rewriting narrative explanations.

Every book page includes a common “verified against” revision/date footer or generated header. The book landing page explains that rolling model repositories and hardware/software changes may alter results.

Existing invalid or stale example YAML is not silently copied. Examples promoted into the book are normalized to the current `diffusion_trainer` UI/engine shape and validated separately from historical files under `config/examples/`.

## UI and README Integration

The root `README.md` gains a prominent **LoRA Training Book** link near the introductory training material. The UI sidebar gains a keyboard-accessible external **Training Guide** link to:

```text
https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/README.md
```

The link opens in a new tab with safe external-link attributes. No Markdown renderer, documentation search index, or `/docs` application route is added in this phase.

## Failure Handling

Documentation validation reports the chapter/catalog entry and exact missing or conflicting source key. A single invalid example or broken link fails the documentation check. Validation errors do not affect normal UI startup or training runtime because documentation data is not imported into training code.

If the external GitHub guide cannot be reached, the UI remains functional; the link is ordinary navigation and does not fetch documentation during rendering.

## Testing and Acceptance Criteria

The book phase is accepted when:

- every file in the approved information architecture exists and is linked from the table of contents;
- the beginner walkthrough reaches a queued/running diagnostic job without requiring Advanced YAML;
- all six recipe chapters contain dataset, training, sampling, and diagnosis guidance;
- the five model-family chapters cover the declared first-edition architectures without unsupported guarantees;
- every discovered user-configurable engine field is documented or explicitly classified;
- settings entries distinguish UI defaults from engine fallbacks;
- book YAML examples parse and internal links resolve;
- README and UI Training Guide links point to the canonical book;
- documentation validation is integrated into a focused repeatable test command;
- existing application tests and production build remain successful.

## Non-Goals

The first edition does not add a full in-app documentation center, documentation search, PDF/EPUB generation, automatic prose generation, translations, community editing, or empirically train every model/UI architecture. It does not promise a universal “best” learning rate, rank, step count, dataset size, or VRAM requirement.

