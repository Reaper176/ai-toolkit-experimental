# Prepare controls, video, and audio as matched training evidence

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](masks.md) · [Next →](rights-privacy-and-safety.md)
<!-- book-navigation:end -->

Specialized datasets teach relationships among multiple inputs: a target and a depth map, a video and its first frame, or frames and synchronized audio. File quality is necessary but not sufficient. The inputs must refer to the same example, cover the same geometry or time span, and use settings supported by the selected architecture.

The fields are defined in `toolkit/config_modules.py` and consumed through `toolkit/dataloader_mixins.py`. Check the [dataset reference](../reference/dataset.md) and the relevant model chapter before enabling a modality; a setting's existence does not make every architecture consume it.

## Keep control inputs matched

[`dataset.control_path`](../reference/dataset.md#dataset-control-path) names one control directory or an ordered list of directories. The loader pairs targets and controls by filename basename. A target named `shot-014.png` therefore needs the intended control under the corresponding basename in each required control directory. Extensions may be discovered from supported image types, but a near match, renamed stem, or off-by-one sequence is a different item.

Use a manifest to validate pairs before training:

```text
target basename | target size | control type | control size | status
shot-014       | 1024x768    | depth        | 1024x768     | matched
```

Open random overlays, not only filenames. A depth, pose, line, inpaint, or mask control can have the right basename and still belong to another frame. Detect missing members, duplicates, stale regenerated controls, wrong orientation, unexpected alpha fill, and control values outside the expected format.

The UI-friendly `control_path_1`, `_2`, and `_3` slots are folded into the ordered `control_path` list when any numbered path is nonempty. Preserve the semantic order expected by the architecture. More control streams increase preprocessing and memory and do not help when the model or recipe does not consume them.

[`dataset.controls`](../reference/dataset.md#dataset-controls) requests supported automatic control generation such as depth, line, pose, inpaint, mask, or `sapiens2_mask`. Generation makes preprocessing reproducible only when its tool version and options are also recorded. Preview generated controls and version them with their targets.

[`dataset.control_from_same_folder`](../reference/dataset.md#dataset-control-from-same-folder) instead samples sibling images from grouped folders. This is appropriate only when every eligible sibling is a valid reference for the target. Random selection from a loosely organized folder can silently create semantically unrelated pairs; curate group boundaries and bound the count with `num_controls_from_same_folder`.

## Preserve paired geometry

A spatial transform applied to a target must normally be applied identically to its pixel-aligned control. [`dataset.replay_transforms`](../reference/dataset.md#dataset-replay-transforms) defaults to true and replays compatible spatial augmentation onto matched controls. An explicit YAML `null` is falsey and disables replay rather than restoring the fallback.

Keep replay enabled for depth, pose, edges, masks, inpaint maps, and other aligned supervision. Disable it only when the consumer intentionally expects an independent full-image reference. A one-pixel-looking mismatch at source resolution can become a large conditioning error after resize and latent downsampling.

Check the processed pair after EXIF orientation, horizontal or vertical flip, scale, bucket selection, crop, and augmentation. If the target is cropped but the control remains full size, verify that the architecture and `full_size_control_images` path explicitly require that behavior. Do not “fix” alignment by manually cropping only one side.

Transparent controls use `control_transparent_color` as the RGB fill for transparent regions. Choose a fill appropriate to the control representation and inspect the composited boundary; an unintended black or colored edge becomes conditioning signal.

Caching can preserve a mistake. When a target, control, first frame, transform, or control-generation process changes, invalidate the exact caches described in [performance and caching](../advanced/performance-and-caching.md) and rebuild the paired preview.

## Select video frames deliberately

[`dataset.num_frames`](../reference/dataset.md#dataset-num-frames) requests the temporal batch length. A value of 1 selects image loading; larger values enter video behavior. More frames increase memory sharply and must satisfy the selected model's temporal constraints, so begin with its documented recipe rather than an arbitrary cinematic frame count.

With [`dataset.shrink_video_to_frames`](../reference/dataset.md#dataset-shrink-video-to-frames) enabled—the engine fallback—the loader samples across the whole clip to fit `num_frames`. This covers beginning through end, but a long clip compressed into a short frame count can make motion appear unnaturally fast.

With shrinking disabled, [`dataset.fps`](../reference/dataset.md#dataset-fps) determines spacing for a contiguous selection from a random start. This better preserves a chosen motion rate but requires enough frames for the requested span. Incorrect or variable source FPS metadata can change apparent speed and cause insufficient-frame failures.

Curate clips before relying on either mode:

- trim dead time, title cards, cuts, and unrelated actions;
- avoid a single file containing several scenes or camera discontinuities;
- record the true source frame rate and duration;
- check every clip can supply a valid model-compatible frame count;
- balance motion direction, speed, camera behavior, and subject scale;
- caption the temporal action that survives the selected span.

Short, coherent clips make frame policy interpretable. If whole-clip shrinking looks sped up, trim the source closer to the desired duration or use the compatible FPS path. Do not compensate for bad timing by changing captions alone.

## Build image-to-video examples

[`dataset.do_i2v`](../reference/dataset.md#dataset-do-i2v) enables image-to-video handling for models that support an initial-image condition. It is architecture-dependent; unsupported models may ignore or reject the path.

Treat the conditioning image and video as a pair. The first-frame condition must represent the intended starting state, dimensions, crop, orientation, subject identity, and scene. Reject clips with a hidden cut before meaningful motion begins or a first frame that differs from the separately supplied condition.

For each I2V example, inspect:

1. the exact condition image presented to the model;
2. the selected video frames in order;
3. the transition from the condition into motion;
4. the effective caption and trigger;
5. the bucket, frame count, FPS policy, and cache identity.

Do not mix text-to-video and image-to-video goals accidentally. If the architecture and recipe permit both, separate or label the datasets so their conditioning contracts remain auditable. A good still image paired with the wrong clip teaches a false temporal relationship.

## Prepare audio consistently

[`dataset.do_audio`](../reference/dataset.md#dataset-do-audio) loads audio from video items for compatible audio-video models. Validate decoding, sample rate conversion, channel handling, duration, and synchronization. Remove or repair files with clipped waveforms, missing tracks, long unintended silence, drift, or unrelated replacement audio.

[`dataset.audio_normalize`](../reference/dataset.md#dataset-audio-normalize) normalizes volume during loading. It can reduce accidental loudness variation when absolute amplitude is irrelevant, but it can also amplify noise in quiet recordings and remove amplitude differences that belong to the concept. Compare waveform statistics and listen before enabling it globally.

[`dataset.audio_preserve_pitch`](../reference/dataset.md#dataset-audio-preserve-pitch) preserves pitch when audio is time-stretched to the selected video frame span. This avoids the obvious raised or lowered pitch caused by simple speed change, at additional processing cost and with possible artifacts. It matters only when audio is loaded and duration adjustment occurs.

Choose audio policy from the goal:

- For speech or singing identity, pitch and timing may be semantically important; preserve them and curate speakers, phonemes, dynamics, and noise.
- For sound effects, amplitude and pitch variation may be part of the desired output; indiscriminate normalization can erase it.
- For synchronized performance, prioritize alignment between visible events and transients over file count.

Changing frame selection can change the required audio span. Re-audit synchronization and regenerate tensor or latent caches after trimming, FPS, frame-count, normalization, or pitch-policy changes.

## Validate a multimodal batch

Before a long job, run one small batch through the exact architecture and inspect every resolved component:

- target media and caption;
- each ordered control and its transformed geometry;
- mask or inpaint map when present;
- selected video frames, frame indices, and effective FPS;
- I2V condition frame;
- decoded, resampled, normalized, or stretched audio;
- tensor shapes, dtypes, cache paths, and memory use.

Then run a short diagnostic that saves samples early. A low training loss cannot reveal a swapped control, temporally misaligned clip, or pitch-shifted track by itself. Use fixed prompts and seeds, retain the batch manifest, and change only one pairing or preprocessing policy per comparison.

If a job fails intermittently, look for the one source with insufficient frames, missing audio, a mismatched basename, unusual dimensions, or corrupt metadata. If it runs but ignores conditioning, verify the architecture consumes the enabled setting and that the control is not uniform, stale, or misaligned.

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
