"""Load and validate the training-book manifest."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Sequence


_MANIFEST_FIELDS = {
    "schema_version",
    "book_revision",
    "verified_date",
    "pages",
    "preset_architectures",
    "focused_architectures",
    "full_architectures",
    "required_footer",
}
_PAGE_FIELDS = {"path", "previous", "next"}
_ISO_DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}\Z")


@dataclass(frozen=True)
class BookPage:
    path: str
    previous: str | None
    next: str | None


@dataclass(frozen=True)
class BookManifest:
    schema_version: int
    book_revision: int
    verified_date: str
    pages: tuple[BookPage, ...]
    preset_architectures: tuple[str, ...]
    focused_architectures: tuple[str, ...]
    full_architectures: tuple[str, ...]
    required_footer: str


def _invalid(field: str, value: object, reason: str) -> ValueError:
    return ValueError(f"{field} has invalid value {value!r}: {reason}")


def _require_exact_fields(value: dict[str, object], expected: set[str], field: str) -> None:
    missing = sorted(expected.difference(value))
    if missing:
        raise _invalid(field, missing, "missing required field(s)")
    extra = sorted(set(value).difference(expected))
    if extra:
        raise _invalid(field, extra, "unexpected field(s)")


def _require_positive_integer(value: object, field: str) -> int:
    if type(value) is not int or value <= 0:
        raise _invalid(field, value, "expected a positive integer")
    return value


def _require_string(value: object, field: str, *, allow_empty: bool = False) -> str:
    if type(value) is not str or (not allow_empty and not value):
        raise _invalid(field, value, "expected a non-empty string")
    return value


def _load_architectures(value: object, field: str) -> tuple[str, ...]:
    if type(value) is not list:
        raise _invalid(field, value, "expected an array")
    return tuple(
        _require_string(item, f"{field}[{index}]")
        for index, item in enumerate(value)
    )


def _load_page(value: object, index: int) -> BookPage:
    field = f"pages[{index}]"
    if type(value) is not dict:
        raise _invalid(field, value, "expected an object")
    _require_exact_fields(value, _PAGE_FIELDS, field)

    path = _require_string(value["path"], f"{field}.path")
    links: list[str | None] = []
    for link_name in ("previous", "next"):
        link = value[link_name]
        if link is not None:
            link = _require_string(link, f"{field}.{link_name}")
        links.append(link)
    return BookPage(path=path, previous=links[0], next=links[1])


def _load_verified_date(value: object) -> str:
    verified_date = _require_string(value, "verified_date")
    if not _ISO_DATE_PATTERN.fullmatch(verified_date):
        raise _invalid("verified_date", value, "expected ISO YYYY-MM-DD")
    try:
        date.fromisoformat(verified_date)
    except ValueError as error:
        raise _invalid("verified_date", value, "expected a real calendar date") from error
    return verified_date


def load_book_manifest(path: Path) -> BookManifest:
    """Load a JSON manifest without retaining its source filesystem path."""

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(
            f"manifest has invalid JSON at line {error.lineno}, column {error.colno}"
        ) from error

    if type(data) is not dict:
        raise _invalid("manifest", data, "expected an object")
    _require_exact_fields(data, _MANIFEST_FIELDS, "manifest")

    pages_value = data["pages"]
    if type(pages_value) is not list:
        raise _invalid("pages", pages_value, "expected an array")
    pages = tuple(_load_page(page, index) for index, page in enumerate(pages_value))

    return BookManifest(
        schema_version=_require_positive_integer(data["schema_version"], "schema_version"),
        book_revision=_require_positive_integer(data["book_revision"], "book_revision"),
        verified_date=_load_verified_date(data["verified_date"]),
        pages=pages,
        preset_architectures=_load_architectures(
            data["preset_architectures"], "preset_architectures"
        ),
        focused_architectures=_load_architectures(
            data["focused_architectures"], "focused_architectures"
        ),
        full_architectures=_load_architectures(
            data["full_architectures"], "full_architectures"
        ),
        required_footer=_require_string(data["required_footer"], "required_footer"),
    )


def _validate_book_path(value: object, field: str) -> str:
    path = _require_string(value, field)
    if "\\" in path:
        raise _invalid(field, value, "backslashes are not allowed")
    parsed = PurePosixPath(path)
    windows_path = PureWindowsPath(path)
    if parsed.is_absolute() or windows_path.is_absolute() or windows_path.drive:
        raise _invalid(field, value, "absolute paths are not allowed")
    if ".." in parsed.parts:
        raise _invalid(field, value, "parent traversal is not allowed")
    if path == "." or str(parsed) != path:
        raise _invalid(field, value, "expected a normalized relative POSIX path")
    return path


def _validate_unique(values: tuple[str, ...], field: str) -> None:
    seen: set[str] = set()
    for value in values:
        _require_string(value, field)
        if value in seen:
            raise _invalid(field, value, "duplicate entry")
        seen.add(value)


def validate_book_manifest(
    manifest: BookManifest, *, expected_full_architectures: Sequence[str]
) -> None:
    """Validate navigation and architecture contracts for a loaded manifest."""

    if type(manifest) is not BookManifest:
        raise _invalid("manifest", manifest, "expected BookManifest")
    _require_positive_integer(manifest.schema_version, "schema_version")
    _require_positive_integer(manifest.book_revision, "book_revision")
    _load_verified_date(manifest.verified_date)
    _require_string(manifest.required_footer, "required_footer")
    if type(manifest.pages) is not tuple:
        raise _invalid("pages", manifest.pages, "expected an immutable ordered tuple")

    page_paths: list[str] = []
    seen_pages: set[str] = set()
    for index, page in enumerate(manifest.pages):
        if type(page) is not BookPage:
            raise _invalid(f"pages[{index}]", page, "expected BookPage")
        page_path = _validate_book_path(page.path, f"pages[{index}].path")
        if page_path in seen_pages:
            raise _invalid("pages", page_path, "duplicate page path")
        seen_pages.add(page_path)
        page_paths.append(page_path)
        for field, link in (("previous", page.previous), ("next", page.next)):
            if link is not None:
                _validate_book_path(link, f"pages[{index}].{field}")
                if link == page_path:
                    raise _invalid(field, link, "page cannot link to itself")

    for index, page in enumerate(manifest.pages):
        expected_previous = page_paths[index - 1] if index > 0 else None
        expected_next = page_paths[index + 1] if index + 1 < len(page_paths) else None
        if page.previous != expected_previous:
            raise _invalid(
                f"pages[{index}].previous",
                page.previous,
                f"expected {expected_previous!r}",
            )
        if page.next != expected_next:
            raise _invalid(
                f"pages[{index}].next", page.next, f"expected {expected_next!r}"
            )

    architecture_fields = (
        ("preset_architectures", manifest.preset_architectures),
        ("focused_architectures", manifest.focused_architectures),
        ("full_architectures", manifest.full_architectures),
    )
    for field, values in architecture_fields:
        if type(values) is not tuple:
            raise _invalid(field, values, "expected an immutable ordered tuple")
        _validate_unique(values, field)

    full_set = set(manifest.full_architectures)
    for field, values in architecture_fields[:2]:
        for value in values:
            if value not in full_set:
                raise _invalid(field, value, "entry is missing from full_architectures")

    expected = tuple(expected_full_architectures)
    if manifest.full_architectures != expected:
        raise _invalid(
            "full_architectures",
            manifest.full_architectures,
            f"expected exact set and order {expected!r}",
        )
