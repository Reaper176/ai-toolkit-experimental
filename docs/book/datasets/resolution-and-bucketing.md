# Choose resolution and buckets without destroying composition

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Training media must be converted into tensor shapes that a model can batch. Resolution controls the spatial budget; buckets group compatible aspect ratios; resizing and cropping decide which source content enters that budget. These operations can remove or interpolate information, so inspect their results instead of treating them as neutral plumbing.

The user-facing fields originate in `DatasetConfig` in `toolkit/config_modules.py`; bucket construction and preprocessing are implemented through `toolkit/data_loader.py` and its loader mixins. Exact defaults and applicability are in the [dataset settings reference](../reference/dataset.md).

## Choose a resolution the source can support

[`dataset.resolution`](../reference/dataset.md#dataset-resolution) sets the target used for bucket construction and preprocessing. The engine accepts a resolution value, and UI-created diffusion jobs commonly provide a list such as `[512, 768, 1024]`. Use a model-family recipe as the starting point because native scale, latent divisibility, memory behavior, and supported video shapes differ.

Resolution is a training budget, not a quality repair switch. Upscaling a small, blurred, compressed, or tightly cropped source cannot restore detail that the source never contained. Interpolation can create more pixels, but those pixels are estimates rather than recovered eyelashes, lettering, texture, or object geometry. Remove or replace inadequate sources when the missing information matters.

Conversely, enormous source files do not require the largest possible training resolution. Downsampling a sharp source can preserve the relationships needed by the LoRA while reducing memory, preprocessing time, and bucket fragmentation. Compare representative details after preprocessing at the intended size.

Before choosing a target:

- measure the shorter side of each image after any deliberate crop;
- identify the smallest features that must remain learnable;
- check the architecture recipe and available VRAM;
- separate a few low-resolution exceptions instead of forcing the whole dataset around them;
- remember that video frame count multiplies the spatial memory problem.

If a higher resolution causes out-of-memory failures, do not compensate by silently changing several other variables. Return to a known recipe, reduce one memory axis, and compare the resulting bucketed previews.

## Preserve aspect ratios with buckets

With [`dataset.buckets`](../reference/dataset.md#dataset-buckets) enabled, ai-toolkit groups media into compatible width-and-height shapes near the target area. A portrait can remain portrait and a landscape can remain landscape, reducing the destructive crop or distortion that would result from forcing every source into one square.

Bucketing does not guarantee that no pixels are cropped. A source is resized to cover its selected bucket and excess width or height can still be removed. It does make the target shape closer to the source aspect ratio, so the crop is usually smaller than a universal square crop.

All datasets combined in one loader must agree on whether bucketing is enabled. Omission uses the engine's `true` fallback, while an explicit YAML `null` remains falsey and therefore disables the consumer rather than restoring the fallback. Video loading requires bucket mode in the current path, so do not disable it casually for video datasets.

[`dataset.bucket_tolerance`](../reference/dataset.md#dataset-bucket-tolerance) represents the divisibility used to produce legal dimensions. In the diffusion dataset path, ai-toolkit replaces the configured value with the active model's bucket divisibility before building buckets. Treat it as runtime-authoritative model behavior, not a free quality dial whose YAML value can override architecture constraints.

Very unusual aspect ratios may create sparse buckets, heavy crops, or inefficient batches. Decide whether a panoramic or extremely tall example is essential. Crop it intentionally, place it in a compatible specialized dataset, or remove it; do not let an accidental screenshot determine the geometry of a training run.

## Understand resizing and cropping

For each item, inspect the whole chain: source dimensions, configured `scale`, chosen bucket, resize dimensions, and final crop. A face, logo, hand, subtitle, or product edge near the border can disappear even though the original file looked correct.

The default deterministic crop is easier to reproduce. [`dataset.random_crop`](../reference/dataset.md#dataset-random-crop) varies crop location where supported, which can add framing diversity when the source has safe margins. It can also cut away identity-defining features or create captions that no longer match the visible crop. Preview many random outcomes rather than one lucky example.

[`dataset.random_scale`](../reference/dataset.md#dataset-random-scale) varies scale before cropping and forces the random-crop path in the loader. It can teach size diversity from roomy sources, but it may repeatedly exclude important details and it changes the effective composition distribution. Do not enable it merely because “augmentation is good.”

The advanced [`dataset.scale`](../reference/dataset.md#dataset-scale) applies an explicit pre-crop dimension multiplier. Values that shrink too far can make a source fail minimum-size checks or discard useful detail. Leave it at the `1.0` fallback unless the dataset has a measured, specialized need.

[`dataset.square_crop`](../reference/dataset.md#dataset-square-crop) requests square cropping only in compatible paths. It is not a universal substitute for buckets. A square crop can be appropriate for intentionally centered square data, but it discards content from portrait and landscape sources and can create a misleadingly uniform composition prior.

## Use geometric augmentation cautiously

[`dataset.flip_x`](../reference/dataset.md#dataset-flip-x) adds a horizontally flipped copy. Use it only when left-right orientation is not semantic. It is often harmful for readable text, logos, scars or asymmetric faces, handed tools, vehicle controls, clothing closures, and any caption containing left/right direction.

[`dataset.flip_y`](../reference/dataset.md#dataset-flip-y) adds a vertically flipped copy. Most people, places, products, and scenes are not vertically invariant, so the safe default is off. It is occasionally useful for an orientation-independent texture, but that narrow case should be demonstrated rather than assumed.

Flips and crops alter sampling as well as geometry. A flipped copy increases the number of training items; random transforms create variants over time. Keep them out of the baseline unless they answer a documented coverage gap, and verify paired masks or controls remain aligned. The [control and modality chapter](controls-video-audio.md) explains matched transforms for paired inputs.

Augmentation cannot substitute for real viewpoint, pose, or framing diversity. A mirrored front view is not a back view, a crop is not a new camera position, and enlarging a face is not a genuine macro photograph.

## Inspect the bucket distribution

Run dataset preparation or a short diagnostic and record how many items land in each width-height bucket. Review both counts and representative transformed images.

Look for:

- one dominant bucket caused by accidental uniform preprocessing;
- buckets containing only one or two extreme-aspect items;
- systematic cropping of heads, feet, text, controls, or object edges;
- sources that must be enlarged substantially to reach their bucket;
- portrait/landscape imbalance that conflicts with the intended use;
- video shapes whose frame count and spatial size exceed the memory plan.

Sparse buckets matter more when batch size is greater than one because compatible shapes must be grouped. A mathematically valid bucket can still be operationally inefficient. Do not change `bucket_tolerance` to arbitrary dimensions; resolve problematic media and use the model-required divisibility.

Save the bucket report with the dataset version. When selection, crops, resolution, or model architecture changes, regenerate it. Cached size metadata and latent caches are implementation accelerators, not proof that the current source geometry was re-evaluated.

## Diagnose composition failures

When samples show rigid framing, cropped anatomy, tiny subjects, stretched details, or lost prompt control, compare the processed dataset before changing the optimizer.

1. Reproduce the source-to-bucket transform for failing examples.
2. Check whether the caption still describes the visible crop.
3. Compare the distribution of subject scale and aspect ratio with the intended prompts.
4. Disable random crop, random scale, square crop, and flips to establish a deterministic baseline.
5. Remove or deliberately recrop extreme sources.
6. Rebuild affected caches and rerun the same fixed-seed sample suite.

If the baseline composition becomes correct, restore at most one augmentation and measure its effect. If detail remains absent at every setting, return to source quality: raising `resolution` cannot restore detail, and more steps can only reinforce the information that survived preprocessing.

<!-- book-verification:start -->
<!-- book-verification:end -->
