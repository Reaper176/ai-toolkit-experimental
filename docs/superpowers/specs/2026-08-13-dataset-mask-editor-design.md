# Dataset Mask Editor and Masked Training UI Design

## Goal

Expose the toolkit's focus-mask configuration in the UI and add a safe grayscale mask editor to dataset preset selection. Masks must remain reproducible across immutable preset versions and queued jobs.

## Existing Training Semantics

`DatasetConfig.mask_path` points to a directory containing mask images whose basenames match source images. White mask pixels receive full loss weight; black pixels receive the configured minimum weight. `mask_min_value` remaps black from zero to the configured floor, and `invert_mask` reverses the loaded grayscale mask.

`TrainConfig.inverted_mask_prior` is a training-level option implemented by `SDTrainer`. When enabled for a masked batch, the trainer makes a network-disabled prior prediction and applies prior loss outside the painted region using `inverted_mask_prior_multiplier`. It is incompatible with turbo training in the active trainer.

## User Experience

### Dataset Review

Selection mode gains an **Edit masks** action. The action is available when at least one live image is selected and opens a focused modal over the existing virtualized grid. Source-missing retained images cannot be edited from the live dataset.

The modal navigates only through selected, live images in the same stable order as the dataset. It provides:

- grayscale brush and eraser tools;
- brush size, hardness, and opacity;
- undo and redo;
- clear, invert, and reset-to-original actions;
- adjustable mask-overlay opacity;
- zoom, pan, fit-to-view, and keyboard shortcuts;
- previous/next navigation with dirty-change protection;
- explicit save and cancel actions.

White represents full loss and black represents suppressed loss. An image without a mask opens as visually all-white, but no file is created until an edit differs from all-white. Saving an all-white canvas removes the live mask so the loader treats the image exactly as unmasked.

The dataset review card shows whether a selected image has a live mask. Archived preset versions are read-only; their frozen masks can be previewed but not changed.

### Job Configuration

Dataset controls expose:

- resolved mask status/path;
- `mask_min_value`, constrained to 0 through 1;
- `invert_mask`.

Training controls expose:

- `inverted_mask_prior`;
- `inverted_mask_prior_multiplier`, constrained to a nonnegative finite value and defaulting to `0.5`.

The UI disables inverted-mask prior when no configured dataset resolves to any masks and explains why. It also rejects inverted-mask prior combined with turbo training before queue submission.

## Live Mask Storage

For a dataset at `datasets/<dataset>`, editable masks live in the sibling directory `datasets/<dataset>_masks`. Masks are single-channel grayscale PNG files using the source image's basename with a `.png` extension. Captions and masks remain separate.

The current Python loader resolves masks by basename rather than relative path. Therefore, mask creation and preset publication reject selected images with duplicate basenames that would map to the same mask filename. The UI reports every conflicting relative path instead of silently assigning one mask to multiple images.

Deleting a live source image also deletes its corresponding live mask after the existing deletion confirmation succeeds. Converting an image format preserves its mask only when the basename remains unchanged.

## Mask APIs and Editor Core

Dataset-scoped route handlers provide mask read, save, and delete operations. Requests identify the dataset and normalized relative source-image path; callers cannot supply arbitrary mask paths.

The server:

1. validates dataset and relative-path syntax;
2. resolves both paths beneath configured dataset roots;
3. verifies that the source is a supported live image;
4. rejects ambiguous duplicate basenames;
5. decodes the submitted PNG with size limits;
6. verifies dimensions match the source image;
7. normalizes it to single-channel grayscale;
8. omits/removes all-white masks;
9. writes non-white masks atomically through a same-directory temporary file and rename.

The editor's canvas math and brush engine live in pure helpers separate from React. Pointer coordinates are mapped through zoom/pan transforms into source-image pixels. Soft strokes composite grayscale values using brush opacity and hardness. History stores bounded mask snapshots; dirty state compares the current mask with the loaded mask.

## Immutable Preset Snapshots

The preset manifest schema is extended with optional mask metadata per media entry: managed relative path, byte size, SHA-256 digest, and absence status. Existing manifests without these fields remain valid and mean no frozen mask.

When publishing a preset version:

- newly selected live images snapshot their current non-white masks;
- retained live images use their current live masks, consistent with how a new version snapshots current media/captions;
- source-missing retained images carry forward the exact frozen mask from the base version;
- mask files are copied into a managed mask directory inside the staged version;
- media, captions, masks, and the manifest are published only after every copy and digest succeeds;
- any failure removes staging output and leaves the database/version counter unchanged.

Version verification checks every declared mask's existence, size, and digest. Maintenance cleanup treats masks as part of the version directory and requires no independent deletion path.

## Job Resolution and Preflight

When a job uses a preset version containing masks, dataset resolution sets `mask_path` to that version's managed mask directory. The browser cannot override this resolved path. `mask_min_value` and `invert_mask` remain loader settings stored in the preset version.

Job provenance records the resolved loader configuration and manifest hash as it does today. Queue and worker preflight verify frozen masks before training. A missing, changed, or malformed managed mask blocks the job with the affected preset version and filename in the error.

Live, non-preset datasets may use the deterministic sibling mask directory when it contains masks. Empty mask directories resolve as no `mask_path`.

## Compatibility and Migration

- Existing jobs, presets, and manifests remain readable without migration.
- Existing explicit live `mask_path` values remain supported for non-preset jobs.
- Dataset preset APIs continue rejecting browser-supplied external `mask_path` values; only the server may derive a managed mask path.
- Mask files are PNG regardless of source-image extension.
- Images without masks retain existing training behavior.
- The existing `alpha_mask` feature remains separate and is not edited by this UI.

## Error Handling

- Path traversal, symlink escape, unsupported media, dimension mismatch, oversized payloads, invalid PNG data, and duplicate basenames return actionable 4xx responses.
- Atomic writes prevent interrupted saves from exposing partial masks.
- Closing or navigating away from a dirty editor requires confirmation.
- A save failure keeps the editor open with the current canvas intact.
- Preset publication and job queueing fail closed when mask integrity cannot be proven.
- Unsupported inverted-mask-prior combinations are rejected in both client validation and the server/worker boundary.

## Testing

Automated coverage includes:

- grayscale brush compositing, hardness, opacity, erasing, coordinate mapping, zoom/pan, and bounded undo/redo;
- missing-mask white presentation and all-white omission/removal;
- route path confinement, symlink defense, PNG validation, dimensions, atomic replacement, deletion, and duplicate-basename rejection;
- selection-only previous/next navigation, dirty confirmation, mask badges, and archived read-only behavior;
- backward-compatible manifest parsing and mask metadata validation;
- new, retained-live, and source-missing-retained mask snapshot behavior;
- transactional failure cleanup and digest verification;
- job resolution, provenance, queue preflight, and immutable managed `mask_path` enforcement;
- dataset loader serialization for `mask_min_value` and `invert_mask`;
- training serialization and validation for inverted-mask prior and multiplier;
- Python loader compatibility using a small image/mask fixture;
- focused UI tests, dataset-preset suites, training-preset suites, and the production build.

## Out of Scope

- Automatic segmentation or AI-generated masks;
- editing alpha-channel masks;
- video mask timelines or per-frame masks;
- changing the Python loader to match masks by nested relative paths;
- importing arbitrary external mask directories into immutable presets;
- collaborative or multi-user concurrent mask editing.

