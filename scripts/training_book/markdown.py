"""Deterministic Markdown rendering for generated training-book catalog blocks."""

from __future__ import annotations

import html
import json
import re
from collections.abc import Iterable, Sequence
from typing import Any

from .catalog import Applicability, Setting, SettingDefault


SETTINGS_CATALOG_START = "<!-- settings-catalog:start -->"
SETTINGS_CATALOG_END = "<!-- settings-catalog:end -->"
GENERATED_NOTICE = "<!-- generated; edit settings-catalog.json instead -->"

_ANCHOR = re.compile(r"[A-Za-z][A-Za-z0-9_.:-]*\Z")
_MARKDOWN_PUNCTUATION = re.compile(r"([\\`*_[\]{}#])")


class MarkdownGenerationError(ValueError):
    """Raised when a generated Markdown block cannot be rendered safely."""


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
            lines.extend(("", f"## {_words(setting.section)}", ""))
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
