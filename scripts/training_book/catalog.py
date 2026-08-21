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
    r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$"
)
_SOURCE_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")
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
    try:
        finite = math.isfinite(value)
    except (OverflowError, TypeError, ValueError) as error:
        raise ValueError("numeric JSON values must be finite") from error
    if not finite:
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
            )
        ):
            raise ValueError("applicability predicate must not be empty")
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


def _format_validation_error(error: ValidationError) -> str:
    details = []
    for item in error.errors(include_url=False):
        location = ".".join(str(part) for part in item["loc"])
        details.append(f"{location}: {item['msg']}")
    return "; ".join(details)


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
