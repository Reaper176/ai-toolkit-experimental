"""Pure helpers for validating and selecting DINOv3 tagger vocabulary tags."""

from dataclasses import dataclass
import glob
import json
import os
from pathlib import Path
from typing import Collection, Literal, Sequence

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
DEFAULT_INCLUDED_CATEGORIES = frozenset({"general", "character", "species_meta"})
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


def _absolute_path(value: str) -> str:
    return str(Path(os.path.expanduser(value)).resolve())


def validate_checkpoint_path(value: str | None) -> str:
    """Return a normalized checkpoint path after validating its local file type."""
    if value is None or not str(value).strip():
        raise ValueError("DINOv3 tagger checkpoint path must not be blank")

    path = _absolute_path(str(value))
    if not os.path.exists(path):
        raise FileNotFoundError(f"DINOv3 tagger checkpoint is missing: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"DINOv3 tagger checkpoint must be a file: {path}")
    if not path.lower().endswith(".safetensors"):
        raise ValueError(
            "DINOv3 tagger checkpoint must use the .safetensors extension: "
            f"{path}"
        )
    return path


def _validate_vocab_path(path: str) -> str:
    if not os.path.exists(path):
        raise FileNotFoundError(f"DINOv3 tagger vocabulary is missing: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"DINOv3 tagger vocabulary must be a file: {path}")
    if not path.lower().endswith(".json"):
        raise ValueError(f"DINOv3 tagger vocabulary must be JSON: {path}")
    return path


def resolve_vocab_path(checkpoint_path: str, value: str | None) -> str:
    """Resolve an explicit or unambiguous adjacent vocabulary JSON file."""
    checkpoint_path = validate_checkpoint_path(checkpoint_path)
    if value is not None and str(value).strip():
        return _validate_vocab_path(_absolute_path(str(value)))

    directory = os.path.dirname(checkpoint_path)
    exact_path = os.path.join(directory, EXACT_VOCAB_FILENAME)
    if os.path.isfile(exact_path):
        return _validate_vocab_path(_absolute_path(exact_path))

    candidates = sorted(
        _absolute_path(candidate)
        for candidate in glob.glob(os.path.join(directory, "*vocab*.json"))
        if os.path.isfile(candidate)
    )
    if not candidates:
        raise FileNotFoundError(
            "No DINOv3 tagger vocabulary found beside checkpoint "
            f"{checkpoint_path}; configure vocab_path explicitly"
        )
    if len(candidates) > 1:
        raise ValueError(
            "Multiple DINOv3 tagger vocabularies found beside checkpoint "
            f"{checkpoint_path}: {', '.join(candidates)}; "
            "configure vocab_path explicitly"
        )
    return _validate_vocab_path(candidates[0])


def load_vocabulary(path: str) -> TaggerVocabulary:
    """Load the checkpoint-aligned tag and category arrays from a vocabulary JSON."""
    path = _absolute_path(path)
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(
            f"Failed to read DINOv3 tagger vocabulary {path}: {error}"
        ) from error

    if not isinstance(data, dict):
        raise ValueError(f"DINOv3 tagger vocabulary {path} has invalid root object")
    tags = data.get("idx2tag")
    category_map = data.get("tag2category")
    if (
        not isinstance(tags, list)
        or not tags
        or not all(isinstance(tag, str) and tag for tag in tags)
    ):
        raise ValueError(f"DINOv3 tagger vocabulary {path} has invalid idx2tag")
    if len(set(tags)) != len(tags):
        raise ValueError(
            f"DINOv3 tagger vocabulary {path} contains duplicate idx2tag entries"
        )
    if not isinstance(category_map, dict):
        raise ValueError(f"DINOv3 tagger vocabulary {path} has invalid tag2category")

    missing = [tag for tag in tags if tag not in category_map]
    if missing:
        raise ValueError(
            f"DINOv3 tagger vocabulary {path} lacks categories for: "
            f"{', '.join(missing[:8])}"
        )

    categories: list[str] = []
    for tag in tags:
        source_id = category_map[tag]
        if isinstance(source_id, bool) or not isinstance(source_id, int):
            raise ValueError(
                f"DINOv3 tagger vocabulary {path} has non-integer category "
                f"for {tag!r}"
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
    categories: Sequence[str],
    *,
    included_categories: Collection[str],
    mode: Literal["threshold", "top_k"],
    threshold: float,
    top_k: int,
) -> list[int]:
    """Return eligible tag indices ranked by score and then vocabulary index."""
    if scores.ndim != 1 or scores.numel() != len(categories):
        raise ValueError(
            "Tag scores and vocabulary categories must have matching "
            "one-dimensional lengths"
        )

    unknown = set(included_categories) - set(CATEGORY_NAMES)
    if unknown:
        raise ValueError(
            "Unknown DINOv3 tag categories: " + ", ".join(sorted(unknown))
        )
    if mode not in {"threshold", "top_k"}:
        raise ValueError(f"Unsupported DINOv3 tag selection mode: {mode}")
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
        raise ValueError("DINOv3 tag threshold must be between 0 and 1")
    if not 0.0 <= threshold <= 1.0:
        raise ValueError("DINOv3 tag threshold must be between 0 and 1")
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
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
    tags: Sequence[str], *, use_underscores: bool, escape_parentheses: bool
) -> str:
    """Format selected vocabulary tags for a comma-separated caption."""
    formatted = []
    for tag in tags:
        if use_underscores:
            tag = tag.replace(" ", "_")
        if escape_parentheses:
            tag = tag.replace("(", r"\(").replace(")", r"\)")
        formatted.append(tag)
    return ", ".join(formatted)
