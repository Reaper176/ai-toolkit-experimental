#!/usr/bin/env python3
"""Generate manifest-owned training-book navigation and verification blocks."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from training_book.manifest import load_book_manifest
from training_book.markdown import replace_book_blocks, render_book_navigation


def generate_navigation(repository_root: Path, *, check: bool) -> None:
    book_root = repository_root / "docs/book"
    manifest = load_book_manifest(book_root / "book-manifest.json")
    stale: list[str] = []
    for page in manifest.pages:
        path = book_root / page.path
        if not path.exists():
            continue
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
            path.write_text(rendered, encoding="utf-8")
    if stale:
        raise SystemExit(f"stale generated book navigation: {', '.join(stale)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    generate_navigation(REPOSITORY_ROOT, check=arguments.check)


if __name__ == "__main__":
    main()
