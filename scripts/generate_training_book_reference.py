#!/usr/bin/env python3
"""Render committed training-book reference pages from the settings catalog."""

from __future__ import annotations

import argparse
from pathlib import Path

try:
    from training_book.catalog import CatalogError, load_settings_catalog
    from training_book.markdown import (
        MarkdownGenerationError,
        render_settings_catalog_block,
        replace_settings_catalog_block,
    )
except ModuleNotFoundError:  # Imported as scripts.generate_training_book_reference.
    from scripts.training_book.catalog import CatalogError, load_settings_catalog
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


class ReferenceGenerationError(ValueError):
    """Raised when committed reference output is missing or stale."""


def generate_reference_pages(repository_root: Path, *, check: bool) -> None:
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

    settings_by_page = {
        page: tuple(setting for setting in catalog.settings if setting.render.page == page)
        for page in REFERENCE_PAGE_PATHS
    }
    drifted: list[str] = []
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
        if rendered == original:
            continue
        if check:
            drifted.append(relative_page)
        else:
            page.write_text(rendered, encoding="utf-8")
    if drifted:
        raise ReferenceGenerationError(
            "generated reference drift: " + ", ".join(drifted)
        )


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def main() -> None:
    arguments = _arguments()
    generate_reference_pages(Path(__file__).resolve().parents[1], check=arguments.check)


if __name__ == "__main__":
    main()
