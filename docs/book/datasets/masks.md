# Use dataset masks without reversing the objective

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](resolution-and-bucketing.md) · [Next →](controls-video-audio.md)
<!-- book-navigation:end -->

A dataset mask changes the spatial weighting of ordinary per-pixel loss. It does not erase pixels from the source, crop the image, or tell the model that the unpainted region is nonexistent. The mask supplies a relative weight map that follows the same resize, crop, and compatible spatial transforms as its source.

The fields are declared in `toolkit/config_modules.py`, mask loading and remapping occur in `toolkit/dataloader_mixins.py`, and masked loss is applied in `extensions_built_in/sd_trainer/SDTrainer.py`. The [dataset reference](../reference/dataset.md#dataset-mask-path) and [training reference](../reference/training.md#train-inverted-mask-prior) are the authoritative setting catalogs.

## Understand what an ordinary mask changes

Use an ordinary mask when one region should have a larger relative influence on the training error than another. Typical uses include emphasizing a face while retaining some context, focusing on a product rather than its backdrop, or weighting the changed region of an edit pair.

For each source basename, ai-toolkit resolves a matching grayscale mask from [`dataset.mask_path`](../reference/dataset.md#dataset-mask-path), or uses the media alpha channel when [`dataset.alpha_mask`](../reference/dataset.md#dataset-alpha-mask) is enabled. Mask files must align with their source. During loading, the mask receives the source flip, compatible replayed spatial augmentation, bucket resize, and crop.

The trainer multiplies the unreduced loss by the resulting mask tensor on model paths that support masked loss. In the ordinary diffusion path it then normalizes the mask multiplier to an average of 1.0. This retains the overall loss scale while redistributing relative emphasis across the image. Consequently, a mixed mask is best understood as “more weight here, less weight there,” not as an absolute amount of learning detached from the rest of the mask.

A mask cannot rescue an incorrectly captioned source, restore cropped detail, or isolate a concept that appears inconsistently. Establish an unmasked baseline first, then add masks to answer a specific spatial-confounding problem.

## Read white black and gray exactly

For an ordinary mask with `invert_mask: false`, the loader first converts the file to grayscale. Before the trainer's average normalization:

- **White pixels map to 1.0**, the full ordinary mask value.
- **Black pixels map toward `mask_min_value`**, the configured floor.
- Intermediate grayscale values are mapped continuously between the floor and 1.0.

With a floor of `0.1`, for example, source black maps to `0.1`, source mid-gray maps between `0.1` and `1.0`, and source white maps to `1.0`. After the trainer rescales the mixed mask to mean 1.0, the relative ordering remains: the painted region has a larger multiplier than the dark region.

This is a loss-weight convention, not a label for foreground and background. Paint the region that should receive the full ordinary masked-loss value white. Use soft gray edges when a gradual boundary is preferable to a hard transition, but inspect thin structures after bucket resize because interpolation and the loader's small blur can soften them further.

Avoid slogans that omit the active mode. An inverted mask reverses the file values before remapping, and the experimental inverted-mask prior is a separate additional objective. Always state whether the explanation refers to ordinary masked loss, `invert_mask`, or the prior.

## Choose mask_min_value

[`dataset.mask_min_value`](../reference/dataset.md#dataset-mask-min-value) is constrained to the interval from 0 through 1. It controls the black-pixel floor before average normalization:

- `0.0` gives source-black pixels zero ordinary mask weight. It creates the strongest exclusion, but an all-black mask has a zero mean and cannot be normalized safely.
- `0.1` is the value written by current Simple UI defaults. It keeps the dark region weakly represented and is a practical first diagnostic value.
- A larger positive value preserves more context but reduces contrast between painted and unpainted areas.
- `1.0` maps both black and white to 1.0, so the mask has no spatial focusing effect.

There is no universal minimum that fits every dataset. Start at `0.1` when the outside region should remain weakly represented. Move toward zero only when outside-region gradients are demonstrably harmful and every mask is valid. Raise the floor when samples lose useful context or develop boundary artifacts. Compare fixed prompts and seeds against the unmasked baseline.

Because main-path normalization keeps the average multiplier near 1, changing the floor changes relative spatial contrast rather than simply multiplying the whole example by that number. Dataset-level controls such as `loss_multiplier` or `network_weight` serve different purposes.

## Invert before weighting

[`dataset.invert_mask`](../reference/dataset.md#dataset-invert-mask) flips grayscale values in the loaded image. Inversion occurs before the black-to-floor and white-to-one remap.

Suppose a stored mask has a white subject and black background:

| Mode | Stored subject | Stored background | Ordinary remapped emphasis |
|---|---:|---:|---|
| `invert_mask: false` | white | black | subject at 1.0; background toward the floor |
| `invert_mask: true` | white becomes black | black becomes white | subject toward the floor; background at 1.0 |

Use inversion when existing files paint the complementary region from the one intended for ordinary loss. Preview the effective mask after inversion; do not repaint files and enable inversion at the same time unless the double reversal is intentional.

`invert_mask` is not the same setting as `train.inverted_mask_prior`. The former reverses one ordinary mask map. The latter performs an extra model prediction and applies a preservation loss to the complementary region.

## Know what the mask editor stores

In the browser workflow, mask locations are server-managed. A normal job-save request writes `mask_path` as `null`; live and immutable preset masks are resolved by the server rather than trusting an arbitrary browser-supplied directory.

The mask editor stores an **all-white mask** as a delete operation. For ordinary non-inverted masked loss, an all-white mask is equivalent to no mask: every location begins at the same full value and average normalization leaves a uniform multiplier. Omitting that redundant file saves storage and avoids implying spatial focus that is not present.

This storage normalization matters during editing:

- “No mask” on an ordinary item means uniform ordinary loss weighting.
- Painting any darker region creates a stored mask and reduces that region relative to white according to the floor.
- Returning the entire canvas to white removes the redundant stored mask.
- A missing mask cannot provide complementary geometry for `inverted_mask_prior`.
- Do not rely on an all-white file plus `invert_mask` to create an all-black effective mask; the editor deliberately stores the all-white ordinary case as no mask.

After saving, remain on the current dataset item or choose the next item according to the editor workflow, and use the mask-availability control above an image to reopen its editor. When publishing a dataset preset version, verify that the frozen manifest contains the intended mask for every selected source.

## Add an inverted-mask prior only when compatible

[`train.inverted_mask_prior`](../reference/training.md#train-inverted-mask-prior) is an experimental preservation objective. When a batch has a mask, ai-toolkit performs a network-off **prior prediction**, constructs a complementary mask, and measures the trained prediction against that prior outside the active region. [`train.inverted_mask_prior_multiplier`](../reference/training.md#train-inverted-mask-prior-multiplier) scales this additional loss; its engine fallback is `0.5`.

This can help preserve areas outside a focused edit, but it has real cost:

- it requires resolved masks rather than merely an ordinary uniform multiplier;
- the extra prior prediction adds compute and memory work;
- a large multiplier can dominate the main masked objective;
- the complement depends on the remapped mask, so a positive floor reduces the available outside-mask contrast;
- Turbo training is incompatible with this path: `SDTrainer` asserts that `train_turbo` is false when computing the inverted-mask prior.

Do not enable it as a generic quality improvement. First prove that ordinary masked training changes the outside region undesirably. Then run a small compatible experiment, preserve the same mask set and sample suite, and compare both the edited and preserved areas.

## Diagnose mask training

When mask behavior looks reversed, absent, or unstable, inspect the effective data before changing learning rate:

1. Confirm the mask basename matches the source and that `mask_path` or alpha-mask resolution found it.
2. Preview the mask after EXIF handling, inversion, flips, resize, crop, and replayed transforms.
3. Check that the intended full-weight ordinary region is white after any inversion.
4. Record `mask_min_value`; test a simple black/white mask before debugging subtle grayscale edges.
5. Verify the active model path actually applies masked loss and inspect logs for mask-loading errors.
6. Disable `inverted_mask_prior` to separate ordinary weighting from the extra preservation objective.
7. Compare an unmasked checkpoint and masked checkpoint at the same step with the same prompts and seeds.

If loss becomes nonfinite, look for an all-black effective mask with a zero floor, a missing or corrupt mask, invalid geometry, or an incompatible prior/Turbo combination. If boundaries appear in samples, soften or improve the mask edge, retain a small floor, and confirm crop alignment. If nothing changes, verify the mask was resolved and that it contains nonuniform values after editor storage normalization.

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
