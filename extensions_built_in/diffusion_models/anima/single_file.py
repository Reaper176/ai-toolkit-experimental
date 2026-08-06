"""Pure helpers for loading Anima checkpoints stored in one safetensors file."""

import os
import re

import torch
from accelerate import init_empty_weights
from diffusers import (
    AnimaAutoBlocks,
    AnimaTextConditioner,
    AutoencoderKLQwenImage,
    CosmosTransformer3DModel,
)
from safetensors.torch import load_file
from transformers import Qwen3Config, Qwen3Model


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


def cast_floating_state_dict(state_dict, dtype):
    """Cast floating-point state tensors while preserving non-floating tensors."""
    return {
        key: value.to(dtype=dtype) if torch.is_floating_point(value) else value
        for key, value in state_dict.items()
    }


def load_component_state_dict(model, state_dict, component, path):
    """Strictly assign local weights to a component with actionable errors."""
    try:
        model.load_state_dict(state_dict, strict=True, assign=True)
    except RuntimeError as error:
        raise ValueError(f"Failed to load {component} weights from {path}: {error}") from error
    return model


def load_local_transformer(state_dict, dtype, checkpoint_path=None):
    """Build the Anima transformer from local weights and the official config."""
    source = checkpoint_path or "the local Anima checkpoint"
    try:
        return CosmosTransformer3DModel.from_single_file(
            state_dict,
            config=ANIMA_BASE_REPO,
            subfolder="transformer",
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        )
    except Exception as error:
        raise ValueError(f"Failed to load transformer weights from {source}: {error}") from error


def load_local_conditioner(state_dict, checkpoint_path, dtype):
    """Build the Anima text conditioner from official config and local weights."""
    config = AnimaTextConditioner.load_config(ANIMA_BASE_REPO, subfolder="text_conditioner")
    with init_empty_weights():
        conditioner = AnimaTextConditioner.from_config(config)
    state_dict = cast_floating_state_dict(state_dict, dtype)
    return load_component_state_dict(
        conditioner,
        state_dict,
        "Anima text conditioner",
        checkpoint_path,
    )


def load_local_qwen3(path, dtype):
    """Build the Qwen3 text encoder from official config and local weights."""
    config = Qwen3Config.from_pretrained(ANIMA_BASE_REPO, subfolder="text_encoder")
    with init_empty_weights():
        text_encoder = Qwen3Model(config)
    state_dict = normalize_qwen3_state_dict(load_file(path, device="cpu"))
    state_dict = cast_floating_state_dict(state_dict, dtype)
    return load_component_state_dict(text_encoder, state_dict, "Qwen3 text encoder", path)


def load_local_vae(path, dtype):
    """Build the Qwen Image VAE from official config and normalized local weights."""
    config = AutoencoderKLQwenImage.load_config(ANIMA_BASE_REPO, subfolder="vae")
    with init_empty_weights():
        vae = AutoencoderKLQwenImage.from_config(config)
    state_dict = normalize_qwen_image_vae_state_dict(load_file(path, device="cpu"))
    state_dict = cast_floating_state_dict(state_dict, dtype)
    return load_component_state_dict(vae, state_dict, "Qwen Image VAE", path)


def build_anima_single_file_pipeline(
    checkpoint_path,
    text_encoder_path,
    vae_path,
    dtype,
    *,
    validate_paths=True,
):
    """Assemble an Anima pipeline using only explicitly supplied model weights."""
    if validate_paths:
        checkpoint_path = validate_local_safetensors(checkpoint_path, "Anima model")
        text_encoder_path = validate_local_safetensors(text_encoder_path, "Text encoder")
        vae_path = validate_local_safetensors(vae_path, "VAE")

    pipe = AnimaAutoBlocks().init_pipeline(ANIMA_BASE_REPO)
    metadata_components = ["tokenizer", "t5_tokenizer", "scheduler"]
    pipe.load_components(names=metadata_components)
    missing_components = [name for name in metadata_components if pipe.components.get(name) is None]
    if missing_components:
        missing = ", ".join(missing_components)
        raise ValueError(f"Missing required Anima metadata component(s) {missing} from {ANIMA_BASE_REPO}")

    checkpoint_state = load_file(checkpoint_path, device="cpu")
    transformer_state, conditioner_state = split_anima_checkpoint_state_dict(checkpoint_state)
    del checkpoint_state

    transformer = load_local_transformer(transformer_state, dtype, checkpoint_path)
    del transformer_state
    text_conditioner = load_local_conditioner(conditioner_state, checkpoint_path, dtype)
    del conditioner_state
    text_encoder = load_local_qwen3(text_encoder_path, dtype)
    vae = load_local_vae(vae_path, dtype)

    pipe.update_components(
        transformer=transformer,
        text_conditioner=text_conditioner,
        text_encoder=text_encoder,
        vae=vae,
    )
    return pipe


def select_anima_loading_mode(name_or_path):
    """Return the loader mode without attempting to load model data."""
    candidate = os.path.abspath(os.path.expanduser(str(name_or_path)))
    if os.path.isdir(candidate):
        return "pipeline"
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
