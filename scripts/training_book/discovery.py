"""Fail-closed, import-free discovery of Python configuration surfaces."""

from __future__ import annotations

import ast
import json
from dataclasses import dataclass
from functools import cache
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Iterable, Iterator, Sequence


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


@dataclass
class _SettingState:
    aliases: dict[str, str]
    values: dict[str, tuple[str, ...]]
    iterables: dict[str, tuple[str, ...]]
    bindings: set[str]


@dataclass
class _StatementFlow:
    falls_through: bool
    terminals: tuple[tuple[str, _SettingState], ...] = ()
    prefixes: tuple[_SettingState, ...] = ()


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
_APPROVED_ACCESSOR_SYMBOLS = {
    ("jobs/BaseJob.py", "BaseJob.get_conf"),
    ("jobs/process/BaseProcess.py", "BaseProcess.get_conf"),
    ("toolkit/config.py", "get_config"),
    ("toolkit/data_loader.py", "ImageDataset.get_config"),
    ("toolkit/data_loader.py", "PairedImageDataset.get_config"),
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


def _reflective_method_lookup(
    node: ast.AST,
    aliases: frozenset[str] = frozenset(),
) -> tuple[ast.AST, str | None, bool] | None:
    if not isinstance(node, ast.Call) or node.keywords:
        return None
    if _attribute_path(node.func) in {"getattr", "builtins.getattr"} and len(
        node.args
    ) in {2, 3}:
        receiver, name = node.args[:2]
        ambiguous = False
    elif (
        isinstance(node.func, ast.Name)
        and node.func.id in aliases
        and len(node.args) >= 2
    ):
        receiver, name = node.args[:2]
        ambiguous = True
    elif (
        isinstance(node.func, ast.Attribute)
        and node.func.attr == "__getattribute__"
        and len(node.args) == 1
    ):
        receiver, name = node.func.value, node.args[0]
        ambiguous = False
    elif (
        _attribute_path(node.func) == "object.__getattribute__" and len(node.args) == 2
    ):
        receiver, name = node.args
        ambiguous = False
    else:
        return None
    method_name = (
        name.value
        if isinstance(name, ast.Constant) and isinstance(name.value, str)
        else None
    )
    return receiver, method_name, ambiguous


def _class_method_symbol(class_name: str, method_name: str) -> str:
    return f"{class_name}.{method_name}"


@dataclass(frozen=True)
class _ClassInfo:
    source: str
    node: ast.ClassDef


_MethodOwner = tuple[str, str]
_FunctionNode = ast.FunctionDef | ast.AsyncFunctionDef | ast.Lambda


@dataclass(frozen=True)
class _CallerInfo:
    source: str
    class_name: str | None
    function: _FunctionNode | None
    direct_method: bool


_MethodCall = tuple[ast.Call, _CallerInfo]
_MethodReference = tuple[ast.Attribute, _CallerInfo]


def _class_info(
    classes: dict[str, list[_ClassInfo]], owner: _MethodOwner
) -> _ClassInfo | None:
    source, class_name = owner
    candidates = [
        info for info in classes.get(class_name, ()) if info.source == source
    ]
    return candidates[0] if len(candidates) == 1 else None


def _base_infos(
    classes: dict[str, list[_ClassInfo]], info: _ClassInfo
) -> tuple[list[_ClassInfo], bool]:
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
        bases, uncertain = _base_infos(classes, info)
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


@cache
def _bound_receiver(
    caller: _CallerInfo,
) -> tuple[str | None, bool]:
    function = caller.function
    if not caller.direct_method or function is None:
        return None, True
    if function.decorator_list and not (
        len(function.decorator_list) == 1
        and isinstance(function.decorator_list[0], ast.Name)
        and function.decorator_list[0].id == "classmethod"
    ):
        return None, True
    positional = list(function.args.posonlyargs) + list(function.args.args)
    if not positional:
        return None, True
    receiver = positional[0].arg

    def binds_receiver(node: ast.AST) -> bool:
        if (
            isinstance(node, ast.Name)
            and node.id == receiver
            and isinstance(node.ctx, (ast.Store, ast.Del))
        ):
            return True
        if (
            isinstance(node, (ast.Global, ast.Nonlocal))
            and receiver in node.names
        ):
            return True
        if isinstance(node, ast.ExceptHandler) and node.name == receiver:
            return True
        if isinstance(node, (ast.MatchAs, ast.MatchStar)):
            return node.name == receiver
        if isinstance(node, ast.MatchMapping):
            return node.rest == receiver
        if isinstance(
            node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
        ):
            return node.name == receiver
        if isinstance(node, ast.alias):
            bound_name = node.asname or node.name.split(".", maxsplit=1)[0]
            return node.name != "*" and bound_name == receiver
        return False

    rebound = any(
        binds_receiver(node)
        for statement in function.body
        for node in ast.walk(statement)
    )
    return receiver, rebound


def _receiver_method_owners(
    *,
    receiver: ast.AST,
    caller: _CallerInfo,
    method_name: str,
    classes: dict[str, list[_ClassInfo]],
) -> tuple[frozenset[_MethodOwner], bool, bool]:
    bound_receiver, rebound = _bound_receiver(caller)
    if (
        isinstance(receiver, ast.Name)
        and bound_receiver is not None
        and receiver.id == bound_receiver
    ):
        if rebound:
            return frozenset(), True, True
        owners, uncertain = _resolve_method_owners(
            classes=classes,
            caller_source=caller.source,
            caller_class=caller.class_name,
            method_name=method_name,
            super_only=False,
        )
        return owners, uncertain, True
    if (
        isinstance(receiver, ast.Call)
        and isinstance(receiver.func, ast.Name)
        and receiver.func.id == "super"
    ):
        if receiver.args or receiver.keywords or bound_receiver is None or rebound:
            return frozenset(), True, False
        owners, uncertain = _resolve_method_owners(
            classes=classes,
            caller_source=caller.source,
            caller_class=caller.class_name,
            method_name=method_name,
            super_only=True,
        )
        return owners, uncertain, False
    return frozenset(), True, False


def _method_use_applies(
    *,
    receiver: ast.AST,
    caller: _CallerInfo,
    target_owner: _MethodOwner,
    method_name: str,
    classes: dict[str, list[_ClassInfo]],
) -> tuple[bool, bool]:
    owners, uncertain, _ = _receiver_method_owners(
        receiver=receiver,
        caller=caller,
        method_name=method_name,
        classes=classes,
    )
    return uncertain or target_owner in owners, uncertain


def _inherits_from(
    *,
    classes: dict[str, list[_ClassInfo]],
    candidate: _ClassInfo,
    ancestor: _MethodOwner,
    seen: frozenset[_MethodOwner] = frozenset(),
) -> bool:
    owner = (candidate.source, candidate.node.name)
    if owner in seen:
        return False
    seen = seen | {owner}
    for base in _base_infos(classes, candidate)[0]:
        base_owner = (base.source, base.node.name)
        if base_owner == ancestor or _inherits_from(
            classes=classes,
            candidate=base,
            ancestor=ancestor,
            seen=seen,
        ):
            return True
    return False


def _inherited_caller_has_producer_override(
    *,
    classes: dict[str, list[_ClassInfo]],
    caller: _CallerInfo,
    producer_name: str,
    producer_owner: _MethodOwner,
) -> bool:
    if caller.class_name is None or caller.function is None:
        return True
    caller_owner = (caller.source, caller.class_name)
    for candidates in classes.values():
        for candidate in candidates:
            candidate_owner = (candidate.source, candidate.node.name)
            if candidate_owner == caller_owner or not _inherits_from(
                classes=classes,
                candidate=candidate,
                ancestor=caller_owner,
            ):
                continue
            caller_owners, caller_uncertain = _resolve_method_owners(
                classes=classes,
                caller_source=candidate.source,
                caller_class=candidate.node.name,
                method_name=caller.function.name,
                super_only=False,
            )
            if caller_uncertain:
                return True
            if caller_owners != {caller_owner}:
                continue
            producer_owners, producer_uncertain = _resolve_method_owners(
                classes=classes,
                caller_source=candidate.source,
                caller_class=candidate.node.name,
                method_name=producer_name,
                super_only=False,
            )
            if producer_uncertain or producer_owners != {producer_owner}:
                return True
    return False


def _parameter_domains(
    source: str,
    tree: ast.Module,
    classes: dict[str, list[_ClassInfo]],
    call_sites: dict[str, tuple[_MethodCall, ...]],
    method_references: dict[str, tuple[_MethodReference, ...]],
    inherited_override_cache: dict[
        tuple[str, str, str, str, _MethodOwner], bool
    ],
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
        def finite_method_return(
            call: ast.Call,
            caller: _CallerInfo,
        ) -> tuple[str, ...] | None:
            if (
                call.args
                or call.keywords
                or not isinstance(call.func, ast.Attribute)
            ):
                return None
            owners, uncertain, virtual = _receiver_method_owners(
                receiver=call.func.value,
                caller=caller,
                method_name=call.func.attr,
                classes=classes,
            )
            if uncertain or len(owners) != 1:
                return None
            producer_source, producer_class = next(iter(owners))
            producer_owner = (producer_source, producer_class)
            if virtual:
                assert caller.class_name is not None
                assert caller.function is not None
                cache_key = (
                    caller.source,
                    caller.class_name,
                    caller.function.name,
                    call.func.attr,
                    producer_owner,
                )
                if cache_key not in inherited_override_cache:
                    inherited_override_cache[cache_key] = (
                        _inherited_caller_has_producer_override(
                            classes=classes,
                            caller=caller,
                            producer_name=call.func.attr,
                            producer_owner=producer_owner,
                        )
                    )
                if inherited_override_cache[cache_key]:
                    return None
            producer_class_info = _class_info(classes, producer_owner)
            if producer_class_info is None:
                return None
            producer = next(
                (
                    node
                    for node in producer_class_info.node.body
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and node.name == call.func.attr
                ),
                None,
            )
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

        def call_values(
            argument: ast.AST,
            caller: _CallerInfo,
        ) -> tuple[str, ...] | None:
            values = _literal_strings(argument, {})
            if values is not None:
                return values
            if isinstance(argument, ast.Call):
                return finite_method_return(argument, caller)
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
            if (
                not isinstance(target, ast.FunctionDef)
                or target.decorator_list
                or any(
                    isinstance(inner, (ast.Yield, ast.YieldFrom))
                    for inner in ast.walk(target)
                )
            ):
                unresolved.update(
                    (class_name, target_name, parameter)
                    for parameter in target_parameters
                )
            for reference, caller in method_references.get(
                target_name, ()
            ):
                applies, _ = _method_use_applies(
                    receiver=reference.value,
                    caller=caller,
                    target_owner=target_owner,
                    method_name=target_name,
                    classes=classes,
                )
                if applies:
                    unresolved.update(
                        (class_name, target_name, parameter)
                        for parameter in target_parameters
                    )
            for call, caller in call_sites.get(target_name, ()):
                applies, uncertain_receiver = _method_use_applies(
                    receiver=call.func.value,
                    caller=caller,
                    target_owner=target_owner,
                    method_name=target_name,
                    classes=classes,
                )
                if not applies:
                    continue
                if uncertain_receiver or getattr(
                    call.func, "_dynamic_reflective_name", False
                ):
                    unresolved.update(
                        (class_name, target_name, parameter)
                        for parameter in target_parameters
                    )
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
                    values = call_values(argument, caller)
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
                        values = call_values(keyword.value, caller)
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
                            values = call_values(value_node, caller)
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
                    values = call_values(
                        default,
                        _CallerInfo(source, class_name, target, False),
                    )
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
        inherited_override_cache: dict[
            tuple[str, str, str, str, _MethodOwner], bool
        ],
    ) -> None:
        self.source = source
        self.tree = tree
        self.classes = classes
        self.postponed_annotations = any(
            isinstance(node, ast.ImportFrom)
            and node.module == "__future__"
            and any(alias.name == "annotations" for alias in node.names)
            for node in tree.body
        )
        self.parameter_domains, self.unresolved_parameter_calls = _parameter_domains(
            source,
            tree,
            classes,
            call_sites,
            method_references,
            inherited_override_cache,
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
        self.aliases: list[dict[str, str]] = [{}]
        self.values: list[dict[str, tuple[str, ...]]] = [{}]
        self.iterables: list[dict[str, tuple[str, ...]]] = [{}]
        self.value_bindings: list[set[str]] = [set()]
        self.scope_frames: list[str] = ["module"]
        self.pending_class_bindings: list[tuple[int, str]] = []
        self.binding_declarations: list[dict[str, int]] = []
        self.expression_prefix_frames: list[tuple[int, list[_SettingState]]] = []
        self.accessor_suppression_cache: dict[int, bool] = {}
        self.facts: list[DiscoveredSetting] = []

    def visit(self, node: ast.AST) -> object:
        result = super().visit(node)
        if isinstance(node, ast.expr) and self.expression_prefix_frames:
            frame_index, prefixes = self.expression_prefix_frames[-1]
            prefixes.append(self._capture_state(frame_index))
        return result

    @property
    def symbol(self) -> str:
        parts = self.class_stack + self.function_stack
        return ".".join(parts) if parts else "<module>"

    @property
    def current_aliases(self) -> dict[str, str]:
        return self.aliases[-1] if self.aliases else {}

    @property
    def current_values(self) -> dict[str, tuple[str, ...]]:
        return self.values[-1]

    @property
    def current_iterables(self) -> dict[str, tuple[str, ...]]:
        return self.iterables[-1]

    def _visible_frame_indices(self) -> tuple[int, ...]:
        """Return lexical frames visible to the current expression.

        A class body can read an enclosing module or function, but not an
        enclosing class namespace. Its own namespace is likewise not a closure
        for functions, lambdas, or comprehensions defined inside it.
        """

        namespace_barriers = {"class", "function", "lambda", "comprehension"}
        return tuple(
            index
            for index, frame in enumerate(self.scope_frames)
            if frame != "class"
            or not any(
                inner in namespace_barriers
                for inner in self.scope_frames[index + 1 :]
            )
        )

    @property
    def visible_values(self) -> dict[str, tuple[str, ...]]:
        visible: dict[str, tuple[str, ...]] = {}
        for index in self._visible_frame_indices():
            for name in self.value_bindings[index]:
                visible.pop(name, None)
            visible.update(self.values[index])
        for class_index, name in self.pending_class_bindings:
            if any(
                frame in {"function", "lambda"}
                for frame in self.scope_frames[class_index + 1 :]
            ):
                visible.pop(name, None)
        return visible

    @property
    def visible_iterables(self) -> dict[str, tuple[str, ...]]:
        visible: dict[str, tuple[str, ...]] = {}
        for index in self._visible_frame_indices():
            for name in self.value_bindings[index]:
                visible.pop(name, None)
            visible.update(self.iterables[index])
        for class_index, name in self.pending_class_bindings:
            if any(
                frame in {"function", "lambda"}
                for frame in self.scope_frames[class_index + 1 :]
            ):
                visible.pop(name, None)
        return visible

    def _iterable_strings(self, node: ast.AST) -> tuple[str, ...] | None:
        if isinstance(node, ast.Name):
            return self.visible_iterables.get(node.id)
        if not isinstance(node, (ast.Tuple, ast.List, ast.Set)):
            return None
        values: list[str] = []
        for element in node.elts:
            if isinstance(element, (ast.Tuple, ast.List, ast.Set)):
                return None
            element_values = _literal_strings(element, self.visible_values)
            if element_values is None:
                return None
            values.extend(element_values)
        return tuple(values)

    def _visible_alias_state(self, path: str) -> str | None:
        if any(
            (path == name or path.startswith(f"{name}."))
            and any(
                frame in {"function", "lambda"}
                for frame in self.scope_frames[class_index + 1 :]
            )
            for class_index, name in self.pending_class_bindings
        ):
            return "shadowed"
        for index in reversed(self._visible_frame_indices()):
            if path not in self.aliases[index]:
                continue
            return self.aliases[index][path]
        return None

    def _visible_alias(self, path: str) -> str | None:
        kind = self._visible_alias_state(path)
        return None if kind == "shadowed" else kind

    def _push_scope(self, frame: str) -> None:
        self.aliases.append({})
        self.values.append({})
        self.iterables.append({})
        self.value_bindings.append(set())
        self.scope_frames.append(frame)

    def _pop_scope(self) -> None:
        self.scope_frames.pop()
        self.value_bindings.pop()
        self.iterables.pop()
        self.values.pop()
        self.aliases.pop()

    def _binding_frame(self, name: str, fallback: int = -1) -> int:
        if self.binding_declarations and name in self.binding_declarations[-1]:
            return self.binding_declarations[-1][name]
        return fallback

    def _bind_unknown(self, name: str, frame_index: int | None = None) -> None:
        if frame_index is None:
            frame_index = self._binding_frame(name)
        self.values[frame_index].pop(name, None)
        self.iterables[frame_index].pop(name, None)
        self.value_bindings[frame_index].add(name)

    def _bind_literal(
        self,
        name: str,
        values: tuple[str, ...],
        frame_index: int | None = None,
        iterable_values: tuple[str, ...] | None = None,
    ) -> None:
        if frame_index is None:
            frame_index = self._binding_frame(name)
        self.values[frame_index][name] = values
        if iterable_values is None:
            self.iterables[frame_index].pop(name, None)
        else:
            self.iterables[frame_index][name] = iterable_values
        self.value_bindings[frame_index].add(name)

    def _bind_target_unknown(
        self, target: ast.AST, frame_index: int | None = None
    ) -> None:
        if isinstance(target, ast.Name):
            if frame_index is None:
                frame_index = self._binding_frame(target.id)
            if self._visible_alias_state(target.id) is not None:
                self.aliases[frame_index][target.id] = "shadowed"
            self._bind_unknown(target.id, frame_index)
            return
        if isinstance(target, ast.Attribute):
            if frame_index is None:
                path = _attribute_path(target)
                head = None if path is None else path.split(".", maxsplit=1)[0]
                frame_index = -1 if head is None else self._binding_frame(head)
            path = _attribute_path(target)
            if path is not None and self._container_kind(target) is not None:
                self.aliases[frame_index][path] = "shadowed"
            return
        if isinstance(target, (ast.Tuple, ast.List)):
            for element in target.elts:
                self._bind_target_unknown(element, frame_index)
        elif isinstance(target, ast.Starred):
            self._bind_target_unknown(target.value, frame_index)

    def _bind_name_unknown(self, name: str, frame_index: int | None = None) -> None:
        self._bind_target_unknown(ast.Name(id=name, ctx=ast.Store()), frame_index)

    def _capture_state(self, frame_index: int = -1) -> _SettingState:
        return _SettingState(
            dict(self.aliases[frame_index]),
            dict(self.values[frame_index]),
            dict(self.iterables[frame_index]),
            set(self.value_bindings[frame_index]),
        )

    def _restore_state(
        self, state: _SettingState, frame_index: int = -1
    ) -> None:
        self.aliases[frame_index] = dict(state.aliases)
        self.values[frame_index] = dict(state.values)
        self.iterables[frame_index] = dict(state.iterables)
        self.value_bindings[frame_index] = set(state.bindings)

    def _merge_states(
        self, states: Sequence[_SettingState], frame_index: int = -1
    ) -> _SettingState:
        if not states:
            raise ValueError("cannot merge an empty setting-state sequence")
        self._merge_may_alias_states(
            tuple(state.aliases for state in states),
            tuple(state.values for state in states),
            tuple(state.iterables for state in states),
            tuple(state.bindings for state in states),
            frame_index,
        )
        return self._capture_state(frame_index)

    def _capture_scope_state(self) -> tuple[_SettingState, ...]:
        return tuple(
            self._capture_state(index) for index in range(len(self.aliases))
        )

    def _restore_scope_state(
        self, states: Sequence[_SettingState]
    ) -> None:
        if len(states) != len(self.aliases):
            raise ValueError("setting scope depth changed across expression paths")
        for index, state in enumerate(states):
            self._restore_state(state, index)

    def _merge_scope_states(
        self, paths: Sequence[Sequence[_SettingState]]
    ) -> tuple[_SettingState, ...]:
        if not paths or any(len(path) != len(self.aliases) for path in paths):
            raise ValueError("setting scope paths have inconsistent depths")
        return tuple(
            self._merge_states(
                tuple(path[index] for path in paths), index
            )
            for index in range(len(self.aliases))
        )

    def _visit_statements(
        self, statements: Sequence[ast.stmt]
    ) -> _StatementFlow:
        prefixes = [self._capture_state()]
        terminals: list[tuple[str, _SettingState]] = []
        for statement in statements:
            expression_prefixes: list[_SettingState] = []
            self.expression_prefix_frames.append(
                (len(self.scope_frames) - 1, expression_prefixes)
            )
            try:
                result = self.visit(statement)
            finally:
                self.expression_prefix_frames.pop()
            prefixes.extend(expression_prefixes)
            if isinstance(result, _StatementFlow):
                prefixes.extend(result.prefixes)
            prefixes.append(self._capture_state())
            if isinstance(result, _StatementFlow):
                terminals.extend(result.terminals)
                if not result.falls_through:
                    return _StatementFlow(
                        False, tuple(terminals), tuple(prefixes)
                    )
        return _StatementFlow(True, tuple(terminals), tuple(prefixes))

    def visit_Module(self, node: ast.Module) -> None:
        self._visit_statements(node.body)

    def visit_Break(self, node: ast.Break) -> _StatementFlow:
        return _StatementFlow(False, (("break", self._capture_state()),))

    def visit_Continue(self, node: ast.Continue) -> _StatementFlow:
        return _StatementFlow(False, (("continue", self._capture_state()),))

    def visit_Return(self, node: ast.Return) -> _StatementFlow:
        if node.value is not None:
            self.visit(node.value)
        return _StatementFlow(False, (("return", self._capture_state()),))

    def visit_Raise(self, node: ast.Raise) -> _StatementFlow:
        if node.exc is not None:
            self.visit(node.exc)
        if node.cause is not None:
            self.visit(node.cause)
        return _StatementFlow(False, (("raise", self._capture_state()),))

    def _error(self, node: ast.AST, message: str) -> DiscoveryError:
        return DiscoveryError(
            f"{self.source}::{self.symbol} line {getattr(node, 'lineno', '?')}: {message}"
        )

    def _suppress_accessor_body_reads(self) -> bool:
        if not self.function_nodes or (
            self.source, self.symbol
        ) not in _APPROVED_ACCESSOR_SYMBOLS:
            return False
        function = self.function_nodes[-1]
        cache_key = id(function)
        cached = self.accessor_suppression_cache.get(cache_key)
        if cached is not None:
            return cached
        approved = self._prove_accessor_body(function)
        self.accessor_suppression_cache[cache_key] = approved
        return approved

    def _prove_accessor_body(
        self, function: ast.FunctionDef | ast.AsyncFunctionDef
    ) -> bool:
        if not isinstance(function, ast.FunctionDef) or function.decorator_list:
            return False
        parameters = {
            argument.arg
            for argument in (
                *function.args.posonlyargs,
                *function.args.args,
                *function.args.kwonlyargs,
            )
        }
        if "key" not in parameters or not self.class_stack:
            return False
        if any(
            isinstance(inner, ast.Name)
            and inner.id == "key"
            and isinstance(inner.ctx, (ast.Store, ast.Del))
            for statement in function.body
            for inner in ast.walk(statement)
        ):
            return False
        domain_key = (self.class_stack[-1], function.name, "key")
        if (
            not self.parameter_domains.get(domain_key)
            or domain_key in self.unresolved_parameter_calls
        ):
            return False

        derived_keys = {"key"}
        derived_collections: set[str] = set()
        containers = {"config", "self.config"}
        allow_value_alias = (
            self.source,
            self.symbol,
        ) == ("jobs/process/BaseProcess.py", "BaseProcess.get_conf")
        changed = True
        while changed:
            changed = False
            for inner in ast.walk(function):
                if (
                    isinstance(inner, ast.Assign)
                    and len(inner.targets) == 1
                    and isinstance(inner.targets[0], ast.Name)
                ):
                    target = inner.targets[0].id
                    value_path = _attribute_path(inner.value)
                    if (
                        allow_value_alias
                        and target == "value"
                        and value_path in containers
                        and target not in containers
                    ):
                        containers.add(target)
                        changed = True
                    if (
                        isinstance(inner.value, ast.Call)
                        and isinstance(inner.value.func, ast.Attribute)
                        and inner.value.func.attr == "split"
                        and isinstance(inner.value.func.value, ast.Name)
                        and inner.value.func.value.id in derived_keys
                        and target not in derived_collections
                    ):
                        derived_collections.add(target)
                        changed = True
                if (
                    isinstance(inner, (ast.For, ast.AsyncFor))
                    and isinstance(inner.target, ast.Name)
                    and isinstance(inner.iter, ast.Name)
                    and inner.iter.id in derived_collections
                    and inner.target.id not in derived_keys
                ):
                    derived_keys.add(inner.target.id)
                    changed = True

        found_read = False
        for inner in ast.walk(function):
            key_node: ast.AST | None = None
            if (
                isinstance(inner, ast.Subscript)
                and isinstance(inner.ctx, ast.Load)
                and _attribute_path(inner.value) in containers
            ):
                key_node = inner.slice
            elif (
                isinstance(inner, ast.Compare)
                and len(inner.ops) == 1
                and isinstance(inner.ops[0], (ast.In, ast.NotIn))
                and len(inner.comparators) == 1
                and _attribute_path(inner.comparators[0]) in containers
            ):
                key_node = inner.left
            elif (
                isinstance(inner, ast.Call)
                and isinstance(inner.func, ast.Attribute)
                and inner.func.attr == "get"
                and _attribute_path(inner.func.value) in containers
            ):
                if not inner.args:
                    return False
                key_node = inner.args[0]
            if key_node is None:
                continue
            found_read = True
            if not (
                isinstance(key_node, ast.Name)
                and key_node.id in derived_keys
            ):
                return False
        return found_read

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
        alias_kind = self._visible_alias_state(path)
        if alias_kind == "shadowed":
            return None
        if alias_kind is not None:
            return alias_kind
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
        keys = _literal_strings(node, self.visible_values)
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
        for expression in (
            *node.decorator_list,
            *node.bases,
            *(keyword.value for keyword in node.keywords),
            *getattr(node, "type_params", ()),
        ):
            self.visit(expression)
        self.class_stack.append(node.name)
        self._push_scope("class")
        self.binding_declarations.append({})
        self.pending_class_bindings.append(
            (len(self.scope_frames) - 1, node.name)
        )
        self._visit_statements(node.body)
        self.pending_class_bindings.pop()
        self.binding_declarations.pop()
        self._pop_scope()
        self.class_stack.pop()
        self._bind_name_unknown(node.name)

    def _visit_function(
        self, node: ast.FunctionDef | ast.AsyncFunctionDef
    ) -> None:
        definition_expressions: list[ast.AST] = [
            *node.decorator_list,
            *node.args.defaults,
            *(default for default in node.args.kw_defaults if default is not None),
            *getattr(node, "type_params", ()),
        ]
        if not self.postponed_annotations:
            definition_expressions.extend(
                annotation
                for argument in (
                    *node.args.posonlyargs,
                    *node.args.args,
                    *node.args.kwonlyargs,
                    node.args.vararg,
                    node.args.kwarg,
                )
                if argument is not None
                if (annotation := argument.annotation) is not None
            )
            if node.returns is not None:
                definition_expressions.append(node.returns)
        for expression in definition_expressions:
            self.visit(expression)
        self._bind_name_unknown(node.name)
        declarations = self._function_binding_declarations(node)
        self.function_stack.append(node.name)
        self.function_nodes.append(node)
        self._push_scope("function")
        self.binding_declarations.append(declarations)
        if node.args.kwarg is not None and node.args.kwarg.arg == "kwargs":
            self.current_aliases["kwargs"] = "kwargs"
        arguments = (
            *node.args.posonlyargs,
            *node.args.args,
            *node.args.kwonlyargs,
            *(() if node.args.vararg is None else (node.args.vararg,)),
            *(() if node.args.kwarg is None else (node.args.kwarg,)),
        )
        for argument in arguments:
            if self._visible_alias(argument.arg) is not None:
                self.current_aliases.setdefault(argument.arg, "shadowed")
            self._bind_unknown(argument.arg, -1)
        if self.class_stack:
            for argument in arguments:
                domain = self.parameter_domains.get(
                    (self.class_stack[-1], node.name, argument.arg)
                )
                if domain:
                    self._bind_literal(argument.arg, domain, -1)
        self._visit_statements(node.body)
        self.binding_declarations.pop()
        self._pop_scope()
        self.function_nodes.pop()
        self.function_stack.pop()

    def _function_binding_declarations(
        self, node: ast.FunctionDef | ast.AsyncFunctionDef
    ) -> dict[str, int]:
        global_names: set[str] = set()
        nonlocal_names: set[str] = set()

        class DeclarationVisitor(ast.NodeVisitor):
            def visit_Global(self, declaration: ast.Global) -> None:
                global_names.update(declaration.names)

            def visit_Nonlocal(self, declaration: ast.Nonlocal) -> None:
                nonlocal_names.update(declaration.names)

            def visit_FunctionDef(self, inner: ast.FunctionDef) -> None:
                return

            visit_AsyncFunctionDef = visit_FunctionDef

            def visit_Lambda(self, inner: ast.Lambda) -> None:
                return

            def visit_ClassDef(self, inner: ast.ClassDef) -> None:
                return

        scanner = DeclarationVisitor()
        for statement in node.body:
            scanner.visit(statement)

        declarations = {name: 0 for name in global_names}
        for name in nonlocal_names:
            candidates = [
                index
                for index in range(len(self.scope_frames) - 1, -1, -1)
                if self.scope_frames[index] in {"function", "lambda"}
            ]
            if not candidates:
                continue
            bound = next(
                (
                    index
                    for index in candidates
                    if name in self.value_bindings[index] or name in self.aliases[index]
                ),
                candidates[0],
            )
            declarations[name] = bound
        return declarations

    visit_FunctionDef = _visit_function
    visit_AsyncFunctionDef = _visit_function

    def visit_Lambda(self, node: ast.Lambda) -> None:
        for expression in (
            *node.args.defaults,
            *(default for default in node.args.kw_defaults if default is not None),
        ):
            self.visit(expression)
        self._push_scope("lambda")
        self.binding_declarations.append({})
        arguments = (
            *node.args.posonlyargs,
            *node.args.args,
            *node.args.kwonlyargs,
            *(() if node.args.vararg is None else (node.args.vararg,)),
            *(() if node.args.kwarg is None else (node.args.kwarg,)),
        )
        for argument in arguments:
            if self._visible_alias(argument.arg) is not None:
                self.current_aliases[argument.arg] = "shadowed"
            self._bind_unknown(argument.arg, -1)
        self.visit(node.body)
        self.binding_declarations.pop()
        self._pop_scope()

    def _visit_comprehension(
        self,
        node: ast.ListComp | ast.SetComp | ast.GeneratorExp | ast.DictComp,
    ) -> None:
        first, *remaining = node.generators
        self.visit(first.iter)
        outer_depth = len(self.scope_frames)
        outer_paths = [self._capture_scope_state()]
        first_values = self._iterable_strings(first.iter)
        if (
            first_values is None
            and _literal_strings(first.iter, self.visible_values) is not None
        ):
            raise self._error(first.iter, "iterable value shape is scalar")
        self._push_scope("comprehension")

        def bind_generator(
            generator: ast.comprehension,
            values: tuple[str, ...] | None,
        ) -> None:
            self._bind_target_unknown(generator.target, -1)
            if isinstance(generator.target, ast.Name) and values is not None:
                self._bind_literal(generator.target.id, values, -1)
            for condition in generator.ifs:
                self.visit(condition)
                outer_paths.append(self._capture_scope_state()[:outer_depth])

        bind_generator(first, first_values)
        for generator in remaining:
            self.visit(generator.iter)
            outer_paths.append(self._capture_scope_state()[:outer_depth])
            generator_values = self._iterable_strings(generator.iter)
            if (
                generator_values is None
                and _literal_strings(generator.iter, self.visible_values) is not None
            ):
                raise self._error(
                    generator.iter, "iterable value shape is scalar"
                )
            bind_generator(generator, generator_values)
        if isinstance(node, ast.DictComp):
            self.visit(node.key)
            self.visit(node.value)
        else:
            self.visit(node.elt)
        outer_paths.append(self._capture_scope_state()[:outer_depth])
        self._pop_scope()
        self._restore_scope_state(self._merge_scope_states(outer_paths))

    visit_ListComp = _visit_comprehension
    visit_SetComp = _visit_comprehension
    visit_GeneratorExp = _visit_comprehension
    visit_DictComp = _visit_comprehension

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        paths: list[tuple[_SettingState, ...]] = []
        for value in node.values:
            self.visit(value)
            paths.append(self._capture_scope_state())
        self._restore_scope_state(self._merge_scope_states(paths))

    def visit_IfExp(self, node: ast.IfExp) -> None:
        self.visit(node.test)
        baseline = self._capture_scope_state()

        self.visit(node.body)
        body_state = self._capture_scope_state()

        self._restore_scope_state(baseline)
        self.visit(node.orelse)
        else_state = self._capture_scope_state()

        self._restore_scope_state(
            self._merge_scope_states((body_state, else_state))
        )

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)
        rhs_state = self._capture_scope_state()
        for target in node.targets:
            self._assign_target(target, node.value, rhs_state)

    def _assign_target(
        self,
        target: ast.AST,
        value: ast.AST,
        rhs_state: tuple[_SettingState, ...] | None = None,
    ) -> None:
        if rhs_state is None:
            rhs_state = self._capture_scope_state()
        if isinstance(target, (ast.Tuple, ast.List)):
            if not isinstance(value, (ast.Tuple, ast.List)):
                self._bind_target_unknown(target)
                return
            starred = [
                index
                for index, element in enumerate(target.elts)
                if isinstance(element, ast.Starred)
            ]
            if not starred:
                if len(target.elts) != len(value.elts):
                    self._bind_target_unknown(target)
                    return
                for element, element_value in zip(target.elts, value.elts):
                    self._assign_target(element, element_value, rhs_state)
                return
            if len(starred) != 1:
                self._bind_target_unknown(target)
                return
            star_index = starred[0]
            suffix_count = len(target.elts) - star_index - 1
            if len(value.elts) < star_index + suffix_count:
                self._bind_target_unknown(target)
                return
            for element, element_value in zip(
                target.elts[:star_index], value.elts[:star_index]
            ):
                self._assign_target(element, element_value, rhs_state)
            starred_target = target.elts[star_index]
            assert isinstance(starred_target, ast.Starred)
            middle_end = len(value.elts) - suffix_count
            middle = ast.List(
                elts=value.elts[star_index:middle_end], ctx=ast.Load()
            )
            ast.copy_location(middle, value)
            self._assign_target(starred_target.value, middle, rhs_state)
            if suffix_count:
                for element, element_value in zip(
                    target.elts[-suffix_count:], value.elts[-suffix_count:]
                ):
                    self._assign_target(element, element_value, rhs_state)
            return
        if isinstance(target, ast.Starred):
            self._assign_target(target.value, value, rhs_state)
            return

        current_state = self._capture_scope_state()
        self._restore_scope_state(rhs_state)
        kind = self._container_kind(value)
        literal_values = _literal_strings(value, self.visible_values)
        iterable_values = self._iterable_strings(value)
        self._restore_scope_state(current_state)
        target_path = _attribute_path(target)
        if target_path is not None:
            target_frame = self._binding_frame(target_path.split(".", maxsplit=1)[0])
            if kind is not None:
                self.aliases[target_frame][target_path] = kind
            elif isinstance(value, ast.Dict):
                self.aliases[target_frame].pop(target_path, None)
            elif self._visible_alias_state(target_path) is not None:
                self.aliases[target_frame][target_path] = "shadowed"
            else:
                self.aliases[target_frame].pop(target_path, None)
        if isinstance(target, ast.Name):
            if literal_values is not None:
                self._bind_literal(
                    target.id,
                    literal_values,
                    iterable_values=iterable_values,
                )
            else:
                self._bind_unknown(target.id)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is None:
            return
        synthetic = ast.Assign(targets=[node.target], value=node.value)
        ast.copy_location(synthetic, node)
        self.visit_Assign(synthetic)

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        if isinstance(node.target, ast.Subscript):
            read_target: ast.expr = ast.Subscript(
                value=node.target.value,
                slice=node.target.slice,
                ctx=ast.Load(),
            )
        elif isinstance(node.target, ast.Attribute):
            read_target = ast.Attribute(
                value=node.target.value,
                attr=node.target.attr,
                ctx=ast.Load(),
            )
        else:
            read_target = ast.Name(
                id=node.target.id, ctx=ast.Load()
            ) if isinstance(node.target, ast.Name) else node.target
        ast.copy_location(read_target, node.target)
        self.visit(read_target)
        self.visit(node.value)
        self._bind_target_unknown(node.target)

    def visit_NamedExpr(self, node: ast.NamedExpr) -> None:
        self.visit(node.value)
        kind = self._container_kind(node.value)
        literal_values = _literal_strings(node.value, self.visible_values)
        iterable_values = self._iterable_strings(node.value)
        frame_index = next(
            index
            for index in range(len(self.scope_frames) - 1, -1, -1)
            if self.scope_frames[index] != "comprehension"
        )
        target_path = _attribute_path(node.target)
        if isinstance(node.target, ast.Name):
            frame_index = self._binding_frame(node.target.id, frame_index)
        if target_path is not None and kind is not None:
            self.aliases[frame_index][target_path] = kind
        else:
            self._bind_target_unknown(node.target, frame_index)
        if isinstance(node.target, ast.Name) and literal_values is not None:
            self._bind_literal(
                node.target.id,
                literal_values,
                frame_index,
                iterable_values,
            )

    def visit_Import(self, node: ast.Import) -> None:
        for imported in node.names:
            self._bind_name_unknown(
                imported.asname or imported.name.split(".", maxsplit=1)[0]
            )

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        for imported in node.names:
            if imported.name == "*":
                for name in set(self.current_aliases) | set(self.current_values):
                    self._bind_name_unknown(name)
                continue
            self._bind_name_unknown(imported.asname or imported.name)

    def visit_Delete(self, node: ast.Delete) -> None:
        for target in node.targets:
            self._bind_target_unknown(target)

    def visit_With(
        self, node: ast.With | ast.AsyncWith
    ) -> _StatementFlow:
        for item in node.items:
            self.visit(item.context_expr)
            if item.optional_vars is not None:
                self._bind_target_unknown(item.optional_vars)
        return self._visit_statements(node.body)

    visit_AsyncWith = visit_With

    def _reject_conditional_alias_reassignment(self, node: ast.AST) -> None:
        if self._suppress_accessor_body_reads():
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

        def conditional_nodes(root: ast.AST) -> Iterator[ast.AST]:
            yield root
            for field, value in ast.iter_fields(root):
                if (
                    isinstance(root, (ast.Try, ast.TryStar))
                    and field == "finalbody"
                ):
                    continue
                if isinstance(value, ast.AST):
                    yield from conditional_nodes(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, ast.AST):
                            yield from conditional_nodes(item)

        for inner in conditional_nodes(node):
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

    def visit_For(self, node: ast.For) -> _StatementFlow:
        self._reject_conditional_alias_reassignment(node)
        self.visit(node.iter)
        baseline = self._capture_state()
        iterable = self._iterable_strings(node.iter)
        if (
            iterable is None
            and _literal_strings(node.iter, self.visible_values) is not None
        ):
            raise self._error(node.iter, "iterable value shape is scalar")

        def finish_loop(
            body_flow: _StatementFlow,
            *,
            zero_iteration: bool,
        ) -> _StatementFlow:
            break_states = [
                state for kind, state in body_flow.terminals if kind == "break"
            ]
            iteration_states = [
                state
                for kind, state in body_flow.terminals
                if kind == "continue"
            ]
            propagated = [
                (kind, state)
                for kind, state in body_flow.terminals
                if kind not in {"break", "continue"}
            ]
            prefixes = list(body_flow.prefixes)
            if body_flow.falls_through:
                iteration_states.append(self._capture_state())
            if zero_iteration:
                iteration_states.append(baseline)

            post_states = list(break_states)
            if iteration_states:
                self._restore_state(self._merge_states(iteration_states))
                else_flow = self._visit_statements(node.orelse)
                prefixes.extend(else_flow.prefixes)
                propagated.extend(else_flow.terminals)
                if else_flow.falls_through:
                    post_states.append(self._capture_state())
            if not post_states:
                return _StatementFlow(
                    False, tuple(propagated), tuple(prefixes)
                )
            self._restore_state(self._merge_states(post_states))
            return _StatementFlow(True, tuple(propagated), tuple(prefixes))

        if isinstance(node.target, ast.Name) and iterable is not None:
            if not iterable:
                return self._visit_statements(node.orelse)
            self._bind_target_unknown(node.target)
            self._bind_literal(node.target.id, iterable)
            return finish_loop(
                self._visit_statements(node.body), zero_iteration=False
            )
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
            target_path = _attribute_path(element_target)
            if target_path is None:
                raise self._error(node, "configuration loop target is not statically named")
            self._bind_target_unknown(node.target)
            self.current_aliases[target_path] = element_kind
            return finish_loop(
                self._visit_statements(node.body), zero_iteration=True
            )
        self._bind_target_unknown(node.target)
        return finish_loop(
            self._visit_statements(node.body), zero_iteration=True
        )

    visit_AsyncFor = visit_For

    def visit_While(self, node: ast.While) -> _StatementFlow:
        self._reject_conditional_alias_reassignment(node)
        self.visit(node.test)
        baseline = self._capture_state()
        body_flow = self._visit_statements(node.body)
        break_states = [
            state for kind, state in body_flow.terminals if kind == "break"
        ]
        normal_states = [
            state for kind, state in body_flow.terminals if kind == "continue"
        ]
        propagated = [
            (kind, state)
            for kind, state in body_flow.terminals
            if kind not in {"break", "continue"}
        ]
        prefixes = list(body_flow.prefixes)
        if body_flow.falls_through:
            normal_states.append(self._capture_state())
        normal_states.append(baseline)

        self._restore_state(self._merge_states(normal_states))
        else_flow = self._visit_statements(node.orelse)
        prefixes.extend(else_flow.prefixes)
        propagated.extend(else_flow.terminals)
        post_states = list(break_states)
        if else_flow.falls_through:
            post_states.append(self._capture_state())
        if not post_states:
            return _StatementFlow(False, tuple(propagated), tuple(prefixes))
        self._restore_state(self._merge_states(post_states))
        return _StatementFlow(True, tuple(propagated), tuple(prefixes))

    def _merge_may_alias_states(
        self,
        alias_states: Sequence[dict[str, str]],
        value_states: Sequence[dict[str, tuple[str, ...]]],
        iterable_states: Sequence[dict[str, tuple[str, ...]]],
        binding_states: Sequence[set[str]],
        frame_index: int = -1,
    ) -> None:
        merged_aliases: dict[str, str] = {}
        for name in set().union(*(state.keys() for state in alias_states)):
            kinds = {state[name] for state in alias_states if name in state}
            merged_aliases[name] = kinds.pop() if len(kinds) == 1 else "dynamic"
        merged_values: dict[str, tuple[str, ...]] = {}
        merged_bindings = set().union(*binding_states)
        for name in merged_bindings:
            if all(
                name in bindings and name in values
                for bindings, values in zip(binding_states, value_states)
            ):
                merged_values[name] = tuple(
                    sorted(
                        {
                            value
                            for state in value_states
                            for value in state[name]
                        }
                    )
                )
        self.aliases[frame_index] = merged_aliases
        self.values[frame_index] = merged_values
        self.iterables[frame_index] = {
            name: tuple(
                sorted(
                    {
                        value
                        for state in iterable_states
                        for value in state[name]
                    }
                )
            )
            for name in set.intersection(
                *(set(state) for state in iterable_states)
            )
        }
        self.value_bindings[frame_index] = merged_bindings

    def visit_Try(self, node: ast.Try) -> _StatementFlow:
        self._reject_conditional_alias_reassignment(node)
        baseline = self._capture_state()
        body_flow = self._visit_statements(node.body)
        prefixes = list(body_flow.prefixes)
        continuing_states: list[_SettingState] = []
        terminals = list(body_flow.terminals)
        if body_flow.falls_through:
            else_flow = self._visit_statements(node.orelse)
            prefixes.extend(else_flow.prefixes)
            terminals.extend(else_flow.terminals)
            if else_flow.falls_through:
                continuing_states.append(self._capture_state())
        elif node.handlers:
            # Handler matching and exception provenance are intentionally not
            # interpreted. Retain the pre-try state as a conservative path.
            continuing_states.append(baseline)

        handler_inputs = list(body_flow.prefixes or (baseline,))
        handler_inputs.extend(state for _, state in body_flow.terminals)
        handler_entry = self._merge_states(handler_inputs)
        for handler in node.handlers:
            self._restore_state(handler_entry)
            if handler.type is not None:
                self.visit(handler.type)
            if handler.name is not None:
                self._bind_name_unknown(handler.name)
            handler_flow = self._visit_statements(handler.body)
            prefixes.extend(handler_flow.prefixes)
            if handler.name is not None:
                self._bind_name_unknown(handler.name)
            terminals.extend(handler_flow.terminals)
            if handler_flow.falls_through:
                continuing_states.append(self._capture_state())

        if node.finalbody:
            final_continuing: list[_SettingState] = []
            final_terminals: list[tuple[str, _SettingState]] = []

            for state in continuing_states:
                self._restore_state(state)
                final_flow = self._visit_statements(node.finalbody)
                prefixes.extend(final_flow.prefixes)
                final_terminals.extend(final_flow.terminals)
                if final_flow.falls_through:
                    final_continuing.append(self._capture_state())

            for kind, state in terminals:
                self._restore_state(state)
                final_flow = self._visit_statements(node.finalbody)
                prefixes.extend(final_flow.prefixes)
                final_terminals.extend(final_flow.terminals)
                if final_flow.falls_through:
                    final_terminals.append((kind, self._capture_state()))

            if not continuing_states and not terminals:
                self._restore_state(handler_entry)
                final_flow = self._visit_statements(node.finalbody)
                prefixes.extend(final_flow.prefixes)
                final_terminals.extend(final_flow.terminals)
                if final_flow.falls_through:
                    final_continuing.append(self._capture_state())

            if final_continuing:
                self._restore_state(self._merge_states(final_continuing))
                return _StatementFlow(
                    True, tuple(final_terminals), tuple(prefixes)
                )
            terminal_states = [state for _, state in final_terminals]
            if terminal_states:
                self._restore_state(self._merge_states(terminal_states))
            return _StatementFlow(
                False, tuple(final_terminals), tuple(prefixes)
            )

        if continuing_states:
            self._restore_state(self._merge_states(continuing_states))
            return _StatementFlow(True, tuple(terminals), tuple(prefixes))
        terminal_states = [state for _, state in terminals]
        if terminal_states:
            self._restore_state(self._merge_states(terminal_states))
        return _StatementFlow(False, tuple(terminals), tuple(prefixes))

    visit_TryStar = visit_Try

    def visit_Match(self, node: ast.Match) -> _StatementFlow:
        self._reject_conditional_alias_reassignment(node)
        self.visit(node.subject)
        baseline = self._capture_state()
        pending_unmatched = [baseline]
        continuing: list[_SettingState] = []
        terminals: list[tuple[str, _SettingState]] = []
        prefixes: list[_SettingState] = []
        for case in node.cases:
            entry = self._merge_states(pending_unmatched)
            self._restore_state(entry)
            self.visit(case.pattern)
            for name in {
                pattern.name
                for pattern in ast.walk(case.pattern)
                if isinstance(pattern, (ast.MatchAs, ast.MatchStar))
                and pattern.name is not None
            } | {
                pattern.rest
                for pattern in ast.walk(case.pattern)
                if isinstance(pattern, ast.MatchMapping)
                and pattern.rest is not None
            }:
                self._bind_name_unknown(name)
            if case.guard is not None:
                self.visit(case.guard)
                pending_unmatched = [entry, self._capture_state()]
            else:
                pending_unmatched = [entry]
            case_flow = self._visit_statements(case.body)
            prefixes.extend(case_flow.prefixes)
            terminals.extend(case_flow.terminals)
            if case_flow.falls_through:
                continuing.append(self._capture_state())
        continuing.append(self._merge_states(pending_unmatched))
        self._restore_state(self._merge_states(continuing))
        return _StatementFlow(True, tuple(terminals), tuple(prefixes))

    def visit_If(self, node: ast.If) -> _StatementFlow:
        self.visit(node.test)
        baseline = self._capture_state()

        self._restore_state(baseline)
        body_flow = self._visit_statements(node.body)
        body_state = self._capture_state() if body_flow.falls_through else None
        continuing = [body_state] if body_state is not None else []

        self._restore_state(baseline)
        else_flow = self._visit_statements(node.orelse)
        else_state = self._capture_state() if else_flow.falls_through else None
        if else_state is not None:
            continuing.append(else_state)

        terminals = body_flow.terminals + else_flow.terminals
        if not continuing:
            terminal_states = [state for _, state in terminals]
            if terminal_states:
                self._restore_state(self._merge_states(terminal_states))
            return _StatementFlow(
                False,
                terminals,
                body_flow.prefixes + else_flow.prefixes,
            )
        self._restore_state(self._merge_states(continuing))
        for name in baseline.aliases:
            if (
                body_state is not None
                and else_state is not None
                and (name in body_state.aliases)
                != (name in else_state.aliases)
            ):
                self.current_aliases[name] = "dynamic"
        return _StatementFlow(
            True,
            terminals,
            body_flow.prefixes + else_flow.prefixes,
        )

    def visit_Subscript(self, node: ast.Subscript) -> None:
        if not isinstance(node.ctx, ast.Load):
            self.generic_visit(node)
            return
        if (
            isinstance(node.value, ast.Attribute)
            and self._normalized_os_path(node.value) == "os.environ"
        ):
            if _literal_strings(node.slice, self.visible_values) is None:
                self._dynamic_environment_read(node, "os.environ[]")
                self.visit(node.value)
                self.visit(node.slice)
                return
            for key in self._resolved_keys(node.slice, node):
                self._add(node, key, "os.environ[]", "environment", None)
            self.visit(node.value)
            self.visit(node.slice)
            return
        kind = self._container_kind(node.value)
        if kind is not None:
            if kind == "dynamic":
                raise self._error(node, "branch-dependent configuration alias")
            if self._suppress_accessor_body_reads():
                self.visit(node.value)
                self.visit(node.slice)
                return
            for key in self._resolved_keys(node.slice, node):
                read_kind = "model_kwargs[]" if kind == "model_kwargs" else "kwargs[]"
                if kind == "attribute":
                    read_kind = "attribute[]"
                scope = "model" if kind == "model_kwargs" else "core"
                self._add(node, key, read_kind, scope, None)
            self.visit(node.value)
            self.visit(node.slice)
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
                if self._suppress_accessor_body_reads():
                    self.visit(node.left)
                    self.visit(container)
                    return
                if kind == "model_kwargs":
                    read_kind, scope = "model_kwargs.contains", "model"
                elif kind == "attribute":
                    read_kind, scope = "attribute.contains", "core"
                else:
                    read_kind, scope = "kwargs.contains", "core"
                for key in self._resolved_keys(node.left, node):
                    self._add(node, key, read_kind, scope, None)
                self.visit(node.left)
                self.visit(container)
                return
        self.visit(node.left)
        paths: list[tuple[_SettingState, ...]] = []
        for comparator in node.comparators:
            self.visit(comparator)
            paths.append(self._capture_scope_state())
        self._restore_scope_state(self._merge_scope_states(paths))

    def visit_Assert(self, node: ast.Assert) -> _StatementFlow:
        self.visit(node.test)
        continuing = self._capture_scope_state()
        terminals = (("raise", self._capture_state()),)
        if node.msg is not None:
            self.visit(node.msg)
            terminals = (("raise", self._capture_state()),)
            self._restore_scope_state(continuing)
        return _StatementFlow(True, terminals)

    def _visit_call_children(self, node: ast.Call) -> None:
        self.visit(node.func)
        for argument in node.args:
            self.visit(argument)
        for keyword in node.keywords:
            self.visit(keyword.value)

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
                if keyword.arg is not None or not (
                    isinstance(keyword.value, ast.Name)
                    and keyword.value.id == "network_kwargs"
                ):
                    self.visit(keyword.value)
            return

        path = self._normalized_os_path(node.func)
        if path == "os.getenv":
            if not node.args:
                raise self._error(node, "os.getenv call has no key")
            if _literal_strings(node.args[0], self.visible_values) is None:
                self._dynamic_environment_read(node, "os.getenv")
                self._visit_call_children(node)
                return
            default = node.args[1] if len(node.args) > 1 else None
            for key in self._resolved_keys(node.args[0], node):
                self._add(node, key, "os.getenv", "environment", default)
            self._visit_call_children(node)
            return
        if path == "os.environ.get":
            if not node.args:
                raise self._error(node, "os.environ.get call has no key")
            if _literal_strings(node.args[0], self.visible_values) is None:
                self._dynamic_environment_read(node, "os.environ.get")
                self._visit_call_children(node)
                return
            default = node.args[1] if len(node.args) > 1 else None
            for key in self._resolved_keys(node.args[0], node):
                self._add(node, key, "os.environ.get", "environment", default)
            self._visit_call_children(node)
            return
        if isinstance(node.func, ast.Attribute) and node.func.attr == "add_argument":
            if not node.args:
                raise self._error(
                    node, "argparse.add_argument call has no argument name"
                )
            self.visit(node.func)
            option_values: list[str] = []
            for argument in node.args:
                self.visit(argument)
                option_values.extend(self._resolved_keys(argument, node))
            keys: tuple[str, ...] | None = None
            default: ast.AST | None = None
            for keyword in node.keywords:
                self.visit(keyword.value)
                if keyword.arg == "dest":
                    keys = self._resolved_keys(keyword.value, node)
                elif keyword.arg == "default":
                    default = keyword.value
            if keys is None:
                long_options = [
                    value for value in option_values if value.startswith("--")
                ]
                selected = long_options[0] if long_options else option_values[0]
                keys = (selected.lstrip("-").replace("-", "_"),)
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
            self._visit_call_children(node)
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
                if self._suppress_accessor_body_reads():
                    self._visit_call_children(node)
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
                self._visit_call_children(node)
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
    _bound_receiver.cache_clear()
    source_paths = _collect_source_paths(root, globs)
    parsed: list[tuple[str, ast.Module]] = []
    classes: dict[str, list[_ClassInfo]] = {}
    postponed_annotation_sources: set[str] = set()
    for source_path in source_paths:
        source = _portable_path(root, source_path)
        try:
            tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=source)
        except (OSError, UnicodeError, SyntaxError) as error:
            raise DiscoveryError(f"cannot parse {source}: {error}") from error
        parsed.append((source, tree))
        if any(
            isinstance(node, ast.ImportFrom)
            and node.module == "__future__"
            and any(alias.name == "annotations" for alias in node.names)
            for node in tree.body
        ):
            postponed_annotation_sources.add(source)
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                classes.setdefault(node.name, []).append(_ClassInfo(source, node))

    facts: list[DiscoveredSetting] = []
    mutable_call_sites: dict[str, list[_MethodCall]] = {}
    mutable_method_references: dict[str, list[_MethodReference]] = {}
    reflective_alias_cache: dict[int, frozenset[str]] = {}

    def reflective_aliases(function: _FunctionNode | None) -> frozenset[str]:
        if function is None:
            return frozenset()
        cache_key = id(function)
        if cache_key in reflective_alias_cache:
            return reflective_alias_cache[cache_key]
        aliases = frozenset(
            target.id
            for inner in ast.walk(function)
            if isinstance(inner, ast.Assign)
            and _attribute_path(inner.value)
            in {"getattr", "builtins.getattr", "object.__getattribute__"}
            for target in inner.targets
            if isinstance(target, ast.Name)
        )
        reflective_alias_cache[cache_key] = aliases
        return aliases

    def reflective_attribute(
        lookup: tuple[ast.AST, str | None, bool], method_name: str
    ) -> ast.Attribute:
        receiver, literal_name, ambiguous = lookup
        attribute = ast.Attribute(value=receiver, attr=method_name, ctx=ast.Load())
        if literal_name is None or ambiguous:
            attribute._dynamic_reflective_name = True
        return attribute

    def reflective_names(
        lookup: tuple[ast.AST, str | None, bool], caller: _CallerInfo
    ) -> tuple[str, ...]:
        receiver, literal_name, _ = lookup
        if literal_name is not None:
            return (literal_name,)
        bound_receiver, rebound = _bound_receiver(caller)
        if rebound or bound_receiver is None:
            return ()
        supported_receiver = (
            isinstance(receiver, ast.Name) and receiver.id == bound_receiver
        ) or (
            isinstance(receiver, ast.Call)
            and isinstance(receiver.func, ast.Name)
            and receiver.func.id == "super"
            and not receiver.args
            and not receiver.keywords
        )
        if not supported_receiver or caller.class_name is None:
            return ()
        candidates = [
            info
            for info in classes.get(caller.class_name, ())
            if info.source == caller.source
        ]
        if len(candidates) != 1:
            return ()
        names: set[str] = set()
        pending = [candidates[0]]
        seen: set[_MethodOwner] = set()
        while pending:
            info = pending.pop()
            owner = (info.source, info.node.name)
            if owner in seen:
                continue
            seen.add(owner)
            names.update(
                method.name
                for method in info.node.body
                if isinstance(
                    method, (ast.FunctionDef, ast.AsyncFunctionDef)
                )
            )
            pending.extend(_base_infos(classes, info)[0])
        return tuple(sorted(names))

    def collect_method_uses(
        node: ast.AST,
        source: str,
        containing_class: str | None = None,
        containing_function: _FunctionNode | None = None,
        direct_method: bool = False,
        parent: ast.AST | None = None,
    ) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            definition_expressions: list[ast.AST] = [
                *node.decorator_list,
                *node.args.defaults,
                *(
                    default
                    for default in node.args.kw_defaults
                    if default is not None
                ),
                *getattr(node, "type_params", ()),
            ]
            if source not in postponed_annotation_sources:
                definition_expressions.extend(
                    annotation
                    for argument in (
                        *node.args.posonlyargs,
                        *node.args.args,
                        *node.args.kwonlyargs,
                        node.args.vararg,
                        node.args.kwarg,
                    )
                    if argument is not None
                    if (annotation := argument.annotation) is not None
                )
                if node.returns is not None:
                    definition_expressions.append(node.returns)
            for expression in definition_expressions:
                collect_method_uses(
                    expression,
                    source,
                    containing_class,
                    containing_function,
                    direct_method,
                    node,
                )
            method_scope = isinstance(parent, ast.ClassDef)
            for statement in node.body:
                collect_method_uses(
                    statement,
                    source,
                    containing_class,
                    node,
                    method_scope,
                    node,
                )
            return
        if isinstance(node, ast.ClassDef):
            containing_class = node.name
            containing_function = None
            direct_method = False
        elif isinstance(node, ast.Lambda):
            containing_function = node
            direct_method = False
        caller = _CallerInfo(
            source,
            containing_class,
            containing_function,
            direct_method,
        )
        if isinstance(node, ast.Call):
            reflective_call = _reflective_method_lookup(
                node.func, reflective_aliases(containing_function)
            )
            if reflective_call is not None:
                method_names = reflective_names(reflective_call, caller)
                for method_name in method_names:
                    synthetic = ast.Call(
                        func=reflective_attribute(
                            reflective_call, method_name
                        ),
                        args=node.args,
                        keywords=node.keywords,
                    )
                    ast.copy_location(synthetic, node)
                    ast.copy_location(synthetic.func, node.func)
                    mutable_call_sites.setdefault(method_name, []).append(
                        (synthetic, caller)
                    )
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            mutable_call_sites.setdefault(node.func.attr, []).append((node, caller))
        reflective_reference = _reflective_method_lookup(
            node, reflective_aliases(containing_function)
        )
        if reflective_reference is not None and not (
            isinstance(parent, ast.Call) and parent.func is node
        ):
            method_names = reflective_names(reflective_reference, caller)
            for method_name in method_names:
                synthetic = reflective_attribute(
                    reflective_reference, method_name
                )
                ast.copy_location(synthetic, node)
                mutable_method_references.setdefault(method_name, []).append(
                    (synthetic, caller)
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
                (node, caller)
            )
        for child in ast.iter_child_nodes(node):
            collect_method_uses(
                child,
                source,
                containing_class,
                containing_function,
                direct_method,
                node,
            )

    for source, tree in parsed:
        collect_method_uses(tree, source)
    call_sites = {
        name: tuple(calls) for name, calls in mutable_call_sites.items()
    }
    method_references = {
        name: tuple(references)
        for name, references in mutable_method_references.items()
    }
    inherited_override_cache: dict[
        tuple[str, str, str, str, _MethodOwner], bool
    ] = {}
    for source, tree in parsed:
        visitor = _SettingVisitor(
            source=source,
            tree=tree,
            classes=classes,
            call_sites=call_sites,
            method_references=method_references,
            inherited_override_cache=inherited_override_cache,
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
