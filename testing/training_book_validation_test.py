import json
import shutil
import subprocess
import tempfile
import unittest
from copy import deepcopy
from dataclasses import FrozenInstanceError
from pathlib import Path
import sys

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT))

from scripts.training_book.manifest import (
    BookManifest,
    load_book_manifest,
    validate_book_manifest,
)


FULL_ARCHITECTURES = (
    "anima", "flux", "flux_kontext", "flex1", "flex2", "chroma", "zeta_chroma",
    "wan21:1b", "wan21_i2v:14b480p", "wan21_i2v:14b", "wan21:14b",
    "wan22_14b:t2v", "wan22_14b_i2v", "wan22_5b", "lumina2", "qwen_image",
    "qwen_image:2512", "qwen_image_edit", "qwen_image_edit_plus",
    "qwen_image_edit_plus:2511", "hidream", "hidream_e1", "sdxl", "sd15",
    "omnigen2", "flux2", "zimage:turbo", "zimage", "zimage:deturbo",
    "minimax_h3", "ltx2", "ltx2.3", "ltx2.5", "flux2_klein_4b", "ernie_image",
    "flux2_klein_9b", "ace_step_15_xl", "ace_step_15", "nucleus_image",
    "hidream_o1", "zimage_l2p", "ideogram4", "prx_pixel", "krea2",
    "krea2:turbo", "krea2:o_edit", "krea2:o_edit_turbo", "mageflow",
    "mageflow_edit", "boogu_image", "boogu_image_edit",
)

BOOK_PAGES = (
    "README.md",
    "getting-started/prerequisites.md",
    "getting-started/choose-a-model.md",
    "getting-started/first-lora.md",
    "getting-started/training-mental-model.md",
    "datasets/curation.md",
    "datasets/captions-and-triggers.md",
    "datasets/resolution-and-bucketing.md",
    "datasets/masks.md",
    "datasets/controls-video-audio.md",
    "datasets/rights-privacy-and-safety.md",
    "workflow/simple-ui.md",
    "workflow/sampling-and-evaluation.md",
    "workflow/loss-and-checkpoints.md",
    "workflow/queue-and-multiple-gpus.md",
    "workflow/saving-resuming-and-optimizer-state.md",
    "recipes/character-identity.md",
    "recipes/style.md",
    "recipes/object-concept.md",
    "recipes/focused-refinement.md",
    "recipes/low-vram.md",
    "recipes/diagnostic-run.md",
    "models/anima.md",
    "models/flux-and-flex.md",
    "models/qwen-image-and-edit.md",
    "models/sdxl-and-sd15.md",
    "models/wan.md",
    "reference/job-and-model.md",
    "reference/network.md",
    "reference/training.md",
    "reference/dataset.md",
    "reference/masks-and-preservation.md",
    "reference/saving-and-sampling.md",
    "reference/optimizers-and-schedulers.md",
    "reference/advanced-only-settings.md",
    "advanced/yaml-and-cli.md",
    "advanced/layer-targeting.md",
    "advanced/performance-and-caching.md",
    "advanced/extending-and-debugging.md",
    "troubleshooting/diagnosis-guide.md",
    "troubleshooting/common-failure-patterns.md",
    "verification/first-run-smoke.md",
    "examples/README.md",
    "glossary.md",
)


class ManifestContractTests(unittest.TestCase):
    def valid_manifest(self):
        return {
            "schema_version": 1,
            "book_revision": 1,
            "verified_date": "2026-08-14",
            "pages": [
                {"path": "README.md", "previous": None, "next": "glossary.md"},
                {"path": "glossary.md", "previous": "README.md", "next": None},
            ],
            "preset_architectures": ["anima"],
            "focused_architectures": ["anima", "flux"],
            "full_architectures": ["anima", "flux"],
            "required_footer": (
                "Verified against ai-toolkit-experimental book revision 1 "
                "(2026-08-14)."
            ),
        }

    def write_manifest(self, data):
        path = Path(self.directory.name) / "book-manifest.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def write_raw_manifest(self, data):
        path = Path(self.directory.name) / "book-manifest.json"
        path.write_text(data, encoding="utf-8")
        return path

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)

    def test_manifest_loads_into_immutable_ordered_types(self):
        manifest = load_book_manifest(self.write_manifest(self.valid_manifest()))

        validate_book_manifest(
            manifest, expected_full_architectures=("anima", "flux")
        )

        self.assertEqual(
            tuple(page.path for page in manifest.pages),
            ("README.md", "glossary.md"),
        )
        self.assertEqual(manifest.full_architectures, ("anima", "flux"))
        with self.assertRaisesRegex(FrozenInstanceError, "cannot assign"):
            manifest.book_revision = 2

    def test_manifest_rejects_duplicate_pages(self):
        data = self.valid_manifest()
        data["pages"][1]["path"] = "README.md"

        with self.assertRaisesRegex(ValueError, "pages.*README[.]md"):
            validate_book_manifest(
                load_book_manifest(self.write_manifest(data)),
                expected_full_architectures=("anima", "flux"),
            )

    def test_manifest_rejects_broken_previous_and_next_links(self):
        cases = (
            ("next", "missing.md"),
            ("previous", None),
        )
        for field, value in cases:
            with self.subTest(field=field, value=value):
                data = self.valid_manifest()
                page_index = 0 if field == "next" else 1
                data["pages"][page_index][field] = value

                with self.assertRaisesRegex(ValueError, field):
                    validate_book_manifest(
                        load_book_manifest(self.write_manifest(data)),
                        expected_full_architectures=("anima", "flux"),
                    )

    def test_manifest_rejects_page_outside_docs_book(self):
        for path in (
            "../outside.md",
            "/absolute.md",
            "C:/absolute.md",
            "C:drive-relative.md",
            ".",
            "nested/./alias.md",
            "nested//alias.md",
            "https://example.com/page.md",
            "nested\\windows.md",
        ):
            with self.subTest(path=path):
                data = self.valid_manifest()
                data["pages"][0]["path"] = path

                with self.assertRaisesRegex(ValueError, "pages.*path"):
                    validate_book_manifest(
                        load_book_manifest(self.write_manifest(data)),
                        expected_full_architectures=("anima", "flux"),
                    )

    def test_manifest_rejects_mutable_page_collection(self):
        loaded = load_book_manifest(self.write_manifest(self.valid_manifest()))
        manifest = BookManifest(
            schema_version=loaded.schema_version,
            book_revision=loaded.book_revision,
            verified_date=loaded.verified_date,
            pages=list(loaded.pages),
            preset_architectures=loaded.preset_architectures,
            focused_architectures=loaded.focused_architectures,
            full_architectures=loaded.full_architectures,
            required_footer=loaded.required_footer,
        )

        with self.assertRaisesRegex(ValueError, "pages"):
            validate_book_manifest(
                manifest, expected_full_architectures=("anima", "flux")
            )

    def test_manifest_rejects_self_links(self):
        data = self.valid_manifest()
        data["pages"][0]["next"] = "README.md"

        with self.assertRaisesRegex(ValueError, "next.*README[.]md"):
            validate_book_manifest(
                load_book_manifest(self.write_manifest(data)),
                expected_full_architectures=("anima", "flux"),
            )

    def test_manifest_rejects_duplicate_architectures(self):
        for field in (
            "preset_architectures",
            "focused_architectures",
            "full_architectures",
        ):
            with self.subTest(field=field):
                data = self.valid_manifest()
                data[field].append(data[field][0])

                with self.assertRaisesRegex(ValueError, f"{field}.*anima"):
                    validate_book_manifest(
                        load_book_manifest(self.write_manifest(data)),
                        expected_full_architectures=tuple(data["full_architectures"]),
                    )

    def test_manifest_rejects_missing_footer_field(self):
        data = self.valid_manifest()
        del data["required_footer"]

        with self.assertRaisesRegex(ValueError, "required_footer"):
            load_book_manifest(self.write_manifest(data))

    def test_manifest_rejects_architecture_set_or_order_mismatch(self):
        manifest = load_book_manifest(self.write_manifest(self.valid_manifest()))
        for expected in (("anima",), ("flux", "anima")):
            with self.subTest(expected=expected):
                with self.assertRaisesRegex(ValueError, "full_architectures"):
                    validate_book_manifest(
                        manifest, expected_full_architectures=expected
                    )

    def test_manifest_rejects_architecture_subset_mismatch(self):
        for field in ("preset_architectures", "focused_architectures"):
            with self.subTest(field=field):
                data = self.valid_manifest()
                data[field].append("unknown")

                with self.assertRaisesRegex(ValueError, f"{field}.*unknown"):
                    validate_book_manifest(
                        load_book_manifest(self.write_manifest(data)),
                        expected_full_architectures=("anima", "flux"),
                    )

    def test_manifest_rejects_non_plain_json_shapes(self):
        cases = (
            ([], "manifest"),
            ({**self.valid_manifest(), "pages": {}}, "pages"),
            ({**self.valid_manifest(), "pages": ["README.md"]}, "pages"),
            (
                {**self.valid_manifest(), "preset_architectures": "anima"},
                "preset_architectures",
            ),
        )
        for data, field in cases:
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, field):
                    load_book_manifest(self.write_manifest(data))

    def test_manifest_rejects_duplicate_json_object_keys_at_every_depth(self):
        raw_manifests = (
            (
                '{"schema_version": 1, "schema_version": 2, '
                '"book_revision": 1, "verified_date": "2026-08-14", '
                '"pages": [], "preset_architectures": [], '
                '"focused_architectures": [], "full_architectures": [], '
                '"required_footer": "footer"}',
                "schema_version",
            ),
            (
                '{"schema_version": 1, "book_revision": 1, '
                '"verified_date": "2026-08-14", "pages": '
                '[{"path": "README.md", "path": "glossary.md", '
                '"previous": null, "next": null}], '
                '"preset_architectures": [], "focused_architectures": [], '
                '"full_architectures": [], "required_footer": "footer"}',
                "path",
            ),
        )
        for raw_manifest, duplicate_key in raw_manifests:
            with self.subTest(duplicate_key=duplicate_key):
                manifest_path = self.write_raw_manifest(raw_manifest)

                with self.assertRaisesRegex(ValueError, duplicate_key) as raised:
                    load_book_manifest(manifest_path)

                self.assertNotIn(str(manifest_path.parent), str(raised.exception))

    def test_manifest_rejects_boolean_and_nonpositive_integer_fields(self):
        for field, value in (
            ("schema_version", True),
            ("schema_version", 0),
            ("book_revision", False),
            ("book_revision", -1),
        ):
            with self.subTest(field=field, value=value):
                data = self.valid_manifest()
                data[field] = value

                with self.assertRaisesRegex(ValueError, f"{field}.*{value}"):
                    load_book_manifest(self.write_manifest(data))

    def test_manifest_rejects_non_iso_verified_dates(self):
        for value in ("2026-8-14", "2026-02-30", 20260814):
            with self.subTest(value=value):
                data = deepcopy(self.valid_manifest())
                data["verified_date"] = value

                with self.assertRaisesRegex(ValueError, "verified_date"):
                    load_book_manifest(self.write_manifest(data))


class BookArtifactTests(unittest.TestCase):
    def test_canonical_book_manifest_matches_the_published_contract(self):
        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")
        validate_book_manifest(
            manifest, expected_full_architectures=FULL_ARCHITECTURES
        )

        self.assertEqual(manifest.schema_version, 1)
        self.assertEqual(manifest.book_revision, 1)
        self.assertEqual(manifest.verified_date, "2026-08-14")
        self.assertEqual(
            manifest.required_footer,
            "Verified against ai-toolkit-experimental book revision 1 (2026-08-14).",
        )
        self.assertEqual(
            manifest.preset_architectures,
            (
                "anima", "flux", "flex1", "qwen_image", "qwen_image_edit_plus",
                "sdxl", "sd15", "wan21:1b", "wan22_14b:t2v",
            ),
        )
        self.assertEqual(
            manifest.focused_architectures,
            (
                "anima", "flux", "flux_kontext", "flex1", "qwen_image",
                "qwen_image:2512", "qwen_image_edit", "qwen_image_edit_plus",
                "qwen_image_edit_plus:2511", "sdxl", "sd15", "wan21:1b",
                "wan22_14b:t2v",
            ),
        )
        self.assertEqual(manifest.full_architectures, FULL_ARCHITECTURES)
        self.assertEqual(tuple(page.path for page in manifest.pages), BOOK_PAGES)

    def test_book_readme_has_the_skeletal_marker_contract(self):
        readme = (REPOSITORY_ROOT / "docs/book/README.md").read_text(encoding="utf-8")

        self.assertEqual(
            sum(line.startswith("# ") for line in readme.splitlines()), 1
        )
        self.assertIn("](README.md)", readme)
        for marker in (
            "<!-- book-navigation:start -->",
            "<!-- book-navigation:end -->",
            "<!-- book-verification:start -->",
            "<!-- book-verification:end -->",
        ):
            self.assertEqual(readme.count(marker), 1)

    def test_validation_cli_accepts_the_canonical_manifest(self):
        result = subprocess.run(
            [sys.executable, "scripts/validate_training_book.py"],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_runner_rejects_missing_training_book_package_initializer(self):
        with tempfile.TemporaryDirectory() as directory:
            repository_root = Path(directory)
            runner = repository_root / "ui/testing/runTrainingBookTests.mjs"
            runner.parent.mkdir(parents=True)
            shutil.copy(
                REPOSITORY_ROOT / "ui/testing/runTrainingBookTests.mjs", runner
            )
            for artifact in (
                "testing/training_book_validation_test.py",
                "scripts/validate_training_book.py",
                "scripts/training_book/manifest.py",
                "docs/book/book-manifest.json",
                "docs/book/README.md",
            ):
                artifact_path = repository_root / artifact
                artifact_path.parent.mkdir(parents=True, exist_ok=True)
                artifact_path.touch()

            result = subprocess.run(
                ["node", runner], capture_output=True, text=True, check=False
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("scripts/training_book/__init__.py", result.stderr)


if __name__ == "__main__":
    unittest.main()
