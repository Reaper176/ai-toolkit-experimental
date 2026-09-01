# Recipe: visual style LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](character-identity.md) · [Next →](object-concept.md)
<!-- book-navigation:end -->

Use this recipe to teach a repeatable visual treatment while keeping subjects, layouts, and prompts controllable. Its ranges are starting boundaries for a measured experiment, not universal optimums.

<!-- built-in-presets:start -->
<!-- built-in-presets:end -->

## Objective

Teach recurring visual choices—such as mark-making, palette behavior, material treatment, lighting, rendering, or graphic structure—without memorizing the dataset's subjects. A useful style LoRA applies the treatment to new content and can be weakened or strengthened at inference.

This recipe is not a method for copying one image, guaranteeing an artist imitation, or repairing a weakly curated dataset. Confirm that use of the source material and intended output is permitted before training.

## Suitable models

Use an image model whose base capabilities already cover the desired subject matter and medium. This baseline applies to the supported FLUX/Flex and Stable Diffusion paths listed under model-specific deviations. Architecture-specific defaults take priority over generic numeric ranges.

Prefer a base model that can render the content tests without the LoRA. An adaptation cannot reliably separate style from a concept the base model does not understand.

## Dataset design

Content diversity is the primary defense against binding style to subject. Include varied people, objects, environments, camera distances, poses, compositions, and light conditions while retaining the stylistic evidence that defines the target.

Curate for consistency without collapsing variety:

- remove exact duplicates, near-duplicate crops, signatures, borders, and accidental watermarks;
- balance recurring subjects so one face, character, or object does not become the trigger's meaning;
- include simple and complex compositions if both should work at inference;
- retain enough resolution to show the marks, texture, edges, or material cues being learned;
- exclude outliers that share a theme but not the target visual treatment.

Twenty to eighty strong images can be a practical diagnostic scale, but evidence coverage matters more than count. Build a small coverage table before training and document exclusions. Follow [dataset curation](../datasets/curation.md) and the [rights, privacy, and safety review](../datasets/rights-privacy-and-safety.md).

## Caption pattern

Choose one distinctive trigger for the style. Caption visible content accurately while allowing the trigger to stand for the recurring treatment:

```text
[trigger], a bicycle beside a brick wall, afternoon light
[trigger], close portrait of an older woman, dark background
```

Do not label every image only with the trigger; that encourages content leakage into the style token. Conversely, avoid repeatedly naming the style with many synonyms unless those words should independently activate it. Caption medium words only when they describe useful, controllable distinctions rather than redundantly restating the trigger.

Begin with deterministic captions, no token dropout, no random triggers, and no shuffling for prose. A small caption dropout experiment can follow only after the baseline is understood. See [captions and triggers](../datasets/captions-and-triggers.md).

## Starting settings and ranges

Apply the selected model family's compatible optimizer, scheduler, precision, and target-module defaults first. Then begin a style sweep within these bounds:

| Setting | Starting range | Reason to move |
|---|---:|---|
| linear LoRA rank | 8 to 32 | raise when fine stylistic structure remains missing across checkpoints; lower when content leakage or file size dominates |
| linear alpha | equal to rank | makes the first rank comparison easier to interpret |
| network learning rate | 5e-5 to 1e-4 | lower when contrast, color, or texture becomes harsh; raise cautiously when activation stays weak |
| optimizer steps | 1,000 to 3,000 | inspect periodic saves and stop before later checkpoints lose prompt control |
| batch size | 1 where memory-bound | hold effective batch behavior constant between comparisons |
| caption dropout | 0 to 0.05 | test only after caption alignment and activation are confirmed |
| save/sample interval | 200 to 250 steps | reveals the learning curve and possible overfitting |

A reasonable first point is rank 16, matching alpha, learning rate `1e-4`, and the family recipe's remaining defaults. Run a short diagnostic before committing to the full range. Do not increase rank, rate, repeats, and duration together.

## Sampling plan

Prepare a fixed suite before training. Use the same sampler, dimensions, LoRA strength, prompts, and fixed seed for every checkpoint comparison.

Include:

- two familiar content categories represented in training;
- three subjects absent from training;
- a portrait, object, environment, and multi-subject composition;
- light and dark scenes to expose palette rigidity;
- prompts with and without the trigger;
- a small LoRA-strength sweep for promising checkpoints.

Save and sample every 200 to 250 steps. Compare grids first at the fixed seed, then verify candidates across multiple seeds and aspect ratios. Judge style transfer, prompt obedience, and content independence together using [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Expected learning signals

Early checkpoints may reproduce broad palette or rendering tendencies. Mid-run checkpoints should carry finer edge, texture, shape-language, or lighting behavior into unseen subjects while retaining prompt changes. The useful region is a band of checkpoints and inference strengths, not necessarily the lowest loss.

Healthy signals include consistent treatment on novel content, distinct results with the trigger removed, preserved subject identity and composition, and gradual strength control. Review multiple prompts and seeds; a single attractive image is weak evidence.

Loss can confirm that optimization is active, but it cannot measure whether style and content remain separated. Select checkpoints from controlled samples.

## Common failure modes

**Style leakage:** the trigger summons a repeated subject, face, object, or composition. Increase content diversity, rebalance dominant motifs, improve content captions, and remove near-duplicates before adding capacity.

**Weak activation:** verify the trigger and preprocessing, then compare later checkpoints. If all remain weak, cautiously test the upper learning-rate or rank boundary one variable at a time.

**Overfitting:** later samples resemble training compositions, ignore prompts, or become usable only at very low LoRA strength. Prefer an earlier checkpoint and reduce steps, repeats, learning rate, or rank in the next controlled run.

**Palette or contrast lock:** diversify source lighting and color conditions, caption meaningful variations, and lower duration or learning rate. Do not treat a global color cast as proof of complete style learning.

**Good familiar subjects, poor novel subjects:** the set likely represents a theme more strongly than a transferable treatment. Add counterexamples that preserve style while changing semantic content.

## Settings deliberately not changed

Keep the base checkpoint, architecture, optimizer family, scheduler, timestep strategy, quantization, layer targets, loss type, resolution and bucket policy, caches, and sampling stack at the selected family baseline.

Leave masks off: ordinary style learning usually needs evidence across the whole image, and inconsistent subject masks can suppress the background or compositional cues that define the style. Leave text-encoder training off unless the family guide explicitly supports and motivates it. Keep dataset repeats and weights neutral until coverage problems are ruled out.

## Model-specific deviations

- [FLUX and Flex training guide](../models/flux-and-flex.md): retain its architecture, scheduler, precision, quantization, and sampling choices before applying the generic sweep.
- [Stable Diffusion training guide](../models/sdxl-and-sd15.md): use the family-appropriate resolution, text-encoder policy, optimizer settings, and target modules for SDXL or SD 1.5.

If a validated built-in preset or family guide conflicts with a generic value here, the family-specific value wins.

## Further reading

- [A mental model of LoRA training](../getting-started/training-mental-model.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
