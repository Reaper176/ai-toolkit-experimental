"""Pure helpers for loading Anima checkpoints stored in one safetensors file."""

import os
import re


ANIMA_BASE_REPO = "circlestone-labs/Anima-Base-v1.0-Diffusers"
ANIMA_CONDITIONER_PREFIX = "net.llm_adapter."

_RESIDUAL_COMPONENTS = {"0": "norm1", "2": "conv1", "3": "norm2", "6": "conv2"}
_DECODER_UPSAMPLE_BLOCKS = {
    0: (0, 0),
    1: (0, 1),
    2: (0, 2),
    4: (1, 0),
    5: (1, 1),
    6: (1, 2),
    8: (2, 0),
    9: (2, 1),
    10: (2, 2),
    12: (3, 0),
    13: (3, 1),
    14: (3, 2),
}
_DECODER_UPSAMPLERS = {3: 0, 7: 1, 11: 2}


def select_anima_loading_mode(name_or_path):
    """Return the loader mode without attempting to load model data."""
    candidate = os.path.abspath(os.path.expanduser(str(name_or_path)))
    if candidate.lower().endswith(".safetensors"):
        return "single_file"
    if os.path.isfile(candidate):
        raise ValueError("Anima model checkpoint files must use the .safetensors extension")
    return "pipeline"


def validate_local_safetensors(value, component):
    """Validate and normalize a local component checkpoint path."""
    if value is None or not str(value).strip():
        raise ValueError(f"{component} checkpoint path must not be blank")
    path = os.path.abspath(os.path.expanduser(str(value)))
    if not os.path.exists(path):
        raise FileNotFoundError(f"{component} checkpoint is missing: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"{component} checkpoint must be a file: {path}")
    if not path.lower().endswith(".safetensors"):
        raise ValueError(f"{component} checkpoint must use the .safetensors extension: {path}")
    return path


def split_anima_checkpoint_state_dict(state_dict):
    """Split a Comfy Anima checkpoint into transformer and conditioner weights."""
    transformer = {
        key: value
        for key, value in state_dict.items()
        if key.startswith("net.") and not key.startswith(ANIMA_CONDITIONER_PREFIX)
    }
    conditioner = {
        key.removeprefix(ANIMA_CONDITIONER_PREFIX): value
        for key, value in state_dict.items()
        if key.startswith(ANIMA_CONDITIONER_PREFIX)
    }
    if not transformer:
        raise ValueError("Anima checkpoint contains no transformer weights under net.")
    if not conditioner:
        raise ValueError("Anima checkpoint contains no conditioner weights under net.llm_adapter.")
    return transformer, conditioner


def normalize_qwen3_state_dict(state_dict):
    """Remove the optional Qwen ``model.`` prefix, rejecting key collisions."""
    normalized = {}
    for key, value in state_dict.items():
        normalized_key = key.removeprefix("model.")
        if normalized_key in normalized:
            raise ValueError(f"Qwen3 state dict has duplicate normalized key: {normalized_key}")
        normalized[normalized_key] = value
    return normalized


def _map_residual_key(prefix, residual_index, suffix):
    component = _RESIDUAL_COMPONENTS.get(residual_index)
    if component is None:
        return None
    return f"{prefix}.{component}.{suffix}"


def _normalize_qwen_image_vae_key(key):
    """Map one Comfy Qwen Image VAE key to its Diffusers equivalent."""
    direct = {
        "conv1.weight": "quant_conv.weight",
        "conv1.bias": "quant_conv.bias",
        "conv2.weight": "post_quant_conv.weight",
        "conv2.bias": "post_quant_conv.bias",
        "encoder.conv1.weight": "encoder.conv_in.weight",
        "encoder.conv1.bias": "encoder.conv_in.bias",
        "decoder.conv1.weight": "decoder.conv_in.weight",
        "decoder.conv1.bias": "decoder.conv_in.bias",
    }
    if key in direct:
        return direct[key]

    match = re.fullmatch(r"(encoder|decoder)\.head\.0\.(gamma|weight|bias)", key)
    if match:
        return f"{match.group(1)}.norm_out.{match.group(2)}"
    match = re.fullmatch(r"(encoder|decoder)\.head\.2\.(weight|bias)", key)
    if match:
        return f"{match.group(1)}.conv_out.{match.group(2)}"

    match = re.fullmatch(r"(encoder|decoder)\.middle\.(0|2)\.residual\.(\d+)\.(.+)", key)
    if match:
        block, middle_index, residual_index, suffix = match.groups()
        mapped = _map_residual_key(f"{block}.mid_block.resnets.{int(middle_index) // 2}", residual_index, suffix)
        return mapped or key
    match = re.fullmatch(r"(encoder|decoder)\.middle\.1\.(.+)", key)
    if match:
        return f"{match.group(1)}.mid_block.attentions.0.{match.group(2)}"

    match = re.fullmatch(r"encoder\.downsamples\.(\d+)\.residual\.(\d+)\.(.+)", key)
    if match:
        block_index, residual_index, suffix = match.groups()
        mapped = _map_residual_key(f"encoder.down_blocks.{block_index}", residual_index, suffix)
        return mapped or key
    match = re.fullmatch(r"encoder\.downsamples\.(\d+)\.shortcut\.(.+)", key)
    if match:
        return f"encoder.down_blocks.{match.group(1)}.conv_shortcut.{match.group(2)}"
    match = re.fullmatch(r"encoder\.downsamples\.(\d+)\.(resample|time_conv)\.(.+)", key)
    if match:
        return f"encoder.down_blocks.{match.group(1)}.{match.group(2)}.{match.group(3)}"

    match = re.fullmatch(r"decoder\.upsamples\.(\d+)\.residual\.(\d+)\.(.+)", key)
    if match:
        upsample_index, residual_index, suffix = match.groups()
        group = _DECODER_UPSAMPLE_BLOCKS.get(int(upsample_index))
        if group is None:
            return key
        mapped = _map_residual_key(f"decoder.up_blocks.{group[0]}.resnets.{group[1]}", residual_index, suffix)
        return mapped or key
    match = re.fullmatch(r"decoder\.upsamples\.(\d+)\.shortcut\.(.+)", key)
    if match:
        upsample_index, suffix = match.groups()
        group = _DECODER_UPSAMPLE_BLOCKS.get(int(upsample_index))
        if group is None:
            return key
        return f"decoder.up_blocks.{group[0]}.resnets.{group[1]}.conv_shortcut.{suffix}"
    match = re.fullmatch(r"decoder\.upsamples\.(\d+)\.(resample|time_conv)\.(.+)", key)
    if match:
        upsample_index, component, suffix = match.groups()
        group = _DECODER_UPSAMPLERS.get(int(upsample_index))
        if group is None:
            return key
        return f"decoder.up_blocks.{group}.upsamplers.0.{component}.{suffix}"
    return key


def normalize_qwen_image_vae_state_dict(state_dict):
    """Return a deterministic copy with Comfy Qwen Image VAE keys normalized."""
    normalized = {}
    for key, value in state_dict.items():
        normalized_key = _normalize_qwen_image_vae_key(key)
        if normalized_key in normalized:
            raise ValueError(f"Qwen Image VAE state dict has duplicate normalized key: {normalized_key}")
        normalized[normalized_key] = value
    return normalized
