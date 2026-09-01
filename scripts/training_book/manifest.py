"""Load and validate the training-book manifest."""

from __future__ import annotations

import json
import math
import re
import subprocess
from dataclasses import dataclass
from datetime import date, datetime
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
_SMOKE_COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
_SMOKE_HASH_PATTERN = re.compile(r"[0-9a-f]{64}\Z")
_SMOKE_TIME_PATTERN = re.compile(
    r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\Z"
)
_SMOKE_RECORD_PATH = Path("docs/book/verification/first-run-smoke.md")
_SMOKE_TOP_LEVEL_FIELDS = {
    "schema_version", "status", "book_revision", "tested_commit", "tested_at",
    "ui_architecture", "model_identifier", "hardware", "dataset", "workflow",
    "observations",
}
_SMOKE_HARDWARE_FIELDS = {"gpu_model", "vram_gib", "software"}
_SMOKE_DATASET_FIELDS = {"fixture_id", "file_count", "sha256"}
_SMOKE_WORKFLOW_FIELDS = {
    "authentication", "job_creation", "queue", "start", "fixed_seed_sample",
    "checkpoint", "sample_comparison", "stop", "increase_steps", "resume",
    "optimizer_restoration", "continued_step_progress",
}
_SMOKE_OBSERVATION_FIELDS = {
    "checkpoint_step", "configured_learning_rate", "resumed_step", "notes",
}


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


def _reject_duplicate_object_keys(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise _invalid("JSON object key", key, "duplicate key")
        result[key] = value
    return result


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
        data = json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_object_keys,
        )
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
    expected_footer = (
        "Verified against ai-toolkit-experimental book revision "
        f"{manifest.book_revision} ({manifest.verified_date})."
    )
    if manifest.required_footer != expected_footer:
        raise _invalid(
            "required_footer", manifest.required_footer, f"expected {expected_footer!r}"
        )
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


def _require_smoke_object(value: object, fields: set[str], field: str) -> dict[str, object]:
    if type(value) is not dict:
        raise _invalid(field, value, "expected an object")
    _require_exact_fields(value, fields, field)
    return value


def _require_smoke_number(value: object, field: str) -> int | float:
    if type(value) not in (int, float) or not math.isfinite(value) or value <= 0:
        raise _invalid(field, value, "expected a positive finite number")
    return value


def _require_smoke_integer(value: object, field: str) -> int:
    return _require_positive_integer(value, field)


def _reject_sensitive_smoke_text(value: str, field: str) -> None:
    lowered = value.lower()
    secret_patterns = (
        r"(?:password|passwd|token|api[_-]?key|secret)\s*[:=]",
        r"https?://[^\s/@:]+:[^\s/@]+@",
        r"-----begin [a-z ]*private key-----",
    )
    if any(re.search(pattern, lowered) for pattern in secret_patterns):
        raise _invalid(field, value, "secret or credential material is not allowed")
    path_patterns = (
        # A local path may follow prose punctuation, but a slash embedded in a
        # repository identifier or URL is not an absolute filesystem path.
        r"(?<![A-Za-z0-9._/\\:-])/(?!/)[^\s,;)}\]]+",
        r"(?<![A-Za-z0-9._/\\:-])[a-zA-Z]:[\\/]",
        r"(?<![A-Za-z0-9._/\\:-])~[\\/]",
        r"(?<![A-Za-z0-9._/\\:-])\\\\[^\\/\s]+\\[^\s,;)}\]]+",
        r"file://[^\s,;)}\]]+",
    )
    if any(re.search(pattern, value, re.IGNORECASE) for pattern in path_patterns):
        raise _invalid(field, value, "local or managed-root path leakage is not allowed")


def _run_git(repository_root: Path, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", *arguments],
        cwd=repository_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and result.returncode != 0:
        raise ValueError(f"git {' '.join(arguments)} failed")
    return result


def validate_smoke_record(repository_root: Path, manifest: BookManifest) -> None:
    """Validate the machine-readable, commit-bound supported-GPU smoke evidence."""

    if not isinstance(repository_root, Path):
        raise _invalid("repository_root", repository_root, "expected Path")
    if type(manifest) is not BookManifest:
        raise _invalid("manifest", manifest, "expected BookManifest")
    record_path = repository_root / _SMOKE_RECORD_PATH
    if not record_path.is_file():
        raise ValueError(f"missing required smoke record {_SMOKE_RECORD_PATH.as_posix()}")
    document = record_path.read_text(encoding="utf-8")
    start_marker = "<!-- smoke-record:start -->"
    end_marker = "<!-- smoke-record:end -->"
    if document.count(start_marker) != 1 or document.count(end_marker) != 1:
        raise ValueError("smoke record must contain exactly one marker pair")
    start = document.index(start_marker) + len(start_marker)
    end = document.index(end_marker)
    if end <= start:
        raise ValueError("smoke record markers are out of order")
    fenced = document[start:end]
    match = re.fullmatch(r"\n```json\n([\s\S]+)\n```\n", fenced)
    if match is None:
        raise ValueError("smoke record markers must contain exactly one JSON fence")
    try:
        record = json.loads(
            match.group(1),
            object_pairs_hook=_reject_duplicate_object_keys,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"nonfinite JSON number {value!r} is not allowed")
            ),
        )
    except json.JSONDecodeError as error:
        raise ValueError(
            f"smoke record has invalid JSON at line {error.lineno}, column {error.colno}"
        ) from error
    record = _require_smoke_object(record, _SMOKE_TOP_LEVEL_FIELDS, "smoke record")
    if record["schema_version"] != 1 or type(record["schema_version"]) is not int:
        raise _invalid("schema_version", record["schema_version"], "expected integer 1")
    if record["status"] != "passed" or type(record["status"]) is not str:
        raise _invalid("status", record["status"], "expected 'passed'")
    revision = _require_smoke_integer(record["book_revision"], "book_revision")
    if revision != manifest.book_revision:
        raise _invalid("book_revision", revision, f"expected {manifest.book_revision}")
    tested_commit = _require_string(record["tested_commit"], "tested_commit")
    if _SMOKE_COMMIT_PATTERN.fullmatch(tested_commit) is None:
        raise _invalid("tested_commit", tested_commit, "expected 40 lowercase hexadecimal characters")
    tested_at = _require_string(record["tested_at"], "tested_at")
    if _SMOKE_TIME_PATTERN.fullmatch(tested_at) is None:
        raise _invalid("tested_at", tested_at, "expected a UTC RFC 3339 timestamp ending in Z")
    try:
        datetime.fromisoformat(tested_at[:-1] + "+00:00")
    except ValueError as error:
        raise _invalid("tested_at", tested_at, "expected a real UTC timestamp") from error

    text_fields: list[tuple[str, str]] = []
    for field in ("ui_architecture", "model_identifier"):
        text_fields.append((field, _require_string(record[field], field)))
    hardware = _require_smoke_object(record["hardware"], _SMOKE_HARDWARE_FIELDS, "hardware")
    text_fields.extend((
        ("hardware.gpu_model", _require_string(hardware["gpu_model"], "hardware.gpu_model")),
        ("hardware.software", _require_string(hardware["software"], "hardware.software")),
    ))
    _require_smoke_number(hardware["vram_gib"], "hardware.vram_gib")
    dataset = _require_smoke_object(record["dataset"], _SMOKE_DATASET_FIELDS, "dataset")
    text_fields.append(("dataset.fixture_id", _require_string(dataset["fixture_id"], "dataset.fixture_id")))
    _require_smoke_integer(dataset["file_count"], "dataset.file_count")
    dataset_hash = _require_string(dataset["sha256"], "dataset.sha256")
    if _SMOKE_HASH_PATTERN.fullmatch(dataset_hash) is None:
        raise _invalid("dataset.sha256", dataset_hash, "expected 64 lowercase hexadecimal characters")
    workflow = _require_smoke_object(record["workflow"], _SMOKE_WORKFLOW_FIELDS, "workflow")
    for name in sorted(_SMOKE_WORKFLOW_FIELDS):
        if workflow[name] != "passed" or type(workflow[name]) is not str:
            raise _invalid(f"workflow.{name}", workflow[name], "expected 'passed'")
    observations = _require_smoke_object(
        record["observations"], _SMOKE_OBSERVATION_FIELDS, "observations"
    )
    _require_smoke_integer(observations["checkpoint_step"], "observations.checkpoint_step")
    _require_smoke_number(
        observations["configured_learning_rate"], "observations.configured_learning_rate"
    )
    _require_smoke_integer(observations["resumed_step"], "observations.resumed_step")
    text_fields.append(("observations.notes", _require_string(observations["notes"], "observations.notes")))
    for field, value in text_fields:
        _reject_sensitive_smoke_text(value, field)

    ancestor = _run_git(
        repository_root, "merge-base", "--is-ancestor", tested_commit, "HEAD", check=False
    )
    if ancestor.returncode != 0:
        raise _invalid("tested_commit", tested_commit, "must be an ancestor of HEAD")
    committed_manifest = _run_git(
        repository_root, "show", f"{tested_commit}:docs/book/book-manifest.json"
    ).stdout
    try:
        tested_manifest_data = json.loads(
            committed_manifest, object_pairs_hook=_reject_duplicate_object_keys
        )
    except json.JSONDecodeError as error:
        raise ValueError("tested commit has an invalid training-book manifest") from error
    if type(tested_manifest_data) is not dict or tested_manifest_data.get("book_revision") != manifest.book_revision:
        raise _invalid(
            "tested commit manifest revision",
            tested_manifest_data.get("book_revision") if type(tested_manifest_data) is dict else None,
            f"expected current revision {manifest.book_revision}",
        )
    changed = set(filter(None, _run_git(
        repository_root, "diff", "--name-only", tested_commit, "--", "docs/book"
    ).stdout.splitlines()))
    changed.update(filter(None, _run_git(
        repository_root, "ls-files", "--others", "--exclude-standard", "--", "docs/book"
    ).stdout.splitlines()))
    changed.discard(_SMOKE_RECORD_PATH.as_posix())
    if changed:
        raise ValueError(
            "book content changed after tested commit: " + ", ".join(sorted(changed))
        )
