#!/usr/bin/env python3
"""Render committed training-book reference pages from the settings catalog."""

from __future__ import annotations

import argparse
from collections import Counter
from collections.abc import Sequence
from pathlib import Path

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
    expected_deferred_assignments: Sequence[tuple[str, str]] = CANONICAL_DEFERRED_ASSIGNMENTS,
) -> None:
    """Write or verify all Task 7 reference blocks under ``repository_root``."""

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


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def main() -> None:
    arguments = _arguments()
    generate_reference_pages(Path(__file__).resolve().parents[1], check=arguments.check)


if __name__ == "__main__":
    main()
