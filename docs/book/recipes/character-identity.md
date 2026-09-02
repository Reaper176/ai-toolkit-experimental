# Recipe: character and person identity LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](../workflow/saving-resuming-and-optimizer-state.md) · [Next →](style.md)
<!-- book-navigation:end -->

Use this recipe to establish a conservative identity baseline: the same person or character should remain recognizable while prompts still control pose, expression, clothing, setting, lighting, and composition. The ranges are experiment boundaries, not guarantees; begin with the family preset when available and change one axis after evaluating checkpoints.

<!-- built-in-presets:start -->
- `builtin:anima:character-identity@1` — Anima — Character / Identity
- `builtin:flux:character-general-concept@1` — FLUX.1 — Character / General Concept
- `builtin:sdxl:character-identity@1` — SDXL — Character / Identity
- `builtin:sd15:character-identity@1` — SD 1.5 — Character / Identity
- `builtin:wan22_14b:t2v:subject-motion-starting-point@1` — Wan 2.2 14B T2V — Subject / Motion Starting Point
<!-- built-in-presets:end -->

## Objective

Teach a stable identity without binding it to the dataset's most common background, outfit, camera distance, or expression. A useful LoRA activates with one consistent trigger, survives unfamiliar but plausible prompts, and remains adjustable through inference strength.

This recipe is not intended to copy one photograph exactly, replace face restoration, or create a universal likeness score. It establishes a run that can reveal whether the dataset, captions, capacity, learning rate, and duration are directionally sound.

## Suitable models

Use an image model for still identity and a video-capable model when consistent motion is part of the goal. The base model must already support the desired modality and broad rendering behavior. Confirm access, license, architecture, and VRAM requirements before adapting it.

This recipe is structured for the supported Anima, FLUX/Flex, Stable Diffusion, and Wan family paths described below. Do not transfer numeric settings unchanged to an unrelated architecture merely because it also supports LoRA.

## Dataset design

Begin with a compact, high-quality set that demonstrates independence:

- multiple camera distances, including enough face detail for identification;
- front, three-quarter, profile, and modest up/down viewpoints;
- varied expression, pose, lighting, and background;
- more than one outfit when clothing should remain prompt-controllable;
- stable identity-defining traits without mislabeled look-alikes;
- no exact duplicates and few near-duplicate burst frames.

Fifteen to forty strong images is a useful diagnostic scale for many still-image identities, but coverage matters more than the count. A stylized character with several canonical forms may need a different composition than a photographed person. For video, use short coherent clips with deliberate frame selection rather than exporting every adjacent frame into the image set.

Build a coverage table and remove accidental correlations. If every profile is outdoors or every smiling image uses the same shirt, add counterexamples. Follow [dataset curation](../datasets/curation.md) and complete the [rights, privacy, and safety review](../datasets/rights-privacy-and-safety.md), especially for recognizable people, voices, or minors.

## Caption pattern

Choose one distinctive trigger and use it consistently. Describe changing attributes so they remain separable from identity:

```text
[trigger], close portrait, three-quarter view, neutral expression, soft window light
[trigger], full-body photo, walking in a city, blue jacket, evening
```

Do not repeat the trigger several times. Do not omit every contextual attribute, and do not caption uncertain identity or sensitive traits. Natural sentences and comma tags are both workable when used consistently; do not enable token shuffling for prose.

Start with accurate captions, `caption_dropout_rate` from 0 to 0.05, token dropout off, random triggers off, and shuffling off. Add caption variation only after the baseline activates predictably. See [captions and triggers](../datasets/captions-and-triggers.md).

## Starting settings and ranges

Use the selected model-family recipe to determine architecture-specific defaults. Within that compatible baseline, a first identity sweep can use:

| Setting | Starting range | Reason to move |
|---|---:|---|
| linear LoRA rank | 16 to 64 | raise only when varied identity details remain under-capacity; lower when memorization or file size dominates |
| linear alpha | equal to rank | keeps the initial rank comparison understandable |
| network learning rate | 5e-5 to 1e-4 | lower when identity becomes harsh or prompt control degrades; raise cautiously when every checkpoint remains weak |
| optimizer steps | 1,000 to 3,000 | save through the range and stop when samples worsen rather than targeting the upper bound automatically |
| batch size | 1 where memory-bound | use accumulation for a larger effective update only when held constant across comparisons |
| caption dropout | 0 to 0.05 | add modest robustness after caption alignment is confirmed |
| save/sample interval | 200 to 250 steps | exposes the learning curve without waiting for the final checkpoint |

These ranges are not one combined prescription. Start near rank 32, alpha 32, learning rate `1e-4`, and the recipe's optimizer/scheduler when that family supports the combination. Run a 250-step diagnostic first, then extend the same configuration only when the pipeline and early signal are healthy.

Keep dataset `num_repeats`, `network_weight`, and regularization roles neutral for the first run. Do not compensate for weak coverage by multiplying a few photographs many times.

## Sampling plan

Create the evaluation suite before training. Hold inference model, sampler, dimensions, LoRA strength, prompts, and fixed seed constant across checkpoints.

Include at least:

- one easy portrait resembling dataset coverage;
- profile and full-body prompts;
- two backgrounds absent from training;
- changed clothing and lighting;
- an action or expression underrepresented in the set;
- a prompt without the trigger to check base-model behavior;
- for video, motion and camera prompts that test temporal identity.

Sample at step zero and every 200 to 250 steps through the run. Compare a grid of checkpoints at the same seed, then confirm promising candidates with additional seeds. Use the process in [sampling and evaluation](../workflow/sampling-and-evaluation.md); do not select solely from loss.

## Expected learning signals

Early checkpoints should begin responding to the trigger on easy views while remaining close to the base model elsewhere. Mid-run checkpoints should improve distinctive face, hair, proportions, markings, or costume details across more prompts. A useful region appears when identity holds across view and context without freezing the training composition.

Healthy evidence includes:

- trigger-on samples become more recognizable than step zero;
- prompt changes still affect pose, clothing, background, and lighting;
- hard evaluation prompts improve without easy prompts becoming copied images;
- multiple seeds express the identity rather than one lucky seed;
- a reasonable range of LoRA inference strengths remains usable.

Raw loss may trend downward, but batch content, resolution, captions, noise, and timestep make it noisy. Treat valleys as checkpoints to inspect, not automatic winners.

## Common failure modes

**Weak or generic identity:** verify the trigger and captions, inspect whether key features survive preprocessing, and compare more steps before increasing rank. If every checkpoint is weak, improve coverage or cautiously test the upper learning-rate boundary.

**Baked-in clothing or background:** remove duplicates, add counterexamples, and caption changing attributes. More steps usually reinforce the correlation.

**Overfitting or rigid copied compositions:** reduce repeated near-duplicates, lower duration or learning rate, and select an earlier checkpoint. Check whether random crops created misleading captions.

**Identity works only in close-up:** add genuine medium/full-body sources and make sure the subject remains large enough after bucketing; a crop of the same portrait is not equivalent coverage.

**Prompt control collapses or artifacts grow:** compare earlier checkpoints, reduce learning rate or duration, and consider lower rank. Confirm the base model, sampler, and LoRA inference strength are not being changed during evaluation.

**One face works but video flickers:** curate coherent clips and use the family-specific video path. Still-image diversity alone does not teach temporal consistency.

## Settings deliberately not changed

For the baseline, leave the model architecture, base checkpoint, noise scheduler, timestep strategy, optimizer family, optimizer parameters, quantization policy, layer targeting, loss type, dataset resolution, buckets, caches, masks, and inverted-mask prior at the selected recipe defaults.

Masks are off unless a measured background-confounding problem justifies a separate focused-refinement experiment. Text-encoder training is off unless the family guide explicitly calls for it. Do not combine a new dataset, higher rank, different optimizer, altered learning rate, and longer duration in one comparison; the result will not identify the cause.

## Model-specific deviations

- [Anima training guide](../models/anima.md): use its supported architecture defaults and memory path; do not infer settings from Stable Diffusion naming.
- [FLUX and Flex training guide](../models/flux-and-flex.md): preserve the family scheduler, quantization, and sampling guidance choices from the selected recipe.
- [Stable Diffusion training guide](../models/sdxl-and-sd15.md): distinguish SDXL and SD 1.5 resolution, text-encoder, and optimizer expectations.
- [Wan training guide](../models/wan.md): use model-compatible frame counts and video memory settings; evaluate identity through motion as well as still frames.

The numeric table narrows an experiment only after these deviations are applied. If a family guide or validated built-in preset conflicts with a generic value here, the family-specific setting wins.

## Further reading

- [A mental model of LoRA training](../getting-started/training-mental-model.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Saving and resuming](../workflow/saving-resuming-and-optimizer-state.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
