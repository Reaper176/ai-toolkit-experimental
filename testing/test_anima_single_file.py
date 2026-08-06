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

    def test_normalize_qwen_image_vae_maps_comfy_keys_and_preserves_official_keys(self):
        state_dict = {
            "conv1.weight": 1,
            "encoder.downsamples.3.shortcut.weight": 2,
            "decoder.upsamples.7.time_conv.weight": 3,
            "decoder.middle.1.to_qkv.weight": 4,
            "encoder.down_blocks.0.resnets.0.conv1.weight": 5,
            "encoder.downsamples.0.residual.0.weight": 6,
            "decoder.upsamples.0.residual.6.weight": 7,
        }
        self.assertEqual(
            normalize_qwen_image_vae_state_dict(state_dict),
            {
                "quant_conv.weight": 1,
                "encoder.down_blocks.3.conv_shortcut.weight": 2,
                "decoder.up_blocks.1.upsamplers.0.time_conv.weight": 3,
                "decoder.mid_block.attentions.0.to_qkv.weight": 4,
                "encoder.down_blocks.0.resnets.0.conv1.weight": 5,
                "encoder.down_blocks.0.resnets.0.norm1.weight": 6,
                "decoder.up_blocks.0.resnets.0.conv2.weight": 7,
            },
        )


if __name__ == "__main__":
    unittest.main()
