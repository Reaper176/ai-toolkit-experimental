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

def tree(path: str) -> ast.Module:
    return ast.parse((ROOT / path).read_text(encoding="utf-8"), filename=path)

def class_names(path: str) -> set[str]:
    return {node.name for node in tree(path).body if isinstance(node, ast.ClassDef)}

def class_architecture(path: str, symbol: str) -> str | None:
    for node in tree(path).body:
        if isinstance(node, ast.ClassDef) and node.name == symbol:
            for statement in node.body:
                if isinstance(statement, (ast.Assign, ast.AnnAssign)):
                    targets = statement.targets if isinstance(statement, ast.Assign) else [statement.target]
                    value = statement.value
                    if any(isinstance(target, ast.Name) and target.id == "arch" for target in targets) and isinstance(value, ast.Constant) and isinstance(value.value, str):
                        return value.value
    return None

def registered_models() -> set[str]:
    for node in tree("extensions_built_in/diffusion_models/__init__.py").body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "AI_TOOLKIT_MODELS" for target in node.targets) and isinstance(node.value, ast.List):
            return {item.id for item in node.value.elts if isinstance(item, ast.Name)}
    raise AssertionError("AI_TOOLKIT_MODELS must be a literal source-visible list")

def validate_sources() -> None:
    config = ast.unparse(tree("toolkit/config_modules.py"))
    if "self.arch = self.arch.split(':')[0]" not in config or "if self.arch == 'flex1':\n            self.arch = 'flux'" not in config:
        raise AssertionError("ModelConfig must strip suffixes before normalizing flex1 to flux")
    resolver = ast.unparse(tree("toolkit/util/get_model.py"))
    if "if ModelClass.arch == config.arch" not in resolver or "return StableDiffusion" not in resolver:
        raise AssertionError("get_model_class must retain registered lookup and StableDiffusion fallback")
    registry = registered_models()
    for ui_arch, normalized, symbol, source_path in BINDINGS:
        if symbol not in class_names(source_path):
            raise AssertionError(f"{source_path} no longer defines {symbol}")
        if symbol not in {"StableDiffusion", "Wan21"} and symbol not in registry:
            raise AssertionError(f"{symbol} is absent from AI_TOOLKIT_MODELS")
        if symbol == "Wan21" and symbol not in resolver:
            raise AssertionError("Wan21 is absent from BUILT_IN_MODELS")
        if ui_arch == "flex1" and normalized != "flux":
            raise AssertionError("flex1 normalization drift")
        source_arch = class_architecture(source_path, symbol)
        if symbol not in {"StableDiffusion"} and source_arch != normalized:
            raise AssertionError(f"{symbol}.arch {source_arch!r} does not match normalized {normalized!r}")
    stable = {ui_arch for ui_arch, _, symbol, _ in BINDINGS if symbol == "StableDiffusion"}
    if stable != {"flux", "flex1", "sdxl", "sd15"}:
        raise AssertionError("StableDiffusion fallback architectures drifted")

def report() -> dict[str, object]:
    validate_sources()
    return {"schema_version": 1, "bindings": [{
        "ui_architecture": ui_arch, "normalized_architecture": normalized,
        "model_class": symbol, "source_path": source_path, "symbol": symbol,
    } for ui_arch, normalized, symbol, source_path in BINDINGS]}

class BackendMappingTests(unittest.TestCase):
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
