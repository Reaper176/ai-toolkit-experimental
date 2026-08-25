"""Strict executable contract for the training settings catalog."""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Annotated, Any, Literal, Sequence

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    StringConstraints,
    ValidationError,
    field_validator,
    model_validator,
)

from .discovery import (
    DiscoveredSetting,
    DiscoveryError,
    Exclusion,
    SourceClaim,
    validate_setting_ownership,
)


class CatalogError(ValueError):
    """Raised when catalog data or its committed schema violates the contract."""


_NonBlank = Annotated[
    StrictStr, StringConstraints(strip_whitespace=True, min_length=1)
]
_StableId = Annotated[
    _NonBlank,
    StringConstraints(pattern=r"^[a-z][a-z0-9]*(?:[._-][a-z0-9*]+)*$"),
]
_Numeric = StrictInt | StrictFloat
_SemanticType = Literal[
    "boolean",
    "integer",
    "number",
    "string",
    "path",
    "boolean-list",
    "integer-list",
    "number-list",
    "string-list",
    "object",
    "object-list",
]


_YAML_PATH = re.compile(
    r"^[A-Za-z_][A-Za-z0-9_-]*(?:\[\*\])?"
    r"(?:\.[A-Za-z_][A-Za-z0-9_-]*(?:\[\*\])?)*$"
)
_ENVIRONMENT_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_DOTTED_IDENTITY = re.compile(
    r"^(?:<module>|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)$"
)
_SOURCE_KEY = re.compile(
    r"^(?:<dynamic-environment-name>|[A-Za-z_][A-Za-z0-9_-]*|"
    r"prefix=[A-Za-z0-9_-]+;suffix=[A-Za-z0-9_-]+(?:__[A-Za-z0-9_-]+)?)"
    r"(?:__target=[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)?$"
)
_READ_KIND = re.compile(
    r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*(?:\[\])?$"
)
_NEXT_ROUTE_SEGMENT = re.compile(
    r"^\[(?:\.\.\.)?[A-Za-z_][A-Za-z0-9_]*\]$"
)


def _require_canonical_location(value: str, kind: str = "yaml") -> str:
    if kind == "yaml" and not _YAML_PATH.fullmatch(value):
        raise ValueError(
            "canonical YAML paths use dot-separated names and exact [*] array tokens"
        )
    if kind == "environment" and not _ENVIRONMENT_NAME.fullmatch(value):
        raise ValueError("canonical environment locations use one exact variable name")
    if kind not in {"yaml", "environment"}:
        if (
            any(token in value for token in ("*", "?", "[", "]", "{", "}", "\\"))
            or ".." in value
            or "//" in value
        ):
            raise ValueError("canonical locations must be exact and contain no wildcard")
    return value


def _require_portable_source(value: str) -> str:
    path = PurePosixPath(value)
    parts = value.split("/")
    invalid_part = any(
        any(token in part for token in ("*", "?", "{", "}"))
        or (
            any(token in part for token in ("[", "]"))
            and not _NEXT_ROUTE_SEGMENT.fullmatch(part)
        )
        or (".." in part and not _NEXT_ROUTE_SEGMENT.fullmatch(part))
        for part in parts
    )
    if (
        path.is_absolute()
        or "\\" in value
        or ":" in value
        or any(part in {"", ".", ".."} for part in parts)
        or path.as_posix() != value
        or invalid_part
    ):
        raise ValueError("source must be a portable confined repo-relative path")
    return value


def _require_exact_identity(value: str, *, read_kind: bool = False) -> str:
    pattern = _READ_KIND if read_kind else _DOTTED_IDENTITY
    if not pattern.fullmatch(value):
        raise ValueError("identity must be exact and contain no wildcard or meta syntax")
    return value


def _require_finite_number(value: int | float) -> None:
    if isinstance(value, int):
        return
    if not math.isfinite(value):
        raise ValueError("numeric JSON values must be finite")


def _require_finite_json(value: Any) -> Any:
    if value is None or isinstance(value, (bool, str)):
        return value
    if isinstance(value, (int, float)):
        _require_finite_number(value)
        return value
    if isinstance(value, list):
        for item in value:
            _require_finite_json(item)
        return value
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise ValueError("default values must contain only JSON string object keys")
        for item in value.values():
            _require_finite_json(item)
        return value
    raise ValueError("default values must contain only finite JSON values")


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class CatalogLocation(_StrictModel):
    kind: Literal["yaml", "cli", "environment", "inline-prompt", "ui-state"]
    path: _NonBlank

    @model_validator(mode="after")
    def _canonical_identity(self) -> "CatalogLocation":
        _require_canonical_location(self.path, self.kind)
        return self


class Applicability(_StrictModel):
    job_type: _NonBlank | None = None
    process_type: _NonBlank | None = None
    network_type: _NonBlank | None = None
    ui_architecture: _NonBlank | None = None
    engine_architecture: _NonBlank | None = None
    optimizer: _NonBlank | None = None
    optimizer_prefix: _NonBlank | None = None
    optimizer_suffix: _NonBlank | None = None
    optimizer_exclude_prefix: _NonBlank | None = None
    scheduler: _NonBlank | None = None
    scheduler_prefix: _NonBlank | None = None
    scheduler_suffix: _NonBlank | None = None
    scheduler_exclude_prefix: _NonBlank | None = None

    @model_validator(mode="after")
    def _not_empty(self) -> "Applicability":
        if not any(
            value is not None
            for value in (
                self.job_type,
                self.process_type,
                self.network_type,
                self.ui_architecture,
                self.engine_architecture,
                self.optimizer,
                self.optimizer_prefix,
                self.optimizer_suffix,
                self.optimizer_exclude_prefix,
                self.scheduler,
                self.scheduler_prefix,
                self.scheduler_suffix,
                self.scheduler_exclude_prefix,
            )
        ):
            raise ValueError("applicability predicate must not be empty")
        for dimension in ("optimizer", "scheduler"):
            exact = getattr(self, dimension)
            prefix = getattr(self, f"{dimension}_prefix")
            suffix = getattr(self, f"{dimension}_suffix")
            excluded = getattr(self, f"{dimension}_exclude_prefix")
            if exact is not None and any(
                value is not None for value in (prefix, suffix, excluded)
            ):
                raise ValueError(
                    f"{dimension} exact and pattern applicability are mutually exclusive"
                )
            if excluded is not None:
                if prefix is None:
                    raise ValueError(
                        f"{dimension}_exclude_prefix requires {dimension}_prefix"
                    )
                if not excluded.startswith(prefix):
                    raise ValueError(
                        f"{dimension}_exclude_prefix must refine {dimension}_prefix"
                    )
        return self


class NumericRange(_StrictModel):
    minimum: _Numeric | None
    maximum: _Numeric | None
    minimum_inclusive: StrictBool
    maximum_inclusive: StrictBool

    @field_validator("minimum", "maximum")
    @classmethod
    def _finite_endpoints(cls, value: int | float | None) -> int | float | None:
        if value is not None:
            _require_finite_number(value)
        return value

    @model_validator(mode="after")
    def _ordered(self) -> "NumericRange":
        if (
            self.minimum is not None
            and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError("range minimum must not exceed maximum")
        return self


class SettingContract(_StrictModel):
    parser_type: _NonBlank
    supported_type: _NonBlank
    ui_type: _SemanticType | None
    ui_optional: StrictBool | None = None
    ui_nullable: StrictBool | None = None
    ui_accepted_values: tuple[Any, ...] | None = None
    ui_range: NumericRange | None = None
    example_type: _SemanticType
    accepted_values: tuple[Any, ...] | None
    accepted_types: tuple[_SemanticType, ...] | None = None
    collection_length: StrictInt | None = None
    range: NumericRange | None
    null: Literal["accepted", "rejected", "normalized-to-absent"]

    @field_validator("accepted_values", "ui_accepted_values")
    @classmethod
    def _finite_accepted_values(
        cls, values: tuple[Any, ...] | None
    ) -> tuple[Any, ...] | None:
        if values is not None:
            for value in values:
                _require_finite_json(value)
        return values

    @model_validator(mode="after")
    def _accepted_values_and_range(self) -> "SettingContract":
        if self.accepted_types is not None:
            if not self.accepted_types or len(self.accepted_types) != len(
                set(self.accepted_types)
            ):
                raise ValueError("accepted_types must be nonempty and unique")
        if self.collection_length is not None:
            if self.collection_length < 1:
                raise ValueError("collection_length must be positive")
            if self.accepted_types is None or not any(
                value.endswith("-list") for value in self.accepted_types
            ):
                raise ValueError(
                    "collection_length requires a list member in accepted_types"
                )
            scalar_types = {
                value for value in self.accepted_types if not value.endswith("-list")
            }
            list_bases = {
                value.removesuffix("-list")
                for value in self.accepted_types
                if value.endswith("-list")
            }
            if scalar_types and not list_bases.issubset(scalar_types):
                raise ValueError(
                    "collection_length list members must match accepted scalar types"
                )
        if self.accepted_values is not None and self.range is not None:
            if not self.accepted_values or any(
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or (isinstance(value, float) and not math.isfinite(value))
                for value in self.accepted_values
            ):
                raise ValueError(
                    "accepted_values and range are mutually exclusive unless the "
                    "range constrains a numeric enum"
                )
            for value in self.accepted_values:
                below_minimum = self.range.minimum is not None and (
                    value < self.range.minimum
                    or (
                        value == self.range.minimum
                        and not self.range.minimum_inclusive
                    )
                )
                above_maximum = self.range.maximum is not None and (
                    value > self.range.maximum
                    or (
                        value == self.range.maximum
                        and not self.range.maximum_inclusive
                    )
                )
                if below_minimum or above_maximum:
                    raise ValueError(
                        "accepted_values must all be inside the numeric range"
                    )
        return self


class SettingDefault(_StrictModel):
    kind: Literal[
        "ui-created",
        "engine-fallback",
        "on-select",
        "on-leave",
        "runtime-forced",
    ]
    presence: Literal["absent", "present"]
    value: Any = Field(default=None)
    applicability: tuple[Applicability, ...]

    @field_validator("value")
    @classmethod
    def _finite_json_value(cls, value: Any) -> Any:
        return _require_finite_json(value)

    @model_validator(mode="before")
    @classmethod
    def _authority_is_explicit(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("kind") == "default":
            raise ValueError("default label does not identify its authority")
        return data

    @model_validator(mode="after")
    def _presence_matches_value(self) -> "SettingDefault":
        supplied = "value" in self.model_fields_set
        if self.presence == "absent" and supplied:
            raise ValueError("presence absent forbids a value")
        if self.presence == "present" and not supplied:
            raise ValueError("presence present requires a value, including explicit null")
        return self


class Normalization(_StrictModel):
    description: _NonBlank
    applicability: tuple[Applicability, ...]


class Interaction(_StrictModel):
    setting: _StableId
    kind: Literal[
        "requires", "conflicts", "overrides", "constrains", "affects", "fallback"
    ]
    description: _NonBlank
    applicability: tuple[Applicability, ...]


class Alias(_StrictModel):
    location: _NonBlank
    replacement: _StableId
    precedence: Literal["replacement-wins", "alias-wins", "error-on-both"]
    migration: _NonBlank
    status: Literal["legacy", "deprecated", "removed"]

    @field_validator("location")
    @classmethod
    def _canonical_arrays(cls, value: str) -> str:
        return _require_canonical_location(value)


class CatalogSourceClaim(_StrictModel):
    source: _NonBlank
    symbol: _NonBlank
    key: _NonBlank
    read_kind: _NonBlank

    @field_validator("source")
    @classmethod
    def _portable_source(cls, value: str) -> str:
        return _require_portable_source(value)

    @field_validator("symbol")
    @classmethod
    def _exact_identity(cls, value: str) -> str:
        return _require_exact_identity(value)

    @field_validator("key")
    @classmethod
    def _exact_key(cls, value: str) -> str:
        if not _SOURCE_KEY.fullmatch(value):
            raise ValueError(
                "identity must be exact and contain no wildcard or meta syntax"
            )
        return value

    @field_validator("read_kind")
    @classmethod
    def _exact_read_kind(cls, value: str) -> str:
        return _require_exact_identity(value, read_kind=True)


class RenderMetadata(_StrictModel):
    page: _NonBlank
    anchor: _NonBlank
    description: _NonBlank
    benefits: _NonBlank
    drawbacks: _NonBlank
    example: _NonBlank


class Setting(_StrictModel):
    id: _StableId
    ui_label: _NonBlank | None
    scope: Literal[
        "root",
        "job",
        "process",
        "model",
        "network",
        "train",
        "dataset",
        "save",
        "sample",
        "logging",
        "optimizer",
        "scheduler",
        "cli",
        "environment",
        "ui-state",
    ]
    locations: tuple[CatalogLocation, ...] = Field(min_length=1)
    surfaces: tuple[Literal["simple-ui", "advanced-yaml", "cli"], ...] = Field(
        min_length=1
    )
    persistence: Literal[
        "config", "job-json", "database", "runtime", "transient",
        "browser-storage",
    ]
    authority: Literal["user", "ui-derived", "server-overwritten", "runtime-forced"]
    ui_projection: Literal[
        "discriminator-control", "composite-option"
    ] | None = None
    lifecycle: Literal[
        "supported", "legacy", "deprecated", "experimental", "unconsumed"
    ]
    applicability: tuple[Applicability, ...]
    contract: SettingContract
    defaults: tuple[SettingDefault, ...]
    normalizations: tuple[Normalization, ...]
    interactions: tuple[Interaction, ...]
    aliases: tuple[Alias, ...]
    section: _NonBlank
    source_claims: tuple[CatalogSourceClaim, ...]
    render: RenderMetadata

    @model_validator(mode="after")
    def _surface_metadata(self) -> "Setting":
        is_visible = "simple-ui" in self.surfaces
        if is_visible and self.ui_label is None:
            raise ValueError("visible simple-ui controls require ui_label")
        if not is_visible and self.ui_label is not None:
            raise ValueError("advanced/CLI-only entries require ui_label null")
        if is_visible and self.contract.ui_type is None:
            raise ValueError("visible simple-ui controls require contract.ui_type")
        if not is_visible and self.contract.ui_type is not None:
            raise ValueError("advanced/CLI-only entries require contract.ui_type null")
        if len(set(self.surfaces)) != len(self.surfaces):
            raise ValueError("surfaces must not contain duplicates")
        locations = {(item.kind, item.path) for item in self.locations}
        if len(locations) != len(self.locations):
            raise ValueError("locations must not contain duplicates")
        return self


class SettingsCatalog(_StrictModel):
    schema_version: StrictInt
    settings: tuple[Setting, ...]
    ui_claims: tuple["UiFactOwner", ...] = ()

    @field_validator("schema_version")
    @classmethod
    def _schema_version_one(cls, value: int) -> int:
        if value != 1:
            raise ValueError("schema_version must be 1")
        return value


class UiUndefinedValue(_StrictModel):
    kind: Literal["undefined"]


class UiNullValue(_StrictModel):
    kind: Literal["null"]


class UiBooleanValue(_StrictModel):
    kind: Literal["boolean"]
    value: StrictBool


class UiNumberValue(_StrictModel):
    kind: Literal["number"]
    value: _Numeric

    @field_validator("value")
    @classmethod
    def _finite(cls, value: int | float) -> int | float:
        _require_finite_number(value)
        return value


class UiStringValue(_StrictModel):
    kind: Literal["string"]
    value: StrictStr


class UiArrayValue(_StrictModel):
    kind: Literal["array"]
    items: tuple["UiValue", ...]


class UiObjectEntry(_StrictModel):
    key: StrictStr
    value: "UiValue"


class UiObjectValue(_StrictModel):
    kind: Literal["object"]
    entries: tuple[UiObjectEntry, ...]

    @model_validator(mode="after")
    def _canonical_entries(self) -> "UiObjectValue":
        keys = tuple(item.key for item in self.entries)
        if keys != tuple(sorted(keys)) or len(keys) != len(set(keys)):
            raise ValueError("object entries must have unique code-point-sorted keys")
        return self


UiValue = Annotated[
    UiUndefinedValue | UiNullValue | UiBooleanValue | UiNumberValue
    | UiStringValue | UiArrayValue | UiObjectValue,
    Field(discriminator="kind"),
]


class UiPresence(_StrictModel):
    present: StrictBool
    value: UiValue | None = None

    @model_validator(mode="after")
    def _presence_matches_value(self) -> "UiPresence":
        supplied = "value" in self.model_fields_set
        if self.present and not supplied:
            raise ValueError("present fact requires an own value")
        if not self.present and supplied:
            raise ValueError("absent fact forbids a value")
        if supplied and self.value is None:
            raise ValueError("value must use the tagged null representation")
        return self


class UiStaticJsx(_StrictModel):
    present: StrictBool
    text_literals: tuple[StrictStr, ...] | None = None
    code_literals: tuple[StrictStr, ...] | None = None
    link_hrefs: tuple[StrictStr, ...] | None = None

    @model_validator(mode="after")
    def _projection_presence(self) -> "UiStaticJsx":
        supplied = {
            key for key in ("text_literals", "code_literals", "link_hrefs")
            if key in self.model_fields_set
        }
        if self.present and supplied != {
            "text_literals", "code_literals", "link_hrefs"
        }:
            raise ValueError("present JSX fact requires all projection arrays")
        if not self.present and supplied:
            raise ValueError("absent JSX fact forbids projection arrays")
        return self


class UiPredicate(_StrictModel):
    kind: Literal["always", "truthy", "nonblank-string", "not", "and", "or"]
    path: StrictStr | None = None
    operand: UiPredicate | None = None
    operands: tuple[UiPredicate, UiPredicate] | None = None

    @model_validator(mode="after")
    def _closed_shape(self) -> "UiPredicate":
        supplied = self.model_fields_set - {"kind"}
        expected = {
            "always": set(),
            "truthy": {"path"},
            "nonblank-string": {"path"},
            "not": {"operand"},
            "and": {"operands"},
            "or": {"operands"},
        }[self.kind]
        if supplied != expected:
            raise ValueError(f"predicate {self.kind} requires exactly {sorted(expected)!r}")
        if self.path is not None:
            _require_canonical_location(self.path)
        return self


class UiOptionChoice(_StrictModel):
    value: StrictStr
    label: StrictStr


class UiGetValueCase(_StrictModel):
    condition: UiPredicate
    return_value: UiValue


class UiOptionWrite(_StrictModel):
    selected_value: StrictStr
    path: StrictStr
    value: UiValue
    guard: UiPredicate

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiCustomOption(_StrictModel):
    label: StrictStr
    options: tuple[UiOptionChoice, ...]
    doc: UiStaticJsx
    get_value_cases: tuple[UiGetValueCase, ...]
    writes: tuple[UiOptionWrite, ...]


class UiCustomOptions(_StrictModel):
    present: StrictBool
    value: tuple[UiCustomOption, ...] | None = None

    @model_validator(mode="after")
    def _presence(self) -> "UiCustomOptions":
        supplied = "value" in self.model_fields_set
        if supplied != self.present or (supplied and self.value is None):
            raise ValueError("custom options presence/value mismatch")
        return self


class UiArchitectureDefault(_StrictModel):
    declaration_path: StrictStr
    path: StrictStr
    selected: UiPresence
    unselected: UiPresence

    @field_validator("declaration_path", "path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiArchitectureContainer(_StrictModel):
    path: StrictStr
    selected_present: StrictBool
    unselected_present: StrictBool

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiModelArchitecture(_StrictModel):
    name: StrictStr
    label: StrictStr
    group: StrictStr
    model_path: UiPresence
    gate_url: UiPresence
    is_video_model: UiPresence
    has_multiline_prompts: UiPresence
    accuracy_recovery_adapters: UiPresence
    sample_tags: UiPresence
    custom_model_select_options: UiCustomOptions
    model_notes: UiStaticJsx
    controls: tuple[StrictStr, ...]
    defaults: tuple[UiArchitectureDefault, ...]
    default_containers: tuple[UiArchitectureContainer, ...]
    disable_sections: tuple[StrictStr, ...]
    additional_sections: tuple[StrictStr, ...]


class UiDefault(_StrictModel):
    path: StrictStr
    value: UiPresence
    source_path: StrictStr
    symbol: StrictStr

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)

    @field_validator("source_path")
    @classmethod
    def _portable_source(cls, value: str) -> str:
        return _require_portable_source(value)


class UiValueContract(_StrictModel):
    ui_type: _SemanticType | None
    widget_kind: Literal[
        "checkbox", "number", "text", "multiline", "path", "select",
        "json", "read-only",
    ] | None
    optional: StrictBool
    nullable: StrictBool
    accepted_values: tuple[UiValue, ...] | None = None
    minimum: _Numeric | None = None
    maximum: _Numeric | None = None

    @field_validator("minimum", "maximum")
    @classmethod
    def _finite(cls, value: int | float | None) -> int | float | None:
        if value is not None:
            _require_finite_number(value)
        return value

    @model_validator(mode="after")
    def _ordered(self) -> "UiValueContract":
        if (
            self.minimum is not None and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError("minimum must not exceed maximum")
        return self


class UiBehaviorLiteralPayload(_StrictModel):
    kind: Literal["literal"]
    value: UiValue


class UiBehaviorUndefinedPayload(_StrictModel):
    kind: Literal["undefined"]


class UiBehaviorCopyPayload(_StrictModel):
    kind: Literal["copy"]
    source_path: StrictStr
    fallback: UiValue | None = None

    @field_validator("source_path")
    @classmethod
    def _canonical_source_path(cls, value: str) -> str:
        return _require_canonical_location(value)

    @model_validator(mode="after")
    def _fallback_must_be_supplied_if_present(
        self,
    ) -> "UiBehaviorCopyPayload":
        if "fallback" in self.model_fields_set and self.fallback is None:
            raise ValueError("copy fallback must be a tagged value")
        return self


class UiBehaviorPromptMapPayload(_StrictModel):
    kind: Literal["map-prompt-objects"]
    source_path: StrictStr
    item_key: Literal["prompt"]

    @field_validator("source_path")
    @classmethod
    def _canonical_source_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiBehaviorArchitectureNamePayload(_StrictModel):
    kind: Literal["architecture-name"]


class UiBehaviorArchitectureFieldPayload(_StrictModel):
    kind: Literal["architecture-field"]
    field: Literal["controls"]


class UiBehaviorArchitectureDefaultPayload(_StrictModel):
    kind: Literal["architecture-default"]
    phase: Literal["revert", "apply"]
    value_index: Literal[0, 1]

    @model_validator(mode="after")
    def _phase_matches_index(self) -> "UiBehaviorArchitectureDefaultPayload":
        if (self.phase, self.value_index) not in {("revert", 1), ("apply", 0)}:
            raise ValueError("architecture-default phase/value_index mismatch")
        return self


UiBehaviorPayload = Annotated[
    UiBehaviorLiteralPayload | UiBehaviorUndefinedPayload
    | UiBehaviorCopyPayload | UiBehaviorPromptMapPayload
    | UiBehaviorArchitectureNamePayload
    | UiBehaviorArchitectureFieldPayload
    | UiBehaviorArchitectureDefaultPayload,
    Field(discriminator="kind"),
]


class UiBehaviorContract(_StrictModel):
    guard: Literal[
        "prompts-nonempty-array", "after-prompts-write",
        "type-is-ui-trainer", "property-present", "property-absent",
        "platform-mac", "cleaned-model-changed", "section-unsupported",
        "section-supported-property-absent", "architecture-change",
        "multi-control", "single-control", "no-control",
        "source-nonempty-target-empty", "source-nonempty",
        "frame-count-unsupported", "auto-frame-count-unsupported",
        "sample-control-unsupported", "revert-current-defaults",
        "apply-next-defaults",
    ]
    operation: Literal["write", "delete"]
    sources: tuple[StrictStr, ...]
    payload: UiBehaviorPayload

    @field_validator("sources")
    @classmethod
    def _canonical_sources(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        for value in values:
            _require_canonical_location(value)
        if values != tuple(sorted(values)) or len(values) != len(set(values)):
            raise ValueError("sources must be unique and code-point sorted")
        return values

    @model_validator(mode="after")
    def _operation_matches_payload(self) -> "UiBehaviorContract":
        if self.operation == "delete":
            if not isinstance(self.payload, UiBehaviorUndefinedPayload):
                raise ValueError("delete requires undefined payload")
        elif isinstance(self.payload, UiBehaviorUndefinedPayload):
            raise ValueError("write forbids undefined payload")
        if isinstance(self.payload, UiBehaviorArchitectureNamePayload) and (
            self.operation != "write" or self.sources
        ):
            raise ValueError("architecture-name requires a source-free write")
        if isinstance(
            self.payload, (UiBehaviorCopyPayload, UiBehaviorPromptMapPayload)
        ) and self.payload.source_path not in self.sources:
            raise ValueError("payload source_path must be listed in sources")
        return self


class UiSourceFact(_StrictModel):
    source_path: StrictStr
    symbol: StrictStr
    path: StrictStr
    kind: Literal["setter", "default", "doc", "setting", "server-state"]
    ui_label: UiPresence
    value_contract: UiValueContract
    behavior_contract: UiBehaviorContract | None = None

    @model_validator(mode="after")
    def _behavior_must_be_supplied_if_present(self) -> "UiSourceFact":
        if (
            "behavior_contract" in self.model_fields_set
            and self.behavior_contract is None
        ):
            raise ValueError("behavior_contract must be a tagged object")
        return self

    @field_validator("source_path")
    @classmethod
    def _portable_source(cls, value: str) -> str:
        return _require_portable_source(value)

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiArchitectureTransition(_StrictModel):
    architecture: StrictStr
    path: StrictStr
    selected: UiPresence
    unselected: UiPresence

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiArchitectureValuePayload(_StrictModel):
    payload_kind: Literal["value"]
    value: UiValue


class UiArchitecturePresencePayload(_StrictModel):
    payload_kind: Literal["presence"]
    value: UiPresence


class UiArchitectureJsxPayload(_StrictModel):
    payload_kind: Literal["jsx"]
    value: UiStaticJsx


class UiArchitectureCustomOptionsPayload(_StrictModel):
    payload_kind: Literal["custom-options"]
    value: UiCustomOptions


UiArchitecturePayload = Annotated[
    UiArchitectureValuePayload | UiArchitecturePresencePayload
    | UiArchitectureJsxPayload | UiArchitectureCustomOptionsPayload,
    Field(discriminator="payload_kind"),
]


class UiOwnedSourceFact(UiSourceFact):
    fact_type: Literal["source-claim"]


class UiOwnedDefaultFact(UiDefault):
    fact_type: Literal["ui-default"]


class UiOwnedArchitectureTransition(UiArchitectureTransition):
    fact_type: Literal["architecture-transition"]


class UiOwnedArchitectureField(_StrictModel):
    fact_type: Literal["architecture-field"]
    architecture: StrictStr
    field: Literal[
        "label", "group", "model_path", "gate_url", "is_video_model",
        "has_multiline_prompts", "accuracy_recovery_adapters", "sample_tags",
        "custom_model_select_options", "model_notes", "controls",
        "disable_sections", "additional_sections",
    ]
    payload: UiArchitecturePayload

    @model_validator(mode="after")
    def _field_payload_matches(self) -> "UiOwnedArchitectureField":
        expected = {
            "label": "value",
            "group": "value",
            "model_path": "presence",
            "gate_url": "presence",
            "is_video_model": "presence",
            "has_multiline_prompts": "presence",
            "accuracy_recovery_adapters": "presence",
            "sample_tags": "presence",
            "custom_model_select_options": "custom-options",
            "model_notes": "jsx",
            "controls": "value",
            "disable_sections": "value",
            "additional_sections": "value",
        }[self.field]
        if self.payload.payload_kind != expected:
            raise ValueError(
                f"architecture field {self.field} requires {expected} payload"
            )
        if self.field in {"label", "group"}:
            if (
                not isinstance(self.payload, UiArchitectureValuePayload)
                or not isinstance(self.payload.value, UiStringValue)
            ):
                raise ValueError(
                    f"architecture field {self.field} requires a tagged string value"
                )
        if self.field in {
            "controls", "disable_sections", "additional_sections",
        }:
            if (
                not isinstance(self.payload, UiArchitectureValuePayload)
                or not isinstance(self.payload.value, UiArrayValue)
                or not all(
                    isinstance(item, UiStringValue)
                    for item in self.payload.value.items
                )
            ):
                raise ValueError(
                    f"architecture field {self.field} requires an array of "
                    "tagged string values"
                )
        return self


class UiOwnedArchitectureDefault(_StrictModel):
    fact_type: Literal["architecture-default"]
    architecture: StrictStr
    declaration_path: StrictStr
    path: StrictStr
    selected: UiPresence
    unselected: UiPresence

    @field_validator("declaration_path", "path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


class UiOwnedArchitectureContainer(_StrictModel):
    fact_type: Literal["architecture-container"]
    architecture: StrictStr
    path: StrictStr
    selected_present: StrictBool
    unselected_present: StrictBool

    @field_validator("path")
    @classmethod
    def _canonical_path(cls, value: str) -> str:
        return _require_canonical_location(value)


UiOwnedFact = Annotated[
    UiOwnedSourceFact | UiOwnedDefaultFact | UiOwnedArchitectureTransition
    | UiOwnedArchitectureField | UiOwnedArchitectureDefault
    | UiOwnedArchitectureContainer,
    Field(discriminator="fact_type"),
]


class UiFactOwner(_StrictModel):
    setting_id: _StableId
    fact: UiOwnedFact


class UiFactExclusion(_StrictModel):
    fact: UiOwnedFact
    reason: Literal[
        "architecture-projected-control",
        "structural-architecture-metadata",
        "structural-empty-container",
        "server-owned-value",
        "transient-ui-state",
        "display-only-control",
        "runtime-derived-ui-state",
    ]


class UiExclusionsEnvelope(_StrictModel):
    schema_version: Literal[1]
    exclusions: tuple[Any, ...]
    ui_exclusions: tuple[UiFactExclusion, ...] = ()

    @model_validator(mode="after")
    def _unique_ui_exclusions(self) -> "UiExclusionsEnvelope":
        identities = tuple(
            item.fact.model_dump_json() for item in self.ui_exclusions
        )
        if len(identities) != len(set(identities)):
            raise ValueError("duplicate UI exclusion")
        return self


SettingsCatalog.model_rebuild()


class TrainingBookUiFacts(_StrictModel):
    schema_version: Literal[1]
    model_architectures: tuple[UiModelArchitecture, ...]
    defaults: tuple[UiDefault, ...]
    config_claims: tuple[UiSourceFact, ...]
    global_settings: tuple[UiSourceFact, ...]
    architecture_transitions: tuple[UiArchitectureTransition, ...]

    @model_validator(mode="after")
    def _unique_identities(self) -> "TrainingBookUiFacts":
        architecture_names = tuple(item.name for item in self.model_architectures)
        if len(architecture_names) != len(set(architecture_names)):
            raise ValueError("model_architectures contains duplicate names")
        claims = self.config_claims + self.global_settings
        claim_ids = tuple(
            (item.source_path, item.symbol, item.path, item.kind) for item in claims
        )
        if len(claim_ids) != len(set(claim_ids)):
            raise ValueError("UI facts contain duplicate source claims")
        transition_ids = tuple(
            (item.architecture, item.path) for item in self.architecture_transitions
        )
        if len(transition_ids) != len(set(transition_ids)):
            raise ValueError("UI facts contain duplicate architecture transitions")
        unknown = sorted(
            set(item.architecture for item in self.architecture_transitions)
            - set(architecture_names)
        )
        if unknown:
            raise ValueError(f"architecture transitions name unknown models: {unknown!r}")
        return self


UiFactScope = Literal["ui-defaults-transitions", "ui-server-global"]


@dataclass(frozen=True)
class UiProjectedFact:
    """One exact emitted atomic fact and its staged ownership slice."""

    scope: UiFactScope
    fact: UiOwnedFact


def _architecture_field_fact(
    architecture: str,
    field: str,
    payload: UiArchitecturePayload,
) -> UiOwnedArchitectureField:
    return UiOwnedArchitectureField.model_validate({
        "fact_type": "architecture-field",
        "architecture": architecture,
        "field": field,
        "payload": payload.model_dump(mode="json", exclude_unset=True),
    })


def _string_array_value(values: tuple[str, ...]) -> UiArrayValue:
    return UiArrayValue(
        kind="array",
        items=tuple(UiStringValue(kind="string", value=value) for value in values),
    )


def project_training_book_ui_facts(
    facts: TrainingBookUiFacts,
) -> tuple[UiProjectedFact, ...]:
    """Expand emitted UI state into exact, independently owned atomic facts."""

    config_scope: UiFactScope = "ui-defaults-transitions"
    global_scope: UiFactScope = "ui-server-global"
    projected: list[UiProjectedFact] = []

    for claim in facts.config_claims:
        scope = global_scope if claim.kind == "server-state" else config_scope
        projected.append(UiProjectedFact(
            scope,
            UiOwnedSourceFact(
                fact_type="source-claim",
                **claim.model_dump(mode="python", exclude_unset=True),
            ),
        ))
    for claim in facts.global_settings:
        projected.append(UiProjectedFact(
            global_scope,
            UiOwnedSourceFact(
                fact_type="source-claim",
                **claim.model_dump(mode="python", exclude_unset=True),
            ),
        ))
    for default in facts.defaults:
        projected.append(UiProjectedFact(
            config_scope,
            UiOwnedDefaultFact(
                fact_type="ui-default",
                **default.model_dump(mode="python", exclude_unset=True),
            ),
        ))
    for transition in facts.architecture_transitions:
        projected.append(UiProjectedFact(
            config_scope,
            UiOwnedArchitectureTransition(
                fact_type="architecture-transition",
                **transition.model_dump(mode="python", exclude_unset=True),
            ),
        ))

    for architecture in facts.model_architectures:
        value_fields = {
            "label": UiStringValue(kind="string", value=architecture.label),
            "group": UiStringValue(kind="string", value=architecture.group),
            "controls": _string_array_value(architecture.controls),
            "disable_sections": _string_array_value(
                architecture.disable_sections
            ),
            "additional_sections": _string_array_value(
                architecture.additional_sections
            ),
        }
        for field, value in value_fields.items():
            projected.append(UiProjectedFact(
                config_scope,
                _architecture_field_fact(
                    architecture.name,
                    field,
                    UiArchitectureValuePayload(payload_kind="value", value=value),
                ),
            ))
        for field in (
            "model_path", "gate_url", "is_video_model",
            "has_multiline_prompts", "accuracy_recovery_adapters",
            "sample_tags",
        ):
            projected.append(UiProjectedFact(
                config_scope,
                _architecture_field_fact(
                    architecture.name,
                    field,
                    UiArchitecturePresencePayload(
                        payload_kind="presence", value=getattr(architecture, field)
                    ),
                ),
            ))
        projected.append(UiProjectedFact(
            config_scope,
            _architecture_field_fact(
                architecture.name,
                "custom_model_select_options",
                UiArchitectureCustomOptionsPayload(
                    payload_kind="custom-options",
                    value=architecture.custom_model_select_options,
                ),
            ),
        ))
        projected.append(UiProjectedFact(
            config_scope,
            _architecture_field_fact(
                architecture.name,
                "model_notes",
                UiArchitectureJsxPayload(
                    payload_kind="jsx", value=architecture.model_notes
                ),
            ),
        ))
        for default in architecture.defaults:
            projected.append(UiProjectedFact(
                config_scope,
                UiOwnedArchitectureDefault(
                    fact_type="architecture-default",
                    architecture=architecture.name,
                    **default.model_dump(mode="python", exclude_unset=True),
                ),
            ))
        for container in architecture.default_containers:
            projected.append(UiProjectedFact(
                config_scope,
                UiOwnedArchitectureContainer(
                    fact_type="architecture-container",
                    architecture=architecture.name,
                    **container.model_dump(mode="python"),
                ),
            ))

    identities = tuple(item.fact.model_dump_json() for item in projected)
    if len(identities) != len(set(identities)):
        raise CatalogError("emitted UI facts contain duplicate atomic facts")
    return tuple(projected)


def _format_validation_error(error: ValidationError) -> str:
    details = []
    for item in error.errors(include_url=False):
        location = ".".join(str(part) for part in item["loc"])
        details.append(f"{location}: {item['msg']}")
    return "; ".join(details)


def validate_training_book_ui_facts(data: Any) -> TrainingBookUiFacts:
    """Validate the strict, tagged UI fact interchange contract."""

    try:
        # JSON arrays intentionally deserialize as lists; tuple annotations make
        # the validated result immutable while strict scalar types prevent coercion.
        return TrainingBookUiFacts.model_validate(data)
    except ValidationError as error:
        raise CatalogError(
            f"training book UI facts are invalid: {_format_validation_error(error)}"
        ) from error


def load_training_book_ui_facts(path: Path) -> TrainingBookUiFacts:
    """Load one emitted UI fact file without accepting JSON extensions."""

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise CatalogError(f"training book UI facts must be valid JSON: {error}") from error
    return validate_training_book_ui_facts(data)


_UNREPRESENTABLE_UI_VALUE = object()


def _ui_value_as_json(value: UiValue) -> object:
    if isinstance(value, UiUndefinedValue):
        return _UNREPRESENTABLE_UI_VALUE
    if isinstance(value, UiNullValue):
        return None
    if isinstance(value, (UiBooleanValue, UiNumberValue, UiStringValue)):
        return value.value
    if isinstance(value, UiArrayValue):
        items = tuple(_ui_value_as_json(item) for item in value.items)
        if _UNREPRESENTABLE_UI_VALUE in items:
            return _UNREPRESENTABLE_UI_VALUE
        return list(items)
    if isinstance(value, UiObjectValue):
        entries = {
            entry.key: _ui_value_as_json(entry.value) for entry in value.entries
        }
        if _UNREPRESENTABLE_UI_VALUE in entries.values():
            return _UNREPRESENTABLE_UI_VALUE
        return entries
    raise AssertionError(f"unknown UI value model {type(value)!r}")


def _setting_paths(setting: Setting) -> set[str]:
    return {
        *(location.path for location in setting.locations),
        *(alias.location for alias in setting.aliases),
    }


def _validate_setting_source_contract(
    setting: Setting,
    fact: UiOwnedSourceFact,
    settings: dict[str, Setting],
) -> None:
    if fact.path not in _setting_paths(setting):
        targets = tuple(
            settings.get(interaction.setting)
            for interaction in setting.interactions
            if interaction.kind == "affects"
        )
        is_exact_mediator = (
            setting.ui_projection is not None
            and setting.scope == "ui-state"
            and not setting.source_claims
            and all(location.kind == "ui-state" for location in setting.locations)
            and bool(targets)
            and all(
                target is not None and fact.path in _setting_paths(target)
                for target in targets
            )
        )
        if not is_exact_mediator:
            raise CatalogError(
                f"UI owner {setting.id!r} does not declare emitted path "
                f"{fact.path!r} or an exact projected target"
            )
    if fact.kind != "setting":
        return
    if "simple-ui" not in setting.surfaces:
        raise CatalogError(
            f"UI owner {setting.id!r} lacks the simple-ui surface"
        )
    emitted_label: str | None = None
    if fact.ui_label.present:
        if not isinstance(fact.ui_label.value, UiStringValue):
            raise CatalogError(
                f"UI owner {setting.id!r} has a non-string emitted label"
            )
        emitted_label = fact.ui_label.value.value
    if setting.ui_label != emitted_label:
        raise CatalogError(
            f"UI owner {setting.id!r} label mismatch: emitted "
            f"{emitted_label!r}, catalog {setting.ui_label!r}"
        )

    emitted = fact.value_contract
    contract = setting.contract
    if contract.ui_type != emitted.ui_type:
        raise CatalogError(
            f"UI owner {setting.id!r} ui_type mismatch: emitted "
            f"{emitted.ui_type!r}, catalog {contract.ui_type!r}"
        )
    if contract.ui_optional != emitted.optional:
        raise CatalogError(
            f"UI owner {setting.id!r} optionality mismatch: emitted "
            f"{emitted.optional!r}, catalog ui_optional "
            f"{contract.ui_optional!r}"
        )
    if contract.ui_nullable != emitted.nullable:
        raise CatalogError(
            f"UI owner {setting.id!r} nullability mismatch: emitted "
            f"nullable={emitted.nullable!r}, catalog ui_nullable="
            f"{contract.ui_nullable!r}"
        )

    if emitted.accepted_values is None:
        emitted_values: tuple[object, ...] | None = None
    else:
        converted = tuple(
            _ui_value_as_json(value) for value in emitted.accepted_values
        )
        if _UNREPRESENTABLE_UI_VALUE in converted:
            raise CatalogError(
                f"UI owner {setting.id!r} has unrepresentable tagged undefined "
                "accepted_values"
            )
        emitted_values = converted
    if contract.ui_accepted_values != emitted_values:
        raise CatalogError(
            f"UI owner {setting.id!r} accepted_values mismatch: emitted "
            f"{emitted_values!r}, catalog {contract.ui_accepted_values!r}"
        )

    if emitted.minimum is None and emitted.maximum is None:
        if contract.ui_range is not None:
            raise CatalogError(
                f"UI owner {setting.id!r} range mismatch: emitted no range"
            )
    else:
        if (
            contract.ui_range is None
            or contract.ui_range.minimum != emitted.minimum
            or contract.ui_range.maximum != emitted.maximum
            or not contract.ui_range.minimum_inclusive
            or not contract.ui_range.maximum_inclusive
        ):
            raise CatalogError(
                f"UI owner {setting.id!r} range mismatch: emitted "
                f"[{emitted.minimum!r}, {emitted.maximum!r}]"
            )


def _default_matches_presence(
    default: SettingDefault, presence: UiPresence
) -> bool:
    if (default.presence == "present") != presence.present:
        return False
    if not presence.present:
        return True
    assert presence.value is not None
    return default.value == _ui_value_as_catalog_default(presence.value)


def _ui_value_as_catalog_default(value: UiValue) -> object:
    """Preserve explicit JavaScript undefined inside otherwise JSON defaults."""

    if isinstance(value, UiUndefinedValue):
        return {"kind": "undefined"}
    if isinstance(value, UiArrayValue):
        return [_ui_value_as_catalog_default(item) for item in value.items]
    if isinstance(value, UiObjectValue):
        return {
            entry.key: _ui_value_as_catalog_default(entry.value)
            for entry in value.entries
        }
    converted = _ui_value_as_json(value)
    assert converted is not _UNREPRESENTABLE_UI_VALUE
    return converted


def _applicability_identity(applicability: Applicability) -> str:
    return json.dumps(
        applicability.model_dump(mode="json", exclude_none=True),
        sort_keys=True,
        separators=(",", ":"),
    )


def _expected_architecture_default_applicability(
    setting: Setting, architecture: str
) -> tuple[str, ...]:
    clauses: Sequence[Applicability | None] = setting.applicability or (None,)
    identities: set[str] = set()
    for clause in clauses:
        if (
            clause is not None
            and clause.ui_architecture not in (None, architecture)
        ):
            continue
        data = (
            {}
            if clause is None
            else clause.model_dump(mode="json", exclude_none=True)
        )
        data["ui_architecture"] = architecture
        identities.add(
            _applicability_identity(Applicability.model_validate(data))
        )
    return tuple(sorted(identities))


def _default_applies_to_architecture(
    setting: Setting, default: SettingDefault, architecture: str | None
) -> bool:
    if architecture is None:
        return True
    actual = tuple(sorted(
        _applicability_identity(clause)
        for clause in default.applicability
    ))
    return actual == _expected_architecture_default_applicability(
        setting, architecture
    )


def _require_matching_default(
    setting: Setting,
    *,
    kind: str,
    presence: UiPresence,
    architecture: str | None,
) -> None:
    if not any(
        default.kind == kind
        and _default_applies_to_architecture(setting, default, architecture)
        and _default_matches_presence(default, presence)
        for default in setting.defaults
    ):
        architecture_text = (
            "" if architecture is None else f" for architecture {architecture!r}"
        )
        raise CatalogError(
            f"UI owner {setting.id!r} lacks exact {kind} default"
            f"{architecture_text}: {presence.model_dump(mode='json')!r}"
        )


def _validate_owner_projection(
    setting: Setting, fact: UiOwnedFact, settings: dict[str, Setting]
) -> None:
    if isinstance(fact, UiOwnedSourceFact):
        _validate_setting_source_contract(setting, fact, settings)
        return
    if isinstance(fact, UiOwnedDefaultFact):
        if fact.path not in _setting_paths(setting):
            raise CatalogError(
                f"UI owner {setting.id!r} does not declare default path "
                f"{fact.path!r}"
            )
        _require_matching_default(
            setting, kind="ui-created", presence=fact.value, architecture=None
        )
        return
    if isinstance(
        fact, (UiOwnedArchitectureTransition, UiOwnedArchitectureDefault)
    ):
        if fact.path not in _setting_paths(setting):
            raise CatalogError(
                f"UI owner {setting.id!r} does not declare transition path "
                f"{fact.path!r}"
            )
        _require_matching_default(
            setting,
            kind="on-select",
            presence=fact.selected,
            architecture=fact.architecture,
        )
        _require_matching_default(
            setting,
            kind="on-leave",
            presence=fact.unselected,
            architecture=fact.architecture,
        )


def _validate_architecture_field_owners(
    projected: tuple[UiProjectedFact, ...],
    owners: dict[str, UiFactOwner],
    exclusions: dict[str, UiFactExclusion],
    settings: dict[str, Setting],
) -> None:
    by_architecture: dict[str, list[UiOwnedArchitectureField]] = {}
    for item in projected:
        if isinstance(item.fact, UiOwnedArchitectureField):
            by_architecture.setdefault(item.fact.architecture, []).append(
                item.fact
            )

    selector_ids: dict[str, str] = {}
    for architecture, fields in by_architecture.items():
        identities = tuple(fact.model_dump_json() for fact in fields)
        if any(identity in exclusions for identity in identities):
            raise CatalogError(
                f"architecture {architecture!r} metadata requires a selector owner"
            )
        setting_ids = {owners[identity].setting_id for identity in identities}
        if len(setting_ids) != 1:
            raise CatalogError(
                f"architecture {architecture!r} metadata must have one selector owner"
            )
        setting_id = next(iter(setting_ids))
        selector_ids[architecture] = setting_id
        setting = settings[setting_id]
        if (
            setting.scope != "ui-state"
            or setting.persistence != "transient"
            or setting.authority != "ui-derived"
            or setting.source_claims
            or not any(location.kind == "ui-state" for location in setting.locations)
            or not any(
                clause.ui_architecture == architecture
                for clause in setting.applicability
            )
        ):
            raise CatalogError(
                f"architecture {architecture!r} selector {setting_id!r} must be "
                "a source-less, transient, UI-derived ui-state setting"
            )
        label_fact = next(fact for fact in fields if fact.field == "label")
        assert isinstance(label_fact.payload, UiArchitectureValuePayload)
        assert isinstance(label_fact.payload.value, UiStringValue)
        if setting.ui_label != label_fact.payload.value.value:
            raise CatalogError(
                f"architecture {architecture!r} selector label mismatch"
            )
        if (
            setting.contract.ui_type != "string"
            or setting.contract.ui_optional is not False
            or setting.contract.ui_nullable is not False
            or setting.contract.ui_accepted_values != (architecture,)
        ):
            raise CatalogError(
                f"architecture {architecture!r} selector contract mismatch"
            )
    if len(set(selector_ids.values())) != len(selector_ids):
        raise CatalogError("each architecture requires a distinct selector setting")


def _validate_architecture_container_owners(
    projected: tuple[UiProjectedFact, ...],
    owners: dict[str, UiFactOwner],
    exclusions: dict[str, UiFactExclusion],
) -> None:
    defaults = tuple(
        item.fact for item in projected
        if isinstance(item.fact, UiOwnedArchitectureDefault)
    )
    containers = tuple(
        item.fact for item in projected
        if isinstance(item.fact, UiOwnedArchitectureContainer)
    )
    for container in containers:
        identity = container.model_dump_json()
        descendants = tuple(
            fact for fact in defaults
            if fact.architecture == container.architecture
            and (
                fact.path == container.path
                or fact.path.startswith(f"{container.path}.")
            )
            and (
                container.path == fact.declaration_path
                or container.path.startswith(f"{fact.declaration_path}.")
            )
        )
        if not descendants:
            exclusion = exclusions.get(identity)
            if (
                exclusion is None
                or exclusion.reason != "structural-empty-container"
            ):
                raise CatalogError(
                    f"empty architecture container {container.architecture!r}:"
                    f"{container.path!r} requires structural-empty-container exclusion"
                )
            continue
        declaration_paths = {fact.declaration_path for fact in descendants}
        if len(declaration_paths) != 1:
            raise CatalogError(
                f"architecture container {container.architecture!r}:"
                f"{container.path!r} spans ambiguous declarations "
                f"{sorted(declaration_paths)!r}"
            )
        if identity in exclusions:
            raise CatalogError(
                f"nonempty architecture container {container.architecture!r}:"
                f"{container.path!r} requires deterministic descendant ownership"
            )
        excluded_descendants = tuple(
            fact for fact in descendants if fact.model_dump_json() in exclusions
        )
        if excluded_descendants:
            raise CatalogError(
                f"architecture container {container.architecture!r}:"
                f"{container.path!r} requires owned descendant defaults"
            )
        owned_descendants = tuple(
            fact for fact in descendants if fact.model_dump_json() in owners
        )
        first_path = min(fact.path for fact in owned_descendants)
        first = tuple(
            fact for fact in owned_descendants if fact.path == first_path
        )
        if len(first) != 1:
            raise CatalogError(
                f"architecture container {container.architecture!r}:"
                f"{container.path!r} has ambiguous first descendant {first_path!r}"
            )
        expected_owner = owners[first[0].model_dump_json()].setting_id
        actual_owner = owners[identity].setting_id
        if actual_owner != expected_owner:
            raise CatalogError(
                f"architecture container {container.architecture!r}:"
                f"{container.path!r} must use first descendant owner "
                f"{expected_owner!r}, not {actual_owner!r}"
            )


def _validate_architecture_projected_exclusions(
    projected: tuple[UiProjectedFact, ...],
    owners: dict[str, UiFactOwner],
    exclusions: dict[str, UiFactExclusion],
) -> None:
    fields = {
        (item.fact.architecture, item.fact.field): item.fact
        for item in projected
        if isinstance(item.fact, UiOwnedArchitectureField)
    }
    for exclusion in exclusions.values():
        if exclusion.reason != "architecture-projected-control":
            continue
        fact = exclusion.fact
        if not isinstance(fact, UiOwnedSourceFact) or fact.kind != "setting":
            raise CatalogError(
                "architecture-projected-control exclusions require setting facts"
            )
        marker = "::architecture="
        if marker not in fact.symbol:
            raise CatalogError(
                "architecture-projected-control exclusion lacks exact architecture"
            )
        tail = fact.symbol.split(marker, 1)[1]
        architecture = tail.split("::tag=", 1)[0]
        field_name = (
            "sample_tags" if "::tag=" in tail
            else "custom_model_select_options"
        )
        field = fields.get((architecture, field_name))
        if field is None or field.model_dump_json() not in owners:
            raise CatalogError(
                f"architecture-projected-control {fact.symbol!r} lacks an "
                f"owned {field_name} projection"
            )
        if field_name == "sample_tags":
            assert isinstance(field.payload, UiArchitecturePresencePayload)
            presence = field.payload.value
            if not presence.present or not isinstance(
                presence.value, UiObjectValue
            ):
                raise CatalogError(
                    f"sample-tag exclusion {fact.symbol!r} lacks tag metadata"
                )
            tag = tail.split("::tag=", 1)[1]
            tag_entry = next(
                (entry.value for entry in presence.value.entries if entry.key == tag),
                None,
            )
            if not isinstance(tag_entry, UiObjectValue):
                raise CatalogError(
                    f"sample-tag exclusion {fact.symbol!r} names unknown tag"
                )
            values = {entry.key: entry.value for entry in tag_entry.entries}
            label = values.get("title")
            tag_type = values.get("type")
            emitted_label = fact.ui_label.value
            expected_type = (
                "number"
                if isinstance(tag_type, UiStringValue)
                and tag_type.value == "number"
                else "string"
            )
            if (
                not isinstance(label, UiStringValue)
                or not isinstance(emitted_label, UiStringValue)
                or label.value != emitted_label.value
                or fact.value_contract.ui_type != expected_type
            ):
                raise CatalogError(
                    f"sample-tag exclusion {fact.symbol!r} contract disagrees "
                    "with owned tag metadata"
                )
        else:
            assert isinstance(
                field.payload, UiArchitectureCustomOptionsPayload
            )
            options = field.payload.value
            emitted_label = fact.ui_label.value
            matches = (
                option for option in (options.value or ())
                if isinstance(emitted_label, UiStringValue)
                and option.label == emitted_label.value
            )
            if not any(
                any(write.path == fact.path for write in option.writes)
                for option in matches
            ):
                raise CatalogError(
                    f"custom-option exclusion {fact.symbol!r} lacks an exact "
                    "owned option/write projection"
                )


def validate_ui_fact_ownership(
    facts: TrainingBookUiFacts,
    catalog: SettingsCatalog,
    exclusions: Sequence[UiFactExclusion],
    *,
    scope: Literal[
        "ui-defaults-transitions", "ui-server-global", "all"
    ] = "all",
) -> None:
    """Require exact, non-stale ownership for emitted atomic UI facts."""

    projected = project_training_book_ui_facts(facts)
    emitted = {item.fact.model_dump_json(): item for item in projected}
    owners = {
        owner.fact.model_dump_json(): owner for owner in catalog.ui_claims
    }
    excluded = {
        exclusion.fact.model_dump_json(): exclusion for exclusion in exclusions
    }

    def fact_scope(fact: UiOwnedFact) -> UiFactScope:
        if isinstance(fact, UiOwnedSourceFact) and (
            fact.kind == "server-state" or not fact.path.startswith("config.")
        ):
            return "ui-server-global"
        return "ui-defaults-transitions"

    def selected_identity(identity: str, fact: UiOwnedFact) -> bool:
        if scope == "all":
            return True
        live = emitted.get(identity)
        return (live.scope if live is not None else fact_scope(fact)) == scope

    selected_owners = {
        identity: owner for identity, owner in owners.items()
        if selected_identity(identity, owner.fact)
    }
    selected_exclusions = {
        identity: exclusion for identity, exclusion in excluded.items()
        if selected_identity(identity, exclusion.fact)
    }
    overlap = sorted(set(selected_owners).intersection(selected_exclusions))
    if overlap:
        raise CatalogError(
            f"UI facts have both an owner and exclusion: {len(overlap)}"
        )
    stale_owners = sorted(set(selected_owners).difference(emitted))
    if stale_owners:
        raise CatalogError(f"stale UI owners: {len(stale_owners)}")
    stale_exclusions = sorted(set(selected_exclusions).difference(emitted))
    if stale_exclusions:
        raise CatalogError(f"stale UI exclusions: {len(stale_exclusions)}")

    settings = {setting.id: setting for setting in catalog.settings}
    for identity, owner in selected_owners.items():
        if identity in emitted:
            _validate_owner_projection(
                settings[owner.setting_id], owner.fact, settings
            )

    selected = {
        identity
        for identity, item in emitted.items()
        if scope == "all" or item.scope == scope
    }
    unowned = sorted(
        selected.difference(selected_owners).difference(selected_exclusions)
    )
    if unowned:
        raise CatalogError(f"unowned UI facts: {len(unowned)}")
    if scope in {"ui-defaults-transitions", "all"}:
        _validate_architecture_field_owners(
            projected, selected_owners, selected_exclusions, settings
        )
        _validate_architecture_projected_exclusions(
            projected, selected_owners, selected_exclusions
        )
        _validate_architecture_container_owners(
            projected, selected_owners, selected_exclusions
        )


def _dispatch_pattern_matches(
    clause: Applicability,
    dimension: str,
    value: str,
) -> bool:
    exact = getattr(clause, dimension)
    prefix = getattr(clause, f"{dimension}_prefix")
    suffix = getattr(clause, f"{dimension}_suffix")
    excluded = getattr(clause, f"{dimension}_exclude_prefix")
    if exact is not None and value != exact:
        return False
    if prefix is not None and not value.startswith(prefix):
        return False
    if suffix is not None and not value.endswith(suffix):
        return False
    if excluded is not None and value.startswith(excluded):
        return False
    return True


def _has_dispatch_pattern(clause: Applicability, dimension: str) -> bool:
    return any(
        getattr(clause, field) is not None
        for field in (
            dimension,
            f"{dimension}_prefix",
            f"{dimension}_suffix",
            f"{dimension}_exclude_prefix",
        )
    )


def applicability_matches_dispatch(
    applicability: tuple[Applicability, ...],
    *,
    optimizer: str | None = None,
    scheduler: str | None = None,
) -> bool:
    """Match one runtime dispatch name against closed catalog predicates."""

    if (optimizer is None) == (scheduler is None):
        raise ValueError("provide exactly one optimizer or scheduler name")
    if not applicability:
        return True
    dimension = "optimizer" if optimizer is not None else "scheduler"
    other = "scheduler" if dimension == "optimizer" else "optimizer"
    value = optimizer if optimizer is not None else scheduler
    assert value is not None
    for clause in applicability:
        if _has_dispatch_pattern(clause, other):
            continue
        if not _has_dispatch_pattern(clause, dimension):
            return True
        if _dispatch_pattern_matches(clause, dimension, value):
            return True
    return False


def _dispatch_patterns_overlap(
    left: Applicability,
    right: Applicability,
    dimension: str,
) -> bool:
    if not _has_dispatch_pattern(left, dimension) or not _has_dispatch_pattern(
        right, dimension
    ):
        return True
    left_exact = getattr(left, dimension)
    right_exact = getattr(right, dimension)
    if left_exact is not None:
        return _dispatch_pattern_matches(right, dimension, left_exact)
    if right_exact is not None:
        return _dispatch_pattern_matches(left, dimension, right_exact)

    prefixes = tuple(
        value
        for value in (
            getattr(left, f"{dimension}_prefix"),
            getattr(right, f"{dimension}_prefix"),
        )
        if value is not None
    )
    prefix = max(prefixes, key=len) if prefixes else ""
    if any(not prefix.startswith(value) for value in prefixes):
        return False
    suffixes = tuple(
        value
        for value in (
            getattr(left, f"{dimension}_suffix"),
            getattr(right, f"{dimension}_suffix"),
        )
        if value is not None
    )
    suffix = max(suffixes, key=len) if suffixes else ""
    if any(not suffix.endswith(value) for value in suffixes):
        return False
    exclusions = tuple(
        value
        for value in (
            getattr(left, f"{dimension}_exclude_prefix"),
            getattr(right, f"{dimension}_exclude_prefix"),
        )
        if value is not None
    )
    return not any(prefix.startswith(excluded) for excluded in exclusions)


def _predicates_overlap(
    left: tuple[Applicability, ...], right: tuple[Applicability, ...]
) -> bool:
    left_clauses: tuple[Applicability | None, ...] = left or (None,)
    right_clauses: tuple[Applicability | None, ...] = right or (None,)
    fields = (
        "job_type",
        "process_type",
        "network_type",
        "ui_architecture",
        "engine_architecture",
    )
    for left_clause in left_clauses:
        for right_clause in right_clauses:
            if left_clause is None or right_clause is None:
                return True
            if all(
                getattr(left_clause, field) is None
                or getattr(right_clause, field) is None
                or getattr(left_clause, field) == getattr(right_clause, field)
                for field in fields
            ) and all(
                _dispatch_patterns_overlap(left_clause, right_clause, dimension)
                for dimension in ("optimizer", "scheduler")
            ):
                return True
    return False


def _validate_catalog_relationships(catalog: SettingsCatalog) -> None:
    by_id: dict[str, Setting] = {}
    for setting in catalog.settings:
        if setting.id in by_id:
            raise CatalogError(f"duplicate stable id {setting.id!r}")
        by_id[setting.id] = setting

    claimed_locations: dict[tuple[str, str], list[Setting]] = {}
    for setting in catalog.settings:
        for location in setting.locations:
            identity = (location.kind, location.path)
            for previous in claimed_locations.get(identity, []):
                if _predicates_overlap(previous.applicability, setting.applicability):
                    raise CatalogError(
                        "overlapping location/applicability claim for "
                        f"{location.kind}:{location.path}: "
                        f"{previous.id!r} and {setting.id!r}"
                    )
            claimed_locations.setdefault(identity, []).append(setting)

    owner_facts: dict[str, str] = {}
    ui_owned_setting_ids: set[str] = set()
    for owner in catalog.ui_claims:
        if owner.setting_id not in by_id:
            raise CatalogError(
                f"UI fact owner names unknown setting_id {owner.setting_id!r}"
            )
        identity = owner.fact.model_dump_json()
        previous = owner_facts.get(identity)
        if previous is not None:
            raise CatalogError(
                "duplicate UI fact owner for exact payload: "
                f"{previous!r} and {owner.setting_id!r}"
            )
        owner_facts[identity] = owner.setting_id
        ui_owned_setting_ids.add(owner.setting_id)

    for setting in catalog.settings:
        if setting.source_claims:
            continue
        if setting.id not in ui_owned_setting_ids:
            raise CatalogError(
                f"source-less setting {setting.id!r} requires atomic "
                "UI ownership"
            )


def _claims(catalog: SettingsCatalog) -> tuple[SourceClaim, ...]:
    return tuple(
        SourceClaim(claim.source, claim.symbol, claim.key, claim.read_kind)
        for setting in catalog.settings
        for claim in setting.source_claims
    )


def validate_settings_catalog(
    data: object,
    discovered: Sequence[DiscoveredSetting],
    exclusions: Sequence[Exclusion] = (),
) -> SettingsCatalog:
    """Validate catalog structure, relationships, and exact source ownership."""

    try:
        catalog = SettingsCatalog.model_validate(data)
    except ValidationError as error:
        raise CatalogError(_format_validation_error(error)) from error
    _validate_catalog_relationships(catalog)
    try:
        validate_setting_ownership(discovered, _claims(catalog), exclusions)
    except DiscoveryError as error:
        raise CatalogError(str(error)) from error
    return catalog


def settings_catalog_schema() -> dict[str, object]:
    """Return the canonical JSON schema generated from the executable contract."""

    return SettingsCatalog.model_json_schema(mode="validation")


def _load_json(path: Path, label: str) -> object:
    def reject_non_finite(constant: str) -> object:
        raise ValueError(f"non-finite JSON constant {constant!r}")

    try:
        return json.loads(
            path.read_text(encoding="utf-8"), parse_constant=reject_non_finite
        )
    except (OSError, json.JSONDecodeError, ValueError) as error:
        raise CatalogError(f"could not load {label}: {error}") from error


def load_ui_exclusions(path: Path) -> tuple[UiFactExclusion, ...]:
    """Load typed exact UI exclusions from the shared exclusions document."""

    data = _load_json(path, "settings exclusions")
    try:
        envelope = UiExclusionsEnvelope.model_validate(data)
    except ValidationError as error:
        raise CatalogError(_format_validation_error(error)) from error
    return envelope.ui_exclusions


def load_settings_catalog(
    catalog_path: Path,
    schema_path: Path,
    discovered: Sequence[DiscoveredSetting] | None,
    exclusions: Sequence[Exclusion] = (),
) -> SettingsCatalog:
    """Check schema drift first, then load and validate canonical catalog data."""

    committed_schema = _load_json(schema_path, "settings catalog schema")
    if committed_schema != settings_catalog_schema():
        raise CatalogError("settings catalog schema drift")
    data = _load_json(catalog_path, "settings catalog")
    if discovered is None:
        try:
            catalog = SettingsCatalog.model_validate(data)
        except ValidationError as error:
            raise CatalogError(_format_validation_error(error)) from error
        _validate_catalog_relationships(catalog)
        return catalog
    return validate_settings_catalog(data, discovered, exclusions)


def catalog_source_claims(catalog: SettingsCatalog) -> tuple[SourceClaim, ...]:
    """Expose exact source claims for discovery selectors and reports."""

    return _claims(catalog)
