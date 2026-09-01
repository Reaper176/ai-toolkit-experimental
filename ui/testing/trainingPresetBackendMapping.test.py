#!/usr/bin/env python3
"""Source-only AST proof for the built-in preset/backend architecture handoff."""
from __future__ import annotations
import argparse
import ast
import importlib.machinery
import json
import os
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
    if overrides is not None and path in overrides:
        return overrides[path]
    return (ROOT / path).read_text(encoding="utf-8")

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
    assignments: list[ast.Assign | ast.AnnAssign] = []

    class UnsupportedBindingVisitor(ast.NodeVisitor):
        found = False

        def visit_all(self, nodes: object) -> None:
            for node in nodes if isinstance(nodes, list) else []:
                if node is not None:
                    self.visit(node)

        def visit_arguments_evaluated_at_definition(self, arguments: ast.arguments) -> None:
            self.visit_all(arguments.defaults)
            self.visit_all(arguments.kw_defaults)
            for argument in [*arguments.posonlyargs, *arguments.args, *arguments.kwonlyargs]:
                if argument.annotation is not None:
                    self.visit(argument.annotation)
            for argument in (arguments.vararg, arguments.kwarg):
                if argument is not None and argument.annotation is not None:
                    self.visit(argument.annotation)

        def visit_Name(self, node: ast.Name) -> None:
            if node.id == variable and isinstance(node.ctx, (ast.Store, ast.Del)):
                self.found = True

        def visit_Call(self, node: ast.Call) -> None:
            if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == variable:
                self.found = True
            self.generic_visit(node)

        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            if node.name == variable:
                self.found = True
            self.visit_all(node.decorator_list)
            self.visit_arguments_evaluated_at_definition(node.args)
            if node.returns is not None:
                self.visit(node.returns)
            self.visit_all(getattr(node, "type_params", []))

        visit_AsyncFunctionDef = visit_FunctionDef

        def visit_ClassDef(self, node: ast.ClassDef) -> None:
            if node.name == variable:
                self.found = True
            self.visit_all(node.decorator_list)
            self.visit_all(node.bases)
            self.visit_all([keyword.value for keyword in node.keywords])
            self.visit_all(getattr(node, "type_params", []))

            class ClassGlobalVisitor(ast.NodeVisitor):
                found = False

                def visit_Global(self, candidate: ast.Global) -> None:
                    if variable in candidate.names:
                        self.found = True

                def visit_FunctionDef(self, candidate: ast.FunctionDef) -> None:
                    pass

                visit_AsyncFunctionDef = visit_FunctionDef
                visit_ClassDef = visit_FunctionDef
                visit_Lambda = visit_FunctionDef
                visit_ListComp = visit_FunctionDef
                visit_SetComp = visit_FunctionDef
                visit_DictComp = visit_FunctionDef
                visit_GeneratorExp = visit_FunctionDef

            global_visitor = ClassGlobalVisitor()
            for statement in node.body:
                global_visitor.visit(statement)
            if global_visitor.found:
                self.visit_all(node.body)

        def visit_Lambda(self, node: ast.Lambda) -> None:
            self.visit_arguments_evaluated_at_definition(node.args)

        def visit_ListComp(self, node: ast.ListComp) -> None:
            for generator in node.generators:
                self.visit(generator.iter)
                self.visit_all(generator.ifs)
            self.visit(node.elt)

        visit_SetComp = visit_ListComp
        visit_GeneratorExp = visit_ListComp

        def visit_DictComp(self, node: ast.DictComp) -> None:
            for generator in node.generators:
                self.visit(generator.iter)
                self.visit_all(generator.ifs)
            self.visit(node.key)
            self.visit(node.value)

        def visit_Import(self, node: ast.Import) -> None:
            if any((alias.asname or alias.name.split(".")[0]) == variable for alias in node.names):
                self.found = True

        def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
            if any((alias.asname or alias.name) == variable for alias in node.names):
                self.found = True

    for node in module.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) and node.targets[0].id == variable:
            assignments.append(node)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == variable:
            assignments.append(node)
        else:
            visitor = UnsupportedBindingVisitor()
            visitor.visit(node)
            if visitor.found:
                raise AssertionError(f"{variable} dynamic binding or augmentation is unsupported")
    if not assignments:
        return []
    if len(assignments) != 1:
        raise AssertionError(f"{variable} has multiple bindings")
    value = assignments[0].value
    if not isinstance(value, (ast.List, ast.Tuple)) or not all(isinstance(item, ast.Name) for item in value.elts):
        raise AssertionError(f"{variable} must be a literal source-visible name list")
    return [item.id for item in value.elts]

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

def _module_path(current_path: str, imported: ast.ImportFrom, overrides: dict[str, str] | None = None) -> str:
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
        if (ROOT / candidate).is_file() or (overrides is not None and candidate in overrides):
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
                imported_path = _module_path(module_path, node, overrides)
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
        EligibleEntry = tuple[int, int, str | None]
        eligible: dict[str, EligibleEntry] = {}
        import_suffixes = tuple(sorted(set(importlib.machinery.all_suffixes()), key=len, reverse=True))

        def suffix_for(filename: str) -> str | None:
            return next((suffix for suffix in import_suffixes if filename.endswith(suffix)), None)

        def loader_precedence(suffix: str) -> int:
            if suffix in importlib.machinery.EXTENSION_SUFFIXES:
                return 0
            if suffix in importlib.machinery.SOURCE_SUFFIXES:
                return 1
            if suffix in importlib.machinery.BYTECODE_SUFFIXES:
                return 2
            raise AssertionError(f"unsupported import loader suffix {suffix}")

        def register(module_name: str, relative: str, suffix: str, package: bool) -> None:
            candidate: EligibleEntry = (
                0 if package else 1,
                loader_precedence(suffix),
                relative if suffix in importlib.machinery.SOURCE_SUFFIXES else None,
            )
            existing = eligible.get(module_name)
            if existing is None or candidate[:2] < existing[:2]:
                eligible[module_name] = candidate
            elif candidate[:2] == existing[:2] and candidate[2] != existing[2]:
                raise AssertionError(f"ambiguous eligible extension module {folder}/{module_name}")

        for child in absolute.iterdir():
            if child.is_dir():
                initializers = [
                    entry for entry in child.iterdir()
                    if (suffix := suffix_for(entry.name)) is not None and entry.name[:-len(suffix)] == "__init__"
                ]
                for initializer in initializers:
                    suffix = suffix_for(initializer.name)
                    assert suffix is not None
                    register(child.name, f"{folder}/{child.name}/{initializer.name}", suffix, True)
            elif child.is_file():
                suffix = suffix_for(child.name)
                if suffix is not None:
                    module_name = child.name[:-len(suffix)]
                    if module_name != "__init__":
                        register(module_name, f"{folder}/{child.name}", suffix, False)
        for relative in (overrides or {}):
            prefix = f"{folder}/"
            if not relative.startswith(prefix):
                continue
            remainder = relative[len(prefix):]
            if "/" not in remainder:
                suffix = suffix_for(remainder)
                if suffix is not None and remainder[:-len(suffix)] != "__init__":
                    register(remainder[:-len(suffix)], relative, suffix, False)
            elif remainder.count("/") == 1:
                module_name, initializer = remainder.split("/", 1)
                suffix = suffix_for(initializer)
                if suffix is not None and initializer[:-len(suffix)] == "__init__":
                    register(module_name, relative, suffix, True)
        for module_name in sorted(eligible):
            relative = eligible[module_name][2]
            if relative is None:
                raise AssertionError(f"eligible extension module {folder}/{module_name} lacks parseable .py source")
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

def emit_report_exclusive(target: Path, value: dict[str, object]) -> None:
    with target.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())

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

    def test_top_level_extension_module_interceptor_is_discovered(self) -> None:
        path = "extensions_built_in/interceptor.py"
        actual = build_report({
            path: "from .interceptor_model import FluxInterceptor\n\nAI_TOOLKIT_MODELS = [FluxInterceptor]\n",
            "extensions_built_in/interceptor_model.py": "class FluxInterceptor:\n    arch = 'flux'\n",
        })
        flux = next(row for row in actual["bindings"] if row["ui_architecture"] == "flux")
        self.assertEqual(flux["model_class"], "FluxInterceptor")
        with self.assertRaisesRegex(AssertionError, "backend mapping report drift"):
            validate_expected_report(actual)

    def test_annotated_registry_assignment_is_discovered(self) -> None:
        path = "extensions_built_in/annotated_interceptor.py"
        actual = build_report({path: "class FluxInterceptor:\n    arch = 'flux'\n\nAI_TOOLKIT_MODELS: list[type] = [FluxInterceptor]\n"})
        flux = next(row for row in actual["bindings"] if row["ui_architecture"] == "flux")
        self.assertEqual(flux["model_class"], "FluxInterceptor")

    def test_registry_dynamic_augmentation_fails_closed(self) -> None:
        path = "extensions_built_in/augmented_registry.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*dynamic|multiple|unsupported"):
            build_report({path: "class FluxInterceptor:\n    arch = 'flux'\nAI_TOOLKIT_MODELS = [FluxInterceptor]\nAI_TOOLKIT_MODELS.append(FluxInterceptor)\n"})

    def test_conditional_registry_rebinding_fails_closed(self) -> None:
        path = "extensions_built_in/conditional_registry.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
            build_report({path: "AI_TOOLKIT_MODELS = []\nif __debug__:\n    AI_TOOLKIT_MODELS = []\n"})

    def test_nested_local_registry_names_do_not_change_module_registry(self) -> None:
        path = "extensions_built_in/local_registry_names.py"
        actual = build_report({path: """
def local_registry():
    AI_TOOLKIT_MODELS = []
    AI_TOOLKIT_MODELS.append(object)

class LocalRegistry:
    AI_TOOLKIT_MODELS = []

local_lambda = lambda: (AI_TOOLKIT_MODELS := [])
local_comprehension = [AI_TOOLKIT_MODELS for AI_TOOLKIT_MODELS in []]
AI_TOOLKIT_MODELS = []
"""})
        self.assertEqual(actual, report())

    def test_function_default_registry_walrus_fails_closed_before_interception(self) -> None:
        path = "extensions_built_in/default_interceptor.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
            build_report({path: "class FluxInterceptor:\n    arch = 'flux'\nAI_TOOLKIT_MODELS = []\ndef install(value=(AI_TOOLKIT_MODELS := [FluxInterceptor])):\n    pass\n"})

    def test_definition_decorators_annotations_and_class_bases_are_module_scope(self) -> None:
        variants = (
            "AI_TOOLKIT_MODELS = []\n@(AI_TOOLKIT_MODELS := (lambda value: value))\ndef decorated():\n    pass\n",
            "AI_TOOLKIT_MODELS = []\ndef annotated(value: (AI_TOOLKIT_MODELS := object)) -> object:\n    pass\n",
            "AI_TOOLKIT_MODELS = []\ndef returned() -> (AI_TOOLKIT_MODELS := object):\n    pass\n",
            "AI_TOOLKIT_MODELS = []\nasync def configured(*, value=(AI_TOOLKIT_MODELS := [])):\n    pass\n",
            "AI_TOOLKIT_MODELS = []\nclass Based((AI_TOOLKIT_MODELS := object)):\n    pass\n",
            "AI_TOOLKIT_MODELS = []\n@(AI_TOOLKIT_MODELS := (lambda value: value))\nclass Decorated:\n    pass\n",
            "AI_TOOLKIT_MODELS = []\nclass Meta(metaclass=(AI_TOOLKIT_MODELS := type)):\n    pass\n",
            "AI_TOOLKIT_MODELS = []\nfactory = lambda value=(AI_TOOLKIT_MODELS := []): value\n",
            "AI_TOOLKIT_MODELS = []\ndef generic[T: (AI_TOOLKIT_MODELS := object)]():\n    pass\n",
        )
        for index, variant in enumerate(variants):
            with self.subTest(index=index), self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
                build_report({f"extensions_built_in/definition_scope_{index}.py": variant})

    def test_class_global_registry_rebinding_fails_closed_but_class_local_does_not(self) -> None:
        global_path = "extensions_built_in/class_global_registry.py"
        global_variants = (
            "AI_TOOLKIT_MODELS = []\nclass RegistryMutation:\n    global AI_TOOLKIT_MODELS\n    AI_TOOLKIT_MODELS = [object]\n",
            "AI_TOOLKIT_MODELS = []\nclass RegistryMutation:\n    global AI_TOOLKIT_MODELS\n    AI_TOOLKIT_MODELS.append(object)\n",
        )
        for index, variant in enumerate(global_variants):
            with self.subTest(global_index=index), self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
                build_report({global_path: variant})
        local_path = "extensions_built_in/class_local_registry.py"
        self.assertEqual(build_report({local_path: "class RegistryLocal:\n    AI_TOOLKIT_MODELS = [object]\n    AI_TOOLKIT_MODELS.append(object)\nAI_TOOLKIT_MODELS = []\n"}), report())

    def test_module_comprehension_walrus_registry_binding_fails_closed(self) -> None:
        path = "extensions_built_in/comprehension_registry.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
            build_report({path: "AI_TOOLKIT_MODELS = []\nvalues = [(AI_TOOLKIT_MODELS := []) for item in [0]]\n"})

    def test_module_loop_registry_binding_fails_closed(self) -> None:
        path = "extensions_built_in/loop_registry.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS.*unsupported"):
            build_report({path: "AI_TOOLKIT_MODELS = []\nfor AI_TOOLKIT_MODELS in [[]]:\n    pass\n"})

    def test_eligible_native_module_without_python_source_fails_closed(self) -> None:
        with self.assertRaisesRegex(AssertionError, r"eligible extension module.*parseable.*\.py"):
            build_report({"extensions_built_in/native_interceptor.so": "binary fixture"})

    def test_native_package_initializer_takes_precedence_over_source_and_fails_closed(self) -> None:
        package = "extensions_built_in/native_package"
        with self.assertRaisesRegex(AssertionError, r"eligible extension module.*parseable.*\.py"):
            build_report({
                f"{package}/__init__.py": "AI_TOOLKIT_MODELS = []\n",
                f"{package}/__init__.cpython-312-x86_64-linux-gnu.so": "binary fixture",
            })

    def test_source_package_initializer_precedes_bytecode(self) -> None:
        package = "extensions_built_in/source_package"
        actual = build_report({
            f"{package}/__init__.py": "class FluxInterceptor:\n    arch = 'flux'\nAI_TOOLKIT_MODELS = [FluxInterceptor]\n",
            f"{package}/__init__.pyc": "bytecode fixture",
        })
        flux = next(row for row in actual["bindings"] if row["ui_architecture"] == "flux")
        self.assertEqual(flux["model_class"], "FluxInterceptor")

    def test_unsupported_eligible_top_level_registry_fails_closed(self) -> None:
        path = "extensions_built_in/dynamic_registry.py"
        with self.assertRaisesRegex(AssertionError, "AI_TOOLKIT_MODELS must be a literal"):
            build_report({path: "def models():\n    return []\nAI_TOOLKIT_MODELS = models()\n"})

    def test_exclusive_emitter_does_not_overwrite_preexisting_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "backend.json"
            target.write_text("owner", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                emit_report_exclusive(target, report())
            self.assertEqual(target.read_text(encoding="utf-8"), "owner")

    def test_exclusive_emitter_does_not_follow_target_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            external = Path(directory) / "external.json"
            target = Path(directory) / "backend.json"
            external.write_text("owner", encoding="utf-8")
            target.symlink_to(external)
            with self.assertRaises(FileExistsError):
                emit_report_exclusive(target, report())
            self.assertEqual(external.read_text(encoding="utf-8"), "owner")

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
    if not args.emit.parent.is_dir() or args.emit.parent.is_symlink():
        raise SystemExit("--emit requires a nonexistent path in an owned existing directory")
    emit_report_exclusive(args.emit, report())

if __name__ == "__main__":
    main()
