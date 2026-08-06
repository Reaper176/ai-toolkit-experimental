import os
import tempfile
import unittest

from extensions_built_in.diffusion_models.anima.single_file import (
    normalize_qwen3_state_dict,
    normalize_qwen_image_vae_state_dict,
    select_anima_loading_mode,
    split_anima_checkpoint_state_dict,
    validate_local_safetensors,
)


class AnimaSingleFileTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
