# Recipe: mask-focused refinement LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Use this recipe only after an unmasked baseline shows a measurable spatial-confounding problem. Mask-focused refinement changes where loss is weighted; it does not repair weak captions, missing viewpoints, poor alignment, or an unsuitable base model.

<!-- built-in-presets:start -->
<!-- built-in-presets:end -->

## Objective

Concentrate ordinary training loss on a subject or region while retaining a controlled amount of learning elsewhere. Typical goals include reducing background binding, emphasizing a small product or face, or testing whether irrelevant pixels dominate a full-image baseline.

This is a comparison recipe: preserve the unmasked run, change the mask configuration deliberately, and evaluate both with the same prompts and seeds. Neither masks nor the inverted-mask prior are enabled automatically because they add data requirements, failure modes, and compute trade-offs that are not appropriate for every LoRA.

## Suitable models

Use a supported image model whose training path consumes dataset masks. This baseline is organized around the Anima and Qwen Image/Edit family guides listed under model-specific deviations. Confirm compatibility with the exact architecture and training mode before starting.

Do not assume that an edit model's input mask is the same thing as the training-loss mask described here. The dataset mask weights loss during LoRA training; model-specific edit conditioning may have separate inputs and semantics.

## Dataset design

Begin with the same curated images and captions as the unmasked control. Add one aligned grayscale mask per source image using the documented naming and path rules. Audit overlays at the final bucket crop and resolution, not only at source resolution.

For an ordinary mask with `invert_mask: false`, white pixels map to the high end of the loss-weight map, black pixels map toward `mask_min_value`, and intermediate grayscale values map continuously between them. The trainer then normalizes mask weights by their average, so masks redistribute emphasis rather than acting as a simple percentage-of-loss control.

Use hard black/white masks for the first diagnostic. Introduce soft grayscale transitions only when boundary blending is intentional. Avoid halos, missing extremities, inconsistent inclusion rules, and masks that silently track a recurring background feature. If the subject fills nearly every image, masks may provide little useful contrast.

Follow the full [mask training guide](../datasets/masks.md), along with [dataset curation](../datasets/curation.md), before generating a large set.

## Caption pattern

Keep captions aligned with the whole image and with the baseline comparison. A mask does not make an inaccurate caption safe: text still conditions the prediction even where spatial loss receives less weight.

```text
[trigger], a ceramic robot on a workshop bench, three-quarter view, warm light
[trigger], close view of a ceramic robot, raised left arm, neutral background
```

Describe changing pose, viewpoint, state, clothing, object attributes, and context. Do not remove background terms merely because the background is dark in the mask; doing so changes two variables and makes the comparison ambiguous. Retain the same trigger and caption policy as the unmasked control.

## Starting settings and ranges

Clone the validated unmasked baseline and change only mask-related fields for the first comparison:

| Setting | Starting value or range | Purpose |
|---|---:|---|
| `mask_path` or `alpha_mask` | one verified source | supplies aligned grayscale masks |
| `invert_mask` | `false` | keeps white as the emphasized source region |
| `mask_min_value` | 0.1 to 0.25 | retains some ordinary-loss signal in dark regions while testing focus |
| `inverted_mask_prior` | `false` | isolates ordinary masked loss first |
| LoRA rank, alpha, learning rate | unchanged | preserves comparison with the unmasked baseline |
| optimizer steps | same ceiling as baseline | permits checkpoint-to-checkpoint comparison |
| save/sample interval | 200 to 250 steps | exposes early improvement and overfitting |

`mask_min_value` must stay within 0 through 1. A value of 0 gives the strongest pre-normalization contrast; 1 makes the remapped mask uniform and removes spatial weighting. Do not interpret 0.1 as “ten percent as much learning” after average normalization.

Test `invert_mask: true` only as a separate run when the intended focus is the opposite region. Inversion reverses source grayscale values before the black-to-floor and white-to-one remap.

An all-white mask is equivalent to no mask for ordinary, non-inverted masked loss: all locations have the same value and remain uniform after normalization. The mask editor therefore stores this redundant case as no mask. That equivalence does not describe inversion or the separate prior path.

## Sampling plan

Reuse the unmasked baseline's evaluation suite, inference configuration, LoRA strength, and fixed seed. Add prompts designed to separate foreground learning from background binding:

- the subject in two training-like contexts;
- the subject in at least three unseen backgrounds;
- changed pose, viewpoint, scale, and lighting;
- a trigger-off prompt for the base category;
- a scene containing a similar distractor object;
- detail views of boundary regions that masks commonly omit.

Sample the unmasked and masked checkpoints at the same 200-to-250-step positions. Compare subject fidelity, background flexibility, edge artifacts, prompt obedience, and unmasked-region quality. Confirm the preferred result with additional seeds using [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Expected learning signals

A useful masked run improves the intended subject region or reduces background correlation without making boundaries brittle. Novel backgrounds should become easier while pose and composition remain prompt-controllable. Dark mask regions may still learn when the floor is above zero.

Inspect overlays and effective outputs together. A lower scalar loss is not proof that focus improved because changing weights changes the loss being measured. The strongest evidence is a controlled sample-grid advantage over the unmasked baseline.

If the masked and unmasked runs behave similarly, the original problem may not be spatial weighting. Prefer the simpler unmasked setup unless masks provide repeatable benefit.

## Common failure modes

**Edges, hands, or accessories degrade:** masks are clipped, inconsistent, or too hard. Correct alignment and inclusion rules before softening boundaries or raising capacity.

**Background still binds:** captions or dataset correlations may dominate, masks may be nearly uniform, or `mask_min_value` may be too high. Inspect actual mask overlays before lowering the floor.

**Dark regions collapse:** a floor of zero removed useful ordinary-loss signal. Test a modest positive `mask_min_value` while keeping every other setting fixed.

**The wrong region learns:** verify source polarity and `invert_mask`; do not confuse inversion with `inverted_mask_prior`.

**Overfitting accelerates:** a small emphasized region receives concentrated normalized weight. Select an earlier checkpoint or reduce duration, learning rate, rank, or repetitions one variable at a time.

**Prior run is slower or unstable:** the inverted-mask prior performs an additional network-off prediction and has compatibility constraints. Disable it to re-establish the ordinary masked-loss baseline.

## Settings deliberately not changed

Keep the dataset images, captions, base checkpoint, architecture, rank, alpha, learning rate, optimizer, scheduler, timestep strategy, quantization, resolution, buckets, caches, augmentations, and sampling configuration identical to the unmasked control.

Do not enable `invert_mask` and `inverted_mask_prior` together merely because both names mention inversion. They perform different operations. Add the experimental prior only after ordinary masking is validated and outside-region preservation is a demonstrated problem; record its multiplier as a separate experimental variable.

## Model-specific deviations

- [Anima training guide](../models/anima.md): retain its architecture, precision, quantization, scheduler, and memory defaults; verify that the chosen training path supports masks.
- [Qwen Image and Edit training guide](../models/qwen-image-and-edit.md): distinguish dataset loss masks from edit conditioning and retain the correct generation/edit configuration.

Family-specific compatibility and validated preset values override the generic comparison settings here.

## Further reading

- [Mask training guide](../datasets/masks.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Training settings reference](../reference/training.md)
- [Dataset settings reference](../reference/dataset.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
