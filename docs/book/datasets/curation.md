# Curate a dataset that teaches the intended LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](../getting-started/training-mental-model.md) · [Next →](captions-and-triggers.md)
<!-- book-navigation:end -->

Training settings determine how ai-toolkit uses a dataset, but curation determines what evidence the dataset contains. A clean, varied collection makes the intended relationship easier to learn and easier to evaluate. A large collection of contradictory, repeated, or accidental patterns can instead make a reasonable configuration look broken.

This chapter covers selection and organization. The next chapters develop [captions and triggers](captions-and-triggers.md), [resolution and bucketing](resolution-and-bucketing.md), [masks](masks.md), and specialized [control, video, and audio inputs](controls-video-audio.md).

## Define the learning goal

Write one sentence describing what should remain stable and what should respond to a prompt. Use it as the inclusion rule for every example.

- For a **subject** or character identity, the identity should remain recognizable while pose, expression, crop, clothing, lighting, and background can change. If every portrait has the same shirt and wall, the data does not show that those details are independent of the person.
- For a **style**, the rendering language should remain recognizable across different subjects and compositions. A collection containing one subject cannot clearly separate its content from its style.
- For an **object** or product, preserve its defining shape and markings while varying viewpoint, scale, use, and environment. Include detail views only when those details should be reproducible.
- For an **edit** behavior, define the relationship between the input, instruction, and desired output. Unpaired “before” and “after” images do not demonstrate which transformation belongs to which input.
- For **image** training, choose stills that represent the intended range of composition. For **video**, select coherent clips whose motion and duration support the desired behavior rather than treating adjacent frames as unrelated photographs. For **audio**, check intelligibility, channel consistency, silence, clipping, and the range of voices or sounds the LoRA should cover.

Keep separate concepts in separate datasets when they need separate sampling frequency or loss roles. ai-toolkit's `DatasetConfig` in `toolkit/config_modules.py` accepts more than one dataset entry, so organization does not require mixing every purpose into one folder.

## Prefer quality before quantity

Quality means that an example is usable, relevant, correctly oriented, paired with the right auxiliary files, and consistent with the learning goal. It does not mean that every image must be a studio photograph. Deliberate low-light, phone-camera, illustration, or motion-blurred examples can be valuable when that variation belongs in the output behavior.

Reject corrupted files, accidental thumbnails, severe compression artifacts, watermarks that must not be learned, wrong subjects, broken control pairs, empty audio, and clips that cannot be decoded consistently. Inspect at full training relevance: a face that looks acceptable in a contact sheet may have unusable eyes, and an apparently quiet clip may contain a loud transient.

More files are useful only when they add evidence. Ten clean views can outperform hundreds of redundant frames, but a tiny set may not demonstrate enough independent variation. Start with the smallest collection that covers the goal, run a diagnostic, and add data to address an observed gap rather than chasing a universal file count.

The configured source is documented under [`dataset.folder_path`](../reference/dataset.md#dataset-folder-path). Treat that path as an input location, not as a quality guarantee: the loader cannot decide whether the media teaches the concept you intended.

## Exact and near duplicates

An **exact duplicate** has the same content bytes even if it was copied or renamed. Hashing files is a quick first pass. Also compare decoded content because metadata changes, recompression, resizing, or format conversion can make the bytes different while leaving the training signal effectively identical.

A **near duplicate** repeats almost the same composition or moment. Examples include burst photographs, consecutive video frames, two crops of the same portrait, and a source image saved at several resolutions. Use perceptual similarity tools to find candidates, then make the final decision visually; automated thresholds can confuse intentional variations with duplicates.

Duplicates silently increase sampling frequency. Keep a repeated view only when its extra emphasis is intentional. Do not use physical copies as an opaque weighting system. ai-toolkit exposes [`dataset.num_repeats`](../reference/dataset.md#dataset-num-repeats) for relative sampling frequency and [`dataset.network_weight`](../reference/dataset.md#dataset-network-weight) for training contribution, making that decision visible in configuration. Repeats do not create new information and can accelerate memorization.

For video, do not export every neighboring frame merely to inflate an image dataset. Select frames far enough apart to contribute a meaningful change, or train the clip through the supported video path when temporal behavior is the goal.

## Outliers

An outlier is an example that differs strongly from the rest of the set. It is not automatically bad. A rare profile view may close an important coverage gap; a mislabeled stranger, an unrelated art style, or one extreme fisheye image may instead pull learning away from the goal.

Review outliers one at a time and ask:

1. Is the intended subject, style, object, transformation, motion, or sound actually present?
2. Is the caption or pairing accurate?
3. Does this example expand a behavior the LoRA should support?
4. Can the difference be described so the model has a chance to separate it from the core concept?

Keep purposeful edge cases and document why they remain. Remove errors. Put uncertain items in a holdout folder and compare a small run with and without them rather than allowing one unusual file to become an unexplained variable.

## Variety and balance

Build a simple coverage table before training. For an identity dataset, rows might be pose, camera distance, expression, clothing, background, and lighting. For an object, include viewpoint, distance, environment, state, and interaction. For style, track subject matter, palette, composition, medium, and complexity. Video adds motion, camera movement, clip length, and temporal stability; audio adds speaker or source, pitch range, loudness, background conditions, and duration.

Balance does not require equal counts in every cell. It means no accidental correlation dominates the evidence. If nearly every side view is outdoors, every close-up uses hard lighting, or one background occupies half the set, the LoRA may bind those traits together. Add counterexamples or remove redundant members of the dominant group.

Reserve several representative and difficult cases for evaluation prompts or a holdout review. Do not use training loss to decide whether coverage is sufficient; compare fixed-seed samples across the intended range and look for missing views, rigid backgrounds, copied compositions, or prompt terms that no longer have an effect.

When combining datasets, start with neutral configuration values. Increase [`num_repeats`](../reference/dataset.md#dataset-num-repeats) or adjust [`network_weight`](../reference/dataset.md#dataset-network-weight) only for a stated reason and record the change. Mark a dataset with [`dataset.is_reg`](../reference/dataset.md#dataset-is-reg) only when it truly contains regularization or class examples; that flag changes the examples' role and is not a general cure for imbalance.

## Version the dataset and preserve provenance

Give each experiment a reproducible dataset identity. At minimum, record the media list, caption and mask files, curation date, source or license notes, and a digest or version identifier. Do not edit a supposedly fixed dataset in place and keep the same experiment label. Publish a new version when selection, captions, masks, pairings, or loader-relevant preprocessing changes.

ai-toolkit can use a live folder or an immutable dataset preset. For a preset-backed job, the server verifies the snapshot, resolves the managed media root, and saves version and manifest-digest provenance. The exact folder behavior is recorded in the [dataset reference](../reference/dataset.md#dataset-folder-path), while the implementation for publishing and verifying immutable snapshots lives in `ui/src/server/datasetPresetSnapshotService.ts`.

The preset workflow can retain a **source-missing** item from a prior verified manifest by copying its frozen media into a new immutable version and checking its recorded hash. This preserves a consciously selected historical example when the live source later disappears; it does not recreate a missing live file or excuse an unexplained source. Review source-missing entries explicitly, keep their license and origin notes, and remove them in the next version when continued retention is not intended.

Record the dataset version beside checkpoints and sample comparisons. If two runs use different data, treat them as different experiments even when their YAML settings match. Provenance makes a useful result reproducible and makes privacy, consent, licensing, and deletion decisions traceable; those responsibilities are covered in [rights, privacy, and safety](rights-privacy-and-safety.md).

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
