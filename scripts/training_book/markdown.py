"""Deterministic Markdown rendering for generated training-book catalog blocks."""

from __future__ import annotations

import html
import json
import posixpath
import re
from collections.abc import Iterable, Sequence
from pathlib import Path, PurePosixPath
from typing import Any

from .catalog import Applicability, Setting, SettingDefault


SETTINGS_CATALOG_START = "<!-- settings-catalog:start -->"
SETTINGS_CATALOG_END = "<!-- settings-catalog:end -->"
GENERATED_NOTICE = "<!-- generated; edit settings-catalog.json instead -->"

_ANCHOR = re.compile(r"[A-Za-z][A-Za-z0-9_.:-]*\Z")
_MARKDOWN_PUNCTUATION = re.compile(r"([\\`*_[\]{}#])")
_EXPLICIT_ANCHOR = re.compile(
    r'''<a\b[^>]*\bid\s*=\s*(?:"([A-Za-z][A-Za-z0-9_.:-]*)"|'''
    r"'([A-Za-z][A-Za-z0-9_.:-]*)'|([A-Za-z][A-Za-z0-9_.:-]*))[^>]*>\s*</a>",
    re.IGNORECASE,
)
_MARKDOWN_LINK = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)")
_REFERENCE_DEFINITION = re.compile(
    r"^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)", re.MULTILINE
)
_HTML_HREF = re.compile(
    r'''<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))''',
    re.IGNORECASE,
)
_AUTOLINK = re.compile(
    r"<((?:https?://|mailto:)[^<>\s]+)>",
    re.IGNORECASE,
)
_EXTERNAL_LINK = re.compile(r"(?:https?|mailto):", re.IGNORECASE)
_PAGE_MARKERS = (
    "<!-- book-navigation:start -->",
    "<!-- book-navigation:end -->",
    "<!-- book-verification:start -->",
    "<!-- book-verification:end -->",
)
BOOK_NAVIGATION_START, BOOK_NAVIGATION_END, BOOK_VERIFICATION_START, BOOK_VERIFICATION_END = _PAGE_MARKERS


class MarkdownGenerationError(ValueError):
    """Raised when a generated Markdown block cannot be rendered safely."""


class MarkdownContractError(ValueError):
    """Raised when a hand-written training-book page violates its contract."""


def _replace_owned_block(document: str, start_marker: str, end_marker: str, body: str) -> str:
    for marker in (start_marker, end_marker):
        if document.count(marker) != 1 or marker not in document.splitlines():
            raise MarkdownGenerationError(f"document requires exactly one line containing {marker}")
    start = document.index(start_marker)
    end = document.index(end_marker)
    if end < start:
        raise MarkdownGenerationError(f"generated markers are out of order: {start_marker}")
    content_start = start + len(start_marker)
    replacement = f"\n{body}\n" if body else "\n"
    return document[:content_start] + replacement + document[end:]


def replace_book_blocks(document: str, *, navigation: str, verification: str) -> str:
    """Replace only the two marker-owned book blocks."""

    positions = []
    for marker in _PAGE_MARKERS:
        if document.count(marker) != 1 or marker not in document.splitlines():
            raise MarkdownGenerationError(f"document requires exactly one line containing {marker}")
        positions.append(document.index(marker))
    if positions != sorted(positions):
        raise MarkdownGenerationError("book navigation and verification markers are out of order")
    rendered = _replace_owned_block(
        document, BOOK_NAVIGATION_START, BOOK_NAVIGATION_END, navigation
    )
    return _replace_owned_block(
        rendered, BOOK_VERIFICATION_START, BOOK_VERIFICATION_END, verification
    )


def _relative_book_link(page: str, target: str) -> str:
    return posixpath.relpath(target, str(PurePosixPath(page).parent))


def render_book_navigation(page: str, previous: str | None, next_: str | None) -> str:
    """Render deterministic previous/next links for one manifest page."""

    links = []
    if previous is not None:
        links.append(f"[← Previous]({_relative_book_link(page, previous)})")
    if next_ is not None:
        links.append(f"[Next →]({_relative_book_link(page, next_)})")
    return " · ".join(links)


def _outside_fences(document: str) -> str:
    lines: list[str] = []
    fence: tuple[str, int] | None = None
    for line in document.splitlines():
        if fence is not None:
            marker, minimum_length = fence
            closing = re.match(
                rf"^ {{0,3}}({re.escape(marker)}{{{minimum_length},}})[ \t]*$",
                line,
            )
            if closing:
                fence = None
            lines.append("")
            continue

        opening = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if opening and not (
            opening.group(1).startswith("`") and "`" in opening.group(2)
        ):
            token = opening.group(1)
            fence = (token[0], len(token))
            lines.append("")
        else:
            lines.append(line)
    return "\n".join(lines)


def _blank_preserving_newlines(value: str) -> str:
    return "".join("\n" if character == "\n" else " " for character in value)


def _outside_inline_code(document: str) -> str:
    characters = list(document)
    index = 0
    while index < len(document):
        if document[index] != "`":
            index += 1
            continue
        run_end = index
        while run_end < len(document) and document[run_end] == "`":
            run_end += 1
        run_length = run_end - index
        search = run_end
        closing_end = None
        while search < len(document):
            if document[search] != "`":
                search += 1
                continue
            candidate_end = search
            while candidate_end < len(document) and document[candidate_end] == "`":
                candidate_end += 1
            if candidate_end - search == run_length:
                closing_end = candidate_end
                break
            search = candidate_end
        if closing_end is None:
            index = run_end
            continue
        characters[index:closing_end] = _blank_preserving_newlines(
            document[index:closing_end]
        )
        index = closing_end
    return "".join(characters)


def _outside_html_comments(document: str) -> str:
    return re.sub(
        r"<!--.*?-->",
        lambda match: _blank_preserving_newlines(match.group(0)),
        document,
        flags=re.DOTALL,
    )


def _without_escaped_punctuation(document: str) -> str:
    characters = list(document)
    punctuation = set(r'''!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~''')
    index = 0
    while index < len(document):
        if document[index] != "\\":
            index += 1
            continue
        run_end = index
        while run_end < len(document) and document[run_end] == "\\":
            run_end += 1
        if (
            (run_end - index) % 2 == 1
            and run_end < len(document)
            and document[run_end] in punctuation
        ):
            characters[run_end - 1] = " "
            characters[run_end] = " "
        index = run_end + 1
    return "".join(characters)


def rendered_markdown(document: str) -> str:
    """Return link-visible Markdown while preserving line and character positions."""

    visible = _outside_fences(document)
    visible = _outside_html_comments(visible)
    visible = _without_escaped_punctuation(visible)
    return _outside_inline_code(visible)


def _link_destination(raw_target: str) -> str:
    target = raw_target.strip()
    if target.startswith("<"):
        closing = target.find(">")
        if closing != -1:
            return target[1:closing]
    return target.split(maxsplit=1)[0]


def _reference_key(label: str) -> str:
    return " ".join(label.split()).casefold()


def markdown_reference_definitions(document: str) -> dict[str, str]:
    """Return case-insensitive reference-link destinations from rendered Markdown."""

    visible = rendered_markdown(document)
    definitions: dict[str, str] = {}
    for match in _REFERENCE_DEFINITION.finditer(visible):
        definitions.setdefault(
            _reference_key(match.group(1)),
            _link_destination(match.group(2)),
        )
    return definitions


def extract_rendered_links(
    document: str,
    *,
    reference_definitions: dict[str, str] | None = None,
) -> list[tuple[str | None, str]]:
    """Extract rendered Markdown, reference, HTML, and autolink destinations."""

    visible = rendered_markdown(document)
    definitions = (
        markdown_reference_definitions(visible)
        if reference_definitions is None
        else reference_definitions
    )
    links: list[tuple[str | None, str]] = []
    occupied: list[tuple[int, int]] = [
        match.span() for match in _REFERENCE_DEFINITION.finditer(visible)
    ]

    for match in _MARKDOWN_LINK.finditer(visible):
        links.append((match.group(1), _link_destination(match.group(2))))
        occupied.append(match.span())
    for match in _HTML_HREF.finditer(visible):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        raw_target = next(group for group in match.groups() if group is not None)
        links.append((None, _link_destination(raw_target)))
        occupied.append(match.span())
    for match in _AUTOLINK.finditer(visible):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        links.append((None, _link_destination(match.group(1))))
        occupied.append(match.span())

    for match in re.finditer(r"(?<!!)\[([^\]]+)\]\[([^\]]*)\]", visible):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        reference_id = match.group(2) or match.group(1)
        target = definitions.get(_reference_key(reference_id))
        if target is not None:
            links.append((match.group(1), target))
        occupied.append(match.span())
    for match in re.finditer(r"(?<![!\]])\[([^\]]+)\](?![\[(])", visible):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        target = definitions.get(_reference_key(match.group(1)))
        if target is not None:
            links.append((match.group(1), target))
    return links


def _heading_anchor(heading: str) -> str:
    value = re.sub(r"<[^>]+>", "", heading)
    value = value.replace("`", "").strip().lower()
    value = re.sub(r"[^\w\- ]", "", value)
    return re.sub(r"[ -]+", "-", value).strip("-")


def _page_anchors(document: str, page: str) -> set[str]:
    visible = rendered_markdown(document)
    anchors = [
        next(group for group in match.groups() if group is not None)
        for match in _EXPLICIT_ANCHOR.finditer(visible)
    ]
    anchors.extend(
        _heading_anchor(match.group(1))
        for line in visible.splitlines()
        if (match := re.match(r"^#{1,6}\s+(.+?)\s*#*\s*$", line))
    )
    anchors = [anchor for anchor in anchors if anchor]
    duplicates = sorted({anchor for anchor in anchors if anchors.count(anchor) > 1})
    if duplicates:
        raise MarkdownContractError(f"{page}: duplicate anchor {duplicates[0]!r}")
    return set(anchors)


def _claim_text(document: str) -> str:
    value = re.sub(r"<[^>]+>", " ", document)
    blocks: list[str] = []
    current: list[str] = []

    def finish_block() -> None:
        if current:
            blocks.append(re.sub(r"\s+", " ", " ".join(current)).strip())
            current.clear()

    for raw_line in value.lower().splitlines():
        line = re.sub(r"[`*_~]", "", raw_line)
        if not line.strip():
            finish_block()
            continue
        if re.match(r"^ {0,3}(?:[-+*]|\d+[.)])\s+", raw_line):
            finish_block()
        elif re.match(r"^ {0,3}#{1,6}\s+", line):
            finish_block()
            blocks.append(line.strip())
            continue
        current.append(line.strip())
    finish_block()
    return "\n".join(blocks)


def _relation_is_negated(text: str, verb_start: int, verb_end: int) -> bool:
    """Return whether negation is grammatically local to a relation verb."""

    before = text[max(0, verb_start - 32):verb_start]
    after = text[verb_end:verb_end + 24]
    negated_auxiliary = re.search(
        r"\b(?:(?:do|does|did|can|will|would|should|could)\s+not|"
        r"cannot|doesn't|don't|didn't|can't|won't|wouldn't|shouldn't|couldn't|"
        r"without)\s+$",
        before,
    )
    negated_complement = re.match(r"\s+(?:not|never|no)\b", after)
    return bool(negated_auxiliary or negated_complement)


def _positive_relation(
    sentence: str,
    *,
    subject: re.Pattern[str],
    verbs: re.Pattern[str],
    object_: re.Pattern[str],
    span: int,
) -> bool:
    for subject_match in subject.finditer(sentence):
        end = min(len(sentence), subject_match.end() + span)
        for verb_match in verbs.finditer(sentence, subject_match.end(), end):
            object_match = object_.search(sentence, verb_match.end(), end)
            if object_match and not _relation_is_negated(
                sentence, verb_match.start(), verb_match.end()
            ):
                return True
    return False


def _has_prohibited_relation(clause: str) -> bool:
    if _positive_relation(
        clause,
        subject=re.compile(r"\blowest loss\b"),
        verbs=re.compile(
            r"\b(?:is|are|gives?|yields?|selects?|identifies?|means?|"
            r"indicates?|marks?|produces?|guarantees?)\b"
        ),
        object_=re.compile(r"\bbest\b"),
        span=120,
    ):
        return True
    if _positive_relation(
        clause,
        subject=re.compile(r"\bbest(?:\s+(?:checkpoint|result|choice|model))?\b"),
        verbs=re.compile(r"\b(?:is|are|means?|identifies?|selects?)\b"),
        object_=re.compile(r"\blowest loss\b"),
        span=120,
    ):
        return True
    if _positive_relation(
        clause,
        subject=re.compile(r"\bindependent(?:\s+\w+){0,3}\s+queue keys?\b"),
        verbs=re.compile(
            r"\b(?:allows?|provides?|enables?|performs?|constitutes?|are|is|"
            r"represents?|gives?|delivers?)\b"
        ),
        object_=re.compile(r"\bdistributed training\b"),
        span=160,
    ):
        return True
    if _positive_relation(
        clause,
        subject=re.compile(r"\bdistributed training\b"),
        verbs=re.compile(
            r"\b(?:is|are)\s+(?:provided|allowed|enabled|performed|"
            r"constituted|represented|delivered)\s+by\b"
        ),
        object_=re.compile(r"\bindependent(?:\s+\w+){0,3}\s+queue keys?\b"),
        span=160,
    ):
        return True
    if _positive_relation(
        clause,
        subject=re.compile(r"\boptimizer\.pt\b"),
        verbs=re.compile(
            r"\b(?:contains?|stores?|holds?|includes?|carr(?:y|ies)|is|are)\b"
        ),
        object_=re.compile(r"\blora weights?\b"),
        span=180,
    ):
        return True
    if _positive_relation(
        clause,
        subject=re.compile(r"\blora weights?\b"),
        verbs=re.compile(
            r"\b(?:is|are)\s+(?:contained|stored|held|included|carried)\s+"
            r"(?:in|by)\b"
        ),
        object_=re.compile(r"\boptimizer\.pt\b"),
        span=120,
    ):
        return True
    return False


def _has_prohibited_claim(document: str) -> bool:
    claim_text = _claim_text(document).replace("optimizer.pt", "optimizer_pt")
    for sentence in re.split(r"[.!?\n]+", claim_text):
        sentence = sentence.replace("optimizer_pt", "optimizer.pt")
        previous_optimizer_subject = False
        previous_queue_subject = False
        for raw_clause in sentence.split(";"):
            clause = raw_clause.strip()
            if previous_optimizer_subject and re.match(
                r"^(?:(?:however|but|therefore|still|instead|also),?\s+)?it\b",
                clause,
            ):
                clause = f"optimizer.pt {clause}"
            if previous_queue_subject and re.match(
                r"^(?:(?:however|but|therefore|still|instead|also),?\s+)?they\b",
                clause,
            ):
                clause = f"independent queue keys {clause}"
            if _has_prohibited_relation(clause):
                return True
            previous_optimizer_subject = bool(re.match(
                r"^(?:[-+]\s+)?(?:the\s+)?optimizer\.pt(?:\s+file)?\b",
                raw_clause.strip(),
            ))
            previous_queue_subject = bool(re.match(
                r"^(?:[-+]\s+)?(?:the\s+)?independent(?:\s+\w+){0,3}\s+"
                r"queue keys?\b",
                raw_clause.strip(),
            ))
    return False


def _normalized_link(page: str, target: str) -> tuple[str, str | None]:
    if "\\" in target or target.startswith("/"):
        raise MarkdownContractError(f"{page}: unsafe link target {target!r}")
    path, separator, fragment = target.partition("#")
    if not path:
        normalized = page
    else:
        normalized = posixpath.normpath(
            posixpath.join(str(PurePosixPath(page).parent), path)
        )
    if normalized == ".." or normalized.startswith("../"):
        raise MarkdownContractError(f"{page}: link escapes the training book: {target!r}")
    return normalized, fragment if separator else None


def validate_narrative_page(
    page: str,
    document: str,
    *,
    manifest_paths: Sequence[str],
    existing_paths: set[str],
    page_documents: dict[str, str],
) -> None:
    """Validate one staged book page without requiring future manifest pages."""

    structural = _outside_fences(document)
    rendered = rendered_markdown(document)
    claim_text = _outside_html_comments(structural)
    headings = [line for line in rendered.splitlines() if line.startswith("# ")]
    if len(headings) != 1:
        raise MarkdownContractError(f"{page}: expected exactly one H1")
    if next((line for line in rendered.splitlines() if line.strip()), None) != headings[0]:
        raise MarkdownContractError(f"{page}: H1 must be the first content line")
    anchors = _page_anchors(document, page)

    positions: list[int] = []
    for marker in _PAGE_MARKERS:
        if structural.count(marker) != 1:
            raise MarkdownContractError(f"{page}: expected exactly one {marker}")
        if marker not in structural.splitlines():
            raise MarkdownContractError(f"{page}: marker must occupy its own line: {marker}")
        positions.append(structural.index(marker))
    if positions != sorted(positions):
        raise MarkdownContractError(f"{page}: navigation/verification markers are out of order")
    if structural.rstrip().endswith(_PAGE_MARKERS[-1]) is False:
        raise MarkdownContractError(f"{page}: verification footer must end the page")

    links = extract_rendered_links(rendered)
    toc_links = []
    manifest_set = set(manifest_paths)
    def check_target(raw_target: str) -> str:
        target = raw_target.strip()
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1]
        if _EXTERNAL_LINK.match(target):
            return ""
        normalized, fragment = _normalized_link(page, target)
        if normalized not in existing_paths:
            if normalized not in manifest_set or fragment is not None:
                raise MarkdownContractError(f"{page}: unresolved staged link {raw_target!r}")
            return normalized
        if fragment is not None:
            if not fragment or normalized not in page_documents:
                raise MarkdownContractError(f"{page}: invalid fragment link {raw_target!r}")
            target_anchors = (
                anchors if normalized == page
                else _page_anchors(page_documents[normalized], normalized)
            )
            if fragment not in target_anchors:
                raise MarkdownContractError(f"{page}: missing anchor for {raw_target!r}")
        return normalized

    for label, raw_target in links:
        normalized = check_target(raw_target)
        if label is not None and "table of contents" in label.lower() and normalized == "README.md":
            toc_links.append((label, raw_target))
    expected_toc_links = 0 if page == "README.md" else 1
    if len(toc_links) != expected_toc_links:
        raise MarkdownContractError(
            f"{page}: expected {expected_toc_links} table-of-contents link(s)"
        )

    if _has_prohibited_claim(claim_text):
        raise MarkdownContractError(f"{page}: prohibited training claim")


def validate_staged_book_pages(book_root: Path, manifest_paths: Sequence[str]) -> None:
    """Validate only Markdown pages that currently exist beneath *book_root*."""

    page_documents = {
        path.relative_to(book_root).as_posix(): path.read_text(encoding="utf-8")
        for path in sorted(book_root.rglob("*.md"))
    }
    manifest_set = set(manifest_paths)
    undeclared = sorted(set(page_documents).difference(manifest_set))
    if undeclared:
        raise MarkdownContractError(f"undeclared staged page {undeclared[0]!r}")
    existing_paths = {
        path.relative_to(book_root).as_posix()
        for path in book_root.rglob("*") if path.is_file()
    }
    for page, document in page_documents.items():
        validate_narrative_page(
            page,
            document,
            manifest_paths=manifest_paths,
            existing_paths=existing_paths,
            page_documents=page_documents,
        )


def validate_book_pages(book_root: Path, manifest: Any, *, skip_smoke: bool) -> None:
    """Validate the exact published Markdown tree and generated page blocks."""

    expected_paths = tuple(page.path for page in manifest.pages)
    expected_set = set(expected_paths)
    smoke_path = "verification/first-run-smoke.md"
    actual_documents = {
        path.relative_to(book_root).as_posix(): path.read_text(encoding="utf-8")
        for path in sorted(book_root.rglob("*.md"))
    }
    actual = set(actual_documents)
    allowed = set(expected_set)
    if skip_smoke and smoke_path not in actual:
        allowed.remove(smoke_path)
    if actual != allowed:
        missing = sorted(allowed - actual)
        extra = sorted(actual - allowed)
        if missing:
            raise MarkdownContractError(f"missing training-book page {missing[0]!r}")
        raise MarkdownContractError(f"undeclared training-book page {extra[0]!r}")

    existing_paths = {
        path.relative_to(book_root).as_posix()
        for path in book_root.rglob("*")
        if path.is_file()
    }
    pages_by_path = {page.path: page for page in manifest.pages}
    for page_path, document in actual_documents.items():
        page = pages_by_path[page_path]
        navigation = render_book_navigation(page.path, page.previous, page.next)
        expected_document = replace_book_blocks(
            document,
            navigation=navigation,
            verification=manifest.required_footer,
        )
        if expected_document != document:
            raise MarkdownContractError(f"{page_path}: generated book blocks are stale")
        if document.count(manifest.required_footer) != 1:
            raise MarkdownContractError(f"{page_path}: expected one generated footer")
        validate_narrative_page(
            page_path,
            document,
            manifest_paths=expected_paths,
            existing_paths=existing_paths,
            page_documents=actual_documents,
        )


def _markdown_text(value: str) -> str:
    escaped = html.escape(value, quote=False)
    return _MARKDOWN_PUNCTUATION.sub(r"\\\1", escaped)


def _code_span(value: str) -> str:
    if "\n" in value or "\r" in value:
        fence = "```"
        while fence in value:
            fence += "`"
        return f"\n{fence}yaml\n{value}\n{fence}"
    longest = max((len(run) for run in re.findall(r"`+", value)), default=0)
    fence = "`" * (longest + 1)
    padding = " " if value.startswith(("`", " ")) or value.endswith(("`", " ")) else ""
    return f"{fence}{padding}{value}{padding}{fence}"


def _json_code(value: Any) -> str:
    return _code_span(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    )


def _words(value: str) -> str:
    return value.replace("-", " ").replace("_", " ").title()


def _applicability(value: Applicability) -> str:
    fields = [
        f"{name}={_code_span(str(item))}"
        for name, item in value.model_dump().items()
        if item is not None
    ]
    return ", ".join(fields) if fields else "all supported configurations"


def _applicabilities(values: Sequence[Applicability]) -> str:
    if not values:
        return "all supported configurations"
    return "; ".join(_applicability(value) for value in values)


def _range(value: Any) -> str:
    if value is None:
        return "not numerically bounded"
    left = "[" if value.minimum_inclusive else "("
    right = "]" if value.maximum_inclusive else ")"
    minimum = "-∞" if value.minimum is None else str(value.minimum)
    maximum = "+∞" if value.maximum is None else str(value.maximum)
    return _code_span(f"{left}{minimum}, {maximum}{right}")


def _default_value(value: SettingDefault) -> str:
    if value.presence == "absent":
        return "absent"
    return f"present as {_json_code(value.value)}"


def _defaults(setting: Setting, kind: str) -> str:
    matches = [value for value in setting.defaults if value.kind == kind]
    if not matches:
        return "not declared"
    return "; ".join(
        f"{_default_value(value)} ({_applicabilities(value.applicability)})"
        for value in matches
    )


def _list_or_none(values: Iterable[str]) -> str:
    rendered = list(values)
    return "; ".join(rendered) if rendered else "none"


def _render_setting(setting: Setting) -> list[str]:
    contract = setting.contract
    locations = _list_or_none(
        f"{_words(location.kind)} {_code_span(location.path)}"
        for location in setting.locations
    )
    accepted_values = (
        "not enumerated"
        if contract.accepted_values is None
        else ", ".join(_json_code(value) for value in contract.accepted_values)
    )
    accepted_types = (
        "not separately constrained"
        if contract.accepted_types is None
        else ", ".join(_code_span(value) for value in contract.accepted_types)
    )
    ui_range = _range(contract.ui_range)
    ui_values = (
        "not enumerated"
        if contract.ui_accepted_values is None
        else ", ".join(_json_code(value) for value in contract.ui_accepted_values)
    )
    suggestions = (
        "none"
        if contract.ui_suggested_values is None
        else ", ".join(_json_code(value) for value in contract.ui_suggested_values)
    )
    architecture_defaults = [
        value for value in setting.defaults
        if any(
            applicability.ui_architecture is not None
            or applicability.engine_architecture is not None
            for applicability in value.applicability
        )
    ]
    overrides = _list_or_none(
        f"{_words(value.kind)} {_default_value(value)} for "
        f"{_applicabilities(value.applicability)}"
        for value in architecture_defaults
    )
    normalizations = _list_or_none(
        f"{_markdown_text(value.description)} ({_applicabilities(value.applicability)})"
        for value in setting.normalizations
    )
    interactions = _list_or_none(
        f"{_words(value.kind)} {_code_span(value.setting)}: "
        f"{_markdown_text(value.description)} ({_applicabilities(value.applicability)})"
        for value in setting.interactions
    )
    aliases = _list_or_none(
        f"{_code_span(value.location)} → {_code_span(value.replacement)} "
        f"({_words(value.status)}, {_words(value.precedence)}): "
        f"{_markdown_text(value.migration)}"
        for value in setting.aliases
    )
    sources = _list_or_none(
        f"{_code_span(value.source)} :: {_code_span(value.symbol)} :: "
        f"{_code_span(value.key)} ({_code_span(value.read_kind)})"
        for value in setting.source_claims
    )
    other_defaults = _list_or_none(
        f"{_words(value.kind)} {_default_value(value)} "
        f"({_applicabilities(value.applicability)})"
        for value in setting.defaults
        if value.kind not in {"ui-created", "engine-fallback"}
    )
    label = "not exposed in the Simple UI" if setting.ui_label is None else _markdown_text(setting.ui_label)
    ui_type = "not exposed" if contract.ui_type is None else _code_span(contract.ui_type)
    ui_presence = (
        "not exposed"
        if contract.ui_type is None
        else f"optional={_code_span(str(contract.ui_optional).lower())}, "
        f"nullable={_code_span(str(contract.ui_nullable).lower())}"
    )
    scales = (
        "none"
        if contract.config_to_ui_scale is None
        else f"config→UI {_json_code(contract.config_to_ui_scale)}, "
        f"UI→config {_json_code(contract.ui_to_config_scale)}"
    )
    collection_length = (
        "not fixed" if contract.collection_length is None
        else _code_span(str(contract.collection_length))
    )
    return [
        f'<a id="{setting.render.anchor}"></a>',
        f"### {_code_span(setting.id)}",
        "",
        _markdown_text(setting.render.description),
        "",
        f"- UI label: {label}",
        f"- Locations: {locations}",
        f"- Surfaces: {', '.join(_code_span(value) for value in setting.surfaces)}",
        f"- UI projection: "
        f"{'none' if setting.ui_projection is None else _code_span(setting.ui_projection)}",
        f"- Scope/lifecycle: {_code_span(setting.scope)} / {_code_span(setting.lifecycle)}",
        f"- Persistence/authority: {_code_span(setting.persistence)} / {_code_span(setting.authority)}",
        f"- Applies to: {_applicabilities(setting.applicability)}",
        f"- Parser/supported/example types: {_code_span(contract.parser_type)} / "
        f"{_code_span(contract.supported_type)} / {_code_span(contract.example_type)}",
        f"- Accepted types/values: {accepted_types}; {accepted_values}",
        f"- Supported range: {_range(contract.range)}; collection length: {collection_length}",
        f"- Null behavior: {_code_span(contract.null)}",
        f"- UI type/presence: {ui_type}; {ui_presence}",
        f"- UI values/range/suggestions: {ui_values}; {ui_range}; {suggestions}",
        f"- UI normalization scales: {scales}",
        f"- UI-created value: {_defaults(setting, 'ui-created')}",
        f"- Engine fallback: {_defaults(setting, 'engine-fallback')}",
        f"- Other runtime/default transitions: {other_defaults}",
        f"- Architecture overrides: {overrides}",
        f"- Normalization: {normalizations}",
        f"- Benefits: {_markdown_text(setting.render.benefits)}",
        f"- Drawbacks: {_markdown_text(setting.render.drawbacks)}",
        f"- Interactions: {interactions}",
        f"- Aliases: {aliases}",
        f"- Example: {_code_span(setting.render.example)}",
        f"- Source symbols: {sources}",
        "",
    ]


def render_settings_catalog_block(settings: Sequence[Setting]) -> str:
    """Render a complete marker-owned block in stable section/id order."""

    anchors: set[str] = set()
    for setting in settings:
        anchor = setting.render.anchor
        if not _ANCHOR.fullmatch(anchor):
            raise MarkdownGenerationError(f"invalid settings catalog anchor {anchor!r}")
        if anchor in anchors:
            raise MarkdownGenerationError(f"duplicate settings catalog anchor {anchor!r}")
        anchors.add(anchor)

    lines = [SETTINGS_CATALOG_START, GENERATED_NOTICE]
    previous_section: str | None = None
    for setting in sorted(settings, key=lambda item: (item.section, item.id)):
        if setting.section != previous_section:
            lines.extend(("", f"## {_markdown_text(_words(setting.section))}", ""))
            previous_section = setting.section
        lines.extend(_render_setting(setting))
    while lines[-1] == "":
        lines.pop()
    lines.append(SETTINGS_CATALOG_END)
    return "\n".join(lines)


def replace_settings_catalog_block(document: str, block: str) -> str:
    """Replace exactly one balanced generated block without touching surrounding prose."""

    if block.count(SETTINGS_CATALOG_START) != 1 or block.count(SETTINGS_CATALOG_END) != 1:
        raise MarkdownGenerationError("rendered block requires exactly one settings catalog marker pair")
    if not block.startswith(SETTINGS_CATALOG_START) or not block.endswith(SETTINGS_CATALOG_END):
        raise MarkdownGenerationError("rendered block markers must bound the complete block")
    if document.count(SETTINGS_CATALOG_START) != 1 or document.count(SETTINGS_CATALOG_END) != 1:
        raise MarkdownGenerationError("reference page requires exactly one settings catalog marker pair")
    start = document.index(SETTINGS_CATALOG_START)
    end = document.index(SETTINGS_CATALOG_END)
    if end < start:
        raise MarkdownGenerationError("settings catalog markers are out of order")
    end += len(SETTINGS_CATALOG_END)
    return f"{document[:start]}{block}{document[end:]}"
