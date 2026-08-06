import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import torch

from extensions_built_in.diffusion_models.anima.anima import AnimaModel, AnimaTrainableModel
from extensions_built_in.diffusion_models.anima.single_file import (
    ANIMA_BASE_REPO,
    build_anima_single_file_pipeline,
    cast_floating_state_dict,
    load_component_state_dict,
    load_local_conditioner,
    load_local_qwen3,
    load_local_transformer,
    load_local_vae,
    normalize_qwen3_state_dict,
    normalize_qwen_image_vae_state_dict,
    select_anima_loading_mode,
    split_anima_checkpoint_state_dict,
    validate_local_safetensors,
)


class AnimaSingleFileTests(unittest.TestCase):
    def test_cast_floating_state_dict_only_casts_floating_tensors(self):
        floating = torch.ones(1, dtype=torch.float32)
        integer = torch.ones(1, dtype=torch.int64)

        result = cast_floating_state_dict({"floating": floating, "integer": integer}, torch.bfloat16)

        self.assertEqual(result["floating"].dtype, torch.bfloat16)
        self.assertIs(result["integer"], integer)

    def test_load_component_state_dict_uses_strict_assign_loading(self):
        model = torch.nn.Linear(2, 1)
        state_dict = {key: value.detach().clone() for key, value in model.state_dict().items()}

        with patch.object(model, "load_state_dict", wraps=model.load_state_dict) as load_state_dict:
            result = load_component_state_dict(model, state_dict, "transformer", "/models/anima.safetensors")

        self.assertIs(result, model)
        load_state_dict.assert_called_once_with(state_dict, strict=True, assign=True)

    def test_load_component_state_dict_wraps_incompatibility_with_context(self):
        model = Mock()
        model.load_state_dict.side_effect = RuntimeError("Missing key(s) in state_dict")

        with self.assertRaisesRegex(
            ValueError,
            r"transformer.*\/models\/anima\.safetensors.*Missing key",
        ):
            load_component_state_dict(model, {}, "transformer", "/models/anima.safetensors")

    @patch("extensions_built_in.diffusion_models.anima.single_file.CosmosTransformer3DModel.from_single_file")
    def test_load_local_transformer_uses_official_config_and_local_state(self, from_single_file):
        state_dict = {"net.block.weight": torch.ones(1)}
        transformer = Mock()
        from_single_file.return_value = transformer

        result = load_local_transformer(state_dict, torch.bfloat16, "/models/anima.safetensors")

        self.assertIs(result, transformer)
        from_single_file.assert_called_once_with(
            state_dict,
            config=ANIMA_BASE_REPO,
            subfolder="transformer",
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
        )

    @patch("extensions_built_in.diffusion_models.anima.single_file.CosmosTransformer3DModel.from_single_file")
    def test_load_local_transformer_wraps_errors_with_checkpoint_context(self, from_single_file):
        from_single_file.side_effect = RuntimeError("shape mismatch")

        with self.assertRaisesRegex(ValueError, r"transformer.*\/models\/anima\.safetensors.*shape mismatch"):
            load_local_transformer({}, torch.bfloat16, "/models/anima.safetensors")

    @patch("extensions_built_in.diffusion_models.anima.single_file.CosmosTransformer3DModel.from_single_file")
    def test_load_local_transformer_wraps_non_runtime_errors_with_checkpoint_context(self, from_single_file):
        from_single_file.side_effect = NotImplementedError("unsupported conversion")

        with self.assertRaisesRegex(ValueError, r"transformer.*\/models\/anima\.safetensors.*unsupported conversion"):
            load_local_transformer({}, torch.bfloat16, "/models/anima.safetensors")

    @patch("extensions_built_in.diffusion_models.anima.single_file.CosmosTransformer3DModel.from_single_file")
    def test_load_local_transformer_wraps_unexpected_conversion_errors(self, from_single_file):
        from_single_file.side_effect = Exception("conversion hook failed")

        with self.assertRaisesRegex(ValueError, r"transformer.*\/models\/anima\.safetensors.*conversion hook failed"):
            load_local_transformer({}, torch.bfloat16, "/models/anima.safetensors")

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_component_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.cast_floating_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.init_empty_weights")
    @patch("extensions_built_in.diffusion_models.anima.single_file.AnimaTextConditioner")
    def test_load_local_conditioner_builds_from_official_config_and_strictly_loads_local_state(
        self,
        conditioner_class,
        init_empty_weights,
        cast_state_dict,
        load_component,
    ):
        config = {"hidden_size": 8}
        model = Mock()
        raw_state = {"proj.weight": torch.ones(1)}
        cast_state = {"proj.weight": torch.ones(1, dtype=torch.bfloat16)}
        conditioner_class.load_config.return_value = config
        conditioner_class.from_config.return_value = model
        cast_state_dict.return_value = cast_state
        load_component.return_value = model

        result = load_local_conditioner(raw_state, "/models/anima.safetensors", torch.bfloat16)

        self.assertIs(result, model)
        conditioner_class.load_config.assert_called_once_with(ANIMA_BASE_REPO, subfolder="text_conditioner")
        init_empty_weights.assert_called_once_with()
        conditioner_class.from_config.assert_called_once_with(config)
        cast_state_dict.assert_called_once_with(raw_state, torch.bfloat16)
        load_component.assert_called_once_with(
            model,
            cast_state,
            "Anima text conditioner",
            "/models/anima.safetensors",
        )

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_component_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.cast_floating_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.normalize_qwen3_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_file")
    @patch("extensions_built_in.diffusion_models.anima.single_file.init_empty_weights")
    @patch("extensions_built_in.diffusion_models.anima.single_file.Qwen3Model")
    @patch("extensions_built_in.diffusion_models.anima.single_file.Qwen3Config")
    def test_load_local_qwen3_normalizes_before_strict_loading(
        self,
        config_class,
        model_class,
        init_empty_weights,
        load_file,
        normalize,
        cast_state_dict,
        load_component,
    ):
        config = Mock()
        model = Mock()
        raw_state = {"model.layers.0.weight": torch.ones(1)}
        normalized_state = {"layers.0.weight": torch.ones(1)}
        cast_state = {"layers.0.weight": torch.ones(1, dtype=torch.bfloat16)}
        config_class.from_pretrained.return_value = config
        model_class.return_value = model
        load_file.return_value = raw_state
        normalize.return_value = normalized_state
        cast_state_dict.return_value = cast_state
        load_component.return_value = model

        result = load_local_qwen3("/models/qwen.safetensors", torch.bfloat16)

        self.assertIs(result, model)
        config_class.from_pretrained.assert_called_once_with(ANIMA_BASE_REPO, subfolder="text_encoder")
        init_empty_weights.assert_called_once_with()
        model_class.assert_called_once_with(config)
        load_file.assert_called_once_with("/models/qwen.safetensors", device="cpu")
        normalize.assert_called_once_with(raw_state)
        cast_state_dict.assert_called_once_with(normalized_state, torch.bfloat16)
        load_component.assert_called_once_with(
            model,
            cast_state,
            "Qwen3 text encoder",
            "/models/qwen.safetensors",
        )

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_component_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.cast_floating_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.normalize_qwen_image_vae_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_file")
    @patch("extensions_built_in.diffusion_models.anima.single_file.init_empty_weights")
    @patch("extensions_built_in.diffusion_models.anima.single_file.AutoencoderKLQwenImage")
    def test_load_local_vae_normalizes_before_strict_loading(
        self,
        vae_class,
        init_empty_weights,
        load_file,
        normalize,
        cast_state_dict,
        load_component,
    ):
        config = {"latent_channels": 16}
        model = Mock()
        raw_state = {"conv1.weight": torch.ones(1)}
        normalized_state = {"quant_conv.weight": torch.ones(1)}
        cast_state = {"quant_conv.weight": torch.ones(1, dtype=torch.bfloat16)}
        vae_class.load_config.return_value = config
        vae_class.from_config.return_value = model
        load_file.return_value = raw_state
        normalize.return_value = normalized_state
        cast_state_dict.return_value = cast_state
        load_component.return_value = model

        result = load_local_vae("/models/vae.safetensors", torch.bfloat16)

        self.assertIs(result, model)
        vae_class.load_config.assert_called_once_with(ANIMA_BASE_REPO, subfolder="vae")
        init_empty_weights.assert_called_once_with()
        vae_class.from_config.assert_called_once_with(config)
        load_file.assert_called_once_with("/models/vae.safetensors", device="cpu")
        normalize.assert_called_once_with(raw_state)
        cast_state_dict.assert_called_once_with(normalized_state, torch.bfloat16)
        load_component.assert_called_once_with(
            model,
            cast_state,
            "Qwen Image VAE",
            "/models/vae.safetensors",
        )

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_vae")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_qwen3")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_conditioner")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_transformer")
    @patch("extensions_built_in.diffusion_models.anima.single_file.split_anima_checkpoint_state_dict")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_file")
    @patch("extensions_built_in.diffusion_models.anima.single_file.validate_local_safetensors")
    @patch("extensions_built_in.diffusion_models.anima.single_file.AnimaAutoBlocks")
    def test_build_pipeline_assembles_only_local_model_components(
        self,
        auto_blocks_class,
        validate_path,
        load_file,
        split_state_dict,
        load_transformer,
        load_conditioner,
        load_qwen3,
        load_vae,
    ):
        checkpoint_path = "/requested/anima.safetensors"
        text_encoder_path = "/requested/qwen.safetensors"
        vae_path = "/requested/vae.safetensors"
        validated_checkpoint = "/validated/anima.safetensors"
        validated_text_encoder = "/validated/qwen.safetensors"
        validated_vae = "/validated/vae.safetensors"
        validated_paths = iter((validated_checkpoint, validated_text_encoder, validated_vae))
        events = []
        validate_path.side_effect = lambda path, component: next(validated_paths)

        pipe = Mock()
        pipe.components = {
            "tokenizer": Mock(name="tokenizer"),
            "t5_tokenizer": Mock(name="t5_tokenizer"),
            "scheduler": Mock(name="scheduler"),
        }
        auto_blocks = Mock()
        auto_blocks_class.return_value = auto_blocks
        auto_blocks.init_pipeline.side_effect = lambda repo: events.append(("init_pipeline", repo)) or pipe
        pipe.load_components.side_effect = lambda **kwargs: events.append(("load_components", kwargs))

        checkpoint_state = {"checkpoint": "state"}
        transformer_state = {"transformer": "state"}
        conditioner_state = {"conditioner": "state"}
        load_file.side_effect = lambda path, device: events.append(("load_file", path, device)) or checkpoint_state
        split_state_dict.side_effect = (
            lambda state: events.append(("split", state)) or (transformer_state, conditioner_state)
        )

        transformer = Mock(name="transformer")
        conditioner = Mock(name="conditioner")
        text_encoder = Mock(name="text_encoder")
        vae = Mock(name="vae")
        load_transformer.side_effect = lambda *args, **kwargs: events.append(("transformer", args, kwargs)) or transformer
        load_conditioner.side_effect = lambda *args, **kwargs: events.append(("conditioner", args, kwargs)) or conditioner
        load_qwen3.side_effect = lambda *args, **kwargs: events.append(("qwen3", args, kwargs)) or text_encoder
        load_vae.side_effect = lambda *args, **kwargs: events.append(("vae", args, kwargs)) or vae
        pipe.update_components.side_effect = lambda **kwargs: events.append(("update_components", kwargs))

        result = build_anima_single_file_pipeline(
            checkpoint_path,
            text_encoder_path,
            vae_path,
            torch.bfloat16,
        )

        self.assertIs(result, pipe)
        self.assertEqual(
            validate_path.call_args_list,
            [
                call(checkpoint_path, "Anima model"),
                call(text_encoder_path, "Text encoder"),
                call(vae_path, "VAE"),
            ],
        )
        auto_blocks.init_pipeline.assert_called_once_with(ANIMA_BASE_REPO)
        self.assertNotIn(checkpoint_path, auto_blocks.init_pipeline.call_args.args)
        pipe.load_components.assert_called_once_with(names=["tokenizer", "t5_tokenizer", "scheduler"])
        load_file.assert_called_once_with(validated_checkpoint, device="cpu")
        split_state_dict.assert_called_once_with(checkpoint_state)
        load_transformer.assert_called_once_with(transformer_state, torch.bfloat16, validated_checkpoint)
        load_conditioner.assert_called_once_with(conditioner_state, validated_checkpoint, torch.bfloat16)
        load_qwen3.assert_called_once_with(validated_text_encoder, torch.bfloat16)
        load_vae.assert_called_once_with(validated_vae, torch.bfloat16)
        pipe.update_components.assert_called_once_with(
            transformer=transformer,
            text_conditioner=conditioner,
            text_encoder=text_encoder,
            vae=vae,
        )
        self.assertEqual(
            [event[0] for event in events],
            [
                "init_pipeline",
                "load_components",
                "load_file",
                "split",
                "transformer",
                "conditioner",
                "qwen3",
                "vae",
                "update_components",
            ],
        )

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_vae")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_qwen3")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_conditioner")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_transformer")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_file")
    @patch("extensions_built_in.diffusion_models.anima.single_file.AnimaAutoBlocks")
    def test_build_pipeline_rejects_invalid_paths_before_construction(
        self,
        auto_blocks_class,
        load_file,
        load_transformer,
        load_conditioner,
        load_qwen3,
        load_vae,
    ):
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as valid_file:
            invalid_cases = (
                ("", valid_file.name, valid_file.name, ValueError, "Anima model.*blank"),
                (valid_file.name, "/missing/qwen.safetensors", valid_file.name, FileNotFoundError, "Text encoder.*missing"),
                (valid_file.name, valid_file.name, "  ", ValueError, "VAE.*blank"),
            )
            for checkpoint_path, text_encoder_path, vae_path, error_type, message in invalid_cases:
                with self.subTest(message=message):
                    with self.assertRaisesRegex(error_type, message):
                        build_anima_single_file_pipeline(
                            checkpoint_path,
                            text_encoder_path,
                            vae_path,
                            torch.bfloat16,
                        )

        auto_blocks_class.assert_not_called()
        load_file.assert_not_called()
        load_transformer.assert_not_called()
        load_conditioner.assert_not_called()
        load_qwen3.assert_not_called()
        load_vae.assert_not_called()

    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_vae")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_qwen3")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_conditioner")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_local_transformer")
    @patch("extensions_built_in.diffusion_models.anima.single_file.load_file")
    @patch("extensions_built_in.diffusion_models.anima.single_file.AnimaAutoBlocks")
    def test_build_pipeline_rejects_missing_metadata_before_loading_local_weights(
        self,
        auto_blocks_class,
        load_file,
        load_transformer,
        load_conditioner,
        load_qwen3,
        load_vae,
    ):
        pipe = Mock()
        pipe.components = {
            "tokenizer": Mock(name="tokenizer"),
            "t5_tokenizer": None,
            "scheduler": Mock(name="scheduler"),
        }
        auto_blocks_class.return_value.init_pipeline.return_value = pipe

        with self.assertRaisesRegex(ValueError, rf"t5_tokenizer.*{ANIMA_BASE_REPO}"):
            build_anima_single_file_pipeline(
                "/models/anima.safetensors",
                "/models/qwen.safetensors",
                "/models/vae.safetensors",
                torch.bfloat16,
                validate_paths=False,
            )

        pipe.load_components.assert_called_once_with(names=["tokenizer", "t5_tokenizer", "scheduler"])
        load_file.assert_not_called()
        load_transformer.assert_not_called()
        load_conditioner.assert_not_called()
        load_qwen3.assert_not_called()
        load_vae.assert_not_called()

    def test_safetensors_path_selects_single_file(self):
        self.assertEqual(select_anima_loading_mode("/models/anima.safetensors"), "single_file")

    def test_hub_id_and_directory_select_pipeline(self):
        self.assertEqual(select_anima_loading_mode("circlestone-labs/Anima-Base-v1.0-Diffusers"), "pipeline")
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(select_anima_loading_mode(directory), "pipeline")

    def test_existing_non_safetensors_file_is_rejected(self):
        with tempfile.NamedTemporaryFile(suffix=".bin") as checkpoint:
            with self.assertRaisesRegex(ValueError, r"Anima model checkpoint.*\.safetensors"):
                select_anima_loading_mode(checkpoint.name)

    def test_validate_local_safetensors_rejects_invalid_values(self):
        with self.assertRaisesRegex(ValueError, "must not be blank"):
            validate_local_safetensors("  ", "Text encoder")
        with self.assertRaisesRegex(FileNotFoundError, r"Text encoder.*missing"):
            validate_local_safetensors("/tmp/missing-anima-text-encoder.safetensors", "Text encoder")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "must be a file"):
                validate_local_safetensors(directory, "Text encoder")
        with tempfile.NamedTemporaryFile(suffix=".bin") as checkpoint:
            with self.assertRaisesRegex(ValueError, r"Text encoder.*\.safetensors"):
                validate_local_safetensors(checkpoint.name, "Text encoder")
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as checkpoint:
            self.assertEqual(validate_local_safetensors(checkpoint.name, "Text encoder"), os.path.abspath(checkpoint.name))

    def test_split_checkpoint_separates_transformer_and_conditioner(self):
        transformer, conditioner = split_anima_checkpoint_state_dict(
            {
                "net.block.weight": "transformer",
                "net.llm_adapter.proj.weight": "conditioner",
                "other.weight": "ignored",
            }
        )
        self.assertEqual(transformer, {"net.block.weight": "transformer"})
        self.assertEqual(conditioner, {"proj.weight": "conditioner"})

    def test_split_checkpoint_requires_both_groups(self):
        with self.assertRaisesRegex(ValueError, "transformer weights"):
            split_anima_checkpoint_state_dict({"net.llm_adapter.proj.weight": "conditioner"})
        with self.assertRaisesRegex(ValueError, "conditioner weights"):
            split_anima_checkpoint_state_dict({"net.block.weight": "transformer"})

    def test_normalize_qwen3_strips_model_prefix_and_rejects_duplicates(self):
        self.assertEqual(
            normalize_qwen3_state_dict({"model.layers.0.weight": "one", "lm_head.weight": "two"}),
            {"layers.0.weight": "one", "lm_head.weight": "two"},
        )
        with self.assertRaisesRegex(ValueError, "duplicate"):
            normalize_qwen3_state_dict({"model.layers.0.weight": "one", "layers.0.weight": "two"})

    def test_normalize_qwen_image_vae_maps_every_comfy_key_family(self):
        mappings = {
            "conv1.weight": "quant_conv.weight",
            "conv2.bias": "post_quant_conv.bias",
            "encoder.conv1.weight": "encoder.conv_in.weight",
            "decoder.conv1.bias": "decoder.conv_in.bias",
            "encoder.head.0.gamma": "encoder.norm_out.gamma",
            "encoder.head.2.weight": "encoder.conv_out.weight",
            "decoder.head.0.gamma": "decoder.norm_out.gamma",
            "decoder.head.2.bias": "decoder.conv_out.bias",
            "encoder.middle.0.residual.0.gamma": "encoder.mid_block.resnets.0.norm1.gamma",
            "encoder.middle.2.residual.6.weight": "encoder.mid_block.resnets.1.conv2.weight",
            "decoder.middle.0.residual.2.weight": "decoder.mid_block.resnets.0.conv1.weight",
            "decoder.middle.2.residual.3.gamma": "decoder.mid_block.resnets.1.norm2.gamma",
            "encoder.middle.1.to_qkv.weight": "encoder.mid_block.attentions.0.to_qkv.weight",
            "decoder.middle.1.proj.bias": "decoder.mid_block.attentions.0.proj.bias",
            "encoder.downsamples.0.residual.0.gamma": "encoder.down_blocks.0.norm1.gamma",
            "encoder.downsamples.1.residual.6.weight": "encoder.down_blocks.1.conv2.weight",
            "encoder.downsamples.3.residual.3.gamma": "encoder.down_blocks.3.norm2.gamma",
            "encoder.downsamples.3.residual.6.weight": "encoder.down_blocks.3.conv2.weight",
            "encoder.downsamples.3.shortcut.weight": "encoder.down_blocks.3.conv_shortcut.weight",
            "encoder.downsamples.2.resample.1.weight": "encoder.down_blocks.2.resample.1.weight",
            "encoder.downsamples.5.time_conv.weight": "encoder.down_blocks.5.time_conv.weight",
            "decoder.upsamples.0.residual.0.gamma": "decoder.up_blocks.0.resnets.0.norm1.gamma",
            "decoder.upsamples.1.residual.2.weight": "decoder.up_blocks.0.resnets.1.conv1.weight",
            "decoder.upsamples.2.residual.3.gamma": "decoder.up_blocks.0.resnets.2.norm2.gamma",
            "decoder.upsamples.3.resample.1.weight": "decoder.up_blocks.0.upsamplers.0.resample.1.weight",
            "decoder.upsamples.3.time_conv.bias": "decoder.up_blocks.0.upsamplers.0.time_conv.bias",
            "decoder.upsamples.4.residual.6.weight": "decoder.up_blocks.1.resnets.0.conv2.weight",
            "decoder.upsamples.4.shortcut.weight": "decoder.up_blocks.1.resnets.0.conv_shortcut.weight",
            "decoder.upsamples.5.residual.0.gamma": "decoder.up_blocks.1.resnets.1.norm1.gamma",
            "decoder.upsamples.6.residual.2.weight": "decoder.up_blocks.1.resnets.2.conv1.weight",
            "decoder.upsamples.7.resample.1.weight": "decoder.up_blocks.1.upsamplers.0.resample.1.weight",
            "decoder.upsamples.7.time_conv.weight": "decoder.up_blocks.1.upsamplers.0.time_conv.weight",
            "decoder.upsamples.8.residual.3.gamma": "decoder.up_blocks.2.resnets.0.norm2.gamma",
            "decoder.upsamples.9.residual.6.weight": "decoder.up_blocks.2.resnets.1.conv2.weight",
            "decoder.upsamples.10.residual.0.gamma": "decoder.up_blocks.2.resnets.2.norm1.gamma",
            "decoder.upsamples.11.resample.1.weight": "decoder.up_blocks.2.upsamplers.0.resample.1.weight",
            "decoder.upsamples.12.residual.2.weight": "decoder.up_blocks.3.resnets.0.conv1.weight",
            "decoder.upsamples.13.residual.3.gamma": "decoder.up_blocks.3.resnets.1.norm2.gamma",
            "decoder.upsamples.14.residual.6.weight": "decoder.up_blocks.3.resnets.2.conv2.weight",
            "encoder.down_blocks.0.conv1.weight": "encoder.down_blocks.0.conv1.weight",
        }
        for source_key, expected_key in mappings.items():
            with self.subTest(source_key=source_key):
                self.assertEqual(normalize_qwen_image_vae_state_dict({source_key: source_key}), {expected_key: source_key})

    def test_normalize_qwen_image_vae_rejects_key_collisions(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            normalize_qwen_image_vae_state_dict({"conv1.weight": 1, "quant_conv.weight": 2})


class AnimaModelRoutingTest(unittest.TestCase):
    def make_model(self, name_or_path):
        model = object.__new__(AnimaModel)
        model.model_config = SimpleNamespace(
            name_or_path=name_or_path,
            te_name_or_path="/models/qwen.safetensors",
            vae_path="/models/vae.safetensors",
            quantize=False,
            quantize_te=False,
            layer_offloading=False,
            low_vram=True,
        )
        model.torch_dtype = torch.bfloat16
        model.device_torch = torch.device("cpu")
        model.get_train_scheduler = Mock(return_value="training-scheduler")
        model.print_and_status_update = Mock()
        return model

    @staticmethod
    def make_pipeline():
        pipe = Mock()
        pipe.transformer = Mock(name="transformer")
        pipe.text_conditioner = Mock(name="text_conditioner")
        pipe.text_encoder = Mock(name="text_encoder")
        pipe.vae = Mock(name="vae")
        pipe.tokenizer = Mock(name="tokenizer")
        pipe.t5_tokenizer = Mock(name="t5_tokenizer")
        pipe.scheduler = Mock(name="scheduler")
        return pipe

    @patch(
        "extensions_built_in.diffusion_models.anima.anima.build_anima_single_file_pipeline"
    )
    @patch("extensions_built_in.diffusion_models.anima.anima.AnimaAutoBlocks")
    def test_load_model_routes_safetensors_to_component_assembly(
        self, auto_blocks_class, build_pipeline
    ):
        pipe = self.make_pipeline()
        build_pipeline.return_value = pipe
        model = self.make_model("/models/anima.safetensors")

        AnimaModel.load_model(model)

        build_pipeline.assert_called_once_with(
            "/models/anima.safetensors",
            "/models/qwen.safetensors",
            "/models/vae.safetensors",
            torch.bfloat16,
        )
        auto_blocks_class.assert_not_called()
        pipe.load_components.assert_not_called()
        pipe.update_components.assert_called_once_with(scheduler="training-scheduler")
        self.assertIs(model.noise_scheduler, pipe.scheduler)
        self.assertIs(model.vae, pipe.vae)
        self.assertEqual(model.text_encoder, [pipe.text_encoder])
        self.assertEqual(model.tokenizer, [pipe.tokenizer])
        self.assertIs(model.t5_tokenizer, pipe.t5_tokenizer)
        self.assertIsInstance(model.model, AnimaTrainableModel)
        self.assertIs(model.model.transformer, pipe.transformer)
        self.assertIs(model.model.text_conditioner, pipe.text_conditioner)
        self.assertIs(model.pipeline, pipe)
        pipe.transformer.to.assert_called_once_with("cpu")
        pipe.text_conditioner.to.assert_called_once_with("cpu")
        self.assertEqual(
            pipe.text_encoder.to.call_args_list,
            [call(torch.device("cpu"), dtype=torch.bfloat16), call("cpu")],
        )
        pipe.text_encoder.requires_grad_.assert_called_once_with(False)
        pipe.text_encoder.eval.assert_called_once_with()
        self.assertEqual(
            model.print_and_status_update.call_args_list,
            [
                call("Loading Anima model"),
                call("Moving transformer to CPU"),
                call("Model Loaded"),
            ],
        )

    @patch(
        "extensions_built_in.diffusion_models.anima.anima.build_anima_single_file_pipeline"
    )
    @patch("extensions_built_in.diffusion_models.anima.anima.AnimaAutoBlocks")
    def test_load_model_preserves_repository_pipeline_loading(
        self, auto_blocks_class, build_pipeline
    ):
        name_or_path = "circlestone-labs/Anima-Base-v1.0-Diffusers"
        pipe = self.make_pipeline()
        auto_blocks_class.return_value.init_pipeline.return_value = pipe
        model = self.make_model(name_or_path)

        AnimaModel.load_model(model)

        build_pipeline.assert_not_called()
        auto_blocks_class.return_value.init_pipeline.assert_called_once_with(name_or_path)
        pipe.load_components.assert_called_once_with(torch_dtype=torch.bfloat16)
        pipe.update_components.assert_called_once_with(scheduler="training-scheduler")

    @patch(
        "extensions_built_in.diffusion_models.anima.anima.build_anima_single_file_pipeline"
    )
    @patch("extensions_built_in.diffusion_models.anima.anima.AnimaAutoBlocks")
    def test_load_model_preserves_local_diffusers_directory_loading(
        self, auto_blocks_class, build_pipeline
    ):
        pipe = self.make_pipeline()
        auto_blocks_class.return_value.init_pipeline.return_value = pipe
        with tempfile.TemporaryDirectory() as directory:
            model = self.make_model(directory)

            AnimaModel.load_model(model)

            build_pipeline.assert_not_called()
            auto_blocks_class.return_value.init_pipeline.assert_called_once_with(directory)
            pipe.load_components.assert_called_once_with(
                torch_dtype=torch.bfloat16,
                pretrained_model_name_or_path=os.path.abspath(directory),
            )
            pipe.update_components.assert_called_once_with(scheduler="training-scheduler")


if __name__ == "__main__":
    unittest.main()
