# Anima Single-File Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load compatible local Anima checkpoints, Qwen3 text encoders, and Qwen Image VAEs from safetensors while preserving existing Diffusers-repository loading.

**Architecture:** Put path classification, validation, state-dictionary separation, and local component construction in a focused Anima single-file module. `AnimaModel.load_model` selects that component assembly path only for `.safetensors`; the React job form exposes the existing Python `te_name_or_path` and `vae_path` configuration keys for Anima jobs.

**Tech Stack:** Python 3.12, PyTorch, safetensors, Diffusers modular pipelines, Transformers Qwen3, unittest, Next.js 15, React 19, TypeScript

---

## File Structure

- Create `extensions_built_in/diffusion_models/anima/single_file.py`: mode selection, validation, checkpoint splitting, strict local component loading, and modular-pipeline assembly.
- Create `testing/test_anima_single_file.py`: zero-download Python unit/regression tests for the local loader.
- Modify `extensions_built_in/diffusion_models/anima/anima.py`: select the local single-file assembly path without changing normal pipeline loading.
- Create `ui/src/helpers/animaModelPaths.ts`: pure frontend cleanup helper for architecture changes.
- Create `ui/testing/animaModelPaths.test.ts`: zero-dependency TypeScript tests for path cleanup.
- Modify `ui/src/types.ts`: expose the existing optional Python model-path keys to TypeScript.
- Modify `ui/src/app/jobs/new/options.tsx`: declare Anima-only path controls.
- Modify `ui/src/app/jobs/new/SimpleJob.tsx`: render the two optional path inputs.
- Modify `ui/src/app/jobs/new/utils.ts`: remove Anima-only paths when switching to an unsupported architecture.
- Update ignored runtime data `aitk_db.db` only after verification, with a backup under ignored `output/db-backups/`.

## Test Commands

Python tests use the standard library runner already used by this repository:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
```

The UI has no test runner dependency. Compile the pure helper and test into a
validated disposable directory, then run the emitted CommonJS file:

```bash
anima_ui_test_out="$(mktemp -d)"
test -n "$anima_ui_test_out" && test -d "$anima_ui_test_out"
case "$anima_ui_test_out" in
  /tmp/*) ;;
  *) echo "Unexpected temporary path: $anima_ui_test_out" >&2; exit 1 ;;
esac
(
  cd ui
  ./node_modules/.bin/tsc \
    --module commonjs \
    --moduleResolution node \
    --target es2020 \
    --esModuleInterop \
    --skipLibCheck \
    --outDir "$anima_ui_test_out" \
    src/helpers/animaModelPaths.ts \
    testing/animaModelPaths.test.ts
)
node "$anima_ui_test_out/testing/animaModelPaths.test.js"
```

Do not remove a temporary path unless it is non-empty, exists, and matches
`/tmp/*`.

### Task 1: Add Pure Single-File Validation and State Separation

**Files:**
- Create: `extensions_built_in/diffusion_models/anima/single_file.py`
- Create: `testing/test_anima_single_file.py`

- [ ] **Step 1: Write failing helper tests**

Create `testing/test_anima_single_file.py` with these initial tests:

```python
import tempfile
import unittest
from pathlib import Path

import torch

from extensions_built_in.diffusion_models.anima.single_file import (
    normalize_qwen3_state_dict,
    normalize_qwen_image_vae_state_dict,
    select_anima_loading_mode,
    split_anima_checkpoint_state_dict,
    validate_local_safetensors,
)


class AnimaSingleFileHelpersTest(unittest.TestCase):
    def test_safetensors_name_selects_single_file_mode(self):
        self.assertEqual(
            select_anima_loading_mode("/models/anima.safetensors"),
            "single_file",
        )

    def test_repo_and_directory_names_select_pipeline_mode(self):
        self.assertEqual(
            select_anima_loading_mode(
                "circlestone-labs/Anima-Base-v1.0-Diffusers"
            ),
            "pipeline",
        )
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(select_anima_loading_mode(directory), "pipeline")

    def test_existing_non_safetensors_file_is_rejected(self):
        with tempfile.NamedTemporaryFile(suffix=".bin") as checkpoint:
            with self.assertRaisesRegex(
                ValueError, "Anima model checkpoint.*\\.safetensors"
            ):
                select_anima_loading_mode(checkpoint.name)

    def test_local_component_validation_names_the_component(self):
        missing = "/tmp/missing-anima-text-encoder.safetensors"
        with self.assertRaisesRegex(FileNotFoundError, "Text encoder.*missing"):
            validate_local_safetensors(missing, "Text encoder")

    def test_checkpoint_is_split_without_conditioner_leaking_into_transformer(self):
        state_dict = {
            "net.blocks.0.weight": torch.tensor([1.0]),
            "net.final_layer.weight": torch.tensor([2.0]),
            "net.llm_adapter.blocks.0.weight": torch.tensor([3.0]),
            "net.llm_adapter.norm.weight": torch.tensor([4.0]),
        }

        transformer, conditioner = split_anima_checkpoint_state_dict(state_dict)

        self.assertEqual(
            set(transformer), {"net.blocks.0.weight", "net.final_layer.weight"}
        )
        self.assertEqual(
            set(conditioner), {"blocks.0.weight", "norm.weight"}
        )

    def test_checkpoint_requires_transformer_and_conditioner_weights(self):
        with self.assertRaisesRegex(ValueError, "transformer weights"):
            split_anima_checkpoint_state_dict(
                {"net.llm_adapter.norm.weight": torch.tensor([1.0])}
            )
        with self.assertRaisesRegex(ValueError, "conditioner weights"):
            split_anima_checkpoint_state_dict(
                {"net.blocks.0.weight": torch.tensor([1.0])}
            )

    def test_qwen3_wrapper_prefix_is_removed(self):
        normalized = normalize_qwen3_state_dict(
            {
                "model.embed_tokens.weight": torch.tensor([1.0]),
                "model.layers.0.input_layernorm.weight": torch.tensor([2.0]),
            }
        )
        self.assertEqual(
            set(normalized),
            {"embed_tokens.weight", "layers.0.input_layernorm.weight"},
        )

    def test_comfy_qwen_vae_keys_are_normalized(self):
        normalized = normalize_qwen_image_vae_state_dict(
            {
                "conv1.weight": torch.tensor([1.0]),
                "encoder.downsamples.3.shortcut.weight": torch.tensor([2.0]),
                "decoder.upsamples.7.time_conv.weight": torch.tensor([3.0]),
                "decoder.middle.1.to_qkv.weight": torch.tensor([4.0]),
            }
        )
        self.assertEqual(
            set(normalized),
            {
                "quant_conv.weight",
                "encoder.down_blocks.3.conv_shortcut.weight",
                "decoder.up_blocks.1.upsamplers.0.time_conv.weight",
                "decoder.mid_block.attentions.0.to_qkv.weight",
            },
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
```

Expected: import failure because
`extensions_built_in.diffusion_models.anima.single_file` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `extensions_built_in/diffusion_models/anima/single_file.py` with:

```python
import os
from pathlib import Path
from typing import Literal


ANIMA_BASE_REPO = "circlestone-labs/Anima-Base-v1.0-Diffusers"
ANIMA_CONDITIONER_PREFIX = "net.llm_adapter."


def select_anima_loading_mode(name_or_path: str) -> Literal["pipeline", "single_file"]:
    path = Path(os.path.abspath(os.path.expanduser(str(name_or_path))))
    if path.suffix.lower() == ".safetensors":
        return "single_file"
    if path.is_file():
        raise ValueError(
            f"Anima model checkpoint {str(path)!r} must be a .safetensors file"
        )
    return "pipeline"


def validate_local_safetensors(value: str | None, component: str) -> str:
    if value is None or not str(value).strip():
        raise ValueError(
            f"{component} path is required for an Anima single-file checkpoint"
        )
    path = Path(os.path.abspath(os.path.expanduser(str(value))))
    if not path.exists():
        raise FileNotFoundError(f"{component} file is missing: {path}")
    if not path.is_file():
        raise ValueError(f"{component} path is not a regular file: {path}")
    if path.suffix.lower() != ".safetensors":
        raise ValueError(f"{component} must be a .safetensors file: {path}")
    return str(path)


def split_anima_checkpoint_state_dict(state_dict: dict):
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
        raise ValueError("Anima checkpoint contains no transformer weights under 'net.'")
    if not conditioner:
        raise ValueError(
            "Anima checkpoint contains no conditioner weights under "
            "'net.llm_adapter.'"
        )
    return transformer, conditioner


def normalize_qwen3_state_dict(state_dict: dict):
    normalized = {}
    for key, value in state_dict.items():
        normalized_key = key.removeprefix("model.")
        if normalized_key in normalized:
            raise ValueError(
                f"Qwen3 text encoder contains duplicate key {normalized_key!r}"
            )
        normalized[normalized_key] = value
    return normalized


_RESIDUAL_PARTS = {
    "0": "norm1",
    "2": "conv1",
    "3": "norm2",
    "6": "conv2",
}


def _normalize_qwen_vae_key(key: str) -> str:
    top_level = {
        "conv1": "quant_conv",
        "conv2": "post_quant_conv",
        "encoder.conv1": "encoder.conv_in",
        "encoder.head.0": "encoder.norm_out",
        "encoder.head.2": "encoder.conv_out",
        "decoder.conv1": "decoder.conv_in",
        "decoder.head.0": "decoder.norm_out",
        "decoder.head.2": "decoder.conv_out",
    }
    stem, suffix = key.rsplit(".", 1)
    if stem in top_level:
        return f"{top_level[stem]}.{suffix}"

    for side in ("encoder", "decoder"):
        for middle_index, target in (
            ("0", "resnets.0"),
            ("1", "attentions.0"),
            ("2", "resnets.1"),
        ):
            prefix = f"{side}.middle.{middle_index}."
            if stem.startswith(prefix):
                tail = stem.removeprefix(prefix)
                if middle_index in {"0", "2"} and tail.startswith("residual."):
                    tail = _RESIDUAL_PARTS[tail.removeprefix("residual.")]
                elif middle_index == "1":
                    tail = {"norm": "norm", "proj": "proj", "to_qkv": "to_qkv"}[tail]
                return f"{side}.mid_block.{target}.{tail}.{suffix}"

    if stem.startswith("encoder.downsamples."):
        _, _, index, *parts = stem.split(".")
        tail = ".".join(parts)
        if tail.startswith("residual."):
            tail = _RESIDUAL_PARTS[tail.removeprefix("residual.")]
        elif tail == "shortcut":
            tail = "conv_shortcut"
        return f"encoder.down_blocks.{index}.{tail}.{suffix}"

    if stem.startswith("decoder.upsamples."):
        _, _, raw_index, *parts = stem.split(".")
        index = int(raw_index)
        group = index // 4
        within_group = index % 4
        tail = ".".join(parts)
        if tail.startswith("residual."):
            tail = _RESIDUAL_PARTS[tail.removeprefix("residual.")]
            return f"decoder.up_blocks.{group}.resnets.{within_group}.{tail}.{suffix}"
        if tail == "shortcut":
            return (
                f"decoder.up_blocks.{group}.resnets.{within_group}."
                f"conv_shortcut.{suffix}"
            )
        return f"decoder.up_blocks.{group}.upsamplers.0.{tail}.{suffix}"

    return key


def normalize_qwen_image_vae_state_dict(state_dict: dict):
    return {_normalize_qwen_vae_key(key): value for key, value in state_dict.items()}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
```

Expected: eight tests pass.

- [ ] **Step 5: Commit the helper behavior**

```bash
git add extensions_built_in/diffusion_models/anima/single_file.py testing/test_anima_single_file.py
git commit -m "test: define Anima single-file loading rules"
```

### Task 2: Assemble Local Anima Components Without Base-Weight Fallbacks

**Files:**
- Modify: `extensions_built_in/diffusion_models/anima/single_file.py`
- Modify: `testing/test_anima_single_file.py`

- [ ] **Step 1: Add failing strict-load and pipeline-assembly tests**

Append these imports and tests to `testing/test_anima_single_file.py`:

```python
from unittest import mock

from extensions_built_in.diffusion_models.anima.single_file import (
    ANIMA_BASE_REPO,
    build_anima_single_file_pipeline,
    load_component_state_dict,
)


class TinyModule(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.weight = torch.nn.Parameter(torch.zeros(1))


class AnimaSingleFileAssemblyTest(unittest.TestCase):
    def test_strict_load_wraps_component_and_path(self):
        with self.assertRaisesRegex(
            ValueError, "Text encoder.*broken.safetensors.*Missing key"
        ):
            load_component_state_dict(
                TinyModule(), {}, "Text encoder", "/models/broken.safetensors"
            )

    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.load_local_vae"
    )
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.load_local_qwen3"
    )
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.load_local_conditioner"
    )
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.load_local_transformer"
    )
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.load_file"
    )
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.single_file.AnimaAutoBlocks"
    )
    def test_single_file_pipeline_uses_base_metadata_not_checkpoint_as_pipeline(
        self,
        auto_blocks,
        load_checkpoint,
        load_transformer,
        load_conditioner,
        load_qwen3,
        load_vae,
    ):
        pipe = mock.Mock()
        auto_blocks.return_value.init_pipeline.return_value = pipe
        load_checkpoint.return_value = {
            "net.blocks.0.weight": torch.tensor([1.0]),
            "net.llm_adapter.norm.weight": torch.tensor([2.0]),
        }
        load_transformer.return_value = "transformer"
        load_conditioner.return_value = "conditioner"
        load_qwen3.return_value = "text_encoder"
        load_vae.return_value = "vae"

        result = build_anima_single_file_pipeline(
            "/models/anima.safetensors",
            "/models/qwen.safetensors",
            "/models/vae.safetensors",
            torch.bfloat16,
            validate_paths=False,
        )

        self.assertIs(result, pipe)
        auto_blocks.return_value.init_pipeline.assert_called_once_with(
            ANIMA_BASE_REPO
        )
        pipe.load_components.assert_called_once_with(
            names=["tokenizer", "t5_tokenizer", "scheduler"]
        )
        pipe.update_components.assert_called_once_with(
            transformer="transformer",
            text_conditioner="conditioner",
            text_encoder="text_encoder",
            vae="vae",
        )
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
```

Expected: import failure for `build_anima_single_file_pipeline` and
`load_component_state_dict`.

- [ ] **Step 3: Implement strict local component construction**

Add these imports and functions to
`extensions_built_in/diffusion_models/anima/single_file.py`:

```python
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


def cast_floating_state_dict(state_dict: dict, dtype: torch.dtype):
    return {
        key: value.to(dtype=dtype) if value.is_floating_point() else value
        for key, value in state_dict.items()
    }


def load_component_state_dict(model, state_dict: dict, component: str, path: str):
    try:
        model.load_state_dict(state_dict, strict=True, assign=True)
    except RuntimeError as error:
        raise ValueError(
            f"{component} weights are incompatible with {path!r}: {error}"
        ) from error
    return model


def load_local_transformer(state_dict: dict, dtype: torch.dtype):
    try:
        return CosmosTransformer3DModel.from_single_file(
            state_dict,
            config=ANIMA_BASE_REPO,
            subfolder="transformer",
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        )
    except Exception as error:
        raise ValueError(
            f"Anima transformer weights are incompatible with the selected checkpoint: {error}"
        ) from error


def load_local_conditioner(state_dict: dict, checkpoint_path: str, dtype: torch.dtype):
    config = AnimaTextConditioner.load_config(
        ANIMA_BASE_REPO, subfolder="text_conditioner"
    )
    with init_empty_weights():
        conditioner = AnimaTextConditioner.from_config(config)
    return load_component_state_dict(
        conditioner,
        cast_floating_state_dict(state_dict, dtype),
        "Anima text conditioner",
        checkpoint_path,
    )


def load_local_qwen3(path: str, dtype: torch.dtype):
    config = Qwen3Config.from_pretrained(
        ANIMA_BASE_REPO, subfolder="text_encoder"
    )
    with init_empty_weights():
        text_encoder = Qwen3Model(config)
    state_dict = normalize_qwen3_state_dict(load_file(path, device="cpu"))
    return load_component_state_dict(
        text_encoder,
        cast_floating_state_dict(state_dict, dtype),
        "Text encoder",
        path,
    )


def load_local_vae(path: str, dtype: torch.dtype):
    config = AutoencoderKLQwenImage.load_config(
        ANIMA_BASE_REPO, subfolder="vae"
    )
    with init_empty_weights():
        vae = AutoencoderKLQwenImage.from_config(config)
    state_dict = normalize_qwen_image_vae_state_dict(
        load_file(path, device="cpu")
    )
    return load_component_state_dict(
        vae,
        cast_floating_state_dict(state_dict, dtype),
        "VAE",
        path,
    )


def build_anima_single_file_pipeline(
    checkpoint_path: str,
    text_encoder_path: str | None,
    vae_path: str | None,
    dtype: torch.dtype,
    *,
    validate_paths: bool = True,
):
    if validate_paths:
        checkpoint_path = validate_local_safetensors(
            checkpoint_path, "Anima model checkpoint"
        )
        text_encoder_path = validate_local_safetensors(
            text_encoder_path, "Text encoder"
        )
        vae_path = validate_local_safetensors(vae_path, "VAE")

    pipe = AnimaAutoBlocks().init_pipeline(ANIMA_BASE_REPO)
    pipe.load_components(names=["tokenizer", "t5_tokenizer", "scheduler"])

    checkpoint = load_file(checkpoint_path, device="cpu")
    transformer_state, conditioner_state = split_anima_checkpoint_state_dict(
        checkpoint
    )
    del checkpoint

    transformer = load_local_transformer(transformer_state, dtype)
    del transformer_state
    conditioner = load_local_conditioner(
        conditioner_state, checkpoint_path, dtype
    )
    del conditioner_state
    text_encoder = load_local_qwen3(text_encoder_path, dtype)
    vae = load_local_vae(vae_path, dtype)

    pipe.update_components(
        transformer=transformer,
        text_conditioner=conditioner,
        text_encoder=text_encoder,
        vae=vae,
    )
    return pipe
```

- [ ] **Step 4: Run all Python tests and verify GREEN**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
./.venv/bin/python -m unittest discover -s testing -p 'test_*.py' -v
```

Expected: the Anima tests and the existing discoverable test suite pass.

- [ ] **Step 5: Commit component assembly**

```bash
git add extensions_built_in/diffusion_models/anima/single_file.py testing/test_anima_single_file.py
git commit -m "feat: assemble local Anima components"
```

### Task 3: Route Anima Model Loading Through the Single-File Path

**Files:**
- Modify: `extensions_built_in/diffusion_models/anima/anima.py:1-25,255-265`
- Modify: `testing/test_anima_single_file.py`

- [ ] **Step 1: Add a failing loader-routing test**

Append to `testing/test_anima_single_file.py`:

```python
from extensions_built_in.diffusion_models.anima.anima import AnimaModel


class AnimaModelRoutingTest(unittest.TestCase):
    @mock.patch(
        "extensions_built_in.diffusion_models.anima.anima.build_anima_single_file_pipeline"
    )
    @mock.patch.object(AnimaModel, "print_and_status_update")
    def test_load_model_routes_safetensors_to_component_assembly(
        self, _status, build_pipeline
    ):
        pipe = mock.Mock()
        pipe.transformer = mock.Mock()
        pipe.text_conditioner = mock.Mock()
        pipe.text_encoder = mock.Mock()
        pipe.vae = mock.Mock()
        pipe.tokenizer = mock.Mock()
        pipe.t5_tokenizer = mock.Mock()
        pipe.scheduler = mock.Mock()
        build_pipeline.return_value = pipe

        model = object.__new__(AnimaModel)
        model.model_config = mock.Mock(
            name_or_path="/models/anima.safetensors",
            te_name_or_path="/models/qwen.safetensors",
            vae_path="/models/vae.safetensors",
            quantize=False,
            quantize_te=False,
            layer_offloading=False,
            low_vram=True,
        )
        model.torch_dtype = torch.bfloat16
        model.device_torch = torch.device("cpu")
        model.get_train_scheduler = mock.Mock(return_value="scheduler")

        AnimaModel.load_model(model)

        build_pipeline.assert_called_once_with(
            "/models/anima.safetensors",
            "/models/qwen.safetensors",
            "/models/vae.safetensors",
            torch.bfloat16,
        )
```

- [ ] **Step 2: Run the routing test and verify RED**

Run:

```bash
./.venv/bin/python -m unittest \
  testing.test_anima_single_file.AnimaModelRoutingTest -v
```

Expected: failure because `AnimaModel.load_model` still passes the checkpoint
to `AnimaAutoBlocks.init_pipeline`.

- [ ] **Step 3: Integrate mode selection in `AnimaModel.load_model`**

Add imports in `anima.py`:

```python
from .single_file import (
    build_anima_single_file_pipeline,
    select_anima_loading_mode,
)
```

Replace the pipeline initialization at the start of `load_model` with:

```python
        if select_anima_loading_mode(self.model_config.name_or_path) == "single_file":
            pipe: AnimaModularPipeline = build_anima_single_file_pipeline(
                self.model_config.name_or_path,
                self.model_config.te_name_or_path,
                self.model_config.vae_path,
                dtype,
            )
        else:
            pipe = AnimaAutoBlocks().init_pipeline(self.model_config.name_or_path)
            load_kwargs = {"torch_dtype": dtype}
            model_path = os.path.abspath(
                os.path.expanduser(str(self.model_config.name_or_path))
            )
            if os.path.isdir(model_path):
                load_kwargs["pretrained_model_name_or_path"] = model_path
            pipe.load_components(**load_kwargs)

        pipe.update_components(scheduler=self.get_train_scheduler())
```

Remove the replaced duplicate initialization, `load_kwargs`, directory override,
component load, and scheduler update. Leave quantization, offloading, device
placement, and component assignment below this block unchanged.

- [ ] **Step 4: Run Python regression tests**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
./.venv/bin/python -m compileall \
  extensions_built_in/diffusion_models/anima \
  testing/test_anima_single_file.py
```

Expected: tests pass and compilation exits zero.

- [ ] **Step 5: Commit loader routing**

```bash
git add extensions_built_in/diffusion_models/anima/anima.py testing/test_anima_single_file.py
git commit -m "fix: load Anima single-file checkpoints"
```

### Task 4: Expose Per-Job Text Encoder and VAE Paths

**Files:**
- Create: `ui/src/helpers/animaModelPaths.ts`
- Create: `ui/testing/animaModelPaths.test.ts`
- Modify: `ui/src/types.ts:177-196`
- Modify: `ui/src/app/jobs/new/options.tsx:14-45,70-95`
- Modify: `ui/src/app/jobs/new/SimpleJob.tsx:285-325`
- Modify: `ui/src/app/jobs/new/utils.ts:1-60`

- [ ] **Step 1: Write the failing frontend helper test**

Create `ui/testing/animaModelPaths.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { clearUnsupportedAnimaPaths } from '../src/helpers/animaModelPaths';

const configured = {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
};

assert.deepEqual(clearUnsupportedAnimaPaths(configured, true), configured);
const cleaned = clearUnsupportedAnimaPaths(configured, false);
assert.deepEqual(cleaned, {
  name_or_path: '/models/anima.safetensors',
});
assert.notEqual(cleaned, configured);
assert.deepEqual(configured, {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
});

console.log('Anima model path tests passed');
```

- [ ] **Step 2: Compile the test and verify RED**

Run the disposable UI test command from this plan's **Test Commands** section.

Expected: TypeScript import failure because `animaModelPaths.ts` does not exist.

- [ ] **Step 3: Implement immutable path cleanup**

Create `ui/src/helpers/animaModelPaths.ts`:

```typescript
type ModelWithAnimaPaths = {
  te_name_or_path?: string;
  vae_path?: string;
  [key: string]: unknown;
};

export function clearUnsupportedAnimaPaths<T extends ModelWithAnimaPaths>(model: T, supported: boolean): T {
  if (supported) return model;
  const cleaned = { ...model };
  delete cleaned.te_name_or_path;
  delete cleaned.vae_path;
  return cleaned;
}
```

- [ ] **Step 4: Compile the test and verify GREEN**

Run the disposable UI test command again.

Expected: `Anima model path tests passed`.

- [ ] **Step 5: Add typed, conditional form controls**

Add to `ModelConfig` in `ui/src/types.ts`:

```typescript
  te_name_or_path?: string;
  vae_path?: string;
```

Add these variants to `AdditionalSections` in `options.tsx`:

```typescript
  | 'model.te_name_or_path'
  | 'model.vae_path'
```

Extend only the Anima entry's `additionalSections`:

```typescript
    additionalSections: [
      'model.low_vram',
      'model.layer_offloading',
      'model.te_name_or_path',
      'model.vae_path',
    ],
```

After the Name or Path input in `SimpleJob.tsx`, add:

```tsx
            {modelArch?.additionalSections?.includes('model.te_name_or_path') && (
              <TextInput
                label="Text Encoder Path"
                value={jobConfig.config.process[0].model.te_name_or_path ?? ''}
                onChange={(value: string | undefined) => {
                  setJobConfig(value?.trim() || undefined, 'config.process[0].model.te_name_or_path');
                }}
                placeholder="/path/to/qwen_3_06b_base.safetensors"
              />
            )}
            {modelArch?.additionalSections?.includes('model.vae_path') && (
              <TextInput
                label="VAE Path"
                value={jobConfig.config.process[0].model.vae_path ?? ''}
                onChange={(value: string | undefined) => {
                  setJobConfig(value?.trim() || undefined, 'config.process[0].model.vae_path');
                }}
                placeholder="/path/to/qwen_image_vae.safetensors"
              />
            )}
```

Import `clearUnsupportedAnimaPaths` in `utils.ts` and, immediately after
resolving `newArch`, add:

```typescript
  const supportsAnimaPaths =
    newArch?.additionalSections?.includes('model.te_name_or_path') === true &&
    newArch.additionalSections.includes('model.vae_path');
  const currentModel = jobConfig.config.process[0].model;
  const cleanedModel = clearUnsupportedAnimaPaths(currentModel, supportsAnimaPaths);
  if (cleanedModel !== currentModel) {
    setJobConfig(cleanedModel, 'config.process[0].model');
  }
```

- [ ] **Step 6: Run frontend tests, clean type-check, and production build**

Run:

```bash
# Run the disposable helper test command from the Test Commands section.

ui_check_root="$(mktemp -d)"
test -n "$ui_check_root" && test -d "$ui_check_root"
case "$ui_check_root" in
  /tmp/*) ;;
  *) echo "Unexpected temporary path: $ui_check_root" >&2; exit 1 ;;
esac
git archive HEAD:ui | tar -x -C "$ui_check_root"
ln -s "$PWD/ui/node_modules" "$ui_check_root/node_modules"
ui/node_modules/.bin/tsc \
  --noEmit \
  --incremental false \
  --project "$ui_check_root/tsconfig.json"

cd ui
npm run build
```

Expected: helper test passes, archived source type-check exits zero, and the
production build exits zero. The existing optional `macos-temperature-sensor`
warning and npm/Node version warning are non-blocking.

- [ ] **Step 7: Commit the frontend configuration**

```bash
git add \
  ui/src/helpers/animaModelPaths.ts \
  ui/testing/animaModelPaths.test.ts \
  ui/src/types.ts \
  ui/src/app/jobs/new/options.tsx \
  ui/src/app/jobs/new/SimpleJob.tsx \
  ui/src/app/jobs/new/utils.ts
git commit -m "feat: configure local Anima components"
```

### Task 5: Verify Real Local Components and Repair the Failed Job

**Files:**
- Runtime backup: `output/db-backups/aitk_db.pre-anima-single-file.bak`
- Runtime data: `aitk_db.db` (ignored by git)

- [ ] **Step 1: Run all automated verification**

Run:

```bash
./.venv/bin/python -m unittest testing.test_anima_single_file -v
./.venv/bin/python -m unittest discover -s testing -p 'test_*.py' -v
git diff --check main...HEAD
git status --short
```

Also rerun the disposable TypeScript helper test, archived UI type-check, and
`npm run build` from Task 4.

Expected: all commands exit zero, no diff-check errors appear, and only intended
tracked changes are present.

- [ ] **Step 2: Load the real local model components without starting training**

Run:

```bash
./.venv/bin/python - <<'PY'
import torch

from extensions_built_in.diffusion_models.anima.single_file import (
    build_anima_single_file_pipeline,
)

checkpoint = "/run/media/john/Athalor/temper/Models/checkpoints/anima/anima_baseV10.safetensors"
text_encoder = "/run/media/john/Athalor/temper/Models/TextEncoders/qwen_3_06b_base.safetensors"
vae = "/run/media/john/Athalor/temper/Models/VAE/anima/qwen_image_vae.safetensors"

pipe = build_anima_single_file_pipeline(
    checkpoint,
    text_encoder,
    vae,
    torch.bfloat16,
)
pipe.transformer.to("cuda:0", dtype=torch.bfloat16)
pipe.text_conditioner.to("cuda:0", dtype=torch.bfloat16)
pipe.text_encoder.to("cuda:0", dtype=torch.bfloat16)
pipe.vae.to("cuda:0", dtype=torch.bfloat16)

assert torch.cuda.get_device_name(0) == "AMD Radeon RX 7900 XTX"
assert next(pipe.transformer.parameters()).device.type == "cuda"
assert next(pipe.text_conditioner.parameters()).device.type == "cuda"
assert next(pipe.text_encoder.parameters()).device.type == "cuda"
assert next(pipe.vae.parameters()).device.type == "cuda"
print("Anima local components loaded on AMD Radeon RX 7900 XTX")
PY
```

Expected: strict component loading completes and the final confirmation prints.
This verifies the original failure boundary without starting sampling or the
100-step training loop.

- [ ] **Step 3: Back up the database with SQLite's online backup API**

Run from the repository root:

```bash
./.venv/bin/python - <<'PY'
import sqlite3
from pathlib import Path

source_path = Path("aitk_db.db").resolve()
backup_path = Path("output/db-backups/aitk_db.pre-anima-single-file.bak").resolve()
backup_path.parent.mkdir(parents=True, exist_ok=True)
if backup_path.exists():
    raise SystemExit(f"Refusing to overwrite existing backup: {backup_path}")
with sqlite3.connect(source_path) as source, sqlite3.connect(backup_path) as backup:
    source.backup(backup)
print(backup_path)
PY
```

Expected: a new backup path prints; an existing backup stops the operation
without overwriting it.

- [ ] **Step 4: Update only the failed job's component paths**

Run:

```bash
./.venv/bin/python - <<'PY'
import json
import sqlite3

job_id = "7ae23edf-a5f3-48b8-90e7-77ae9d879455"
text_encoder = "/run/media/john/Athalor/temper/Models/TextEncoders/qwen_3_06b_base.safetensors"
vae = "/run/media/john/Athalor/temper/Models/VAE/anima/qwen_image_vae.safetensors"

with sqlite3.connect("aitk_db.db") as connection:
    row = connection.execute(
        "SELECT job_config FROM Job WHERE id = ?", (job_id,)
    ).fetchone()
    if row is None:
        raise SystemExit(f"Job not found: {job_id}")
    config = json.loads(row[0])
    model = config["config"]["process"][0]["model"]
    model["te_name_or_path"] = text_encoder
    model["vae_path"] = vae
    cursor = connection.execute(
        "UPDATE Job SET job_config = ?, status = 'stopped', stop = 0 WHERE id = ?",
        (json.dumps(config, separators=(",", ":")), job_id),
    )
    if cursor.rowcount != 1:
        raise SystemExit(f"Unexpected updated row count: {cursor.rowcount}")
    connection.commit()

with sqlite3.connect("aitk_db.db") as connection:
    stored = json.loads(
        connection.execute(
            "SELECT job_config FROM Job WHERE id = ?", (job_id,)
        ).fetchone()[0]
    )
    model = stored["config"]["process"][0]["model"]
    assert model["te_name_or_path"] == text_encoder
    assert model["vae_path"] == vae
print("Updated my_first_lora_v1 local Anima component paths")
PY
```

Expected: exactly one job is updated and verified. The model checkpoint path and
all training settings remain unchanged.

- [ ] **Step 5: Confirm repository and runtime state**

Run:

```bash
git status --short
git log --oneline main..HEAD
sqlite3 aitk_db.db ".headers on" ".mode column" \
  "SELECT id, name, status, gpu_ids FROM Job WHERE id='7ae23edf-a5f3-48b8-90e7-77ae9d879455';"
test -s output/db-backups/aitk_db.pre-anima-single-file.bak
```

Expected: the feature branch contains only intentional commits, the job is
`stopped` on GPU `0`, and the backup is non-empty. Because `output/` and the
database are ignored runtime data, neither appears as a tracked git change.

### Task 6: Final Review and Branch Completion

**Files:**
- Review: all changes in `main...HEAD`

- [ ] **Step 1: Review requirements against the design**

Read
`docs/superpowers/specs/2026-08-06-anima-single-file-loading-design.md` and
check every requirement against the branch diff. Confirm explicitly that:

```text
single-file transformer loaded locally
matching checkpoint conditioner loaded locally
explicit Qwen3 encoder loaded locally
explicit Qwen Image VAE loaded locally
only metadata/tokenizers use the official repository
pipeline IDs and Diffusers directories retain existing behavior
local path errors name the failed component
Anima-only UI paths persist and clear on architecture change
real RX 7900 XTX component load succeeds
database backup precedes the one-job update
```

- [ ] **Step 2: Run final fresh verification**

Run the full Python tests, disposable TypeScript helper test, clean archived UI
type-check, production build, `git diff --check main...HEAD`, and real component
load from the preceding tasks again.

Expected: every command exits zero. Record any known warning verbatim and do not
classify a new warning as pre-existing without comparing it to the earlier build.

- [ ] **Step 3: Request code review**

Use the `superpowers:requesting-code-review` skill. Address all Critical and
Important findings with another RED/GREEN cycle, then rerun Step 2.

- [ ] **Step 4: Finish the branch**

Use `superpowers:verification-before-completion`, then
`superpowers:finishing-a-development-branch`. Present the four integration
choices only after fresh verification passes.
