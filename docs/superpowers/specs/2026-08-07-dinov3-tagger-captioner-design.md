# DINOv3 Tagger Captioner Design

## Goal

Add the local DINOv3 ViT-H/16+ multi-label tagger to ai-toolkit's dataset
captioning workflow. A caption job will load a local safetensors checkpoint and
its matching vocabulary, infer scored tags for each image, filter and format
those tags according to per-job settings, and save them through the existing
caption-file lifecycle.

The motivating local files are:

- Checkpoint: `/run/media/john/Athalor-1tb-HD/Tagger local V8/tagger_proto.safetensors`
- Vocabulary: `/run/media/john/Athalor-1tb-HD/Tagger local V8/tagger_vocab_with_categories_and_alias_updated.json`

These personal absolute paths are verification inputs, not portable application
defaults.

## Model Format

The checkpoint contains a DINOv3 ViT-H/16+ image backbone and a multi-label
projection head. The inspected artifact has 616 tensors and no embedded
metadata. Its backbone uses:

- hidden size 1280;
- 32 transformer layers;
- 20 attention heads;
- feed-forward size 5120;
- four register tokens;
- 16-pixel patches; and
- a concatenated CLS-plus-register feature size of 6400.

The matching vocabulary contains 74,625 entries in `idx2tag`, plus
`tag2category` and `tag2alias` mappings. The model produces one sigmoid score
per vocabulary entry. It is therefore a tagger, not a generative prose-caption
model.

## Captioner Architecture

Register a new image captioner extension named `DINOv3TaggerCaptioner`. It will
subclass the existing `BaseCaptioner`, preserving the established job lifecycle:

- SQLite status and progress updates;
- recursive dataset discovery;
- extension filtering;
- recaption behavior;
- cancellation;
- per-image error isolation; and
- caption-file saving.

The implementation will be native to ai-toolkit and split into focused model,
selection/formatting, and captioner-integration modules. It will not import or
execute Python files from the model directory. This avoids a runtime dependency
on the external tagger application and avoids executing arbitrary adjacent code.

## Job Configuration

The new captioner supports these per-job fields:

- `model_name_or_path`: required local `.safetensors` checkpoint path.
- `vocab_path`: optional local vocabulary JSON path.
- `selection_mode`: `threshold` or `top_k`; defaults to `threshold`.
- `threshold`: confidence threshold in `[0, 1]`; defaults to `0.50`.
- `top_k`: positive result limit; defaults to `30`.
- `included_categories`: category identifiers enabled for output; defaults to
  general, character, and species/meta.
- `use_underscores`: replace spaces in tag names with underscores; defaults to
  false.
- `escape_parentheses`: escape `(` and `)` for prompt-weighting safety;
  defaults to false.
- `max_res`: maximum image long edge before inference; defaults to 1024.

Existing shared caption-job settings remain available: GPU selection, dtype,
caption extension, recaption, and optional compilation. Quantization defaults
off because the reference inference arrangement deliberately uses a reduced
precision backbone and an FP32 projection head.

## Vocabulary Resolution and Validation

The captioner validates paths before allocating the full model. When
`vocab_path` is supplied, it must resolve to a regular JSON file. When omitted,
the loader searches beside the checkpoint in this order:

1. Use `tagger_vocab_with_categories_and_alias_updated.json` when present.
2. Otherwise use the only regular file matching `*vocab*.json`.
3. If there are zero or multiple matches, stop and require an explicit path.

The vocabulary must contain an `idx2tag` list and `tag2category` mapping. Every
`idx2tag` entry must be a string, the category mapping must resolve every output
tag used for filtering, and the vocabulary length must match the checkpoint
head's output dimension. `tag2alias` may be retained for future use but does not
replace the checkpoint-aligned `idx2tag` output in this feature.

The source category IDs map to the model's native groups:

| Source ID | UI category |
| --- | --- |
| missing/unassigned | unassigned |
| 0 | general |
| 1 | artist |
| 2 | contributor |
| 3 | copyright |
| 4 | character |
| 5 | species/meta |
| 6 | disambiguation |
| 7 | meta |
| 8 | lore |

## Strict Model Loading

Loading performs the following steps:

1. Read the safetensors checkpoint once on CPU.
2. Split `backbone.*` tensors from the projection-head tensors.
3. Normalize the known Hugging Face-style backbone wrappers and layer-scale
   names, while dropping only recomputable RoPE buffers.
4. Construct the fixed DINOv3 ViT-H/16+ backbone.
5. Infer one of the explicitly supported projection-head layouts from tensor
   shapes: a dense linear head or a two-matrix low-rank head.
6. Strictly load both components, rejecting missing, unexpected, or
   shape-incompatible tensors.
7. Move the backbone to the selected device and configured dtype, BF16 by
   default, while keeping the projection head in FP32.
8. Put the complete model in evaluation mode.

Unsupported checkpoint extensions, missing head weights, ambiguous head
layouts, and strict-load failures stop before dataset captioning. Error messages
name the failed component and configured path.

## Image and Inference Data Flow

For each image:

1. Decode with Pillow and convert to RGB.
2. Preserve aspect ratio while capping the long edge at `max_res`.
3. Snap both dimensions down to positive multiples of the 16-pixel patch size.
4. Convert to float and apply ImageNet mean and standard-deviation
   normalization.
5. Run the backbone under inference mode and the selected device autocast.
6. Concatenate the CLS and four register-token features.
7. Run the FP32 projection head and apply sigmoid to produce tag confidences.
8. Mask out disabled categories before selecting results.

Selection behaves as follows:

- In `threshold` mode, return every enabled-category tag with score greater
  than or equal to `threshold`.
- In `top_k` mode, return the highest-scoring `top_k` tags among enabled
  categories.
- Sort final results by descending confidence with vocabulary index as the
  deterministic tie breaker.

Only tag text is saved; confidence scores are not written into captions.
Threshold mode is allowed to produce an empty caption and logs that outcome
without failing the rest of the job.

## Output Formatting

The default output is a comma-and-space-separated list of readable vocabulary
tags. Formatting is applied after selection:

1. Replace spaces with underscores when `use_underscores` is enabled.
2. Escape literal parentheses as `\(` and `\)` when `escape_parentheses` is
   enabled.
3. Join tags with `, `.

The existing `caption_extension` controls the adjacent output filename. The
existing `recaption` behavior determines whether nonempty captions are
preserved or regenerated.

## User Interface

Add **DINOv3 Tagger** to the image group in the dataset caption dialog. Its
conditional controls are:

- optional vocabulary path;
- threshold versus top-count selection mode;
- the active threshold or top-count value;
- maximum resolution;
- ten category toggles;
- use underscores; and
- escape parentheses.

General, character, and species/meta are enabled by default. All other
categories are disabled by default, but every category remains user-selectable.
Saved, edited, and cloned DINOv3 caption jobs preserve these fields. Changing to
another captioner removes DINOv3-only settings, while changing back applies the
portable defaults without inserting personal paths.

## Error Handling

Model-level failures stop the job before captioning and identify the component
and path. This includes:

- blank, missing, non-file, or unsupported checkpoint paths;
- blank, missing, ambiguous, non-file, or invalid vocabulary paths;
- malformed vocabulary schemas;
- vocabulary/head-size mismatches;
- missing or unexpected checkpoint key groups;
- unsupported projection-head layouts; and
- missing, unexpected, or shape-incompatible tensors.

Image decoding and per-image inference failures include the image path, are
logged, and allow the caption loop to continue. Existing stop handling and final
job status behavior remain unchanged.

## Testing and Verification

Implementation follows test-driven development. Automated coverage will include:

- checkpoint and vocabulary path validation;
- deterministic vocabulary auto-discovery and ambiguity rejection;
- vocabulary schema and head-size validation;
- checkpoint splitting and key normalization;
- dense and low-rank head inference;
- strict missing, unexpected, and shape-mismatch rejection;
- category masking before threshold and top-count selection;
- deterministic ordering;
- threshold and top-count validation;
- readable, underscore, and escaped-parenthesis formatting;
- default configuration and DINOv3-only UI visibility;
- edit/clone persistence and captioner-change cleanup; and
- preservation of existing captioner behavior.

Final integration verification will use the real checkpoint and adjacent
vocabulary on GPU 0, the AMD Radeon RX 7900 XTX. One existing image will be
processed without modifying it and its selected tags compared with the existing
standalone implementation. A copied image in a temporary directory will then be
run through the ai-toolkit caption job to confirm status/progress handling and
the saved caption file. Temporary data will be isolated and safely removed.

## Scope Boundaries

This feature does not add arbitrary external Python-model execution, training
support for the tagger, tag-score sidecars, interactive per-image threshold
editing, aliases/autocomplete, global blacklist or prepend-tag controls, batch
tensor inference, or automatic discovery outside the checkpoint directory.
Those can be considered separately after the core caption-job integration is
proven.
