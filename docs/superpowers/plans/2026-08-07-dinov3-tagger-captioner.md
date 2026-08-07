# DINOv3 Tagger Captioner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native dataset-captioning extension that strictly loads the local DINOv3 ViT-H/16+ tagger and vocabulary, then writes configurable filtered tags as captions.

**Architecture:** Keep vocabulary discovery, validation, category selection, and output formatting in a pure support module. Put the fixed DINOv3 architecture and memory-conscious strict safetensors loader in a model module, wrap both with the existing `BaseCaptioner` lifecycle, and expose only DINO-specific controls through the existing React caption dialog.

**Tech Stack:** Python 3.12, PyTorch, Accelerate, safetensors, Pillow, torchvision v2, unittest, TypeScript, React 19, Next.js 15

---

## File Structure

- Create `extensions_built_in/captioner/dinov3_tagger/support.py`: path and vocabulary validation, category mapping, tag selection, and formatting.
- Create `extensions_built_in/captioner/dinov3_tagger/model.py`: fixed DINOv3 ViT-H/16+ architecture, image preprocessing, supported projection heads, and strict local loading.
- Create `extensions_built_in/captioner/dinov3_tagger/__init__.py`: package exports.
- Create `extensions_built_in/captioner/DINOv3TaggerCaptioner.py`: caption configuration and `BaseCaptioner` integration.
- Modify `extensions_built_in/captioner/__init__.py`: register the new extension.
- Create `testing/test_dinov3_tagger_captioner.py`: zero-download Python unit and integration-boundary tests.
- Create `ui/src/helpers/dinov3TaggerOptions.ts`: frontend category metadata and pure conditional-setting cleanup helpers.
- Modify `ui/src/types.ts`: add optional DINOv3 caption fields.
- Modify `ui/src/helpers/captionOptions.ts`: declare the captioner and its defaults/capabilities.
- Modify `ui/src/helpers/captionJobConfig.ts`: clear unsupported DINOv3 settings during type changes.
- Modify `ui/src/components/CaptionSimpleJob.tsx`: render conditional DINOv3 controls and hide unsupported quantization.
- Create `ui/testing/dinov3TaggerOptions.test.ts`: pure UI defaults/cleanup tests.
- Create `ui/testing/dinov3TaggerTypeChange.test.ts`: direct captioner-change integration regression.
- Create `ui/testing/tsconfig.dinov3TaggerTypeChange.json`: disposable CommonJS compilation config.
- Create `ui/testing/runDinov3TaggerTests.mjs`: safe one-command UI test runner.
- Modify `ui/package.json`: add `test:dinov3-tagger-captioner`.

## Verification Commands

Focused Python tests:

```bash
./.venv/bin/python -m unittest testing.test_dinov3_tagger_captioner -v
```

UI tests:

```bash
cd ui
npm run test:dinov3-tagger-captioner
```

Clean UI type-check without stale `.next` types:

```bash
ui_archive_root="$(mktemp -d)"
test -n "$ui_archive_root" && test -d "$ui_archive_root"
case "$ui_archive_root" in
  /tmp/*) ;;
  *) echo "Unexpected temporary path: $ui_archive_root" >&2; exit 1 ;;
esac
git archive HEAD ui | tar -x -C "$ui_archive_root"
ln -s "$PWD/ui/node_modules" "$ui_archive_root/ui/node_modules"
"$ui_archive_root/ui/node_modules/.bin/tsc" \
  --noEmit --incremental false -p "$ui_archive_root/ui/tsconfig.json"
```

The UI test runner owns and safely removes its `mkdtemp` directory. Do not
recursively remove any caller-supplied path.

### Task 1: Add Vocabulary, Selection, and Formatting Helpers

**Files:**
- Create: `extensions_built_in/captioner/dinov3_tagger/__init__.py`
- Create: `extensions_built_in/captioner/dinov3_tagger/support.py`
- Create: `testing/test_dinov3_tagger_captioner.py`

- [ ] **Step 1: Write failing support tests**

Create `testing/test_dinov3_tagger_captioner.py` with tests using
`tempfile.TemporaryDirectory` and small JSON fixtures:

```python
import json
import tempfile
import unittest
from pathlib import Path

import torch

from extensions_built_in.captioner.dinov3_tagger.support import (
    format_tags,
    load_vocabulary,
    resolve_vocab_path,
    select_tag_indices,
    validate_checkpoint_path,
)


class DINOv3TaggerSupportTest(unittest.TestCase):
    def write_vocab(self, path, tags=None, categories=None):
        tags = tags or ["general tag", "character tag"]
        categories = categories or {"general tag": 0, "character tag": 4}
        path.write_text(
            json.dumps({"idx2tag": tags, "tag2category": categories}),
            encoding="utf-8",
        )

    def test_checkpoint_must_be_an_existing_safetensors_file(self):
        with self.assertRaisesRegex(ValueError, "must not be blank"):
            validate_checkpoint_path(" ")
        with self.assertRaisesRegex(FileNotFoundError, "missing"):
            validate_checkpoint_path("/tmp/missing-dinov3.safetensors")
        with tempfile.NamedTemporaryFile(suffix=".pt") as checkpoint:
            with self.assertRaisesRegex(ValueError, "safetensors"):
                validate_checkpoint_path(checkpoint.name)
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as checkpoint:
            self.assertEqual(
                validate_checkpoint_path(checkpoint.name),
                str(Path(checkpoint.name).resolve()),
            )

    def test_explicit_vocab_path_is_validated(self):
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as checkpoint:
            with self.assertRaisesRegex(FileNotFoundError, "vocabulary.*missing"):
                resolve_vocab_path(checkpoint.name, "/tmp/missing-vocab.json")
            with tempfile.NamedTemporaryFile(suffix=".txt") as vocab:
                with self.assertRaisesRegex(ValueError, "must be JSON"):
                    resolve_vocab_path(checkpoint.name, vocab.name)

    def test_exact_adjacent_vocab_name_wins(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            exact = root / "tagger_vocab_with_categories_and_alias_updated.json"
            fallback = root / "other_vocab.json"
            self.write_vocab(exact)
            self.write_vocab(fallback)
            self.assertEqual(resolve_vocab_path(str(checkpoint), None), str(exact))

    def test_one_fallback_vocab_is_discovered(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            fallback = root / "custom_vocab.json"
            self.write_vocab(fallback)
            self.assertEqual(resolve_vocab_path(str(checkpoint), None), str(fallback))

    def test_zero_or_multiple_vocab_candidates_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            with self.assertRaisesRegex(FileNotFoundError, "configure vocab_path"):
                resolve_vocab_path(str(checkpoint), None)
            self.write_vocab(root / "one_vocab.json")
            self.write_vocab(root / "two_vocab.json")
            with self.assertRaisesRegex(ValueError, "Multiple.*configure vocab_path"):
                resolve_vocab_path(str(checkpoint), None)

    def test_vocab_requires_complete_unique_idx2tag_and_categories(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vocab.json"
            self.write_vocab(path)
            vocabulary = load_vocabulary(str(path))
            self.assertEqual(vocabulary.tags, ("general tag", "character tag"))
            self.assertEqual(vocabulary.categories, ("general", "character"))
            self.write_vocab(path, ["duplicate", "duplicate"], {"duplicate": 0})
            with self.assertRaisesRegex(ValueError, "duplicate"):
                load_vocabulary(str(path))
            self.write_vocab(path, ["known", "missing"], {"known": 0})
            with self.assertRaisesRegex(ValueError, "lacks categories.*missing"):
                load_vocabulary(str(path))

    def test_selection_filters_categories_before_threshold_or_top_k(self):
        scores = torch.tensor([0.90, 0.80, 0.70, 0.60])
        categories = ["general", "artist", "character", "species_meta"]
        included = {"general", "character", "species_meta"}
        self.assertEqual(
            select_tag_indices(
                scores,
                categories,
                included_categories=included,
                mode="threshold",
                threshold=0.65,
                top_k=30,
            ),
            [0, 2],
        )
        self.assertEqual(
            select_tag_indices(
                scores,
                categories,
                included_categories=included,
                mode="top_k",
                threshold=0.5,
                top_k=2,
            ),
            [0, 2],
        )

    def test_equal_scores_use_vocab_index_as_tie_breaker(self):
        self.assertEqual(
            select_tag_indices(
                torch.tensor([0.8, 0.8, 0.8]),
                ["general"] * 3,
                included_categories={"general"},
                mode="top_k",
                threshold=0.5,
                top_k=3,
            ),
            [0, 1, 2],
        )

    def test_selection_arguments_are_validated(self):
        scores = torch.tensor([0.5])
        kwargs = {
            "categories": ["general"],
            "included_categories": {"general"},
            "mode": "threshold",
            "threshold": 0.5,
            "top_k": 30,
        }
        with self.assertRaisesRegex(ValueError, "between 0 and 1"):
            select_tag_indices(scores, **{**kwargs, "threshold": 1.1})
        with self.assertRaisesRegex(ValueError, "positive"):
            select_tag_indices(scores, **{**kwargs, "top_k": 0})
        with self.assertRaisesRegex(ValueError, "Unknown"):
            select_tag_indices(
                scores, **{**kwargs, "included_categories": {"not-a-category"}}
            )

    def test_tag_formatting_supports_all_approved_modes(self):
        tags = ["looking at viewer", "character (series)"]
        self.assertEqual(
            format_tags(tags, use_underscores=False, escape_parentheses=False),
            "looking at viewer, character (series)",
        )
        self.assertEqual(
            format_tags(tags, use_underscores=True, escape_parentheses=True),
            r"looking_at_viewer, character_\(series\)",
        )
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
./.venv/bin/python -m unittest testing.test_dinov3_tagger_captioner -v
```

Expected: import failure because the `dinov3_tagger` package does not exist.

- [ ] **Step 3: Implement the support module**

Create `support.py` with these public interfaces:

```python
from dataclasses import dataclass
import glob
import json
import os
from typing import Literal

import torch

EXACT_VOCAB_FILENAME = "tagger_vocab_with_categories_and_alias_updated.json"
CATEGORY_NAMES = (
    "unassigned",
    "general",
    "artist",
    "contributor",
    "copyright",
    "character",
    "species_meta",
    "disambiguation",
    "meta",
    "lore",
)
DEFAULT_INCLUDED_CATEGORIES = frozenset(
    {"general", "character", "species_meta"}
)
SOURCE_CATEGORY_NAMES = {
    -1: "unassigned",
    0: "general",
    1: "artist",
    2: "contributor",
    3: "copyright",
    4: "character",
    5: "species_meta",
    6: "disambiguation",
    7: "meta",
    8: "lore",
}


@dataclass(frozen=True)
class TaggerVocabulary:
    path: str
    tags: tuple[str, ...]
    categories: tuple[str, ...]


def validate_checkpoint_path(value: str | None) -> str:
    if value is None or not str(value).strip():
        raise ValueError("DINOv3 tagger checkpoint path must not be blank")
    path = os.path.abspath(os.path.expanduser(str(value)))
    if not os.path.exists(path):
        raise FileNotFoundError(f"DINOv3 tagger checkpoint is missing: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"DINOv3 tagger checkpoint must be a file: {path}")
    if not path.lower().endswith(".safetensors"):
        raise ValueError(
            f"DINOv3 tagger checkpoint must use the .safetensors extension: {path}"
        )
    return path


def resolve_vocab_path(checkpoint_path: str, value: str | None) -> str:
    if value is not None and str(value).strip():
        candidates = [os.path.abspath(os.path.expanduser(str(value)))]
    else:
        directory = os.path.dirname(checkpoint_path)
        exact = os.path.join(directory, EXACT_VOCAB_FILENAME)
        if os.path.isfile(exact):
            candidates = [exact]
        else:
            candidates = sorted(
                path
                for path in glob.glob(os.path.join(directory, "*vocab*.json"))
                if os.path.isfile(path)
            )
    if not candidates:
        raise FileNotFoundError(
            f"No DINOv3 tagger vocabulary found beside checkpoint {checkpoint_path}; "
            "configure vocab_path explicitly"
        )
    if len(candidates) != 1:
        raise ValueError(
            f"Multiple DINOv3 tagger vocabularies found beside checkpoint "
            f"{checkpoint_path}: {', '.join(candidates)}; configure vocab_path explicitly"
        )
    path = candidates[0]
    if not os.path.exists(path):
        raise FileNotFoundError(f"DINOv3 tagger vocabulary is missing: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"DINOv3 tagger vocabulary must be a file: {path}")
    if not path.lower().endswith(".json"):
        raise ValueError(f"DINOv3 tagger vocabulary must be JSON: {path}")
    return path


def load_vocabulary(path: str) -> TaggerVocabulary:
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Failed to read DINOv3 tagger vocabulary {path}: {error}") from error
    tags = data.get("idx2tag")
    category_map = data.get("tag2category")
    if not isinstance(tags, list) or not tags or not all(isinstance(tag, str) for tag in tags):
        raise ValueError(f"DINOv3 tagger vocabulary {path} has invalid idx2tag")
    if len(set(tags)) != len(tags):
        raise ValueError(f"DINOv3 tagger vocabulary {path} contains duplicate idx2tag entries")
    if not isinstance(category_map, dict):
        raise ValueError(f"DINOv3 tagger vocabulary {path} has invalid tag2category")
    missing = [tag for tag in tags if tag not in category_map]
    if missing:
        raise ValueError(
            f"DINOv3 tagger vocabulary {path} lacks categories for: {', '.join(missing[:8])}"
        )
    categories = []
    for tag in tags:
        source_id = category_map[tag]
        if not isinstance(source_id, int):
            raise ValueError(
                f"DINOv3 tagger vocabulary {path} has non-integer category for {tag!r}"
            )
        if source_id not in SOURCE_CATEGORY_NAMES:
            raise ValueError(
                f"DINOv3 tagger vocabulary {path} has unsupported category "
                f"{source_id} for {tag!r}"
            )
        categories.append(SOURCE_CATEGORY_NAMES[source_id])
    return TaggerVocabulary(path, tuple(tags), tuple(categories))


def select_tag_indices(
    scores: torch.Tensor,
    categories: list[str] | tuple[str, ...],
    *,
    included_categories: set[str] | frozenset[str],
    mode: Literal["threshold", "top_k"],
    threshold: float,
    top_k: int,
) -> list[int]:
    if scores.ndim != 1 or scores.numel() != len(categories):
        raise ValueError("Tag scores and vocabulary categories must have matching one-dimensional lengths")
    unknown = set(included_categories) - set(CATEGORY_NAMES)
    if unknown:
        raise ValueError(f"Unknown DINOv3 tag categories: {', '.join(sorted(unknown))}")
    if mode not in {"threshold", "top_k"}:
        raise ValueError(f"Unsupported DINOv3 tag selection mode: {mode}")
    if not 0.0 <= threshold <= 1.0:
        raise ValueError("DINOv3 tag threshold must be between 0 and 1")
    if top_k <= 0:
        raise ValueError("DINOv3 top_k must be positive")
    eligible = torch.tensor(
        [category in included_categories for category in categories],
        dtype=torch.bool,
        device=scores.device,
    )
    if mode == "threshold":
        eligible &= scores >= threshold
    indices = torch.nonzero(eligible, as_tuple=False).flatten()
    if indices.numel() == 0:
        return []
    order = torch.argsort(scores[indices], descending=True, stable=True)
    if mode == "top_k":
        order = order[:top_k]
    return indices[order].cpu().tolist()


def format_tags(
    tags: list[str], *, use_underscores: bool, escape_parentheses: bool
) -> str:
    formatted = []
    for tag in tags:
        if use_underscores:
            tag = tag.replace(" ", "_")
        if escape_parentheses:
            tag = tag.replace("(", r"\(").replace(")", r"\)")
        formatted.append(tag)
    return ", ".join(formatted)
```

Export the public support names from the package `__init__.py`.

- [ ] **Step 4: Run the tests and verify GREEN**

Run the focused Python command. Expected: every support test passes with no
network access.

- [ ] **Step 5: Commit the support layer**

```bash
git add extensions_built_in/captioner/dinov3_tagger testing/test_dinov3_tagger_captioner.py
git commit -m "feat: add DINOv3 tagger caption helpers"
```

### Task 2: Add the Fixed Architecture and Strict Local Loader

**Files:**
- Create: `extensions_built_in/captioner/dinov3_tagger/model.py`
- Modify: `extensions_built_in/captioner/dinov3_tagger/__init__.py`
- Modify: `testing/test_dinov3_tagger_captioner.py`

- [ ] **Step 1: Add failing model-loader tests**

Extend the test module with these imports and executable cases:

```python
from unittest.mock import Mock, patch

from PIL import Image

from extensions_built_in.captioner.dinov3_tagger.model import (
    FEATURE_DIM,
    build_projection_head,
    load_tagger_model,
    preprocess_image,
    split_checkpoint_state_dict,
    strict_assign,
)


class DINOv3TaggerModelTest(unittest.TestCase):
    def test_split_normalizes_backbone_keys_and_keeps_dense_head(self):
        backbone, head = split_checkpoint_state_dict(
            {
                "backbone.model.layer.0.layer_scale1.lambda1": torch.ones(2),
                "backbone.embeddings.patch_embeddings.weight": torch.ones(2, 3, 1, 1),
                "backbone.rope_embeddings.buffer": torch.ones(1),
                "projection.weight": torch.ones(3, FEATURE_DIM),
            },
            "/models/tagger.safetensors",
        )
        self.assertEqual(
            set(backbone),
            {"layer.0.layer_scale1", "embeddings.patch_embeddings.weight"},
        )
        self.assertEqual(set(head), {"projection.weight"})

    def test_split_rejects_missing_backbone_or_head(self):
        with self.assertRaisesRegex(ValueError, "backbone.*tagger.safetensors"):
            split_checkpoint_state_dict(
                {"projection.weight": torch.ones(3, FEATURE_DIM)},
                "/models/tagger.safetensors",
            )
        with self.assertRaisesRegex(ValueError, "projection-head.*tagger.safetensors"):
            split_checkpoint_state_dict(
                {"backbone.norm.weight": torch.ones(2)},
                "/models/tagger.safetensors",
            )

    def test_dense_head_is_inferred_from_vocab_and_feature_dimensions(self):
        weight = torch.ones(3, FEATURE_DIM)
        module, remapped = build_projection_head(
            {"projection.weight": weight}, 3, "/models/tagger.safetensors"
        )
        self.assertIsInstance(module, torch.nn.Linear)
        self.assertFalse(module.bias is not None)
        self.assertIs(remapped["weight"], weight)

    def test_low_rank_head_is_inferred_and_remapped(self):
        down = torch.ones(4, FEATURE_DIM)
        up = torch.ones(3, 4)
        module, remapped = build_projection_head(
            {"projection.down.weight": down, "projection.up.weight": up},
            3,
            "/models/tagger.safetensors",
        )
        self.assertEqual(module.proj_down.out_features, 4)
        self.assertEqual(module.proj_up.out_features, 3)
        self.assertEqual(
            set(remapped), {"proj_down.weight", "proj_up.weight"}
        )

    def test_head_rejects_unknown_extra_keys_and_vocab_mismatch(self):
        with self.assertRaisesRegex(ValueError, "output.*vocabulary.*tagger.safetensors"):
            build_projection_head(
                {"projection.weight": torch.ones(4, FEATURE_DIM)},
                3,
                "/models/tagger.safetensors",
            )
        with self.assertRaisesRegex(ValueError, "extra.*projection.extra"):
            build_projection_head(
                {
                    "projection.weight": torch.ones(3, FEATURE_DIM),
                    "projection.extra": torch.ones(1),
                },
                3,
                "/models/tagger.safetensors",
            )

    def test_strict_assign_wraps_incompatibility_with_path(self):
        model = Mock()
        model.load_state_dict.side_effect = RuntimeError("size mismatch")
        with self.assertRaisesRegex(
            ValueError, "DINOv3 backbone.*tagger.safetensors.*size mismatch"
        ):
            strict_assign(
                model,
                {},
                "DINOv3 backbone",
                "/models/tagger.safetensors",
            )
        model.load_state_dict.assert_called_once_with({}, strict=True, assign=True)

    def test_preprocess_preserves_aspect_and_snaps_to_patch_size(self):
        image = Image.new("RGB", (1000, 500), color="white")
        tensor = preprocess_image(image, max_res=512)
        self.assertEqual(tuple(tensor.shape), (1, 3, 256, 512))
        self.assertEqual(tensor.dtype, torch.float32)

    @patch("extensions_built_in.captioner.dinov3_tagger.model.DINOv3TaggerModel")
    @patch("extensions_built_in.captioner.dinov3_tagger.model.build_projection_head")
    @patch("extensions_built_in.captioner.dinov3_tagger.model.load_file")
    def test_loader_reads_once_and_strictly_assigns_both_components(
        self, load_file, build_head, model_class
    ):
        checkpoint_state = {
            "backbone.norm.weight": torch.ones(2),
            "projection.weight": torch.ones(3, FEATURE_DIM),
        }
        load_file.return_value = checkpoint_state
        head = Mock()
        remapped_head = {"weight": checkpoint_state["projection.weight"]}
        build_head.return_value = (head, remapped_head)
        model = Mock()
        model.backbone = Mock()
        model.head = head
        model_class.return_value = model

        with patch(
            "extensions_built_in.captioner.dinov3_tagger.model.strict_assign",
            side_effect=lambda component, *_args: component,
        ) as assign:
            result = load_tagger_model(
                "/models/tagger.safetensors",
                3,
                device=torch.device("cpu"),
                dtype=torch.bfloat16,
            )

        self.assertIs(result, model)
        load_file.assert_called_once_with("/models/tagger.safetensors", device="cpu")
        self.assertEqual(assign.call_count, 2)
        model.backbone.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.bfloat16
        )
        model.head.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.float32
        )
        model.eval.assert_called_once_with()
```

Mock `safetensors.torch.load_file` for loader tests. Patch the architecture
factory with a tiny meta-initialized module for strictness tests; do not allocate
the 32-layer production model in routine unit tests.

- [ ] **Step 2: Run model tests and verify RED**

Run:

```bash
./.venv/bin/python -m unittest \
  testing.test_dinov3_tagger_captioner.DINOv3TaggerModelTest -v
```

Expected: import failures for the model interfaces.

- [ ] **Step 3: Implement the DINOv3 architecture**

In `model.py`, define the exact constants:

```python
D_MODEL = 1280
N_HEADS = 20
HEAD_DIM = 64
N_LAYERS = 32
D_FFN = 5120
N_REGISTERS = 4
PATCH_SIZE = 16
ROPE_THETA = 100.0
ROPE_RESCALE = 2.0
LN_EPS = 1e-5
FEATURE_DIM = 6400
```

Implement these focused modules using standard `torch.nn` operations:

```python
class DINOv3Embeddings(nn.Module):
    def __init__(self):
        super().__init__()
        self.cls_token = nn.Parameter(torch.zeros(1, 1, D_MODEL))
        self.mask_token = nn.Parameter(torch.zeros(1, 1, D_MODEL))
        self.register_tokens = nn.Parameter(torch.zeros(1, N_REGISTERS, D_MODEL))
        self.patch_embeddings = nn.Conv2d(
            3, D_MODEL, kernel_size=PATCH_SIZE, stride=PATCH_SIZE
        )

    def forward(self, pixel_values):
        batch = pixel_values.shape[0]
        dtype = self.patch_embeddings.weight.dtype
        patches = self.patch_embeddings(pixel_values.to(dtype)).flatten(2).transpose(1, 2)
        cls = self.cls_token.expand(batch, -1, -1)
        registers = self.register_tokens.expand(batch, -1, -1)
        return torch.cat((cls, registers, patches), dim=1)


class DINOv3Attention(nn.Module):
    def __init__(self):
        super().__init__()
        self.q_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)
        self.k_proj = nn.Linear(D_MODEL, D_MODEL, bias=False)
        self.v_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)
        self.o_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)

    def forward(self, hidden_states, cos, sin):
        batch, sequence, _ = hidden_states.shape
        q = self.q_proj(hidden_states).view(batch, sequence, N_HEADS, HEAD_DIM).transpose(1, 2)
        k = self.k_proj(hidden_states).view(batch, sequence, N_HEADS, HEAD_DIM).transpose(1, 2)
        v = self.v_proj(hidden_states).view(batch, sequence, N_HEADS, HEAD_DIM).transpose(1, 2)
        q, k = apply_rope(q, k, cos, sin)
        result = F.scaled_dot_product_attention(q, k, v, scale=HEAD_DIM ** -0.5)
        return self.o_proj(result.transpose(1, 2).reshape(batch, sequence, D_MODEL))


class DINOv3MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.gate_proj = nn.Linear(D_MODEL, D_FFN, bias=True)
        self.up_proj = nn.Linear(D_MODEL, D_FFN, bias=True)
        self.down_proj = nn.Linear(D_FFN, D_MODEL, bias=True)

    def forward(self, hidden_states):
        return self.down_proj(F.silu(self.gate_proj(hidden_states)) * self.up_proj(hidden_states))


class DINOv3Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.norm1 = nn.LayerNorm(D_MODEL, eps=LN_EPS)
        self.attention = DINOv3Attention()
        self.layer_scale1 = nn.Parameter(torch.ones(D_MODEL))
        self.norm2 = nn.LayerNorm(D_MODEL, eps=LN_EPS)
        self.mlp = DINOv3MLP()
        self.layer_scale2 = nn.Parameter(torch.ones(D_MODEL))

    def forward(self, hidden_states, cos, sin):
        hidden_states = hidden_states + self.attention(self.norm1(hidden_states), cos, sin) * self.layer_scale1
        return hidden_states + self.mlp(self.norm2(hidden_states)) * self.layer_scale2


class DINOv3Backbone(nn.Module):
    def __init__(self):
        super().__init__()
        self.embeddings = DINOv3Embeddings()
        self.layer = nn.ModuleList(DINOv3Block() for _ in range(N_LAYERS))
        self.norm = nn.LayerNorm(D_MODEL, eps=LN_EPS)

    def forward(self, pixel_values):
        height_patches = pixel_values.shape[-2] // PATCH_SIZE
        width_patches = pixel_values.shape[-1] // PATCH_SIZE
        hidden_states = self.embeddings(pixel_values)
        cos, sin = build_rope(
            height_patches, width_patches, hidden_states.dtype, pixel_values.device
        )
        for block in self.layer:
            hidden_states = block(hidden_states, cos, sin)
        return self.norm(hidden_states)


class DINOv3TaggerModel(nn.Module):
    def __init__(self, head):
        super().__init__()
        self.backbone = DINOv3Backbone()
        self.head = head

    def forward(self, pixel_values):
        hidden_states = self.backbone(pixel_values)
        cls = hidden_states[:, 0]
        registers = hidden_states[:, 1 : 1 + N_REGISTERS].flatten(1)
        return self.head(torch.cat((cls, registers), dim=-1).float())
```

Implement cached two-dimensional patch coordinates and RoPE exactly over patch
tokens while leaving CLS/register tokens unrotated:

```python
@lru_cache(maxsize=32)
def patch_coordinates(height: int, width: int, device_string: str):
    device = torch.device(device_string)
    y = torch.arange(0.5, height, dtype=torch.float32, device=device) / height
    x = torch.arange(0.5, width, dtype=torch.float32, device=device) / width
    coordinates = torch.stack(
        torch.meshgrid(y, x, indexing="ij"), dim=-1
    ).flatten(0, 1)
    return (2.0 * coordinates - 1.0) * ROPE_RESCALE


def build_rope(height: int, width: int, dtype, device):
    coordinates = patch_coordinates(height, width, str(device))
    inverse_frequency = 1.0 / (
        ROPE_THETA ** torch.arange(
            0, 1, 4 / HEAD_DIM, dtype=torch.float32, device=device
        )
    )
    angles = 2 * math.pi * coordinates[:, :, None] * inverse_frequency[None, None]
    angles = angles.flatten(1, 2).tile(2)
    return (
        torch.cos(angles).to(dtype).unsqueeze(0).unsqueeze(0),
        torch.sin(angles).to(dtype).unsqueeze(0).unsqueeze(0),
    )


def rotate_half(tensor):
    half = tensor.shape[-1] // 2
    return torch.cat((-tensor[..., half:], tensor[..., :half]), dim=-1)


def apply_rope(query, key, cos, sin):
    prefix = 1 + N_REGISTERS
    query_prefix, query_patches = query[..., :prefix, :], query[..., prefix:, :]
    key_prefix, key_patches = key[..., :prefix, :], key[..., prefix:, :]
    query_patches = query_patches * cos + rotate_half(query_patches) * sin
    key_patches = key_patches * cos + rotate_half(key_patches) * sin
    return (
        torch.cat((query_prefix, query_patches), dim=-2),
        torch.cat((key_prefix, key_patches), dim=-2),
    )
```

- [ ] **Step 4: Implement state normalization and supported heads**

Add:

```python
def split_checkpoint_state_dict(state_dict, checkpoint_path):
    backbone = {}
    head = {}
    for key, value in state_dict.items():
        if key.startswith("backbone."):
            normalized = key.removeprefix("backbone.")
            if normalized.startswith("model.layer."):
                normalized = normalized.removeprefix("model.")
            if normalized.endswith(".lambda1") and ".layer_scale" in normalized:
                normalized = normalized.removesuffix(".lambda1")
            if "rope_embeddings" not in normalized:
                if normalized in backbone:
                    raise ValueError(
                        f"Duplicate normalized DINOv3 backbone key in {checkpoint_path}: {normalized}"
                    )
                backbone[normalized] = value
        else:
            head[key] = value
    if not backbone:
        raise ValueError(f"DINOv3 checkpoint {checkpoint_path} contains no backbone weights")
    if not head:
        raise ValueError(f"DINOv3 checkpoint {checkpoint_path} contains no projection-head weights")
    return backbone, head
```

Implement `build_projection_head(head_state, vocab_size, checkpoint_path)` for
exactly two layouts:

- Dense: one weight shaped `[vocab_size, FEATURE_DIM]` and its optional matching
  bias, with no extra keys.
- Low-rank: one weight `[rank, FEATURE_DIM]`, one weight `[vocab_size, rank]`,
  and their optional matching biases, with equal inner rank and no extra keys.

Return both the constructed module and a remapped state dictionary matching the
module's keys. Reject zero/multiple candidates and all unknown extra keys with
checkpoint context.

Use this concrete low-rank module and candidate logic:

```python
class LowRankHead(nn.Module):
    def __init__(self, rank, vocab_size, down_bias, up_bias):
        super().__init__()
        self.proj_down = nn.Linear(FEATURE_DIM, rank, bias=down_bias)
        self.proj_up = nn.Linear(rank, vocab_size, bias=up_bias)

    def forward(self, features):
        return self.proj_up(self.proj_down(features))


def build_projection_head(head_state, vocab_size, checkpoint_path):
    weights = [
        (key, value)
        for key, value in head_state.items()
        if key.endswith(".weight") and value.ndim == 2
    ]
    dense = [
        (key, value)
        for key, value in weights
        if tuple(value.shape) == (vocab_size, FEATURE_DIM)
    ]
    if len(dense) == 1:
        weight_key, weight = dense[0]
        bias_key = weight_key.removesuffix(".weight") + ".bias"
        expected = {weight_key}
        remapped = {"weight": weight}
        if bias_key in head_state:
            expected.add(bias_key)
            remapped["bias"] = head_state[bias_key]
        extra = set(head_state) - expected
        if extra:
            raise ValueError(
                f"DINOv3 checkpoint {checkpoint_path} has extra projection keys: "
                f"{', '.join(sorted(extra))}"
            )
        return nn.Linear(
            FEATURE_DIM, vocab_size, bias=bias_key in head_state
        ), remapped

    down = [item for item in weights if item[1].shape[1] == FEATURE_DIM]
    up = [item for item in weights if item[1].shape[0] == vocab_size]
    if len(down) != 1 or len(up) != 1:
        shapes = ", ".join(f"{key}={tuple(value.shape)}" for key, value in weights)
        raise ValueError(
            f"Could not infer DINOv3 projection head from {checkpoint_path}: {shapes}"
        )
    down_key, down_weight = down[0]
    up_key, up_weight = up[0]
    if down_weight.shape[0] != up_weight.shape[1]:
        raise ValueError(
            f"DINOv3 low-rank projection dimensions disagree in {checkpoint_path}"
        )
    down_bias_key = down_key.removesuffix(".weight") + ".bias"
    up_bias_key = up_key.removesuffix(".weight") + ".bias"
    expected = {down_key, up_key}
    remapped = {
        "proj_down.weight": down_weight,
        "proj_up.weight": up_weight,
    }
    if down_bias_key in head_state:
        expected.add(down_bias_key)
        remapped["proj_down.bias"] = head_state[down_bias_key]
    if up_bias_key in head_state:
        expected.add(up_bias_key)
        remapped["proj_up.bias"] = head_state[up_bias_key]
    extra = set(head_state) - expected
    if extra:
        raise ValueError(
            f"DINOv3 checkpoint {checkpoint_path} has extra projection keys: "
            f"{', '.join(sorted(extra))}"
        )
    return LowRankHead(
        down_weight.shape[0],
        vocab_size,
        down_bias_key in head_state,
        up_bias_key in head_state,
    ), remapped
```

Before candidate selection, explicitly reject any two-dimensional output weight
whose first dimension differs from `vocab_size` when it otherwise has
`FEATURE_DIM` input features; this produces the vocabulary/head-size error
asserted by the tests rather than the generic unsupported-layout error.

- [ ] **Step 5: Implement memory-conscious strict loading**

Use `accelerate.init_empty_weights()` and assignment loading:

```python
def strict_assign(model, state_dict, component, checkpoint_path):
    try:
        model.load_state_dict(state_dict, strict=True, assign=True)
    except RuntimeError as error:
        raise ValueError(
            f"Failed to load {component} from {checkpoint_path}: {error}"
        ) from error
    meta = [name for name, parameter in model.named_parameters() if parameter.is_meta]
    if meta:
        raise ValueError(
            f"Failed to load {component} from {checkpoint_path}; meta parameters remain: "
            f"{', '.join(meta[:8])}"
        )
    return model


def load_tagger_model(checkpoint_path, vocab_size, *, device, dtype):
    try:
        state_dict = load_file(checkpoint_path, device="cpu")
    except Exception as error:
        raise ValueError(
            f"Failed to read DINOv3 tagger checkpoint {checkpoint_path}: {error}"
        ) from error
    backbone_state, head_state = split_checkpoint_state_dict(
        state_dict, checkpoint_path
    )
    del state_dict
    with init_empty_weights():
        head, remapped_head_state = build_projection_head(
            head_state, vocab_size, checkpoint_path
        )
        model = DINOv3TaggerModel(head)
    del head_state
    for key in tuple(backbone_state):
        value = backbone_state[key]
        if value.is_floating_point() and value.dtype != dtype:
            backbone_state[key] = value.to(dtype=dtype)
    strict_assign(model.backbone, backbone_state, "DINOv3 backbone", checkpoint_path)
    del backbone_state
    strict_assign(model.head, remapped_head_state, "DINOv3 projection head", checkpoint_path)
    del remapped_head_state
    model.backbone.to(device=device, dtype=dtype)
    model.head.to(device=device, dtype=torch.float32)
    model.eval()
    return model
```

Keep the head FP32 and do not apply Quanto quantization in this feature.

- [ ] **Step 6: Implement image preprocessing**

Add `preprocess_image(image, max_res)` that accepts a path or PIL image and
returns `[1, 3, H, W]`:

```python
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def snap_dimension(value):
    return max(PATCH_SIZE, (value // PATCH_SIZE) * PATCH_SIZE)


def preprocess_image(source, max_res):
    if isinstance(source, Image.Image):
        image = source.convert("RGB")
    else:
        image = Image.open(source).convert("RGB")
    width, height = image.size
    scale = min(1.0, max_res / max(width, height))
    new_width = snap_dimension(round(width * scale))
    new_height = snap_dimension(round(height * scale))
    transform = v2.Compose(
        [
            v2.Resize(
                (new_height, new_width),
                interpolation=v2.InterpolationMode.LANCZOS,
            ),
            v2.ToImage(),
            v2.ToDtype(torch.float32, scale=True),
            v2.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )
    return transform(image).unsqueeze(0)
```

- [ ] **Step 7: Run model tests and verify GREEN**

Run the focused test file and `python -m compileall` over the new package.
Expected: all tests pass, no production-sized allocation occurs in unit tests,
and `git diff --check` is clean.

- [ ] **Step 8: Commit the strict model loader**

```bash
git add extensions_built_in/captioner/dinov3_tagger testing/test_dinov3_tagger_captioner.py
git commit -m "feat: load local DINOv3 tagger checkpoints"
```

### Task 3: Integrate the Tagger with Caption Jobs

**Files:**
- Create: `extensions_built_in/captioner/DINOv3TaggerCaptioner.py`
- Modify: `extensions_built_in/captioner/__init__.py`
- Modify: `testing/test_dinov3_tagger_captioner.py`

- [ ] **Step 1: Write failing captioner integration tests**

Add mocked tests that construct the captioner without its heavyweight base
initialization:

```python
from extensions_built_in.captioner.DINOv3TaggerCaptioner import (
    DINOv3TaggerCaptioner,
    DINOv3TaggerConfig,
)
from extensions_built_in.captioner.dinov3_tagger.support import TaggerVocabulary


class DINOv3TaggerCaptionerTest(unittest.TestCase):
    def base_config(self, **overrides):
        values = {
            "model_name_or_path": "/models/tagger.safetensors",
            "extensions": ["png"],
            "path_to_caption": "/dataset",
        }
        values.update(overrides)
        return values

    def test_config_defaults_match_approved_design(self):
        config = DINOv3TaggerConfig(**self.base_config())
        self.assertEqual(config.selection_mode, "threshold")
        self.assertEqual(config.threshold, 0.5)
        self.assertEqual(config.top_k, 30)
        self.assertEqual(
            set(config.included_categories),
            {"general", "character", "species_meta"},
        )
        self.assertFalse(config.use_underscores)
        self.assertFalse(config.escape_parentheses)
        self.assertEqual(config.max_res, 1024)

    def test_config_rejects_invalid_selection_values(self):
        for overrides, message in (
            ({"selection_mode": "other"}, "selection_mode"),
            ({"threshold": 1.1}, "threshold"),
            ({"top_k": 0}, "top_k"),
            ({"max_res": 8}, "max_res"),
            ({"included_categories": ["unknown"]}, "Unknown"),
        ):
            with self.subTest(overrides=overrides):
                with self.assertRaisesRegex(ValueError, message):
                    DINOv3TaggerConfig(**self.base_config(**overrides))

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.load_tagger_model")
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.load_vocabulary")
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.resolve_vocab_path")
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.validate_checkpoint_path")
    def test_load_model_validates_before_model_construction(
        self, validate_checkpoint, resolve_vocab, load_vocab, load_model
    ):
        validate_checkpoint.return_value = "/validated/tagger.safetensors"
        resolve_vocab.return_value = "/validated/vocab.json"
        vocabulary = TaggerVocabulary(
            "/validated/vocab.json", ("tag",), ("general",)
        )
        load_vocab.return_value = vocabulary
        loaded_model = Mock()
        load_model.return_value = loaded_model
        captioner = object.__new__(DINOv3TaggerCaptioner)
        captioner.caption_config = DINOv3TaggerConfig(**self.base_config())
        captioner.device_torch = torch.device("cpu")
        captioner.torch_dtype = torch.bfloat16
        captioner.print_and_status_update = Mock()

        captioner.load_model()

        validate_checkpoint.assert_called_once_with("/models/tagger.safetensors")
        resolve_vocab.assert_called_once_with(
            "/validated/tagger.safetensors", None
        )
        load_model.assert_called_once_with(
            "/validated/tagger.safetensors",
            1,
            device=torch.device("cpu"),
            dtype=torch.bfloat16,
        )
        self.assertIs(captioner.model, loaded_model)
        self.assertIs(captioner.vocabulary, vocabulary)

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_get_caption_masks_then_formats(self, preprocess):
        preprocess.return_value = torch.zeros(1, 3, 16, 16)
        captioner = object.__new__(DINOv3TaggerCaptioner)
        captioner.caption_config = DINOv3TaggerConfig(
            **self.base_config(
                selection_mode="threshold",
                threshold=0.5,
                included_categories=["general", "character"],
                use_underscores=True,
                escape_parentheses=True,
            )
        )
        captioner.device_torch = torch.device("cpu")
        captioner.torch_dtype = torch.float32
        captioner.vocabulary = TaggerVocabulary(
            "/vocab.json",
            ("general tag", "artist tag", "character (series)"),
            ("general", "artist", "character"),
        )
        captioner.model = Mock(return_value=torch.tensor([[2.0, 4.0, 1.0]]))

        self.assertEqual(
            captioner.get_caption_for_file("/dataset/image.png"),
            r"general_tag, character_\(series\)",
        )

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_empty_threshold_result_returns_empty_caption(self, preprocess):
        preprocess.return_value = torch.zeros(1, 3, 16, 16)
        captioner = object.__new__(DINOv3TaggerCaptioner)
        captioner.caption_config = DINOv3TaggerConfig(
            **self.base_config(threshold=0.99)
        )
        captioner.device_torch = torch.device("cpu")
        captioner.torch_dtype = torch.float32
        captioner.vocabulary = TaggerVocabulary(
            "/vocab.json", ("tag",), ("general",)
        )
        captioner.model = Mock(return_value=torch.tensor([[-10.0]]))
        self.assertEqual(captioner.get_caption_for_file("/dataset/image.png"), "")

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_per_image_error_includes_image_path(self, preprocess):
        preprocess.side_effect = OSError("decode failed")
        captioner = object.__new__(DINOv3TaggerCaptioner)
        captioner.caption_config = DINOv3TaggerConfig(**self.base_config())
        captioner.device_torch = torch.device("cpu")
        captioner.torch_dtype = torch.float32
        captioner.vocabulary = TaggerVocabulary(
            "/vocab.json", ("tag",), ("general",)
        )
        captioner.model = Mock()
        with self.assertRaisesRegex(
            RuntimeError, "/dataset/broken.png.*decode failed"
        ):
            captioner.get_caption_for_file("/dataset/broken.png")

    def test_extension_registry_exposes_dinov3_tagger_captioner(self):
        from extensions_built_in.captioner import AI_TOOLKIT_EXTENSIONS

        extension = next(
            item for item in AI_TOOLKIT_EXTENSIONS
            if item.uid == "DINOv3TaggerCaptioner"
        )
        self.assertIs(extension.get_process(), DINOv3TaggerCaptioner)
```

- [ ] **Step 2: Run integration tests and verify RED**

Expected: the captioner and registry entry are missing.

- [ ] **Step 3: Implement configuration and captioner**

Create `DINOv3TaggerCaptioner.py`:

```python
from collections import OrderedDict

import torch

from .BaseCaptioner import BaseCaptioner, CaptionConfig
from .dinov3_tagger.model import load_tagger_model, preprocess_image
from .dinov3_tagger.support import (
    CATEGORY_NAMES,
    DEFAULT_INCLUDED_CATEGORIES,
    format_tags,
    load_vocabulary,
    resolve_vocab_path,
    select_tag_indices,
    validate_checkpoint_path,
)


class DINOv3TaggerConfig(CaptionConfig):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.vocab_path = kwargs.get("vocab_path")
        self.selection_mode = kwargs.get("selection_mode", "threshold")
        self.threshold = float(kwargs.get("threshold", 0.50))
        self.top_k = int(kwargs.get("top_k", 30))
        self.included_categories = tuple(
            kwargs.get("included_categories", sorted(DEFAULT_INCLUDED_CATEGORIES))
        )
        self.use_underscores = bool(kwargs.get("use_underscores", False))
        self.escape_parentheses = bool(kwargs.get("escape_parentheses", False))
        self.max_res = int(kwargs.get("max_res", 1024))
        if self.selection_mode not in {"threshold", "top_k"}:
            raise ValueError("selection_mode must be threshold or top_k")
        if not 0.0 <= self.threshold <= 1.0:
            raise ValueError("threshold must be between 0 and 1")
        if self.top_k <= 0:
            raise ValueError("top_k must be positive")
        if self.max_res < 16:
            raise ValueError("max_res must be at least 16")
        unknown = set(self.included_categories) - set(CATEGORY_NAMES)
        if unknown:
            raise ValueError(f"Unknown included_categories: {', '.join(sorted(unknown))}")


class DINOv3TaggerCaptioner(BaseCaptioner):
    caption_config_class = DINOv3TaggerConfig

    def __init__(self, process_id: int, job, config: OrderedDict, **kwargs):
        super().__init__(process_id, job, config, **kwargs)
        self.vocabulary = None

    def load_model(self):
        checkpoint_path = validate_checkpoint_path(
            self.caption_config.model_name_or_path
        )
        vocab_path = resolve_vocab_path(
            checkpoint_path, self.caption_config.vocab_path
        )
        vocabulary = load_vocabulary(vocab_path)
        self.print_and_status_update("Loading DINOv3 tagger model")
        model = load_tagger_model(
            checkpoint_path,
            len(vocabulary.tags),
            device=self.device_torch,
            dtype=self.torch_dtype,
        )
        self.caption_config.model_name_or_path = checkpoint_path
        self.caption_config.vocab_path = vocab_path
        self.vocabulary = vocabulary
        self.model = model

    @torch.inference_mode()
    def get_caption_for_file(self, file_path: str) -> str:
        if self.model is None or self.vocabulary is None:
            raise RuntimeError("DINOv3 tagger model and vocabulary are not loaded")
        try:
            pixel_values = preprocess_image(
                file_path, self.caption_config.max_res
            ).to(self.device_torch)
            autocast_enabled = self.device_torch.type != "cpu" and self.torch_dtype != torch.float32
            with torch.autocast(
                device_type=self.device_torch.type,
                dtype=self.torch_dtype,
                enabled=autocast_enabled,
            ):
                logits = self.model(pixel_values)[0]
            scores = torch.sigmoid(logits.float())
            indices = select_tag_indices(
                scores,
                self.vocabulary.categories,
                included_categories=set(self.caption_config.included_categories),
                mode=self.caption_config.selection_mode,
                threshold=self.caption_config.threshold,
                top_k=self.caption_config.top_k,
            )
            tags = [self.vocabulary.tags[index] for index in indices]
            caption = format_tags(
                tags,
                use_underscores=self.caption_config.use_underscores,
                escape_parentheses=self.caption_config.escape_parentheses,
            )
            if not caption:
                print(f"DINOv3 tagger selected no tags for {file_path}")
            return caption
        except Exception as error:
            raise RuntimeError(
                f"Failed to tag image {file_path}: {error}"
            ) from error
```

Do not call the generic Quanto quantization path. `quantize` must be false in
the DINOv3 defaults, and the UI will hide that control for this captioner.

- [ ] **Step 4: Register the extension**

Add:

```python
class DINOv3TaggerCaptionerExtension(Extension):
    uid = "DINOv3TaggerCaptioner"
    name = "DINOv3 Tagger Captioner"

    @classmethod
    def get_process(cls):
        from .DINOv3TaggerCaptioner import DINOv3TaggerCaptioner
        return DINOv3TaggerCaptioner
```

Append it to `AI_TOOLKIT_EXTENSIONS` without changing the other entries.

- [ ] **Step 5: Run captioner tests and verify GREEN**

Run the full focused Python suite. Expected: all support, model, captioner, and
registry tests pass without reading the real 5 GB file.

- [ ] **Step 6: Commit caption-job integration**

```bash
git add extensions_built_in/captioner testing/test_dinov3_tagger_captioner.py
git commit -m "feat: add DINOv3 dataset captioner"
```

### Task 4: Expose DINOv3 Tagger Controls in the Dataset UI

**Files:**
- Create: `ui/src/helpers/dinov3TaggerOptions.ts`
- Modify: `ui/src/types.ts`
- Modify: `ui/src/helpers/captionOptions.ts`
- Modify: `ui/src/helpers/captionJobConfig.ts`
- Modify: `ui/src/components/CaptionSimpleJob.tsx`
- Create: `ui/testing/dinov3TaggerOptions.test.ts`
- Create: `ui/testing/dinov3TaggerTypeChange.test.ts`
- Create: `ui/testing/tsconfig.dinov3TaggerTypeChange.json`
- Create: `ui/testing/runDinov3TaggerTests.mjs`
- Modify: `ui/package.json`

- [ ] **Step 1: Write failing pure UI tests**

Create `ui/testing/dinov3TaggerOptions.test.ts`:

```typescript
import assert from 'node:assert/strict';
import {
  DEFAULT_DINOV3_INCLUDED_CATEGORIES,
  normalizeThreshold,
  normalizeTopK,
  toggleCategory,
} from '../src/helpers/dinov3TaggerOptions';

assert.deepEqual(DEFAULT_DINOV3_INCLUDED_CATEGORIES, [
  'general',
  'character',
  'species_meta',
]);
assert.equal(normalizeThreshold('0.50'), 0.5);
assert.equal(normalizeTopK('30'), 30);
assert.throws(() => normalizeThreshold('1.1'));
assert.throws(() => normalizeTopK('0'));
const original = ['general'];
assert.deepEqual(toggleCategory(original, 'character', true), ['general', 'character']);
assert.deepEqual(toggleCategory(original, 'general', false), []);
assert.deepEqual(original, ['general']);

console.log('DINOv3 tagger option tests passed');
```

Create `ui/testing/dinov3TaggerTypeChange.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { CaptionJobConfig } from '../src/types';
import { handleCaptionerTypeChange } from '../src/helpers/captionJobConfig';

const config = {
  config: {
    process: [{
      type: 'DINOv3TaggerCaptioner',
      device: 'cuda',
      caption: {
        model_name_or_path: '/models/tagger.safetensors',
        vocab_path: '/models/vocab.json',
        selection_mode: 'threshold',
        threshold: 0.5,
        top_k: 30,
        included_categories: ['general', 'character', 'species_meta'],
        use_underscores: false,
        escape_parentheses: false,
        max_res: 1024,
        dtype: 'bf16',
        quantize: false,
        qtype: 'float8',
        low_vram: false,
        extensions: ['png'],
        path_to_caption: '/dataset',
        recaption: true,
        caption_extension: 'txt',
      },
    }],
  },
} as unknown as CaptionJobConfig;

const updates: Array<[string, unknown]> = [];
handleCaptionerTypeChange(
  'DINOv3TaggerCaptioner',
  'Qwen3VLCaptioner',
  config,
  (value, key) => updates.push([key, value]),
);
for (const key of [
  'vocab_path',
  'selection_mode',
  'threshold',
  'top_k',
  'included_categories',
  'use_underscores',
  'escape_parentheses',
]) {
  assert.ok(
    updates.some(([path, value]) =>
      path === `config.process[0].caption.${key}` && value === undefined
    ),
    `${key} was not cleared`,
  );
}
assert.ok(updates.some(([key, value]) =>
  key === 'config.process[0].caption.model_name_or_path' &&
  value === 'Qwen/Qwen3-VL-8B-Instruct'
));

const entering: Array<[string, unknown]> = [];
handleCaptionerTypeChange(
  'Qwen3VLCaptioner',
  'DINOv3TaggerCaptioner',
  config,
  (value, key) => entering.push([key, value]),
);
assert.ok(entering.some(([key, value]) =>
  key === 'config.process[0].caption.model_name_or_path' && value === ''
));
assert.ok(entering.some(([key, value]) =>
  key === 'config.process[0].caption.vocab_path' && value === undefined
));
assert.ok(!entering.some(([, value]) =>
  typeof value === 'string' && value.includes('/run/media/john/')
));

console.log('DINOv3 tagger type-change tests passed');
```

- [ ] **Step 2: Run UI tests and verify RED**

Create the npm script first pointing at the not-yet-existing runner:

```json
"test:dinov3-tagger-captioner": "node testing/runDinov3TaggerTests.mjs"
```

Run it. Expected: failure because the helper/runner and captioner metadata do
not yet exist.

- [ ] **Step 3: Add frontend types and pure helpers**

Extend the caption config type with:

```typescript
vocab_path?: string;
selection_mode?: 'threshold' | 'top_k';
threshold?: number;
top_k?: number;
included_categories?: string[];
use_underscores?: boolean;
escape_parentheses?: boolean;
```

Create `dinov3TaggerOptions.ts`:

```typescript
export const DINOV3_CATEGORIES = [
  ['unassigned', 'Unassigned'],
  ['general', 'General'],
  ['artist', 'Artist'],
  ['contributor', 'Contributor'],
  ['copyright', 'Copyright'],
  ['character', 'Character'],
  ['species_meta', 'Species / Meta'],
  ['disambiguation', 'Disambiguation'],
  ['meta', 'Meta'],
  ['lore', 'Lore'],
] as const;

export const DEFAULT_DINOV3_INCLUDED_CATEGORIES = [
  'general',
  'character',
  'species_meta',
];

export function normalizeThreshold(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('Confidence threshold must be between 0 and 1');
  }
  return parsed;
}

export function normalizeTopK(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Top count must be a positive integer');
  }
  return parsed;
}

export function toggleCategory(
  categories: string[], category: string, enabled: boolean,
): string[] {
  if (enabled) {
    return categories.includes(category) ? [...categories] : [...categories, category];
  }
  return categories.filter(value => value !== category);
}
```

- [ ] **Step 4: Declare captioner metadata and portable defaults**

Expand `AdditionalSections` for each new conditional control and add
`supportsQuantization?: boolean` plus `supportsLowVram?: boolean` to
`CaptionOption`, both defaulting to true when omitted. Add:

```typescript
{
  name: 'DINOv3TaggerCaptioner',
  label: 'DINOv3 Tagger',
  group: 'image',
  supportsQuantization: false,
  supportsLowVram: false,
  defaults: {
    'config.process[0].caption.model_name_or_path': ['', defaultNameOrPath],
    'config.process[0].caption.vocab_path': [undefined, undefined],
    'config.process[0].caption.extensions': [extensionsImage, defaultExtensions],
    'config.process[0].caption.quantize': [false, undefined],
    'config.process[0].caption.low_vram': [false, undefined],
    'config.process[0].caption.selection_mode': ['threshold', undefined],
    'config.process[0].caption.threshold': [0.5, undefined],
    'config.process[0].caption.top_k': [30, undefined],
    'config.process[0].caption.included_categories': [
      [...DEFAULT_DINOV3_INCLUDED_CATEGORIES],
      undefined,
    ],
    'config.process[0].caption.use_underscores': [false, undefined],
    'config.process[0].caption.escape_parentheses': [false, undefined],
    'config.process[0].caption.max_res': [1024, undefined],
  },
  additionalSections: [
    'caption.vocab_path',
    'caption.selection_mode',
    'caption.threshold_or_top_k',
    'caption.max_res',
    'caption.included_categories',
    'caption.tag_formatting',
  ],
}
```

Ensure type changes clone array defaults before passing them to `setJobConfig`
and clear every DINO-only field when leaving the captioner. Do not mutate the
constant category array.

Use this helper for both the previous-type reset loop and new-type default loop:

```typescript
const copyCaptionDefault = (value: unknown) =>
  Array.isArray(value) ? [...value] : value;

for (const key in currentDefaults) {
  setJobConfig(copyCaptionDefault(currentDefaults[key][1]), key);
}
for (const key in newDefaults) {
  setJobConfig(copyCaptionDefault(newDefaults[key][0]), key);
}
```

- [ ] **Step 5: Render conditional controls**

In `CaptionSimpleJob.tsx`:

- render **Vocabulary Path (optional)** with `CreatableSelectInput`;
- render a `threshold`/`top_k` selection-mode dropdown;
- render only the active numeric field;
- render ten category checkboxes using immutable array updates;
- render **Use underscores** and **Escape parentheses** checkboxes;
- keep max resolution visible with 1024 available in `maxResOptions`; and
- hide the Quantize selector when `supportsQuantization === false`.

Path input handlers must preserve nonblank whitespace-containing paths verbatim
and map only all-whitespace values to `undefined`.

Import `NumberInput`, `DINOV3_CATEGORIES`, and `toggleCategory`, then use these
concrete controlled values and handlers:

```tsx
{additionalSections.includes('caption.vocab_path') && (
  <CreatableSelectInput
    label="Vocabulary Path (optional)"
    value={jobConfig.config.process[0].caption.vocab_path || ''}
    onChange={value => setJobConfig(
      value && value.trim() ? value : undefined,
      'config.process[0].caption.vocab_path',
    )}
    options={[]}
  />
)}

{additionalSections.includes('caption.selection_mode') && (
  <SelectInput
    label="Tag Selection"
    value={jobConfig.config.process[0].caption.selection_mode || 'threshold'}
    onChange={value => setJobConfig(
      value,
      'config.process[0].caption.selection_mode',
    )}
    options={[
      { value: 'threshold', label: 'Confidence threshold' },
      { value: 'top_k', label: 'Top count' },
    ]}
  />
)}

{additionalSections.includes('caption.threshold_or_top_k') &&
  jobConfig.config.process[0].caption.selection_mode !== 'top_k' && (
    <NumberInput
      label="Confidence Threshold"
      value={jobConfig.config.process[0].caption.threshold ?? 0.5}
      min={0}
      max={1}
      onChange={value => value !== null && setJobConfig(
        value,
        'config.process[0].caption.threshold',
      )}
    />
)}

{additionalSections.includes('caption.threshold_or_top_k') &&
  jobConfig.config.process[0].caption.selection_mode === 'top_k' && (
    <NumberInput
      label="Top Tag Count"
      value={jobConfig.config.process[0].caption.top_k ?? 30}
      min={1}
      onChange={value => value !== null && setJobConfig(
        Math.max(1, Math.trunc(value)),
        'config.process[0].caption.top_k',
      )}
    />
)}

{additionalSections.includes('caption.included_categories') && (
  <FormGroup label="Tag Categories">
    {DINOV3_CATEGORIES.map(([value, label]) => (
      <Checkbox
        key={value}
        label={label}
        checked={(jobConfig.config.process[0].caption.included_categories || [])
          .includes(value)}
        onChange={enabled => setJobConfig(
          toggleCategory(
            jobConfig.config.process[0].caption.included_categories || [],
            value,
            enabled,
          ),
          'config.process[0].caption.included_categories',
        )}
      />
    ))}
  </FormGroup>
)}

{additionalSections.includes('caption.tag_formatting') && (
  <FormGroup label="Tag Formatting">
    <Checkbox
      label="Use underscores"
      checked={jobConfig.config.process[0].caption.use_underscores || false}
      onChange={value => setJobConfig(
        value,
        'config.process[0].caption.use_underscores',
      )}
    />
    <Checkbox
      label="Escape parentheses"
      checked={jobConfig.config.process[0].caption.escape_parentheses || false}
      onChange={value => setJobConfig(
        value,
        'config.process[0].caption.escape_parentheses',
      )}
    />
  </FormGroup>
)}
```

Wrap the existing Quantize selector in
`selectedCaptionOption?.supportsQuantization !== false` and the existing Low
VRAM checkbox in `selectedCaptionOption?.supportsLowVram !== false`.

- [ ] **Step 6: Add a safe one-command UI test runner**

Create `ui/testing/runDinov3TaggerTests.mjs` with a validated owned temp
directory and no shell invocation:

```javascript
import {
  existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep,
} from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const prefix = 'ai-toolkit-dinov3-tagger-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
let outputDirectory;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(command)} exited with status ${result.status}`);
  }
}

function assertSafe(directory) {
  const realTemp = realpathSync(tmpdir());
  const realOutput = realpathSync(directory);
  const child = relative(realTemp, realOutput);
  if (
    child === '' || child === '..' || child.startsWith(`..${sep}`) ||
    isAbsolute(child) || !basename(realOutput).startsWith(prefix)
  ) {
    throw new Error(`Refusing unsafe test directory: ${realOutput}`);
  }
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), prefix));
  assertSafe(outputDirectory);
  run(process.execPath, [
    tsc,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'es2020',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir', outputDirectory,
    'src/helpers/dinov3TaggerOptions.ts',
    'testing/dinov3TaggerOptions.test.ts',
  ]);
  run(process.execPath, [
    join(outputDirectory, 'testing', 'dinov3TaggerOptions.test.js'),
  ]);

  run(process.execPath, [
    tsc,
    '--project', 'testing/tsconfig.dinov3TaggerTypeChange.json',
    '--outDir', outputDirectory,
  ]);
  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(aliasScope, { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(join(outputDirectory, 'src', 'helpers'), join(aliasScope, 'helpers'), linkType);
  symlinkSync(join(outputDirectory, 'src', 'utils'), join(aliasScope, 'utils'), linkType);
  const nodePath = [join(uiRoot, 'node_modules'), process.env.NODE_PATH]
    .filter(Boolean)
    .join(delimiter);
  run(process.execPath, [
    join(outputDirectory, 'testing', 'dinov3TaggerTypeChange.test.js'),
  ], { env: { ...process.env, NODE_PATH: nodePath } });
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
```

Create `ui/testing/tsconfig.dinov3TaggerTypeChange.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "allowJs": false,
    "baseUrl": "..",
    "incremental": false,
    "isolatedModules": false,
    "jsx": "react-jsx",
    "module": "commonjs",
    "moduleResolution": "node",
    "noEmit": false,
    "paths": { "@/*": ["src/*"] },
    "rootDir": "..",
    "target": "es2020"
  },
  "include": [
    "../src/helpers/captionJobConfig.ts",
    "dinov3TaggerTypeChange.test.ts"
  ],
  "exclude": ["../.next", "../node_modules"]
}
```

- [ ] **Step 7: Run UI tests, type-check, and production build**

Run:

```bash
cd ui
npm run test:dinov3-tagger-captioner
npm run build
```

Then run the clean archived-source type-check from the verification section.
Expected: both behavior tests pass, the production build exits zero, and the
only tolerated warnings are warnings proven to predate this branch.

- [ ] **Step 8: Commit UI support**

```bash
git add ui/package.json ui/src ui/testing
git commit -m "feat: configure DINOv3 tag captions"
```

### Task 5: Verify the Real Checkpoint and One-Image Caption Job

**Files:**
- No tracked production changes expected.
- Temporary test data must be created beneath `/tmp` and safely removed.

- [ ] **Step 1: Run all automated feature verification**

Run the focused Python tests, UI test command, clean archived type-check,
production UI build, Python compileall, `git diff --check main...HEAD`, and
`git status --short`.

Also run repository-wide unittest discovery and record pre-existing harness or
environment failures separately; do not label a failure pre-existing without
comparing it to the baseline already documented on `main`.

- [ ] **Step 2: Compare real header structure before allocating**

Use `safe_open` to assert:

```text
checkpoint tensors: 616
projection.weight shape: (74625, 6400)
vocabulary tags: 74625
backbone group: nonempty
head group: nonempty
```

Then construct the production backbone under `init_empty_weights()` and compare
normalized keys and shapes against its state dictionary. Expected: zero missing,
unexpected, or mismatched backbone tensors.

- [ ] **Step 3: Run sequential reference and ai-toolkit inference**

Choose one readable existing image from the configured dataset without writing
beside it. Run the external standalone tagger in top-30 mode, record tag names,
then delete it and flush GPU memory before constructing ai-toolkit's captioner.
Run ai-toolkit with all ten categories enabled and top-30 mode. Assert the tag
names and order match exactly. Print device name, peak allocated VRAM, and both
tag lists. Never keep both 5 GB models resident simultaneously.

- [ ] **Step 4: Run an isolated temporary caption job**

Create a `mkdtemp` directory beneath `/tmp`, validate its canonical location,
copy one image into it, and construct a DINOv3 caption job configured with:

```yaml
type: DINOv3TaggerCaptioner
model_name_or_path: /run/media/john/Athalor-1tb-HD/Tagger local V8/tagger_proto.safetensors
vocab_path: null
selection_mode: threshold
threshold: 0.5
top_k: 30
included_categories: [general, character, species_meta]
use_underscores: false
escape_parentheses: false
max_res: 1024
recaption: true
caption_extension: txt
```

Run through `load_model`, `find_files`, and `run_caption_loop` without creating
or mutating a persistent UI database job. Assert the copied image receives a
nonempty `.txt` caption containing only enabled categories. Safely remove only
the validated temporary directory after capturing the result.

- [ ] **Step 5: Confirm final repository state**

Run:

```bash
git status --short
git log --oneline main..HEAD
git diff --check main...HEAD
```

Expected: only intentional commits and no tracked or untracked temporary files.

### Task 6: Final Review and Branch Completion

**Files:**
- Review all changes in `main...HEAD`.

- [ ] **Step 1: Review every approved requirement**

Confirm explicitly:

```text
native code does not import adjacent model-directory Python
checkpoint and vocabulary paths are per-job and portable by default
vocabulary exact-name/fallback/ambiguity behavior is deterministic
backbone and head load strictly with no meta tensors
backbone runs configured dtype and projection head stays FP32
category masking occurs before threshold/top-k selection
defaults are threshold 0.50, top-k 30, and three approved categories
formatting controls preserve readable comma-separated default
existing caption lifecycle and other captioners remain intact
DINO-only UI fields persist for edits/clones and clear on type changes
real output matches the standalone reference on RX 7900 XTX
temporary integration job writes the expected caption safely
```

- [ ] **Step 2: Request final code review**

Use `superpowers:requesting-code-review` against `main...HEAD`. Address every
Critical or Important finding with a RED/GREEN regression cycle, then rerun the
verification commands.

- [ ] **Step 3: Run verification-before-completion**

Use `superpowers:verification-before-completion`. Freshly run the focused Python
suite, UI behavior suite, archived UI type-check, production build, compileall,
diff check, and real one-image verification before stating success.

- [ ] **Step 4: Finish the feature branch**

Use `superpowers:finishing-a-development-branch` and present the four integration
choices only after verification and review gates pass.
