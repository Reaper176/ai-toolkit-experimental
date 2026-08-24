"""Strict executable contract for the training settings catalog."""

from __future__ import annotations

import json
import math
import re
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
_JsonScalar = StrictBool | StrictInt | StrictFloat | StrictStr | None
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
    if (
        path.is_absolute()
        or "\\" in value
        or ":" in value
        or any(part in {"", ".", ".."} for part in value.split("/"))
        or path.as_posix() != value
        or any(token in value for token in ("*", "?", "[", "]", "{", "}"))
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
    example_type: _SemanticType
    accepted_values: tuple[_JsonScalar, ...] | None
    accepted_types: tuple[_SemanticType, ...] | None = None
    collection_length: StrictInt | None = None
    range: NumericRange | None
    null: Literal["accepted", "rejected", "normalized-to-absent"]

    @field_validator("accepted_values")
    @classmethod
    def _finite_accepted_values(
        cls, values: tuple[_JsonScalar, ...] | None
    ) -> tuple[_JsonScalar, ...] | None:
        if values is not None:
            for value in values:
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    _require_finite_number(value)
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
    persistence: Literal["config", "job-json", "database", "runtime", "transient"]
    authority: Literal["user", "ui-derived", "server-overwritten", "runtime-forced"]
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
    source_claims: tuple[CatalogSourceClaim, ...] = Field(min_length=1)
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


class UiSourceFact(_StrictModel):
    source_path: StrictStr
    symbol: StrictStr
    path: StrictStr
    kind: Literal["setter", "default", "doc", "setting", "server-state"]
    ui_label: UiPresence
    value_contract: UiValueContract

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
