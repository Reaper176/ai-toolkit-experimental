import json
import tempfile
import unittest
from pathlib import Path

import torch

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


if __name__ == "__main__":
    unittest.main()
