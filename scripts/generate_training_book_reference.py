#!/usr/bin/env python3
"""Render committed training-book reference pages from the settings catalog."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path, PurePosixPath

try:
    from training_book.catalog import CatalogError, Setting, load_settings_catalog
    from training_book.markdown import (
        MarkdownGenerationError,
        render_settings_catalog_block,
        replace_settings_catalog_block,
    )
except ModuleNotFoundError:  # Imported as scripts.generate_training_book_reference.
    from scripts.training_book.catalog import CatalogError, Setting, load_settings_catalog
    from scripts.training_book.markdown import (
        MarkdownGenerationError,
        render_settings_catalog_block,
        replace_settings_catalog_block,
    )


REFERENCE_PAGE_PATHS = (
    "reference/job-and-model.md",
    "reference/network.md",
    "reference/training.md",
    "reference/dataset.md",
    "reference/masks-and-preservation.md",
    "reference/saving-and-sampling.md",
    "reference/optimizers-and-schedulers.md",
    "reference/advanced-only-settings.md",
)

MODEL_PAGE_ARCHITECTURES = {
    "models/anima.md": ("anima",),
    "models/flux-and-flex.md": ("flux", "flux_kontext", "flex1"),
    "models/qwen-image-and-edit.md": (
        "qwen_image", "qwen_image:2512", "qwen_image_edit",
        "qwen_image_edit_plus", "qwen_image_edit_plus:2511",
    ),
    "models/sdxl-and-sd15.md": ("sdxl", "sd15"),
    "models/wan.md": ("wan21:1b", "wan22_14b:t2v"),
}

MODEL_FACTS_START = "<!-- model-facts:start -->"
MODEL_FACTS_END = "<!-- model-facts:end -->"
MODEL_FACTS_NOTICE = "<!-- generated; edit settings-catalog.json instead -->"

CANONICAL_DEFERRED_ASSIGNMENTS = (
    ("cli.config_file_list", "advanced/yaml-and-cli.md"),
    ("cli.recover", "advanced/yaml-and-cli.md"),
    ("cli.name", "advanced/yaml-and-cli.md"),
    ("cli.log", "advanced/yaml-and-cli.md"),
    ("model.anima.model_kwargs.max_sequence_length", "models/anima.md"),
    ("model.anima.model_kwargs.train_text_conditioner", "models/anima.md"),
    ("model.wan22_14b.model_kwargs.train_high_noise", "models/wan.md"),
    ("model.wan22_14b.model_kwargs.train_low_noise", "models/wan.md"),
    ("model.wan.model_kwargs.vae_tiling", "models/wan.md"),
    (
        "model.qwen_image_edit_plus.model_kwargs.match_target_res",
        "models/qwen-image-and-edit.md",
    ),
)


class ReferenceGenerationError(ValueError):
    """Raised when committed reference output is missing or stale."""


def validate_model_page_selector(
    page: str,
    model_page_architectures: Mapping[str, tuple[str, ...]] = MODEL_PAGE_ARCHITECTURES,
) -> str:
    """Return one exact manifest-relative model page or reject the selector."""

    if not page or "\\" in page:
        raise ReferenceGenerationError("model page selector must be a nonempty POSIX path")
    candidate = PurePosixPath(page)
    if candidate.is_absolute() or ".." in candidate.parts or candidate.as_posix() != page:
        raise ReferenceGenerationError(f"unsafe model page selector {page!r}")
    if not page.startswith("models/") or page not in model_page_architectures:
        raise ReferenceGenerationError(f"unknown model page selector {page!r}")
    return page


def _canonical_json(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def render_model_facts_block(
    catalog: object,
    relative_page: str,
    architectures: Sequence[str],
) -> str:
    """Render exact catalog-owned facts for one focused model-family page."""

    if not architectures or len(architectures) != len(set(architectures)):
        raise ReferenceGenerationError(
            f"{relative_page}: model architectures must be nonempty and unique"
        )
    architecture_rows = []
    for architecture in architectures:
        facts = [
            owner.model_dump(mode="json", exclude_none=True)
            for owner in catalog.ui_claims
            if getattr(owner.fact, "architecture", None) == architecture
        ]
        if not facts:
            raise ReferenceGenerationError(
                f"{relative_page}: catalog has no UI facts for {architecture!r}"
            )
        architecture_rows.append({
            "id": architecture,
            "facts": sorted(facts, key=_canonical_json),
        })
    deferred_settings = sorted(
        (
            setting.model_dump(mode="json", exclude_none=True)
            for setting in catalog.settings
            if setting.render.page == relative_page
        ),
        key=lambda item: item["id"],
    )
    payload = {
        "schema_version": 1,
        "architectures": architecture_rows,
        "deferred_settings": deferred_settings,
    }
    rendered_payload = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        indent=2,
    )
    return "\n".join((
        MODEL_FACTS_START,
        MODEL_FACTS_NOTICE,
        "```json",
        rendered_payload,
        "```",
        MODEL_FACTS_END,
    ))


def replace_model_facts_block(document: str, block: str) -> str:
    """Replace one balanced model-facts block without changing prose."""

    if block.count(MODEL_FACTS_START) != 1 or block.count(MODEL_FACTS_END) != 1:
        raise ReferenceGenerationError(
            "rendered block requires exactly one model-facts marker pair"
        )
    if not block.startswith(MODEL_FACTS_START) or not block.endswith(MODEL_FACTS_END):
        raise ReferenceGenerationError(
            "rendered model-facts markers must bound the complete block"
        )
    if (
        document.count(MODEL_FACTS_START) != 1
        or document.count(MODEL_FACTS_END) != 1
    ):
        raise ReferenceGenerationError(
            "model page requires exactly one model-facts marker pair"
        )
    start = document.index(MODEL_FACTS_START)
    end = document.index(MODEL_FACTS_END)
    if end < start:
        raise ReferenceGenerationError("model-facts markers are out of order")
    end += len(MODEL_FACTS_END)
    return f"{document[:start]}{block}{document[end:]}"


def generate_model_fact_pages(
    repository_root: Path,
    catalog: object,
    *,
    check: bool,
    page: str | None = None,
    model_page_architectures: Mapping[
        str, tuple[str, ...]
    ] = MODEL_PAGE_ARCHITECTURES,
) -> None:
    """Write or verify existing focused model-page fact blocks atomically."""

    root = repository_root.resolve()
    if page is not None:
        relative_pages = (
            validate_model_page_selector(page, model_page_architectures),
        )
    else:
        relative_pages = tuple(
            relative_page
            for relative_page in model_page_architectures
            if (root / "docs/book" / relative_page).is_file()
        )
    documents: list[tuple[Path, str, str, str]] = []
    for relative_page in relative_pages:
        target = root / "docs/book" / relative_page
        if not target.is_file():
            raise ReferenceGenerationError(f"missing model page {relative_page}")
        original = target.read_text(encoding="utf-8")
        block = render_model_facts_block(
            catalog,
            relative_page,
            model_page_architectures[relative_page],
        )
        rendered = replace_model_facts_block(original, block)
        documents.append((target, relative_page, original, rendered))

    drifted = [
        relative_page
        for _, relative_page, original, rendered in documents
        if rendered != original
    ]
    if check and drifted:
        raise ReferenceGenerationError(
            "generated model-fact drift: " + ", ".join(drifted)
        )
    if not check:
        for target, _, original, rendered in documents:
            if rendered != original:
                target.write_text(rendered, encoding="utf-8")


def partition_reference_settings(
    settings: Sequence[Setting],
    *,
    expected_deferred_assignments: Sequence[tuple[str, str]],
) -> tuple[dict[str, tuple[Setting, ...]], tuple[tuple[str, str], ...]]:
    """Partition every row into an immediate page or one exact deferred assignment."""

    expected = tuple(expected_deferred_assignments)
    if len(expected) != len(set(expected)):
        raise ReferenceGenerationError("duplicate expected deferred assignment")
    expected_pages_by_id: dict[str, set[str]] = {}
    for setting_id, page in expected:
        if page in REFERENCE_PAGE_PATHS:
            raise ReferenceGenerationError(
                f"deferred assignment {setting_id!r} overlaps a Task 7 page {page!r}"
            )
        expected_pages_by_id.setdefault(setting_id, set()).add(page)
    overlapping = sorted(
        setting_id for setting_id, pages in expected_pages_by_id.items()
        if len(pages) > 1
    )
    if overlapping:
        raise ReferenceGenerationError(
            f"settings assigned to multiple deferred pages: {overlapping!r}"
        )

    setting_id_counts = Counter(setting.id for setting in settings)
    duplicates = sorted(
        setting_id for setting_id, count in setting_id_counts.items() if count > 1
    )
    if duplicates:
        raise ReferenceGenerationError(
            f"duplicate catalog setting ids in reference partition: {duplicates!r}"
        )

    immediate = {
        page: tuple(setting for setting in settings if setting.render.page == page)
        for page in REFERENCE_PAGE_PATHS
    }
    actual_deferred = tuple(
        (setting.id, setting.render.page)
        for setting in settings
        if setting.render.page not in REFERENCE_PAGE_PATHS
    )
    actual_set = set(actual_deferred)
    expected_set = set(expected)
    problems: list[str] = []
    unexpected = sorted(actual_set.difference(expected_set))
    missing = sorted(expected_set.difference(actual_set))
    if unexpected:
        problems.append(f"unexpected deferred assignments {unexpected!r}")
    if missing:
        problems.append(f"missing deferred assignments {missing!r}")
    if problems:
        raise ReferenceGenerationError("; ".join(problems))
    return immediate, expected


def generate_reference_pages(
    repository_root: Path,
    *,
    check: bool,
    page: str | None = None,
    expected_deferred_assignments: Sequence[tuple[str, str]] = CANONICAL_DEFERRED_ASSIGNMENTS,
) -> None:
    """Write or verify reference blocks and existing focused model-fact blocks."""

    root = repository_root.resolve()
    reference_root = root / "docs/book/reference"
    try:
        catalog = load_settings_catalog(
            reference_root / "settings-catalog.json",
            reference_root / "settings-catalog.schema.json",
            None,
        )
    except CatalogError as error:
        raise ReferenceGenerationError(str(error)) from error

    if page is not None:
        generate_model_fact_pages(root, catalog, check=check, page=page)
        return

    settings_by_page, _ = partition_reference_settings(
        catalog.settings,
        expected_deferred_assignments=expected_deferred_assignments,
    )
    documents: list[tuple[Path, str, str, str]] = []
    for relative_page in REFERENCE_PAGE_PATHS:
        page = root / "docs/book" / relative_page
        if not page.is_file():
            raise ReferenceGenerationError(f"missing reference page {relative_page}")
        original = page.read_text(encoding="utf-8")
        try:
            block = render_settings_catalog_block(settings_by_page[relative_page])
            rendered = replace_settings_catalog_block(original, block)
        except MarkdownGenerationError as error:
            raise ReferenceGenerationError(f"{relative_page}: {error}") from error
        documents.append((page, relative_page, original, rendered))

    drifted = [
        relative_page
        for _, relative_page, original, rendered in documents
        if rendered != original
    ]
    if check and drifted:
        raise ReferenceGenerationError(
            "generated reference drift: " + ", ".join(drifted)
        )
    if not check:
        for page, _, original, rendered in documents:
            if rendered != original:
                page.write_text(rendered, encoding="utf-8")
    generate_model_fact_pages(root, catalog, check=check)


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--page")
    return parser.parse_args()


def main() -> None:
    arguments = _arguments()
    generate_reference_pages(
        Path(__file__).resolve().parents[1],
        check=arguments.check,
        page=arguments.page,
    )


if __name__ == "__main__":
    main()
