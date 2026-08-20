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


def _module_literal_maps(tree: ast.Module) -> dict[str, tuple[str, ...]]:
    maps: dict[str, tuple[str, ...]] = {}
    for statement in tree.body:
        if not isinstance(statement, (ast.Assign, ast.AnnAssign)):
            continue
        value = statement.value
        if not isinstance(value, ast.Dict):
            continue
        keys: list[str] = []
        for key in value.keys:
            if not isinstance(key, ast.Constant) or not isinstance(key.value, str):
                break
            keys.append(key.value)
        else:
            targets = statement.targets if isinstance(statement, ast.Assign) else [statement.target]
            for target in targets:
                if isinstance(target, ast.Name):
                    maps[target.id] = tuple(keys)
    return maps


def _parameter_domains(
    tree: ast.Module,
) -> tuple[
    dict[tuple[str, str, str], tuple[str, ...]],
    frozenset[tuple[str, str, str]],
]:
    """Infer finite method-parameter values from literal calls and map indexing."""

    result: dict[tuple[str, str, str], set[str]] = {}
    unresolved: set[tuple[str, str, str]] = set()
    literal_maps = _module_literal_maps(tree)
    classes = {
        node.name: node for node in tree.body if isinstance(node, ast.ClassDef)
    }
    for class_name, class_node in classes.items():
        methods = {
            node.name: node
            for node in class_node.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        for method_name, method in methods.items():
            parameters = [argument.arg for argument in method.args.args]
            if parameters and parameters[0] in {"self", "cls"}:
                parameters = parameters[1:]
            for inner in ast.walk(method):
                if (
                    isinstance(inner, ast.Subscript)
                    and isinstance(inner.value, ast.Name)
                    and inner.value.id in literal_maps
                    and isinstance(inner.slice, ast.Name)
                    and inner.slice.id in parameters
                ):
                    result.setdefault(
                        (class_name, method_name, inner.slice.id), set()
                    ).update(literal_maps[inner.value.id])

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
            if producer is None:
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

        for caller in methods.values():
            for call in ast.walk(caller):
                if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Attribute):
                    continue
                if not isinstance(call.func.value, (ast.Name, ast.Attribute)):
                    continue
                target_name = call.func.attr
                target = methods.get(target_name)
                if target is None:
                    continue
                target_parameters = [argument.arg for argument in target.args.args]
                if target_parameters and target_parameters[0] in {"self", "cls"}:
                    target_parameters = target_parameters[1:]
                for index, argument in enumerate(call.args):
                    if index >= len(target_parameters):
                        break
                    key = (class_name, target_name, target_parameters[index])
                    values = call_values(argument)
                    if values is not None:
                        result.setdefault(key, set()).update(values)
                    else:
                        unresolved.add(key)
                for keyword in call.keywords:
                    if keyword.arg in target_parameters:
                        key = (class_name, target_name, keyword.arg)
                        values = call_values(keyword.value)
                        if values is not None:
                            result.setdefault(key, set()).update(values)
                        else:
                            unresolved.add(key)
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
    ) -> None:
        self.source = source
        self.tree = tree
        self.classes = classes
        self.parameter_domains, self.unresolved_parameter_calls = _parameter_domains(tree)
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

    def visit_For(self, node: ast.For) -> None:
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
                forwarded = False
                saw_spread = False
                forwarding_uses: set[int] = set()
                consumed_uses: set[int] = set()
                consumed_keys: set[str] = set()
                kwargs_name = constructor.args.kwarg.arg
                for inner in ast.walk(constructor):
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
                            consumed_keys.update(keys)
                    if (
                        isinstance(inner, ast.Subscript)
                        and isinstance(inner.ctx, ast.Load)
                        and isinstance(inner.value, ast.Name)
                        and inner.value.id == kwargs_name
                    ):
                        keys = _literal_strings(inner.slice, {})
                        if keys is not None:
                            consumed_uses.add(id(inner.value))
                            consumed_keys.update(keys)
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
                    saw_spread = True
                    forwarding_uses.update(
                        id(keyword.value)
                        for keyword in inner.keywords
                        if keyword.arg is None
                        and isinstance(keyword.value, ast.Name)
                        and keyword.value.id == kwargs_name
                    )
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
                kwargs_is_consumed = any(
                    isinstance(inner, ast.Name)
                    and inner.id == kwargs_name
                    and isinstance(inner.ctx, ast.Load)
                    and id(inner) not in forwarding_uses
                    and id(inner) not in consumed_uses
                    for inner in ast.walk(constructor)
                )
                # An unread terminal **kwargs is a dead sink, not an open
                # setting surface. Any later read/forward/expansion flips this
                # branch to a fail-closed error (covered by the mutation test).
                consumes_unreserved = not consumed_keys.issubset(explicit)
                if forwarded and (kwargs_is_consumed or consumes_unreserved):
                    raise self._error(
                        constructor, "consumed forwarded kwargs sink"
                    )
                if not forwarded and (
                    saw_spread or kwargs_is_consumed or consumes_unreserved
                ):
                    raise self._error(
                        constructor, "unconstrained forwarded kwargs sink"
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
    for source, tree in parsed:
        visitor = _SettingVisitor(source=source, tree=tree, classes=classes)
        visitor.visit(tree)
        facts.extend(visitor.facts)

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
