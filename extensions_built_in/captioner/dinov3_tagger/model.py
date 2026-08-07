"""Fixed DINOv3 ViT-H/16+ architecture and strict local checkpoint loader."""

from __future__ import annotations

from functools import lru_cache
import math
from pathlib import Path
from typing import Mapping, MutableMapping

from accelerate import init_empty_weights
from PIL import Image
from safetensors.torch import load_file
import torch
from torch import nn
import torch.nn.functional as F
from torchvision.transforms import v2


D_MODEL = 1280
N_HEADS = 20
HEAD_DIM = 64
N_LAYERS = 32
D_FFN = 5120
N_REGISTERS = 4
PATCH_SIZE = 16
ROPE_THETA = 100.0
ROPE_RESCALE = 2.0
LN_EPS = 1e-5
FEATURE_DIM = 6400

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

_KNOWN_ROPE_BUFFER_PATHS = frozenset(
    {"rope_embeddings.buffer", "rope_embeddings.inv_freq"}
)


@lru_cache(maxsize=32)
def patch_coordinates(height: int, width: int, device_string: str) -> torch.Tensor:
    """Return normalized two-dimensional coordinates for a patch grid."""
    if height <= 0 or width <= 0:
        raise ValueError("DINOv3 patch-grid dimensions must be positive")
    device = torch.device(device_string)
    y = torch.arange(0.5, height, dtype=torch.float32, device=device) / height
    x = torch.arange(0.5, width, dtype=torch.float32, device=device) / width
    coordinates = torch.stack(
        torch.meshgrid(y, x, indexing="ij"), dim=-1
    ).flatten(0, 1)
    return (2.0 * coordinates - 1.0) * ROPE_RESCALE


def build_rope(
    height: int,
    width: int,
    dtype: torch.dtype,
    device: torch.device,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Build the reference model's two-dimensional rotary embedding."""
    coordinates = patch_coordinates(height, width, str(device))
    inverse_frequency = 1.0 / (
        ROPE_THETA
        ** torch.arange(
            0,
            1,
            4 / HEAD_DIM,
            dtype=torch.float32,
            device=device,
        )
    )
    angles = (
        2
        * math.pi
        * coordinates[:, :, None]
        * inverse_frequency[None, None, :]
    )
    angles = angles.flatten(1, 2).tile(2)
    return (
        torch.cos(angles).to(dtype).unsqueeze(0).unsqueeze(0),
        torch.sin(angles).to(dtype).unsqueeze(0).unsqueeze(0),
    )


def rotate_half(tensor: torch.Tensor) -> torch.Tensor:
    half = tensor.shape[-1] // 2
    return torch.cat((-tensor[..., half:], tensor[..., :half]), dim=-1)


def apply_rope(
    query: torch.Tensor,
    key: torch.Tensor,
    cos: torch.Tensor,
    sin: torch.Tensor,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Apply RoPE to patch tokens while preserving CLS and register tokens."""
    prefix = 1 + N_REGISTERS
    query_prefix, query_patches = query[..., :prefix, :], query[..., prefix:, :]
    key_prefix, key_patches = key[..., :prefix, :], key[..., prefix:, :]
    query_patches = query_patches * cos + rotate_half(query_patches) * sin
    key_patches = key_patches * cos + rotate_half(key_patches) * sin
    return (
        torch.cat((query_prefix, query_patches), dim=-2),
        torch.cat((key_prefix, key_patches), dim=-2),
    )


class DINOv3Attention(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.q_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)
        self.k_proj = nn.Linear(D_MODEL, D_MODEL, bias=False)
        self.v_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)
        self.o_proj = nn.Linear(D_MODEL, D_MODEL, bias=True)

    def forward(
        self,
        hidden_states: torch.Tensor,
        cos: torch.Tensor,
        sin: torch.Tensor,
    ) -> torch.Tensor:
        batch, sequence, _ = hidden_states.shape
        query = self.q_proj(hidden_states).view(
            batch, sequence, N_HEADS, HEAD_DIM
        ).transpose(1, 2)
        key = self.k_proj(hidden_states).view(
            batch, sequence, N_HEADS, HEAD_DIM
        ).transpose(1, 2)
        value = self.v_proj(hidden_states).view(
            batch, sequence, N_HEADS, HEAD_DIM
        ).transpose(1, 2)
        query, key = apply_rope(query, key, cos, sin)
        result = F.scaled_dot_product_attention(
            query, key, value, scale=HEAD_DIM**-0.5
        )
        return self.o_proj(
            result.transpose(1, 2).reshape(batch, sequence, D_MODEL)
        )


class DINOv3MLP(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.gate_proj = nn.Linear(D_MODEL, D_FFN, bias=True)
        self.up_proj = nn.Linear(D_MODEL, D_FFN, bias=True)
        self.down_proj = nn.Linear(D_FFN, D_MODEL, bias=True)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        return self.down_proj(
            F.silu(self.gate_proj(hidden_states)) * self.up_proj(hidden_states)
        )


class DINOv3Block(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(D_MODEL, eps=LN_EPS)
        self.attention = DINOv3Attention()
        self.layer_scale1 = nn.Parameter(torch.ones(D_MODEL))
        self.norm2 = nn.LayerNorm(D_MODEL, eps=LN_EPS)
        self.mlp = DINOv3MLP()
        self.layer_scale2 = nn.Parameter(torch.ones(D_MODEL))

    def forward(
        self,
        hidden_states: torch.Tensor,
        cos: torch.Tensor,
        sin: torch.Tensor,
    ) -> torch.Tensor:
        hidden_states = hidden_states + self.attention(
            self.norm1(hidden_states), cos, sin
        ) * self.layer_scale1
        return hidden_states + self.mlp(self.norm2(hidden_states)) * self.layer_scale2


class DINOv3Embeddings(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.cls_token = nn.Parameter(torch.zeros(1, 1, D_MODEL))
        self.mask_token = nn.Parameter(torch.zeros(1, 1, D_MODEL))
        self.register_tokens = nn.Parameter(torch.zeros(1, N_REGISTERS, D_MODEL))
        self.patch_embeddings = nn.Conv2d(
            3,
            D_MODEL,
            kernel_size=PATCH_SIZE,
            stride=PATCH_SIZE,
        )

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        batch = pixel_values.shape[0]
        dtype = self.patch_embeddings.weight.dtype
        patches = self.patch_embeddings(pixel_values.to(dtype)).flatten(2).transpose(1, 2)
        cls = self.cls_token.expand(batch, -1, -1)
        registers = self.register_tokens.expand(batch, -1, -1)
        return torch.cat((cls, registers, patches), dim=1)


class DINOv3Backbone(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.embeddings = DINOv3Embeddings()
        self.layer = nn.ModuleList(DINOv3Block() for _ in range(N_LAYERS))
        self.norm = nn.LayerNorm(D_MODEL, eps=LN_EPS)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        height_patches = pixel_values.shape[-2] // PATCH_SIZE
        width_patches = pixel_values.shape[-1] // PATCH_SIZE
        hidden_states = self.embeddings(pixel_values)
        cos, sin = build_rope(
            height_patches,
            width_patches,
            hidden_states.dtype,
            pixel_values.device,
        )
        for block in self.layer:
            hidden_states = block(hidden_states, cos, sin)
        return self.norm(hidden_states)


class DINOv3TaggerModel(nn.Module):
    def __init__(self, head: nn.Module) -> None:
        super().__init__()
        self.backbone = DINOv3Backbone()
        self.head = head

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        hidden_states = self.backbone(pixel_values)
        cls = hidden_states[:, 0]
        registers = hidden_states[:, 1 : 1 + N_REGISTERS].flatten(1)
        features = torch.cat((cls, registers), dim=-1).float()
        return self.head(features)


class LowRankHead(nn.Module):
    def __init__(
        self,
        rank: int,
        vocab_size: int,
        down_bias: bool,
        up_bias: bool,
    ) -> None:
        super().__init__()
        self.proj_down = nn.Linear(FEATURE_DIM, rank, bias=down_bias)
        self.proj_up = nn.Linear(rank, vocab_size, bias=up_bias)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.proj_up(self.proj_down(features))


def split_checkpoint_state_dict(
    state_dict: Mapping[str, torch.Tensor],
    checkpoint_path: str,
) -> tuple[dict[str, torch.Tensor], dict[str, torch.Tensor]]:
    """Split and normalize the exact supported checkpoint key layouts."""
    backbone: dict[str, torch.Tensor] = {}
    head: dict[str, torch.Tensor] = {}
    for key, value in state_dict.items():
        if not key.startswith("backbone."):
            if key in head:
                raise ValueError(
                    f"Duplicate DINOv3 projection key in {checkpoint_path}: {key}"
                )
            head[key] = value
            continue

        normalized = key.removeprefix("backbone.")
        if normalized.startswith("model.layer."):
            normalized = normalized.removeprefix("model.")
        if normalized.endswith(".lambda1") and ".layer_scale" in normalized:
            normalized = normalized.removesuffix(".lambda1")
        if normalized in _KNOWN_ROPE_BUFFER_PATHS:
            continue
        if normalized in backbone:
            raise ValueError(
                f"Duplicate normalized DINOv3 backbone key in "
                f"{checkpoint_path}: {normalized}"
            )
        backbone[normalized] = value

    if not backbone:
        raise ValueError(
            f"DINOv3 backbone weights are missing from checkpoint {checkpoint_path}"
        )
    if not head:
        raise ValueError(
            f"DINOv3 projection-head weights are missing from checkpoint "
            f"{checkpoint_path}"
        )
    return backbone, head


def _validate_head_tensor(
    key: str,
    value: object,
    checkpoint_path: str,
) -> torch.Tensor:
    if not isinstance(value, torch.Tensor):
        raise ValueError(
            f"DINOv3 checkpoint {checkpoint_path} projection value {key} is not a tensor"
        )
    if not value.is_floating_point():
        raise ValueError(
            f"DINOv3 checkpoint {checkpoint_path} projection tensor {key} must be floating point"
        )
    return value


def _add_validated_bias(
    head_state: Mapping[str, torch.Tensor],
    source_key: str,
    expected_size: int,
    target_key: str,
    expected: set[str],
    remapped: dict[str, torch.Tensor],
    checkpoint_path: str,
) -> bool:
    if source_key not in head_state:
        return False
    bias = _validate_head_tensor(source_key, head_state[source_key], checkpoint_path)
    if tuple(bias.shape) != (expected_size,):
        raise ValueError(
            f"DINOv3 projection bias {source_key} has invalid shape "
            f"{tuple(bias.shape)} in {checkpoint_path}; expected ({expected_size},)"
        )
    expected.add(source_key)
    remapped[target_key] = bias
    return True


def build_projection_head(
    head_state: Mapping[str, torch.Tensor],
    vocab_size: int,
    checkpoint_path: str,
) -> tuple[nn.Module, dict[str, torch.Tensor]]:
    """Infer one exact dense or two-matrix low-rank classifier layout."""
    if isinstance(vocab_size, bool) or not isinstance(vocab_size, int) or vocab_size <= 0:
        raise ValueError("DINOv3 vocabulary size must be a positive integer")

    validated = {
        key: _validate_head_tensor(key, value, checkpoint_path)
        for key, value in head_state.items()
    }
    weights = [
        (key, value)
        for key, value in validated.items()
        if key.endswith(".weight") and value.ndim == 2
    ]
    dense = [
        (key, value)
        for key, value in weights
        if tuple(value.shape) == (vocab_size, FEATURE_DIM)
    ]
    if len(dense) == 1:
        weight_key, weight = dense[0]
        bias_key = weight_key.removesuffix(".weight") + ".bias"
        expected = {weight_key}
        remapped = {"weight": weight}
        has_bias = _add_validated_bias(
            validated,
            bias_key,
            vocab_size,
            "bias",
            expected,
            remapped,
            checkpoint_path,
        )
        extra = set(validated) - expected
        if extra:
            raise ValueError(
                f"DINOv3 checkpoint {checkpoint_path} has extra projection keys: "
                f"{', '.join(sorted(extra))}"
            )
        return nn.Linear(FEATURE_DIM, vocab_size, bias=has_bias), remapped

    down = [
        item
        for item in weights
        if item[1].shape[1] == FEATURE_DIM and item[1].shape[0] != vocab_size
    ]
    up = [
        item
        for item in weights
        if item[1].shape[0] == vocab_size and item[1].shape[1] != FEATURE_DIM
    ]
    if len(down) == 1 and len(up) == 1 and down[0][0] != up[0][0]:
        down_key, down_weight = down[0]
        up_key, up_weight = up[0]
        rank = down_weight.shape[0]
        if rank <= 0 or rank != up_weight.shape[1]:
            raise ValueError(
                f"DINOv3 low-rank projection dimensions disagree in {checkpoint_path}"
            )
        down_bias_key = down_key.removesuffix(".weight") + ".bias"
        up_bias_key = up_key.removesuffix(".weight") + ".bias"
        expected = {down_key, up_key}
        remapped = {
            "proj_down.weight": down_weight,
            "proj_up.weight": up_weight,
        }
        has_down_bias = _add_validated_bias(
            validated,
            down_bias_key,
            rank,
            "proj_down.bias",
            expected,
            remapped,
            checkpoint_path,
        )
        has_up_bias = _add_validated_bias(
            validated,
            up_bias_key,
            vocab_size,
            "proj_up.bias",
            expected,
            remapped,
            checkpoint_path,
        )
        extra = set(validated) - expected
        if extra:
            raise ValueError(
                f"DINOv3 checkpoint {checkpoint_path} has extra projection keys: "
                f"{', '.join(sorted(extra))}"
            )
        return (
            LowRankHead(rank, vocab_size, has_down_bias, has_up_bias),
            remapped,
        )

    feature_input_weights = [
        (key, value)
        for key, value in weights
        if value.shape[1] == FEATURE_DIM
    ]
    if len(feature_input_weights) == 1 and len(weights) == 1:
        key, value = feature_input_weights[0]
        raise ValueError(
            f"DINOv3 projection output {value.shape[0]} does not match vocabulary "
            f"size {vocab_size} in {checkpoint_path} ({key})"
        )

    shapes = ", ".join(
        f"{key}={tuple(value.shape)}" for key, value in weights
    ) or "no two-dimensional weights"
    raise ValueError(
        f"Could not infer DINOv3 projection head from {checkpoint_path}: {shapes}"
    )


def cast_backbone_state_dict(
    state_dict: MutableMapping[str, torch.Tensor],
    dtype: torch.dtype,
) -> MutableMapping[str, torch.Tensor]:
    """Cast only floating backbone tensors in place to limit peak memory."""
    for key in tuple(state_dict):
        value = state_dict[key]
        if value.is_floating_point() and value.dtype != dtype:
            state_dict[key] = value.to(dtype=dtype)
    return state_dict


def _cast_head_state_dict_fp32(
    state_dict: MutableMapping[str, torch.Tensor],
) -> MutableMapping[str, torch.Tensor]:
    for key in tuple(state_dict):
        value = state_dict[key]
        if value.is_floating_point() and value.dtype != torch.float32:
            state_dict[key] = value.to(dtype=torch.float32)
    return state_dict


def strict_assign(
    model: nn.Module,
    state_dict: Mapping[str, torch.Tensor],
    component: str,
    checkpoint_path: str,
) -> nn.Module:
    """Strictly assign a state mapping and reject unmaterialized parameters."""
    try:
        model.load_state_dict(state_dict, strict=True, assign=True)
    except RuntimeError as error:
        raise ValueError(
            f"Failed to load {component} from {checkpoint_path}: {error}"
        ) from error
    meta = [
        name for name, parameter in model.named_parameters() if parameter.is_meta
    ]
    if meta:
        raise ValueError(
            f"Failed to load {component} from {checkpoint_path}; "
            f"meta parameters remain: {', '.join(meta[:8])}"
        )
    return model


def load_tagger_model(
    checkpoint_path: str,
    vocab_size: int,
    *,
    device: torch.device,
    dtype: torch.dtype,
) -> DINOv3TaggerModel:
    """Load one local safetensors checkpoint with bounded peak CPU memory."""
    try:
        state_dict = load_file(checkpoint_path, device="cpu")
    except Exception as error:
        raise ValueError(
            f"Failed to read DINOv3 tagger checkpoint {checkpoint_path}: {error}"
        ) from error

    backbone_state, head_state = split_checkpoint_state_dict(
        state_dict, checkpoint_path
    )
    del state_dict
    with init_empty_weights():
        head, remapped_head_state = build_projection_head(
            head_state, vocab_size, checkpoint_path
        )
        model = DINOv3TaggerModel(head)
    del head_state

    cast_backbone_state_dict(backbone_state, dtype)
    _cast_head_state_dict_fp32(remapped_head_state)
    strict_assign(
        model.backbone,
        backbone_state,
        "DINOv3 backbone",
        checkpoint_path,
    )
    del backbone_state
    strict_assign(
        model.head,
        remapped_head_state,
        "DINOv3 projection head",
        checkpoint_path,
    )
    del remapped_head_state

    model.backbone.to(device=device, dtype=dtype)
    model.head.to(device=device, dtype=torch.float32)
    model.eval()
    return model


def snap_dimension(value: int) -> int:
    return max(PATCH_SIZE, (value // PATCH_SIZE) * PATCH_SIZE)


def calculate_image_size(
    width: int,
    height: int,
    max_res: int,
) -> tuple[int, int]:
    """Return a no-upscale, patch-aligned (width, height) image size."""
    if width <= 0 or height <= 0:
        raise ValueError("DINOv3 source image dimensions must be positive")
    if isinstance(max_res, bool) or not isinstance(max_res, int) or max_res < PATCH_SIZE:
        raise ValueError(
            f"DINOv3 max_res must be an integer of at least {PATCH_SIZE}"
        )
    long_edge = max(width, height)
    target_long_edge = snap_dimension(min(long_edge, max_res))
    scale = target_long_edge / long_edge
    return (
        snap_dimension(round(width * scale)),
        snap_dimension(round(height * scale)),
    )


def preprocess_image(
    source: str | Path | Image.Image,
    max_res: int,
) -> torch.Tensor:
    """Load and ImageNet-normalize an image as ``[1, 3, H, W]`` FP32."""
    if isinstance(source, Image.Image):
        image = source.convert("RGB")
    else:
        with Image.open(source) as opened:
            image = opened.convert("RGB")
    new_width, new_height = calculate_image_size(*image.size, max_res)
    transform = v2.Compose(
        [
            v2.Resize(
                (new_height, new_width),
                interpolation=v2.InterpolationMode.LANCZOS,
            ),
            v2.ToImage(),
            v2.ToDtype(torch.float32, scale=True),
            v2.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )
    return transform(image).unsqueeze(0)


__all__ = [
    "D_FFN",
    "D_MODEL",
    "FEATURE_DIM",
    "HEAD_DIM",
    "IMAGENET_MEAN",
    "IMAGENET_STD",
    "LN_EPS",
    "N_HEADS",
    "N_LAYERS",
    "N_REGISTERS",
    "PATCH_SIZE",
    "ROPE_RESCALE",
    "ROPE_THETA",
    "DINOv3Backbone",
    "DINOv3TaggerModel",
    "LowRankHead",
    "apply_rope",
    "build_projection_head",
    "build_rope",
    "calculate_image_size",
    "cast_backbone_state_dict",
    "load_tagger_model",
    "patch_coordinates",
    "preprocess_image",
    "rotate_half",
    "snap_dimension",
    "split_checkpoint_state_dict",
    "strict_assign",
]
