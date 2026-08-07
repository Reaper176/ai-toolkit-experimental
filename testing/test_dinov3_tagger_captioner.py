import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import torch
from accelerate import init_empty_weights
from PIL import Image

from extensions_built_in.captioner.dinov3_tagger.support import (
    CATEGORY_NAMES,
    DEFAULT_INCLUDED_CATEGORIES,
    EXACT_VOCAB_FILENAME,
    SOURCE_CATEGORY_NAMES,
    TaggerVocabulary,
    format_tags,
    load_vocabulary,
    resolve_vocab_path,
    select_tag_indices,
    validate_checkpoint_path,
)
from extensions_built_in.captioner.dinov3_tagger.model import (
    D_FFN,
    D_MODEL,
    FEATURE_DIM,
    HEAD_DIM,
    LN_EPS,
    N_HEADS,
    N_LAYERS,
    N_REGISTERS,
    PATCH_SIZE,
    ROPE_RESCALE,
    ROPE_THETA,
    DINOv3TaggerModel,
    apply_rope,
    build_projection_head,
    cast_backbone_state_dict,
    calculate_image_size,
    load_tagger_model,
    preprocess_image,
    split_checkpoint_state_dict,
    strict_assign,
)
from extensions_built_in.captioner.DINOv3TaggerCaptioner import (
    DINOv3TaggerCaptioner,
    DINOv3TaggerConfig,
)


class DINOv3TaggerSupportTest(unittest.TestCase):
    def write_vocab(self, path, tags=None, categories=None, **extra):
        if tags is None:
            tags = ["general tag", "character tag"]
        if categories is None:
            categories = {"general tag": 0, "character tag": 4}
        path.write_text(
            json.dumps({"idx2tag": tags, "tag2category": categories, **extra}),
            encoding="utf-8",
        )

    def test_category_constants_and_vocabulary_are_immutable(self):
        self.assertEqual(
            EXACT_VOCAB_FILENAME,
            "tagger_vocab_with_categories_and_alias_updated.json",
        )
        self.assertEqual(
            CATEGORY_NAMES,
            (
                "unassigned",
                "general",
                "artist",
                "contributor",
                "copyright",
                "character",
                "species_meta",
                "disambiguation",
                "meta",
                "lore",
            ),
        )
        self.assertEqual(
            SOURCE_CATEGORY_NAMES,
            {
                -1: "unassigned",
                0: "general",
                1: "artist",
                2: "contributor",
                3: "copyright",
                4: "character",
                5: "species_meta",
                6: "disambiguation",
                7: "meta",
                8: "lore",
            },
        )
        self.assertEqual(
            DEFAULT_INCLUDED_CATEGORIES,
            frozenset({"general", "character", "species_meta"}),
        )
        original_unassigned = SOURCE_CATEGORY_NAMES[-1]
        try:
            with self.assertRaises(TypeError):
                SOURCE_CATEGORY_NAMES[-1] = "changed"
        finally:
            if SOURCE_CATEGORY_NAMES[-1] != original_unassigned:
                SOURCE_CATEGORY_NAMES[-1] = original_unassigned
        vocabulary = TaggerVocabulary("/tmp/vocab.json", ("tag",), ("general",))
        with self.assertRaises(AttributeError):
            vocabulary.path = "/tmp/other.json"

    def test_checkpoint_must_be_nonblank_existing_safetensors_file(self):
        with self.assertRaisesRegex(ValueError, "checkpoint.*must not be blank"):
            validate_checkpoint_path(" ")
        with self.assertRaisesRegex(FileNotFoundError, "checkpoint.*missing"):
            validate_checkpoint_path("/tmp/missing-dinov3.safetensors")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "checkpoint.*must be a file"):
                validate_checkpoint_path(directory)
        with tempfile.NamedTemporaryFile(suffix=".pt") as checkpoint:
            with self.assertRaisesRegex(ValueError, "checkpoint.*safetensors"):
                validate_checkpoint_path(checkpoint.name)
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as checkpoint:
            self.assertEqual(
                validate_checkpoint_path(checkpoint.name),
                str(Path(checkpoint.name).resolve()),
            )

    def test_explicit_vocab_path_is_validated_and_normalized(self):
        with tempfile.NamedTemporaryFile(suffix=".safetensors") as checkpoint:
            with self.assertRaisesRegex(FileNotFoundError, "vocabulary.*missing"):
                resolve_vocab_path(checkpoint.name, "/tmp/missing-vocab.json")
            with tempfile.TemporaryDirectory() as directory:
                with self.assertRaisesRegex(ValueError, "vocabulary.*must be a file"):
                    resolve_vocab_path(checkpoint.name, directory)
            with tempfile.NamedTemporaryFile(suffix=".txt") as vocab:
                with self.assertRaisesRegex(ValueError, "vocabulary.*must be JSON"):
                    resolve_vocab_path(checkpoint.name, vocab.name)
            with tempfile.NamedTemporaryFile(suffix=".json") as vocab:
                self.assertEqual(
                    resolve_vocab_path(checkpoint.name, vocab.name),
                    str(Path(vocab.name).resolve()),
                )

    def test_exact_adjacent_vocab_name_wins(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            exact = root / EXACT_VOCAB_FILENAME
            fallback = root / "other_vocab.json"
            self.write_vocab(exact)
            self.write_vocab(fallback)
            self.assertEqual(resolve_vocab_path(str(checkpoint), None), str(exact))

    def test_one_fallback_vocab_is_discovered(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            fallback = root / "custom_vocab.json"
            self.write_vocab(fallback)
            self.assertEqual(resolve_vocab_path(str(checkpoint), None), str(fallback))

    def test_fallback_vocab_discovery_supports_metacharacters_in_directory_names(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "tagger[local]"
            root.mkdir()
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            fallback = root / "custom_vocab.json"
            self.write_vocab(fallback)
            self.assertEqual(resolve_vocab_path(str(checkpoint), None), str(fallback))

    def test_zero_or_multiple_vocab_candidates_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            checkpoint = root / "tagger.safetensors"
            checkpoint.touch()
            with self.assertRaisesRegex(FileNotFoundError, "configure vocab_path"):
                resolve_vocab_path(str(checkpoint), None)
            self.write_vocab(root / "z_vocab.json")
            self.write_vocab(root / "a_vocab.json")
            with self.assertRaisesRegex(
                ValueError, "Multiple.*a_vocab.*z_vocab.*configure vocab_path"
            ):
                resolve_vocab_path(str(checkpoint), None)

    def test_vocab_loads_tags_and_categories_in_vocabulary_order(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vocab.json"
            self.write_vocab(
                path,
                ["general tag", "unassigned tag", "lore tag"],
                {"general tag": 0, "unassigned tag": -1, "lore tag": 8},
            )
            vocabulary = load_vocabulary(str(path))
            self.assertEqual(vocabulary.path, str(path.resolve()))
            self.assertEqual(
                vocabulary.tags,
                ("general tag", "unassigned tag", "lore tag"),
            )
            self.assertEqual(
                vocabulary.categories,
                ("general", "unassigned", "lore"),
            )

    def test_vocab_rejects_malformed_json_and_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vocab.json"
            path.write_text("not json", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "vocabulary.*vocab.json"):
                load_vocabulary(str(path))
            path.write_bytes(b"\xff")
            with self.assertRaisesRegex(ValueError, "Failed to read.*vocab.json"):
                load_vocabulary(str(path))
            path.write_text(json.dumps([]), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid root"):
                load_vocabulary(str(path))
            self.write_vocab(path, [])
            with self.assertRaisesRegex(ValueError, "invalid idx2tag"):
                load_vocabulary(str(path))
            self.write_vocab(path, [""], {"": 0})
            with self.assertRaisesRegex(ValueError, "invalid idx2tag"):
                load_vocabulary(str(path))
            self.write_vocab(path, ["tag"], [])
            with self.assertRaisesRegex(ValueError, "invalid tag2category"):
                load_vocabulary(str(path))

    def test_vocab_missing_categories_become_unassigned_and_extras_are_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vocab.json"
            self.write_vocab(
                path,
                ["known", "missing one", "missing two", "missing three"],
                {"known": 0, "unmatched mapping key": 5},
            )
            vocabulary = load_vocabulary(str(path))
            self.assertEqual(
                vocabulary.categories,
                ("general", "unassigned", "unassigned", "unassigned"),
            )

    def test_vocab_rejects_duplicate_and_unknown_categories(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vocab.json"
            self.write_vocab(path, ["duplicate", "duplicate"], {"duplicate": 0})
            with self.assertRaisesRegex(ValueError, "duplicate"):
                load_vocabulary(str(path))
            self.write_vocab(path, ["tag"], {"tag": "general"})
            with self.assertRaisesRegex(ValueError, "non-integer category"):
                load_vocabulary(str(path))
            self.write_vocab(path, ["tag"], {"tag": True})
            with self.assertRaisesRegex(ValueError, "non-integer category"):
                load_vocabulary(str(path))
            self.write_vocab(path, ["tag"], {"tag": 99})
            with self.assertRaisesRegex(ValueError, "unsupported category 99"):
                load_vocabulary(str(path))

    def test_selection_filters_categories_before_threshold_or_top_k(self):
        scores = torch.tensor([0.90, 0.80, 0.70, 0.60])
        categories = ["general", "artist", "character", "species_meta"]
        included = {"general", "character", "species_meta"}
        self.assertEqual(
            select_tag_indices(
                scores,
                categories,
                included_categories=included,
                mode="threshold",
                threshold=0.65,
                top_k=30,
            ),
            [0, 2],
        )
        self.assertEqual(
            select_tag_indices(
                scores,
                categories,
                included_categories=included,
                mode="top_k",
                threshold=0.5,
                top_k=2,
            ),
            [0, 2],
        )

    def test_selection_returns_empty_allowed_result_and_stable_ties(self):
        self.assertEqual(
            select_tag_indices(
                torch.tensor([0.2, 0.1]),
                ["general", "general"],
                included_categories={"general"},
                mode="threshold",
                threshold=0.5,
                top_k=2,
            ),
            [],
        )
        self.assertEqual(
            select_tag_indices(
                torch.tensor([0.8, 0.8, 0.8]),
                ["general"] * 3,
                included_categories={"general"},
                mode="top_k",
                threshold=0.5,
                top_k=3,
            ),
            [0, 1, 2],
        )

    def test_selection_arguments_are_validated(self):
        scores = torch.tensor([0.5])
        kwargs = {
            "categories": ["general"],
            "included_categories": {"general"},
            "mode": "threshold",
            "threshold": 0.5,
            "top_k": 30,
        }
        with self.assertRaisesRegex(ValueError, "one-dimensional lengths"):
            select_tag_indices(torch.tensor([[0.5]]), **kwargs)
        with self.assertRaisesRegex(ValueError, "one-dimensional lengths"):
            select_tag_indices(scores, **{**kwargs, "categories": []})
        with self.assertRaisesRegex(ValueError, "Unknown"):
            select_tag_indices(
                scores, **{**kwargs, "included_categories": {"not-a-category"}}
            )
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            select_tag_indices(scores, **{**kwargs, "mode": "everything"})
        with self.assertRaisesRegex(ValueError, "between 0 and 1"):
            select_tag_indices(scores, **{**kwargs, "threshold": 1.1})
        with self.assertRaisesRegex(ValueError, "positive"):
            select_tag_indices(scores, **{**kwargs, "top_k": 0})
        with self.assertRaisesRegex(ValueError, "finite"):
            select_tag_indices(
                torch.tensor([float("nan")]),
                **{**kwargs, "mode": "threshold"},
            )
        with self.assertRaisesRegex(ValueError, "finite"):
            select_tag_indices(
                torch.tensor([float("inf")]),
                **{**kwargs, "mode": "top_k"},
            )

    def test_tag_formatting_supports_all_approved_modes(self):
        tags = ["looking at viewer", "character (series)"]
        self.assertEqual(
            format_tags(tags, use_underscores=False, escape_parentheses=False),
            "looking at viewer, character (series)",
        )
        self.assertEqual(
            format_tags(tags, use_underscores=True, escape_parentheses=True),
            r"looking_at_viewer, character_\(series\)",
        )


class DINOv3TaggerModelTest(unittest.TestCase):
    def test_fixed_vith16_plus_configuration(self):
        self.assertEqual(
            (
                D_MODEL,
                N_HEADS,
                HEAD_DIM,
                N_LAYERS,
                D_FFN,
                N_REGISTERS,
                PATCH_SIZE,
                ROPE_THETA,
                ROPE_RESCALE,
                LN_EPS,
                FEATURE_DIM,
            ),
            (1280, 20, 64, 32, 5120, 4, 16, 100.0, 2.0, 1e-5, 6400),
        )
        with init_empty_weights():
            model = DINOv3TaggerModel(torch.nn.Identity())
        self.assertEqual(len(model.backbone.layer), 32)
        self.assertEqual(
            tuple(model.backbone.embeddings.patch_embeddings.weight.shape),
            (1280, 3, 16, 16),
        )
        self.assertFalse(model.backbone.layer[0].attention.k_proj.bias is not None)

    def test_rope_leaves_cls_and_register_tokens_unchanged(self):
        query = torch.arange(1 * 1 * 7 * 64, dtype=torch.float32).reshape(1, 1, 7, 64)
        key = query + 1
        cos = torch.zeros(1, 1, 2, 64)
        sin = torch.ones(1, 1, 2, 64)
        rotated_query, rotated_key = apply_rope(query, key, cos, sin)
        self.assertTrue(torch.equal(rotated_query[..., :5, :], query[..., :5, :]))
        self.assertTrue(torch.equal(rotated_key[..., :5, :], key[..., :5, :]))
        self.assertFalse(torch.equal(rotated_query[..., 5:, :], query[..., 5:, :]))

    def test_split_normalizes_backbone_keys_and_keeps_dense_head(self):
        backbone, head = split_checkpoint_state_dict(
            {
                "backbone.model.layer.0.layer_scale1.lambda1": torch.ones(2),
                "backbone.embeddings.patch_embeddings.weight": torch.ones(2, 3, 1, 1),
                "backbone.rope_embeddings.buffer": torch.ones(1),
                "projection.weight": torch.ones(3, FEATURE_DIM),
            },
            "/models/tagger.safetensors",
        )
        self.assertEqual(
            set(backbone),
            {"layer.0.layer_scale1", "embeddings.patch_embeddings.weight"},
        )
        self.assertEqual(set(head), {"projection.weight"})

    def test_split_rejects_duplicate_normalized_keys(self):
        with self.assertRaisesRegex(ValueError, "Duplicate.*layer.0.layer_scale1"):
            split_checkpoint_state_dict(
                {
                    "backbone.model.layer.0.layer_scale1": torch.ones(2),
                    "backbone.model.layer.0.layer_scale1.lambda1": torch.ones(2),
                    "projection.weight": torch.ones(3, FEATURE_DIM),
                },
                "/models/tagger.safetensors",
            )

    def test_split_drops_only_exact_known_rope_cache_paths(self):
        backbone, _ = split_checkpoint_state_dict(
            {
                "backbone.norm.weight": torch.ones(2),
                "backbone.rope_embeddings.buffer": torch.ones(1),
                "backbone.rope_embeddings.inv_freq": torch.ones(1),
                "backbone.unknown.rope_embeddings.buffer": torch.ones(1),
                "backbone.rope_embeddings.weight": torch.ones(2),
                "projection.weight": torch.ones(3, FEATURE_DIM),
            },
            "/models/tagger.safetensors",
        )
        self.assertEqual(
            set(backbone),
            {
                "norm.weight",
                "unknown.rope_embeddings.buffer",
                "rope_embeddings.weight",
            },
        )
        tiny = torch.nn.Linear(2, 2)
        with self.assertRaisesRegex(
            ValueError, "Unexpected key.*unknown.rope_embeddings.buffer"
        ):
            strict_assign(
                tiny,
                {
                    "weight": torch.ones(2, 2),
                    "bias": torch.ones(2),
                    "unknown.rope_embeddings.buffer": torch.ones(1),
                },
                "tiny backbone",
                "/models/tagger.safetensors",
            )

    def test_split_rejects_missing_backbone_or_head(self):
        with self.assertRaisesRegex(ValueError, "backbone.*tagger.safetensors"):
            split_checkpoint_state_dict(
                {"projection.weight": torch.ones(3, FEATURE_DIM)},
                "/models/tagger.safetensors",
            )
        with self.assertRaisesRegex(ValueError, "projection-head.*tagger.safetensors"):
            split_checkpoint_state_dict(
                {"backbone.norm.weight": torch.ones(2)},
                "/models/tagger.safetensors",
            )

    def test_dense_head_is_inferred_from_vocab_and_feature_dimensions(self):
        weight = torch.ones(3, FEATURE_DIM)
        module, remapped = build_projection_head(
            {"projection.weight": weight}, 3, "/models/tagger.safetensors"
        )
        self.assertIsInstance(module, torch.nn.Linear)
        self.assertIsNone(module.bias)
        self.assertIs(remapped["weight"], weight)

    def test_low_rank_head_is_inferred_and_remapped(self):
        down = torch.ones(4, FEATURE_DIM)
        up = torch.ones(3, 4)
        module, remapped = build_projection_head(
            {"projection.down.weight": down, "projection.up.weight": up},
            3,
            "/models/tagger.safetensors",
        )
        self.assertEqual(module.proj_down.out_features, 4)
        self.assertEqual(module.proj_up.out_features, 3)
        self.assertEqual(set(remapped), {"proj_down.weight", "proj_up.weight"})

    def test_head_rejects_vocab_mismatch_extra_and_ambiguous_weights(self):
        with self.assertRaisesRegex(
            ValueError, "output.*vocabulary.*tagger.safetensors"
        ):
            build_projection_head(
                {"projection.weight": torch.ones(4, FEATURE_DIM)},
                3,
                "/models/tagger.safetensors",
            )
        with self.assertRaisesRegex(ValueError, "extra.*projection.extra"):
            build_projection_head(
                {
                    "projection.weight": torch.ones(3, FEATURE_DIM),
                    "projection.extra": torch.ones(1),
                },
                3,
                "/models/tagger.safetensors",
            )
        with self.assertRaisesRegex(ValueError, "infer.*tagger.safetensors"):
            build_projection_head(
                {
                    "projection.a.weight": torch.ones(4, FEATURE_DIM),
                    "projection.b.weight": torch.ones(5, FEATURE_DIM),
                    "projection.up.weight": torch.ones(3, 4),
                },
                3,
                "/models/tagger.safetensors",
            )

    def test_head_rejects_malformed_bias_shapes(self):
        with self.assertRaisesRegex(ValueError, "bias.*shape"):
            build_projection_head(
                {
                    "projection.weight": torch.ones(3, FEATURE_DIM),
                    "projection.bias": torch.ones(4),
                },
                3,
                "/models/tagger.safetensors",
            )

    def test_backbone_casting_changes_only_floating_tensors(self):
        original_int = torch.tensor([1], dtype=torch.int64)
        state = {
            "weight": torch.ones(2, dtype=torch.float32),
            "already": torch.ones(2, dtype=torch.bfloat16),
            "counter": original_int,
        }
        result = cast_backbone_state_dict(state, torch.bfloat16)
        self.assertIs(result, state)
        self.assertEqual(state["weight"].dtype, torch.bfloat16)
        self.assertEqual(state["already"].dtype, torch.bfloat16)
        self.assertIs(state["counter"], original_int)

    def test_strict_assign_wraps_incompatibility_with_path(self):
        model = Mock()
        model.load_state_dict.side_effect = RuntimeError("size mismatch")
        with self.assertRaisesRegex(
            ValueError, "DINOv3 backbone.*tagger.safetensors.*size mismatch"
        ):
            strict_assign(model, {}, "DINOv3 backbone", "/models/tagger.safetensors")
        model.load_state_dict.assert_called_once_with({}, strict=True, assign=True)

    def test_strict_assign_rejects_remaining_meta_parameters(self):
        module = torch.nn.Linear(2, 2, device="meta")
        with self.assertRaisesRegex(ValueError, "meta parameters remain.*bias"):
            strict_assign(
                module,
                {"weight": torch.ones(2, 2), "bias": torch.ones(2, device="meta")},
                "tiny component",
                "/models/tagger.safetensors",
            )

    def test_resize_preserves_aspect_never_upscales_and_snaps(self):
        cases = (
            ((1000, 500), 512, (512, 256)),
            ((500, 1000), 512, (256, 512)),
            ((64, 32), 512, (64, 32)),
            ((101, 51), 512, (96, 48)),
            ((100, 99), 512, (96, 80)),
            ((10000, 1), 512, (512, 16)),
        )
        for original, max_res, expected in cases:
            with self.subTest(original=original):
                self.assertEqual(calculate_image_size(*original, max_res), expected)
        with self.assertRaisesRegex(ValueError, "max_res"):
            calculate_image_size(100, 100, 0)

    def test_preprocess_uses_expected_shape_dtype_and_normalization(self):
        image = Image.new("RGB", (1000, 500), color="white")
        tensor = preprocess_image(image, max_res=512)
        self.assertEqual(tuple(tensor.shape), (1, 3, 256, 512))
        self.assertEqual(tensor.dtype, torch.float32)
        expected = torch.tensor(
            [(1 - 0.485) / 0.229, (1 - 0.456) / 0.224, (1 - 0.406) / 0.225]
        )
        self.assertTrue(torch.allclose(tensor[0, :, 0, 0], expected))

    @patch("extensions_built_in.captioner.dinov3_tagger.model.init_empty_weights")
    @patch("extensions_built_in.captioner.dinov3_tagger.model.DINOv3TaggerModel")
    @patch("extensions_built_in.captioner.dinov3_tagger.model.build_projection_head")
    @patch("extensions_built_in.captioner.dinov3_tagger.model.load_file")
    def test_loader_reads_once_casts_backbone_and_strictly_assigns_components(
        self, load_file, build_head, model_class, empty_weights
    ):
        checkpoint_state = {
            "backbone.norm.weight": torch.ones(2),
            "projection.weight": torch.ones(3, FEATURE_DIM, dtype=torch.float16),
        }
        load_file.return_value = checkpoint_state
        head = Mock()
        remapped_head = {"weight": checkpoint_state["projection.weight"]}
        build_head.return_value = (head, remapped_head)
        model = Mock()
        model.backbone = Mock()
        model.head = head
        model_class.return_value = model
        empty_weights.return_value.__enter__.return_value = None
        empty_weights.return_value.__exit__.return_value = None

        with patch(
            "extensions_built_in.captioner.dinov3_tagger.model.strict_assign",
            side_effect=lambda component, *_args: component,
        ) as assign:
            result = load_tagger_model(
                "/models/tagger.safetensors",
                3,
                device=torch.device("cpu"),
                dtype=torch.bfloat16,
            )

        self.assertIs(result, model)
        load_file.assert_called_once_with("/models/tagger.safetensors", device="cpu")
        empty_weights.assert_called_once_with()
        self.assertEqual(assign.call_count, 2)
        assigned_backbone = assign.call_args_list[0].args[1]
        self.assertEqual(assigned_backbone["norm.weight"].dtype, torch.bfloat16)
        self.assertEqual(
            assign.call_args_list[1].args[1]["weight"].dtype, torch.float32
        )
        model.backbone.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.bfloat16
        )
        model.head.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.float32
        )
        model.eval.assert_called_once_with()

    @patch("extensions_built_in.captioner.dinov3_tagger.model.load_file")
    def test_loader_wraps_checkpoint_read_failure(self, load_file):
        load_file.side_effect = OSError("broken header")
        with self.assertRaisesRegex(
            ValueError, "read.*tagger.safetensors.*broken header"
        ):
            load_tagger_model(
                "/models/tagger.safetensors",
                3,
                device=torch.device("cpu"),
                dtype=torch.bfloat16,
            )


class DINOv3TaggerCaptionerTest(unittest.TestCase):
    def config(self, **overrides):
        return DINOv3TaggerConfig(
            **{
                "model_name_or_path": "/models/tagger.safetensors",
                "extensions": ["jpg"],
                "path_to_caption": "/images",
                **overrides,
            }
        )

    def captioner(self, **config_overrides):
        captioner = object.__new__(DINOv3TaggerCaptioner)
        captioner.caption_config = self.config(**config_overrides)
        captioner.device_torch = torch.device("cpu")
        captioner.torch_dtype = torch.float32
        captioner.model = Mock(return_value=torch.tensor([[2.0, 3.0, -2.0]]))
        captioner.vocabulary = TaggerVocabulary(
            "/models/vocab.json",
            ("general tag", "artist tag", "character (name)"),
            ("general", "artist", "character"),
        )
        return captioner

    def test_config_has_approved_defaults_and_disables_quantization(self):
        config = self.config(quantize=True)
        self.assertIsNone(config.vocab_path)
        self.assertEqual(config.selection_mode, "threshold")
        self.assertEqual(config.threshold, 0.50)
        self.assertEqual(config.top_k, 30)
        self.assertEqual(config.included_categories, DEFAULT_INCLUDED_CATEGORIES)
        self.assertFalse(config.use_underscores)
        self.assertFalse(config.escape_parentheses)
        self.assertEqual(config.max_res, 1024)
        self.assertFalse(config.quantize)

    def test_config_rejects_invalid_tagger_options(self):
        invalid = (
            ({"selection_mode": "all"}, "selection_mode"),
            ({"threshold": -0.1}, "threshold"),
            ({"threshold": 1.1}, "threshold"),
            ({"top_k": 0}, "top_k"),
            ({"top_k": True}, "top_k"),
            ({"max_res": PATCH_SIZE - 1}, "max_res"),
            ({"max_res": True}, "max_res"),
            ({"included_categories": ["general", "unknown"]}, "Unknown"),
        )
        for options, message in invalid:
            with (
                self.subTest(options=options),
                self.assertRaisesRegex(ValueError, message),
            ):
                self.config(**options)

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.load_tagger_model")
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.load_vocabulary")
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.resolve_vocab_path")
    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.validate_checkpoint_path"
    )
    def test_load_validates_and_loads_vocab_before_model(
        self, validate, resolve, load_vocab, load_model
    ):
        events = []
        validate.side_effect = (
            lambda path: events.append("checkpoint") or "/real/model.safetensors"
        )
        resolve.side_effect = (
            lambda checkpoint, vocab: events.append("resolve") or "/real/vocab.json"
        )
        vocabulary = TaggerVocabulary(
            "/real/vocab.json", ("one", "two", "three"), ("general",) * 3
        )
        load_vocab.side_effect = lambda path: events.append("vocab") or vocabulary
        model = Mock()
        load_model.side_effect = lambda *args, **kwargs: events.append("model") or model
        captioner = self.captioner(vocab_path="/configured/vocab.json")
        captioner.model = None
        captioner.vocabulary = None
        captioner.print_and_status_update = Mock()

        captioner.load_model()

        self.assertEqual(events, ["checkpoint", "resolve", "vocab", "model"])
        resolve.assert_called_once_with(
            "/real/model.safetensors", "/configured/vocab.json"
        )
        load_model.assert_called_once_with(
            "/real/model.safetensors",
            3,
            device=torch.device("cpu"),
            dtype=torch.float32,
        )
        self.assertEqual(
            captioner.caption_config.model_name_or_path, "/real/model.safetensors"
        )
        self.assertEqual(captioner.caption_config.vocab_path, "/real/vocab.json")
        self.assertIs(captioner.vocabulary, vocabulary)
        self.assertIs(captioner.model, model)

    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.load_tagger_model",
        side_effect=RuntimeError("cannot build"),
    )
    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.load_vocabulary")
    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.resolve_vocab_path",
        return_value="/real/vocab.json",
    )
    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.validate_checkpoint_path",
        return_value="/real/model.safetensors",
    )
    def test_load_failure_leaves_no_partial_loaded_state(
        self, _validate, _resolve, load_vocab, _load_model
    ):
        load_vocab.return_value = TaggerVocabulary(
            "/real/vocab.json", ("one",), ("general",)
        )
        captioner = self.captioner()
        captioner.print_and_status_update = Mock()
        with self.assertRaisesRegex(RuntimeError, "cannot build"):
            captioner.load_model()
        self.assertIsNone(captioner.model)
        self.assertIsNone(captioner.vocabulary)

    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image",
        return_value=torch.zeros(1, 3, 16, 16),
    )
    def test_inference_masks_categories_before_threshold_and_formats(self, preprocess):
        captioner = self.captioner(
            threshold=0.5, use_underscores=True, escape_parentheses=True
        )
        captioner.model.return_value = torch.tensor([[2.0, 8.0, 1.0]])
        result = captioner.get_caption_for_file("/images/example.png")
        self.assertEqual(result, r"general_tag, character_\(name\)")
        preprocess.assert_called_once_with("/images/example.png", max_res=1024)

    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image",
        return_value=torch.zeros(1, 3, 16, 16),
    )
    def test_inference_supports_top_k_and_empty_threshold_results(self, _preprocess):
        captioner = self.captioner(selection_mode="top_k", top_k=1)
        captioner.model.return_value = torch.tensor([[1.0, 9.0, 2.0]])
        self.assertEqual(
            captioner.get_caption_for_file("/images/top-k.png"), "character (name)"
        )
        captioner.caption_config.selection_mode = "threshold"
        captioner.caption_config.threshold = 1.0
        with patch("builtins.print") as diagnostic:
            self.assertEqual(captioner.get_caption_for_file("/images/empty.png"), "")
        self.assertIn("/images/empty.png", diagnostic.call_args.args[0])

    def test_inference_requires_both_model_and_vocabulary(self):
        captioner = self.captioner()
        captioner.model = None
        with self.assertRaisesRegex(RuntimeError, "/images/unloaded.png.*not loaded"):
            captioner.get_caption_for_file("/images/unloaded.png")
        captioner.model = Mock()
        captioner.vocabulary = None
        with self.assertRaisesRegex(RuntimeError, "/images/unloaded.png.*not loaded"):
            captioner.get_caption_for_file("/images/unloaded.png")

    @patch(
        "extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image",
        side_effect=OSError("bad pixels"),
    )
    def test_inference_wraps_failures_with_image_path(self, _preprocess):
        captioner = self.captioner()
        with self.assertRaisesRegex(RuntimeError, "/images/broken.png.*bad pixels"):
            captioner.get_caption_for_file("/images/broken.png")

    def test_inference_does_not_swallow_process_control_exceptions(self):
        captioner = self.captioner()
        for exception in (KeyboardInterrupt(), SystemExit()):
            with (
                self.subTest(exception=type(exception).__name__),
                patch(
                    "extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image",
                    side_effect=exception,
                ),
                self.assertRaises(type(exception)),
            ):
                captioner.get_caption_for_file("/images/stopped.png")

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_inference_moves_fp32_pixels_to_cpu_with_model_dtype(self, preprocess):
        pixels = Mock()
        moved_pixels = Mock()
        pixels.to.return_value = moved_pixels
        preprocess.return_value = pixels
        captioner = self.captioner()

        captioner.get_caption_for_file("/images/device.png")

        pixels.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.float32
        )
        captioner.model.assert_called_once_with(moved_pixels)

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_inference_casts_pixels_to_bfloat16_for_cpu_bfloat16_model(
        self, preprocess
    ):
        pixels = Mock()
        moved_pixels = Mock()
        pixels.to.return_value = moved_pixels
        preprocess.return_value = pixels
        captioner = self.captioner()
        captioner.torch_dtype = torch.bfloat16

        captioner.get_caption_for_file("/images/cpu-bf16.png")

        pixels.to.assert_called_once_with(
            device=torch.device("cpu"), dtype=torch.bfloat16
        )
        captioner.model.assert_called_once_with(moved_pixels)

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.preprocess_image")
    def test_inference_rejects_cpu_float16_before_model_call(self, preprocess):
        preprocess.return_value = Mock()
        captioner = self.captioner()
        captioner.torch_dtype = torch.float16

        with self.assertRaisesRegex(
            RuntimeError, "/images/cpu-fp16.png.*CPU float16.*bf16 or fp32"
        ):
            captioner.get_caption_for_file("/images/cpu-fp16.png")

        captioner.model.assert_not_called()

    @patch("extensions_built_in.captioner.DINOv3TaggerCaptioner.torch.autocast")
    def test_autocast_is_limited_to_supported_accelerator_dtypes(self, autocast):
        cpu = self.captioner()
        with cpu._autocast_context():
            pass
        autocast.assert_not_called()
        cuda = self.captioner()
        cuda.device_torch = torch.device("cuda")
        cuda.torch_dtype = torch.bfloat16
        with cuda._autocast_context():
            pass
        autocast.assert_called_once_with(device_type="cuda", dtype=torch.bfloat16)
        autocast.reset_mock()
        cuda.torch_dtype = torch.float32
        with cuda._autocast_context():
            pass
        autocast.assert_not_called()

    def test_registry_appends_lazy_dinov3_extension(self):
        from extensions_built_in.captioner import AI_TOOLKIT_EXTENSIONS

        extension = AI_TOOLKIT_EXTENSIONS[-1]
        self.assertEqual(extension.uid, "DINOv3TaggerCaptioner")
        self.assertEqual(extension.name, "DINOv3 Tagger Captioner")
        self.assertIs(extension.get_process(), DINOv3TaggerCaptioner)


if __name__ == "__main__":
    unittest.main()
