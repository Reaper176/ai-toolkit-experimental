"""Fail-closed, import-free discovery of Python configuration surfaces."""

from __future__ import annotations

import ast
import json
from dataclasses import dataclass
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Iterable, Sequence


class DiscoveryError(ValueError):
    """Raised when source discovery cannot prove a finite configuration surface."""


@dataclass(frozen=True, order=True)
class DiscoveredSetting:
    source: str
    symbol: str
    line: int
    key: str
    read_kind: str
    scope: str
    default_expression: str | None


@dataclass(frozen=True, order=True)
class SourceClaim:
    source: str
    symbol: str
    key: str
    read_kind: str


@dataclass(frozen=True, order=True)
class Exclusion:
    source: str
    symbol: str
    key: str
    read_kind: str
    reason: str


@dataclass(frozen=True, order=True)
class SourceGroup:
    owner: str
    globs: tuple[str, ...]


@dataclass(frozen=True)
class SourceCatalog:
    schema_version: int
    source_groups: tuple[SourceGroup, ...]
    claims: tuple[SourceClaim, ...]


_APPROVED_EXCLUSION_REASONS = {
    "slider-only",
    "extraction-only",
    "generation-only",
    "reference-dataset-only",
    "arbitrary third-party constructor surface",
    "external extension",
    "model-developer API",
}
_SOURCE_OWNERS = {"python-ast", "typescript-test"}
_INVENTORY_BASELINE_TOTAL = 965
_INVENTORY_BASELINE_GROUPS = {
    "toolkit/config_modules.py": 436,
    "TrainConfig": 126,
    "ModelConfig": 60,
    "DatasetConfig": 78,
    "AdapterConfig": 49,
}


_Identity = tuple[str, str, str, str]


def validate_inventory_baseline(counts: dict[str, int], total: int) -> None:
    """Reject any reduction from the immutable Task 2 production inventory."""

    if total < _INVENTORY_BASELINE_TOTAL:
        raise DiscoveryError(
            f"discovery inventory abruptly reduced to {total} total Python facts "
            f"(minimum {_INVENTORY_BASELINE_TOTAL})"
        )
    for group, minimum in _INVENTORY_BASELINE_GROUPS.items():
        count = counts.get(group, 0)
        if count < minimum:
            raise DiscoveryError(
                f"discovery inventory group {group} abruptly reduced to "
                f"{count} facts (minimum {minimum})"
            )


def _identity(value: DiscoveredSetting | SourceClaim | Exclusion) -> _Identity:
    return (value.source, value.symbol, value.key, value.read_kind)


def _reject_duplicate_object_keys(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise DiscoveryError(f"duplicate JSON object key: {key!r}")
        result[key] = value
    return result


def _load_json_object(path: Path, label: str) -> dict[str, object]:
    try:
        value = json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_object_keys,
        )
    except json.JSONDecodeError as error:
        raise DiscoveryError(
            f"{label} has invalid JSON at line {error.lineno}, column {error.colno}"
        ) from error
    except (OSError, UnicodeError) as error:
        raise DiscoveryError(f"cannot read {label}: {error}") from error
    if type(value) is not dict:
        raise DiscoveryError(f"{label} must be a JSON object")
    return value


def _require_fields(
    value: dict[str, object], expected: set[str], label: str
) -> None:
    missing = sorted(expected.difference(value))
    if missing:
        raise DiscoveryError(f"{label} missing required fields: {missing!r}")
    extra = sorted(set(value).difference(expected))
    if extra:
        raise DiscoveryError(f"{label} has unexpected fields: {extra!r}")


def _string(value: object, label: str) -> str:
    if type(value) is not str or not value:
        raise DiscoveryError(f"{label} must be a non-empty string")
    return value


def _portable_declaration(value: object, label: str, *, glob: bool) -> str:
    path = _string(value, label)
    parsed = PurePosixPath(path)
    windows = PureWindowsPath(path)
    if (
        "\\" in path
        or parsed.is_absolute()
        or windows.is_absolute()
        or windows.drive
        or ".." in parsed.parts
        or path == "."
        or "//" in path
    ):
        raise DiscoveryError(f"{label} must be a portable relative path")
    if not glob and any(character in path for character in "*?["):
        raise DiscoveryError(f"{label} must be an exact portable source path")
    return path


def _claim_from_json(value: object, label: str) -> SourceClaim:
    if type(value) is not dict:
        raise DiscoveryError(f"{label} must be an object")
    _require_fields(value, {"source", "symbol", "key", "read_kind"}, label)
    symbol = _string(value["symbol"], f"{label}.symbol")
    key = _string(value["key"], f"{label}.key")
    read_kind = _string(value["read_kind"], f"{label}.read_kind")
    if any(
        metacharacter in field
        for field in (symbol, key, read_kind)
        for metacharacter in "*?["
    ):
        raise DiscoveryError(f"{label} requires an exact identity")
    return SourceClaim(
        _portable_declaration(value["source"], f"{label}.source", glob=False),
        symbol,
        key,
        read_kind,
    )


def load_source_catalog(path: Path) -> SourceCatalog:
    """Load strict source groups and exact ownership claims."""

    data = _load_json_object(path, "settings source catalog")
    _require_fields(data, {"schema_version", "source_groups", "claims"}, "settings source catalog")
    if type(data["schema_version"]) is not int or data["schema_version"] != 1:
        raise DiscoveryError("settings source catalog schema_version must equal 1")
    groups_value = data["source_groups"]
    if type(groups_value) is not list or not groups_value:
        raise DiscoveryError("source_groups must be a non-empty array")
    groups: list[SourceGroup] = []
    owners: set[str] = set()
    for index, item in enumerate(groups_value):
        label = f"source_groups[{index}]"
        if type(item) is not dict:
            raise DiscoveryError(f"{label} must be an object")
        _require_fields(item, {"owner", "globs"}, label)
        owner = _string(item["owner"], f"{label}.owner")
        if owner not in _SOURCE_OWNERS:
            raise DiscoveryError(f"{label}.owner is not supported: {owner!r}")
        if owner in owners:
            raise DiscoveryError(f"source_groups has duplicate owner: {owner!r}")
        owners.add(owner)
        globs_value = item["globs"]
        if type(globs_value) is not list or not globs_value:
            raise DiscoveryError(f"{label}.globs must be a non-empty array")
        globs = tuple(
            _portable_declaration(item, f"{label}.globs[{glob_index}]", glob=True)
            for glob_index, item in enumerate(globs_value)
        )
        if len(globs) != len(set(globs)):
            raise DiscoveryError(f"{label}.globs contains duplicate patterns")
        groups.append(SourceGroup(owner, globs))
    claims_value = data["claims"]
    if type(claims_value) is not list:
        raise DiscoveryError("claims must be an array")
    claims = tuple(
        _claim_from_json(item, f"claims[{index}]")
        for index, item in enumerate(claims_value)
    )
    if len(claims) != len({_identity(claim) for claim in claims}):
        raise DiscoveryError("claims contains duplicate ownership identities")
    return SourceCatalog(1, tuple(groups), claims)


def load_exclusions(path: Path) -> tuple[Exclusion, ...]:
    """Load exact exclusions with reasons from the approved taxonomy."""

    data = _load_json_object(path, "settings exclusions")
    _require_fields(data, {"schema_version", "exclusions"}, "settings exclusions")
    if type(data["schema_version"]) is not int or data["schema_version"] != 1:
        raise DiscoveryError("settings exclusions schema_version must equal 1")
    values = data["exclusions"]
    if type(values) is not list:
        raise DiscoveryError("exclusions must be an array")
    exclusions: list[Exclusion] = []
    for index, item in enumerate(values):
        label = f"exclusions[{index}]"
        if type(item) is not dict:
            raise DiscoveryError(f"{label} must be an object")
        _require_fields(
            item, {"source", "symbol", "key", "read_kind", "reason"}, label
        )
        claim = _claim_from_json(
            {field: item[field] for field in ("source", "symbol", "key", "read_kind")},
            label,
        )
        reason = _string(item["reason"], f"{label}.reason")
        if reason not in _APPROVED_EXCLUSION_REASONS:
            raise DiscoveryError(
                f"{label}.reason must be an approved category, got {reason!r}"
            )
        exclusions.append(Exclusion(*_identity(claim), reason))
    if len(exclusions) != len({_identity(item) for item in exclusions}):
        raise DiscoveryError("exclusions contains duplicate ownership identities")
    return tuple(exclusions)


def _portable_path(repository_root: Path, source_path: Path) -> str:
    try:
        relative = source_path.resolve().relative_to(repository_root.resolve())
    except ValueError as error:
        raise DiscoveryError(f"source escapes repository root: {source_path}") from error
    portable = relative.as_posix()
    if portable == "." or str(PurePosixPath(portable)) != portable:
        raise DiscoveryError(f"source is not a portable relative path: {portable!r}")
    return portable


def _source_expression(node: ast.AST | None) -> str | None:
    return None if node is None else ast.unparse(node)


def _literal_strings(node: ast.AST, values: dict[str, tuple[str, ...]]) -> tuple[str, ...] | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return (node.value,)
    if isinstance(node, ast.Name):
        return values.get(node.id)
    if isinstance(node, (ast.Tuple, ast.List, ast.Set)):
        result: list[str] = []
        for element in node.elts:
            element_values = _literal_strings(element, values)
            if element_values is None:
                return None
            result.extend(element_values)
        return tuple(result)
    if isinstance(node, ast.JoinedStr):
        candidates = ("",)
        for part in node.values:
            if isinstance(part, ast.Constant) and isinstance(part.value, str):
                replacements = (part.value,)
            elif isinstance(part, ast.FormattedValue):
                if part.conversion != -1 or part.format_spec is not None:
                    return None
                replacements = _literal_strings(part.value, values)
                if replacements is None:
                    return None
            else:
                return None
            candidates = tuple(
                prefix + replacement
                for prefix in candidates
                for replacement in replacements
            )
        return candidates
    return None


def _attribute_path(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        owner = _attribute_path(node.value)
        return None if owner is None else f"{owner}.{node.attr}"
    return None


def _class_method_symbol(class_name: str, method_name: str) -> str:
    return f"{class_name}.{method_name}"


@dataclass(frozen=True)
class _ClassInfo:
    source: str
    node: ast.ClassDef


_MethodOwner = tuple[str, str]
_MethodCall = tuple[ast.Call, str, str | None]
_MethodReference = tuple[ast.Attribute, str, str | None]


def _resolve_method_owners(
    *,
    classes: dict[str, list[_ClassInfo]],
    caller_source: str,
    caller_class: str | None,
    method_name: str,
    super_only: bool,
) -> tuple[frozenset[_MethodOwner], bool]:
    """Return finite candidate owners and whether inheritance is ambiguous."""

    if caller_class is None:
        return frozenset(), True
    callers = [
        info
        for info in classes.get(caller_class, ())
        if info.source == caller_source
    ]
    if len(callers) != 1:
        return frozenset(), True

    def base_infos(info: _ClassInfo) -> tuple[list[_ClassInfo], bool]:
        resolved: list[_ClassInfo] = []
        uncertain = False
        for base in info.node.bases:
            if not isinstance(base, ast.Name):
                uncertain = True
                continue
            candidates = [
                candidate
                for candidate in classes.get(base.id, ())
                if candidate.source == info.source
            ]
            if not candidates:
                candidates = list(classes.get(base.id, ()))
            if len(candidates) != 1:
                uncertain = True
                continue
            resolved.append(candidates[0])
        return resolved, uncertain

    def search(
        info: _ClassInfo,
        *,
        include_self: bool,
        seen: frozenset[_MethodOwner],
    ) -> tuple[set[_MethodOwner], bool]:
        owner = (info.source, info.node.name)
        if owner in seen:
            return set(), True
        seen = seen | {owner}
        if include_self and any(
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == method_name
            for node in info.node.body
        ):
            return {owner}, False
        bases, uncertain = base_infos(info)
        owners: set[_MethodOwner] = set()
        for base in bases:
            base_owners, base_uncertain = search(
                base, include_self=True, seen=seen
            )
            owners.update(base_owners)
            uncertain = uncertain or base_uncertain
        if len(owners) > 1:
            uncertain = True
        return owners, uncertain

    owners, uncertain = search(
        callers[0], include_self=not super_only, seen=frozenset()
    )
    return frozenset(owners), uncertain


def _method_use_applies(
    *,
    receiver: ast.AST,
    caller_source: str,
    caller_class: str | None,
    target_owner: _MethodOwner,
    method_name: str,
    classes: dict[str, list[_ClassInfo]],
) -> bool:
    if isinstance(receiver, ast.Name) and receiver.id in {"self", "cls"}:
        owners, uncertain = _resolve_method_owners(
            classes=classes,
            caller_source=caller_source,
            caller_class=caller_class,
            method_name=method_name,
            super_only=False,
        )
        return uncertain or target_owner in owners
    if (
        isinstance(receiver, ast.Call)
        and isinstance(receiver.func, ast.Name)
        and receiver.func.id == "super"
    ):
        if receiver.args or receiver.keywords:
            return True
        owners, uncertain = _resolve_method_owners(
            classes=classes,
            caller_source=caller_source,
            caller_class=caller_class,
            method_name=method_name,
            super_only=True,
        )
        return uncertain or target_owner in owners
    # The static receiver type is unknown, so it may target any same-named
    # method in the parsed source union.
    return True


def _parameter_domains(
    source: str,
    tree: ast.Module,
    classes: dict[str, list[_ClassInfo]],
    call_sites: dict[str, tuple[_MethodCall, ...]],
    method_references: dict[str, tuple[_MethodReference, ...]],
) -> tuple[
    dict[tuple[str, str, str], tuple[str, ...]],
    frozenset[tuple[str, str, str]],
]:
    """Infer finite method-parameter values from every parsed call site."""

    result: dict[tuple[str, str, str], set[str]] = {}
    unresolved: set[tuple[str, str, str]] = set()
    local_classes = {
        node.name: node for node in tree.body if isinstance(node, ast.ClassDef)
    }
    for class_name, class_node in local_classes.items():
        methods = {
            node.name: node
            for node in class_node.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        def finite_method_return(call: ast.Call) -> tuple[str, ...] | None:
            if (
                call.args
                or call.keywords
                or not isinstance(call.func, ast.Attribute)
                or not isinstance(call.func.value, ast.Name)
                or call.func.value.id not in {"self", "cls"}
            ):
                return None
            producer = methods.get(call.func.attr)
            if (
                not isinstance(producer, ast.FunctionDef)
                or producer.decorator_list
                or any(
                    isinstance(inner, (ast.Yield, ast.YieldFrom))
                    for inner in ast.walk(producer)
                )
            ):
                return None
            local_values: dict[str, tuple[str, ...]] = {}
            guard_positions: dict[str, int] = {}
            for position, inner in enumerate(producer.body):
                if (
                    isinstance(inner, ast.If)
                    and not inner.orelse
                    and inner.body
                    and isinstance(inner.body[-1], ast.Raise)
                    and isinstance(inner.test, ast.Compare)
                    and len(inner.test.ops) == 1
                    and isinstance(inner.test.ops[0], ast.NotIn)
                    and isinstance(inner.test.left, ast.Name)
                    and len(inner.test.comparators) == 1
                ):
                    values = _literal_strings(inner.test.comparators[0], {})
                    if values:
                        name = inner.test.left.id
                        local_values[name] = values
                        guard_positions[name] = position
            returns = [
                (position, statement)
                for position, statement in enumerate(producer.body)
                if isinstance(statement, ast.Return)
            ]
            if not returns or len(returns) != sum(
                isinstance(inner, ast.Return) for inner in ast.walk(producer)
            ):
                return None
            resolved: set[str] = set()
            for return_position, statement in returns:
                if statement.value is None:
                    return None
                referenced_names = {
                    inner.id
                    for inner in ast.walk(statement.value)
                    if isinstance(inner, ast.Name)
                }
                for name in referenced_names.intersection(local_values):
                    guard_position = guard_positions[name]
                    if guard_position >= return_position:
                        return None
                    if any(
                        isinstance(inner, ast.Name)
                        and inner.id == name
                        and isinstance(inner.ctx, ast.Store)
                        for intervening in producer.body[
                            guard_position + 1 : return_position
                        ]
                        for inner in ast.walk(intervening)
                    ):
                        return None
                values = _literal_strings(statement.value, local_values)
                if values is None:
                    return None
                resolved.update(values)
            return tuple(sorted(resolved)) or None

        def call_values(argument: ast.AST) -> tuple[str, ...] | None:
            values = _literal_strings(argument, {})
            if values is not None:
                return values
            if isinstance(argument, ast.Call):
                return finite_method_return(argument)
            return None

        for target_name, target in methods.items():
            positional_nodes = list(target.args.posonlyargs) + list(target.args.args)
            positional_parameters = [argument.arg for argument in positional_nodes]
            defaults: dict[str, ast.AST] = {}
            positional_offset = len(positional_nodes) - len(target.args.defaults)
            for argument, default in zip(
                positional_nodes[positional_offset:], target.args.defaults
            ):
                defaults[argument.arg] = default
            for argument, default in zip(
                target.args.kwonlyargs, target.args.kw_defaults
            ):
                if default is not None:
                    defaults[argument.arg] = default
            if positional_parameters and positional_parameters[0] in {"self", "cls"}:
                positional_parameters = positional_parameters[1:]
            target_parameters = positional_parameters + [
                argument.arg for argument in target.args.kwonlyargs
            ]
            target_owner = (source, class_name)
            for reference, caller_source, caller_class in method_references.get(
                target_name, ()
            ):
                if _method_use_applies(
                    receiver=reference.value,
                    caller_source=caller_source,
                    caller_class=caller_class,
                    target_owner=target_owner,
                    method_name=target_name,
                    classes=classes,
                ):
                    unresolved.update(
                        (class_name, target_name, parameter)
                        for parameter in target_parameters
                    )
            for call, caller_source, caller_class in call_sites.get(target_name, ()):
                if not _method_use_applies(
                    receiver=call.func.value,
                    caller_source=caller_source,
                    caller_class=caller_class,
                    target_owner=target_owner,
                    method_name=target_name,
                    classes=classes,
                ):
                    continue
                supplied: set[str] = set()
                if any(isinstance(argument, ast.Starred) for argument in call.args):
                    unresolved.update(
                        (class_name, target_name, parameter)
                        for parameter in target_parameters
                    )
                for index, argument in enumerate(call.args):
                    if index >= len(positional_parameters):
                        break
                    parameter = positional_parameters[index]
                    supplied.add(parameter)
                    key = (class_name, target_name, parameter)
                    values = call_values(argument)
                    if values is not None:
                        result.setdefault(key, set()).update(values)
                    else:
                        unresolved.add(key)
                for keyword in call.keywords:
                    if keyword.arg in target_parameters:
                        if keyword.arg in supplied:
                            unresolved.update(
                                (class_name, target_name, parameter)
                                for parameter in target_parameters
                            )
                        supplied.add(keyword.arg)
                        key = (class_name, target_name, keyword.arg)
                        values = call_values(keyword.value)
                        if values is not None:
                            result.setdefault(key, set()).update(values)
                        else:
                            unresolved.add(key)
                    elif keyword.arg is None:
                        mapping = keyword.value
                        if not isinstance(mapping, ast.Dict) or any(
                            key_node is None
                            or not isinstance(key_node, ast.Constant)
                            or not isinstance(key_node.value, str)
                            for key_node in mapping.keys
                        ):
                            unresolved.update(
                                (class_name, target_name, parameter)
                                for parameter in target_parameters
                            )
                            continue
                        for key_node, value_node in zip(
                            mapping.keys, mapping.values
                        ):
                            assert isinstance(key_node, ast.Constant)
                            parameter = key_node.value
                            if parameter not in target_parameters:
                                unresolved.update(
                                    (class_name, target_name, name)
                                    for name in target_parameters
                                )
                                continue
                            if parameter in supplied:
                                unresolved.update(
                                    (class_name, target_name, name)
                                    for name in target_parameters
                                )
                            supplied.add(parameter)
                            key = (class_name, target_name, parameter)
                            values = call_values(value_node)
                            if values is None:
                                unresolved.add(key)
                            else:
                                result.setdefault(key, set()).update(values)
                    else:
                        unresolved.update(
                            (class_name, target_name, parameter)
                            for parameter in target_parameters
                        )
                for parameter in target_parameters:
                    if parameter in supplied:
                        continue
                    key = (class_name, target_name, parameter)
                    default = defaults.get(parameter)
                    if default is None:
                        unresolved.add(key)
                        continue
                    values = call_values(default)
                    if values is None:
                        unresolved.add(key)
                    else:
                        result.setdefault(key, set()).update(values)
    return (
        {key: tuple(sorted(values)) for key, values in result.items()},
        frozenset(unresolved),
    )


class _SettingVisitor(ast.NodeVisitor):
    def __init__(
        self,
        *,
        source: str,
        tree: ast.Module,
        classes: dict[str, list[_ClassInfo]],
        call_sites: dict[str, tuple[_MethodCall, ...]],
        method_references: dict[str, tuple[_MethodReference, ...]],
    ) -> None:
        self.source = source
        self.tree = tree
        self.classes = classes
        self.parameter_domains, self.unresolved_parameter_calls = _parameter_domains(
            source, tree, classes, call_sites, method_references
        )
        self.os_aliases = {"os"}
        self.os_aliases.update(
            alias.asname
            for node in ast.walk(tree)
            if isinstance(node, ast.Import)
            for alias in node.names
            if alias.name == "os" and alias.asname is not None
        )
        self.class_stack: list[str] = []
        self.function_stack: list[str] = []
        self.function_nodes: list[ast.FunctionDef | ast.AsyncFunctionDef] = []
        self.aliases: list[dict[str, str]] = []
        self.values: list[dict[str, tuple[str, ...]]] = []
        self.facts: list[DiscoveredSetting] = []

    @property
    def symbol(self) -> str:
        parts = self.class_stack + self.function_stack
        return ".".join(parts) if parts else "<module>"

    @property
    def current_aliases(self) -> dict[str, str]:
        return self.aliases[-1] if self.aliases else {}

    @property
    def current_values(self) -> dict[str, tuple[str, ...]]:
        return self.values[-1] if self.values else {}

    def _error(self, node: ast.AST, message: str) -> DiscoveryError:
        return DiscoveryError(
            f"{self.source}::{self.symbol} line {getattr(node, 'lineno', '?')}: {message}"
        )

    def _add(
        self,
        node: ast.AST,
        key: str,
        read_kind: str,
        scope: str,
        default: ast.AST | None,
    ) -> None:
        self.facts.append(
            DiscoveredSetting(
                self.source,
                self.symbol,
                node.lineno,
                key,
                read_kind,
                scope,
                _source_expression(default),
            )
        )

    def _container_kind(self, node: ast.AST) -> str | None:
        if isinstance(node, ast.Subscript):
            return self._container_kind(node.value)
        path = _attribute_path(node)
        if path is None:
            return None
        if path in self.current_aliases:
            return self.current_aliases[path]
        if path.endswith(".model_kwargs"):
            return "model_kwargs"
        if path == "kwargs":
            return "kwargs"
        if path in {"config", "self.config"}:
            return "attribute"
        return None

    def _resolved_keys(self, node: ast.AST, owner: ast.AST) -> tuple[str, ...]:
        if self.class_stack and self.function_stack:
            unresolved_names = {
                parameter
                for class_name, method_name, parameter in self.unresolved_parameter_calls
                if class_name == self.class_stack[-1]
                and method_name == self.function_stack[-1]
            }
            if any(
                isinstance(inner, ast.Name) and inner.id in unresolved_names
                for inner in ast.walk(node)
            ):
                raise self._error(owner, "dynamic parameter call site is not finite")
        keys = _literal_strings(node, self.current_values)
        if keys is None:
            raise self._error(owner, "dynamic configuration key is not finite")
        if not keys or any(not key for key in keys):
            raise self._error(owner, "configuration key must be a non-empty string")
        return tuple(sorted(set(keys)))

    def _normalized_os_path(self, node: ast.AST) -> str | None:
        path = _attribute_path(node)
        if path is None:
            return None
        head, separator, tail = path.partition(".")
        if head not in self.os_aliases:
            return path
        return "os" + (separator + tail if separator else "")

    def _dynamic_environment_read(self, node: ast.AST, read_kind: str) -> None:
        # The interpolation helper intentionally expands an environment name
        # captured from source text. This exact source/symbol is the sole
        # repository exception; it remains visible as a deterministic fact.
        if (
            self.source == "toolkit/config.py"
            and self.symbol == "replace_env_vars_in_string.replacer"
            and read_kind == "os.environ.get"
        ):
            self._add(
                node,
                "<dynamic-environment-name>",
                "os.environ.get.dynamic",
                "environment",
                None,
            )
            return
        raise self._error(node, "dynamic environment key is not finite")

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.class_stack.append(node.name)
        for statement in node.body:
            self.visit(statement)
        self.class_stack.pop()

    def _visit_function(
        self, node: ast.FunctionDef | ast.AsyncFunctionDef
    ) -> None:
        self.function_stack.append(node.name)
        self.function_nodes.append(node)
        aliases: dict[str, str] = {}
        if node.args.kwarg is not None and node.args.kwarg.arg == "kwargs":
            aliases["kwargs"] = "kwargs"
        values: dict[str, tuple[str, ...]] = {}
        if self.class_stack:
            for argument in (
                list(node.args.posonlyargs)
                + list(node.args.args)
                + list(node.args.kwonlyargs)
            ):
                domain = self.parameter_domains.get(
                    (self.class_stack[-1], node.name, argument.arg)
                )
                if domain:
                    values[argument.arg] = domain
        self.aliases.append(aliases)
        self.values.append(values)
        for statement in node.body:
            self.visit(statement)
        self.values.pop()
        self.aliases.pop()
        self.function_nodes.pop()
        self.function_stack.pop()

    visit_FunctionDef = _visit_function
    visit_AsyncFunctionDef = _visit_function

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)
        kind = self._container_kind(node.value)
        literal_values = _literal_strings(node.value, self.current_values)
        for target in node.targets:
            target_path = _attribute_path(target)
            if target_path is not None:
                if kind is not None:
                    self.current_aliases[target_path] = kind
                else:
                    self.current_aliases.pop(target_path, None)
            if isinstance(target, ast.Name):
                if literal_values is not None:
                    self.current_values[target.id] = literal_values
                else:
                    self.current_values.pop(target.id, None)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is None:
            return
        synthetic = ast.Assign(targets=[node.target], value=node.value)
        ast.copy_location(synthetic, node)
        self.visit_Assign(synthetic)

    def _reject_conditional_alias_reassignment(self, node: ast.AST) -> None:
        if self.function_stack and self.function_stack[-1] in {
            "get_conf",
            "get_config",
        }:
            return
        tracked = set(self.current_aliases)
        if not tracked:
            return

        def is_read_as_container(path: str) -> bool:
            if not self.function_nodes:
                return False
            for inner in ast.walk(self.function_nodes[-1]):
                if (
                    isinstance(inner, ast.Call)
                    and isinstance(inner.func, ast.Attribute)
                    and inner.func.attr == "get"
                    and _attribute_path(inner.func.value) == path
                ):
                    return True
                if (
                    isinstance(inner, ast.Subscript)
                    and isinstance(inner.ctx, ast.Load)
                    and _attribute_path(inner.value) == path
                ):
                    return True
                if isinstance(inner, ast.Compare) and any(
                    _attribute_path(comparator) == path
                    for comparator in inner.comparators
                ):
                    return True
            return False

        def reject_path(path: str | None, owner: ast.AST) -> None:
            if path in tracked and path is not None and is_read_as_container(path):
                raise self._error(
                    owner, "conditional configuration alias reassignment"
                )

        if isinstance(node, (ast.For, ast.AsyncFor)):
            pending_targets = [node.target]
            while pending_targets:
                target = pending_targets.pop()
                if isinstance(target, (ast.Tuple, ast.List)):
                    pending_targets.extend(target.elts)
                elif isinstance(target, ast.Starred):
                    pending_targets.append(target.value)
                else:
                    reject_path(_attribute_path(target), node)
        if isinstance(node, (ast.Try, ast.TryStar)):
            for handler in node.handlers:
                reject_path(handler.name, handler)
        if isinstance(node, ast.Match):
            for pattern in ast.walk(node):
                if isinstance(pattern, (ast.MatchAs, ast.MatchStar)):
                    reject_path(pattern.name, pattern)
                elif isinstance(pattern, ast.MatchMapping):
                    reject_path(pattern.rest, pattern)

        for inner in ast.walk(node):
            if isinstance(inner, ast.Assign):
                targets = inner.targets
            elif isinstance(inner, (ast.AnnAssign, ast.AugAssign, ast.NamedExpr)):
                targets = [inner.target]
            elif isinstance(inner, ast.Delete):
                targets = inner.targets
            else:
                continue
            for target in targets:
                pending = [target]
                while pending:
                    candidate = pending.pop()
                    if isinstance(candidate, (ast.Tuple, ast.List)):
                        pending.extend(candidate.elts)
                        continue
                    if isinstance(candidate, ast.Starred):
                        pending.append(candidate.value)
                        continue
                    path = _attribute_path(candidate)
                    reject_path(path, inner)

    def visit_For(self, node: ast.For) -> None:
        self._reject_conditional_alias_reassignment(node)
        iterable = _literal_strings(node.iter, self.current_values)
        if isinstance(node.target, ast.Name) and iterable is not None:
            previous = self.current_values.get(node.target.id)
            self.current_values[node.target.id] = iterable
            for statement in node.body:
                self.visit(statement)
            if previous is None:
                self.current_values.pop(node.target.id, None)
            else:
                self.current_values[node.target.id] = previous
            for statement in node.orelse:
                self.visit(statement)
            return
        iterated_value = node.iter
        element_target = node.target
        if (
            isinstance(node.iter, ast.Call)
            and isinstance(node.iter.func, ast.Name)
            and node.iter.func.id == "enumerate"
            and node.iter.args
        ):
            iterated_value = node.iter.args[0]
            if isinstance(node.target, (ast.Tuple, ast.List)) and len(node.target.elts) >= 2:
                element_target = node.target.elts[1]
        element_kind = self._container_kind(iterated_value)
        if element_kind is not None:
            self.visit(node.iter)
            target_path = _attribute_path(element_target)
            if target_path is None:
                raise self._error(node, "configuration loop target is not statically named")
            previous = self.current_aliases.get(target_path)
            self.current_aliases[target_path] = element_kind
            for statement in node.body:
                self.visit(statement)
            if previous is None:
                self.current_aliases.pop(target_path, None)
            else:
                self.current_aliases[target_path] = previous
            for statement in node.orelse:
                self.visit(statement)
            return
        self.generic_visit(node)

    visit_AsyncFor = visit_For

    def visit_While(self, node: ast.While) -> None:
        self._reject_conditional_alias_reassignment(node)
        self.generic_visit(node)

    def _visit_state_branch(
        self,
        statements: Sequence[ast.stmt],
        aliases: dict[str, str],
        values: dict[str, tuple[str, ...]],
    ) -> tuple[dict[str, str], dict[str, tuple[str, ...]]]:
        self.aliases[-1] = dict(aliases)
        self.values[-1] = dict(values)
        for statement in statements:
            self.visit(statement)
        return dict(self.current_aliases), dict(self.current_values)

    def _merge_may_alias_states(
        self,
        alias_states: Sequence[dict[str, str]],
        value_states: Sequence[dict[str, tuple[str, ...]]],
    ) -> None:
        merged_aliases: dict[str, str] = {}
        for name in set().union(*(state.keys() for state in alias_states)):
            kinds = {state[name] for state in alias_states if name in state}
            merged_aliases[name] = kinds.pop() if len(kinds) == 1 else "dynamic"
        merged_values: dict[str, tuple[str, ...]] = {}
        for name in set.intersection(
            *(set(state) for state in value_states)
        ):
            merged_values[name] = tuple(
                sorted({value for state in value_states for value in state[name]})
            )
        self.aliases[-1] = merged_aliases
        self.values[-1] = merged_values

    def visit_Try(self, node: ast.Try) -> None:
        self._reject_conditional_alias_reassignment(node)
        if not self.aliases:
            self.generic_visit(node)
            return
        baseline_aliases = dict(self.current_aliases)
        baseline_values = dict(self.current_values)
        normal_aliases, normal_values = self._visit_state_branch(
            (*node.body, *node.orelse), baseline_aliases, baseline_values
        )
        alias_states = [normal_aliases]
        value_states = [normal_values]
        for handler in node.handlers:
            self.aliases[-1] = dict(baseline_aliases)
            self.values[-1] = dict(baseline_values)
            if handler.type is not None:
                self.visit(handler.type)
            handler_aliases, handler_values = self._visit_state_branch(
                handler.body, self.current_aliases, self.current_values
            )
            alias_states.append(handler_aliases)
            value_states.append(handler_values)
        self._merge_may_alias_states(alias_states, value_states)
        for statement in node.finalbody:
            self.visit(statement)

    visit_TryStar = visit_Try

    def visit_Match(self, node: ast.Match) -> None:
        self._reject_conditional_alias_reassignment(node)
        if not self.aliases:
            self.generic_visit(node)
            return
        self.visit(node.subject)
        baseline_aliases = dict(self.current_aliases)
        baseline_values = dict(self.current_values)
        alias_states = [baseline_aliases]
        value_states = [baseline_values]
        for case in node.cases:
            self.aliases[-1] = dict(baseline_aliases)
            self.values[-1] = dict(baseline_values)
            self.visit(case.pattern)
            if case.guard is not None:
                self.visit(case.guard)
            case_aliases, case_values = self._visit_state_branch(
                case.body, self.current_aliases, self.current_values
            )
            alias_states.append(case_aliases)
            value_states.append(case_values)
        self._merge_may_alias_states(alias_states, value_states)

    def visit_If(self, node: ast.If) -> None:
        if not self.aliases:
            self.generic_visit(node)
            return
        self.visit(node.test)
        baseline_aliases = dict(self.current_aliases)
        baseline_values = dict(self.current_values)

        self.aliases[-1] = dict(baseline_aliases)
        self.values[-1] = dict(baseline_values)
        for statement in node.body:
            self.visit(statement)
        body_aliases = dict(self.current_aliases)
        body_values = dict(self.current_values)

        self.aliases[-1] = dict(baseline_aliases)
        self.values[-1] = dict(baseline_values)
        for statement in node.orelse:
            self.visit(statement)
        else_aliases = dict(self.current_aliases)
        else_values = dict(self.current_values)

        merged_aliases: dict[str, str] = {}
        for name in set(body_aliases) | set(else_aliases):
            body_kind = body_aliases.get(name)
            else_kind = else_aliases.get(name)
            if body_kind == else_kind and body_kind is not None:
                merged_aliases[name] = body_kind
            elif body_kind is not None or else_kind is not None:
                merged_aliases[name] = "dynamic"
        merged_values: dict[str, tuple[str, ...]] = {}
        for name in set(body_values) | set(else_values):
            body_options = body_values.get(name)
            else_options = else_values.get(name)
            if body_options is not None and else_options is not None:
                merged_values[name] = tuple(sorted(set(body_options + else_options)))
        self.aliases[-1] = merged_aliases
        self.values[-1] = merged_values

    def visit_Subscript(self, node: ast.Subscript) -> None:
        if not isinstance(node.ctx, ast.Load):
            self.generic_visit(node)
            return
        if (
            isinstance(node.value, ast.Attribute)
            and self._normalized_os_path(node.value) == "os.environ"
        ):
            if _literal_strings(node.slice, self.current_values) is None:
                self._dynamic_environment_read(node, "os.environ[]")
                return
            for key in self._resolved_keys(node.slice, node):
                self._add(node, key, "os.environ[]", "environment", None)
            return
        kind = self._container_kind(node.value)
        if kind is not None:
            if kind == "dynamic":
                raise self._error(node, "branch-dependent configuration alias")
            if (
                self.function_stack
                and self.function_stack[-1] in {"get_conf", "get_config"}
            ):
                return
            for key in self._resolved_keys(node.slice, node):
                read_kind = "model_kwargs[]" if kind == "model_kwargs" else "kwargs[]"
                if kind == "attribute":
                    read_kind = "attribute[]"
                scope = "model" if kind == "model_kwargs" else "core"
                self._add(node, key, read_kind, scope, None)
            if isinstance(node.value, ast.Subscript):
                self.visit(node.value)
            return
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare) -> None:
        if (
            len(node.ops) == 1
            and isinstance(node.ops[0], (ast.In, ast.NotIn))
            and len(node.comparators) == 1
        ):
            container = node.comparators[0]
            kind = self._container_kind(container)
            if kind is not None:
                if kind == "dynamic":
                    raise self._error(node, "branch-dependent configuration alias")
                if (
                    self.function_stack
                    and self.function_stack[-1] in {"get_conf", "get_config"}
                ):
                    return
                if kind == "model_kwargs":
                    read_kind, scope = "model_kwargs.contains", "model"
                elif kind == "attribute":
                    read_kind, scope = "attribute.contains", "core"
                else:
                    read_kind, scope = "kwargs.contains", "core"
                for key in self._resolved_keys(node.left, node):
                    self._add(node, key, read_kind, scope, None)
                if isinstance(container, ast.Subscript):
                    self.visit(container)
                return
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if any(
            keyword.arg is None
            and isinstance(keyword.value, ast.Name)
            and keyword.value.id == "network_kwargs"
            for keyword in node.keywords
        ):
            self._discover_network_dispatch(node)
            for argument in node.args:
                self.visit(argument)
            for keyword in node.keywords:
                if keyword.arg is not None:
                    self.visit(keyword.value)
            return

        path = self._normalized_os_path(node.func)
        if path == "os.getenv":
            if not node.args:
                raise self._error(node, "os.getenv call has no key")
            if _literal_strings(node.args[0], self.current_values) is None:
                self._dynamic_environment_read(node, "os.getenv")
                return
            default = node.args[1] if len(node.args) > 1 else None
            for key in self._resolved_keys(node.args[0], node):
                self._add(node, key, "os.getenv", "environment", default)
            return
        if path == "os.environ.get":
            if not node.args:
                raise self._error(node, "os.environ.get call has no key")
            if _literal_strings(node.args[0], self.current_values) is None:
                self._dynamic_environment_read(node, "os.environ.get")
                return
            default = node.args[1] if len(node.args) > 1 else None
            for key in self._resolved_keys(node.args[0], node):
                self._add(node, key, "os.environ.get", "environment", default)
            return
        if isinstance(node.func, ast.Attribute) and node.func.attr == "add_argument":
            if not node.args:
                raise self._error(node, "argparse.add_argument call has no argument name")
            option_values = tuple(
                option
                for argument in node.args
                for option in self._resolved_keys(argument, node)
            )
            dest_keyword = next(
                (keyword.value for keyword in node.keywords if keyword.arg == "dest"),
                None,
            )
            if dest_keyword is not None:
                keys = self._resolved_keys(dest_keyword, node)
            else:
                long_options = [value for value in option_values if value.startswith("--")]
                selected = long_options[0] if long_options else option_values[0]
                keys = (selected.lstrip("-").replace("-", "_"),)
            default = next(
                (keyword.value for keyword in node.keywords if keyword.arg == "default"),
                None,
            )
            for key in keys:
                self._add(node, key, "argparse.add_argument", "cli", default)
            return

        if isinstance(node.func, ast.Attribute) and node.func.attr in {"get_conf", "get_config"}:
            if not node.args:
                raise self._error(node, f"{node.func.attr} call has no key")
            default = node.args[1] if len(node.args) > 1 else next(
                (keyword.value for keyword in node.keywords if keyword.arg == "default"),
                None,
            )
            for key in self._resolved_keys(node.args[0], node):
                self._add(node, key, node.func.attr, "core", default)
            return

        if isinstance(node.func, ast.Attribute) and node.func.attr == "get":
            kind = self._container_kind(node.func.value)
            if kind is not None:
                if kind == "dynamic":
                    raise self._error(node, "branch-dependent configuration alias")
                if not node.args:
                    raise self._error(node, "configuration get call has no key")
                # Accessor implementations deliberately accept a dynamic key; their
                # finite public call sites are catalogued instead.
                if (
                    self.function_stack
                    and self.function_stack[-1] in {"get_conf", "get_config"}
                ):
                    return
                default = node.args[1] if len(node.args) > 1 else None
                for key in self._resolved_keys(node.args[0], node):
                    if kind == "model_kwargs":
                        read_kind, scope = "model_kwargs.get", "model"
                    elif kind == "attribute":
                        read_kind, scope = "attribute.get", "core"
                    else:
                        read_kind, scope = "kwargs.get", "core"
                    self._add(node, key, read_kind, scope, default)
                return
        self.generic_visit(node)

    def _assigned_class_names(self, name: str) -> tuple[str, ...]:
        if not self.function_stack:
            return ()
        function_name = self.function_stack[-1]
        candidates: set[str] = set()
        for node in ast.walk(self.tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if node.name != function_name:
                continue
            for inner in ast.walk(node):
                if isinstance(inner, ast.Assign):
                    if any(
                        isinstance(target, ast.Name) and target.id == name
                        for target in inner.targets
                    ):
                        if isinstance(inner.value, ast.Name):
                            candidates.add(inner.value.id)
                        else:
                            raise self._error(
                                inner, "dynamic network_kwargs call target"
                            )
        return tuple(sorted(candidates))

    def _discover_network_dispatch(self, call: ast.Call) -> None:
        if not isinstance(call.func, ast.Name):
            raise self._error(call, "dynamic network_kwargs call target")
        if any(isinstance(argument, ast.Starred) for argument in call.args):
            raise self._error(call, "dynamic positional network_kwargs arguments")
        target_names = (
            (call.func.id,)
            if call.func.id in self.classes
            else self._assigned_class_names(call.func.id)
        )
        if not target_names:
            raise self._error(call, "dynamic network_kwargs call target")
        explicit_keywords = {
            keyword.arg for keyword in call.keywords if keyword.arg is not None
        }
        for target_name in target_names:
            infos = self.classes.get(target_name, [])
            if len(infos) != 1:
                raise self._error(
                    call, f"ambiguous network_kwargs target {target_name!r}"
                )
            constructor = next(
                (
                    node
                    for node in infos[0].node.body
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and node.name == "__init__"
                ),
                None,
            )
            if constructor is None:
                raise self._error(
                    call, f"network target {target_name!r} has no constructor"
                )
            positional_parameters = [
                argument.arg
                for argument in (
                    list(constructor.args.posonlyargs) + list(constructor.args.args)
                )
                if argument.arg not in {"self", "cls"}
            ]
            if len(call.args) > len(positional_parameters):
                raise self._error(
                    call, f"too many positional arguments for network target {target_name!r}"
                )
            explicit = set(explicit_keywords)
            explicit.update(positional_parameters[: len(call.args)])
            self._add_constructor_surface(infos[0], explicit, "accepted", set())

    def _add_constructor_surface(
        self,
        info: _ClassInfo,
        explicit: set[str],
        mode: str,
        seen: set[tuple[str, str]],
    ) -> None:
        marker = (info.source, info.node.name)
        if marker in seen:
            raise self._error(info.node, "cyclic network_kwargs constructor forwarding")
        seen = set(seen)
        seen.add(marker)
        constructor = next(
            (
                node
                for node in info.node.body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and node.name == "__init__"
            ),
            None,
        )
        if constructor is None:
            raise self._error(info.node, f"network target {info.node.name} has no constructor")
        positional = list(constructor.args.posonlyargs) + list(constructor.args.args)
        defaults: dict[str, ast.AST | None] = {
            argument.arg: None for argument in positional
        }
        offset = len(positional) - len(constructor.args.defaults)
        for argument, default in zip(positional[offset:], constructor.args.defaults):
            defaults[argument.arg] = default
        for argument, default in zip(
            constructor.args.kwonlyargs, constructor.args.kw_defaults
        ):
            defaults[argument.arg] = default
        defaults.pop("self", None)
        defaults.pop("cls", None)
        symbol = _class_method_symbol(info.node.name, "__init__")
        old_source = self.source
        old_classes = self.class_stack
        old_functions = self.function_stack
        self.source = info.source
        self.class_stack = [info.node.name]
        self.function_stack = ["__init__"]
        try:
            for key in sorted(defaults):
                if key in explicit:
                    read_kind = "network_kwargs.reserved"
                elif mode == "forwarded":
                    read_kind = "network_kwargs.forwarded"
                else:
                    read_kind = "network_kwargs.accepted"
                self.facts.append(
                    DiscoveredSetting(
                        info.source,
                        symbol,
                        constructor.lineno,
                        key,
                        read_kind,
                        "network",
                        _source_expression(defaults[key]),
                    )
                )

            if constructor.args.kwarg is not None:
                kwargs_name = constructor.args.kwarg.arg
                statement_positions = {
                    id(inner): position
                    for position, statement in enumerate(constructor.body)
                    for inner in ast.walk(statement)
                }
                direct_calls: dict[int, int] = {}
                reachable = True
                for position, statement in enumerate(constructor.body):
                    value: ast.AST | None = None
                    if isinstance(statement, ast.Expr):
                        value = statement.value
                    elif isinstance(statement, ast.Assign):
                        value = statement.value
                    elif isinstance(statement, ast.AnnAssign):
                        value = statement.value
                    if reachable and isinstance(value, ast.Call):
                        direct_calls[id(value)] = position
                    if isinstance(statement, (ast.Return, ast.Raise)):
                        reachable = False
                nested_nodes: set[int] = set()
                for inner in ast.walk(constructor):
                    if inner is constructor:
                        continue
                    if isinstance(
                        inner,
                        (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef),
                    ):
                        nested_nodes.update(id(descendant) for descendant in ast.walk(inner))

                forwarding_uses: set[int] = set()
                consumed_uses: set[int] = set()
                read_defaults: dict[str, ast.AST | None] = {}
                read_positions: dict[str, list[int]] = {}
                mutated_or_indexed_keys: set[str] = set()
                spread_calls: list[ast.Call] = []
                for inner in ast.walk(constructor):
                    if id(inner) in nested_nodes:
                        if isinstance(inner, ast.Call):
                            nested_spreads = [
                                keyword.value
                                for keyword in inner.keywords
                                if keyword.arg is None
                                and isinstance(keyword.value, ast.Name)
                                and keyword.value.id == kwargs_name
                            ]
                            if nested_spreads:
                                spread_calls.append(inner)
                                forwarding_uses.update(
                                    id(value) for value in nested_spreads
                                )
                        continue
                    if (
                        isinstance(inner, ast.Call)
                        and isinstance(inner.func, ast.Attribute)
                        and isinstance(inner.func.value, ast.Name)
                        and inner.func.value.id == kwargs_name
                        and inner.func.attr in {"get", "pop"}
                        and inner.args
                    ):
                        keys = _literal_strings(inner.args[0], {})
                        if keys is not None:
                            consumed_uses.add(id(inner.func.value))
                            if inner.func.attr == "get":
                                default = inner.args[1] if len(inner.args) > 1 else None
                                for key in keys:
                                    previous = read_defaults.get(key)
                                    if (
                                        key in read_defaults
                                        and _source_expression(previous)
                                        != _source_expression(default)
                                    ):
                                        raise self._error(
                                            inner,
                                            "conflicting reserved kwargs read defaults",
                                        )
                                    read_defaults[key] = default
                                    read_positions.setdefault(key, []).append(
                                        statement_positions[id(inner)]
                                    )
                            else:
                                mutated_or_indexed_keys.update(keys)
                    if (
                        isinstance(inner, ast.Subscript)
                        and isinstance(inner.ctx, ast.Load)
                        and isinstance(inner.value, ast.Name)
                        and inner.value.id == kwargs_name
                    ):
                        keys = _literal_strings(inner.slice, {})
                        if keys is not None:
                            consumed_uses.add(id(inner.value))
                            mutated_or_indexed_keys.update(keys)
                    if not isinstance(inner, ast.Call):
                        continue
                    spreads_kwargs = any(
                        keyword.arg is None
                        and isinstance(keyword.value, ast.Name)
                        and keyword.value.id == kwargs_name
                        for keyword in inner.keywords
                    )
                    if not spreads_kwargs:
                        continue
                    spread_calls.append(inner)
                    forwarding_uses.update(
                        id(keyword.value)
                        for keyword in inner.keywords
                        if keyword.arg is None
                        and isinstance(keyword.value, ast.Name)
                        and keyword.value.id == kwargs_name
                    )
                kwargs_is_consumed = any(
                    isinstance(inner, ast.Name)
                    and inner.id == kwargs_name
                    and isinstance(inner.ctx, ast.Load)
                    and id(inner) not in forwarding_uses
                    and id(inner) not in consumed_uses
                    for inner in ast.walk(constructor)
                )
                edge_read_keys = set(read_defaults)
                first_read_position = min(
                    (
                        position
                        for positions in read_positions.values()
                        for position in positions
                    ),
                    default=len(constructor.body),
                )
                forwarded = False
                for inner in spread_calls:
                    position = direct_calls.get(id(inner))
                    if position is None or (
                        edge_read_keys and position >= first_read_position
                    ):
                        continue
                    base_names: list[str] = []
                    if (
                        isinstance(inner.func, ast.Attribute)
                        and inner.func.attr == "__init__"
                        and isinstance(inner.func.value, ast.Call)
                        and isinstance(inner.func.value.func, ast.Name)
                        and inner.func.value.func.id == "super"
                    ):
                        base_names = [
                            base.id for base in info.node.bases if isinstance(base, ast.Name)
                        ]
                    elif (
                        isinstance(inner.func, ast.Attribute)
                        and inner.func.attr == "__init__"
                        and isinstance(inner.func.value, ast.Name)
                    ):
                        base_names = [inner.func.value.id]
                    if not base_names:
                        continue
                    for base_name in base_names:
                        base_infos = self.classes.get(base_name, [])
                        if len(base_infos) != 1:
                            raise self._error(
                                inner, f"unresolved forwarded constructor {base_name!r}"
                            )
                        self._add_constructor_surface(
                            base_infos[0], explicit, "forwarded", seen
                        )
                        forwarded = True
                # An unread terminal **kwargs is a dead sink, not an open
                # setting surface. Any later read/forward/expansion flips this
                # branch to a fail-closed error (covered by the mutation test).
                edge_read_keys = set(read_defaults)
                invalid_edge_reads = edge_read_keys.difference(explicit) | (
                    edge_read_keys & set(defaults)
                )
                invalid_consumption = bool(
                    kwargs_is_consumed
                    or mutated_or_indexed_keys
                    or invalid_edge_reads
                )
                if forwarded and invalid_consumption:
                    raise self._error(
                        constructor, "consumed forwarded kwargs sink"
                    )
                if not forwarded and (
                    spread_calls or invalid_consumption or edge_read_keys
                ):
                    raise self._error(
                        constructor, "unconstrained forwarded kwargs sink"
                    )
                if forwarded:
                    for key in sorted(edge_read_keys):
                        self.facts.append(
                            DiscoveredSetting(
                                info.source,
                                symbol,
                                constructor.lineno,
                                key,
                                "network_kwargs.reserved",
                                "network",
                                _source_expression(read_defaults[key]),
                            )
                        )
        finally:
            self.source = old_source
            self.class_stack = old_classes
            self.function_stack = old_functions


def _collect_source_paths(
    repository_root: Path, globs: Sequence[str]
) -> tuple[Path, ...]:
    if not globs:
        raise DiscoveryError("discovery requires at least one source glob")
    paths: dict[str, Path] = {}
    for index, pattern in enumerate(globs):
        if not isinstance(pattern, str) or not pattern:
            raise DiscoveryError(f"discovery glob {index} is empty or invalid")
        parsed = PurePosixPath(pattern)
        if "\\" in pattern or parsed.is_absolute() or ".." in parsed.parts:
            raise DiscoveryError(f"discovery glob is not a portable relative pattern: {pattern!r}")
        matches = sorted(path for path in repository_root.glob(pattern) if path.is_file())
        if not matches:
            raise DiscoveryError(f"discovery glob matched no files: {pattern!r}")
        for path in matches:
            if path.suffix != ".py":
                raise DiscoveryError(f"Python discovery glob matched non-Python source: {path}")
            paths[_portable_path(repository_root, path)] = path
    return tuple(paths[key] for key in sorted(paths))


def discover_python_settings(
    repository_root: Path, globs: Sequence[str]
) -> tuple[DiscoveredSetting, ...]:
    """Discover a finite setting inventory by parsing source files as AST only."""

    root = Path(repository_root)
    if not root.is_dir():
        raise DiscoveryError(f"repository root is not a directory: {root}")
    source_paths = _collect_source_paths(root, globs)
    parsed: list[tuple[str, ast.Module]] = []
    classes: dict[str, list[_ClassInfo]] = {}
    for source_path in source_paths:
        source = _portable_path(root, source_path)
        try:
            tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=source)
        except (OSError, UnicodeError, SyntaxError) as error:
            raise DiscoveryError(f"cannot parse {source}: {error}") from error
        parsed.append((source, tree))
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                classes.setdefault(node.name, []).append(_ClassInfo(source, node))

    facts: list[DiscoveredSetting] = []
    mutable_call_sites: dict[str, list[_MethodCall]] = {}
    mutable_method_references: dict[str, list[_MethodReference]] = {}

    def collect_method_uses(
        node: ast.AST,
        source: str,
        containing_class: str | None = None,
        parent: ast.AST | None = None,
    ) -> None:
        if isinstance(node, ast.ClassDef):
            containing_class = node.name
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            mutable_call_sites.setdefault(node.func.attr, []).append(
                (node, source, containing_class)
            )
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.ctx, ast.Load)
            and not (
                isinstance(parent, ast.Call)
                and parent.func is node
            )
        ):
            mutable_method_references.setdefault(node.attr, []).append(
                (node, source, containing_class)
            )
        for child in ast.iter_child_nodes(node):
            collect_method_uses(child, source, containing_class, node)

    for source, tree in parsed:
        collect_method_uses(tree, source)
    call_sites = {
        name: tuple(calls) for name, calls in mutable_call_sites.items()
    }
    method_references = {
        name: tuple(references)
        for name, references in mutable_method_references.items()
    }
    for source, tree in parsed:
        visitor = _SettingVisitor(
            source=source,
            tree=tree,
            classes=classes,
            call_sites=call_sites,
            method_references=method_references,
        )
        visitor.visit(tree)
        facts.extend(visitor.facts)

    reserved_kwargs_reads = {
        (fact.source, fact.symbol, fact.key)
        for fact in facts
        if fact.read_kind == "network_kwargs.reserved"
    }
    facts = [
        fact
        for fact in facts
        if not (
            fact.read_kind == "kwargs.get"
            and (fact.source, fact.symbol, fact.key) in reserved_kwargs_reads
        )
    ]
    unique: dict[_Identity, DiscoveredSetting] = {}
    for fact in sorted(
        facts,
        key=lambda item: (
            item.source,
            item.symbol,
            item.key,
            item.read_kind,
            item.line,
            item.default_expression or "",
        ),
    ):
        unique.setdefault(_identity(fact), fact)
    return tuple(unique.values())


def validate_setting_ownership(
    discovered: Sequence[DiscoveredSetting],
    catalog_claims: Sequence[SourceClaim],
    exclusions: Sequence[Exclusion],
) -> None:
    """Require one exact owner for every read and reject stale declarations."""

    discovered_by_identity: dict[_Identity, DiscoveredSetting] = {}
    for fact in discovered:
        identity = _identity(fact)
        if identity in discovered_by_identity:
            raise DiscoveryError(f"duplicate discovered logical read: {identity!r}")
        discovered_by_identity[identity] = fact

    owners: dict[_Identity, list[str]] = {}
    for claim in catalog_claims:
        identity_fields = (claim.source, claim.symbol, claim.key, claim.read_kind)
        if not all(identity_fields) or any(
            metacharacter in field
            for field in identity_fields
            for metacharacter in "*?["
        ):
            raise DiscoveryError(f"catalog claim requires exact identity: {claim!r}")
        _portable_declaration(claim.source, "catalog claim source", glob=False)
        owners.setdefault(_identity(claim), []).append("catalog")
    for exclusion in exclusions:
        if not exclusion.symbol or any(
            metacharacter in exclusion.symbol for metacharacter in "*?["
        ):
            raise DiscoveryError(f"exclusion requires an exact symbol: {exclusion!r}")
        if "*" in exclusion.key or "*" in exclusion.read_kind:
            raise DiscoveryError(f"blanket exclusion is forbidden: {exclusion!r}")
        if any(
            metacharacter in field
            for field in (exclusion.source, exclusion.key, exclusion.read_kind)
            for metacharacter in "?["):
            raise DiscoveryError(f"exclusion requires an exact identity: {exclusion!r}")
        _portable_declaration(exclusion.source, "exclusion source", glob=False)
        if not exclusion.reason or not exclusion.reason.strip():
            raise DiscoveryError(f"exclusion requires a reason: {exclusion!r}")
        if exclusion.reason not in _APPROVED_EXCLUSION_REASONS:
            raise DiscoveryError(
                "exclusion reason must be an approved category: "
                f"{exclusion.reason!r}"
            )
        owners.setdefault(_identity(exclusion), []).append("exclusion")

    for identity, identity_owners in sorted(owners.items()):
        if len(identity_owners) != 1:
            raise DiscoveryError(
                f"setting has multiple owners {identity_owners!r}: {identity!r}"
            )
        if identity not in discovered_by_identity:
            raise DiscoveryError(f"declared source has vanished: {identity!r}")
    for identity in sorted(discovered_by_identity):
        if identity not in owners:
            raise DiscoveryError(f"discovered setting is unowned: {identity!r}")


def ownership_status(
    discovered: Iterable[DiscoveredSetting],
    catalog_claims: Sequence[SourceClaim],
    exclusions: Sequence[Exclusion],
) -> tuple[tuple[DiscoveredSetting, str], ...]:
    """Return deterministic ownership labels for inventory reporting."""

    claim_ids = {_identity(claim) for claim in catalog_claims}
    exclusion_ids = {_identity(exclusion) for exclusion in exclusions}
    rows: list[tuple[DiscoveredSetting, str]] = []
    for fact in discovered:
        identity = _identity(fact)
        count = int(identity in claim_ids) + int(identity in exclusion_ids)
        if count > 1:
            status = "double-owned"
        elif identity in claim_ids:
            status = "cataloged"
        elif identity in exclusion_ids:
            status = "excluded"
        else:
            status = "unowned"
        rows.append((fact, status))
    return tuple(rows)


def validate_discovery_target(
    discovered: Sequence[DiscoveredSetting],
    catalog_claims: Sequence[SourceClaim],
    exclusions: Sequence[Exclusion],
    *,
    declared_sources: Sequence[str],
    target_source: str | None = None,
    target_symbol: str | None = None,
) -> None:
    """Validate one exact source or source/symbol slice in isolation."""

    if bool(target_source) == bool(target_symbol):
        raise DiscoveryError(
            "target-source and target-symbol are mutually exclusive and exactly one is required"
        )
    declared = set(declared_sources)
    selected_source: str
    selected_symbol: str | None
    if target_source is not None:
        if any(character in target_source for character in "*?["):
            raise DiscoveryError("target-source must be an exact source path")
        selected_source = target_source
        selected_symbol = None
    else:
        assert target_symbol is not None
        if target_symbol.count("::") != 1:
            raise DiscoveryError(
                "target-symbol format must be <portable-source-path>::<exact-symbol>"
            )
        selected_source, selected_symbol = target_symbol.split("::", 1)
        if not selected_source or not selected_symbol or any(
            character in target_symbol for character in "*?["
        ):
            raise DiscoveryError("target-symbol requires an exact source and symbol")
    if selected_source not in declared:
        raise DiscoveryError(
            f"target is not in the declared source union: {selected_source!r}"
        )
    selected = tuple(
        fact
        for fact in discovered
        if fact.source == selected_source
        and (selected_symbol is None or fact.symbol == selected_symbol)
    )
    if not selected:
        raise DiscoveryError("target discovered no facts")
    selected_claims = tuple(
        claim
        for claim in catalog_claims
        if claim.source == selected_source
        and (selected_symbol is None or claim.symbol == selected_symbol)
    )
    selected_exclusions = tuple(
        exclusion
        for exclusion in exclusions
        if exclusion.source == selected_source
        and (selected_symbol is None or exclusion.symbol == selected_symbol)
    )
    validate_setting_ownership(selected, selected_claims, selected_exclusions)
