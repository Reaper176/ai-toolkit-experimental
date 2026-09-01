#!/usr/bin/env python3
"""Generate manifest-owned training-book navigation and verification blocks."""

from __future__ import annotations

import argparse
import os
import stat
import sys
import tempfile
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from scripts.training_book.manifest import (
    BookPage,
    load_book_manifest,
    validate_book_manifest,
)
from scripts.training_book.markdown import replace_book_blocks, render_book_navigation


_DEFERRED_SMOKE_PAGE = "verification/first-run-smoke.md"


def _safe_page_path(book_root: Path, page: str) -> Path:
    candidate = book_root / page
    resolved = candidate.resolve(strict=False)
    try:
        resolved.relative_to(book_root)
    except ValueError as error:
        raise ValueError(f"training-book page escapes resolved book root: {page!r}") from error
    return candidate


def _atomic_write(path: Path, document: str) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        os.fchmod(descriptor, stat.S_IMODE(path.stat().st_mode))
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            descriptor = -1
            output.write(document)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    except BaseException:
        if descriptor >= 0:
            os.close(descriptor)
        temporary.unlink(missing_ok=True)
        raise


def generate_navigation(repository_root: Path, *, check: bool) -> None:
    book_root = (repository_root / "docs/book").resolve(strict=True)
    manifest = load_book_manifest(book_root / "book-manifest.json")
    validate_book_manifest(
        manifest, expected_full_architectures=manifest.full_architectures
    )

    page_paths: list[tuple[BookPage, Path]] = []
    missing: list[str] = []
    for page in manifest.pages:
        path = _safe_page_path(book_root, page.path)
        if not path.exists():
            if page.path != _DEFERRED_SMOKE_PAGE:
                missing.append(page.path)
            continue
        if not path.is_file():
            raise ValueError(f"training-book page is not a file: {page.path!r}")
        page_paths.append((page, path))
    if missing:
        raise FileNotFoundError(
            f"missing manifest training-book page(s): {', '.join(missing)}"
        )

    stale: list[str] = []
    rendered_pages: list[tuple[Path, str]] = []
    for page, path in page_paths:
        document = path.read_text(encoding="utf-8")
        rendered = replace_book_blocks(
            document,
            navigation=render_book_navigation(page.path, page.previous, page.next),
            verification=manifest.required_footer,
        )
        if rendered == document:
            continue
        if check:
            stale.append(page.path)
        else:
            rendered_pages.append((path, rendered))
    if stale:
        raise SystemExit(f"stale generated book navigation: {', '.join(stale)}")
    for path, rendered in rendered_pages:
        _atomic_write(path, rendered)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    generate_navigation(REPOSITORY_ROOT, check=arguments.check)


if __name__ == "__main__":
    main()
