# AI Toolkit LoRA Training Book

This book is a practical path from a first ai-toolkit LoRA run to careful model-family tuning, diagnosis, and configuration work. If you are new, start with [Prerequisites](getting-started/prerequisites.md), then follow [Your first LoRA](getting-started/first-lora.md). Each recipe gives experiment boundaries rather than a promise that one setting will work for every model, dataset, or goal.

<!-- book-navigation:start -->
[Next →](getting-started/prerequisites.md)
<!-- book-navigation:end -->

## Beginner

Prepare the environment, choose a supported architecture, complete a conservative first run, and learn the training mental model.

- [Prerequisites](getting-started/prerequisites.md)
- [Choose a model](getting-started/choose-a-model.md)
- [Your first LoRA](getting-started/first-lora.md)
- [Training mental model](getting-started/training-mental-model.md)

## Dataset

Build rights-cleared training data deliberately: curate examples, write captions, choose resolution policy, and add masks or other modalities only when the task needs them.

- [Curation](datasets/curation.md)
- [Captions and triggers](datasets/captions-and-triggers.md)
- [Resolution and bucketing](datasets/resolution-and-bucketing.md)
- [Masks](datasets/masks.md)
- [Controls, video, and audio](datasets/controls-video-audio.md)
- [Rights, privacy, and safety](datasets/rights-privacy-and-safety.md)

## Recipes

Use a recipe as a controlled starting experiment, then compare fixed samples and checkpoints before changing one variable at a time.

- [Character identity](recipes/character-identity.md)
- [Style](recipes/style.md)
- [Object concept](recipes/object-concept.md)
- [Focused refinement](recipes/focused-refinement.md)
- [Low VRAM](recipes/low-vram.md)
- [Diagnostic run](recipes/diagnostic-run.md)

## Model families

Read the focused guide for the architecture you selected. Family-specific compatibility and defaults take precedence over generic recipe ranges.

- [Anima](models/anima.md)
- [Flux and Flex](models/flux-and-flex.md)
- [Qwen Image and Edit](models/qwen-image-and-edit.md)
- [SDXL and SD 1.5](models/sdxl-and-sd15.md)
- [Wan](models/wan.md)

## Reference

The reference pages describe the supported configuration surface, defaults, normalization, interactions, and evidence sources.

- [Job and model](reference/job-and-model.md)
- [Network](reference/network.md)
- [Training](reference/training.md)
- [Dataset](reference/dataset.md)
- [Masks and preservation](reference/masks-and-preservation.md)
- [Saving and sampling](reference/saving-and-sampling.md)
- [Optimizers and schedulers](reference/optimizers-and-schedulers.md)
- [Advanced-only settings](reference/advanced-only-settings.md)

## Advanced

Move beyond the Simple editor when you need explicit YAML, layer targeting, performance analysis, or extension debugging.

- [YAML and CLI](advanced/yaml-and-cli.md)
- [Layer targeting](advanced/layer-targeting.md)
- [Performance and caching](advanced/performance-and-caching.md)
- [Extending and debugging](advanced/extending-and-debugging.md)

## Troubleshooting

Diagnose from observed symptoms and controlled comparisons; loss alone does not identify the best checkpoint.

- [Diagnosis guide](troubleshooting/diagnosis-guide.md)
- [Common failure patterns](troubleshooting/common-failure-patterns.md)

## Examples

The [example configurations](examples/README.md) are inspectable starting points aligned with the recipes. Review paths, model access, dataset rights, and resource requirements before running one.

## Verification

The manifest fixes this edition's page order, architecture inventories, revision, and verified date. Generated reference data and source ownership provide repository evidence, but they do not prove output quality, model access, hardware suitability, or safety for a particular dataset. The [first-run smoke record](verification/first-run-smoke.md) is intentionally required only after an observed supported-GPU workflow has been recorded; never infer that evidence from automated checks.

- [Glossary](glossary.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
