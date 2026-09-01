#!/usr/bin/env python3
"""Source-only AST proof for the built-in preset/backend architecture handoff."""
from __future__ import annotations
import argparse
import ast
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BINDINGS = (
    ("anima", "anima", "AnimaModel", "extensions_built_in/diffusion_models/anima/anima.py"),
    ("flux", "flux", "StableDiffusion", "toolkit/stable_diffusion_model.py"),
    ("flex1", "flux", "StableDiffusion", "toolkit/stable_diffusion_model.py"),
    ("qwen_image", "qwen_image", "QwenImageModel", "extensions_built_in/diffusion_models/qwen_image/qwen_image.py"),
    ("qwen_image_edit_plus", "qwen_image_edit_plus", "QwenImageEditPlusModel", "extensions_built_in/diffusion_models/qwen_image/qwen_image_edit_plus.py"),
    ("sdxl", "sdxl", "StableDiffusion", "toolkit/stable_diffusion_model.py"),
    ("sd15", "sd15", "StableDiffusion", "toolkit/stable_diffusion_model.py"),
    ("wan21:1b", "wan21", "Wan21", "toolkit/models/wan21/wan21.py"),
    ("wan22_14b:t2v", "wan22_14b", "Wan2214bModel", "extensions_built_in/diffusion_models/wan22/wan22_14b_model.py"),
)

UI_ARCHITECTURES = tuple(row[0] for row in BINDINGS)

def source(path: str, overrides: dict[str, str] | None = None) -> str:
    return (overrides or {}).get(path, (ROOT / path).read_text(encoding="utf-8"))

def tree(path: str, overrides: dict[str, str] | None = None) -> ast.Module:
    return ast.parse(source(path, overrides), filename=path)

def _is_self_arch(node: ast.AST) -> bool:
    return isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == "self" and node.attr == "arch"

def normalization_rules(overrides: dict[str, str] | None = None) -> tuple[str, str, str]:
    module = tree("toolkit/config_modules.py", overrides)
    model_config = next((node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "ModelConfig"), None)
    initializer = next((node for node in (model_config.body if model_config else []) if isinstance(node, ast.FunctionDef) and node.name == "__init__"), None)
    if initializer is None:
        raise AssertionError("ModelConfig.__init__ source is missing")
    suffix_rule: tuple[int, str] | None = None
    alias_rule: tuple[int, str, str] | None = None
    for condition in (node for node in ast.walk(initializer) if isinstance(node, ast.If)):
        test = condition.test
        assignments = [node for node in condition.body if isinstance(node, ast.Assign) and len(node.targets) == 1 and _is_self_arch(node.targets[0])]
        if len(assignments) != 1:
            continue
        value = assignments[0].value
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.ops[0], ast.In) and len(test.comparators) == 1 and _is_self_arch(test.comparators[0]) and isinstance(test.left, ast.Constant) and isinstance(test.left.value, str):
            if not (isinstance(value, ast.Subscript) and isinstance(value.value, ast.Call) and isinstance(value.value.func, ast.Attribute) and value.value.func.attr == "split" and _is_self_arch(value.value.func.value) and len(value.value.args) == 1 and isinstance(value.value.args[0], ast.Constant) and value.value.args[0].value == test.left.value and isinstance(value.slice, ast.Constant) and value.slice.value == 0):
                raise AssertionError("ModelConfig suffix normalization control flow is unsupported")
            suffix_rule = (condition.lineno, test.left.value)
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.ops[0], ast.Eq) and len(test.comparators) == 1 and _is_self_arch(test.left) and isinstance(test.comparators[0], ast.Constant) and isinstance(test.comparators[0].value, str) and isinstance(value, ast.Constant) and isinstance(value.value, str):
            if test.comparators[0].value == "flex1":
                alias_rule = (condition.lineno, test.comparators[0].value, value.value)
    if suffix_rule is None or alias_rule is None or suffix_rule[0] >= alias_rule[0]:
        raise AssertionError("ModelConfig must strip suffixes before flex1 normalization")
    return suffix_rule[1], alias_rule[1], alias_rule[2]

def normalize_architecture(value: str, overrides: dict[str, str] | None = None) -> str:
    separator, alias, target = normalization_rules(overrides)
    normalized = value.split(separator)[0] if separator in value else value
    return target if normalized == alias else normalized

def _literal_name_list(module: ast.Module, variable: str) -> list[str]:
    for node in module.body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == variable for target in node.targets) and isinstance(node.value, (ast.List, ast.Tuple)):
            if not all(isinstance(item, ast.Name) for item in node.value.elts):
                raise AssertionError(f"{variable} must be a literal source-visible name list")
            return [item.id for item in node.value.elts]
    return []

def resolver_contract(overrides: dict[str, str] | None = None) -> tuple[list[str], list[str], str]:
    module = tree("toolkit/util/get_model.py", overrides)
    builtins = _literal_name_list(module, "BUILT_IN_MODELS")
    get_all = next((node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == "get_all_models"), None)
    resolver = next((node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == "get_model_class"), None)
    if get_all is None or resolver is None:
        raise AssertionError("resolver control flow functions are missing")
    extension_folders: list[str] = []
    for node in ast.walk(get_all):
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "extension_folders" for target in node.targets) and isinstance(node.value, ast.List) and all(isinstance(item, ast.Constant) and isinstance(item.value, str) for item in node.value.elts):
            extension_folders = [item.value for item in node.value.elts]
    initializes_in_order = any(
        isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "all_model_classes"
        and isinstance(node.value, ast.Name) and node.value.id == "BUILT_IN_MODELS"
        for node in get_all.body
    )
    extends_in_order = any(
        isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "all_model_classes" and node.func.attr == "extend"
        and len(node.args) == 1 and isinstance(node.args[0], ast.Name) and node.args[0].id == "models"
        for node in ast.walk(get_all)
    )
    returns_models = isinstance(get_all.body[-1], ast.Return) and isinstance(get_all.body[-1].value, ast.Name) and get_all.body[-1].value.id == "all_model_classes"
    loop = next((node for node in resolver.body if isinstance(node, ast.For)), None)
    fallback = resolver.body[-1] if resolver.body else None
    valid_condition = False
    if loop is not None and isinstance(loop.target, ast.Name) and loop.target.id == "ModelClass" and isinstance(loop.iter, ast.Name) and loop.iter.id == "all_models" and len(loop.body) == 1 and isinstance(loop.body[0], ast.If):
        condition = loop.body[0]
        test = condition.test
        valid_condition = (
            isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.ops[0], ast.Eq)
            and isinstance(test.left, ast.Attribute) and isinstance(test.left.value, ast.Name) and test.left.value.id == "ModelClass" and test.left.attr == "arch"
            and len(test.comparators) == 1 and isinstance(test.comparators[0], ast.Attribute) and isinstance(test.comparators[0].value, ast.Name)
            and test.comparators[0].value.id == "config" and test.comparators[0].attr == "arch"
            and len(condition.body) == 1 and isinstance(condition.body[0], ast.Return) and isinstance(condition.body[0].value, ast.Name) and condition.body[0].value.id == "ModelClass"
        )
    if not valid_condition or not isinstance(fallback, ast.Return) or not isinstance(fallback.value, ast.Name):
        raise AssertionError("resolver control flow must return the first exact arch match then a named fallback")
    if extension_folders != ["extensions", "extensions_built_in"] or not initializes_in_order or not extends_in_order or not returns_models:
        raise AssertionError("resolver registered source order/control flow drift")
    return builtins, extension_folders, fallback.value.id

ModelDefinition = tuple[str, str, str | None]

def _module_path(current_path: str, imported: ast.ImportFrom) -> str:
    package = current_path.split("/")[:-1]
    if imported.level:
        keep = len(package) - (imported.level - 1)
        parts = package[:keep]
    else:
        parts = []
    if imported.module:
        parts.extend(imported.module.split("."))
    module = "/".join(parts)
    candidates = (f"{module}.py", f"{module}/__init__.py")
    for candidate in candidates:
        if (ROOT / candidate).is_file():
            return candidate
    raise AssertionError(f"imported source module {module} is missing")

def resolve_symbol(module_path: str, symbol: str, overrides: dict[str, str] | None = None, visited: set[tuple[str, str]] | None = None) -> ModelDefinition:
    chain = set() if visited is None else set(visited)
    key = (module_path, symbol)
    if key in chain:
        raise AssertionError(f"cyclic source binding for {module_path}:{symbol}")
    chain.add(key)
    module = tree(module_path, overrides)
    for node in module.body:
        if isinstance(node, ast.ClassDef) and node.name == symbol:
            architecture = None
            for statement in node.body:
                if isinstance(statement, (ast.Assign, ast.AnnAssign)):
                    targets = statement.targets if isinstance(statement, ast.Assign) else [statement.target]
                    if any(isinstance(target, ast.Name) and target.id == "arch" for target in targets) and isinstance(statement.value, ast.Constant) and isinstance(statement.value.value, str):
                        architecture = statement.value.value
            if architecture is None:
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        try:
                            architecture = resolve_symbol(module_path, base.id, overrides, chain)[2]
                            break
                        except AssertionError:
                            pass
            return node.name, module_path, architecture
    for node in module.body:
        if not isinstance(node, ast.ImportFrom):
            continue
        for alias in node.names:
            if (alias.asname or alias.name) == symbol:
                imported_path = _module_path(module_path, node)
                return resolve_symbol(imported_path, alias.name, overrides, chain)
    raise AssertionError(f"{module_path} does not bind {symbol}")

def registered_model_definitions(overrides: dict[str, str] | None = None) -> tuple[list[ModelDefinition], ModelDefinition]:
    builtins, folders, fallback_symbol = resolver_contract(overrides)
    resolver_path = "toolkit/util/get_model.py"
    definitions = [resolve_symbol(resolver_path, symbol, overrides) for symbol in builtins]
    for folder in folders:
        absolute = ROOT / folder
        if not absolute.is_dir():
            continue
        for child in sorted(path for path in absolute.iterdir() if path.is_dir()):
            relative = f"{folder}/{child.name}/__init__.py"
            if (ROOT / relative).is_file() or relative in (overrides or {}):
                definitions.extend(resolve_symbol(relative, symbol, overrides) for symbol in _literal_name_list(tree(relative, overrides), "AI_TOOLKIT_MODELS"))
    return definitions, resolve_symbol(resolver_path, fallback_symbol, overrides)

def build_report(overrides: dict[str, str] | None = None) -> dict[str, object]:
    registered, fallback = registered_model_definitions(overrides)
    bindings = []
    for ui_architecture in UI_ARCHITECTURES:
        normalized = normalize_architecture(ui_architecture, overrides)
        selected = fallback
        for candidate in registered:
            if candidate[2] == normalized:
                selected = candidate
                break
        symbol, source_path, _ = selected
        bindings.append({
            "ui_architecture": ui_architecture,
            "normalized_architecture": normalized,
            "model_class": symbol,
            "source_path": source_path,
            "symbol": symbol,
        })
    return {"schema_version": 1, "bindings": bindings}

def expected_report() -> dict[str, object]:
    return {"schema_version": 1, "bindings": [{
        "ui_architecture": ui_arch, "normalized_architecture": normalized,
        "model_class": symbol, "source_path": source_path, "symbol": symbol,
    } for ui_arch, normalized, symbol, source_path in BINDINGS]}

def validate_expected_report(value: dict[str, object]) -> None:
    if value != expected_report():
        raise AssertionError("backend mapping report drift from canonical nine bindings")

def report() -> dict[str, object]:
    value = build_report()
    validate_expected_report(value)
    return value

class BackendMappingTests(unittest.TestCase):
    def test_model_config_suffix_and_flex1_normalization_are_ast_derived(self) -> None:
        self.assertEqual(normalize_architecture("wan21:1b"), "wan21")
        self.assertEqual(normalize_architecture("wan22_14b:t2v"), "wan22_14b")
        self.assertEqual(normalize_architecture("flex1"), "flux")

    def test_all_four_legacy_architectures_reach_the_parsed_fallback(self) -> None:
        value = build_report()
        fallback_rows = {
            row["ui_architecture"]
            for row in value["bindings"]
            if row["model_class"] == "StableDiffusion"
        }
        self.assertEqual(fallback_rows, {"flux", "flex1", "sdxl", "sd15"})

    def test_report_is_derived_from_model_config_and_resolver_control_flow(self) -> None:
        self.assertEqual(build_report(), report())

    def test_registered_flux_interceptor_changes_resolution_and_is_rejected(self) -> None:
        path = "extensions_built_in/diffusion_models/__init__.py"
        source = (ROOT / path).read_text(encoding="utf-8")
        mutated = source.replace(
            "AI_TOOLKIT_MODELS = [",
            "class FluxInterceptor:\n    arch = 'flux'\n\nAI_TOOLKIT_MODELS = [\n    FluxInterceptor,",
            1,
        )
        actual = build_report({path: mutated})
        flux = next(row for row in actual["bindings"] if row["ui_architecture"] == "flux")
        self.assertEqual(flux["model_class"], "FluxInterceptor")
        with self.assertRaisesRegex(AssertionError, "backend mapping report drift"):
            validate_expected_report(actual)

    def test_resolver_condition_mutation_is_rejected(self) -> None:
        path = "toolkit/util/get_model.py"
        source = (ROOT / path).read_text(encoding="utf-8")
        mutated = source.replace("ModelClass.arch == config.arch", "ModelClass.arch != config.arch", 1)
        with self.assertRaisesRegex(AssertionError, "resolver control flow"):
            build_report({path: mutated})

    def test_registry_import_path_drift_is_rejected(self) -> None:
        path = "extensions_built_in/diffusion_models/__init__.py"
        source = (ROOT / path).read_text(encoding="utf-8")
        mutated = source.replace("from .anima import AnimaModel", "from .qwen_image import AnimaModel", 1)
        with self.assertRaisesRegex(AssertionError, "does not bind AnimaModel"):
            build_report({path: mutated})

    def test_exact_nine_canonical_source_only_bindings(self) -> None:
        value = report()
        self.assertEqual([row["ui_architecture"] for row in value["bindings"]], [row[0] for row in BINDINGS])
        self.assertEqual(len(value["bindings"]), 9)

    def test_emitter_writes_strict_report(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "backend.json"
            target.write_text(json.dumps(report(), indent=2) + "\n", encoding="utf-8")
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), report())

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit", type=Path)
    args = parser.parse_args()
    if args.emit is None:
        unittest.main(argv=[__file__])
        return
    if args.emit.exists() or not args.emit.parent.is_dir():
        raise SystemExit("--emit requires a nonexistent path in an owned existing directory")
    args.emit.write_text(json.dumps(report(), indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
