"""Strict, non-executing validation for the training book's YAML examples."""

from __future__ import annotations

import ast
import json
import re
import struct
import tempfile
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Literal, Mapping

import yaml
from PIL import Image


class ExampleError(ValueError):
    """Raised when an example contract is invalid."""


@dataclass(frozen=True)
class TokenDeclaration:
    name: str
    type: Literal["path", "string"]


@dataclass(frozen=True)
class ExampleEntry:
    path: str
    architecture: str
    roles: tuple[str, ...]
    chapters: tuple[str, ...]
    validation_profile: Literal[
        "image-lora", "image-edit-lora", "masked-image-lora", "video-lora",
        "resume-image-lora",
    ]
    tokens: tuple[TokenDeclaration, ...]


@dataclass(frozen=True)
class ExampleManifest:
    schema_version: Literal[1]
    book_revision: Literal[1]
    examples: tuple[ExampleEntry, ...]


_TOKEN = re.compile(r"\$\{([A-Z][A-Z0-9_]*)\}")
_REPLACEMENTS = {
    "DATASET_DIR": ("path", "dataset"), "OUTPUT_DIR": ("path", "output"),
    "CONTROL_DIR": ("path", "controls"),
    "CONTROL_IMAGE": ("path", "sample-control.png"),
    "MASK_DIR": ("path", "masks"),
    "CHECKPOINT_PATH": ("path", "checkpoint.safetensors"),
    "JOB_NAME": ("string", "training-book-example"),
}
_TOKEN_NAMES = "|".join(re.escape(name) for name in _REPLACEMENTS)
_PLACEHOLDER_LIKE = re.compile(
    rf"\$\{{|\$\}}|\$(?:{_TOKEN_NAMES})\b|"
    rf"\{{\{{\s*(?:{_TOKEN_NAMES})\s*\}}\}}|\{{(?:{_TOKEN_NAMES})\}}"
)
_PROFILES = {"image-lora", "image-edit-lora", "masked-image-lora", "video-lora", "resume-image-lora"}
_ENGINE_ARCH = {"wan21:1b": "wan21", "wan22_14b:t2v": "wan22_14b"}
_ARCH_PROFILE = {
    "flux_kontext": "image-edit-lora", "qwen_image_edit_plus": "image-edit-lora",
    "wan21:1b": "video-lora", "wan22_14b:t2v": "video-lora",
}
_OVERLAYS = {
    "first-lora-flex1.yaml": ("ostris/Flex.1-alpha", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 4, 25),
    "character-anima.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 1e-4, 3000, [1024], 1024, 1024, 4, 30),
    "style-flux.yaml": ("black-forest-labs/FLUX.1-dev", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 4, 20),
    "flux-kontext-edit.yaml": ("black-forest-labs/FLUX.1-Kontext-dev", 16, 1e-4, 2000, [512, 768], 1024, 1024, 4, 20),
    "object-qwen-image.yaml": ("Qwen/Qwen-Image", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 3, 25),
    "focused-refinement-qwen-image-edit-2509.yaml": ("Qwen/Qwen-Image-Edit-2509", 16, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 3, 25),
    "low-vram-anima.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 5e-5, 3000, [512, 768], 768, 768, 4, 30),
    "diagnostic-wan21-1b.yaml": ("Wan-AI/Wan2.1-T2V-1.3B-Diffusers", 32, 1e-4, 250, [632], 832, 480, 5, 30),
    "character-sdxl.yaml": ("stabilityai/stable-diffusion-xl-base-1.0", 32, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 6, 30),
    "character-sd15.yaml": ("stable-diffusion-v1-5/stable-diffusion-v1-5", 32, 1e-4, 3000, [512], 512, 512, 6, 30),
    "motion-wan22-14b-t2v.yaml": ("ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16", 32, 5e-5, 2000, [512, 768, 1024], 1024, 1024, 3.5, 25),
    "masked-refinement.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 2e-5, 3000, [1024], 1024, 1024, 4, 30),
    "resume-from-checkpoint.yaml": ("ostris/Flex.1-alpha", 16, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 4, 25),
}
_CONTENT_TIMESTEP = {
    "first-lora-flex1.yaml": ("content", "sigmoid"),
    "character-anima.yaml": ("content", "weighted"),
    "style-flux.yaml": ("style", "sigmoid"),
    "flux-kontext-edit.yaml": ("balanced", "weighted"),
    "object-qwen-image.yaml": ("content", "weighted"),
    "focused-refinement-qwen-image-edit-2509.yaml": ("style", "weighted"),
    "low-vram-anima.yaml": ("content", "weighted"),
    "diagnostic-wan21-1b.yaml": ("balanced", "sigmoid"),
    "character-sdxl.yaml": ("content", "sigmoid"),
    "character-sd15.yaml": ("content", "sigmoid"),
    "motion-wan22-14b-t2v.yaml": ("content", "linear"),
    "masked-refinement.yaml": ("content", "weighted"),
    "resume-from-checkpoint.yaml": ("content", "sigmoid"),
}
_TEXT_CACHE = {
    "flux-kontext-edit.yaml", "object-qwen-image.yaml",
    "focused-refinement-qwen-image-edit-2509.yaml", "low-vram-anima.yaml",
    "diagnostic-wan21-1b.yaml", "motion-wan22-14b-t2v.yaml",
}
_QFLOAT8 = {
    "first-lora-flex1.yaml", "style-flux.yaml", "flux-kontext-edit.yaml",
    "object-qwen-image.yaml", "focused-refinement-qwen-image-edit-2509.yaml",
    "motion-wan22-14b-t2v.yaml", "resume-from-checkpoint.yaml",
}
_MAX_SAFETENSORS_HEADER_BYTES = 1024 * 1024
_MAX_EXAMPLE_YAML_BYTES = 1024 * 1024
_MAX_EXAMPLE_YAML_NODES = 10_000
_MAX_EXAMPLE_YAML_DEPTH = 64
_SAFETENSORS_DTYPE_BYTES = {
    "BOOL": 1, "U8": 1, "I8": 1,
    "I16": 2, "U16": 2, "F16": 2, "BF16": 2,
    "I32": 4, "U32": 4, "F32": 4,
    "I64": 8, "U64": 8, "F64": 8,
    "F8_E4M3": 1, "F8_E5M2": 1,
}


def _tokens(*names: str) -> tuple[TokenDeclaration, ...]:
    return tuple(TokenDeclaration(name, "string" if name == "JOB_NAME" else "path")
                 for name in names)


_EXPECTED_EXAMPLES = (
    ExampleEntry("first-lora-flex1.yaml", "flex1", ("first-run", "object"),
                 ("getting-started/first-lora.md", "recipes/object-concept.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("character-anima.yaml", "anima", ("character", "identity"),
                 ("recipes/character-identity.md", "models/anima.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("style-flux.yaml", "flux", ("style",),
                 ("recipes/style.md", "models/flux-and-flex.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("flux-kontext-edit.yaml", "flux_kontext", ("edit", "control"),
                 ("datasets/controls-video-audio.md", "models/flux-and-flex.md"),
                 "image-edit-lora", _tokens("DATASET_DIR", "CONTROL_DIR", "CONTROL_IMAGE", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("object-qwen-image.yaml", "qwen_image", ("object",),
                 ("recipes/object-concept.md", "models/qwen-image-and-edit.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("focused-refinement-qwen-image-edit-2509.yaml", "qwen_image_edit_plus", ("refinement", "edit"),
                 ("recipes/focused-refinement.md", "models/qwen-image-and-edit.md"),
                 "image-edit-lora", _tokens("DATASET_DIR", "CONTROL_DIR", "CONTROL_IMAGE", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("low-vram-anima.yaml", "anima", ("low-vram", "character"),
                 ("recipes/low-vram.md", "models/anima.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("diagnostic-wan21-1b.yaml", "wan21:1b", ("diagnostic", "video"),
                 ("recipes/diagnostic-run.md", "models/wan.md"),
                 "video-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("character-sdxl.yaml", "sdxl", ("character", "identity"),
                 ("recipes/character-identity.md", "models/sdxl-and-sd15.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("character-sd15.yaml", "sd15", ("character", "identity"),
                 ("recipes/character-identity.md", "models/sdxl-and-sd15.md"),
                 "image-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("motion-wan22-14b-t2v.yaml", "wan22_14b:t2v", ("motion", "video"),
                 ("models/wan.md", "datasets/controls-video-audio.md"),
                 "video-lora", _tokens("DATASET_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("masked-refinement.yaml", "anima", ("refinement", "mask"),
                 ("recipes/focused-refinement.md", "datasets/masks.md"),
                 "masked-image-lora", _tokens("DATASET_DIR", "MASK_DIR", "OUTPUT_DIR", "JOB_NAME")),
    ExampleEntry("resume-from-checkpoint.yaml", "flex1", ("resume", "object"),
                 ("workflow/saving-resuming-and-optimizer-state.md", "getting-started/first-lora.md"),
                 "resume-image-lora", _tokens("DATASET_DIR", "CHECKPOINT_PATH", "OUTPUT_DIR", "JOB_NAME")),
)


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ExampleError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _portable(value: str, label: str) -> str:
    path = PurePosixPath(value)
    if not value or "\\" in value or path.is_absolute() or ".." in path.parts or str(path) != value:
        raise ExampleError(f"{label} must be a portable relative path")
    return value


def _strings(value: Any, label: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not value or not all(isinstance(v, str) and v for v in value):
        raise ExampleError(f"{label} must be a non-empty string array")
    if len(value) != len(set(value)):
        raise ExampleError(f"duplicate {label}")
    return tuple(value)


def load_example_manifest(path: Path) -> ExampleManifest:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_pairs)
    except (OSError, json.JSONDecodeError) as error:
        raise ExampleError(f"cannot load example manifest {path}: {error}") from error
    if not isinstance(raw, dict) or set(raw) != {"schema_version", "book_revision", "examples"}:
        raise ExampleError("example manifest has missing or extra keys")
    if (type(raw["schema_version"]) is not int or raw["schema_version"] != 1
            or type(raw["book_revision"]) is not int or raw["book_revision"] != 1
            or not isinstance(raw["examples"], list) or not raw["examples"]):
        raise ExampleError("example manifest requires schema/book revision 1 and examples")
    entries = []
    for index, item in enumerate(raw["examples"]):
        required = {"path", "architecture", "roles", "chapters", "validation_profile", "tokens"}
        if not isinstance(item, dict) or set(item) != required:
            raise ExampleError(f"example {index} has missing or extra keys")
        path_value = _portable(item["path"], "example path") if isinstance(item["path"], str) else ""
        if not path_value.endswith((".yaml", ".yml")) or PurePosixPath(path_value).parent != PurePosixPath("."):
            raise ExampleError("example path must be a direct YAML filename")
        architecture = item["architecture"]
        profile = item["validation_profile"]
        if not isinstance(architecture, str) or not architecture or profile not in _PROFILES:
            raise ExampleError("invalid architecture or validation profile")
        if not isinstance(item["tokens"], list) or not item["tokens"]:
            raise ExampleError("tokens must be a non-empty array")
        tokens = []
        for token in item["tokens"]:
            if not isinstance(token, dict) or set(token) != {"name", "type"}:
                raise ExampleError("token declaration has missing or extra keys")
            if token["name"] not in _REPLACEMENTS or token["type"] not in {"path", "string"}:
                raise ExampleError("unknown token declaration")
            if _REPLACEMENTS[token["name"]][0] != token["type"]:
                raise ExampleError("token declaration has the wrong type")
            tokens.append(TokenDeclaration(token["name"], token["type"]))
        if len(tokens) != len({token.name for token in tokens}):
            raise ExampleError("duplicate token declaration")
        entries.append(ExampleEntry(path_value, architecture, _strings(item["roles"], "roles"),
                                    tuple(_portable(v, "chapter") for v in _strings(item["chapters"], "chapters")),
                                    profile, tuple(tokens)))
    if len(entries) != len({item.path for item in entries}):
        raise ExampleError("duplicate example path")
    manifest = ExampleManifest(1, 1, tuple(entries))
    if manifest.examples != _EXPECTED_EXAMPLES:
        raise ExampleError("example manifest differs from the exact ordered 13-row matrix")
    book_path = path.parent.parent / "book-manifest.json"
    if book_path.is_file():
        book = json.loads(book_path.read_text(encoding="utf-8"), object_pairs_hook=_pairs)
        chapters = {page["path"] for page in book["pages"]}
        architectures = set(book["full_architectures"])
        for entry in manifest.examples:
            if entry.architecture not in architectures:
                raise ExampleError(f"unknown architecture: {entry.architecture}")
            if not set(entry.chapters) <= chapters:
                raise ExampleError(f"example {entry.path} names a chapter outside the book manifest")
    return manifest


def substitute_typed_tokens(value: Any, declarations: Mapping[str, TokenDeclaration] | tuple[TokenDeclaration, ...], fixture_root: Path) -> Any:
    declared_values = declarations.values() if isinstance(declarations, Mapping) else declarations
    declared = {item.name: item for item in declared_values}
    used: set[str] = set()
    root = fixture_root.resolve()

    def visit(item: Any) -> Any:
        if isinstance(item, dict):
            return {key: visit(child) for key, child in item.items()}
        if isinstance(item, list):
            return [visit(child) for child in item]
        if not isinstance(item, str):
            return item
        matches = list(_TOKEN.finditer(item))
        if not matches:
            if _PLACEHOLDER_LIKE.search(item):
                raise ExampleError(f"malformed or unresolved placeholder: {item}")
            return item
        if len(matches) != 1 or matches[0].span() != (0, len(item)):
            raise ExampleError("tokens must occupy an entire scalar")
        name = matches[0].group(1)
        if name not in declared or name not in _REPLACEMENTS:
            raise ExampleError(f"undeclared token: {name}")
        declaration = declared[name]
        expected_type, replacement = _REPLACEMENTS[name]
        if declaration.type != expected_type:
            raise ExampleError(f"wrong token type for {name}")
        used.add(name)
        if expected_type == "string":
            return replacement
        target = (root / replacement).resolve()
        if target == root or root not in target.parents:
            raise ExampleError(f"path token escapes fixture root: {name}")
        return str(target)

    result = visit(value)
    unused = set(declared) - used
    if unused:
        raise ExampleError(f"unused token declarations: {', '.join(sorted(unused))}")
    def assert_resolved(item: Any) -> None:
        if isinstance(item, dict):
            for child in item.values():
                assert_resolved(child)
        elif isinstance(item, list):
            for child in item:
                assert_resolved(child)
        elif isinstance(item, str) and _PLACEHOLDER_LIKE.search(item):
            raise ExampleError(f"placeholder-like syntax remains after substitution: {item}")

    assert_resolved(result)
    return result


def _make_fixtures(root: Path) -> None:
    for directory in ("dataset", "output", "controls", "masks"):
        (root / directory).mkdir(parents=True)
    Image.new("RGB", (16, 16), (10, 20, 30)).save(root / "dataset/example.png")
    (root / "dataset/example.txt").write_text("[trigger] subject\n", encoding="utf-8")
    Image.new("RGB", (16, 16), (30, 20, 10)).save(root / "controls/example.png")
    Image.new("L", (16, 16), 255).save(root / "masks/example.png")
    Image.new("RGB", (8, 8), (1, 2, 3)).save(root / "sample-control.png")
    header = json.dumps({
        "__metadata__": {
            "format": "pt", "ss_output_name": "training-book-example",
            "training_info": json.dumps({"step": 250, "epoch": 0}),
        },
        "lora_dummy.weight": {"dtype": "F32", "shape": [1], "data_offsets": [0, 4]},
    }, separators=(",", ":")).encode("utf-8")
    header += b" " * (-len(header) % 8)
    (root / "checkpoint.safetensors").write_bytes(
        struct.pack("<Q", len(header)) + header + struct.pack("<f", 0.0)
    )
    save_root = root / "output/training-book-example"
    save_root.mkdir()
    (save_root / "optimizer.pt").write_bytes(b"inert; never unpickle")


def _strict_json_object(raw: bytes | str, label: str) -> dict[str, Any]:
    try:
        value = json.loads(raw, object_pairs_hook=_pairs)
    except (UnicodeDecodeError, ValueError, RecursionError) as error:
        raise ExampleError(f"invalid {label} JSON: {error}") from error
    if not isinstance(value, dict):
        raise ExampleError(f"{label} must be a JSON object")
    return value


class _BoundedUniqueSafeLoader(yaml.SafeLoader):
    """Safe YAML loader with finite structure and unambiguous mappings."""

    def __init__(self, stream: str) -> None:
        super().__init__(stream)
        self._node_count = 0
        self._node_depth = 0

    def compose_node(self, parent: Any, index: Any) -> Any:
        if self.check_event(yaml.events.AliasEvent):
            raise ExampleError("YAML aliases and merge ambiguity are forbidden")
        self._node_count += 1
        self._node_depth += 1
        if self._node_count > _MAX_EXAMPLE_YAML_NODES:
            raise ExampleError("example YAML exceeds the node limit")
        if self._node_depth > _MAX_EXAMPLE_YAML_DEPTH:
            raise ExampleError("example YAML exceeds the nesting limit")
        try:
            return super().compose_node(parent, index)
        finally:
            self._node_depth -= 1


def _construct_unique_mapping(
    loader: _BoundedUniqueSafeLoader, node: yaml.nodes.MappingNode, deep: bool = False
) -> dict[Any, Any]:
    if not isinstance(node, yaml.nodes.MappingNode):
        raise ExampleError("YAML mapping node is malformed")
    result: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        if key_node.tag == "tag:yaml.org,2002:merge":
            raise ExampleError("YAML merge keys are forbidden")
        key = loader.construct_object(key_node, deep=deep)
        try:
            hash(key)
        except TypeError as error:
            raise ExampleError("YAML mapping keys must be hashable scalars") from error
        if key in result:
            raise ExampleError(f"duplicate YAML mapping key: {key!r}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


_BoundedUniqueSafeLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_unique_mapping
)


def _load_example_yaml(path: Path) -> Any:
    try:
        if path.stat().st_size > _MAX_EXAMPLE_YAML_BYTES:
            raise ExampleError("example YAML exceeds the byte limit")
        text = path.read_text(encoding="utf-8")
        return yaml.load(text, Loader=_BoundedUniqueSafeLoader)
    except ExampleError:
        raise
    except (OSError, UnicodeDecodeError, yaml.YAMLError) as error:
        raise ExampleError(f"cannot parse {path.name}: {error}") from error


def _validate_resume_safetensors(
    path: Path, *, expected_job_name: str, expected_start_step: int
) -> None:
    """Validate only safetensors metadata/layout; never deserialize tensor data."""
    try:
        file_size = path.stat().st_size
        with path.open("rb") as stream:
            prefix = stream.read(8)
            if len(prefix) != 8:
                raise ExampleError("resume checkpoint lacks an 8-byte header length")
            header_length = struct.unpack("<Q", prefix)[0]
            if (not 2 <= header_length <= _MAX_SAFETENSORS_HEADER_BYTES
                    or header_length % 8 != 0):
                raise ExampleError("resume checkpoint header length is outside sane bounds")
            payload_start = 8 + header_length
            if payload_start > file_size:
                raise ExampleError("resume checkpoint header is truncated")
            header_bytes = stream.read(header_length)
            if len(header_bytes) != header_length:
                raise ExampleError("resume checkpoint header is truncated")
    except OSError as error:
        raise ExampleError(f"cannot read resume checkpoint: {error}") from error

    header = _strict_json_object(header_bytes, "safetensors header")
    metadata = header.get("__metadata__")
    if not isinstance(metadata, dict) or set(metadata) != {
        "format", "ss_output_name", "training_info"
    } or not all(isinstance(value, str) for value in metadata.values()):
        raise ExampleError("resume checkpoint requires exact string metadata")
    if metadata["format"] != "pt" or metadata["ss_output_name"] != expected_job_name:
        raise ExampleError("resume checkpoint metadata identity is incompatible")
    training_info = _strict_json_object(metadata["training_info"], "training_info")
    if set(training_info) != {"step", "epoch"}:
        raise ExampleError("training_info requires exact step and epoch keys")
    step = training_info["step"]
    epoch = training_info["epoch"]
    if type(step) is not int or step != expected_start_step:
        raise ExampleError("resume checkpoint step is incompatible with start_step")
    if type(epoch) is not int or epoch < 0:
        raise ExampleError("resume checkpoint epoch must be a nonnegative integer")

    tensors = [(name, descriptor) for name, descriptor in header.items()
               if name != "__metadata__"]
    if not tensors:
        raise ExampleError("resume checkpoint must declare at least one tensor")
    payload_size = file_size - payload_start
    next_offset = 0
    for name, descriptor in tensors:
        if not isinstance(name, str) or not name:
            raise ExampleError("safetensors tensor names must be non-empty strings")
        if not isinstance(descriptor, dict) or set(descriptor) != {
            "dtype", "shape", "data_offsets"
        }:
            raise ExampleError(f"invalid tensor descriptor for {name}")
        dtype = descriptor["dtype"]
        if not isinstance(dtype, str) or dtype not in _SAFETENSORS_DTYPE_BYTES:
            raise ExampleError(f"unsupported safetensors dtype for {name}")
        shape = descriptor["shape"]
        if (not isinstance(shape, list)
                or any(type(dimension) is not int or dimension < 0 or dimension > 2**31
                       for dimension in shape)):
            raise ExampleError(f"invalid safetensors shape for {name}")
        offsets = descriptor["data_offsets"]
        if (not isinstance(offsets, list) or len(offsets) != 2
                or any(type(offset) is not int or offset < 0 for offset in offsets)):
            raise ExampleError(f"invalid safetensors offsets for {name}")
        start, end = offsets
        if start != next_offset or end < start or end > payload_size:
            raise ExampleError(f"noncontiguous or out-of-range tensor offsets for {name}")
        element_count = 0 if 0 in shape else 1
        if element_count:
            for dimension in shape:
                element_count *= dimension
                if element_count * _SAFETENSORS_DTYPE_BYTES[dtype] > payload_size:
                    raise ExampleError(f"tensor shape exceeds checkpoint payload for {name}")
        if end - start != element_count * _SAFETENSORS_DTYPE_BYTES[dtype]:
            raise ExampleError(f"tensor shape and payload size disagree for {name}")
        next_offset = end
    if next_offset != payload_size:
        raise ExampleError("safetensors payload is not exactly described by tensor offsets")


def _catalog_paths(catalog: Any) -> tuple[dict[str, str], set[str]]:
    result: dict[str, str] = {}
    object_paths = set()
    for setting in catalog.settings:
        for location in setting.locations:
            if location.kind == "yaml":
                result[location.path] = setting.contract.example_type
                if setting.contract.example_type == "object":
                    object_paths.add(location.path)
    terminal_objects = {
        path for path in object_paths
        if not any(other != path and (other.startswith(path + ".") or other.startswith(path + "[*]"))
                   for other in result)
    }
    return result, terminal_objects


def _leaf_paths(value: Any, prefix: str = "") -> list[str]:
    if isinstance(value, dict):
        return [path for key, child in value.items() for path in _leaf_paths(child, f"{prefix}.{key}" if prefix else key)]
    if isinstance(value, list):
        return [path for child in value for path in _leaf_paths(child, prefix + "[*]")]
    return [prefix]


def _leaf_items(value: Any, prefix: str = "") -> list[tuple[str, Any]]:
    if isinstance(value, dict):
        return [item for key, child in value.items()
                for item in _leaf_items(child, f"{prefix}.{key}" if prefix else key)]
    if isinstance(value, list):
        return [item for child in value for item in _leaf_items(child, prefix + "[*]")]
    return [(prefix, value)]


def _matches_example_type(value: Any, expected: str, *, list_element: bool) -> bool:
    if list_element and expected.endswith("-list"):
        expected = expected.removesuffix("-list")
    checks = {
        "boolean": lambda item: isinstance(item, bool),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "number": lambda item: isinstance(item, (int, float)) and not isinstance(item, bool),
        "string": lambda item: isinstance(item, str),
        "path": lambda item: isinstance(item, str),
    }
    return checks.get(expected, lambda item: True)(value)


def _validate_owned_keys(config: dict[str, Any], catalog: Any) -> None:
    allowed, object_paths = _catalog_paths(catalog)
    for path, value in _leaf_items(config):
        list_value_path = path.removesuffix("[*]")
        under_owned_object = any(path.startswith(prefix + ".") for prefix in object_paths)
        if path != "schema" and path not in allowed and list_value_path not in allowed and not under_owned_object:
            raise ExampleError(f"example key is not owned by the catalog: {path}")
        contract_path = path if path in allowed else list_value_path if list_value_path in allowed else None
        if contract_path is not None and not _matches_example_type(
            value, allowed[contract_path], list_element=contract_path == list_value_path and path != list_value_path
        ):
            raise ExampleError(f"example value has the wrong type for {contract_path}")


def _decode_image(path: Path, label: str) -> tuple[str, tuple[int, int]]:
    """Decode a complete image payload and return its stable semantic metadata."""
    try:
        with Image.open(path) as image:
            image.load()
            return image.mode, image.size
    except (OSError, SyntaxError, ValueError) as error:
        raise ExampleError(f"{label} must be a decodable image: {error}") from error


def _require_keys(value: Any, expected: set[str], location: str) -> None:
    if not isinstance(value, dict) or set(value) != expected:
        actual = set(value) if isinstance(value, dict) else type(value).__name__
        raise ExampleError(f"{location} keys differ: expected {sorted(expected)}, got {actual}")


def _validate_exact_shape(config: dict[str, Any], entry: ExampleEntry) -> None:
    _require_keys(config, {"schema", "job", "config"}, "root")
    body = config["config"]
    _require_keys(body, {"name", "process"}, "config")
    if not isinstance(body["process"], list) or len(body["process"]) != 1:
        raise ExampleError("config.process must contain exactly one object")
    process = body["process"][0]
    _require_keys(process, {
        "type", "training_folder", "network", "datasets", "train", "model",
        "save", "logging", "sample",
    }, "process")

    network_keys = {"type", "linear", "linear_alpha"}
    if entry.architecture in {"sdxl", "sd15"}:
        network_keys |= {"conv", "conv_alpha"}
    if entry.validation_profile == "resume-image-lora":
        network_keys.add("pretrained_lora_path")
    _require_keys(process["network"], network_keys, "network")

    if not isinstance(process["datasets"], list) or len(process["datasets"]) != 1:
        raise ExampleError("datasets must contain exactly one object")
    dataset_keys = {
        "folder_path", "caption_ext", "caption_dropout_rate", "shuffle_tokens",
        "cache_latents_to_disk", "resolution", "num_frames", "fps",
    }
    if entry.validation_profile == "image-edit-lora":
        dataset_keys.add("control_path")
    if entry.validation_profile == "masked-image-lora":
        dataset_keys |= {"mask_path", "mask_min_value", "invert_mask"}
    _require_keys(process["datasets"][0], dataset_keys, "dataset")

    train_keys = {
        "batch_size", "gradient_accumulation", "train_unet", "train_text_encoder",
        "gradient_checkpointing", "optimizer", "lr", "lr_scheduler",
        "noise_scheduler", "dtype", "loss_type", "steps", "content_or_style",
        "timestep_type", "cache_text_embeddings",
    }
    if entry.path in {"first-lora-flex1.yaml", "resume-from-checkpoint.yaml"}:
        train_keys.add("bypass_guidance_embedding")
    if entry.path == "motion-wan22-14b-t2v.yaml":
        train_keys.add("switch_boundary_every")
    if entry.validation_profile == "masked-image-lora":
        train_keys |= {"inverted_mask_prior", "inverted_mask_prior_multiplier", "train_turbo"}
    if entry.validation_profile == "resume-image-lora":
        train_keys.add("start_step")
    _require_keys(process["train"], train_keys, "train")

    model_keys = {"name_or_path", "arch", "quantize", "quantize_te"}
    if entry.path in _QFLOAT8:
        model_keys |= {"qtype", "qtype_te"}
    elif entry.path == "diagnostic-wan21-1b.yaml":
        model_keys.add("qtype_te")
    if entry.path in {
        "object-qwen-image.yaml", "focused-refinement-qwen-image-edit-2509.yaml",
        "low-vram-anima.yaml", "motion-wan22-14b-t2v.yaml",
    }:
        model_keys.add("low_vram")
    if entry.path == "first-lora-flex1.yaml":
        model_keys.add("quantize_kwargs")
    if entry.path in {
        "focused-refinement-qwen-image-edit-2509.yaml", "motion-wan22-14b-t2v.yaml",
    }:
        model_keys.add("model_kwargs")
    model = process["model"]
    _require_keys(model, model_keys, "model")
    if entry.path == "first-lora-flex1.yaml":
        _require_keys(model["quantize_kwargs"], {"exclude"}, "model.quantize_kwargs")
    if entry.path == "focused-refinement-qwen-image-edit-2509.yaml":
        _require_keys(model["model_kwargs"], {"match_target_res"}, "model.model_kwargs")
    if entry.path == "motion-wan22-14b-t2v.yaml":
        _require_keys(model["model_kwargs"], {"train_high_noise", "train_low_noise"}, "model.model_kwargs")

    _require_keys(process["save"], {
        "dtype", "save_format", "save_every", "max_step_saves_to_keep", "push_to_hub",
    }, "save")
    _require_keys(process["logging"], {"use_ui_logger", "use_wandb"}, "logging")
    sample_keys = {
        "sampler", "sample_every", "sample_start_step", "seed", "walk_seed",
        "width", "height", "guidance_scale", "sample_steps", "num_frames", "fps",
        "samples",
    }
    if entry.validation_profile == "video-lora":
        sample_keys.add("format")
    sample = process["sample"]
    _require_keys(sample, sample_keys, "sample")
    if not isinstance(sample["samples"], list) or len(sample["samples"]) != 1:
        raise ExampleError("sample.samples must contain exactly one object")
    item_keys = {"prompt"}
    if entry.validation_profile == "image-edit-lora":
        item_keys.add("ctrl_img")
    _require_keys(sample["samples"][0], item_keys, "sample item")


def _validate_semantics(config: dict[str, Any], entry: ExampleEntry, root: Path) -> None:
    if type(config.get("schema")) is not int or config.get("schema") != 1 or config.get("job") != "extension" or set(config) != {"schema", "job", "config"}:
        raise ExampleError("example must use schema 1 extension-job shape")
    body = config["config"]
    processes = body.get("process")
    if not isinstance(processes, list) or len(processes) != 1:
        raise ExampleError("example must have exactly one process")
    process = processes[0]
    if process.get("type") != "diffusion_trainer":
        raise ExampleError("example process must be diffusion_trainer")
    network = process.get("network", {})
    if network.get("type") != "lora" or network.get("linear") != network.get("linear_alpha"):
        raise ExampleError("example network must be an equal-rank LoRA")
    datasets = process.get("datasets")
    if not isinstance(datasets, list) or len(datasets) != 1:
        raise ExampleError("example must contain one dataset")
    dataset = datasets[0]
    if body.get("name") != "training-book-example" or Path(process.get("training_folder", "")) != root / "output":
        raise ExampleError("example name/output identity is invalid")
    expected_dataset = {
        "folder_path": str(root / "dataset"), "caption_ext": "txt",
        "caption_dropout_rate": 0.05, "shuffle_tokens": False,
        "cache_latents_to_disk": True,
    }
    if any(dataset.get(key) != value for key, value in expected_dataset.items()):
        raise ExampleError("dataset differs from the required baseline")
    dataset_root = Path(dataset["folder_path"])
    if not dataset_root.is_dir() or not (dataset_root / "example.txt").is_file():
        raise ExampleError("dataset path must contain the fixture image and caption")
    source_mode, source_size = _decode_image(
        dataset_root / "example.png", "dataset fixture"
    )
    if source_mode != "RGB":
        raise ExampleError("dataset fixture image must be RGB")
    model = process.get("model", {})
    if model.get("arch") != _ENGINE_ARCH.get(entry.architecture, entry.architecture):
        raise ExampleError("manifest architecture and model.arch disagree")
    sample = process.get("sample", {})
    samples = sample.get("samples")
    if not isinstance(samples, list) or len(samples) != 1 or "[trigger]" not in samples[0].get("prompt", ""):
        raise ExampleError("example requires one concrete trigger sample")
    overlay = (model.get("name_or_path"), network.get("linear"),
               process.get("train", {}).get("lr"), process.get("train", {}).get("steps"),
               dataset.get("resolution"), sample.get("width"), sample.get("height"),
               sample.get("guidance_scale"), sample.get("sample_steps"))
    if _OVERLAYS.get(entry.path) != overlay:
        raise ExampleError("example differs from its exact architecture overlay")
    is_video = entry.validation_profile == "video-lora"
    expected_profile = _ARCH_PROFILE.get(entry.architecture)
    if expected_profile is not None and entry.validation_profile != expected_profile:
        raise ExampleError("architecture and validation profile disagree")
    if expected_profile is None and entry.validation_profile in {"image-edit-lora", "video-lora"}:
        raise ExampleError("architecture and validation profile disagree")
    frames = 41 if is_video else 1
    fps = 16 if is_video else 1
    if dataset.get("num_frames") != frames or dataset.get("fps") != fps or sample.get("num_frames") != frames or sample.get("fps") != fps:
        raise ExampleError("dataset/sample frames and FPS disagree with profile")
    if is_video and sample.get("format") != "webp":
        raise ExampleError("video samples must use an animated image format")
    train = process.get("train", {})
    required_train = {
        "batch_size": 1, "gradient_accumulation": 1, "train_unet": True,
        "train_text_encoder": False, "gradient_checkpointing": True,
        "optimizer": "adamw8bit", "lr_scheduler": "constant", "dtype": "bf16",
        "loss_type": "mse",
    }
    if any(train.get(key) != value for key, value in required_train.items()):
        raise ExampleError("training configuration differs from the required baseline")
    if (train.get("content_or_style"), train.get("timestep_type")) != _CONTENT_TIMESTEP[entry.path]:
        raise ExampleError("content/timestep overlay is invalid")
    if train.get("cache_text_embeddings") != (entry.path in _TEXT_CACHE):
        raise ExampleError("text-embedding cache overlay is invalid")
    expected_sampler = "ddpm" if entry.architecture in {"sdxl", "sd15"} else "flowmatch"
    if sample.get("sampler") != expected_sampler or train.get("noise_scheduler") != expected_sampler:
        raise ExampleError("sample/training scheduler discriminators are incompatible")
    if entry.path in _QFLOAT8:
        if any(model.get(key) != value for key, value in {
            "quantize": True, "qtype": "qfloat8", "quantize_te": True,
            "qtype_te": "qfloat8",
        }.items()):
            raise ExampleError("qfloat8 rows require explicit model and TE quantization")
    elif entry.path == "diagnostic-wan21-1b.yaml":
        if model.get("quantize") is not False or model.get("quantize_te") is not True or model.get("qtype_te") != "qfloat8":
            raise ExampleError("diagnostic Wan quantization overlay is invalid")
    elif model.get("quantize") is not False or model.get("quantize_te") is not False:
        raise ExampleError("non-quantized example has an invalid quantization overlay")
    low_vram_rows = {
        "object-qwen-image.yaml", "focused-refinement-qwen-image-edit-2509.yaml",
        "low-vram-anima.yaml", "motion-wan22-14b-t2v.yaml",
    }
    if model.get("low_vram", False) != (entry.path in low_vram_rows):
        raise ExampleError("low-VRAM overlay is invalid")
    if entry.architecture in {"sdxl", "sd15"} and (
        network.get("conv"), network.get("conv_alpha")
    ) != (16, 16):
        raise ExampleError("Stable Diffusion examples require conv rank/alpha 16")
    if entry.path == "first-lora-flex1.yaml" and model.get("quantize_kwargs") != {"exclude": ["*time_text_embed*"]}:
        raise ExampleError("Flex quantization exclusion is invalid")
    if entry.path == "focused-refinement-qwen-image-edit-2509.yaml" and model.get("model_kwargs") != {"match_target_res": False}:
        raise ExampleError("Qwen Edit model kwargs are invalid")
    if entry.path == "motion-wan22-14b-t2v.yaml" and (
        model.get("model_kwargs") != {"train_high_noise": True, "train_low_noise": True}
        or train.get("switch_boundary_every") != 10
    ):
        raise ExampleError("Wan 2.2 stage overlay is invalid")
    if train.get("bypass_guidance_embedding", False) != (
        entry.path in {"first-lora-flex1.yaml", "resume-from-checkpoint.yaml"}
    ):
        raise ExampleError("guidance-bypass overlay is invalid")
    save = process.get("save", {})
    expected_keep = 1 if entry.path == "diagnostic-wan21-1b.yaml" else 4
    if any(save.get(key) != value for key, value in {
        "dtype": "bf16", "save_format": "diffusers", "save_every": 250,
        "max_step_saves_to_keep": expected_keep, "push_to_hub": False,
    }.items()):
        raise ExampleError("save configuration differs from the required baseline")
    logging = process.get("logging", {})
    if logging.get("use_ui_logger") is not True or logging.get("use_wandb") is not False:
        raise ExampleError("logging must be local-only")
    if any(sample.get(key) != value for key, value in {
        "sample_every": 250, "sample_start_step": 0, "seed": 42,
        "walk_seed": False,
    }.items()):
        raise ExampleError("sample configuration differs from the required baseline")
    has_control = entry.validation_profile == "image-edit-lora"
    if has_control != ("control_path" in dataset):
        raise ExampleError("control dataset disagrees with profile")
    if has_control:
        control = Path(dataset["control_path"])
        ctrl_img = Path(samples[0].get("ctrl_img", ""))
        if not control.is_dir() or not ctrl_img.is_file() or control == ctrl_img or ctrl_img.suffix != ".png":
            raise ExampleError("control directory/sample image roles are invalid")
        target_mode, target_size = _decode_image(
            control / "example.png", "matched control fixture"
        )
        sample_control_mode, _ = _decode_image(ctrl_img, "sample control fixture")
        if target_mode != "RGB" or sample_control_mode != "RGB":
            raise ExampleError("source and control images must be RGB")
        if source_size != target_size:
            raise ExampleError("control image dimensions must match")
    has_mask = entry.validation_profile == "masked-image-lora"
    if has_mask != ("mask_path" in dataset):
        raise ExampleError("mask dataset disagrees with profile")
    if has_mask:
        mask_path = Path(dataset["mask_path"])
        if not mask_path.is_dir():
            raise ExampleError("mask_path must be a directory")
        mask_mode, mask_size = _decode_image(
            mask_path / "example.png", "matched mask fixture"
        )
        if mask_mode != "L" or mask_size != source_size:
            raise ExampleError("mask must be matched grayscale")
        if (dataset.get("mask_min_value"), dataset.get("invert_mask"),
            train.get("train_turbo"), train.get("inverted_mask_prior"),
            train.get("inverted_mask_prior_multiplier")) != (0.1, False, False, True, 0.5):
            raise ExampleError("mask training requires non-Turbo inverted-mask prior")
    if entry.validation_profile == "resume-image-lora":
        checkpoint = process["network"].get("pretrained_lora_path", "")
        if process["train"].get("start_step") != 250 or not Path(checkpoint).is_file():
            raise ExampleError("resume example has invalid checkpoint/start step")
        _validate_resume_safetensors(
            Path(checkpoint), expected_job_name=body["name"],
            expected_start_step=process["train"]["start_step"],
        )
        expected = Path(process["training_folder"]) / body["name"] / "optimizer.pt"
        if not expected.is_file():
            raise ExampleError("resume optimizer discovery identity is invalid")


def configured_learning_rates_after_restore(
    configured: tuple[float, ...], restored: tuple[Mapping[str, Any], ...]
) -> tuple[dict[str, Any], ...]:
    """Pure model of the resume rule: configured rates win after state loading."""
    if len(configured) != len(restored):
        raise ExampleError("restored optimizer group count changed")
    return tuple({**group, "lr": rate, "initial_lr": rate}
                 for rate, group in zip(configured, restored, strict=True))


def _attribute(node: ast.AST, owner: str, attribute: str) -> bool:
    return (isinstance(node, ast.Attribute) and node.attr == attribute
            and isinstance(node.value, ast.Name) and node.value.id == owner)


def _string_subscript(node: ast.AST, owner: str, key: str) -> bool:
    return (isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name)
            and node.value.id == owner and isinstance(node.slice, ast.Constant)
            and node.slice.value == key)


def _indexed_value(node: ast.AST, owner: str, index: str) -> bool:
    return (isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name)
            and node.value.id == owner and isinstance(node.slice, ast.Name)
            and node.slice.id == index)


def _optimizer_group_loop(node: ast.For) -> str | None:
    if (isinstance(node.target, ast.Name)
            and _attribute(node.iter, "optimizer", "param_groups")):
        return node.target.id
    return None


def _capture_candidate(node: ast.For) -> tuple[str, int] | None:
    group = _optimizer_group_loop(node)
    if group is None:
        return None
    if len(node.body) == 1 and isinstance(node.body[0], ast.Expr):
        call = node.body[0].value
        if (isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
                and call.func.attr == "append" and isinstance(call.func.value, ast.Name)
                and len(call.args) == 1 and not call.keywords
                and _string_subscript(call.args[0], group, "lr")):
            return call.func.value.id, node.body[0].lineno
    return None


def _load_and_restore_call(block: list[ast.stmt]) -> tuple[str, int, int] | None:
    for index, statement in enumerate(block[:-1]):
        if (not isinstance(statement, ast.Assign) or len(statement.targets) != 1
                or not isinstance(statement.targets[0], ast.Name)
                or not isinstance(statement.value, ast.Call)):
            continue
        call = statement.value
        if (not _attribute(call.func, "torch", "load") or len(call.args) != 1
                or not isinstance(call.args[0], ast.Name)
                or call.args[0].id != "optimizer_state_file_path"
                or len(call.keywords) != 1 or call.keywords[0].arg != "weights_only"
                or not isinstance(call.keywords[0].value, ast.Constant)
                or call.keywords[0].value.value is not True):
            continue
        result_name = statement.targets[0].id
        following = block[index + 1]
        if not isinstance(following, ast.Expr) or not isinstance(following.value, ast.Call):
            continue
        restore = following.value
        if (_attribute(restore.func, "optimizer", "load_state_dict")
                and len(restore.args) == 1 and isinstance(restore.args[0], ast.Name)
                and restore.args[0].id == result_name and not restore.keywords):
            return result_name, statement.lineno, following.lineno
    return None


def _lr_restore_candidate(node: ast.For, captured: str) -> tuple[int, int] | None:
    if (not isinstance(node.target, (ast.Tuple, ast.List)) or len(node.target.elts) != 2
            or not all(isinstance(item, ast.Name) for item in node.target.elts)
            or not isinstance(node.iter, ast.Call) or not isinstance(node.iter.func, ast.Name)
            or node.iter.func.id != "enumerate" or len(node.iter.args) != 1
            or node.iter.keywords or not _attribute(node.iter.args[0], "optimizer", "param_groups")):
        return None
    index_name = node.target.elts[0].id
    group_name = node.target.elts[1].id
    assignments: dict[str, int] = {}
    for statement in node.body:
        if (isinstance(statement, ast.Assign) and len(statement.targets) == 1
                and isinstance(statement.targets[0], ast.Subscript)
                and _indexed_value(statement.value, captured, index_name)):
            target = statement.targets[0]
            for key in ("lr", "initial_lr"):
                if _string_subscript(target, group_name, key):
                    assignments[key] = statement.lineno
    if set(assignments) == {"lr", "initial_lr"} and assignments["lr"] < assignments["initial_lr"]:
        return assignments["lr"], assignments["initial_lr"]
    return None


def _optimizer_state_exists_test(node: ast.AST) -> bool:
    return (isinstance(node, ast.Call) and len(node.args) == 1 and not node.keywords
            and isinstance(node.func, ast.Attribute) and node.func.attr == "exists"
            and isinstance(node.func.value, ast.Attribute) and node.func.value.attr == "path"
            and isinstance(node.func.value.value, ast.Name) and node.func.value.value.id == "os"
            and isinstance(node.args[0], ast.Name)
            and node.args[0].id == "optimizer_state_file_path")


def _has_captured_rates_test(node: ast.AST, captured: str) -> bool:
    return (isinstance(node, ast.Compare) and len(node.ops) == 1
            and isinstance(node.ops[0], ast.Gt) and len(node.comparators) == 1
            and isinstance(node.comparators[0], ast.Constant)
            and node.comparators[0].value == 0 and isinstance(node.left, ast.Call)
            and isinstance(node.left.func, ast.Name) and node.left.func.id == "len"
            and len(node.left.args) == 1 and not node.left.keywords
            and isinstance(node.left.args[0], ast.Name)
            and node.left.args[0].id == captured)


def _self_attribute_chain(node: ast.AST, *attributes: str) -> bool:
    current = node
    for attribute in reversed(attributes):
        if not isinstance(current, ast.Attribute) or current.attr != attribute:
            return False
        current = current.value
    return isinstance(current, ast.Name) and current.id == "self"


def _literal_string(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr) and all(
        isinstance(value, ast.Constant) and isinstance(value.value, str)
        for value in node.values
    ):
        return "".join(value.value for value in node.values)
    return None


def _assigned_name(statement: ast.stmt, name: str) -> ast.AST | None:
    if (isinstance(statement, ast.Assign) and len(statement.targets) == 1
            and isinstance(statement.targets[0], ast.Name)
            and statement.targets[0].id == name):
        return statement.value
    return None


def _optimizer_creation(statement: ast.stmt) -> bool:
    value = _assigned_name(statement, "optimizer")
    if not isinstance(value, ast.Call) or not isinstance(value.func, ast.Name):
        return False
    if value.func.id != "get_optimizer":
        return False
    learning_rates = [keyword.value for keyword in value.keywords
                      if keyword.arg == "learning_rate"]
    return len(learning_rates) == 1 and _self_attribute_chain(
        learning_rates[0], "train_config", "lr"
    )


def _state_filename_assignment(statement: ast.stmt) -> bool:
    value = _assigned_name(statement, "optimizer_state_filename")
    return value is not None and _literal_string(value) == "optimizer.pt"


def _state_path_assignment(statement: ast.stmt) -> bool:
    value = _assigned_name(statement, "optimizer_state_file_path")
    return (isinstance(value, ast.Call) and not value.keywords
            and isinstance(value.func, ast.Attribute) and value.func.attr == "join"
            and isinstance(value.func.value, ast.Attribute)
            and value.func.value.attr == "path"
            and isinstance(value.func.value.value, ast.Name)
            and value.func.value.value.id == "os" and len(value.args) == 2
            and _self_attribute_chain(value.args[0], "save_root")
            and isinstance(value.args[1], ast.Name)
            and value.args[1].id == "optimizer_state_filename")


def _contains_terminal(node: ast.AST) -> bool:
    for child in ast.walk(node):
        if child is node:
            continue
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
            continue
        if isinstance(child, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
            return True
    return False


def _name_store_count(node: ast.AST, name: str) -> int:
    return sum(
        isinstance(child, ast.Name) and child.id == name
        and isinstance(child.ctx, (ast.Store, ast.Del))
        for child in ast.walk(node)
    )


def _captured_list_calls(node: ast.AST, captured: str) -> list[ast.Call]:
    return [
        child for child in ast.walk(node)
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute)
        and isinstance(child.func.value, ast.Name)
        and child.func.value.id == captured
    ]


def _direct_load_restore(guard: ast.If) -> tuple[int, int] | None:
    if guard.orelse or not isinstance(guard.test, ast.Name) or guard.test.id != "load_optimizer":
        return None
    tries = [statement for statement in guard.body if isinstance(statement, ast.Try)]
    if len(tries) != 1 or tries[0].orelse or tries[0].finalbody:
        return None
    return _load_and_restore_call(tries[0].body)


def _direct_lr_restore(guard: ast.If, captured: str) -> tuple[int, int] | None:
    if guard.orelse or not _has_captured_rates_test(guard.test, captured):
        return None
    loops = [statement for statement in guard.body if isinstance(statement, ast.For)]
    if len(loops) != 1 or loops[0].orelse:
        return None
    return _lr_restore_candidate(loops[0], captured)


def _validate_resume_source_contract(repository_root: Path) -> None:
    path = repository_root / "jobs/process/BaseSDTrainProcess.py"
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except (OSError, UnicodeDecodeError, SyntaxError) as error:
        raise ExampleError(f"cannot inspect optimizer resume source: {error}") from error
    classes = [node for node in tree.body
               if isinstance(node, ast.ClassDef) and node.name == "BaseSDTrainProcess"]
    methods = ([node for node in classes[0].body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "run"]
               if len(classes) == 1 else [])
    if len(methods) != 1:
        raise ExampleError("optimizer resume source no longer preserves configured learning rates")
    valid = False
    statements = methods[0].body
    optimizer_indices = [index for index, statement in enumerate(statements)
                         if _optimizer_creation(statement)]
    filename_indices = [index for index, statement in enumerate(statements)
                        if _state_filename_assignment(statement)]
    path_indices = [index for index, statement in enumerate(statements)
                    if _state_path_assignment(statement)]
    outer_indices = [index for index, statement in enumerate(statements)
                     if isinstance(statement, ast.If)
                     and _optimizer_state_exists_test(statement.test)]
    for optimizer_index in optimizer_indices:
        for filename_index in filename_indices:
            for path_index in path_indices:
                for outer_index in outer_indices:
                    if not optimizer_index < filename_index < path_index < outer_index:
                        continue
                    if any(isinstance(statement, (ast.Return, ast.Raise))
                           for statement in statements[optimizer_index + 1:outer_index]):
                        continue
                    outer = statements[outer_index]
                    assert isinstance(outer, ast.If)
                    if outer.orelse or _contains_terminal(outer):
                        continue
                    initializers = [
                        (index, statement.targets[0].id)
                        for index, statement in enumerate(outer.body)
                        if (isinstance(statement, ast.Assign)
                            and len(statement.targets) == 1
                            and isinstance(statement.targets[0], ast.Name)
                            and isinstance(statement.value, ast.List)
                            and not statement.value.elts)
                    ]
                    captures = [
                        (index, candidate)
                        for index, statement in enumerate(outer.body)
                        if isinstance(statement, ast.For)
                        if (candidate := _capture_candidate(statement)) is not None
                    ]
                    load_guards = [
                        (index, candidate)
                        for index, statement in enumerate(outer.body)
                        if isinstance(statement, ast.If)
                        if (candidate := _direct_load_restore(statement)) is not None
                    ]
                    for init_index, captured in initializers:
                        for capture_index, (capture_name, capture_line) in captures:
                            if capture_name != captured or init_index >= capture_index:
                                continue
                            restore_guards = [
                                (index, candidate)
                                for index, statement in enumerate(outer.body)
                                if isinstance(statement, ast.If)
                                if (candidate := _direct_lr_restore(statement, captured))
                                is not None
                            ]
                            for load_index, (_, load_line, load_state_line) in load_guards:
                                for restore_index, (lr_line, initial_lr_line) in restore_guards:
                                    if not capture_index < load_index < restore_index:
                                        continue
                                    if _name_store_count(outer, "optimizer") != 0:
                                        continue
                                    if _name_store_count(outer, captured) != 1:
                                        continue
                                    captured_calls = _captured_list_calls(outer, captured)
                                    if len(captured_calls) != 1 or captured_calls[0].func.attr != "append":
                                        continue
                                    if not capture_line < load_line < load_state_line < lr_line < initial_lr_line:
                                        continue
                                    valid = True
    if not valid:
        raise ExampleError("optimizer resume source no longer preserves configured learning rates")
    result = configured_learning_rates_after_restore((1e-4,), ({"lr": 9e-3},))
    if result[0]["lr"] != 1e-4 or result[0]["initial_lr"] != 1e-4:
        raise ExampleError("optimizer resume learning-rate helper is invalid")


def validate_example(repository_root: Path, entry: ExampleEntry, catalog: Any) -> None:
    example_path = repository_root / "docs/book/examples" / entry.path
    raw = _load_example_yaml(example_path)
    if not isinstance(raw, dict):
        raise ExampleError("example YAML root must be an object")
    with tempfile.TemporaryDirectory(prefix="training-book-example-") as directory:
        fixture_root = Path(directory)
        _make_fixtures(fixture_root)
        config = substitute_typed_tokens(raw, entry.tokens, fixture_root)
        _validate_exact_shape(config, entry)
        _validate_owned_keys(config, catalog)
        _validate_semantics(config, entry, fixture_root)
        if entry.validation_profile == "resume-image-lora":
            _validate_resume_source_contract(repository_root)
        # Exercise only the pure configuration boundary; no trainer/model/optimizer imports.
        from toolkit.config import preprocess_config
        from toolkit.config_modules import (DatasetConfig, LoggingConfig, ModelConfig,
            NetworkConfig, SampleConfig, SaveConfig, TrainConfig, preprocess_dataset_raw_config,
            validate_configs)
        processed = preprocess_config(OrderedDict(config))
        process = processed["config"]["process"][0]
        network = NetworkConfig(**process["network"])
        train = TrainConfig(**process["train"])
        model = ModelConfig(**process["model"])
        save = SaveConfig(**process["save"])
        sample = SampleConfig(**process["sample"])
        logging = LoggingConfig(**process["logging"])
        datasets = [DatasetConfig(**item) for item in preprocess_dataset_raw_config(process["datasets"])]
        validate_configs(train, model, save, datasets)
        # Keep constructor results live so accidental API removal is detected.
        if not all((network, sample, logging)):
            raise ExampleError("configuration constructors returned invalid values")


def validate_examples(repository_root: Path, manifest: ExampleManifest, catalog: Any, book_manifest: Any) -> None:
    chapters = {page.path for page in book_manifest.pages}
    architectures = set(book_manifest.full_architectures)
    directory = repository_root / "docs/book/examples"
    expected = {"README.md", "manifest.json", *(entry.path for entry in manifest.examples)}
    actual = {path.name for path in directory.iterdir()}
    if actual != expected:
        raise ExampleError(f"example file set differs: expected {sorted(expected)}, got {sorted(actual)}")
    for entry in manifest.examples:
        if entry.architecture not in architectures:
            raise ExampleError(f"unknown architecture: {entry.architecture}")
        unknown = set(entry.chapters) - chapters
        if unknown:
            raise ExampleError(f"unknown chapters: {sorted(unknown)}")
        validate_example(repository_root, entry, catalog)
