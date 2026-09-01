import ast
import json
import os
import random
import re
import shutil
import struct
import subprocess
import tempfile
import unittest
from unittest import mock
from collections import OrderedDict
from copy import deepcopy
from dataclasses import FrozenInstanceError
from functools import cache
from pathlib import Path
import sys
from types import SimpleNamespace

import yaml

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT))

from scripts.training_book.manifest import (  # noqa: E402
    BookManifest,
    load_book_manifest,
    validate_book_manifest,
    validate_smoke_record,
)
from scripts.training_book.catalog import (  # noqa: E402
    CatalogError,
    catalog_source_claims,
    load_settings_catalog,
    load_training_book_ui_facts,
    load_ui_exclusions,
    settings_catalog_schema,
    validate_settings_catalog,
    validate_training_book_ui_facts,
)
from scripts.training_book import catalog as catalog_module  # noqa: E402
from scripts.training_book import markdown as markdown_module  # noqa: E402
from scripts.training_book.discovery import (  # noqa: E402
    DiscoveredSetting,
    DiscoveryError,
    Exclusion,
    SourceClaim,
    SourceGroup,
    discover_python_settings,
    load_exclusions,
    load_source_catalog,
    validate_inventory_baseline,
    validate_discovery_target,
    validate_setting_ownership,
)


FULL_ARCHITECTURES = (
    "ace_step_15", "ace_step_15_xl", "anima", "boogu_image", "boogu_image_edit",
    "chroma", "ernie_image", "flex1", "flex2", "flux", "flux_kontext", "flux2",
    "flux2_klein_4b", "flux2_klein_9b", "hidream", "hidream_e1", "hidream_o1",
    "ideogram4", "krea2", "krea2:o_edit", "krea2:turbo", "krea2:o_edit_turbo",
    "ltx2", "ltx2.3", "ltx2.5", "lumina2", "mageflow", "mageflow_edit",
    "minimax_h3", "nucleus_image", "omnigen2", "prx_pixel", "qwen_image",
    "qwen_image:2512", "qwen_image_edit", "qwen_image_edit_plus",
    "qwen_image_edit_plus:2511", "sd15", "sdxl", "wan21:1b", "wan21:14b",
    "wan21_i2v:14b480p", "wan21_i2v:14b", "wan22_14b:t2v", "wan22_14b_i2v",
    "wan22_5b", "zimage", "zimage:deturbo", "zimage_l2p", "zimage:turbo",
    "zeta_chroma",
)


@cache
def load_production_training_book_ui_facts():
    emitted_path = os.environ.get("TRAINING_BOOK_UI_FACTS_PATH")
    if emitted_path is not None:
        return load_training_book_ui_facts(Path(emitted_path))

    with tempfile.TemporaryDirectory() as directory:
        output_directory = Path(directory)
        subprocess.run(
            [
                "node",
                REPOSITORY_ROOT / "ui/node_modules/typescript/bin/tsc",
                "--project",
                REPOSITORY_ROOT / "ui/testing/tsconfig.trainingBook.json",
                "--outDir",
                output_directory,
            ],
            cwd=REPOSITORY_ROOT / "ui",
            check=True,
        )
        collector = output_directory / "testing/trainingBookFacts.js"
        facts_path = output_directory / "training-book-ui-facts.json"
        environment = os.environ.copy()
        environment["NODE_PATH"] = os.pathsep.join(filter(None, (
            str(REPOSITORY_ROOT / "ui/node_modules"),
            environment.get("NODE_PATH"),
        )))
        subprocess.run(
            [
                "node",
                "-e",
                (
                    "require(process.argv[1]).writeTrainingBookUiFacts("
                    "process.argv[2], process.argv[3])"
                ),
                collector,
                REPOSITORY_ROOT,
                facts_path,
            ],
            cwd=REPOSITORY_ROOT / "ui",
            env=environment,
            check=True,
        )
        return load_training_book_ui_facts(facts_path)


@cache
def load_production_training_book_preset_facts():
    emitted_path = os.environ.get("TRAINING_BOOK_PRESET_FACTS_PATH")
    if emitted_path is not None:
        payload = json.loads(Path(emitted_path).read_text(encoding="utf-8"))
    else:
        with tempfile.TemporaryDirectory() as directory:
            facts_path = Path(directory) / "training-book-preset-facts.json"
            subprocess.run(
                [
                    "node",
                    REPOSITORY_ROOT / "ui/testing/runTrainingPresetCatalogBuildValidation.mjs",
                    "--emit-book-facts",
                    facts_path,
                ],
                cwd=REPOSITORY_ROOT / "ui",
                check=True,
            )
            payload = json.loads(facts_path.read_text(encoding="utf-8"))
    if set(payload) != {"schema_version", "presets"} or payload["schema_version"] != 1:
        raise AssertionError("canonical training-book preset facts have an invalid envelope")
    return tuple(payload["presets"])

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

PYTHON_DISCOVERY_GLOBS = (
    "jobs/**/*.py",
    "extensions_built_in/sd_trainer/**/*.py",
    "extensions_built_in/diffusion_models/**/*.py",
    "extensions_built_in/flex2/**/*.py",
    "extensions_built_in/audio_models/**/*.py",
    "toolkit/config.py",
    "toolkit/config_modules.py",
    "toolkit/data_loader.py",
    "toolkit/dataloader_mixins.py",
    "toolkit/data_transfer_object/**/*.py",
    "toolkit/network_mixins.py",
    "toolkit/lora_special.py",
    "toolkit/lycoris_special.py",
    "toolkit/kohya_lora.py",
    "toolkit/optimizer.py",
    "toolkit/optimizers/**/*.py",
    "toolkit/scheduler.py",
    "toolkit/samplers/**/*.py",
    "toolkit/models/**/*.py",
    "toolkit/paths.py",
    "toolkit/memory_management/manager_modules.py",
    "run.py",
)

TYPESCRIPT_DISCOVERY_GLOBS = (
    "ui/cron/**/*",
    "ui/src/app/jobs/new/**/*",
    "ui/src/app/settings/**/*",
    "ui/src/app/layout.tsx",
    "ui/src/components/**/*",
    "ui/src/hooks/useSettings.tsx",
    "ui/src/helpers/defaultSamples.ts",
    "ui/src/paths.ts",
    "ui/src/utils/**/*",
    "ui/src/server/**/*.ts",
    "ui/src/app/api/**/*.ts",
    "ui/src/middleware.ts",
    "ui/src/docs.tsx",
    "ui/src/types.ts",
)

INITIAL_EXCLUDED_SYMBOL_REASONS = {
    ("jobs/ExtractJob.py", "ExtractJob.__init__"): "extraction-only",
    (
        "jobs/process/BaseExtractProcess.py",
        "BaseExtractProcess.__init__",
    ): "extraction-only",
    (
        "jobs/process/BaseExtractProcess.py",
        "BaseExtractProcess.get_output_path",
    ): "extraction-only",
    (
        "jobs/process/ExtractLoconProcess.py",
        "ExtractLoconProcess.__init__",
    ): "extraction-only",
    (
        "jobs/process/ExtractLoraProcess.py",
        "ExtractLoraProcess.__init__",
    ): "extraction-only",
    ("jobs/GenerateJob.py", "GenerateJob.__init__"): "generation-only",
    (
        "jobs/process/GenerateProcess.py",
        "GenerateConfig.__init__",
    ): "generation-only",
    (
        "jobs/process/GenerateProcess.py",
        "GenerateProcess.__init__",
    ): "generation-only",
    (
        "jobs/process/TrainSliderProcess.py",
        "TrainSliderProcess.__init__",
    ): "slider-only",
    (
        "jobs/process/TrainSliderProcessOld.py",
        "TrainSliderProcessOld.__init__",
    ): "slider-only",
    (
        "toolkit/config_modules.py",
        "ReferenceDatasetConfig.__init__",
    ): "reference-dataset-only",
    (
        "toolkit/config_modules.py",
        "SliderConfig.__init__",
    ): "slider-only",
    (
        "toolkit/config_modules.py",
        "SliderConfigAnchors.__init__",
    ): "slider-only",
    (
        "toolkit/config_modules.py",
        "SliderTargetConfig.__init__",
    ): "slider-only",
}


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

    def test_manifest_rejects_footer_that_disagrees_with_revision_or_date(self):
        data = self.valid_manifest()
        data["required_footer"] = "Verified against a different edition."

        with self.assertRaisesRegex(ValueError, "required_footer"):
            validate_book_manifest(
                load_book_manifest(self.write_manifest(data)),
                expected_full_architectures=("anima", "flux"),
            )

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


class SmokeRecordContractTests(unittest.TestCase):
    RECORD_PATH = "docs/book/verification/first-run-smoke.md"

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "docs/book").mkdir(parents=True)
        self.manifest_data = ManifestContractTests().valid_manifest()
        self.manifest_path = self.root / "docs/book/book-manifest.json"
        self.manifest_path.write_text(
            json.dumps(self.manifest_data, indent=2) + "\n", encoding="utf-8"
        )
        (self.root / "docs/book/README.md").write_text(
            "# Fixture edition\n", encoding="utf-8"
        )
        self.git("init", "-q")
        self.git("config", "user.name", "Training Book Tests")
        self.git("config", "user.email", "training-book@example.invalid")
        self.git("add", "docs/book")
        self.git("commit", "-q", "-m", "fixture edition")
        self.tested_commit = self.git("rev-parse", "HEAD").stdout.strip()
        self.manifest = load_book_manifest(self.manifest_path)

    def git(self, *arguments, check=True):
        return subprocess.run(
            ["git", *arguments], cwd=self.root, capture_output=True, text=True,
            check=check,
        )

    def valid_record(self):
        return {
            "schema_version": 1,
            "status": "passed",
            "book_revision": 1,
            "tested_commit": self.tested_commit,
            "tested_at": "2026-08-14T12:34:56Z",
            "ui_architecture": "anima",
            "model_identifier": "fixture/wan-2.1-t2v-1.3b",
            "hardware": {
                "gpu_model": "Fixture GPU",
                "vram_gib": 24,
                "software": "Linux, driver 1, Python 3.12, Node 22, ai-toolkit fixture",
            },
            "dataset": {
                "fixture_id": "generated color-card fixture v1",
                "file_count": 12,
                "sha256": "a" * 64,
            },
            "workflow": {
                "authentication": "passed",
                "job_creation": "passed",
                "queue": "passed",
                "start": "passed",
                "fixed_seed_sample": "passed",
                "checkpoint": "passed",
                "sample_comparison": "passed",
                "stop": "passed",
                "increase_steps": "passed",
                "resume": "passed",
                "optimizer_restoration": "passed",
                "continued_step_progress": "passed",
            },
            "observations": {
                "checkpoint_step": 250,
                "configured_learning_rate": 0.0001,
                "resumed_step": 251,
                "notes": "Observed checkpoint, optimizer state, and learning rate.",
            },
        }

    def write_record(self, record, *, raw_json=None):
        path = self.root / self.RECORD_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(record, indent=2) if raw_json is None else raw_json
        path.write_text(
            "# Supported-GPU smoke\n\n[Table of contents](../README.md)\n\n"
            "<!-- smoke-record:start -->\n```json\n"
            f"{payload}\n```\n<!-- smoke-record:end -->\n",
            encoding="utf-8",
        )
        return path

    def assert_invalid(self, record, message):
        self.write_record(record)
        with self.assertRaisesRegex(ValueError, message):
            validate_smoke_record(self.root, self.manifest)

    def test_smoke_record_accepts_exact_observed_schema(self):
        self.write_record(self.valid_record())
        validate_smoke_record(self.root, self.manifest)

    def test_smoke_record_git_checks_ignore_ambient_repository_redirect(self):
        decoy_directory = tempfile.TemporaryDirectory()
        self.addCleanup(decoy_directory.cleanup)
        decoy_root = Path(decoy_directory.name)
        (decoy_root / "docs/book").mkdir(parents=True)
        (decoy_root / "docs/book/book-manifest.json").write_text(
            json.dumps(self.manifest_data, indent=2) + "\n", encoding="utf-8"
        )
        (decoy_root / "docs/book/README.md").write_text(
            "# Decoy edition\n", encoding="utf-8"
        )
        for arguments in (
            ("init", "-q"),
            ("config", "user.name", "Training Book Tests"),
            ("config", "user.email", "training-book@example.invalid"),
            ("add", "docs/book"),
            ("commit", "-q", "-m", "decoy edition"),
        ):
            subprocess.run(
                ["git", *arguments], cwd=decoy_root, check=True,
                capture_output=True, text=True,
            )
        decoy_commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=decoy_root, check=True,
            capture_output=True, text=True,
        ).stdout.strip()
        record = self.valid_record()
        record["tested_commit"] = decoy_commit
        self.write_record(record)

        with mock.patch.dict(os.environ, {
            "GIT_DIR": str(decoy_root / ".git"),
            "GIT_WORK_TREE": str(decoy_root),
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "core.worktree",
            "GIT_CONFIG_VALUE_0": str(decoy_root),
        }):
            with self.assertRaisesRegex(ValueError, "tested_commit.*ancestor"):
                validate_smoke_record(self.root, self.manifest)

    def test_smoke_record_allows_remote_urls_and_repository_model_identifiers(self):
        for field, value in (
            ("model_identifier", "https://example.invalid/models/fixture"),
            ("model_identifier", "organization/model-v1"),
            ("model_identifier", "acme/sk-learning-model"),
            ("software", "Basic authentication succeeded"),
            ("software", "Bearer authentication succeeded"),
        ):
            with self.subTest(field=field, value=value):
                record = self.valid_record()
                if field == "software":
                    record["hardware"]["software"] = value
                else:
                    record[field] = value
                self.write_record(record)
                validate_smoke_record(self.root, self.manifest)

    def test_smoke_record_rejects_missing_record_and_nonpassed_status(self):
        with self.assertRaisesRegex(ValueError, "first-run-smoke[.]md"):
            validate_smoke_record(self.root, self.manifest)
        record = self.valid_record()
        record["status"] = "failed"
        self.assert_invalid(record, "status")

    def test_smoke_record_rejects_malformed_and_nonancestor_commits(self):
        record = self.valid_record()
        record["tested_commit"] = "ABC"
        self.assert_invalid(record, "tested_commit")

        self.git("checkout", "-q", "--orphan", "unrelated")
        self.git("rm", "-q", "-r", "--cached", ".")
        (self.root / "unrelated.txt").write_text("unrelated\n", encoding="utf-8")
        self.git("add", "unrelated.txt")
        self.git("commit", "-q", "-m", "unrelated")
        unrelated = self.git("rev-parse", "HEAD").stdout.strip()
        shutil.rmtree(self.root / "docs/book")
        self.git("checkout", "-q", self.tested_commit)
        record = self.valid_record()
        record["tested_commit"] = unrelated
        self.assert_invalid(record, "ancestor")

    def test_smoke_record_rejects_revision_mismatch_and_commit_without_edition(self):
        record = self.valid_record()
        record["book_revision"] = 2
        self.assert_invalid(record, "book_revision")

        old_manifest = deepcopy(self.manifest_data)
        old_manifest["book_revision"] = 2
        old_manifest["required_footer"] = (
            "Verified against ai-toolkit-experimental book revision 2 (2026-08-14)."
        )
        self.manifest_path.write_text(json.dumps(old_manifest), encoding="utf-8")
        self.git("add", "docs/book/book-manifest.json")
        self.git("commit", "-q", "-m", "different edition")
        record = self.valid_record()
        record["tested_commit"] = self.tested_commit
        record["book_revision"] = 2
        self.manifest = load_book_manifest(self.manifest_path)
        self.assert_invalid(record, "tested commit.*revision")

    def test_smoke_record_rejects_missing_workflow_result_and_later_book_drift(self):
        record = self.valid_record()
        del record["workflow"]["optimizer_restoration"]
        self.assert_invalid(record, "optimizer_restoration")

        (self.root / "docs/book/README.md").write_text(
            "# Drifted fixture edition\n", encoding="utf-8"
        )
        self.git("add", "docs/book/README.md")
        self.git("commit", "-q", "-m", "book drift")
        self.assert_invalid(self.valid_record(), "docs/book/README[.]md")

    def test_smoke_record_rejects_extra_keys_wrong_types_and_unsafe_values(self):
        mutations = (
            (lambda value: value.update({"extra": "field"}), "unexpected"),
            (lambda value: value["hardware"].pop("software"), "software"),
            (lambda value: value["dataset"].update(file_count=True), "file_count"),
            (lambda value: value["hardware"].update(vram_gib=float("inf")), "nonfinite"),
            (lambda value: value["observations"].update(configured_learning_rate=True), "configured_learning_rate"),
            (lambda value: value.update(tested_at="2026-08-14T12:34:56+00:00"), "tested_at"),
            (lambda value: value["dataset"].update(sha256="A" * 64), "sha256"),
            (lambda value: value["workflow"].update(queue="skipped"), "workflow.queue"),
            (lambda value: value.update(model_identifier="https://user:secret@example.invalid/model"), "secret"),
            (lambda value: value["hardware"].update(software="Linux /home/test/private"), "path"),
            (lambda value: value["hardware"].update(software="Linux (/home/test/private)"), "path"),
            (lambda value: value["hardware"].update(software=r"Windows (\\server\Users\alice\private)"), "path"),
            (lambda value: value["hardware"].update(software="file://server/Users/alice/private"), "path"),
            (lambda value: value["hardware"].update(software="Authorization: Bearer ghp_0123456789"), "secret"),
            (lambda value: value["hardware"].update(software="Authorization: Basic dXNlcjpwYXNz"), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential ghp_0123456789"), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential hf_0123456789abcdef"), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential sk-proj-0123456789abcdef01234567"), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential ghp_0123456789."), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential hf_0123456789abcdef."), "secret"),
            (lambda value: value["observations"].update(notes="Provider credential sk-proj-0123456789abcdef01234567."), "secret"),
            (lambda value: value.update(model_identifier="ftp://user:password@example.invalid/model"), "secret"),
            (lambda value: value["hardware"].update(software="//server/Users/alice/private"), "path"),
            (lambda value: value["hardware"].update(software="Linux path:/home/alice/private"), "path"),
        )
        for mutate, message in mutations:
            with self.subTest(message=message):
                record = self.valid_record()
                mutate(record)
                self.assert_invalid(record, message)

    def test_smoke_record_rejects_unsupported_architecture(self):
        record = self.valid_record()
        record["ui_architecture"] = "unsupported-fixture"
        self.assert_invalid(record, "ui_architecture")

    def test_smoke_record_rejects_noncontinued_step(self):
        for resumed_step in (250, 249):
            with self.subTest(resumed_step=resumed_step):
                record = self.valid_record()
                record["observations"]["resumed_step"] = resumed_step
                self.assert_invalid(record, "resumed_step")

    def test_smoke_record_rejects_duplicate_markers_and_duplicate_json_keys(self):
        record = self.valid_record()
        path = self.write_record(record)
        path.write_text(path.read_text(encoding="utf-8") + path.read_text(encoding="utf-8"), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "exactly one"):
            validate_smoke_record(self.root, self.manifest)

        raw = json.dumps(record).replace(
            '"schema_version": 1', '"schema_version": 1, "schema_version": 1', 1
        )
        self.write_record(record, raw_json=raw)
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validate_smoke_record(self.root, self.manifest)


class CatalogContractTests(unittest.TestCase):
    def valid_catalog_entry(self):
        return {
            "id": "train.steps",
            "ui_label": "Steps",
            "scope": "train",
            "locations": [
                {"kind": "yaml", "path": "config.process[*].train.steps"}
            ],
            "surfaces": ["simple-ui", "advanced-yaml"],
            "persistence": "config",
            "authority": "user",
            "lifecycle": "supported",
            "applicability": [{"process_type": "diffusion_trainer"}],
            "contract": {
                "parser_type": "integer",
                "supported_type": "positive-integer",
                "ui_type": "number",
                "ui_optional": False,
                "ui_nullable": False,
                "ui_accepted_values": None,
                "ui_range": {
                    "minimum": 1,
                    "maximum": None,
                    "minimum_inclusive": True,
                    "maximum_inclusive": True,
                },
                "example_type": "integer",
                "accepted_values": None,
                "range": {
                    "minimum": 1,
                    "maximum": None,
                    "minimum_inclusive": True,
                    "maximum_inclusive": True,
                },
                "null": "rejected",
            },
            "defaults": [
                {
                    "kind": "ui-created",
                    "presence": "present",
                    "value": 3000,
                    "applicability": [],
                },
                {
                    "kind": "engine-fallback",
                    "presence": "present",
                    "value": 2000,
                    "applicability": [],
                },
            ],
            "normalizations": [],
            "interactions": [],
            "aliases": [],
            "section": "training",
            "source_claims": [
                {
                    "source": "toolkit/config_modules.py",
                    "symbol": "TrainConfig.__init__",
                    "key": "steps",
                    "read_kind": "kwargs.get",
                }
            ],
            "render": {
                "page": "reference/training.md",
                "anchor": "train-steps",
                "description": "Sets the total target optimizer step count.",
                "benefits": "Controls training duration and checkpoint opportunities.",
                "drawbacks": "Excessive steps can overfit a small dataset.",
                "example": "steps: 3000",
            },
        }

    def discovered_steps(self):
        return (
            DiscoveredSetting(
                "toolkit/config_modules.py",
                "TrainConfig.__init__",
                10,
                "steps",
                "kwargs.get",
                "core",
                "2000",
            ),
        )

    def test_catalog_contract_accepts_browser_storage_persistence(self):
        entry = self.valid_catalog_entry()
        entry["persistence"] = "browser-storage"

        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]},
            self.discovered_steps(),
        )

        self.assertEqual(catalog.settings[0].persistence, "browser-storage")

    def test_catalog_and_ui_exclusion_contract_versions_are_exactly_two(self):
        entry = self.valid_catalog_entry()
        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]},
            self.discovered_steps(),
        )
        self.assertEqual(catalog.schema_version, 2)
        self.assertEqual(
            settings_catalog_schema()["properties"]["schema_version"]["const"],
            2,
        )

        for version in (1, 3):
            with self.subTest(catalog_version=version):
                with self.assertRaisesRegex(CatalogError, "schema_version"):
                    validate_settings_catalog(
                        {"schema_version": version, "settings": [entry]},
                        self.discovered_steps(),
                    )

        fact = self.ui_source_fact()
        fact.update({
            "kind": "server-state",
            "ui_label": {"present": False},
            "value_contract": {
                "ui_type": "string",
                "widget_kind": None,
                "optional": True,
                "nullable": False,
            },
            "server_state_contract": {
                "operation": "read",
                "provenance": "environment",
                "authority": "user",
                "persistence": "runtime",
            },
        })
        exclusion = {"fact": fact, "reason": "runtime-derived-ui-state"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings-exclusions.json"
            path.write_text(json.dumps({
                "schema_version": 2,
                "exclusions": [],
                "ui_exclusions": [exclusion],
            }), encoding="utf-8")
            loaded = load_ui_exclusions(path)
            self.assertEqual(len(loaded), 1)
            for version in (1, 3):
                path.write_text(json.dumps({
                    "schema_version": version,
                    "exclusions": [],
                    "ui_exclusions": [exclusion],
                }), encoding="utf-8")
                with self.subTest(exclusions_version=version):
                    with self.assertRaisesRegex(CatalogError, "schema_version"):
                        load_ui_exclusions(path)

    def test_catalog_contract_models_non_authoritative_suggestions_and_reciprocal_ui_scales(self):
        entry = self.valid_catalog_entry()
        entry["contract"].update({
            "ui_suggested_values": [1000, 3000],
            "config_to_ui_scale": 100,
            "ui_to_config_scale": 0.01,
        })

        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]},
            self.discovered_steps(),
        )

        contract = catalog.settings[0].contract
        self.assertEqual(contract.ui_suggested_values, (1000, 3000))
        self.assertEqual(contract.config_to_ui_scale, 100)
        self.assertEqual(contract.ui_to_config_scale, 0.01)
        self.assertIsNone(
            contract.ui_accepted_values,
            "suggestions must not become authoritative accepted values",
        )

        invalid_contracts = []
        missing_pair = deepcopy(entry)
        del missing_pair["contract"]["ui_to_config_scale"]
        invalid_contracts.append((missing_pair, "paired"))
        zero_scale = deepcopy(entry)
        zero_scale["contract"]["ui_to_config_scale"] = 0
        invalid_contracts.append((zero_scale, "nonzero"))
        nonreciprocal = deepcopy(entry)
        nonreciprocal["contract"]["config_to_ui_scale"] = 10
        invalid_contracts.append((nonreciprocal, "reciprocal"))
        nonnumeric = deepcopy(entry)
        nonnumeric["contract"]["ui_type"] = "string"
        invalid_contracts.append((nonnumeric, "numeric UI"))
        for payload, message in invalid_contracts:
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [payload]},
                        self.discovered_steps(),
                    )

    def test_catalog_allows_source_less_environment_setting_with_atomic_ts_owner(self):
        entry = self.valid_catalog_entry()
        entry.update({
            "id": "environment.ai_toolkit_auth",
            "ui_label": None,
            "scope": "environment",
            "locations": [{"kind": "environment", "path": "AI_TOOLKIT_AUTH"}],
            "surfaces": ["cli"],
            "persistence": "runtime",
            "source_claims": [],
        })
        entry["contract"].update({
            "ui_type": None,
            "ui_optional": None,
            "ui_nullable": None,
            "ui_accepted_values": None,
            "ui_range": None,
        })
        fact = self.ui_source_fact()
        fact.update({
            "source_path": "ui/src/app/layout.tsx",
            "symbol": "RootLayout::process.env.AI_TOOLKIT_AUTH",
            "path": "AI_TOOLKIT_AUTH",
            "kind": "server-state",
            "ui_label": {"present": False},
            "value_contract": {
                "ui_type": "string",
                "widget_kind": None,
                "optional": True,
                "nullable": False,
            },
            "server_state_contract": {
                "operation": "read",
                "provenance": "environment",
                "authority": "user",
                "persistence": "runtime",
            },
        })

        catalog = validate_settings_catalog(
            {
                "schema_version": 2,
                "settings": [entry],
                "ui_claims": [{
                    "setting_id": entry["id"],
                    "fact": fact,
                }],
            },
            (),
        )

        self.assertEqual(catalog.settings[0].scope, "environment")

    def ui_source_fact(self):
        return {
            "fact_type": "source-claim",
            "source_path": "ui/src/app/jobs/new/SimpleJob.tsx",
            "symbol": (
                "SimpleJob::NumberInput::"
                "config.process[*].train.steps::Steps"
            ),
            "path": "config.process[*].train.steps",
            "kind": "setting",
            "ui_label": {
                "present": True,
                "value": {"kind": "string", "value": "Steps"},
            },
            "value_contract": {
                "ui_type": "number",
                "widget_kind": "number",
                "optional": False,
                "nullable": True,
                "minimum": 1,
            },
        }

    def ui_owner_facts(self):
        present = {
            "present": True,
            "value": {"kind": "number", "value": 3000},
        }
        return [
            self.ui_source_fact(),
            {
                "fact_type": "ui-default",
                "source_path": "ui/src/app/jobs/new/jobConfig.ts",
                "symbol": "defaultJobConfig",
                "path": "config.process[*].train.steps",
                "value": present,
            },
            {
                "fact_type": "architecture-transition",
                "architecture": "fixture",
                "path": "config.process[*].train.steps",
                "selected": present,
                "unselected": {"present": False},
            },
            {
                "fact_type": "architecture-field",
                "architecture": "fixture",
                "field": "model_path",
                "payload": {
                    "payload_kind": "presence",
                    "value": {
                        "present": True,
                        "value": {"kind": "string", "value": "model/repo"},
                    },
                },
            },
            {
                "fact_type": "architecture-default",
                "architecture": "fixture",
                "declaration_path": "config.process[*].train.steps",
                "path": "config.process[*].train.steps",
                "selected": present,
                "unselected": {"present": False},
            },
            {
                "fact_type": "architecture-container",
                "architecture": "fixture",
                "path": "config.process[*].model.model_kwargs",
                "selected_present": True,
                "unselected_present": False,
            },
        ]

    def test_catalog_ui_owners_use_a_strict_full_payload_fact_union(self):
        data = {
            "schema_version": 2,
            "settings": [self.valid_catalog_entry()],
            "ui_claims": [
                {"setting_id": "train.steps", "fact": fact}
                for fact in self.ui_owner_facts()
            ],
        }
        catalog = validate_settings_catalog(data, self.discovered_steps())
        self.assertEqual(len(catalog.ui_claims), 6)
        self.assertEqual(catalog.ui_claims[0].fact.fact_type, "source-claim")
        self.assertEqual(
            catalog.ui_claims[0].fact.ui_label.value.value,
            "Steps",
        )

        mutations = []
        unknown = deepcopy(data)
        unknown["ui_claims"][0]["setting_id"] = "train.unknown"
        mutations.append((unknown, "unknown setting_id"))
        duplicate = deepcopy(data)
        duplicate["ui_claims"].append(deepcopy(duplicate["ui_claims"][0]))
        mutations.append((duplicate, "duplicate UI fact owner"))
        missing_payload = deepcopy(data)
        del missing_payload["ui_claims"][3]["fact"]["payload"]
        mutations.append((missing_payload, "payload"))
        wrong_variant = deepcopy(data)
        wrong_variant["ui_claims"][1]["fact"]["fact_type"] = "source-claim"
        mutations.append((wrong_variant, "source-claim"))
        numeric_label = deepcopy(data)
        numeric_label["ui_claims"][3]["fact"] = {
            "fact_type": "architecture-field",
            "architecture": "fixture",
            "field": "label",
            "payload": {
                "payload_kind": "value",
                "value": {"kind": "number", "value": 7},
            },
        }
        mutations.append((numeric_label, "label.*string"))
        numeric_controls_item = deepcopy(data)
        numeric_controls_item["ui_claims"][3]["fact"] = {
            "fact_type": "architecture-field",
            "architecture": "fixture",
            "field": "controls",
            "payload": {
                "payload_kind": "value",
                "value": {
                    "kind": "array",
                    "items": [{"kind": "number", "value": 7}],
                },
            },
        }
        mutations.append((numeric_controls_item, "controls.*string"))
        for payload, message in mutations:
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(payload, self.discovered_steps())

    def test_catalog_allows_source_less_setting_with_atomic_ui_ownership(self):
        entry = self.valid_catalog_entry()
        entry.update({
            "id": "ui.architecture.fixture",
            "scope": "ui-state",
            "locations": [{"kind": "ui-state", "path": "architecture.fixture"}],
            "persistence": "transient",
            "authority": "ui-derived",
            "source_claims": [],
        })
        fact = self.ui_owner_facts()[3]
        data = {
            "schema_version": 2,
            "settings": [entry],
            "ui_claims": [{
                "setting_id": "ui.architecture.fixture", "fact": fact,
            }],
        }
        validate_settings_catalog(data, ())

        missing_owner = deepcopy(data)
        missing_owner["ui_claims"] = []
        with self.assertRaisesRegex(CatalogError, "source-less.*UI ownership"):
            validate_settings_catalog(missing_owner, ())

    def test_ui_exclusions_share_the_exact_fact_union_and_closed_reasons(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings-exclusions.json"
            payload = {
                "schema_version": 2,
                "exclusions": [],
                "ui_exclusions": [{
                    "fact": self.ui_source_fact(),
                    "reason": "architecture-projected-control",
                }],
            }
            path.write_text(json.dumps(payload), encoding="utf-8")
            exclusions = load_ui_exclusions(path)
            self.assertEqual(exclusions[0].fact.fact_type, "source-claim")
            self.assertEqual(load_exclusions(path), ())

            payload["ui_exclusions"][0]["reason"] = "hand-wavy"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(CatalogError, "reason"):
                load_ui_exclusions(path)

            payload["ui_exclusions"] = [
                {
                    "fact": self.ui_source_fact(),
                    "reason": "architecture-projected-control",
                },
                {
                    "fact": self.ui_source_fact(),
                    "reason": "architecture-projected-control",
                },
            ]
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(CatalogError, "duplicate UI exclusion"):
                load_ui_exclusions(path)

    def test_catalog_contract_accepts_the_representative_shape_and_empty_catalog(self):
        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [self.valid_catalog_entry()]},
            self.discovered_steps(),
        )
        empty = validate_settings_catalog(
            {"schema_version": 2, "settings": []}, ()
        )

        self.assertEqual(catalog.settings[0].id, "train.steps")
        self.assertEqual(empty.settings, ())
        self.assertEqual(settings_catalog_schema()["additionalProperties"], False)

    def test_catalog_contract_rejects_missing_or_duplicate_stable_ids(self):
        missing = self.valid_catalog_entry()
        del missing["id"]
        duplicate = deepcopy(self.valid_catalog_entry())

        for settings, message in (
            ([missing], "id"),
            ([self.valid_catalog_entry(), duplicate], "duplicate.*train.steps"),
        ):
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": settings},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_rejects_unsupported_or_noncanonical_locations_and_surfaces(self):
        cases = (
            ("locations", [{"kind": "database", "path": "jobs.name"}], "kind"),
            (
                "locations",
                [{"kind": "yaml", "path": "config.process[0].train.steps"}],
                r"canonical.*\[\*\]",
            ),
            ("surfaces", ["expert-ui"], "surfaces"),
        )
        for field, value, message in cases:
            with self.subTest(field=field, value=value):
                entry = self.valid_catalog_entry()
                entry[field] = value
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [entry]},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_allows_only_canonical_wildcard_brackets_in_config_paths(self):
        valid = self.valid_catalog_entry()
        valid["locations"] = [
            {
                "kind": "yaml",
                "path": "config.process[*].datasets[*].resolution",
            }
        ]
        valid["aliases"] = [
            {
                "location": "config.process[*].datasets[*].size",
                "replacement": "train.steps",
                "precedence": "replacement-wins",
                "migration": "Use resolution instead of size.",
                "status": "legacy",
            }
        ]
        validate_settings_catalog(
            {"schema_version": 2, "settings": [valid]},
            self.discovered_steps(),
        )

        for token in ("[banana]", "[-1]", "[0]", "[]"):
            for field in ("locations", "aliases"):
                with self.subTest(token=token, field=field):
                    entry = deepcopy(valid)
                    bad_path = f"config.process[*].datasets{token}.resolution"
                    if field == "locations":
                        entry["locations"][0]["path"] = bad_path
                    else:
                        entry["aliases"][0]["location"] = bad_path

                    with self.assertRaisesRegex(
                        CatalogError,
                        r"canonical.*\[\*\]",
                    ):
                        validate_settings_catalog(
                            {"schema_version": 2, "settings": [entry]},
                            self.discovered_steps(),
                        )

    def test_catalog_contract_rejects_overlapping_location_applicability_claims(self):
        overlapping = deepcopy(self.valid_catalog_entry())
        overlapping["id"] = "train.steps-shadow"
        overlapping["source_claims"][0]["key"] = "steps-shadow"
        disjoint = deepcopy(overlapping)
        disjoint["applicability"] = [{"process_type": "other_trainer"}]

        with self.assertRaisesRegex(CatalogError, "overlapping.*location"):
            validate_settings_catalog(
                {
                    "schema_version": 2,
                    "settings": [self.valid_catalog_entry(), overlapping],
                },
                self.discovered_steps(),
            )
        validate_settings_catalog(
            {
                "schema_version": 2,
                "settings": [self.valid_catalog_entry(), disjoint],
            },
            self.discovered_steps()
            + (
                DiscoveredSetting(
                    "toolkit/config_modules.py",
                    "TrainConfig.__init__",
                    11,
                    "steps-shadow",
                    "kwargs.get",
                    "core",
                    "2000",
                ),
            ),
        )

    def test_catalog_contract_optimizer_and_scheduler_discriminators_are_disjoint(self):
        adam = deepcopy(self.valid_catalog_entry())
        adam["id"] = "optimizer.adam.param.eps"
        adam["locations"] = [
            {"kind": "yaml", "path": "config.process[*].train.optimizer_params.eps"}
        ]
        adam["applicability"] = [
            {"process_type": "diffusion_trainer", "optimizer": "adam"}
        ]
        adam["source_claims"][0]["key"] = "eps_adam"
        adamw = deepcopy(adam)
        adamw["id"] = "optimizer.adamw.param.eps"
        adamw["applicability"] = [
            {"process_type": "diffusion_trainer", "optimizer": "adamw"}
        ]
        adamw["source_claims"][0]["key"] = "eps_adamw"
        discovered = (
            DiscoveredSetting("toolkit/config_modules.py", "TrainConfig.__init__", 1, "eps_adam", "kwargs.get", "core", "2000"),
            DiscoveredSetting("toolkit/config_modules.py", "TrainConfig.__init__", 2, "eps_adamw", "kwargs.get", "core", "2000"),
        )
        validate_settings_catalog(
            {"schema_version": 2, "settings": [adam, adamw]}, discovered
        )

        duplicate = deepcopy(adamw)
        duplicate["applicability"] = [
            {"process_type": "diffusion_trainer", "optimizer": "adam"}
        ]
        with self.assertRaisesRegex(CatalogError, "overlapping.*location"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [adam, duplicate]}, discovered
            )

    def test_catalog_contract_dispatch_patterns_detect_and_partition_overlaps(self):
        def row(setting_id, key, applicability):
            entry = deepcopy(self.valid_catalog_entry())
            entry["id"] = setting_id
            entry["locations"] = [
                {"kind": "yaml", "path": "config.process[*].train.optimizer_params.eps"}
            ]
            entry["applicability"] = [applicability]
            entry["source_claims"][0]["key"] = key
            return entry

        cases = (
            (
                {"optimizer_prefix": "prodigy"},
                {"optimizer_prefix": "prodigy8bit"},
            ),
            (
                {"optimizer_prefix": "adam"},
                {"optimizer": "adamw"},
            ),
            (
                {"optimizer_prefix": "family", "optimizer_suffix": "lion"},
                {"optimizer_prefix": "familyx", "optimizer_suffix": "lion"},
            ),
            (
                {"optimizer_prefix": "f", "optimizer_suffix": "oo"},
                {"optimizer": "foo"},
            ),
        )
        discovered = (
            DiscoveredSetting("toolkit/config_modules.py", "TrainConfig.__init__", 1, "left", "kwargs.get", "core", "2000"),
            DiscoveredSetting("toolkit/config_modules.py", "TrainConfig.__init__", 2, "right", "kwargs.get", "core", "2000"),
        )
        for index, (left, right) in enumerate(cases):
            with self.subTest(index=index):
                with self.assertRaisesRegex(CatalogError, "overlapping.*location"):
                    validate_settings_catalog(
                        {
                            "schema_version": 2,
                            "settings": [
                                row("optimizer.left.param.eps", "left", left),
                                row("optimizer.right.param.eps", "right", right),
                            ],
                        },
                        discovered,
                    )

        partitioned = row(
            "optimizer.prodigy.param.eps",
            "left",
            {
                "optimizer_prefix": "prodigy",
                "optimizer_exclude_prefix": "prodigy8bit",
            },
        )
        specific = row(
            "optimizer.prodigy8bit.param.eps",
            "right",
            {"optimizer_prefix": "prodigy8bit"},
        )
        validate_settings_catalog(
            {"schema_version": 2, "settings": [partitioned, specific]},
            discovered,
        )

        disjoint_combined = row(
            "optimizer.family.param.eps",
            "left",
            {"optimizer_prefix": "family", "optimizer_suffix": "lion"},
        )
        disjoint_suffix = row(
            "optimizer.family-other.param.eps",
            "right",
            {"optimizer_prefix": "family", "optimizer_suffix": "adam"},
        )
        validate_settings_catalog(
            {"schema_version": 2, "settings": [disjoint_combined, disjoint_suffix]},
            discovered,
        )

    def test_catalog_contract_uses_network_type_to_disambiguate_locations(self):
        lora = self.valid_catalog_entry()
        lora["applicability"] = [{"network_type": "lora"}]
        lycoris = deepcopy(lora)
        lycoris["id"] = "train.steps-lycoris"
        lycoris["applicability"] = [{"network_type": "lycoris"}]
        lycoris["source_claims"][0]["key"] = "steps-lycoris"
        discovered = self.discovered_steps() + (
            DiscoveredSetting(
                "toolkit/config_modules.py",
                "TrainConfig.__init__",
                11,
                "steps-lycoris",
                "kwargs.get",
                "core",
                "2000",
            ),
        )

        validate_settings_catalog(
            {"schema_version": 2, "settings": [lora, lycoris]}, discovered
        )
        lycoris["applicability"] = [{"network_type": "lora"}]
        with self.assertRaisesRegex(CatalogError, "overlapping.*location"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [lora, lycoris]}, discovered
            )

    def test_catalog_contract_rejects_blank_teaching_prose(self):
        entry = self.valid_catalog_entry()
        entry["render"]["drawbacks"] = "   "

        with self.assertRaisesRegex(CatalogError, "render.drawbacks"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [entry]},
                self.discovered_steps(),
            )

    def test_catalog_contract_rejects_an_ambiguous_default_authority(self):
        entry = self.valid_catalog_entry()
        entry["defaults"][0]["kind"] = "default"

        with self.assertRaisesRegex(CatalogError, "default.*authority"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [entry]},
                self.discovered_steps(),
            )

    def test_catalog_contract_preserves_absent_and_explicit_null_defaults(self):
        entry = self.valid_catalog_entry()
        entry["defaults"] = [
            {"kind": "engine-fallback", "presence": "absent", "applicability": []},
            {
                "kind": "ui-created",
                "presence": "present",
                "value": None,
                "applicability": [],
            },
        ]
        validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]}, self.discovered_steps()
        )
        entry["defaults"][0]["value"] = None
        with self.assertRaisesRegex(CatalogError, "presence.*absent.*value"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [entry]},
                self.discovered_steps(),
            )

    def test_catalog_contract_rejects_aliases_without_migration_policy(self):
        entry = self.valid_catalog_entry()
        entry["aliases"] = [
            {
                "location": "config.process[*].train.total_steps",
                "replacement": "train.steps",
                "precedence": "replacement-wins",
                "status": "legacy",
            }
        ]

        with self.assertRaisesRegex(CatalogError, "aliases.0.migration"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [entry]},
                self.discovered_steps(),
            )

    def test_catalog_contract_rejects_stale_and_unowned_source_claims(self):
        entry = self.valid_catalog_entry()
        stale = deepcopy(entry)
        stale["source_claims"][0]["key"] = "missing"
        for candidate, discovered, message in (
            (stale, self.discovered_steps(), "vanished"),
            (entry, self.discovered_steps() + (
                DiscoveredSetting(
                    "toolkit/config_modules.py", "TrainConfig.__init__", 11,
                    "unowned", "kwargs.get", "core", "None",
                ),
            ), "unowned"),
        ):
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [candidate]}, discovered
                    )

    def test_catalog_contract_rejects_empty_source_claims(self):
        entry = self.valid_catalog_entry()
        entry["source_claims"] = []

        with self.assertRaisesRegex(CatalogError, "source-less.*UI ownership"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [entry]}, ()
            )

    def test_catalog_contract_is_strict_and_rejects_boolean_numbers(self):
        cases = (
            ("unknown", lambda entry: entry.update({"unknown": True})),
            (
                "contract.range.minimum",
                lambda entry: entry["contract"]["range"].update({"minimum": True}),
            ),
        )
        for message, mutate in cases:
            with self.subTest(message=message):
                entry = self.valid_catalog_entry()
                mutate(entry)
                with self.assertRaisesRegex(CatalogError, message):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [entry]},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_rejects_null_as_a_semantic_type_name(self):
        for field in ("ui_type", "example_type"):
            with self.subTest(field=field):
                entry = self.valid_catalog_entry()
                entry["contract"][field] = "null"

                with self.assertRaisesRegex(CatalogError, f"contract.{field}"):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [entry]},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_represents_scalar_or_fixed_length_numeric_pairs(self):
        entry = self.valid_catalog_entry()
        entry["contract"].update(
            {
                "parser_type": "number-or-number-pair",
                "supported_type": "number or exactly two numbers",
                "example_type": "number-list",
                "accepted_types": ["number", "number-list"],
                "collection_length": 2,
            }
        )
        validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]},
            self.discovered_steps(),
        )

        for label, accepted_types, length in (
            ("missing list member", ["number"], 2),
            ("zero length", ["number", "number-list"], 0),
            ("boolean list", ["number", "boolean-list"], 2),
        ):
            with self.subTest(label=label):
                invalid = deepcopy(entry)
                invalid["contract"]["accepted_types"] = accepted_types
                invalid["contract"]["collection_length"] = length
                with self.assertRaisesRegex(CatalogError, "collection_length"):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [invalid]},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_constrains_every_numeric_enum_value_by_its_range(self):
        valid = self.valid_catalog_entry()
        valid["contract"]["accepted_values"] = [1, 3.5, 5]
        valid["contract"]["range"] = {
            "minimum": 1,
            "maximum": 5,
            "minimum_inclusive": True,
            "maximum_inclusive": True,
        }
        validate_settings_catalog(
            {"schema_version": 2, "settings": [valid]},
            self.discovered_steps(),
        )

        cases = (
            ("below minimum", [0], True, True),
            ("above maximum", [6], True, True),
            ("exclusive minimum", [1], False, True),
            ("exclusive maximum", [5], True, False),
            ("boolean", [True], True, True),
            ("non-finite float", [float("nan")], True, True),
        )
        for label, values, minimum_inclusive, maximum_inclusive in cases:
            with self.subTest(label=label):
                entry = deepcopy(valid)
                entry["contract"]["accepted_values"] = values
                entry["contract"]["range"]["minimum_inclusive"] = (
                    minimum_inclusive
                )
                entry["contract"]["range"]["maximum_inclusive"] = (
                    maximum_inclusive
                )

                with self.assertRaisesRegex(
                    CatalogError,
                    "accepted_values.*(?:range|finite)",
                ):
                    validate_settings_catalog(
                        {"schema_version": 2, "settings": [entry]},
                        self.discovered_steps(),
                    )

    def test_catalog_contract_rejects_non_finite_numbers_everywhere(self):
        cases = (
            (
                "accepted value without range",
                lambda entry, value: entry["contract"].update(
                    {"accepted_values": [value], "range": None}
                ),
            ),
            (
                "range minimum",
                lambda entry, value: entry["contract"]["range"].update(
                    {"minimum": value}
                ),
            ),
            (
                "range maximum",
                lambda entry, value: entry["contract"]["range"].update(
                    {"maximum": value}
                ),
            ),
            (
                "nested default",
                lambda entry, value: entry["defaults"][0].update(
                    {"value": {"outer": [1, {"inner": value}]}}
                ),
            ),
        )
        for label, mutate in cases:
            for value in (float("nan"), float("inf"), float("-inf")):
                with self.subTest(label=label, value=repr(value)):
                    entry = self.valid_catalog_entry()
                    mutate(entry, value)
                    with self.assertRaisesRegex(CatalogError, "finite|JSON"):
                        validate_settings_catalog(
                            {"schema_version": 2, "settings": [entry]},
                            self.discovered_steps(),
                        )

    def test_catalog_contract_accepts_arbitrary_precision_json_integers(self):
        huge = 10**1000
        larger = 10**1001

        accepted = self.valid_catalog_entry()
        accepted["contract"].update(
            {"accepted_values": [huge, larger], "range": None}
        )
        without_range = validate_settings_catalog(
            {"schema_version": 2, "settings": [accepted]},
            self.discovered_steps(),
        )
        self.assertEqual(
            without_range.settings[0].contract.accepted_values,
            (huge, larger),
        )

        accepted["contract"].update(
            {
                "range": {
                    "minimum": huge,
                    "maximum": larger,
                    "minimum_inclusive": True,
                    "maximum_inclusive": True,
                },
            }
        )
        accepted["defaults"][0]["value"] = {
            "outer": [huge, {"inner": larger}]
        }
        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [accepted]},
            self.discovered_steps(),
        )
        self.assertEqual(catalog.settings[0].contract.range.minimum, huge)
        self.assertEqual(catalog.settings[0].contract.range.maximum, larger)
        self.assertEqual(catalog.settings[0].defaults[0].value["outer"][0], huge)

        reversed_range = deepcopy(accepted)
        reversed_range["contract"]["range"].update(
            {"minimum": larger, "maximum": huge}
        )
        with self.assertRaisesRegex(CatalogError, "minimum must not exceed maximum"):
            validate_settings_catalog(
                {"schema_version": 2, "settings": [reversed_range]},
                self.discovered_steps(),
            )

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            schema_path = root / "settings-catalog.schema.json"
            catalog_path = root / "settings-catalog.json"
            schema_path.write_text(
                json.dumps(settings_catalog_schema()), encoding="utf-8"
            )
            catalog_path.write_text(
                json.dumps({"schema_version": 2, "settings": [accepted]}),
                encoding="utf-8",
            )
            loaded = load_settings_catalog(catalog_path, schema_path, None)
        self.assertEqual(
            loaded.settings[0].contract.accepted_values,
            (huge, larger),
        )

    def test_catalog_unconsumed_settings_have_no_production_loads_or_effect_claims(self):
        expected_by_source = {
            "jobs/process/BaseSDTrainProcess.py": {
                "do_lorm",
                "lorm_extract_mode",
                "lorm_extract_mode_param",
            },
            "toolkit/config_modules.py": {
                "ilora_down",
                "ilora_mid",
                "ilora_up",
                "image_dir",
            },
        }
        all_fields = set().union(*expected_by_source.values())
        for source, expected_fields in expected_by_source.items():
            tree = ast.parse((REPOSITORY_ROOT / source).read_text(encoding="utf-8"))
            stores = {
                node.attr
                for node in ast.walk(tree)
                if isinstance(node, ast.Attribute)
                and isinstance(node.ctx, ast.Store)
                and node.attr in all_fields
            }
            loads = {
                node.attr
                for node in ast.walk(tree)
                if isinstance(node, ast.Attribute)
                and isinstance(node.ctx, ast.Load)
                and node.attr in all_fields
            }
            self.assertEqual(stores, expected_fields)
            self.assertEqual(loads, set())

        production_paths = [REPOSITORY_ROOT / "run.py"]
        for directory in ("jobs", "extensions", "extensions_built_in", "toolkit"):
            production_paths.extend((REPOSITORY_ROOT / directory).rglob("*.py"))
        loaded_fields = {}
        for path in production_paths:
            source = path.read_text(encoding="utf-8")
            if not any(field in source for field in all_fields):
                continue
            tree = ast.parse(source)
            loads = {
                node.attr
                for node in ast.walk(tree)
                if isinstance(node, ast.Attribute)
                and isinstance(node.ctx, ast.Load)
                and node.attr in all_fields
            }
            if loads:
                loaded_fields[path.relative_to(REPOSITORY_ROOT).as_posix()] = loads
        self.assertEqual(loaded_fields, {})

        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        expected_ids = {
            "process.do_lorm",
            "process.lorm_extract_mode",
            "process.lorm_extract_mode_param",
            "adapter.ilora_down",
            "adapter.ilora_mid",
            "adapter.ilora_up",
            "adapter.image_dir",
        }
        for setting_id in expected_ids:
            with self.subTest(setting=setting_id):
                setting = settings[setting_id]
                teaching = " ".join(
                    (
                        setting.render.description,
                        setting.render.benefits,
                        setting.render.drawbacks,
                    )
                ).casefold()
                self.assertEqual(setting.lifecycle, "unconsumed")
                self.assertEqual(setting.authority, "user")
                self.assertIn("parsed", teaching)
                self.assertIn("no runtime effect", teaching)
                self.assertEqual(setting.interactions, ())
        self.assertIsNone(
            settings["process.lorm_extract_mode"].contract.accepted_values
        )
        self.assertEqual(
            settings["process.lorm_extract_mode_param"].contract.supported_type,
            "number",
        )

    def test_root_config_example_is_accepted_by_source_base_job_loader(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        example = next(
            setting.render.example
            for setting in catalog.settings
            if setting.id == "root.config"
        )
        parsed = yaml.safe_load(example)

        source_path = REPOSITORY_ROOT / "jobs/BaseJob.py"
        tree = ast.parse(source_path.read_text(encoding="utf-8"))
        class_node = next(
            node
            for node in tree.body
            if isinstance(node, ast.ClassDef) and node.name == "BaseJob"
        )
        module = ast.fix_missing_locations(
            ast.Module(body=[class_node], type_ignores=[])
        )
        namespace = {
            "OrderedDict": OrderedDict,
            "List": list,
            "BaseProcess": object,
            "importlib": SimpleNamespace(
                import_module=lambda _name: SimpleNamespace()
            ),
        }
        exec(compile(module, str(source_path), "exec"), namespace)

        class DummyProcess:
            def __init__(self, process_id, job, config):
                self.process_id = process_id
                self.job = job
                self.config = config

        job = namespace["BaseJob"](
            OrderedDict({"job": "test", **parsed})
        )
        job.load_processes({"diffusion_trainer": DummyProcess})
        self.assertEqual(len(job.process), 1)
        self.assertEqual(job.process[0].config["type"], "diffusion_trainer")

    def test_catalog_disk_loader_rejects_json_non_finite_constants_recursively(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            schema_path = root / "settings-catalog.schema.json"
            catalog_path = root / "settings-catalog.json"
            schema_path.write_text(
                json.dumps(settings_catalog_schema()), encoding="utf-8"
            )
            for constant in ("NaN", "Infinity", "-Infinity"):
                with self.subTest(constant=constant):
                    entry = self.valid_catalog_entry()
                    entry["defaults"][0]["value"] = {
                        "outer": [{"inner": 0.0}]
                    }
                    encoded = json.dumps(
                        {"schema_version": 2, "settings": [entry]}
                    ).replace("0.0", constant, 1)
                    catalog_path.write_text(encoded, encoding="utf-8")
                    with self.assertRaisesRegex(CatalogError, "non-finite"):
                        load_settings_catalog(catalog_path, schema_path, None)

    def test_catalog_paths_and_source_claims_are_intrinsically_exact(self):
        mutations = (
            (
                "config.process*.train.steps",
                lambda entry: entry["locations"][0].update(
                    {"path": "config.process*.train.steps"}
                ),
            ),
            (
                "config.process[*].train.*",
                lambda entry: entry["locations"][0].update(
                    {"path": "config.process[*].train.*"}
                ),
            ),
            (
                "config.process?.train.steps",
                lambda entry: entry["aliases"].append(
                    {
                        "location": "config.process?.train.steps",
                        "replacement": "train.steps",
                        "precedence": "replacement-wins",
                        "migration": "Use train.steps.",
                        "status": "legacy",
                    }
                ),
            ),
            (
                "../outside.py",
                lambda entry: entry["source_claims"][0].update(
                    {"source": "../outside.py"}
                ),
            ),
            (
                "Config.*",
                lambda entry: entry["source_claims"][0].update(
                    {"symbol": "Config.*"}
                ),
            ),
            (
                "wildcard key",
                lambda entry: entry["source_claims"][0].update({"key": "step*"}),
            ),
            (
                "wildcard read kind",
                lambda entry: entry["source_claims"][0].update(
                    {"read_kind": "attribute.*"}
                ),
            ),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            schema_path = root / "settings-catalog.schema.json"
            catalog_path = root / "settings-catalog.json"
            schema_path.write_text(
                json.dumps(settings_catalog_schema()), encoding="utf-8"
            )
            for label, mutate in mutations:
                with self.subTest(label=label):
                    entry = self.valid_catalog_entry()
                    mutate(entry)
                    catalog_path.write_text(
                        json.dumps({"schema_version": 2, "settings": [entry]}),
                        encoding="utf-8",
                    )
                    with self.assertRaisesRegex(
                        CatalogError, "canonical|portable|exact|wildcard"
                    ):
                        load_settings_catalog(catalog_path, schema_path, None)

    def test_catalog_source_claim_allows_exact_attribute_subscription_read_kind(self):
        entry = self.valid_catalog_entry()
        entry["source_claims"][0]["read_kind"] = "attribute[]"
        catalog = validate_settings_catalog(
            {"schema_version": 2, "settings": [entry]},
            (
                DiscoveredSetting(
                    "toolkit/config_modules.py",
                    "TrainConfig.__init__",
                    10,
                    "steps",
                    "attribute[]",
                    "core",
                    "2000",
                ),
            ),
        )
        self.assertEqual(catalog.settings[0].source_claims[0].read_kind, "attribute[]")

    def test_catalog_contract_checks_committed_schema_drift_before_catalog_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            schema_path = root / "settings-catalog.schema.json"
            catalog_path = root / "settings-catalog.json"
            schema_path.write_text(
                json.dumps({"title": "stale"}), encoding="utf-8"
            )
            catalog_path.write_text("not json", encoding="utf-8")

            with self.assertRaisesRegex(CatalogError, "schema drift"):
                load_settings_catalog(
                    catalog_path,
                    schema_path,
                    self.discovered_steps(),
                )

    def test_catalog_contract_canonical_artifacts_are_generated(self):
        schema_path = (
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json"
        )
        catalog_path = REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json"

        catalog = load_settings_catalog(catalog_path, schema_path, None)

        self.assertIsInstance(catalog.settings, tuple)
        self.assertEqual(
            json.loads(schema_path.read_text(encoding="utf-8")),
            settings_catalog_schema(),
        )

    def test_catalog_render_metadata_contains_only_concrete_examples(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        placeholder = re.compile(
            r"<[^>]+>|\b(?:todo|tbd|placeholder|fill[- ]?me[- ]?in)\b",
            re.IGNORECASE,
        )
        for setting in catalog.settings:
            with self.subTest(setting=setting.id):
                render_fields = (
                    setting.render.description,
                    setting.render.benefits,
                    setting.render.drawbacks,
                    setting.render.example,
                )
                self.assertFalse(any(placeholder.search(text) for text in render_fields))
                separator = "=" if all(
                    location.kind == "environment"
                    for location in setting.locations
                ) else (
                    " "
                    if any(
                        location.kind == "cli"
                        for location in setting.locations
                    ) and setting.render.example.startswith("--")
                    else ":"
                )
                key, found, value = setting.render.example.partition(separator)
                self.assertEqual(found, separator)
                self.assertTrue(key.strip())
                self.assertTrue(value.strip())

    def test_catalog_adapter_teaching_is_setting_specific_and_non_repetitive(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        adapters = tuple(
            setting for setting in catalog.settings if setting.id.startswith("adapter.")
        )
        self.assertEqual(len(adapters), 49)
        generic_template = re.compile(
            r"provides explicit control of|for compatible adapter workflows",
            re.IGNORECASE,
        )
        for setting in adapters:
            with self.subTest(setting=setting.id):
                self.assertIsNone(generic_template.search(setting.render.benefits))
                self.assertGreaterEqual(len(setting.render.benefits.split()), 6)
        self.assertEqual(
            len({setting.render.benefits.casefold() for setting in adapters}),
            len(adapters),
        )
        self.assertEqual(
            len({setting.render.drawbacks.casefold() for setting in adapters}),
            len(adapters),
        )
        self.assertEqual(
            len({setting.render.example.casefold() for setting in adapters}),
            len(adapters),
        )

    def test_catalog_contract_cli_rejects_committed_schema_drift(self):
        schema_path = (
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json"
        )
        original = schema_path.read_bytes()
        try:
            schema_path.write_text("{}\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, "scripts/validate_training_book.py"],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
        finally:
            schema_path.write_bytes(original)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("schema drift", result.stderr)


class TrainingBookUiFactsContractTests(unittest.TestCase):
    def valid_value(self):
        return {"kind": "undefined"}

    def valid_presence(self, *, present=True):
        if not present:
            return {"present": False}
        return {"present": True, "value": self.valid_value()}

    def valid_facts(self):
        absent = self.valid_presence(present=False)
        return {
            "schema_version": 2,
            "model_architectures": [{
                "name": "fixture", "label": "Fixture", "group": "image",
                "model_path": self.valid_presence(), "gate_url": absent,
                "is_video_model": absent, "has_multiline_prompts": absent,
                "accuracy_recovery_adapters": absent, "sample_tags": absent,
                "custom_model_select_options": {"present": False},
                "model_notes": {"present": False}, "controls": [],
                "defaults": [], "default_containers": [],
                "disable_sections": [], "additional_sections": [],
            }],
            "defaults": [],
            "config_claims": [{
                "source_path": "ui/src/example.tsx", "symbol": "Example",
                "path": "config.process[*].train.steps", "kind": "setter",
                "ui_label": {"present": True, "value": {"kind": "string", "value": "Steps"}},
                "value_contract": {
                    "ui_type": "number", "widget_kind": "number",
                    "optional": False, "nullable": False,
                    "minimum": 1,
                },
            }],
            "global_settings": [], "architecture_transitions": [],
        }

    def valid_architecture_entry(self):
        entry = CatalogContractTests().valid_catalog_entry()
        entry.update({
            "id": "ui.architecture.fixture",
            "ui_label": "Fixture",
            "scope": "ui-state",
            "locations": [{"kind": "ui-state", "path": "architecture.fixture"}],
            "surfaces": ["simple-ui"],
            "persistence": "transient",
            "authority": "ui-derived",
            "applicability": [{"ui_architecture": "fixture"}],
            "defaults": [],
            "source_claims": [],
            "section": "model-architecture",
        })
        entry["contract"].update({
            "parser_type": "ui-state",
            "supported_type": "architecture-selector",
            "ui_type": "string",
            "ui_optional": False,
            "ui_nullable": False,
            "ui_accepted_values": ["fixture"],
            "ui_range": None,
            "example_type": "string",
            "accepted_values": ["fixture"],
            "range": None,
        })
        return entry

    def ownership_catalog_data(self, projected, *, train_entry=None):
        return {
            "schema_version": 2,
            "settings": [
                train_entry or CatalogContractTests().valid_catalog_entry(),
                self.valid_architecture_entry(),
            ],
            "ui_claims": [
                {
                    "setting_id": (
                        "ui.architecture.fixture"
                        if item.fact.fact_type == "architecture-field"
                        else "train.steps"
                    ),
                    "fact": item.fact.model_dump(mode="json", exclude_unset=True),
                }
                for item in projected
            ],
        }

    def test_ui_facts_contract_accepts_exact_tagged_shape(self):
        facts = validate_training_book_ui_facts(self.valid_facts())
        self.assertEqual(facts.model_architectures[0].name, "fixture")
        self.assertEqual(facts.config_claims[0].value_contract.ui_type, "number")

    def test_ui_facts_v2_requires_exact_kind_gated_server_state_contracts(self):
        data = self.valid_facts()
        data["schema_version"] = 2
        server_fact = deepcopy(data["config_claims"][0])
        server_fact.update({
            "source_path": "ui/src/example.ts",
            "symbol": "Example::process.env.TOKEN",
            "path": "TOKEN",
            "kind": "server-state",
            "ui_label": {"present": False},
            "value_contract": {
                "ui_type": "string",
                "widget_kind": None,
                "optional": True,
                "nullable": False,
            },
            "server_state_contract": {
                "operation": "read",
                "provenance": "environment",
                "authority": "user",
                "persistence": "runtime",
            },
        })
        data["global_settings"] = [server_fact]

        facts = validate_training_book_ui_facts(data)
        self.assertEqual(facts.schema_version, 2)
        self.assertEqual(
            facts.global_settings[0].server_state_contract.operation,
            "read",
        )
        self.assertIsNone(
            facts.global_settings[0].value_contract.widget_kind,
            "hidden environment/storage/server boundaries are not read-only widgets",
        )

        invalid_cases = []
        missing = deepcopy(data)
        del missing["global_settings"][0]["server_state_contract"]
        invalid_cases.append((missing, "server-state.*requires server_state_contract"))
        non_server = deepcopy(data)
        non_server["config_claims"][0]["server_state_contract"] = deepcopy(
            server_fact["server_state_contract"]
        )
        invalid_cases.append((non_server, "forbids server_state_contract"))
        read_only_widget = deepcopy(data)
        read_only_widget["global_settings"][0]["value_contract"][
            "widget_kind"
        ] = "read-only"
        invalid_cases.append((read_only_widget, "server-state.*widget_kind.*null"))
        extra = deepcopy(data)
        extra["global_settings"][0]["server_state_contract"]["extra"] = True
        invalid_cases.append((extra, "extra"))
        for field, replacement in {
            "operation": "rename",
            "provenance": "cookie",
            "authority": "sometimes-user",
            "persistence": "forever",
        }.items():
            invalid = deepcopy(data)
            invalid["global_settings"][0]["server_state_contract"][
                field
            ] = replacement
            invalid_cases.append((invalid, field))
        for payload, error in invalid_cases:
            with self.subTest(error=error):
                with self.assertRaisesRegex(CatalogError, error):
                    validate_training_book_ui_facts(payload)

        for version in (1, 3):
            invalid_version = deepcopy(data)
            invalid_version["schema_version"] = version
            with self.subTest(version=version):
                with self.assertRaisesRegex(CatalogError, "schema_version"):
                    validate_training_book_ui_facts(invalid_version)

    def test_server_state_owners_reconcile_authority_persistence_and_boundary_values(self):
        def source_fact(symbol, operation, ui_type, optional, nullable):
            return {
                "source_path": "ui/src/example.ts",
                "symbol": symbol,
                "path": "browser.localStorage.token",
                "kind": "server-state",
                "ui_label": {"present": False},
                "value_contract": {
                    "ui_type": ui_type,
                    "widget_kind": None,
                    "optional": optional,
                    "nullable": nullable,
                },
                "server_state_contract": {
                    "operation": operation,
                    "provenance": "browser-storage",
                    "authority": "user",
                    "persistence": "browser-storage",
                },
            }

        data = self.valid_facts()
        data["global_settings"] = [
            source_fact("Example::get", "read", "string", False, True),
            source_fact("Example::set", "write", "string", False, False),
            source_fact("Example::remove", "delete", None, False, False),
        ]

        def catalog_for(payload, *, authority="user", persistence="browser-storage"):
            facts = validate_training_book_ui_facts(payload)
            projected = catalog_module.project_training_book_ui_facts(facts)
            catalog_data = self.ownership_catalog_data(projected)
            storage = CatalogContractTests().valid_catalog_entry()
            storage.update({
                "id": "ui.browser-token",
                "ui_label": "Browser token",
                "scope": "ui-state",
                "locations": [{
                    "kind": "ui-state",
                    "path": "browser.localStorage.token",
                }],
                "surfaces": ["simple-ui"],
                "persistence": persistence,
                "authority": authority,
                "source_claims": [],
                "defaults": [],
            })
            storage["contract"].update({
                "parser_type": "ui-state",
                "supported_type": "exact-global-state",
                "ui_type": "string",
                "ui_optional": False,
                "ui_nullable": False,
                "ui_accepted_values": None,
                "ui_range": None,
                "example_type": "string",
                "accepted_values": None,
                "range": None,
                "null": "rejected",
            })
            catalog_data["settings"].append(storage)
            for owner in catalog_data["ui_claims"]:
                if owner["fact"].get("source_path") == "ui/src/example.ts":
                    owner["setting_id"] = storage["id"]
            catalog = validate_settings_catalog(
                catalog_data, CatalogContractTests().discovered_steps()
            )
            catalog_module.validate_ui_fact_ownership(
                facts, catalog, (), scope="ui-server-global"
            )

        catalog_for(data)
        for field, value in (
            ("authority", "ui-derived"),
            ("persistence", "transient"),
        ):
            with self.subTest(owner_field=field):
                with self.assertRaisesRegex(CatalogError, field):
                    catalog_for(data, **{field: value})

        invalid_boundaries = []
        wrong_read = deepcopy(data)
        wrong_read["global_settings"][0]["value_contract"].update({
            "optional": True, "nullable": True,
        })
        invalid_boundaries.append((wrong_read, "browser-storage read"))
        wrong_write = deepcopy(data)
        wrong_write["global_settings"][1]["value_contract"]["nullable"] = True
        invalid_boundaries.append((wrong_write, "browser-storage write"))
        wrong_delete = deepcopy(data)
        wrong_delete["global_settings"][2]["value_contract"]["ui_type"] = "string"
        invalid_boundaries.append((wrong_delete, "delete.*ui_type null"))
        for payload, error in invalid_boundaries:
            with self.subTest(error=error):
                with self.assertRaisesRegex(CatalogError, error):
                    catalog_for(payload)

    def test_server_state_exclusion_reasons_have_closed_allowed_semantics(self):
        def validate_exclusion(reason, authority, persistence):
            data = self.valid_facts()
            fact = {
                "source_path": "ui/src/example.ts",
                "symbol": "Example::derived",
                "path": "runtime.derived",
                "kind": "server-state",
                "ui_label": {"present": False},
                "value_contract": {
                    "ui_type": "string", "widget_kind": None,
                    "optional": False, "nullable": False,
                },
                "server_state_contract": {
                    "operation": "derive", "provenance": "runtime",
                    "authority": authority, "persistence": persistence,
                },
            }
            data["global_settings"] = [fact]
            facts = validate_training_book_ui_facts(data)
            projected = catalog_module.project_training_book_ui_facts(facts)
            catalog_data = self.ownership_catalog_data(projected)
            catalog_data["ui_claims"] = [
                owner for owner in catalog_data["ui_claims"]
                if owner["fact"].get("source_path") != "ui/src/example.ts"
            ]
            catalog = validate_settings_catalog(
                catalog_data, CatalogContractTests().discovered_steps()
            )
            exclusion = catalog_module.UiFactExclusion.model_validate({
                "fact": {
                    "fact_type": "source-claim",
                    **fact,
                },
                "reason": reason,
            })
            catalog_module.validate_ui_fact_ownership(
                facts, catalog, (exclusion,), scope="ui-server-global"
            )

        for reason, authority, persistence in (
            ("server-owned-value", "runtime-forced", "runtime"),
            ("runtime-derived-ui-state", "ui-derived", "transient"),
            ("transient-ui-state", "user", "transient"),
        ):
            with self.subTest(valid_reason=reason):
                validate_exclusion(reason, authority, persistence)

        for reason, authority, persistence in (
            ("server-owned-value", "user", "runtime"),
            ("runtime-derived-ui-state", "user", "database"),
            ("transient-ui-state", "runtime-forced", "runtime"),
            ("display-only-control", "ui-derived", "transient"),
        ):
            with self.subTest(invalid_reason=reason):
                with self.assertRaisesRegex(CatalogError, "exclusion.*semantics"):
                    validate_exclusion(reason, authority, persistence)

    def test_ui_facts_contract_models_suggestions_and_reciprocal_numeric_scales(self):
        suggested = self.valid_facts()
        suggested_contract = suggested["config_claims"][0]["value_contract"]
        suggested_contract.update({
            "ui_type": "string",
            "widget_kind": "select",
            "suggested_values": [
                {"kind": "string", "value": "txt"},
                {"kind": "string", "value": "json"},
            ],
        })
        suggested_contract.pop("minimum")
        suggested_facts = validate_training_book_ui_facts(suggested)
        self.assertEqual(
            tuple(
                value.value
                for value in suggested_facts.config_claims[
                    0
                ].value_contract.suggested_values
            ),
            ("txt", "json"),
        )
        self.assertIsNone(
            suggested_facts.config_claims[0].value_contract.accepted_values
        )

        scaled = self.valid_facts()
        scaled["config_claims"][0]["value_contract"].update({
            "config_to_ui_scale": 100,
            "ui_to_config_scale": 0.01,
        })
        scaled_facts = validate_training_book_ui_facts(scaled)
        scaled_contract = scaled_facts.config_claims[0].value_contract
        self.assertEqual(scaled_contract.config_to_ui_scale, 100)
        self.assertEqual(scaled_contract.ui_to_config_scale, 0.01)

        invalid_contracts = []
        missing_pair = deepcopy(scaled)
        del missing_pair["config_claims"][0]["value_contract"][
            "ui_to_config_scale"
        ]
        invalid_contracts.append((missing_pair, "paired"))
        zero_scale = deepcopy(scaled)
        zero_scale["config_claims"][0]["value_contract"][
            "ui_to_config_scale"
        ] = 0
        invalid_contracts.append((zero_scale, "nonzero"))
        nonreciprocal = deepcopy(scaled)
        nonreciprocal["config_claims"][0]["value_contract"][
            "config_to_ui_scale"
        ] = 10
        invalid_contracts.append((nonreciprocal, "reciprocal"))
        nonnumeric = deepcopy(scaled)
        nonnumeric["config_claims"][0]["value_contract"]["ui_type"] = "string"
        invalid_contracts.append((nonnumeric, "numeric UI"))
        for payload, message in invalid_contracts:
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_training_book_ui_facts(payload)

    def test_ui_facts_contract_accepts_only_exact_tagged_behavior_claims(self):
        data = self.valid_facts()
        behavior = {
            "guard": "property-absent",
            "operation": "write",
            "sources": [],
            "payload": {
                "kind": "literal",
                "value": {
                    "kind": "object",
                    "entries": [
                        {
                            "key": "log_every",
                            "value": {"kind": "number", "value": 1},
                        },
                        {
                            "key": "use_ui_logger",
                            "value": {"kind": "boolean", "value": True},
                        },
                    ],
                },
            },
        }
        data["config_claims"][0]["behavior_contract"] = behavior
        facts = validate_training_book_ui_facts(data)
        self.assertEqual(
            facts.config_claims[0].behavior_contract.model_dump(
                mode="json", exclude_unset=True
            ),
            behavior,
        )

        for guard in (
            "text-encoder-path-unsupported",
            "vae-path-unsupported",
            "layer-offloading-unsupported-property-present",
        ):
            with self.subTest(exact_guard=guard):
                exact = deepcopy(data)
                exact["config_claims"][0]["behavior_contract"]["guard"] = guard
                validate_training_book_ui_facts(exact)

        architecture_name = deepcopy(data)
        architecture_name["config_claims"][0]["behavior_contract"] = {
            "guard": "architecture-change",
            "operation": "write",
            "sources": [],
            "payload": {"kind": "architecture-name"},
        }
        validate_training_book_ui_facts(architecture_name)
        for label, mutate in {
            "source": lambda item: item.update(
                sources=["config.process[*].model.arch"]
            ),
            "delete operation": lambda item: item.update(operation="delete"),
        }.items():
            with self.subTest(architecture_name=label):
                invalid = deepcopy(architecture_name)
                mutate(invalid["config_claims"][0]["behavior_contract"])
                with self.assertRaisesRegex(
                    CatalogError,
                    "architecture-name.*source-free write|delete requires undefined",
                ):
                    validate_training_book_ui_facts(invalid)

        invalid_cases = {
            "unknown operation": (
                lambda item: item.update(operation="rename"), "operation",
            ),
            "noncanonical source": (
                lambda item: item.update(
                    sources=["config.process[0].sample.prompts"]
                ),
                "sources",
            ),
            "untagged payload": (
                lambda item: item.update(payload={"value": False}), "payload",
            ),
            "delete with literal": (
                lambda item: item.update(operation="delete"),
                "delete.*undefined",
            ),
            "copy without source": (
                lambda item: item.update(payload={"kind": "copy"}),
                "source_path",
            ),
            "prompt map without source": (
                lambda item: item.update(payload={
                    "kind": "map-prompt-objects", "item_key": "prompt",
                }),
                "source_path",
            ),
            "stale vague guard": (
                lambda item: item.update(guard="cleaned-model-changed"),
                "guard",
            ),
        }
        for label, (mutate, error) in invalid_cases.items():
            with self.subTest(label=label):
                invalid = deepcopy(data)
                mutate(invalid["config_claims"][0]["behavior_contract"])
                with self.assertRaisesRegex(CatalogError, error):
                    validate_training_book_ui_facts(invalid)

    def test_ui_facts_contract_accepts_exact_next_dynamic_route_sources(self):
        data = self.valid_facts()
        data["global_settings"] = [deepcopy(data["config_claims"][0])]
        data["global_settings"][0]["source_path"] = (
            "ui/src/app/api/jobs/[jobID]/start/route.ts"
        )

        facts = validate_training_book_ui_facts(data)

        self.assertEqual(
            facts.global_settings[0].source_path,
            "ui/src/app/api/jobs/[jobID]/start/route.ts",
        )

        for invalid_segment in ("[*]", "[..jobID]", "[job-ID]", "job[ID]"):
            with self.subTest(invalid_segment=invalid_segment):
                invalid = deepcopy(data)
                invalid["global_settings"][0]["source_path"] = (
                    f"ui/src/app/api/jobs/{invalid_segment}/route.ts"
                )
                with self.assertRaisesRegex(ValueError, "portable confined"):
                    validate_training_book_ui_facts(invalid)

    def test_ui_facts_contract_rejects_shape_presence_value_and_path_drift(self):
        mutations = []
        extra = self.valid_facts()
        extra["extra"] = True
        mutations.append((extra, "extra"))
        missing_value = self.valid_facts()
        missing_value["model_architectures"][0]["model_path"] = {"present": True}
        mutations.append((missing_value, "value"))
        wrong_tag = self.valid_facts()
        wrong_tag["config_claims"][0]["ui_label"]["value"] = {"kind": "number", "value": True}
        mutations.append((wrong_tag, "number"))
        bad_path = self.valid_facts()
        bad_path["config_claims"][0]["path"] = "config.process[0].train.steps"
        mutations.append((bad_path, "canonical"))
        duplicate = self.valid_facts()
        duplicate["config_claims"].append(deepcopy(duplicate["config_claims"][0]))
        mutations.append((duplicate, "duplicate"))
        for payload, message in mutations:
            with self.subTest(message=message):
                with self.assertRaisesRegex(CatalogError, message):
                    validate_training_book_ui_facts(payload)

    def test_ui_facts_file_loader_rejects_non_json_and_round_trips(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(self.valid_facts()), encoding="utf-8")
            self.assertEqual(load_training_book_ui_facts(path).schema_version, 2)
            path.write_text("not json", encoding="utf-8")
            with self.assertRaisesRegex(CatalogError, "valid JSON"):
                load_training_book_ui_facts(path)

    def test_validation_cli_loads_the_explicit_ui_facts_path(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(self.valid_facts()), encoding="utf-8")
            valid = subprocess.run(
                [sys.executable, "scripts/validate_training_book.py", "--ui-facts", str(path)],
                cwd=REPOSITORY_ROOT, capture_output=True, text=True, check=False,
            )
            path.write_text("{}", encoding="utf-8")
            invalid = subprocess.run(
                [sys.executable, "scripts/validate_training_book.py", "--ui-facts", str(path)],
                cwd=REPOSITORY_ROOT, capture_output=True, text=True, check=False,
            )
        self.assertEqual(valid.returncode, 0, valid.stdout + valid.stderr)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("UI facts", invalid.stderr)

    def test_validation_cli_ui_scope_reaches_exact_ownership(self):
        facts = self.valid_facts()
        facts["config_claims"][0]["source_path"] = (
            "ui/src/app/jobs/new/SimpleJob.tsx"
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(facts), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--ui-facts",
                    str(path),
                    "--scope",
                    "ui-defaults-transitions",
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stale UI owners", result.stderr)

    def test_validation_cli_server_global_scope_reaches_exact_ownership(self):
        facts = self.valid_facts()
        facts["global_settings"] = [deepcopy(facts["config_claims"][0])]
        facts["global_settings"][0].update({
            "source_path": "ui/src/app/jobs/new/SimpleJob.tsx",
            "symbol": "SimpleJob::SelectInput::gpuids::GPU ID",
            "path": "gpuids",
            "value_contract": {
                "ui_type": "string",
                "widget_kind": "select",
                "optional": True,
                "nullable": False,
            },
        })
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(facts), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--ui-facts",
                    str(path),
                    "--scope",
                    "ui-server-global",
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stale UI owners", result.stderr)

    def test_validation_cli_check_discovery_with_ui_facts_reaches_aggregate_ownership(self):
        facts = self.valid_facts()
        facts["config_claims"][0]["source_path"] = (
            "ui/src/app/jobs/new/SimpleJob.tsx"
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(facts), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--check-discovery",
                    "--ui-facts",
                    str(path),
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stale UI owners", result.stderr)
        self.assertNotIn("requires exactly --scope", result.stderr)

    def test_validation_cli_rejects_empty_typescript_source_group_coverage(self):
        facts = self.valid_facts()
        for claim in facts["config_claims"]:
            claim["source_path"] = "outside/not-declared.ts"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "facts.json"
            path.write_text(json.dumps(facts), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--ui-facts",
                    str(path),
                    "--scope",
                    "ui-defaults-transitions",
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "typescript-test source group emitted no facts", result.stderr
        )

    def test_ui_facts_project_to_exact_scoped_atomic_ownership_facts(self):
        facts = validate_training_book_ui_facts(self.valid_facts())

        projected = catalog_module.project_training_book_ui_facts(facts)

        self.assertEqual(len(projected), 14)
        self.assertEqual(
            {item.scope for item in projected}, {"ui-defaults-transitions"}
        )
        self.assertEqual(
            {item.fact.fact_type for item in projected},
            {"source-claim", "architecture-field"},
        )
        architecture_fields = {
            item.fact.field
            for item in projected
            if item.fact.fact_type == "architecture-field"
        }
        self.assertEqual(
            architecture_fields,
            {
                "label", "group", "model_path", "gate_url",
                "is_video_model", "has_multiline_prompts",
                "accuracy_recovery_adapters", "sample_tags",
                "custom_model_select_options", "model_notes", "controls",
                "disable_sections", "additional_sections",
            },
        )

        data = self.valid_facts()
        data["global_settings"] = [deepcopy(data["config_claims"][0])]
        data["global_settings"][0].update({
            "source_path": "ui/src/app/jobs/new/global.tsx",
            "symbol": "Global::SelectInput::gpuids::GPU ID",
            "path": "gpuids",
        })
        projected = catalog_module.project_training_book_ui_facts(
            validate_training_book_ui_facts(data)
        )
        self.assertEqual(
            sum(item.scope == "ui-server-global" for item in projected), 1
        )

    def test_ui_fact_ownership_requires_exactly_one_live_owner_or_exclusion(self):
        facts = validate_training_book_ui_facts(self.valid_facts())
        projected = catalog_module.project_training_book_ui_facts(facts)
        data = self.ownership_catalog_data(projected)
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )
        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )

        split_selector_data = deepcopy(data)
        architecture_claim = next(
            claim for claim in split_selector_data["ui_claims"]
            if claim["fact"]["fact_type"] == "architecture-field"
        )
        architecture_claim["setting_id"] = "train.steps"
        split_selector_catalog = validate_settings_catalog(
            split_selector_data, CatalogContractTests().discovered_steps()
        )
        with self.assertRaisesRegex(CatalogError, "one selector owner"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                split_selector_catalog,
                (),
                scope="ui-defaults-transitions",
            )

        unowned_data = deepcopy(data)
        del unowned_data["ui_claims"][0]
        unowned_catalog = validate_settings_catalog(
            unowned_data, CatalogContractTests().discovered_steps()
        )
        with self.assertRaisesRegex(CatalogError, "unowned UI facts.*1"):
            catalog_module.validate_ui_fact_ownership(
                facts, unowned_catalog, (), scope="ui-defaults-transitions"
            )

        stale_data = deepcopy(data)
        stale = deepcopy(stale_data["ui_claims"][0])
        stale["fact"]["symbol"] += "::stale"
        stale_data["ui_claims"].append(stale)
        stale_catalog = validate_settings_catalog(
            stale_data, CatalogContractTests().discovered_steps()
        )
        with self.assertRaisesRegex(CatalogError, "stale UI owners.*1"):
            catalog_module.validate_ui_fact_ownership(
                facts, stale_catalog, (), scope="ui-defaults-transitions"
            )

        exclusion = catalog_module.UiFactExclusion.model_validate({
            "fact": projected[0].fact.model_dump(mode="json", exclude_unset=True),
            "reason": "display-only-control",
        })
        with self.assertRaisesRegex(CatalogError, "owner and exclusion"):
            catalog_module.validate_ui_fact_ownership(
                facts, catalog, (exclusion,), scope="ui-defaults-transitions"
            )

    def test_new_auth_boundary_remains_unowned_until_exactly_classified(self):
        facts = load_production_training_book_ui_facts()
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        catalog_module.validate_ui_fact_ownership(
            facts, catalog, exclusions, scope="ui-server-global"
        )
        existing = next(
            fact for fact in facts.global_settings
            if fact.source_path == "ui/src/utils/api.ts"
            and fact.symbol == "apiClient.response::status=401"
            and fact.path == "auth.is_authorized"
        )
        existing_identity = catalog_module.UiOwnedSourceFact(
            fact_type="source-claim",
            **existing.model_dump(mode="python", exclude_unset=True),
        ).model_dump_json()
        self.assertEqual(
            [
                exclusion.reason for exclusion in exclusions
                if exclusion.fact.model_dump_json() == existing_identity
            ],
            ["runtime-derived-ui-state"],
        )

        changed = facts.model_dump(mode="json", exclude_unset=True)
        added = existing.model_copy(
            update={"symbol": "apiClient.response::status=403"}
        )
        changed["global_settings"].append(
            added.model_dump(mode="json", exclude_unset=True)
        )
        with self.assertRaisesRegex(CatalogError, "unowned UI facts.*1"):
            catalog_module.validate_ui_fact_ownership(
                validate_training_book_ui_facts(changed),
                catalog,
                exclusions,
                scope="ui-server-global",
            )

    def test_new_production_config_behavior_remains_unowned(self):
        facts = load_production_training_book_ui_facts()
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        behaviors = [
            fact for fact in facts.config_claims
            if fact.behavior_contract is not None
        ]
        self.assertEqual(len(behaviors), 37)
        catalog_module.validate_ui_fact_ownership(
            facts,
            catalog,
            exclusions,
            scope="ui-defaults-transitions",
        )

        logging = next(
            fact for fact in behaviors
            if fact.symbol == "migrateJobConfig::logging::absent::write"
        )
        changed = facts.model_dump(mode="json", exclude_unset=True)
        added = logging.model_copy(update={
            "symbol": "migrateJobConfig::logging::absent::secondary-write"
        })
        changed["config_claims"].append(
            added.model_dump(mode="json", exclude_unset=True)
        )
        with self.assertRaisesRegex(CatalogError, "unowned UI facts.*1"):
            catalog_module.validate_ui_fact_ownership(
                validate_training_book_ui_facts(changed),
                catalog,
                exclusions,
                scope="ui-defaults-transitions",
            )

        changed_existing = facts.model_dump(mode="json", exclude_unset=True)
        logging_index = next(
            index for index, fact in enumerate(changed_existing["config_claims"])
            if fact["symbol"] == "migrateJobConfig::logging::absent::write"
        )
        changed_existing["config_claims"][logging_index] = (
            added.model_dump(mode="json", exclude_unset=True)
        )
        with self.assertRaisesRegex(CatalogError, "stale UI owners.*1"):
            catalog_module.validate_ui_fact_ownership(
                validate_training_book_ui_facts(changed_existing),
                catalog,
                exclusions,
                scope="ui-defaults-transitions",
            )

    def test_production_config_behaviors_have_exact_semantic_owners_and_teaching(self):
        facts = load_production_training_book_ui_facts()
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        behaviors = [
            fact for fact in facts.config_claims
            if fact.behavior_contract is not None
        ]
        expected_owner_by_path = {
            "config.process[*].sample.prompts": "sample.samples",
            "config.process[*].sample.samples": "sample.samples",
            "config.process[*].type": "process.type",
            "config.process[*].logging": "process.logging",
            "config.process[*].device": "process.device",
            "config.process[*].model.auto_memory": "model.auto_memory",
            "config.process[*].model.layer_offloading": "model.layer_offloading",
            "config.process[*].model.layer_offloading_text_encoder_percent": "model.layer_offloading_text_encoder_percent",
            "config.process[*].model.layer_offloading_transformer_percent": "model.layer_offloading_transformer_percent",
            "config.process[*].model.low_vram": "model.low_vram",
            "config.process[*].model.te_name_or_path": "model.te_name_or_path",
            "config.process[*].model.vae_path": "model.vae_path",
            "config.process[*].model.arch": "model.arch",
            "config.process[*].datasets[*].controls": "dataset.controls",
            "config.process[*].datasets[*].control_path": "dataset.control_path",
            "config.process[*].datasets[*].control_path_1": "dataset.control_path_1",
            "config.process[*].datasets[*].control_path_2": "dataset.control_path_2",
            "config.process[*].datasets[*].control_path_3": "dataset.control_path_3",
            "config.process[*].datasets[*].num_frames": "dataset.num_frames",
            "config.process[*].datasets[*].auto_frame_count": "dataset.auto_frame_count",
            "config.process[*].sample.samples[*].ctrl_img": "sample.item.ctrl_img",
        }
        behavior_identities = {
            catalog_module.UiOwnedSourceFact(
                fact_type="source-claim",
                **fact.model_dump(mode="python", exclude_unset=True),
            ).model_dump_json(): fact
            for fact in behaviors
        }
        owners = {
            owner.fact.model_dump_json(): owner.setting_id
            for owner in catalog.ui_claims
            if owner.fact.model_dump_json() in behavior_identities
        }
        self.assertEqual(len(behaviors), 37)
        self.assertEqual(len(owners), 37)
        self.assertEqual(
            {
                identity: expected_owner_by_path[fact.path]
                for identity, fact in behavior_identities.items()
            },
            owners,
        )
        self.assertFalse(
            set(behavior_identities).intersection(
                exclusion.fact.model_dump_json() for exclusion in exclusions
            ),
            "config behavior facts must be owned, not excluded",
        )
        catalog_module.validate_ui_fact_ownership(
            facts,
            catalog,
            exclusions,
            scope="ui-defaults-transitions",
        )

        exact_architecture_guards = {
            "handleModelArchChange::anima-paths::te_name_or_path::delete":
                "text-encoder-path-unsupported",
            "handleModelArchChange::anima-paths::vae_path::delete":
                "vae-path-unsupported",
            **{
                (
                    "handleModelArchChange::layer-offloading::"
                    f"unsupported-property-present::{suffix}::delete"
                ): "layer-offloading-unsupported-property-present"
                for suffix in (
                    "layer_offloading",
                    "layer_offloading_text_encoder_percent",
                    "layer_offloading_transformer_percent",
                )
            },
        }
        self.assertEqual(
            exact_architecture_guards,
            {
                fact.symbol: fact.behavior_contract.guard
                for fact in behaviors
                if fact.symbol in exact_architecture_guards
            },
        )

        settings = {setting.id: setting for setting in catalog.settings}
        self.assertEqual(
            [alias.model_dump(mode="json") for alias in settings["sample.samples"].aliases],
            [{
                "location": "config.process[*].sample.prompts",
                "replacement": "sample.samples",
                "precedence": "alias-wins",
                "migration": "Convert each nonempty legacy prompts array in source order to sample objects containing a prompt field, overwrite samples, then delete prompts.",
                "status": "legacy",
            }],
        )
        self.assertIn(
            {
                "location": "config.process[*].model.auto_memory",
                "replacement": "model.layer_offloading",
                "precedence": "alias-wins",
                "migration": "When auto_memory is present, copy its falsey-coerced boolean value to layer_offloading, then delete auto_memory.",
                "status": "deprecated",
            },
            [alias.model_dump(mode="json") for alias in settings["model.layer_offloading"].aliases],
        )
        expected_teaching = {
            "process.type": "The UI migrator rewrites legacy ui_trainer to diffusion_trainer before queueing.",
            "process.logging": "When logging is absent, the UI migrator writes {log_every: 1, use_ui_logger: true}; an explicitly present value, including null, is retained.",
            "process.device": "On macOS, the UI migrator forces each process device to mps; this is distinct from the root config.device job setting.",
            "model.te_name_or_path": "Changing architecture deletes te_name_or_path only when the selected architecture does not support model.te_name_or_path, independently of model.vae_path support.",
            "model.vae_path": "Changing architecture deletes vae_path only when the selected architecture does not support model.vae_path, independently of model.te_name_or_path support.",
            "model.low_vram": "Changing architecture writes low_vram=false when the selected architecture does not support model.low_vram.",
            "model.layer_offloading": "When model.layer_offloading is unsupported and the main layer_offloading property is present, changing architecture deletes layer_offloading and both percentage fields from the copied model; when model.layer_offloading is supported but the main property is absent, it writes layer_offloading=false and both percentage fields to 1.",
            "model.layer_offloading_text_encoder_percent": "Changing architecture deletes layer_offloading_text_encoder_percent only when model.layer_offloading is unsupported and the main layer_offloading property is present; it initializes the percentage to 1 when model.layer_offloading is supported but the main property is absent.",
            "model.layer_offloading_transformer_percent": "Changing architecture deletes layer_offloading_transformer_percent only when model.layer_offloading is unsupported and the main layer_offloading property is present; it initializes the percentage to 1 when model.layer_offloading is supported but the main property is absent.",
            "model.arch": "Changing architecture writes the selected architecture name, reverts current defaults from tuple index 1, then applies selected defaults from tuple index 0.",
            "dataset.controls": "Changing architecture writes every dataset controls list from the selected architecture controls, falling back to an empty list.",
            "dataset.control_path": "Architecture changes initialize the active single-control path to null, copy a nonempty multi-control path into it when needed, and delete it for multi-control or no-control architectures.",
            "dataset.control_path_1": "Architecture changes initialize multi-control path 1 to null, copy a nonempty single-control path into it only when empty, and delete it for single-control or no-control architectures.",
            "dataset.control_path_2": "Architecture changes initialize multi-control path 2 to null and delete it for single-control or no-control architectures.",
            "dataset.control_path_3": "Architecture changes initialize multi-control path 3 to null and delete it for single-control or no-control architectures.",
            "dataset.num_frames": "Changing to an architecture without datasets.num_frames resets every dataset num_frames to 1.",
            "dataset.auto_frame_count": "Changing to an architecture without datasets.auto_frame_count deletes every dataset auto_frame_count value.",
            "sample.item.ctrl_img": "Changing to an architecture without sample.ctrl_img deletes ctrl_img from every sample item.",
        }
        for setting_id, description in expected_teaching.items():
            with self.subTest(setting=setting_id):
                self.assertIn(
                    description,
                    [item.description for item in settings[setting_id].normalizations],
                )
        process_device = settings["process.device"]
        self.assertEqual(process_device.authority, "user")
        self.assertEqual(process_device.persistence, "config")
        self.assertEqual(
            [location.path for location in process_device.locations],
            ["config.process[*].device"],
        )
        self.assertNotEqual(
            process_device.locations[0].path,
            settings["job.device"].locations[0].path,
        )

    def test_ui_setting_owner_must_match_visible_catalog_contract(self):
        fact_data = self.valid_facts()
        fact_data["config_claims"][0]["kind"] = "setting"
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        entry = CatalogContractTests().valid_catalog_entry()
        entry["contract"]["ui_type"] = "integer"
        data = self.ownership_catalog_data(projected, train_entry=entry)
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )

        with self.assertRaisesRegex(CatalogError, "train.steps.*ui_type.*number"):
            catalog_module.validate_ui_fact_ownership(
                facts, catalog, (), scope="ui-defaults-transitions"
            )

        optional_entry = CatalogContractTests().valid_catalog_entry()
        optional_entry["contract"]["ui_optional"] = True
        optional_catalog = validate_settings_catalog(
            self.ownership_catalog_data(
                projected, train_entry=optional_entry
            ),
            CatalogContractTests().discovered_steps(),
        )
        with self.assertRaisesRegex(CatalogError, "optionality.*False"):
            catalog_module.validate_ui_fact_ownership(
                facts, optional_catalog, (), scope="ui-defaults-transitions"
            )

    def test_ui_setting_owner_treats_creatable_suggestions_as_non_authoritative(self):
        fact_data = self.valid_facts()
        fact_data["config_claims"][0].update({
            "kind": "setting",
            "ui_label": {
                "present": True,
                "value": {"kind": "string", "value": "Caption Extension"},
            },
            "value_contract": {
                "ui_type": "string",
                "widget_kind": "select",
                "optional": True,
                "nullable": False,
                "suggested_values": [
                    {"kind": "string", "value": "txt"},
                    {"kind": "string", "value": "json"},
                ],
            },
        })
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        entry = CatalogContractTests().valid_catalog_entry()
        entry["ui_label"] = "Caption Extension"
        entry["contract"].update({
            "ui_type": "string",
            "ui_optional": True,
            "ui_nullable": False,
            "ui_accepted_values": None,
            "ui_suggested_values": ["txt", "json"],
            "ui_range": None,
        })
        data = self.ownership_catalog_data(projected, train_entry=entry)
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )
        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )

        stale_restriction = deepcopy(data)
        stale_restriction["settings"][0]["contract"][
            "ui_accepted_values"
        ] = ["txt", "json"]
        stale_catalog = validate_settings_catalog(
            stale_restriction, CatalogContractTests().discovered_steps()
        )
        with self.assertRaisesRegex(
            CatalogError, "accepted_values mismatch"
        ):
            catalog_module.validate_ui_fact_ownership(
                facts, stale_catalog, (), scope="ui-defaults-transitions"
            )

    def test_ui_setting_owner_compares_nested_accepted_values_and_fails_on_undefined(self):
        fact_data = self.valid_facts()
        claim = fact_data["config_claims"][0]
        claim["kind"] = "setting"
        claim["value_contract"].update({
            "ui_type": "number-list",
            "accepted_values": [{
                "kind": "array",
                "items": [
                    {"kind": "number", "value": 0.5},
                    {"kind": "number", "value": 1.0},
                ],
            }],
        })
        del claim["value_contract"]["minimum"]
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        entry = CatalogContractTests().valid_catalog_entry()
        entry["contract"].update({
            "ui_type": "number-list",
            "ui_accepted_values": [[0.5, 1.0]],
            "ui_range": None,
        })
        catalog = validate_settings_catalog(
            self.ownership_catalog_data(projected, train_entry=entry),
            CatalogContractTests().discovered_steps(),
        )
        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )

        undefined_data = deepcopy(fact_data)
        undefined_data["config_claims"][0]["value_contract"][
            "accepted_values"
        ] = [{"kind": "undefined"}]
        undefined_facts = validate_training_book_ui_facts(undefined_data)
        undefined_projected = catalog_module.project_training_book_ui_facts(
            undefined_facts
        )
        undefined_catalog = validate_settings_catalog(
            self.ownership_catalog_data(
                undefined_projected, train_entry=entry
            ),
            CatalogContractTests().discovered_steps(),
        )
        with self.assertRaisesRegex(CatalogError, "tagged undefined"):
            catalog_module.validate_ui_fact_ownership(
                undefined_facts,
                undefined_catalog,
                (),
                scope="ui-defaults-transitions",
            )

    def test_explicit_ui_control_mediator_owns_a_discriminator_target_without_yaml_overlap(self):
        fact_data = self.valid_facts()
        fact_data["config_claims"][0]["kind"] = "setting"
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        runtime = CatalogContractTests().valid_catalog_entry()
        runtime.update({"ui_label": None, "surfaces": ["advanced-yaml"]})
        runtime["contract"].update({"ui_type": None, "ui_optional": None})
        runtime["contract"].update({
            "ui_nullable": None,
            "ui_accepted_values": None,
            "ui_range": None,
        })
        mediator = CatalogContractTests().valid_catalog_entry()
        mediator.update({
            "id": "ui.train.steps-control",
            "scope": "ui-state",
            "locations": [{"kind": "ui-state", "path": "ui.controls.steps"}],
            "surfaces": ["simple-ui"],
            "persistence": "transient",
            "authority": "ui-derived",
            "source_claims": [],
            "ui_projection": "discriminator-control",
            "interactions": [{
                "setting": "train.steps",
                "kind": "affects",
                "description": "Writes the exact runtime steps field.",
                "applicability": [{"process_type": "diffusion_trainer"}],
            }],
        })
        data = self.ownership_catalog_data(projected, train_entry=runtime)
        data["settings"].append(mediator)
        source_claim = next(
            claim for claim in data["ui_claims"]
            if claim["fact"]["fact_type"] == "source-claim"
        )
        source_claim["setting_id"] = "ui.train.steps-control"
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )

        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )
        self.assertEqual(
            [location.kind for location in catalog.settings[2].locations],
            ["ui-state"],
        )

    def mediator_intersection_catalog(
        self,
        *,
        source_applicability,
        target_applicability,
        interaction_applicability,
    ):
        fact_data = self.valid_facts()
        fact_data["config_claims"][0]["kind"] = "setting"
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        target = CatalogContractTests().valid_catalog_entry()
        target["applicability"] = target_applicability
        mediator = CatalogContractTests().valid_catalog_entry()
        mediator.update({
            "id": "ui.train.steps-control",
            "scope": "ui-state",
            "locations": [{"kind": "ui-state", "path": "ui.controls.steps"}],
            "surfaces": ["simple-ui"],
            "persistence": "transient",
            "authority": "ui-derived",
            "source_claims": [],
            "ui_projection": "discriminator-control",
            "applicability": source_applicability,
            "interactions": [{
                "setting": "train.steps",
                "kind": "affects",
                "description": "Writes the exact runtime steps field.",
                "applicability": interaction_applicability,
            }],
        })
        data = self.ownership_catalog_data(projected, train_entry=target)
        data["settings"].append(mediator)
        source_claim = next(
            claim for claim in data["ui_claims"]
            if claim["fact"]["fact_type"] == "source-claim"
        )
        source_claim["setting_id"] = mediator["id"]
        return data

    def test_mediator_interaction_rejects_under_and_overbroad_applicability(self):
        source = [{
            "process_type": "diffusion_trainer",
            "optimizer_prefix": "prodigy",
        }]
        target = [{
            "process_type": "diffusion_trainer",
            "optimizer": "prodigy8bit",
        }]
        invalid_intersections = (
            [{"process_type": "diffusion_trainer"}],
            [{
                "process_type": "diffusion_trainer",
                "network_type": "lora",
                "optimizer": "prodigy8bit",
            }],
        )
        for interaction in invalid_intersections:
            with self.subTest(interaction=interaction):
                with self.assertRaisesRegex(
                    CatalogError, "mediator interaction applicability"
                ):
                    validate_settings_catalog(
                        self.mediator_intersection_catalog(
                            source_applicability=source,
                            target_applicability=target,
                            interaction_applicability=interaction,
                        ),
                        CatalogContractTests().discovered_steps(),
                    )

    def test_mediator_interaction_uses_exact_dispatch_over_matching_prefix(self):
        catalog = validate_settings_catalog(
            self.mediator_intersection_catalog(
                source_applicability=[{
                    "process_type": "diffusion_trainer",
                    "optimizer_prefix": "prodigy",
                }],
                target_applicability=[{
                    "process_type": "diffusion_trainer",
                    "optimizer": "prodigy8bit",
                }],
                interaction_applicability=[{
                    "process_type": "diffusion_trainer",
                    "optimizer": "prodigy8bit",
                }],
            ),
            CatalogContractTests().discovered_steps(),
        )

        interaction = catalog.settings[2].interactions[0]
        self.assertEqual(interaction.applicability[0].optimizer, "prodigy8bit")
        self.assertIsNone(interaction.applicability[0].optimizer_prefix)

    def test_mediator_interaction_rejects_empty_or_unproven_intersections(self):
        cases = (
            ([], [{"process_type": "diffusion_trainer"}], []),
            (
                [{"optimizer": "adam"}],
                [{"optimizer": "adafactor"}],
                [{"optimizer": "adam"}],
            ),
        )
        for source, target, interaction in cases:
            with self.subTest(source=source, target=target):
                with self.assertRaisesRegex(
                    CatalogError, "mediator interaction applicability"
                ):
                    validate_settings_catalog(
                        self.mediator_intersection_catalog(
                            source_applicability=source,
                            target_applicability=target,
                            interaction_applicability=interaction,
                        ),
                        CatalogContractTests().discovered_steps(),
                    )

    def test_mediator_interaction_rejects_duplicate_or_ambiguous_intersections(self):
        source = [
            {"optimizer_prefix": "prodigy"},
            {"optimizer": "prodigy8bit"},
        ]
        target = [{"optimizer": "prodigy8bit"}]
        for interaction in (
            [{"optimizer": "prodigy8bit"}],
            [
                {"optimizer": "prodigy8bit"},
                {"optimizer": "prodigy8bit"},
            ],
        ):
            with self.subTest(interaction=interaction):
                with self.assertRaisesRegex(
                    CatalogError, "mediator interaction applicability"
                ):
                    validate_settings_catalog(
                        self.mediator_intersection_catalog(
                            source_applicability=source,
                            target_applicability=target,
                            interaction_applicability=interaction,
                        ),
                        CatalogContractTests().discovered_steps(),
                    )

    def test_architecture_projected_control_exclusion_requires_owned_exact_metadata(self):
        fact_data = self.valid_facts()
        fact_data["model_architectures"][0]["sample_tags"] = {
            "present": True,
            "value": {
                "kind": "object",
                "entries": [{
                    "key": "BPM",
                    "value": {
                        "kind": "object",
                        "entries": [
                            {
                                "key": "title",
                                "value": {"kind": "string", "value": "BPM"},
                            },
                            {
                                "key": "type",
                                "value": {"kind": "string", "value": "number"},
                            },
                        ],
                    },
                }],
            },
        }
        fact_data["config_claims"][0].update({
            "kind": "setting",
            "path": "config.process[*].sample.samples[*].prompt",
            "symbol": (
                "SimpleJob::NumberInput::config.process[*].sample.samples[*].prompt::"
                "BPM::architecture=fixture::tag=BPM"
            ),
            "ui_label": {
                "present": True,
                "value": {"kind": "string", "value": "BPM"},
            },
        })
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        data = self.ownership_catalog_data(projected)
        source_claim = next(
            claim for claim in data["ui_claims"]
            if claim["fact"]["fact_type"] == "source-claim"
        )
        data["ui_claims"].remove(source_claim)
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )
        exclusion = catalog_module.UiFactExclusion.model_validate({
            "fact": source_claim["fact"],
            "reason": "architecture-projected-control",
        })
        catalog_module.validate_ui_fact_ownership(
            facts,
            catalog,
            (exclusion,),
            scope="ui-defaults-transitions",
        )

        changed = deepcopy(fact_data)
        changed["model_architectures"][0]["sample_tags"]["value"]["entries"][0][
            "value"
        ]["entries"][0]["value"]["value"] = "Tempo"
        with self.assertRaisesRegex(CatalogError, "stale UI owners"):
            catalog_module.validate_ui_fact_ownership(
                validate_training_book_ui_facts(changed),
                catalog,
                (exclusion,),
                scope="ui-defaults-transitions",
            )

    def test_ui_ownership_scopes_ignore_other_slice_stale_claims(self):
        fact_data = self.valid_facts()
        fact_data["global_settings"] = [deepcopy(fact_data["config_claims"][0])]
        fact_data["global_settings"][0].update({
            "source_path": "ui/src/app/jobs/new/global.tsx",
            "symbol": "Global::SelectInput::gpuids::GPU ID",
            "path": "gpuids",
        })
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        data = self.ownership_catalog_data(projected)
        global_claim = next(
            claim for claim in data["ui_claims"]
            if claim["fact"]["path"] == "gpuids"
        )
        global_claim["fact"]["symbol"] += "::stale"
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )

        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )
        with self.assertRaisesRegex(CatalogError, "stale UI owners.*1"):
            catalog_module.validate_ui_fact_ownership(
                facts, catalog, (), scope="ui-server-global"
            )

    def test_ui_default_and_transition_owners_match_exact_catalog_defaults(self):
        fact_data = self.valid_facts()
        present = {"present": True, "value": {"kind": "number", "value": 3000}}
        absent = {"present": False}
        fact_data["defaults"] = [{
            "source_path": "ui/src/app/jobs/new/jobConfig.ts",
            "symbol": "defaultJobConfig",
            "path": "config.process[*].train.steps",
            "value": present,
        }]
        fact_data["architecture_transitions"] = [{
            "architecture": "fixture",
            "path": "config.process[*].train.steps",
            "selected": present,
            "unselected": absent,
        }]
        fact_data["model_architectures"][0]["defaults"] = [{
            "declaration_path": "config.process[*].train.steps",
            "path": "config.process[*].train.steps",
            "selected": present,
            "unselected": absent,
        }]
        fact_data["model_architectures"][0]["default_containers"] = [{
            "path": "config.process[*].train.steps",
            "selected_present": True,
            "unselected_present": True,
        }]
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        self.assertEqual(len(projected), 18)
        self.assertEqual(
            {item.fact.fact_type for item in projected},
            {
                "source-claim", "ui-default", "architecture-transition",
                "architecture-field", "architecture-default",
                "architecture-container",
            },
        )

        entry = CatalogContractTests().valid_catalog_entry()
        entry["defaults"].extend([
            {
                "kind": "on-select", "presence": "present", "value": 3000,
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
            {
                "kind": "on-leave", "presence": "absent",
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
        ])

        def catalog_for(setting):
            return validate_settings_catalog(
                self.ownership_catalog_data(projected, train_entry=setting),
                CatalogContractTests().discovered_steps(),
            )

        catalog_module.validate_ui_fact_ownership(
            facts, catalog_for(entry), (), scope="ui-defaults-transitions"
        )

        wrong_container_data = self.ownership_catalog_data(
            projected, train_entry=entry
        )
        container_claim = next(
            claim for claim in wrong_container_data["ui_claims"]
            if claim["fact"]["fact_type"] == "architecture-container"
        )
        container_claim["setting_id"] = "ui.architecture.fixture"
        wrong_container_catalog = validate_settings_catalog(
            wrong_container_data, CatalogContractTests().discovered_steps()
        )
        with self.assertRaisesRegex(CatalogError, "first descendant owner"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                wrong_container_catalog,
                (),
                scope="ui-defaults-transitions",
            )

        bad_ui_default = deepcopy(entry)
        bad_ui_default["defaults"][0]["value"] = 3001
        with self.assertRaisesRegex(CatalogError, "ui-created default"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                catalog_for(bad_ui_default),
                (),
                scope="ui-defaults-transitions",
            )

        bad_transition = deepcopy(entry)
        bad_transition["defaults"][2]["value"] = 3001
        with self.assertRaisesRegex(CatalogError, "on-select default"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                catalog_for(bad_transition),
                (),
                scope="ui-defaults-transitions",
            )

        missing_runtime_applicability = deepcopy(entry)
        for default in missing_runtime_applicability["defaults"][2:]:
            default["applicability"] = [{"ui_architecture": "fixture"}]
        with self.assertRaisesRegex(CatalogError, "on-select default"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                catalog_for(missing_runtime_applicability),
                (),
                scope="ui-defaults-transitions",
            )

    def test_empty_architecture_container_requires_exact_structural_exclusion(self):
        fact_data = self.valid_facts()
        fact_data["model_architectures"][0]["default_containers"] = [{
            "path": "config.process[*].model.model_kwargs",
            "selected_present": True,
            "unselected_present": True,
        }]
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        data = self.ownership_catalog_data(projected)
        container_claim = next(
            claim for claim in data["ui_claims"]
            if claim["fact"]["fact_type"] == "architecture-container"
        )
        data["ui_claims"].remove(container_claim)
        catalog = validate_settings_catalog(
            data, CatalogContractTests().discovered_steps()
        )
        exclusion = catalog_module.UiFactExclusion.model_validate({
            "fact": container_claim["fact"],
            "reason": "structural-empty-container",
        })
        catalog_module.validate_ui_fact_ownership(
            facts,
            catalog,
            (exclusion,),
            scope="ui-defaults-transitions",
        )

        wrong_reason = catalog_module.UiFactExclusion.model_validate({
            "fact": container_claim["fact"],
            "reason": "structural-architecture-metadata",
        })
        with self.assertRaisesRegex(CatalogError, "structural-empty-container"):
            catalog_module.validate_ui_fact_ownership(
                facts,
                catalog,
                (wrong_reason,),
                scope="ui-defaults-transitions",
            )

    def test_ui_transition_defaults_preserve_explicit_undefined(self):
        fact_data = self.valid_facts()
        undefined = {"present": True, "value": {"kind": "undefined"}}
        absent = {"present": False}
        fact_data["architecture_transitions"] = [{
            "architecture": "fixture",
            "path": "config.process[*].train.steps",
            "selected": undefined,
            "unselected": absent,
        }]
        fact_data["model_architectures"][0]["defaults"] = [{
            "declaration_path": "config.process[*].train.steps",
            "path": "config.process[*].train.steps",
            "selected": undefined,
            "unselected": absent,
        }]
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        entry = CatalogContractTests().valid_catalog_entry()
        entry["defaults"].extend([
            {
                "kind": "on-select", "presence": "present",
                "value": {"kind": "undefined"},
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
            {
                "kind": "on-leave", "presence": "absent",
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
        ])
        catalog = validate_settings_catalog(
            self.ownership_catalog_data(projected, train_entry=entry),
            CatalogContractTests().discovered_steps(),
        )

        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )

    def test_nested_architecture_container_uses_its_root_declaration_descendant(self):
        fact_data = self.valid_facts()
        present = {"present": True, "value": {"kind": "number", "value": 1}}
        absent = {"present": False}
        fact_data["model_architectures"][0]["defaults"] = [{
            "declaration_path": "config.process[*].model.model_kwargs",
            "path": "config.process[*].model.model_kwargs.nested.alpha",
            "selected": present,
            "unselected": absent,
        }]
        fact_data["model_architectures"][0]["default_containers"] = [
            {
                "path": "config.process[*].model.model_kwargs",
                "selected_present": True,
                "unselected_present": True,
            },
            {
                "path": "config.process[*].model.model_kwargs.nested",
                "selected_present": True,
                "unselected_present": True,
            },
        ]
        facts = validate_training_book_ui_facts(fact_data)
        projected = catalog_module.project_training_book_ui_facts(facts)
        entry = CatalogContractTests().valid_catalog_entry()
        entry["locations"].append({
            "kind": "yaml",
            "path": "config.process[*].model.model_kwargs.nested.alpha",
        })
        entry["defaults"].extend([
            {
                "kind": "on-select", "presence": "present", "value": 1,
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
            {
                "kind": "on-leave", "presence": "absent",
                "applicability": [{
                    "process_type": "diffusion_trainer",
                    "ui_architecture": "fixture",
                }],
            },
        ])
        catalog = validate_settings_catalog(
            self.ownership_catalog_data(projected, train_entry=entry),
            CatalogContractTests().discovered_steps(),
        )

        catalog_module.validate_ui_fact_ownership(
            facts, catalog, (), scope="ui-defaults-transitions"
        )

    def test_production_ui_projection_boundaries_are_finite_and_runtime_rows_stay_advanced(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        selectors = [
            setting for setting in catalog.settings
            if setting.id.startswith("ui.architecture.")
            and not setting.id.endswith(".qtype-control")
        ]
        qtype_controls = [
            setting for setting in catalog.settings
            if setting.id.startswith("ui.architecture.")
            and setting.id.endswith(".qtype-control")
        ]
        resolution_ids = {
            setting.id for setting in catalog.settings
            if setting.id.startswith("ui.dataset.resolution-")
        }
        self.assertEqual(len(selectors), 51)
        self.assertEqual(len(qtype_controls), 49)
        self.assertEqual(
            resolution_ids,
            {
                "ui.dataset.resolution-256", "ui.dataset.resolution-512",
                "ui.dataset.resolution-768", "ui.dataset.resolution-1024",
                "ui.dataset.resolution-1280", "ui.dataset.resolution-1328",
                "ui.dataset.resolution-1536", "ui.dataset.resolution-2048",
            },
        )
        mediators = qtype_controls + [
            settings[setting_id] for setting_id in sorted(resolution_ids)
        ] + [
            settings["ui.model.match-target-res-control"],
            settings["ui.optimizer.weight-decay-control"],
        ]
        self.assertEqual(len(mediators), 59)
        self.assertEqual(
            sum(len(setting.interactions) for setting in mediators), 68
        )
        self.assertTrue(
            all(
                setting.source_claims == ()
                and setting.scope == "ui-state"
                and all(location.kind == "ui-state" for location in setting.locations)
                for setting in mediators
            )
        )
        for mediator in mediators:
            for interaction in mediator.interactions:
                with self.subTest(
                    mediator=mediator.id, target=interaction.setting
                ):
                    expected = catalog_module._exact_mediator_intersection(
                        mediator, settings[interaction.setting]
                    )
                    self.assertEqual(interaction.applicability, expected)
        self.assertTrue(all(
            clause.process_type == "diffusion_trainer"
            and clause.ui_architecture is not None
            for setting in qtype_controls
            for clause in setting.applicability
        ))
        weight_targets = {
            interaction.setting
            for interaction in settings[
                "ui.optimizer.weight-decay-control"
            ].interactions
        }
        self.assertEqual(
            weight_targets,
            {
                "optimizer.adafactor.param.weight_decay",
                "optimizer.adam8-adamw8.param.weight_decay",
                "optimizer.automagic.param.weight_decay",
                "optimizer.automagic2.param.weight_decay",
                "optimizer.automagic3.param.weight_decay",
                "optimizer.automagicexperiment.param.weight_decay",
                "optimizer.prodigy8bit*.param.weight_decay",
            },
        )
        runtime_ids = {
            "model.qtype", "dataset.resolution", *weight_targets,
        }
        self.assertTrue(
            all(
                settings[setting_id].ui_label is None
                and settings[setting_id].contract.ui_type is None
                and "simple-ui" not in settings[setting_id].surfaces
                and any(
                    location.kind == "yaml"
                    for location in settings[setting_id].locations
                )
                for setting_id in runtime_ids
            )
        )
        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        self.assertEqual(len(catalog.ui_claims), 2461)
        self.assertEqual(len(exclusions), 115)
        self.assertEqual(
            {exclusion.reason for exclusion in exclusions},
            {
                "architecture-projected-control",
                "runtime-derived-ui-state",
                "server-owned-value",
                "transient-ui-state",
            },
        )

    def test_production_creatable_quantization_and_layer_scale_contracts_are_exact(self):
        facts = load_production_training_book_ui_facts()
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}

        caption = settings["dataset.caption_ext"]
        self.assertIsNone(caption.contract.accepted_values)
        self.assertIsNone(caption.contract.ui_accepted_values)
        self.assertEqual(
            caption.contract.ui_suggested_values,
            ("txt", "json", "caption"),
        )
        caption_claims = [
            claim for claim in facts.config_claims
            if claim.kind == "setting"
            and claim.path == "config.process[*].datasets[*].caption_ext"
        ]
        self.assertEqual(len(caption_claims), 1)
        self.assertIsNone(caption_claims[0].value_contract.accepted_values)
        self.assertEqual(
            tuple(
                value.value
                for value in caption_claims[0].value_contract.suggested_values
            ),
            ("txt", "json", "caption"),
        )

        visible_architectures = {
            architecture.name
            for architecture in facts.model_architectures
            if "model.quantize" not in architecture.disable_sections
        }
        visible_te_architectures = {
            architecture.name
            for architecture in facts.model_architectures
            if "model.quantize" not in architecture.disable_sections
            and "model.quantize_te" not in architecture.disable_sections
        }
        self.assertEqual(len(visible_architectures), 49)
        self.assertEqual(len(visible_te_architectures), 48)
        expected_projections = {
            "config.process[*].model.qtype": (
                visible_architectures, "string", "Transformer"
            ),
            "config.process[*].model.quantize": (
                visible_architectures, "boolean", "Transformer"
            ),
            "config.process[*].model.qtype_te": (
                visible_te_architectures, "string", "Text Encoder"
            ),
            "config.process[*].model.quantize_te": (
                visible_te_architectures, "boolean", "Text Encoder"
            ),
        }
        for path, (expected_architectures, ui_type, label) in (
            expected_projections.items()
        ):
            with self.subTest(path=path):
                projected = [
                    claim for claim in facts.config_claims
                    if claim.kind == "setting"
                    and claim.path == path
                    and "::architecture=" in claim.symbol
                ]
                self.assertEqual(len(projected), len(expected_architectures))
                self.assertEqual(
                    {
                        claim.symbol.rsplit("::architecture=", 1)[1]
                        for claim in projected
                    },
                    expected_architectures,
                )
                self.assertTrue(all(
                    claim.value_contract.ui_type == ui_type
                    and claim.value_contract.widget_kind == "select"
                    and claim.ui_label.present
                    and claim.ui_label.value.value == label
                    for claim in projected
                ))
                if ui_type == "boolean":
                    self.assertTrue(all(
                        tuple(
                            value.value
                            for value in claim.value_contract.accepted_values
                        ) == (False, True)
                        for claim in projected
                    ))
                else:
                    self.assertTrue(all(
                        all(
                            value.kind == "string"
                            for value in claim.value_contract.accepted_values
                        )
                        for claim in projected
                    ))

        for setting_id, label in (
            ("model.quantize", "Transformer"),
            ("model.quantize_te", "Text Encoder"),
        ):
            setting = settings[setting_id]
            self.assertIn("simple-ui", setting.surfaces)
            self.assertEqual(setting.ui_label, label)
            self.assertEqual(setting.contract.ui_type, "boolean")
            self.assertEqual(setting.contract.ui_accepted_values, (False, True))

        scale_teaching = (
            "The Simple UI multiplies the stored 0–1 fraction by 100 for "
            "display and multiplies the 0–100 slider value by 0.01 before "
            "storing it."
        )
        for setting_id, path in (
            (
                "model.layer_offloading_transformer_percent",
                "config.process[*].model.layer_offloading_transformer_percent",
            ),
            (
                "model.layer_offloading_text_encoder_percent",
                "config.process[*].model.layer_offloading_text_encoder_percent",
            ),
        ):
            with self.subTest(setting=setting_id):
                contract = settings[setting_id].contract
                self.assertEqual(contract.config_to_ui_scale, 100)
                self.assertEqual(contract.ui_to_config_scale, 0.01)
                self.assertIn(
                    scale_teaching,
                    {
                        item.description
                        for item in settings[setting_id].normalizations
                    },
                )
                visible = [
                    claim for claim in facts.config_claims
                    if claim.kind == "setting"
                    and claim.path == path
                    and claim.behavior_contract is None
                    and claim.source_path
                    == "ui/src/app/jobs/new/SimpleJob.tsx"
                ]
                self.assertEqual(len(visible), 1)
                self.assertEqual(
                    visible[0].value_contract.config_to_ui_scale, 100
                )
                self.assertEqual(
                    visible[0].value_contract.ui_to_config_scale, 0.01
                )

    def test_production_embeds_every_server_state_v2_contract_once(self):
        catalog_data = json.loads(
            (
                REPOSITORY_ROOT
                / "docs/book/reference/settings-catalog.json"
            ).read_text(encoding="utf-8")
        )
        exclusions_data = json.loads(
            (
                REPOSITORY_ROOT
                / "docs/book/reference/settings-exclusions.json"
            ).read_text(encoding="utf-8")
        )
        server_facts = [
            claim["fact"] for claim in catalog_data["ui_claims"]
            if claim["fact"].get("kind") == "server-state"
        ] + [
            exclusion["fact"]
            for exclusion in exclusions_data["ui_exclusions"]
            if exclusion["fact"].get("kind") == "server-state"
        ]
        self.assertEqual(catalog_data["schema_version"], 2)
        self.assertEqual(exclusions_data["schema_version"], 2)
        self.assertEqual(len(catalog_data["ui_claims"]), 2461)
        self.assertEqual(len(exclusions_data["ui_exclusions"]), 115)
        self.assertEqual(len(server_facts), 214)
        self.assertTrue(all(
            set(fact["server_state_contract"]) == {
                "operation", "provenance", "authority", "persistence",
            }
            and fact["value_contract"]["widget_kind"] is None
            for fact in server_facts
        ))

    def test_production_server_state_aggregate_types_match_runtime_values(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        self.assertEqual(
            settings[
                "environment.ai_toolkit_file_server_workers"
            ].contract.example_type,
            "integer",
        )
        self.assertEqual(
            settings["settings.data-root"].contract.example_type,
            "path",
        )
        facts = load_production_training_book_ui_facts()
        environment_reads = [
            fact for fact in facts.global_settings
            if fact.kind == "server-state"
            and fact.server_state_contract.operation == "read"
            and fact.server_state_contract.provenance == "environment"
            and fact.path != "process.env.inherited"
        ]
        self.assertTrue(environment_reads)
        self.assertTrue(all(
            fact.value_contract.ui_type == "string"
            and fact.value_contract.optional
            and not fact.value_contract.nullable
            for fact in environment_reads
        ))

    def test_production_global_gpu_selector_is_user_database_state(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = next(
            item for item in catalog.settings if item.id == "ui.gpu-ids"
        )
        self.assertEqual(setting.ui_label, "GPU ID")
        self.assertEqual(setting.scope, "ui-state")
        self.assertEqual(
            [(location.kind, location.path) for location in setting.locations],
            [("ui-state", "gpuids")],
        )
        self.assertEqual(setting.surfaces, ("simple-ui",))
        self.assertEqual(setting.persistence, "database")
        self.assertEqual(setting.authority, "user")
        self.assertEqual(setting.contract.ui_type, "string")
        self.assertTrue(setting.contract.ui_optional)
        self.assertFalse(setting.contract.ui_nullable)
        claims = [
            claim for claim in catalog.ui_claims
            if claim.setting_id == setting.id
            and claim.fact.fact_type == "source-claim"
            and claim.fact.source_path == "ui/src/app/jobs/new/SimpleJob.tsx"
        ]
        self.assertEqual(len(claims), 1)
        self.assertEqual(claims[0].fact.path, "gpuids")
        state_claims = [
            claim.fact for claim in catalog.ui_claims
            if claim.setting_id == setting.id
            and claim.fact.fact_type == "source-claim"
            and claim.fact.kind == "server-state"
        ]
        self.assertEqual(
            len(state_claims),
            5,
        )
        self.assertEqual(
            {
                (
                    fact.server_state_contract.operation,
                    fact.server_state_contract.provenance,
                    fact.server_state_contract.authority,
                    fact.server_state_contract.persistence,
                    fact.value_contract.optional,
                    fact.value_contract.nullable,
                    fact.value_contract.widget_kind,
                )
                for fact in state_claims
            },
            {
                ("derive", "database", "user", "database", False, False, None),
                ("read", "database", "user", "database", False, True, None),
            },
        )

        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        defaults = [
            exclusion for exclusion in exclusions
            if exclusion.fact.fact_type == "source-claim"
            and exclusion.fact.path == "gpuids"
            and exclusion.fact.server_state_contract.authority == "ui-derived"
        ]
        self.assertEqual(len(defaults), 2)
        self.assertEqual(
            {exclusion.reason for exclusion in defaults},
            {"transient-ui-state"},
        )
        self.assertEqual(
            {
                exclusion.fact.server_state_contract.persistence
                for exclusion in defaults
            },
            {"transient"},
        )

    def test_production_browser_preferences_are_distinct_from_server_environment(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        theme = settings["ui.theme-preference"]
        client_auth = settings["ui.auth-token"]
        server_auth = settings["environment.ai_toolkit_auth"]

        self.assertEqual(theme.persistence, "browser-storage")
        self.assertEqual(theme.authority, "user")
        self.assertEqual(
            theme.contract.ui_accepted_values, ("dark", "light")
        )
        self.assertTrue(any(
            default.kind == "ui-created"
            and default.presence == "present"
            and default.value == "dark"
            for default in theme.defaults
        ))
        self.assertEqual(client_auth.persistence, "browser-storage")
        self.assertEqual(client_auth.authority, "user")
        self.assertEqual(server_auth.scope, "environment")
        self.assertEqual(server_auth.persistence, "runtime")
        self.assertEqual(server_auth.authority, "user")
        self.assertTrue({
            location.path for location in client_auth.locations
        }.isdisjoint({location.path for location in server_auth.locations}))

        owner_by_identity = {
            claim.fact.model_dump_json(): claim.setting_id
            for claim in catalog.ui_claims
        }
        client_paths = {"browser.localStorage.AI_TOOLKIT_AUTH"}
        for claim in catalog.ui_claims:
            if claim.fact.fact_type != "source-claim":
                continue
            if claim.fact.path in client_paths:
                self.assertEqual(
                    owner_by_identity[claim.fact.model_dump_json()],
                    client_auth.id,
                )
            if claim.fact.path == "AI_TOOLKIT_AUTH":
                self.assertEqual(
                    owner_by_identity[claim.fact.model_dump_json()],
                    server_auth.id,
                )

        client_state = [
            claim.fact for claim in catalog.ui_claims
            if claim.setting_id == client_auth.id
            and claim.fact.fact_type == "source-claim"
            and claim.fact.kind == "server-state"
        ]
        self.assertEqual(
            {
                (
                    fact.server_state_contract.operation,
                    fact.server_state_contract.provenance,
                    fact.value_contract.optional,
                    fact.value_contract.nullable,
                )
                for fact in client_state
            },
            {
                ("read", "browser-storage", False, True),
                ("write", "browser-storage", False, False),
                ("delete", "browser-storage", False, False),
            },
        )
        self.assertTrue(all(
            fact.value_contract.widget_kind is None
            for fact in client_state
        ))
        server_state = [
            claim.fact for claim in catalog.ui_claims
            if claim.setting_id == server_auth.id
            and claim.fact.fact_type == "source-claim"
            and claim.fact.kind == "server-state"
        ]
        self.assertTrue(server_state)
        self.assertTrue(all(
            fact.server_state_contract.operation == "read"
            and fact.server_state_contract.provenance == "environment"
            and fact.value_contract.optional
            and not fact.value_contract.nullable
            and fact.value_contract.widget_kind is None
            for fact in server_state
        ))

        exclusions = load_ui_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        auth_state = [
            exclusion for exclusion in exclusions
            if exclusion.fact.fact_type == "source-claim"
            and exclusion.fact.path == "auth.is_authorized"
        ]
        self.assertEqual(len(auth_state), 1)
        self.assertEqual(auth_state[0].reason, "runtime-derived-ui-state")
        self.assertEqual(
            (auth_state[0].fact.source_path, auth_state[0].fact.symbol),
            ("ui/src/utils/api.ts", "apiClient.response::status=401"),
        )
        outbound_headers = [
            exclusion for exclusion in exclusions
            if exclusion.fact.fact_type == "source-claim"
            and exclusion.fact.path == "http.Authorization"
        ]
        self.assertEqual(len(outbound_headers), 4)
        server_owned = [
            exclusion for exclusion in outbound_headers
            if exclusion.reason == "server-owned-value"
        ]
        self.assertEqual(len(server_owned), 1)
        self.assertEqual(
            (server_owned[0].fact.source_path, server_owned[0].fact.symbol),
            (
                "ui/src/app/api/ostris_cloud/route.ts",
                "GET::Authorization.bearer",
            ),
        )
        transient = [
            exclusion for exclusion in outbound_headers
            if exclusion.reason == "transient-ui-state"
        ]
        self.assertEqual(len(transient), 3)
        self.assertEqual(
            {
                (
                    exclusion.fact.server_state_contract.operation,
                    exclusion.fact.server_state_contract.authority,
                    exclusion.fact.server_state_contract.persistence,
                )
                for exclusion in transient
            },
            {
                ("read", "user", "transient"),
                ("write", "user", "transient"),
            },
        )

    def test_job_loss_graph_browser_settings_are_source_derived_and_distinct(self):
        facts = load_production_training_book_ui_facts()
        emitted = [
            fact for fact in facts.global_settings
            if fact.source_path == "ui/src/components/JobLossGraph.tsx"
            and fact.path.startswith("browser.localStorage.jobLossGraph.")
        ]
        expected = {
            "useLogScale": ("boolean", False, None),
            "showTrend": ("boolean", True, None),
            "smoothing": ("number", 80, (0, 100)),
            "plotStride": ("number", 1, (1, 20)),
            "clipOutliers": ("boolean", False, None),
            "enabled": ("object", {}, None),
        }
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        for key, (ui_type, default, ui_range) in expected.items():
            with self.subTest(key=key):
                setting_id = "ui.job-loss-graph." + re.sub(
                    r"(?<!^)(?=[A-Z])", "-", key
                ).lower()
                setting = settings[setting_id]
                path = f"browser.localStorage.jobLossGraph.{key}"
                source_facts = [fact for fact in emitted if fact.path == path]
                self.assertEqual(
                    {
                        (
                            fact.symbol,
                            fact.kind,
                            fact.value_contract.ui_type,
                        )
                        for fact in source_facts
                    },
                    {
                        (f"JobLossGraph::hydrate::{key}", "server-state", ui_type),
                        (f"JobLossGraph::persist::{key}", "server-state", ui_type),
                    },
                )
                self.assertEqual(
                    {
                        (
                            fact.server_state_contract.operation,
                            fact.server_state_contract.provenance,
                            fact.server_state_contract.authority,
                            fact.server_state_contract.persistence,
                            fact.value_contract.optional,
                            fact.value_contract.nullable,
                            fact.value_contract.widget_kind,
                        )
                        for fact in source_facts
                    },
                    {
                        (
                            "read", "browser-storage", "user",
                            "browser-storage", True, False, None,
                        ),
                        (
                            "write", "browser-storage", "user",
                            "browser-storage", False, False, None,
                        ),
                    },
                )
                self.assertEqual(setting.scope, "ui-state")
                self.assertEqual(setting.persistence, "browser-storage")
                self.assertEqual(setting.authority, "user")
                self.assertEqual(setting.contract.ui_type, ui_type)
                self.assertTrue(setting.contract.ui_optional)
                self.assertFalse(setting.contract.ui_nullable)
                self.assertEqual(setting.contract.null, "rejected")
                self.assertEqual(
                    [(location.kind, location.path) for location in setting.locations],
                    [("ui-state", f"browser.localStorage.jobLossGraph.{key}")],
                )
                self.assertEqual(
                    [(item.kind, item.presence, item.value) for item in setting.defaults],
                    [("ui-created", "present", default)],
                )
                actual_range = setting.contract.ui_range
                if ui_range is None:
                    self.assertIsNone(actual_range)
                else:
                    self.assertEqual(
                        (actual_range.minimum, actual_range.maximum), ui_range
                    )
                owners = [
                    claim for claim in catalog.ui_claims
                    if claim.setting_id == setting_id
                ]
                self.assertEqual(
                    {(claim.fact.symbol, claim.fact.path) for claim in owners},
                    {
                        (
                            f"JobLossGraph::hydrate::{key}",
                            f"browser.localStorage.jobLossGraph.{key}",
                        ),
                        (
                            f"JobLossGraph::persist::{key}",
                            f"browser.localStorage.jobLossGraph.{key}",
                        ),
                    },
                )
        self.assertEqual(len(emitted), 12)


class CatalogProductionSliceTests(unittest.TestCase):
    CORE_PROCESS_SOURCES = frozenset(
        {
            "jobs/BaseJob.py",
            "jobs/ExtensionJob.py",
            "jobs/process/BaseProcess.py",
            "jobs/process/BaseTrainProcess.py",
            "jobs/process/BaseSDTrainProcess.py",
            "extensions_built_in/sd_trainer/DiffusionTrainer.py",
        }
    )
    CORE_IO_CONFIG_SYMBOLS = frozenset(
        {
            "SaveConfig.__init__",
            "LoggingConfig.__init__",
            "SampleConfig.__init__",
            "SampleItem.__init__",
            "LoRMConfig.__init__",
            "LormModuleSettingsConfig.__init__",
            "NetworkConfig.__init__",
        }
    )
    CORE_MODULE_SYMBOLS = frozenset(
        {
            "AdapterConfig.__init__",
            "ValidationConfig.__init__",
            "ValidationItem.__init__",
            "EmbeddingConfig.__init__",
            "DecoratorConfig.__init__",
            "EMAConfig.__init__",
            "GuidanceConfig.__init__",
        }
    )
    TRAIN_SCHEDULE_KEYS = frozenset(
        {
            "adapter_lr",
            "batch_size",
            "content_or_style",
            "embedding_lr",
            "gradient_accumulation",
            "gradient_accumulation_steps",
            "learnable_snr_gos",
            "linear_timesteps",
            "linear_timesteps2",
            "lr",
            "lr_scheduler",
            "lr_scheduler_params",
            "max_denoising_steps",
            "min_denoising_steps",
            "min_snr_gamma",
            "next_sample_timesteps",
            "noise_scheduler",
            "num_train_timesteps",
            "refiner_lr",
            "reg_weight",
            "single_item_batching",
            "snr_gamma",
            "start_step",
            "steps",
            "switch_boundary_every",
            "text_encoder_lr",
            "timestep_type",
            "unet_lr",
            "weight_jitter",
        }
    )
    TRAIN_NUMERIC_KEYS = frozenset(
        {
            "adaptive_scaling_factor",
            "audio_loss_multiplier",
            "batch_noise_correction_scale",
            "blank_prompt_preservation",
            "blank_prompt_preservation_multiplier",
            "blended_blur_noise",
            "cfg_rescale",
            "cfg_scale",
            "correct_pred_norm",
            "correct_pred_norm_multiplier",
            "diff_output_preservation",
            "diff_output_preservation_class",
            "diff_output_preservation_multiplier",
            "differential_guidance_scale",
            "disable_sampling",
            "do_batch_noise_correction",
            "do_blank_stabilization",
            "do_cfg",
            "do_differential_guidance",
            "do_fft_loss",
            "do_fft_velocity_equiv_weight",
            "do_guidance_loss",
            "do_guidance_loss_cfg_zero",
            "do_prior_divergence",
            "do_random_cfg",
            "do_signal_amplification",
            "do_signal_correction_noise",
            "dtype",
            "dynamic_noise_offset",
            "ema_config",
            "force_consistent_noise",
            "force_first_sample",
            "gradient_checkpointing",
            "guidance_loss_schedule",
            "guidance_loss_target",
            "img_multiplier",
            "inverted_mask_prior",
            "inverted_mask_prior_multiplier",
            "latent_multiplier",
            "loss_target",
            "loss_type",
            "match_noise_norm",
            "max_cfg_scale",
            "max_grad_norm",
            "max_loss",
            "max_loss_debug",
            "max_negative_prompts",
            "noise_multiplier",
            "noise_offset",
            "noisy_latent_multiplier",
            "optimal_noise_pairing_samples",
            "pred_scaler",
            "prompt_dropout_prob",
            "prompt_saturation_chance",
            "random_noise_multiplier",
            "random_noise_shift",
            "show_turbo_outputs",
            "signal_amplification_strength",
            "signal_correction_noise_scale",
            "skip_first_sample",
            "standardize_images",
            "standardize_latents",
            "t0_loss_target",
            "t0_velocity_equiv_weight",
            "target_noise_multiplier",
            "target_norm_std",
            "target_norm_std_value",
            "unconditional_prompt",
        }
    )
    TRAIN_COMPONENT_KEYS = frozenset(
        {
            "adapter_assist_name_or_path",
            "adapter_assist_type",
            "attention_backend",
            "bypass_guidance_embedding",
            "cache_text_embeddings",
            "diffusion_feature_extractor_path",
            "diffusion_feature_extractor_weight",
            "do_paramiter_swapping",
            "free_u",
            "latent_feature_extractor_path",
            "latent_feature_loss_weight",
            "match_adapter_assist",
            "match_adapter_chance",
            "merge_network_on_save",
            "merge_network_on_save_strength",
            "negative_prompt",
            "optimizer",
            "optimizer_params",
            "paramiter_swapping_factor",
            "sdp",
            "short_and_long_captions",
            "short_and_long_captions_encoder_split",
            "train_refiner",
            "train_text_encoder",
            "train_turbo",
            "train_unet",
            "unload_text_encoder",
            "validation_config",
            "xformers",
        }
    )
    DATASET_CORE_KEYS = frozenset(
        {
            "augmentations",
            "augments",
            "bucket_tolerance",
            "buckets",
            "caption_dropout_rate",
            "caption_ext",
            "caption_type",
            "dataset_path",
            "default_caption",
            "diff_output_preservation",
            "diff_output_preservation_class",
            "extra_values",
            "flip_x",
            "flip_y",
            "folder_path",
            "guidance_type",
            "is_reg",
            "keep_tokens",
            "loss_multiplier",
            "network_weight",
            "num_repeats",
            "poi",
            "prior_reg",
            "random_crop",
            "random_scale",
            "random_triggers",
            "random_triggers_max",
            "replacements",
            "replay_transforms",
            "resolution",
            "scale",
            "shuffle_augmentations",
            "shuffle_tokens",
            "square_crop",
            "standardize_images",
            "token_dropout_rate",
            "trigger_word",
            "type",
            "use_short_captions",
        }
    )
    DATASET_MODALITY_KEYS = frozenset(
        {
            "alpha_mask",
            "audio_normalize",
            "audio_preserve_pitch",
            "auto_frame_count",
            "clip_image_augmentations",
            "clip_image_from_same_folder",
            "clip_image_path",
            "clip_image_shuffle_augmentations",
            "control_from_same_folder",
            "control_path",
            "control_path_1",
            "control_path_2",
            "control_path_3",
            "control_transparent_color",
            "controls",
            "do_audio",
            "do_i2v",
            "fps",
            "full_size_control_images",
            "inpaint_path",
            "invert_mask",
            "mask_min_value",
            "mask_path",
            "num_controls_from_same_folder",
            "num_frames",
            "shrink_video_to_frames",
            "trim_auto_frame_count_tail",
            "unconditional_path",
        }
    )
    DATASET_CACHE_KEYS = frozenset(
        {
            "cache_clip_vision_to_disk",
            "cache_latents",
            "cache_latents_num_workers",
            "cache_latents_to_disk",
            "cache_tensors_to_disk",
            "cache_text_embeddings",
            "debug",
            "fast_image_size",
            "load_image_when_caching_latents",
            "num_workers",
            "prefetch_factor",
        }
    )
    DATA_LOADER_SOURCES = frozenset(
        {
            "toolkit/data_loader.py",
            "toolkit/dataloader_mixins.py",
            "toolkit/data_transfer_object/data_loader.py",
        }
    )
    SAVE_SAMPLE_SYMBOLS = frozenset(
        {
            "SampleConfig.__init__",
            "SampleItem.__init__",
            "SaveConfig.__init__",
            "ValidationConfig.__init__",
            "ValidationItem.__init__",
        }
    )

    @classmethod
    def setUpClass(cls):
        cls.discovery_scan_count = 0

        def discover_once():
            cls.discovery_scan_count += 1
            return discover_python_settings(
                REPOSITORY_ROOT, PYTHON_DISCOVERY_GLOBS
            )

        cls.discovered = discover_once()
        source_catalog = load_source_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-sources.json"
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        cls.claims = source_catalog.claims + catalog_source_claims(catalog)
        cls.exclusions = load_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        cls.declared_sources = tuple(
            sorted(
                {
                    path.relative_to(REPOSITORY_ROOT).as_posix()
                    for pattern in PYTHON_DISCOVERY_GLOBS
                    for path in REPOSITORY_ROOT.glob(pattern)
                    if path.is_file() and path.suffix == ".py"
                }
            )
        )
        cls.discovery_guard = mock.patch(
            f"{__name__}.discover_python_settings",
            side_effect=AssertionError(
                "catalog selector tests must reuse the shared discovery inventory"
            ),
        )
        cls.discovery_guard.start()
        cls.addClassCleanup(cls.discovery_guard.stop)

    @classmethod
    def _in_core_io_network(cls, item):
        return (
            item.source == "toolkit/config_modules.py"
            and item.symbol in cls.CORE_IO_CONFIG_SYMBOLS
        ) or item.read_kind.startswith("network_kwargs.") or (
            item.source == "toolkit/kohya_lora.py"
        )

    @classmethod
    def _in_core_modules(cls, item):
        return (
            item.source == "toolkit/config_modules.py"
            and item.symbol in cls.CORE_MODULE_SYMBOLS
        )

    @classmethod
    def _in_scope(cls, item, scope):
        if scope == "core-process":
            return item.source in cls.CORE_PROCESS_SOURCES
        if scope == "core-io-network":
            return cls._in_core_io_network(item)
        if scope == "core-modules":
            return cls._in_core_modules(item)
        if scope == "core":
            return (
                item.source in cls.CORE_PROCESS_SOURCES
                or cls._in_core_io_network(item)
                or cls._in_core_modules(item)
            )
        if scope == "train-schedule":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "TrainConfig.__init__"
                and item.key in cls.TRAIN_SCHEDULE_KEYS
            )
        if scope == "train-numerics":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "TrainConfig.__init__"
                and item.key in cls.TRAIN_NUMERIC_KEYS
            )
        if scope == "train-components":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "TrainConfig.__init__"
                and item.key in cls.TRAIN_COMPONENT_KEYS
            )
        if scope == "optimizers":
            return (
                item.source == "toolkit/optimizer.py"
                or item.source.startswith("toolkit/optimizers/")
                or (
                    item.source == "toolkit/config_modules.py"
                    and item.symbol == "TrainConfig.__init__"
                    and item.key in {"optimizer", "optimizer_params"}
                )
            )
        if scope == "schedulers":
            return (
                item.source == "toolkit/scheduler.py"
                or item.source.startswith("toolkit/samplers/")
                or (
                    item.source == "toolkit/config_modules.py"
                    and item.symbol == "TrainConfig.__init__"
                    and item.key in {"lr_scheduler", "lr_scheduler_params"}
                )
            )
        if scope == "training":
            return (
                (
                    item.source == "toolkit/config_modules.py"
                    and item.symbol == "TrainConfig.__init__"
                )
                or item.source == "toolkit/optimizer.py"
                or item.source.startswith("toolkit/optimizers/")
                or item.source == "toolkit/scheduler.py"
                or item.source.startswith("toolkit/samplers/")
            )
        if scope == "model-config":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "ModelConfig.__init__"
            )
        if scope == "cli-environment":
            return item.source in {
                "run.py",
                "toolkit/config.py",
                "toolkit/paths.py",
                "toolkit/memory_management/manager_modules.py",
            }
        if scope == "model-family-core":
            return item.source in {
                "extensions_built_in/diffusion_models/anima/anima.py",
                "extensions_built_in/diffusion_models/chroma/chroma_model.py",
                "extensions_built_in/diffusion_models/chroma/chroma_radiance_model.py",
                "extensions_built_in/diffusion_models/flux_kontext/flux_kontext.py",
                "extensions_built_in/diffusion_models/zeta_chroma/zeta_chroma_model.py",
                "extensions_built_in/flex2/flex2.py",
                "toolkit/models/flux.py",
            }
        if scope == "model-family-wan":
            return item.source in {
                "extensions_built_in/diffusion_models/wan22/wan22_14b_model.py",
                "toolkit/models/wan21/wan21.py",
            }
        if scope == "model-family-qwen-sd":
            return item.source in {
                "extensions_built_in/diffusion_models/qwen_image/qwen_image.py",
                "extensions_built_in/diffusion_models/qwen_image/qwen_image_edit_plus.py",
                "toolkit/models/base_model.py",
                "toolkit/models/FakeVAE.py",
            }
        if scope == "model-family-remaining":
            is_first_party_model = item.source.startswith(
                (
                    "extensions_built_in/diffusion_models/",
                    "extensions_built_in/flex2/",
                    "extensions_built_in/audio_models/",
                    "toolkit/models/",
                )
            )
            return is_first_party_model and not any(
                cls._in_scope(item, family_scope)
                for family_scope in (
                    "model-family-core", "model-family-wan", "model-family-qwen-sd"
                )
            )
        if scope == "dataset-core":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "DatasetConfig.__init__"
                and item.key in cls.DATASET_CORE_KEYS
            )
        if scope == "dataset-modalities":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "DatasetConfig.__init__"
                and item.key in cls.DATASET_MODALITY_KEYS
            )
        if scope == "data-loader-cache":
            return item.source in cls.DATA_LOADER_SOURCES or (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "DatasetConfig.__init__"
                and item.key in cls.DATASET_CACHE_KEYS
            )
        if scope == "save-sample-validation":
            return (
                item.source == "toolkit/config_modules.py"
                and (
                    item.symbol in cls.SAVE_SAMPLE_SYMBOLS
                    or (
                        item.symbol == "NetworkConfig.__init__"
                        and item.key == "pretrained_lora_path"
                    )
                    or (
                        item.symbol == "TrainConfig.__init__"
                        and item.key in {"lr", "start_step"}
                    )
                )
            ) or (
                item.source == "jobs/process/BaseSDTrainProcess.py"
                and item.symbol == "BaseSDTrainProcess.__init__"
                and item.key in {"first_sample", "sample", "save"}
            )
        if scope == "data":
            return (
                item.source == "toolkit/config_modules.py"
                and item.symbol == "DatasetConfig.__init__"
            ) or any(
                cls._in_scope(item, slice_name)
                for slice_name in (
                    "dataset-core",
                    "dataset-modalities",
                    "data-loader-cache",
                    "save-sample-validation",
                )
            )
        raise AssertionError(f"unknown catalog test scope {scope!r}")

    def assert_catalog_selector_green(self, *arguments):
        self.assertEqual(len(arguments), 2)
        selector, value = arguments
        if selector in {"--target-source", "--target-symbol"}:
            validate_discovery_target(
                self.discovered,
                self.claims,
                self.exclusions,
                declared_sources=self.declared_sources,
                target_source=value if selector == "--target-source" else None,
                target_symbol=value if selector == "--target-symbol" else None,
            )
            return
        self.assertEqual(selector, "--scope")
        validate_setting_ownership(
            tuple(
                item for item in self.discovered if self._in_scope(item, value)
            ),
            tuple(item for item in self.claims if self._in_scope(item, value)),
            tuple(
                item for item in self.exclusions if self._in_scope(item, value)
            ),
        )

    def test_catalog_owns_both_aitk_job_id_runtime_consumers(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = next(
            item for item in catalog.settings
            if item.id == "environment.aitk_job_id"
        )

        self.assertEqual(
            {
                (claim.source, claim.symbol, claim.key, claim.read_kind)
                for claim in setting.source_claims
            },
            {
                (
                    "extensions_built_in/sd_trainer/DiffusionTrainer.py",
                    "DiffusionTrainer.__init__",
                    "AITK_JOB_ID",
                    "os.environ.get",
                ),
                (
                    "extensions_built_in/sd_trainer/UITrainer.py",
                    "UITrainer.__init__",
                    "AITK_JOB_ID",
                    "os.environ.get",
                ),
            },
        )
        sqlite_path = next(
            item for item in catalog.settings
            if item.id == "process.sqlite_db_path"
        )
        self.assertIn(
            (
                "extensions_built_in/sd_trainer/UITrainer.py",
                "UITrainer.__init__",
                "sqlite_db_path",
                "attribute.get",
            ),
            {
                (claim.source, claim.symbol, claim.key, claim.read_kind)
                for claim in sqlite_path.source_claims
            },
        )

    def test_aggregate_exactly_owns_or_excludes_legacy_non_lora_surfaces(self):
        expected_symbols = {
            ("jobs/MergeJob.py", "MergeJob.__init__"),
            ("jobs/ModJob.py", "ModJob.__init__"),
            ("jobs/TrainJob.py", "TrainJob.__init__"),
            (
                "jobs/process/BaseMergeProcess.py",
                "BaseMergeProcess.__init__",
            ),
            (
                "jobs/process/ModRescaleLoraProcess.py",
                "ModRescaleLoraProcess.__init__",
            ),
            (
                "jobs/process/TrainESRGANProcess.py",
                "TrainESRGANProcess.__init__",
            ),
            (
                "jobs/process/TrainSDRescaleProcess.py",
                "RescaleConfig.__init__",
            ),
            (
                "jobs/process/TrainSDRescaleProcess.py",
                "TrainSDRescaleProcess.__init__",
            ),
            (
                "jobs/process/TrainVAEProcess.py",
                "TrainVAEProcess.__init__",
            ),
        }
        discovered = tuple(
            item for item in self.discovered
            if (item.source, item.symbol) in expected_symbols
        )
        claims = tuple(
            item for item in self.claims
            if (item.source, item.symbol) in expected_symbols
        )
        selected = tuple(
            item for item in self.exclusions
            if (item.source, item.symbol) in expected_symbols
        )

        self.assertEqual(len(discovered), 93)
        self.assertEqual(
            {(item.source, item.symbol) for item in discovered},
            expected_symbols,
        )
        self.assertEqual(len(claims), 3)
        self.assertEqual(
            {(item.source, item.symbol, item.key, item.read_kind) for item in claims},
            {
                ("jobs/MergeJob.py", "MergeJob.__init__", "device", "get_conf"),
                ("jobs/ModJob.py", "ModJob.__init__", "device", "get_conf"),
                ("jobs/TrainJob.py", "TrainJob.__init__", "device", "get_conf"),
            },
        )
        self.assertEqual(len(selected), 90)
        self.assertEqual(
            {(item.source, item.symbol) for item in selected},
            expected_symbols - {("jobs/ModJob.py", "ModJob.__init__")},
        )
        self.assertEqual(
            {item.reason for item in selected}, {"model-developer API"}
        )
        validate_setting_ownership(discovered, claims, selected)

        added = DiscoveredSetting(
            "jobs/TrainJob.py",
            "TrainJob.__init__",
            999,
            "new_runtime_control",
            "get_conf",
            "core",
            "None",
        )
        with self.assertRaisesRegex(DiscoveryError, "unowned"):
            validate_setting_ownership(discovered + (added,), claims, selected)

    def test_catalog_base_job_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source", "jobs/BaseJob.py"
        )

    def test_catalog_extension_job_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source", "jobs/ExtensionJob.py"
        )

    def test_catalog_base_process_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source", "jobs/process/BaseProcess.py"
        )

    def test_catalog_base_train_process_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source", "jobs/process/BaseTrainProcess.py"
        )

    def test_catalog_base_sd_train_process_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source", "jobs/process/BaseSDTrainProcess.py"
        )

    def test_catalog_diffusion_trainer_source_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-source",
            "extensions_built_in/sd_trainer/DiffusionTrainer.py",
        )

    def test_catalog_core_process_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "core-process")

    def test_catalog_train_schedule_scope_is_exactly_owned_and_teaches_lr_ladder(self):
        try:
            self.assert_catalog_selector_green("--scope", "train-schedule")
        except DiscoveryError as error:
            self.fail(str(error))
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        examples = {
            "train.lr": "1e-4",
            "train.unet_lr": "5e-5",
            "train.text_encoder_lr": "2e-5",
            "train.embedding_lr": "1e-5",
            "train.adapter_lr": "5e-6",
        }
        for setting_id, literal in examples.items():
            with self.subTest(setting=setting_id):
                setting = settings[setting_id]
                self.assertIn(literal, setting.render.example)
                if setting_id not in {"train.unet_lr", "train.text_encoder_lr"}:
                    self.assertIn("use", setting.render.benefits.casefold())
                    self.assertIn("risk", setting.render.drawbacks.casefold())

    def test_catalog_model_config_scope_is_exactly_owned_and_teaches_normalization(self):
        try:
            self.assert_catalog_selector_green("--scope", "model-config")
            self.assert_catalog_selector_green(
                "--target-symbol",
                "toolkit/config_modules.py::ModelConfig.__init__",
            )
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "model-config")
        )
        self.assertEqual(len(facts), 60)
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {
            setting.id: setting for setting in catalog.settings
            if any(
                claim.source == "toolkit/config_modules.py"
                and claim.symbol == "ModelConfig.__init__"
                for claim in setting.source_claims
            )
        }
        self.assertEqual(set(settings), {f"model.{fact.key}" for fact in facts})
        self.assertEqual(
            {setting.locations[0].path for setting in settings.values()},
            {f"config.process[*].model.{fact.key}" for fact in facts},
        )
        for key in (
            "name_or_path", "vae_path", "refiner_name_or_path", "lora_path",
            "assistant_lora_path", "inference_lora_path",
            "unconditional_lora_path", "unet_path", "te_name_or_path",
            "extras_name_or_path", "accuracy_recovery_adapter",
        ):
            self.assertEqual(settings[f"model.{key}"].contract.example_type, "path")
        teaching = {
            setting_id: " ".join(
                vars(settings[setting_id].render).values()
            ).casefold() + " " + " ".join(
                item.description.casefold()
                for item in settings[setting_id].normalizations
            )
            for setting_id in settings
        }
        for phrase in ("colon", "flex1", "legacy", "sd1"):
            self.assertIn(phrase, teaching["model.arch"])
        for phrase in ("accuracy recovery", "|", "split"):
            self.assertIn(phrase, teaching["model.qtype"])
        for setting_id in ("model.qtype", "model.qtype_te"):
            self.assertIn("qfloat8", teaching[setting_id])
            self.assertIn("float8", teaching[setting_id])
            self.assertIn("convrot8", teaching[setting_id])
        self.assertIn("deprecated", teaching["model.auto_memory"])
        self.assertIn("experimental", teaching["model.compile"])
        for setting_id in ("model.attn_masking", "model.split_model_over_gpus"):
            self.assertIn("flux", teaching[setting_id])

    def test_catalog_cli_environment_scope_is_exactly_owned_and_teaches_expansion(self):
        try:
            self.assert_catalog_selector_green("--scope", "cli-environment")
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "cli-environment")
        )
        self.assertEqual(len(facts), 16)
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        for setting_id in (
            "cli.config_file_list", "cli.recover", "cli.name", "cli.log",
            "environment.debug_toolkit", "environment.hf_hub_disable_xet",
            "environment.hf_xet_high_performance", "environment.seed",
            "environment.models_path", "environment.ai_toolkit_offload_depth",
        ):
            self.assertIn(setting_id, settings)
        root_claims = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for setting_id in ("root.job", "root.config", "job.name")
            for claim in settings[setting_id].source_claims
        }
        self.assertEqual(
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in facts if fact.source == "toolkit/config.py"
            },
            {
                claim for claim in root_claims if claim[0] == "toolkit/config.py"
            },
        )
        config_teaching = " ".join(
            item.description for item in settings["root.config"].normalizations
        ).casefold()
        self.assertIn("${", config_teaching)
        self.assertIn("before", config_teaching)
        name_teaching = " ".join(
            item.description for item in settings["job.name"].normalizations
        ).casefold()
        self.assertIn("[name]", name_teaching)
        self.assertIn("cli", name_teaching)
        self.assertEqual(
            settings["environment.ai_toolkit_offload_depth"].defaults[0].value,
            "4",
        )
        self.assertEqual(
            settings["environment.models_path"].locations[0].path,
            "MODELS_PATH",
        )

    def test_catalog_anima_flux_flex_chroma_model_kwargs_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "model-family-core")
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "model-family-core")
        )
        self.assertEqual(len(facts), 25)
        model_kwargs = tuple(
            fact for fact in facts if fact.read_kind == "model_kwargs.get"
        )
        self.assertEqual(len(model_kwargs), 9)
        claimed = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for claim in self.claims
            if self._in_scope(claim, "model-family-core")
        }
        excluded = {
            (item.source, item.symbol, item.key, item.read_kind)
            for item in self.exclusions
            if self._in_scope(item, "model-family-core")
        }
        self.assertEqual(
            claimed,
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in model_kwargs
            },
        )
        self.assertEqual(len(excluded), 16)
        self.assertEqual(
            {
                item.reason for item in self.exclusions
                if self._in_scope(item, "model-family-core")
            },
            {"model-developer API"},
        )

    def test_catalog_wan_model_kwargs_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "model-family-wan")
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "model-family-wan")
        )
        self.assertEqual(len(facts), 5)
        claimed = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for claim in self.claims if self._in_scope(claim, "model-family-wan")
        }
        self.assertEqual(
            claimed,
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in facts if fact.read_kind == "model_kwargs.get"
            },
        )
        self.assertEqual(
            len(tuple(item for item in self.exclusions if self._in_scope(item, "model-family-wan"))),
            2,
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        for setting_id in (
            "model.wan.model_kwargs.vae_tiling",
            "model.wan22_14b.model_kwargs.train_high_noise",
            "model.wan22_14b.model_kwargs.train_low_noise",
        ):
            self.assertIn(setting_id, settings)
        for setting_id in (
            "model.wan22_14b.model_kwargs.train_high_noise",
            "model.wan22_14b.model_kwargs.train_low_noise",
        ):
            teaching = " ".join(vars(settings[setting_id].render).values()).casefold()
            self.assertIn("at least one", teaching)

    def test_catalog_qwen_sd_model_kwargs_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "model-family-qwen-sd")
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "model-family-qwen-sd")
        )
        self.assertEqual(len(facts), 13)
        claimed = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for claim in self.claims if self._in_scope(claim, "model-family-qwen-sd")
        }
        self.assertEqual(
            claimed,
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in facts if fact.read_kind == "model_kwargs.get"
            },
        )
        self.assertEqual(len(claimed), 1)
        self.assertEqual(
            len(tuple(item for item in self.exclusions if self._in_scope(item, "model-family-qwen-sd"))),
            12,
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = next(
            item for item in catalog.settings
            if item.id == "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        )
        self.assertEqual(
            {item.ui_architecture for item in setting.applicability},
            {"qwen_image_edit_plus", "qwen_image_edit_plus:2511"},
        )

    def test_catalog_remaining_model_families_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "model-family-remaining")
        except DiscoveryError as error:
            self.fail(str(error))
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "model-family-remaining")
        )
        self.assertEqual(len(facts), 139)
        user_facts = tuple(
            fact for fact in facts
            if fact.read_kind == "model_kwargs.get"
            or fact.key in {"HF_TOKEN", "USE_BF16_ROPE"}
        )
        self.assertEqual(len(user_facts), 65)
        claimed = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for claim in self.claims
            if self._in_scope(claim, "model-family-remaining")
        }
        self.assertEqual(
            claimed,
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in user_facts
            },
        )
        remaining_exclusions = tuple(
            item for item in self.exclusions
            if self._in_scope(item, "model-family-remaining")
        )
        self.assertEqual(len(remaining_exclusions), 74)
        self.assertEqual(
            {item.reason for item in remaining_exclusions},
            {"model-developer API", "generation-only"},
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        self.assertEqual(len(settings["environment.hf_token"].source_claims), 7)
        self.assertIn("environment.use_bf16_rope", settings)
        for family in (
            "boogu_image", "flux2", "hidream", "hidream_o1", "ideogram4",
            "krea2", "ltx2", "mageflow", "minimax_h3", "omnigen2",
        ):
            self.assertTrue(
                any(setting_id.startswith(f"model.{family}.model_kwargs.") for setting_id in settings),
                family,
            )

    def test_catalog_train_config_unconsumed_fields_are_source_derived(self):
        expected = {"unet_lr", "text_encoder_lr", "weight_jitter"}
        consumers = {key: [] for key in expected}
        for pattern in PYTHON_DISCOVERY_GLOBS:
            for path in REPOSITORY_ROOT.glob(pattern):
                if not path.is_file() or path.suffix != ".py":
                    continue
                tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
                for node in ast.walk(tree):
                    if (
                        isinstance(node, ast.Attribute)
                        and node.attr in expected
                        and isinstance(node.value, ast.Attribute)
                        and node.value.attr == "train_config"
                    ):
                        consumers[node.attr].append(path.relative_to(REPOSITORY_ROOT).as_posix())
        self.assertEqual(consumers, {key: [] for key in expected})
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        for key in expected:
            setting = settings[f"train.{key}"]
            self.assertEqual(setting.lifecycle, "unconsumed")
            teaching = " ".join(
                (setting.render.description, setting.render.benefits, setting.render.drawbacks)
            ).casefold()
            self.assertIn("unconsumed", teaching)
            self.assertIn("no effect", teaching)

    def test_catalog_train_config_boolean_explicit_null_is_preserved_and_falsey(self):
        boolean_keys = {
            fact.key
            for fact in self.discovered
            if fact.source == "toolkit/config_modules.py"
            and fact.symbol == "TrainConfig.__init__"
            and fact.default_expression in {"True", "False"}
        }
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        boolean_settings = {
            setting.source_claims[0].key: setting
            for setting in catalog.settings
            if setting.contract.parser_type == "boolean"
            and any(
                claim.source == "toolkit/config_modules.py"
                and claim.symbol == "TrainConfig.__init__"
                for claim in setting.source_claims
            )
        }
        self.assertEqual(set(boolean_settings), boolean_keys)
        for key, setting in boolean_settings.items():
            with self.subTest(key=key):
                self.assertEqual(set(setting.contract.accepted_values or ()), {True, False, None})
                self.assertEqual(setting.contract.null, "accepted")
                normalization = " ".join(
                    item.description for item in setting.normalizations
                ).casefold()
                self.assertIn("explicit null", normalization)
                self.assertIn("preserved", normalization)
                self.assertIn("falsey", normalization)

    def test_catalog_train_numerics_scope_is_exactly_owned_and_teaches_restrictions(self):
        try:
            self.assert_catalog_selector_green("--scope", "train-numerics")
        except DiscoveryError as error:
            self.fail(str(error))
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        self.assertEqual(
            set(settings["train.dtype"].contract.accepted_values or ()),
            {
                "float", "fp32", "single", "float32", "fp16", "half",
                "float16", "bf16", "bfloat16", "8bit", "e4m3fn", "float8",
            },
        )
        self.assertIn(
            "fused-backward",
            settings["train.max_grad_norm"].render.drawbacks.casefold(),
        )
        self.assertIn(
            "fused-backward",
            settings["train.gradient_accumulation"].render.drawbacks.casefold(),
        )
        inverted_interactions = {
            (item.setting, item.kind)
            for item in settings["train.inverted_mask_prior"].interactions
        }
        self.assertIn(("train.inverted_mask_prior_multiplier", "affects"), inverted_interactions)
        self.assertIn(("train.train_turbo", "conflicts"), inverted_interactions)
        preservation_interactions = {
            (item.setting, item.kind)
            for item in settings["train.diff_output_preservation"].interactions
        }
        self.assertIn(("train.blank_prompt_preservation", "conflicts"), preservation_interactions)
        self.assertIn(("train.train_text_encoder", "conflicts"), preservation_interactions)
        self.assertEqual(
            settings["train.ema_config"].defaults[0].value,
            None,
        )

    def test_catalog_guidance_loss_target_has_scalar_or_exact_pair_contract(self):
        config_source = (REPOSITORY_ROOT / "toolkit/config_modules.py").read_text(encoding="utf-8")
        trainer_source = (
            REPOSITORY_ROOT / "extensions_built_in/sd_trainer/SDTrainer.py"
        ).read_text(encoding="utf-8")
        self.assertIn("self.guidance_loss_target = list(self.guidance_loss_target)", config_source)
        self.assertIn("self.train_config.guidance_loss_target[0]", trainer_source)
        self.assertIn("self.train_config.guidance_loss_target[1]", trainer_source)
        self.assertIn("random.uniform(", trainer_source)

        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = next(
            item for item in catalog.settings
            if item.id == "train.guidance_loss_target"
        )
        self.assertEqual(setting.contract.parser_type, "number-or-number-pair")
        self.assertEqual(setting.contract.accepted_types, ("number", "number-list"))
        self.assertEqual(setting.contract.collection_length, 2)
        self.assertEqual(setting.contract.example_type, "number-list")
        self.assertEqual(
            yaml.safe_load(setting.render.example),
            {"guidance_loss_target": [2.0, 5.0]},
        )
        normalization = " ".join(
            item.description for item in setting.normalizations
        ).casefold()
        self.assertIn("tuple", normalization)
        self.assertIn("list", normalization)
        teaching = " ".join(vars(setting.render).values()).casefold()
        for phrase in (
            "guidance_loss_target: 3.0", "[2.0, 5.0]", "element 0",
            "elements 0 and 1", "indexerror", "extra elements",
        ):
            self.assertIn(phrase, teaching)

    def test_catalog_train_components_scope_and_complete_train_config_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "train-components")
            self.assert_catalog_selector_green(
                "--target-symbol",
                "toolkit/config_modules.py::TrainConfig.__init__",
            )
        except DiscoveryError as error:
            self.fail(str(error))
        self.assertEqual(
            self.TRAIN_SCHEDULE_KEYS
            | self.TRAIN_NUMERIC_KEYS
            | self.TRAIN_COMPONENT_KEYS,
            {
                fact.key
                for fact in self.discovered
                if fact.source == "toolkit/config_modules.py"
                and fact.symbol == "TrainConfig.__init__"
            },
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        text_encoder_conflicts = {
            (item.setting, item.kind)
            for item in settings["train.train_text_encoder"].interactions
        }
        self.assertIn(("train.unload_text_encoder", "conflicts"), text_encoder_conflicts)
        self.assertIn(("train.cache_text_embeddings", "conflicts"), text_encoder_conflicts)
        cache_interactions = {
            (item.setting, item.kind)
            for item in settings["train.cache_text_embeddings"].interactions
        }
        self.assertIn(("train.unload_text_encoder", "affects"), cache_interactions)
        self.assertIn(("dataset.cache_latents", "affects"), cache_interactions)
        swapping_interactions = {
            (item.setting, item.kind)
            for item in settings["train.do_paramiter_swapping"].interactions
        }
        self.assertIn(("train.optimizer", "requires"), swapping_interactions)

    def test_catalog_optimizer_registry_and_parameters_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "optimizers")
        except DiscoveryError as error:
            self.fail(str(error))
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        optimizer = settings["train.optimizer"]
        registry_facts = tuple(
            fact for fact in self.discovered
            if fact.read_kind.startswith("optimizer.registry")
        )
        registry_claims = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for claim in optimizer.source_claims
            if claim.read_kind.startswith("optimizer.registry")
        }
        self.assertEqual(
            registry_claims,
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in registry_facts
            },
        )
        target_facts = tuple(
            fact for fact in self.discovered
            if fact.read_kind == "optimizer.dispatch_target"
        )
        self.assertEqual(len(target_facts), len(registry_facts))
        self.assertEqual(
            {
                (fact.key, fact.default_expression)
                for fact in target_facts
            },
            {
                (f"{fact.key}__target={fact.default_expression}",
                 fact.default_expression)
                for fact in registry_facts
            },
        )
        self.assertEqual(
            {
                (claim.source, claim.symbol, claim.key, claim.read_kind)
                for claim in optimizer.source_claims
                if claim.read_kind == "optimizer.dispatch_target"
            },
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in target_facts
            },
        )
        def displayed_choice(fact):
            if fact.read_kind == "optimizer.registry_prefix":
                return fact.key + "*"
            if fact.read_kind == "optimizer.registry_combined":
                prefix, suffix = fact.key.split(";", maxsplit=1)
                return prefix.removeprefix("prefix=") + "*" + suffix.removeprefix("suffix=")
            return fact.key

        expected_choices = {displayed_choice(fact) for fact in registry_facts}
        self.assertEqual(set(optimizer.contract.accepted_values or ()), expected_choices)
        for library in ("dadaptation", "prodigyopt", "bitsandbytes", "lion_pytorch"):
            self.assertIn(library, optimizer.render.drawbacks)
        parameter_facts = tuple(
            fact for fact in self.discovered
            if fact.read_kind in {
                "optimizer.parameter", "optimizer.injected", "optimizer.consumed",
            }
        )
        parameter_settings = {
            setting.id: setting
            for setting in catalog.settings
            if setting.scope == "optimizer"
            and any("optimizer_params." in location.path for location in setting.locations)
        }
        self.assertTrue(parameter_settings)
        for setting in parameter_settings.values():
            with self.subTest(setting=setting.id):
                self.assertEqual(len(setting.defaults), 1)
                self.assertIsInstance(setting.defaults[0].value, dict)
                self.assertTrue(setting.defaults[0].value)
        boundary_ids = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.read_kind == "optimizer.external_boundary"
        }
        boundary_exclusions = {
            (item.source, item.symbol, item.key, item.read_kind)
            for item in self.exclusions
            if item.reason == "arbitrary third-party constructor surface"
        }
        self.assertEqual(boundary_exclusions, boundary_ids)

    def test_catalog_dadaptation_combined_dispatch_patterns_are_exact(self):
        combined_facts = {
            (fact.key, fact.read_kind, fact.default_expression)
            for fact in self.discovered
            if fact.read_kind == "optimizer.registry_combined"
        }
        self.assertEqual(
            combined_facts,
            {
                ("prefix=dadaptation;suffix=adam", "optimizer.registry_combined", "dadaptation.DAdaptLion"),
                ("prefix=dadaptation;suffix=lion", "optimizer.registry_combined", "dadaptation.DAdaptLion"),
            },
        )
        self.assertFalse(
            any(
                fact.key in {"dadaptationadam", "dadaptationlion"}
                and fact.read_kind == "optimizer.registry"
                for fact in self.discovered
            )
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        optimizer = next(setting for setting in catalog.settings if setting.id == "train.optimizer")
        combined_claims = {
            (claim.key, claim.read_kind)
            for claim in optimizer.source_claims
            if claim.read_kind == "optimizer.registry_combined"
        }
        self.assertEqual(
            combined_claims,
            {
                ("prefix=dadaptation;suffix=adam", "optimizer.registry_combined"),
                ("prefix=dadaptation;suffix=lion", "optimizer.registry_combined"),
            },
        )
        teaching = " ".join(vars(optimizer.render).values()).casefold()
        for phrase in ("starts with dadaptation", "ends with adam", "ends with lion"):
            self.assertIn(phrase, teaching)

    def test_catalog_optimizer_pattern_applicability_matches_runtime_precedence_once(self):
        source = (REPOSITORY_ROOT / "toolkit/optimizer.py").read_text(encoding="utf-8")
        self.assertLess(
            source.index('lower_type.startswith("prodigy8bit")'),
            source.index('lower_type.startswith("prodigy")'),
        )
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        prodigy_rows = (
            settings["optimizer.prodigy*.param.eps"],
            settings["optimizer.prodigy8bit*.param.eps"],
        )
        dadaptation_rows = (
            settings["optimizer.dadaptation.param.eps"],
            settings["optimizer.dadaptationadam.param.eps"],
            settings["optimizer.dadaptationlion.param.eps"],
        )
        matcher = catalog_module.applicability_matches_dispatch
        for name, expected_id in {
            "prodigy": "optimizer.prodigy*.param.eps",
            "prodigyplus": "optimizer.prodigy*.param.eps",
            "prodigy8bit": "optimizer.prodigy8bit*.param.eps",
            "prodigy8bitplus": "optimizer.prodigy8bit*.param.eps",
        }.items():
            matches = [row.id for row in prodigy_rows if matcher(row.applicability, optimizer=name)]
            self.assertEqual(matches, [expected_id])
        for name, expected_id in {
            "dadaptation": "optimizer.dadaptation.param.eps",
            "dadaptationcustomadam": "optimizer.dadaptationadam.param.eps",
            "dadaptationcustomlion": "optimizer.dadaptationlion.param.eps",
        }.items():
            matches = [row.id for row in dadaptation_rows if matcher(row.applicability, optimizer=name)]
            self.assertEqual(matches, [expected_id])

    def test_catalog_optimizer_parameter_matrix_is_discriminator_scoped_and_exhaustive(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        parameter_settings = tuple(
            setting for setting in catalog.settings
            if setting.scope == "optimizer"
            and any("optimizer_params." in location.path for location in setting.locations)
        )
        self.assertTrue(parameter_settings)
        for setting in parameter_settings:
            with self.subTest(setting=setting.id):
                self.assertRegex(setting.id, r"^optimizer\.[a-z0-9*-]+\.param\.[a-z0-9_]+$")
                self.assertTrue(setting.applicability)
                self.assertTrue(
                    all(
                        item.optimizer or item.optimizer_prefix or item.optimizer_suffix
                        for item in setting.applicability
                    )
                )
        discovered = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.read_kind in {
                "optimizer.parameter", "optimizer.injected", "optimizer.consumed",
            }
        }
        claimed = [
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for setting in parameter_settings
            for claim in setting.source_claims
        ]
        parameter_exclusions = {
            (item.source, item.symbol, item.key, item.read_kind)
            for item in self.exclusions
            if item.reason == "runtime-forced duplicate-key boundary"
        }
        self.assertEqual(set(claimed) | parameter_exclusions, discovered)
        self.assertFalse(set(claimed) & parameter_exclusions)
        self.assertEqual(len(claimed), len(set(claimed)))
        discovered_defaults = {
            (fact.source, fact.symbol, fact.key, fact.read_kind): fact.default_expression
            for fact in self.discovered
        }
        for setting in parameter_settings:
            defaults = setting.defaults[0].value
            for claim in setting.source_claims:
                if claim.read_kind == "optimizer.consumed":
                    self.assertEqual(
                        discovered_defaults[
                            (claim.source, claim.symbol, claim.key, claim.read_kind)
                        ],
                        "presence-check",
                    )
                    continue
                default_key = f"{claim.symbol}.{claim.key}"
                self.assertIn(default_key, defaults)
                self.assertEqual(
                    defaults[default_key],
                    discovered_defaults[(claim.source, claim.symbol, claim.key, claim.read_kind)],
                )
        eps_rows = {setting.id: setting for setting in parameter_settings if setting.id.endswith(".param.eps")}
        self.assertEqual(eps_rows["optimizer.adafactor.param.eps"].contract.parser_type, "number-pair")
        self.assertEqual(eps_rows["optimizer.automagic.param.eps"].contract.parser_type, "number-or-number-pair")
        for setting_id, setting in eps_rows.items():
            if setting_id not in {"optimizer.adafactor.param.eps", "optimizer.automagic.param.eps"}:
                self.assertEqual(setting.contract.parser_type, "number")

    def test_catalog_optimizer_dispatch_semantics_match_source_branches(self):
        source = (REPOSITORY_ROOT / "toolkit/optimizer.py").read_text(encoding="utf-8")
        self.assertIn("if use_lr < 0.1", source)
        self.assertEqual(source.count("use_lr = 1.0"), 3)
        self.assertIn("lower_type.endswith('adam')", source)
        self.assertIn("DAdaptLion(params", source)
        self.assertIn("lower_type == 'dadaptation'", source)
        self.assertIn("DAdaptAdam(params", source)
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        optimizer_text = " ".join(vars(settings["train.optimizer"].render).values()).casefold()
        for phrase in (
            "starts with dadaptation", "ends with adam", "ends with lion",
            "bare dadaptation", "deprecated",
        ):
            self.assertIn(phrase, optimizer_text)
        for choice in ("dadaptation", "dadaptationadam", "dadaptationlion", "prodigy*", "prodigy8bit*"):
            lr = settings[f"optimizer.{choice}.param.lr"]
            normalization = " ".join(item.description for item in lr.normalizations)
            self.assertIn("below 0.1", normalization)
            self.assertIn("1.0", normalization)
        for key in ("relative_step", "warmup_init"):
            setting = settings[f"optimizer.adafactor.param.{key}"]
            self.assertEqual(setting.contract.accepted_values, (False, None))
            self.assertIn("unusable", setting.render.drawbacks.casefold())
            self.assertIn("manual", setting.render.drawbacks.casefold())

    def test_catalog_scheduler_registry_parameters_and_normalization_are_exactly_owned(self):
        try:
            self.assert_catalog_selector_green("--scope", "schedulers")
        except DiscoveryError as error:
            self.fail(str(error))
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        scheduler = settings["train.lr_scheduler"]
        registry_facts = tuple(
            fact for fact in self.discovered
            if fact.read_kind == "scheduler.registry"
        )
        self.assertEqual(
            {
                (claim.source, claim.symbol, claim.key, claim.read_kind)
                for claim in scheduler.source_claims
                if claim.read_kind == "scheduler.registry"
            },
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in registry_facts
            },
        )
        target_facts = tuple(
            fact for fact in self.discovered
            if fact.read_kind == "scheduler.dispatch_target"
        )
        self.assertEqual(len(target_facts), len(registry_facts))
        self.assertEqual(
            {
                (fact.key, fact.default_expression)
                for fact in target_facts
            },
            {
                (f"{fact.key}__target={fact.default_expression}",
                 fact.default_expression)
                for fact in registry_facts
            },
        )
        self.assertEqual(
            {
                (claim.source, claim.symbol, claim.key, claim.read_kind)
                for claim in scheduler.source_claims
                if claim.read_kind == "scheduler.dispatch_target"
            },
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in target_facts
            },
        )
        local_choices = {fact.key for fact in registry_facts}
        self.assertEqual(set(scheduler.contract.accepted_values or ()), local_choices)
        self.assertIn("diffusers", scheduler.contract.supported_type)
        for choice in local_choices:
            self.assertIn(choice, scheduler.render.description)
        parameter_facts = tuple(
            fact for fact in self.discovered
            if fact.source == "toolkit/scheduler.py"
            and fact.read_kind != "scheduler.registry"
        )
        parameter_settings = tuple(
            setting for setting in catalog.settings
            if setting.scope == "scheduler"
            and any("lr_scheduler_params." in location.path for location in setting.locations)
        )
        self.assertTrue(parameter_settings)
        total_iters = tuple(
            setting for setting in parameter_settings if setting.id.endswith(".param.total_iters")
        )
        normalization_text = " ".join(
            item.description for setting in total_iters for item in setting.normalizations
        )
        self.assertIn("T_max", normalization_text)
        self.assertIn("T_0", normalization_text)
        self.assertIn("removes", normalization_text)
        self.assertTrue(any("KeyError" in setting.render.drawbacks for setting in total_iters))
        self.assertIn(
            ("train.steps", "overrides"),
            {
                (item.setting, item.kind)
                for setting in total_iters for item in setting.interactions
            },
        )

    def test_catalog_scheduler_parameter_matrix_and_failure_translation_are_exact(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        parameter_settings = tuple(
            setting for setting in catalog.settings
            if setting.scope == "scheduler"
            and any("lr_scheduler_params." in location.path for location in setting.locations)
        )
        for setting in parameter_settings:
            with self.subTest(setting=setting.id):
                self.assertRegex(setting.id, r"^scheduler\.[a-z0-9_*-]+\.param\.[a-z0-9_]+$")
                self.assertTrue(all(item.scheduler for item in setting.applicability))
        discovered = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.read_kind in {
                "kwargs.contains", "scheduler.injected", "scheduler.normalized",
                "scheduler.consumed",
            }
            and fact.source == "toolkit/scheduler.py"
        }
        claimed = [
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for setting in parameter_settings for claim in setting.source_claims
        ]
        self.assertEqual(set(claimed), discovered)
        self.assertEqual(len(claimed), len(set(claimed)))
        discovered_defaults = {
            (fact.source, fact.symbol, fact.key, fact.read_kind): fact.default_expression
            for fact in self.discovered
        }
        for setting in parameter_settings:
            defaults = setting.defaults[0].value
            for claim in setting.source_claims:
                if claim.read_kind == "scheduler.consumed":
                    self.assertIn(
                        discovered_defaults[
                            (claim.source, claim.symbol, claim.key, claim.read_kind)
                        ],
                        {"presence-check", "required", "removed"},
                    )
                    continue
                default_key = f"{claim.symbol}.{claim.key}"
                self.assertIn(default_key, defaults)
                self.assertEqual(
                    defaults[default_key],
                    discovered_defaults[(claim.source, claim.symbol, claim.key, claim.read_kind)],
                )
        scheduler_text = " ".join(
            vars(next(s for s in catalog.settings if s.id == "train.lr_scheduler").render).values()
        )
        self.assertIn("TypeError", scheduler_text)
        self.assertIn("ValueError", scheduler_text)
        self.assertIn("Diffusers", scheduler_text)
        self.assertIn("translated", scheduler_text)

    def test_catalog_optimizer_duplicate_keyword_boundary_is_source_derived(self):
        tree = ast.parse(
            (REPOSITORY_ROOT / "toolkit/optimizer.py").read_text(encoding="utf-8")
        )
        explicit_keywords = {
            keyword.arg
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and any(
                keyword.arg is None
                and isinstance(keyword.value, ast.Name)
                and keyword.value.id == "optimizer_params"
                for keyword in node.keywords
            )
            for keyword in node.keywords
            if keyword.arg is not None
        }
        duplicate_facts = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.source == "toolkit/optimizer.py"
            and fact.read_kind == "optimizer.injected"
            and fact.key.split("__")[-1] in explicit_keywords
        }
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = tuple(
            setting for setting in catalog.settings
            if setting.scope == "optimizer"
            and any("optimizer_params." in location.path for location in setting.locations)
        )
        boundary_exclusions = {
            (item.source, item.symbol, item.key, item.read_kind)
            for item in self.exclusions
            if item.reason == "runtime-forced duplicate-key boundary"
        }
        claimed_duplicate_facts = {
            (claim.source, claim.symbol, claim.key, claim.read_kind)
            for setting in settings for claim in setting.source_claims
            if (claim.source, claim.symbol, claim.key, claim.read_kind) in duplicate_facts
        }
        self.assertEqual(claimed_duplicate_facts | boundary_exclusions, duplicate_facts)
        self.assertFalse(claimed_duplicate_facts & boundary_exclusions)
        by_claim = {
            (claim.source, claim.symbol, claim.key, claim.read_kind): setting
            for setting in settings for claim in setting.source_claims
        }
        for fact_id in claimed_duplicate_facts:
            setting = by_claim[fact_id]
            self.assertEqual(setting.authority, "runtime-forced")
            self.assertEqual(setting.render.example, "optimizer_params: {}")
            self.assertIn("duplicate", setting.render.drawbacks.casefold())
            self.assertIn("TypeError", setting.render.drawbacks)
        self.assertIn(
            ("toolkit/optimizer.py", "get_optimizer", "adamw8__decouple", "optimizer.injected"),
            boundary_exclusions,
        )
        adam8 = next(s for s in settings if s.id == "optimizer.adam8.param.decouple")
        self.assertEqual(adam8.authority, "user")
        self.assertEqual({item.optimizer for item in adam8.applicability}, {"adam8"})

    def test_catalog_fused_optimizer_compatibility_is_choice_specific(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        optimizer_text = " ".join(vars(settings["train.optimizer"].render).values())
        for phrase in ("Automagic2", "always fused", "gradient accumulation", "gradient clipping"):
            self.assertIn(phrase, optimizer_text)
        for choice in ("automagic3", "automagicexperiment"):
            fused = settings[f"optimizer.{choice}.param.fused"]
            self.assertEqual(fused.defaults[0].value[next(iter(fused.defaults[0].value))], "True")
            text = " ".join(vars(fused.render).values()).casefold()
            for phrase in ("fused=true", "fused=false", "ordinary", "gradient accumulation", "gradient clipping"):
                self.assertIn(phrase, text)
            self.assertIn(
                ("train.gradient_accumulation", "conflicts"),
                {(item.setting, item.kind) for item in fused.interactions},
            )
            self.assertIn(
                ("train.max_grad_norm", "conflicts"),
                {(item.setting, item.kind) for item in fused.interactions},
            )

    def test_catalog_optimizer_parameter_contracts_match_source_edge_cases(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        self.assertEqual(settings["optimizer.automagic.param.eps"].contract.parser_type, "number-or-number-pair")
        experiment_betas = settings["optimizer.automagicexperiment.param.betas"]
        self.assertEqual(experiment_betas.render.example, "betas: [0.0, 0.999]")
        self.assertIn("beta1 must be exactly 0", experiment_betas.render.drawbacks)
        for setting_id in (
            "optimizer.adam8-adamw8.param.betas",
            "optimizer.prodigy8bit*.param.betas",
        ):
            setting = settings[setting_id]
            self.assertIn("[0, 1)", setting.contract.supported_type)
            self.assertEqual(setting.render.example, "betas: [0.0, 0.999]")
        for choice in ("automagic3", "automagicexperiment"):
            polarity = settings[f"optimizer.{choice}.param.polarity_history"]
            normalization = " ".join(item.description for item in polarity.normalizations)
            self.assertIn("clamps", normalization)
            self.assertIn("2", normalization)
            self.assertIn("64", normalization)
        automagic2_lr = settings["optimizer.automagic2.param.lr"]
        self.assertTrue(any("above 1e-3" in n.description and "1e-6" in n.description for n in automagic2_lr.normalizations))
        automagic3_min = settings["optimizer.automagic3.param.min_lr"]
        self.assertIn(
            ("optimizer.automagic3.param.max_lr", "constrains"),
            {(item.setting, item.kind) for item in automagic3_min.interactions},
        )
        self.assertIn("ValueError", automagic3_min.render.drawbacks)

    def test_catalog_optimizer_boolean_constructor_null_semantics_are_exhaustive(self):
        boolean_facts = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.read_kind == "optimizer.parameter"
            and fact.default_expression in {"True", "False"}
        }
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        rows = {
            (claim.source, claim.symbol, claim.key, claim.read_kind): setting
            for setting in catalog.settings
            for claim in setting.source_claims
            if (claim.source, claim.symbol, claim.key, claim.read_kind) in boolean_facts
        }
        self.assertEqual(set(rows), boolean_facts)
        for fact_id, setting in rows.items():
            with self.subTest(fact=fact_id):
                expected_values = (
                    {False, None}
                    if fact_id[1:] in {
                        ("Adafactor.__init__", "relative_step", "optimizer.parameter"),
                        ("Adafactor.__init__", "warmup_init", "optimizer.parameter"),
                    }
                    else {True, False, None}
                )
                self.assertEqual(set(setting.contract.accepted_values or ()), expected_values)
                self.assertEqual(setting.contract.null, "accepted")
                normalization = " ".join(item.description for item in setting.normalizations).casefold()
                self.assertIn("explicit null", normalization)
                self.assertIn("preserved", normalization)
                self.assertIn("falsey", normalization)

    def test_catalog_scheduler_total_iters_precedence_is_source_derived(self):
        source = (REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py").read_text(encoding="utf-8")
        self.assertIn("if 'max_iterations' not in lr_scheduler_params", source)
        self.assertIn("lr_scheduler_params['total_iters'] = self.train_config.steps", source)
        scheduler_source = (REPOSITORY_ROOT / "toolkit/scheduler.py").read_text(encoding="utf-8")
        self.assertIn("del kwargs['total_iters']", scheduler_source)
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        rows = [s for s in catalog.settings if s.id.endswith(".param.total_iters")]
        self.assertEqual(len(rows), 3)
        for setting in rows:
            self.assertEqual(setting.authority, "server-overwritten")
            self.assertEqual(setting.render.example, "lr_scheduler_params: {}")
            teaching = " ".join(vars(setting.render).values())
            self.assertIn("train.steps", teaching)
            self.assertIn("max_iterations", teaching)
            self.assertIn("TypeError", teaching)
        warmup = next(s for s in rows if ".constant_with_warmup." in s.id)
        self.assertIn("deletes", " ".join(n.description for n in warmup.normalizations))

    def test_catalog_dispatch_parameter_teaching_is_concrete_and_choice_specific(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        rows = [
            setting for setting in catalog.settings
            if setting.id.startswith(("optimizer.", "scheduler."))
            and ".param." in setting.id
        ]
        self.assertEqual(len(rows), 93)
        forbidden = (
            "configures ", "keeps ", "scoped to the constructor behavior",
            "values outside the selected", "constructor contract can fail",
        )
        for setting in rows:
            with self.subTest(setting=setting.id):
                teaching = " ".join(vars(setting.render).values()).casefold()
                self.assertFalse(any(text in teaching for text in forbidden))
                choice_tokens = {
                    token
                    for item in setting.applicability
                    for token in (
                        item.optimizer,
                        item.optimizer_prefix,
                        item.optimizer_suffix,
                        item.scheduler,
                        item.scheduler_prefix,
                        item.scheduler_suffix,
                    )
                    if token is not None
                }
                self.assertTrue(
                    all(token.casefold() in teaching for token in choice_tokens)
                )
                self.assertIn("use", setting.render.benefits.casefold())
                self.assertTrue(
                    any(word in setting.render.drawbacks.casefold() for word in ("risk", "fail", "raise", "duplicate", "ignored"))
                )
                key, separator, value = setting.render.example.partition(":")
                self.assertTrue(separator and key.strip() and value.strip())
                parsed = yaml.safe_load(setting.render.example)
                self.assertIsInstance(parsed, dict)
                self.assertEqual(len(parsed), 1)
                example_value = next(iter(parsed.values()))
                if setting.authority in {"runtime-forced", "server-overwritten"}:
                    self.assertEqual(example_value, {})
                    continue
                if example_value is None:
                    self.assertEqual(setting.contract.null, "accepted")
                    continue
                if setting.contract.example_type == "boolean":
                    self.assertIs(type(example_value), bool)
                elif setting.contract.example_type == "integer":
                    self.assertIs(type(example_value), int)
                elif setting.contract.example_type == "number":
                    self.assertIn(type(example_value), {int, float})
                elif setting.contract.example_type == "number-list":
                    self.assertIsInstance(example_value, list)
                    self.assertEqual(len(example_value), 2)
                    self.assertTrue(all(type(item) in {int, float} for item in example_value))
                if setting.contract.range is not None and type(example_value) in {int, float}:
                    bounds = setting.contract.range
                    if bounds.minimum is not None:
                        self.assertGreaterEqual(example_value, bounds.minimum)
                    if bounds.maximum is not None:
                        self.assertLessEqual(example_value, bounds.maximum)
        self.assertEqual(len({setting.render.description for setting in rows}), len(rows))
        self.assertEqual(len({setting.render.benefits for setting in rows}), len(rows))
        self.assertEqual(len({setting.render.drawbacks for setting in rows}), len(rows))

    def test_catalog_dispatch_boundary_teaching_matches_exact_choice_semantics(self):
        optimizer_source = (REPOSITORY_ROOT / "toolkit/optimizer.py").read_text(encoding="utf-8")
        process_source = (REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py").read_text(encoding="utf-8")
        optimizer_sources = {
            path.relative_to(REPOSITORY_ROOT).as_posix(): path.read_text(encoding="utf-8")
            for path in (REPOSITORY_ROOT / "toolkit/optimizers").glob("*.py")
        }
        self.assertIn("Adam8bit(params, lr=learning_rate, eps=1e-6, **optimizer_params)", optimizer_source)
        self.assertIn("Adam8bit(params, lr=learning_rate, eps=1e-6, decouple=True, **optimizer_params)", optimizer_source)
        self.assertIn("lr_scheduler_params['total_iters'] = self.train_config.steps", process_source)
        self.assertEqual(
            [source for source, text in optimizer_sources.items() if "if min_lr > max_lr" in text],
            ["toolkit/optimizers/automagic3.py"],
        )

        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}

        adam8_decouple = settings["optimizer.adam8.param.decouple"]
        adam8_text = " ".join(vars(adam8_decouple.render).values()).casefold()
        self.assertNotIn("adamw8", adam8_text)
        self.assertEqual(
            {key for default in adam8_decouple.defaults for key in default.value},
            {"Adam8bit.__init__.decouple"},
        )
        optimizer_text = " ".join(vars(settings["train.optimizer"].render).values()).casefold()
        for phrase in ("adamw8", "optimizer_params.decouple", "duplicate", "typeerror"):
            self.assertIn(phrase, optimizer_text)

        runtime_forced = [setting for setting in catalog.settings if setting.authority == "runtime-forced"]
        self.assertTrue(runtime_forced)
        runtime_forced_null_exceptions = {
            "dataset.diff_output_preservation": "accepted",
        }
        for setting in runtime_forced:
            with self.subTest(runtime_forced=setting.id):
                self.assertEqual(
                    setting.contract.null,
                    runtime_forced_null_exceptions.get(setting.id, "rejected"),
                )

        total_iters_rows = [
            setting for setting in catalog.settings
            if setting.id.startswith("scheduler.") and setting.id.endswith(".param.total_iters")
        ]
        self.assertEqual(len(total_iters_rows), 3)
        for setting in total_iters_rows:
            with self.subTest(total_iters=setting.id):
                self.assertEqual(setting.contract.null, "accepted")
                normalization = " ".join(item.description for item in setting.normalizations).casefold()
                self.assertIn("explicit null", normalization)
                self.assertIn("overwritten", normalization)
                self.assertIn("train.steps", normalization)

        choices = ("automagic", "automagic2", "automagic3", "automagicexperiment")
        for choice in choices:
            for bound, counterpart in (("min_lr", "max_lr"), ("max_lr", "min_lr")):
                setting = settings[f"optimizer.{choice}.param.{bound}"]
                teaching = " ".join(vars(setting.render).values()).casefold()
                bound_interactions = {
                    (item.setting, item.kind)
                    for item in setting.interactions
                    if item.setting.endswith((".param.min_lr", ".param.max_lr"))
                }
                expected_interactions = (
                    {(f"optimizer.automagic3.param.{counterpart}", "constrains")}
                    if choice == "automagic3"
                    else set()
                )
                with self.subTest(choice=choice, bound=bound):
                    self.assertEqual("valueerror" in teaching, choice == "automagic3")
                    self.assertEqual(bound_interactions, expected_interactions)

    def test_catalog_training_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "training")

    def test_catalog_dataset_core_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "dataset-core")

    def test_catalog_dataset_core_contracts_are_source_derived(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        facts = {
            fact.key: fact
            for fact in self.discovered
            if self._in_scope(fact, "dataset-core")
        }
        self.assertEqual(set(facts), self.DATASET_CORE_KEYS)
        self.assertEqual(
            {setting_id.removeprefix("dataset.") for setting_id in settings if setting_id.startswith("dataset.")}
            .intersection(self.DATASET_CORE_KEYS),
            self.DATASET_CORE_KEYS,
        )
        for key, fact in facts.items():
            with self.subTest(key=key):
                setting = settings[f"dataset.{key}"]
                fallback = [
                    default for default in setting.defaults
                    if default.kind == "engine-fallback"
                ]
                self.assertEqual(len(fallback), 1)
                self.assertEqual(
                    fallback[0].value,
                    ast.literal_eval(fact.default_expression),
                    f"dataset.{key} fallback drifted from DatasetConfig",
                )

        self.assertEqual(settings["dataset.folder_path"].contract.null, "accepted")
        self.assertEqual(settings["dataset.dataset_path"].contract.null, "accepted")
        self.assertEqual(settings["dataset.caption_dropout_rate"].contract.null, "rejected")
        self.assertEqual(settings["dataset.poi"].lifecycle, "deprecated")
        self.assertEqual(settings["dataset.caption_type"].aliases[0].replacement, "dataset.caption_ext")
        preset_text = " ".join(
            item.description for item in settings["dataset.folder_path"].normalizations
        ).casefold()
        for phrase in ("immutable", "version", "provenance", "manifest"):
            self.assertIn(phrase, preset_text)

        resolver = (
            REPOSITORY_ROOT / "ui/src/server/jobDatasetPresetService.ts"
        ).read_text(encoding="utf-8")
        for source_contract in (
            "dataset.folder_path = mediaRoot",
            "version_id: authoritative.version.id",
            "manifest_sha256: authoritative.version.manifest_sha256",
        ):
            self.assertIn(source_contract, resolver)

    def test_catalog_random_trigger_contract_matches_runtime_consumers(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        triggers = settings["dataset.random_triggers"]
        trigger_teaching = " ".join(
            [*vars(triggers.render).values()]
            + [item.description for item in triggers.normalizations]
        ).casefold()
        for phrase in ("nonexistent", "remains a string", "characters"):
            self.assertIn(phrase, trigger_teaching)

        maximum = settings["dataset.random_triggers_max"]
        self.assertEqual(maximum.contract.range.minimum, 0)
        self.assertIsNone(maximum.contract.range.maximum)
        maximum_teaching = " ".join(
            [*vars(maximum.render).values()]
            + [item.description for item in maximum.normalizations]
            + [item.description for item in maximum.interactions]
        ).casefold()
        for phrase in (
            "zero disables", "one deterministically inserts exactly one",
            "triggers are truthy", "greater than one uses randint",
            "resolved trigger population", "less than or equal", "valueerror",
            "intermittent",
        ):
            self.assertIn(phrase, maximum_teaching)
        trigger_constraints = [
            item for item in maximum.interactions
            if item.setting == "dataset.random_triggers" and item.kind == "constrains"
        ]
        self.assertEqual(len(trigger_constraints), 1)

        config_source = (
            REPOSITORY_ROOT / "toolkit/config_modules.py"
        ).read_text(encoding="utf-8")
        consumer_source = (
            REPOSITORY_ROOT / "toolkit/dataloader_mixins.py"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "if isinstance(random_triggers, str) and os.path.exists(random_triggers):",
            config_source,
        )
        self.assertIn("self.random_triggers: List[str] = random_triggers", config_source)
        self.assertIn(
            "random.sample(self.dataset_config.random_triggers, num_triggers)",
            consumer_source,
        )
        self.assertIn("if num_triggers > 1:", consumer_source)
        self.assertIn("if num_triggers > 0:", consumer_source)
        with mock.patch.object(random, "randint", return_value=2):
            oversized_count = random.randint(0, 2)
        self.assertEqual(oversized_count, 2)
        with self.assertRaisesRegex(ValueError, "Sample larger than population"):
            random.sample(["only-trigger"], oversized_count)

    def test_catalog_dataset_modalities_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "dataset-modalities")

    def test_catalog_mask_control_video_and_audio_contracts_match_sources(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        facts = {
            fact.key: fact
            for fact in self.discovered
            if self._in_scope(fact, "dataset-modalities")
        }
        self.assertEqual(set(facts), self.DATASET_MODALITY_KEYS)
        self.assertTrue(self.DATASET_CORE_KEYS.isdisjoint(self.DATASET_MODALITY_KEYS))
        for key, fact in facts.items():
            with self.subTest(key=key):
                fallback = [
                    default for default in settings[f"dataset.{key}"].defaults
                    if default.kind == "engine-fallback"
                ]
                self.assertEqual(len(fallback), 1)
                self.assertEqual(
                    fallback[0].value,
                    ast.literal_eval(fact.default_expression),
                )

        mask_path = settings["dataset.mask_path"]
        self.assertEqual(mask_path.authority, "server-overwritten")
        mask_teaching = " ".join(
            [*vars(mask_path.render).values()]
            + [item.description for item in mask_path.normalizations]
            + [item.description for item in mask_path.interactions]
        ).casefold()
        for phrase in (
            "white", "black", "all-white", "no mask", "mask_min_value",
            "client", "server", "complementary", "browser save", "preset",
            "trusted explicit", "non-preset", "canonical",
        ):
            self.assertIn(phrase, mask_teaching)

        prior = settings["train.inverted_mask_prior"]
        prior_teaching = " ".join(
            [*vars(prior.render).values()]
            + [item.description for item in prior.interactions]
        ).casefold()
        self.assertIn("turbo", prior_teaching)
        self.assertIn("mask", prior_teaching)

        source_contracts = {
            "ui/src/helpers/jobDatasetPresetClient.ts": (
                "return { ...persisted, mask_path: null }",
            ),
            "ui/src/app/api/jobs/route.ts": (
                "if (hasClientMaskPath(body.job_config))",
            ),
            "ui/src/server/jobDatasetPresetService.ts": (
                "if (eligibility === 'save' && hasExternalAuxiliaryValue(dataset.mask_path))",
                "if (nonblank(dataset.mask_path))",
                "const canonicalMaskPath = await realpath(dataset.mask_path)",
                "dataset.mask_path = await resolveLiveMaskDirectory",
                "dataset.mask_path = manifest.files.some",
            ),
            "ui/src/helpers/maskEditor.ts": (
                "return isAllWhite(mask) ? 'DELETE' : 'PUT'",
            ),
            "toolkit/dataloader_mixins.py": (
                "img = img.convert('L')",
                "if self.dataset_config.invert_mask:",
                "value_map(self.mask_tensor, 0, 1.0, self.mask_min_value, 1.0)",
                "file_name_no_ext + ext",
            ),
            "extensions_built_in/sd_trainer/SDTrainer.py": (
                "prior_mask_multiplier = 1.0 - prior_mask",
                "assert not self.train_config.train_turbo",
            ),
        }
        for source, snippets in source_contracts.items():
            text = (REPOSITORY_ROOT / source).read_text(encoding="utf-8")
            for snippet in snippets:
                with self.subTest(source=source, snippet=snippet):
                    self.assertIn(snippet, text)

    def test_catalog_auto_frame_count_matches_pre_bucket_computation(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = {
            item.id: item for item in catalog.settings
        }["dataset.auto_frame_count"]
        teaching = " ".join(
            [*vars(setting.render).values()]
            + [item.description for item in setting.normalizations]
        ).casefold()
        self.assertIn("before", teaching)
        self.assertIn("bucket key", teaching)
        self.assertNotIn("not compatible with current bucketing", teaching)

        dto_source = (
            REPOSITORY_ROOT / "toolkit/data_transfer_object/data_loader.py"
        ).read_text(encoding="utf-8")
        compute = "self.num_frames = self.get_auto_frame_count(video_total_frames, video_fps)"
        self.assertLess(dto_source.index(compute), dto_source.index("super().__init__(*args, **kwargs)"))
        bucket_source = (
            REPOSITORY_ROOT / "toolkit/dataloader_mixins.py"
        ).read_text(encoding="utf-8")
        self.assertIn("bucket_key += f'x{file_item.num_frames}f'", bucket_source)

    def test_catalog_data_loader_cache_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "data-loader-cache")

    def test_catalog_loader_cache_contracts_are_closed_and_provenant(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        dataset_facts = {
            fact.key: fact
            for fact in self.discovered
            if fact.source == "toolkit/config_modules.py"
            and fact.symbol == "DatasetConfig.__init__"
        }
        self.assertEqual(
            self.DATASET_CORE_KEYS
            | self.DATASET_MODALITY_KEYS
            | self.DATASET_CACHE_KEYS,
            set(dataset_facts),
        )
        self.assertEqual(len(dataset_facts), 78)
        self.assertTrue(self.DATASET_CACHE_KEYS.isdisjoint(self.DATASET_CORE_KEYS))
        self.assertTrue(self.DATASET_CACHE_KEYS.isdisjoint(self.DATASET_MODALITY_KEYS))
        for key in self.DATASET_CACHE_KEYS:
            with self.subTest(cache_key=key):
                fact = dataset_facts[key]
                fallback = [
                    default for default in settings[f"dataset.{key}"].defaults
                    if default.kind == "engine-fallback"
                ]
                self.assertEqual(len(fallback), 1)
                expected = (
                    {"expression": fact.default_expression}
                    if key == "cache_latents_num_workers"
                    else ast.literal_eval(fact.default_expression)
                )
                self.assertEqual(fallback[0].value, expected)

        loader_facts = tuple(
            fact for fact in self.discovered
            if fact.source in self.DATA_LOADER_SOURCES
        )
        self.assertEqual(len(loader_facts), 57)
        loader_exclusions = {
            (item.source, item.symbol, item.key, item.read_kind): item
            for item in self.exclusions
            if item.source in self.DATA_LOADER_SOURCES
        }
        self.assertEqual(
            set(loader_exclusions),
            {
                (fact.source, fact.symbol, fact.key, fact.read_kind)
                for fact in loader_facts
            },
        )
        for exclusion in loader_exclusions.values():
            expected_reason = (
                "slider-only"
                if exclusion.symbol == "PairedImageDataset.__init__"
                else "model-developer API"
            )
            self.assertEqual(exclusion.reason, expected_reason)

        future = DiscoveredSetting(
            "toolkit/data_loader.py",
            "ImageDataset.__init__",
            9999,
            "new_cache_knob",
            "get_config",
            "core",
            "False",
        )
        with self.assertRaisesRegex(DiscoveryError, "unowned.*new_cache_knob"):
            validate_setting_ownership(
                loader_facts + (future,),
                tuple(
                    claim for claim in self.claims
                    if claim.source in self.DATA_LOADER_SOURCES
                ),
                tuple(loader_exclusions.values()),
            )

        cache_teaching = " ".join(
            item.description
            for setting_id in (
                "dataset.cache_latents_to_disk",
                "dataset.cache_text_embeddings",
                "dataset.fast_image_size",
            )
            for item in settings[setting_id].normalizations
        ).casefold()
        for phrase in (
            "immutable", "version-local", "source-missing", "provenance",
            ".aitk_size.json", "signature", "_latent_cache", "_t_e_cache",
        ):
            self.assertIn(phrase, cache_teaching)

        source_contracts = {
            "toolkit/data_loader.py": (
                "dataset_size_file = os.path.join(dataset_folder, '.aitk_size.json')",
                'dataloader_version = "0.1.2"',
            ),
            "toolkit/data_transfer_object/data_loader.py": (
                "file_signature = get_quick_signature_string(self.path)",
                "db_entry[2] == file_signature",
            ),
            "toolkit/dataloader_mixins.py": (
                "hash_input = json.dumps(hash_dict, sort_keys=True).encode('utf-8')",
                "latent_dir = os.path.join(img_dir, '_latent_cache')",
                "te_dir = os.path.join(img_dir, '_t_e_cache')",
            ),
            "ui/src/server/datasetPresetSnapshotService.ts": (
                "portablePath === 'media/_latent_cache'",
                "portablePath === 'media/_t_e_cache'",
                "Retained media changed while copying",
                "if (!/source not found/i.test(String(error))) throw error",
            ),
        }
        for source, snippets in source_contracts.items():
            source_text = (REPOSITORY_ROOT / source).read_text(encoding="utf-8")
            for snippet in snippets:
                with self.subTest(source=source, snippet=snippet):
                    self.assertIn(snippet, source_text)

    def test_catalog_cache_keys_and_snapshot_allowance_have_exact_boundaries(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        cache_teaching = " ".join(
            item.description
            for setting_id in (
                "dataset.cache_latents_to_disk",
                "dataset.cache_text_embeddings",
            )
            for item in settings[setting_id].normalizations
        ).casefold()
        for phrase in (
            "exact roots", "media/_latent_cache", "media/_t_e_cache",
            "nested", "rejected", "content digest", "in-place", "stale",
            "clear",
        ):
            self.assertIn(phrase, cache_teaching)

        latent_teaching = " ".join(
            [*vars(settings["dataset.cache_latents_to_disk"].render).values()]
            + [
                item.description
                for item in settings["dataset.cache_latents_to_disk"].normalizations
            ]
        ).casefold()
        self.assertIn("omits source content identity", latent_teaching)

        mixins = (
            REPOSITORY_ROOT / "toolkit/dataloader_mixins.py"
        ).read_text(encoding="utf-8")
        latent_info = mixins.split("def get_latent_info_dict", 1)[1].split(
            "def get_latent_path", 1
        )[0]
        for ingredient in (
            '"filename"', '"scale_to_width"', '"scale_to_height"',
            '"crop_x"', '"crop_y"', '"crop_width"', '"crop_height"',
            '"latent_space_version"', '"latent_version"', '"flip_x"',
            '"flip_y"', '"auto_frame_count"', '"trim_auto_frame_count_tail"',
            '"num_frames"', '"fps"', '"do_i2v"', '"do_audio"',
            '"audio_normalize"', '"audio_preserve_pitch"', '"is_audio_model"',
            '"sample_rate"', '"cache_tensors_to_disk"',
        ):
            self.assertIn(ingredient, latent_info)
        for absent_content_identity in ("sha256", "signature", "digest"):
            self.assertNotIn(absent_content_identity, latent_info.casefold())

        text_info = mixins.split("def get_text_embedding_info_dict", 1)[1].split(
            "def _build_text_embedding_path", 1
        )[0]
        for ingredient in (
            '"caption"', '"text_embedding_space_version"',
            '"text_embedding_version"', '"control_path"',
            '"first_frame_in_te"',
        ):
            self.assertIn(ingredient, text_info)
        for absent_content_identity in ("sha256", "signature", "digest"):
            self.assertNotIn(absent_content_identity, text_info.casefold())

        snapshot_source = (
            REPOSITORY_ROOT / "ui/src/server/datasetPresetSnapshotService.ts"
        ).read_text(encoding="utf-8")
        cache_boundary = snapshot_source.split(
            "function isAllowedRuntimeCacheRoot", 1
        )[1].split("function cloneManifest", 1)[0]
        self.assertIn("portablePath === 'media/_latent_cache'", cache_boundary)
        self.assertIn("portablePath === 'media/_t_e_cache'", cache_boundary)
        self.assertNotIn("endsWith", cache_boundary)

    def test_catalog_save_sample_validation_scope_teaches_path_based_optimizer_resume(self):
        self.assert_catalog_selector_green("--scope", "save-sample-validation")
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting_ids = {
            "network.pretrained_lora_path",
            "process.first_sample",
            "process.sample",
            "process.save",
            "train.lr",
            "train.start_step",
            *(
                setting.id
                for setting in catalog.settings
                if setting.scope in {"sample", "save"}
                or setting.id.startswith("train.validation")
            ),
        }
        teaching = " ".join(
            text
            for setting in catalog.settings
            if setting.id in setting_ids
            for text in (
                [*vars(setting.render).values()]
                + [item.description for item in setting.normalizations]
                + [item.description for item in setting.interactions]
            )
        ).casefold()
        for phrase in (
            "optimizer.pt",
            "save root",
            "path-based",
            "structurally loadable",
            "no checkpoint",
            "no step",
            "no provenance",
            "stale",
            "user responsibility",
            "rank-shape conversion",
            "configured learning rate",
        ):
            self.assertIn(phrase, teaching)
        self.assertNotIn("compatible optimizer state", teaching)

    def test_catalog_sample_item_cfg_norm_is_honestly_unconsumed(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        item = settings["sample.item.do_cfg_norm"]
        self.assertEqual(item.lifecycle, "unconsumed")
        teaching = " ".join(
            [*vars(item.render).values()]
            + [entry.description for entry in item.normalizations]
            + [entry.description for entry in item.interactions]
        ).casefold()
        for phrase in ("parsed", "stored", "unconsumed", "no runtime effect", "sample.do_cfg_norm"):
            self.assertIn(phrase, teaching)

        config_source = (
            REPOSITORY_ROOT / "toolkit/config_modules.py"
        ).read_text(encoding="utf-8")
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "self.do_cfg_norm: bool = kwargs.get('do_cfg_norm', False)",
            config_source,
        )
        self.assertIn("do_cfg_norm=sample_config.do_cfg_norm", process_source)
        self.assertNotIn("sample_item.do_cfg_norm", process_source)

    def test_catalog_optimizer_state_contract_matches_unbound_path_loader(self):
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        optimizer_loader = process_source.split(
            "optimizer_state_filename = f'optimizer.pt'", 1
        )[1].split("# set up the ema", 1)[0]
        for snippet in (
            "optimizer_state_file_path = os.path.join(self.save_root, optimizer_state_filename)",
            "if os.path.exists(optimizer_state_file_path):",
            "torch.load(optimizer_state_file_path, weights_only=True)",
            "optimizer.load_state_dict(optimizer_state_dict)",
            "if self.network.did_change_weights:",
            "group['lr'] = previous_lrs[i]",
            "group['initial_lr'] = previous_lrs[i]",
        ):
            self.assertIn(snippet, optimizer_loader)
        for absent_binding in ("latest_path", "step_num", "metadata", "sha256"):
            self.assertNotIn(absent_binding, optimizer_loader)

        network_source = (
            REPOSITORY_ROOT / "toolkit/network_mixins.py"
        ).read_text(encoding="utf-8")
        self.assertEqual(network_source.count("self.did_change_weights = True"), 4)
        for phrase in (
            "Expanding {key}",
            "Shrinking {key}",
            "lora_down",
            "lora_up",
        ):
            self.assertIn(phrase, network_source)

    def test_catalog_save_sample_validation_scope_is_complete_and_source_derived(self):
        facts = tuple(
            fact for fact in self.discovered
            if self._in_scope(fact, "save-sample-validation")
        )
        self.assertEqual(len(facts), 56)
        by_symbol = {}
        for fact in facts:
            by_symbol.setdefault(fact.symbol, set()).add(fact.key)
        self.assertEqual(
            by_symbol["SaveConfig.__init__"],
            {
                "dtype", "hf_private", "hf_repo_id", "max_step_saves_to_keep",
                "push_to_hub", "save_every", "save_format",
            },
        )
        self.assertEqual(
            by_symbol["ValidationConfig.__init__"],
            {
                "resolution", "validate_every_n_steps", "validation_items",
                "validation_sigmas",
            },
        )
        self.assertEqual(
            by_symbol["ValidationItem.__init__"],
            {"image_path", "prompt"},
        )
        self.assertTrue(
            {
                "prompts", "samples", "sample_every", "sample_start_step",
                "seed", "walk_seed", "guidance_scale", "width", "height",
                "num_frames", "fps",
            }.issubset(by_symbol["SampleConfig.__init__"])
        )
        self.assertTrue(
            {
                "prompt", "neg", "ctrl_img", "ctrl_img_1", "ctrl_img_2",
                "ctrl_img_3", "ctrl_idx", "seed", "guidance_scale", "width",
                "height", "num_frames", "fps",
            }.issubset(by_symbol["SampleItem.__init__"])
        )

        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        for snippet in (
            "filename = f'optimizer.pt'",
            "file_path = os.path.join(self.save_root, filename)",
            "torch.save(state_dict, file_path)",
            "optimizer_state_file_path = os.path.join(self.save_root, optimizer_state_filename)",
            "optimizer_state_dict = torch.load(optimizer_state_file_path, weights_only=True)",
            "if self.network.did_change_weights:",
            "previous_lrs.append(group['lr'])",
            "group['lr'] = previous_lrs[i]",
            "group['initial_lr'] = previous_lrs[i]",
        ):
            with self.subTest(snippet=snippet):
                self.assertIn(snippet, process_source)

        base_process = (
            REPOSITORY_ROOT / "jobs/process/BaseTrainProcess.py"
        ).read_text(encoding="utf-8")
        self.assertIn("os.path.join(self.training_folder, self.name)", base_process)

    def test_catalog_task5_boolean_null_contracts_are_exhaustive_and_consumer_derived(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        relevant_symbols = {
            "DatasetConfig.__init__",
            "SaveConfig.__init__",
            "SampleConfig.__init__",
            "SampleItem.__init__",
            "ValidationConfig.__init__",
            "ValidationItem.__init__",
        }
        boolean_facts = {
            (fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in self.discovered
            if fact.source == "toolkit/config_modules.py"
            and fact.symbol in relevant_symbols
            and fact.default_expression in {"False", "True"}
        }
        owned = {}
        for setting in catalog.settings:
            for claim in setting.source_claims:
                identity = (claim.source, claim.symbol, claim.key, claim.read_kind)
                if identity in boolean_facts:
                    self.assertNotIn(identity, owned)
                    owned[identity] = setting
        self.assertEqual(set(owned), boolean_facts)
        self.assertEqual(len(owned), 41)
        for identity, setting in owned.items():
            with self.subTest(setting=setting.id, source=identity):
                self.assertEqual(setting.contract.null, "accepted")

        settings = {setting.id: setting for setting in catalog.settings}
        true_default_falsey_consumers = {
            "dataset.buckets",
            "dataset.full_size_control_images",
            "dataset.replay_transforms",
            "dataset.shrink_video_to_frames",
            "dataset.trim_auto_frame_count_tail",
        }
        for setting_id in true_default_falsey_consumers:
            teaching = " ".join(
                item.description for item in settings[setting_id].normalizations
            ).casefold()
            with self.subTest(true_default=setting_id):
                self.assertIn("explicit null", teaching)
                self.assertIn("disables", teaching)

        config_source = (
            REPOSITORY_ROOT / "toolkit/config_modules.py"
        ).read_text(encoding="utf-8")
        for snippet in (
            "self.buckets: bool = kwargs.get('buckets', True)",
            "self.replay_transforms: bool = kwargs.get('replay_transforms', True)",
            "self.push_to_hub: bool = kwargs.get(\"push_to_hub\", False)",
            "self.neg = kwargs.get('neg', False)",
        ):
            self.assertIn(snippet, config_source)
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        self.assertIn("if self.save_config.push_to_hub:", process_source)
        self.assertIn("private=self.save_config.hf_private", process_source)
        self.assertIn("negative_prompt=sample_item.neg", process_source)
        self.assertIn("if sample_config.walk_seed:", process_source)

    def test_catalog_zero_cadence_and_retention_semantics_match_consumers(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {setting.id: setting for setting in catalog.settings}
        cadence_ids = {
            "save.save_every",
            "sample.sample_every",
            "train.validation.validate_every_n_steps",
        }
        for setting_id in cadence_ids:
            setting = settings[setting_id]
            teaching = " ".join(
                [*vars(setting.render).values()]
                + [item.description for item in setting.normalizations]
            ).casefold()
            with self.subTest(cadence=setting_id):
                self.assertEqual(setting.contract.supported_type, "nonnegative-integer")
                self.assertEqual(setting.contract.range.minimum, 0)
                self.assertEqual(setting.contract.null, "accepted")
                self.assertIn("zero", teaching)
                self.assertIn("periodic", teaching)
                self.assertIn("disables", teaching)
                self.assertIn("explicit null", teaching)

        validation_teaching = " ".join(
            [*vars(settings["train.validation.validate_every_n_steps"].render).values()]
            + [
                item.description
                for item in settings["train.validation.validate_every_n_steps"].normalizations
            ]
        ).casefold()
        self.assertIn("initial validation", validation_teaching)
        self.assertIn("still runs", validation_teaching)

        retention = settings["save.max_step_saves_to_keep"]
        retention_teaching = " ".join(
            [*vars(retention.render).values()]
            + [item.description for item in retention.normalizations]
        ).casefold()
        self.assertEqual(retention.contract.range.minimum, 0)
        for phrase in ("zero", "unlimited", "no cleanup"):
            self.assertIn(phrase, retention_teaching)

        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        for snippet in (
            "is_save_step = self.save_config.save_every and self.step_num % self.save_config.save_every == 0",
            "self.sample_config.sample_every\n                    and self.step_num >= self.sample_config.sample_start_step",
            "self.step_num == self.start_step\n                    or (val_config.validate_every_n_steps and self.step_num % val_config.validate_every_n_steps == 0)",
            ":-num_saves_to_keep] if safetensors_files else []",
        ):
            self.assertIn(snippet, process_source)

    def test_catalog_combined_data_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "data")

    def test_catalog_combined_data_scope_rejects_future_dataset_config_keys(self):
        future = DiscoveredSetting(
            "toolkit/config_modules.py",
            "DatasetConfig.__init__",
            9999,
            "future_dataset_knob",
            "kwargs.get",
            "core",
            "False",
        )
        discovered = tuple(
            item
            for item in self.discovered + (future,)
            if self._in_scope(item, "data")
        )
        with self.assertRaisesRegex(DiscoveryError, "unowned.*future_dataset_knob"):
            validate_setting_ownership(
                discovered,
                tuple(
                    item for item in self.claims
                    if self._in_scope(item, "data")
                ),
                tuple(
                    item for item in self.exclusions
                    if self._in_scope(item, "data")
                ),
            )

    def test_catalog_data_slice_cli_scopes_are_public_and_exact(self):
        for scope in (
            "dataset-core",
            "dataset-modalities",
            "data-loader-cache",
            "save-sample-validation",
            "data",
        ):
            with self.subTest(scope=scope):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--check-discovery",
                        "--scope",
                        scope,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(
                    result.returncode,
                    0,
                    result.stdout + result.stderr,
                )

    def test_catalog_data_slice_cli_rejects_multiple_scopes(self):
        result = subprocess.run(
            [
                sys.executable,
                "scripts/validate_training_book.py",
                "--check-discovery",
                "--scope",
                "dataset-core",
                "--scope",
                "dataset-modalities",
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("scope", result.stderr)

    def test_catalog_process_get_conf_null_semantics_are_exhaustive(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        expected = {
            "name": (
                "process.name",
                {"expression": "job.name"},
                "BaseProcess.get_conf treats explicit null like omission and inherits job.name.",
                "job.name",
            ),
            "performance_log_every": (
                "process.performance_log_every",
                0,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback 0.",
                None,
            ),
            "training_seed": (
                "process.training_seed",
                {"expression": "job.training_seed when defined, otherwise null"},
                "BaseProcess.get_conf treats explicit null like omission and inherits job.training_seed when available, otherwise leaving the seed unset.",
                "job.training_seed",
            ),
            "training_folder": (
                "process.training_folder",
                {"expression": "job.training_folder when defined, otherwise null"},
                "BaseProcess.get_conf treats explicit null like omission and inherits job.training_folder when available, otherwise leaving the folder unresolved.",
                "job.training_folder",
            ),
            "log_dir": (
                "process.log_dir",
                {"expression": "job.log_dir when defined, otherwise null"},
                "BaseProcess.get_conf treats explicit null like omission and inherits job.log_dir when available, otherwise leaving logging disabled.",
                "job.log_dir",
            ),
            "network": (
                "process.network", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "train": (
                "process.train", {},
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback empty object.", None,
            ),
            "model": (
                "process.model", {},
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback empty object.", None,
            ),
            "save": (
                "process.save", {},
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback empty object.", None,
            ),
            "sample": (
                "process.sample", {},
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback empty object.", None,
            ),
            "first_sample": (
                "process.first_sample", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "logging": (
                "process.logging", {},
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback empty object.", None,
            ),
            "trigger_word": (
                "process.trigger_word", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "guidance": (
                "process.guidance", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "datasets": (
                "process.datasets", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "embedding": (
                "process.embedding", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "decorator": (
                "process.decorator", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "adapter": (
                "process.adapter", None,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback null.", None,
            ),
            "do_lorm": (
                "process.do_lorm", False,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback false.", None,
            ),
            "lorm_extract_mode": (
                "process.lorm_extract_mode", "ratio",
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback ratio.", None,
            ),
            "lorm_extract_mode_param": (
                "process.lorm_extract_mode_param", 0.25,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback 0.25.", None,
            ),
            "torch_profiler": (
                "process.torch_profiler", False,
                "BaseProcess.get_conf treats explicit null like omission and applies the engine fallback false.", None,
            ),
        }
        actual = {}
        for setting in catalog.settings:
            for claim in setting.source_claims:
                if (
                    claim.source.startswith("jobs/process/")
                    and claim.read_kind == "get_conf"
                ):
                    self.assertNotIn(claim.key, actual)
                    actual[claim.key] = setting

        self.assertEqual(set(actual), set(expected))
        self.assertEqual(len(actual), 22)
        for key, (setting_id, fallback, normalization, inherited) in expected.items():
            with self.subTest(key=key):
                setting = actual[key]
                self.assertEqual(setting.id, setting_id)
                self.assertEqual(setting.contract.null, "normalized-to-absent")
                self.assertEqual(len(setting.defaults), 1)
                self.assertEqual(setting.defaults[0].kind, "engine-fallback")
                self.assertEqual(setting.defaults[0].presence, "present")
                self.assertEqual(setting.defaults[0].value, fallback)
                self.assertEqual(setting.defaults[0].applicability, ())
                null_normalizations = tuple(
                    item
                    for item in setting.normalizations
                    if item.description.startswith("BaseProcess.get_conf treats")
                )
                self.assertEqual(len(null_normalizations), 1)
                self.assertEqual(null_normalizations[0].description, normalization)
                self.assertEqual(null_normalizations[0].applicability, ())
                fallback_interactions = tuple(
                    interaction
                    for interaction in setting.interactions
                    if interaction.kind == "fallback"
                )
                if inherited is None:
                    self.assertEqual(fallback_interactions, ())
                else:
                    self.assertEqual(len(fallback_interactions), 1)
                    self.assertEqual(fallback_interactions[0].setting, inherited)
                    self.assertEqual(fallback_interactions[0].applicability, ())

    def test_catalog_save_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::SaveConfig.__init__",
        )

    def test_catalog_logging_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::LoggingConfig.__init__",
        )

    def test_catalog_sample_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::SampleConfig.__init__",
        )

    def test_catalog_sample_item_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::SampleItem.__init__",
        )

    def test_catalog_lorm_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::LoRMConfig.__init__",
        )

    def test_catalog_lorm_module_settings_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::LormModuleSettingsConfig.__init__",
        )

    def test_catalog_network_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::NetworkConfig.__init__",
        )

    def test_catalog_network_type_matches_active_dispatch_spellings(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        setting = next(item for item in catalog.settings if item.id == "network.type")
        config_source = (
            REPOSITORY_ROOT / "toolkit/config_modules.py"
        ).read_text(encoding="utf-8")
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        lora_source = (
            REPOSITORY_ROOT / "toolkit/lora_special.py"
        ).read_text(encoding="utf-8")
        declared_match = re.search(r"NetworkType = Literal\[([^]]+)\]", config_source)
        self.assertIsNotNone(declared_match)
        declared = set(re.findall(r"['\"]([^'\"]+)['\"]", declared_match.group(1)))
        dispatcher = set(
            re.findall(
                r"network_config\.type\.lower\(\) == ['\"]([^'\"]+)['\"]",
                process_source,
            )
        )
        downstream_modes = set(
            re.findall(
                r"(?:self\.)?network_type\.lower\(\) == ['\"]([^'\"]+)['\"]",
                lora_source,
            )
        )
        active_spellings = declared | dispatcher | downstream_modes

        self.assertEqual(set(setting.contract.accepted_values or ()), active_spellings)
        self.assertIn("lycoris", active_spellings)
        normalization_descriptions = {
            item.description for item in setting.normalizations
        }
        self.assertIn(
            "Runtime dispatch and downstream implementation-mode checks normalize network.type with lower().",
            normalization_descriptions,
        )
        self.assertIn(
            "locon and lycoris dispatch to LycorisSpecialNetwork; lora, lorm, lokr, dora, and fullrank dispatch to LoRASpecialNetwork.",
            normalization_descriptions,
        )

    def test_catalog_network_null_semantics_match_active_target_sources(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        settings = {item.id: item for item in catalog.settings}
        lora_types = {"lora", "lorm", "lokr", "dora", "fullrank"}
        lycoris_types = {"locon", "lycoris"}

        config_source = (
            REPOSITORY_ROOT / "toolkit/config_modules.py"
        ).read_text(encoding="utf-8")
        lora_source = (
            REPOSITORY_ROOT / "toolkit/lora_special.py"
        ).read_text(encoding="utf-8")
        lycoris_source = (
            REPOSITORY_ROOT / "toolkit/lycoris_special.py"
        ).read_text(encoding="utf-8")

        source_proofs = (
            (config_source, "rank = kwargs.get('rank', None)"),
            (config_source, "linear = kwargs.get('linear', None)"),
            (config_source, "if rank is not None:"),
            (config_source, "elif linear is not None:"),
            (config_source, "self.linear: int = 4"),
            (lora_source, "alpha = self.lora_dim if alpha is None or alpha == 0 else alpha"),
            (lycoris_source, "alpha = lora_dim if alpha is None or alpha == 0 else alpha"),
            (lora_source, "self.dropout = dropout"),
            (lycoris_source, "if dropout is None:\n            dropout = 0"),
            (lora_source, "self.conv_lora_dim = conv_lora_dim"),
            (lora_source, "if dim is None or dim == 0:"),
            (
                lycoris_source,
                "if not self.ENABLE_CONV or conv_lora_dim is None:\n"
                "            conv_lora_dim = 0\n            conv_alpha = 0",
            ),
            (lycoris_source, "self.conv_alpha = float(conv_alpha)"),
        )
        for source, proof in source_proofs:
            with self.subTest(source_proof=proof):
                self.assertIn(proof, source)

        linear = settings["network.linear"]
        self.assertEqual(linear.contract.null, "normalized-to-absent")
        self.assertEqual(linear.contract.supported_type, "positive-integer-or-null")
        self.assertEqual(linear.defaults[0].value, 4)
        self.assertIn(
            "A non-null legacy rank wins; otherwise a non-null linear value is used; null values are treated as absent.",
            linear.aliases[0].migration,
        )
        self.assertIn(
            "NetworkConfig treats null rank and linear values as absent: the first non-null legacy rank wins, then non-null linear, otherwise both effective values become 4.",
            {item.description for item in linear.normalizations},
        )

        target_normalizations = {
            "network.alpha": (
                "When linear_alpha is omitted, LoRAModule normalizes inherited explicit null or zero network.alpha to the effective per-module rank.",
                "When linear_alpha is omitted, LoConSpecialModule normalizes inherited explicit null or zero network.alpha to the effective per-module rank.",
            ),
            "network.linear_alpha": (
                "LoRAModule normalizes explicit null or zero linear_alpha to the effective per-module rank.",
                "LoConSpecialModule normalizes explicit null or zero linear_alpha to the effective per-module rank.",
            ),
        }
        for setting_id, (lora_description, lycoris_description) in (
            target_normalizations.items()
        ):
            with self.subTest(setting_id=setting_id):
                setting = settings[setting_id]
                self.assertEqual(setting.contract.null, "accepted")
                self.assertEqual(setting.contract.supported_type, "number-or-null")
                by_description = {
                    item.description: {
                        predicate.network_type
                        for predicate in item.applicability
                    }
                    for item in setting.normalizations
                }
                self.assertEqual(by_description[lora_description], lora_types)
                self.assertEqual(
                    by_description[lycoris_description], lycoris_types
                )

        alpha = settings["network.alpha"]
        alpha_forwarding = tuple(
            item
            for item in alpha.interactions
            if item.setting == "network.linear_alpha" and item.kind == "affects"
        )
        self.assertEqual(len(alpha_forwarding), 1)
        self.assertEqual(
            alpha_forwarding[0].description,
            "network.alpha is forwarded as module alpha only through network.linear_alpha's omission fallback; an explicit linear_alpha overrides it.",
        )

        dropout = settings["network.dropout"]
        self.assertEqual(dropout.contract.null, "accepted")
        dropout_normalizations = {
            item.description: {
                predicate.network_type for predicate in item.applicability
            }
            for item in dropout.normalizations
        }
        self.assertEqual(
            dropout_normalizations[
                "LycorisSpecialNetwork normalizes omitted or explicit null dropout to 0 before module construction."
            ],
            lycoris_types,
        )
        self.assertFalse(
            any(
                predicate.network_type in lora_types
                for item in dropout.normalizations
                for predicate in item.applicability
            )
        )

        conv = settings["network.conv"]
        self.assertEqual(conv.contract.null, "accepted")
        self.assertEqual(
            conv.contract.supported_type,
            "nonnegative-integer-or-null",
        )
        self.assertEqual(conv.contract.range.minimum, 0)
        self.assertTrue(conv.contract.range.minimum_inclusive)
        conv_normalizations = {
            item.description: {
                predicate.network_type for predicate in item.applicability
            }
            for item in conv.normalizations
        }
        self.assertEqual(
            conv_normalizations[
                "LycorisSpecialNetwork normalizes omitted or explicit null conv to 0, disabling convolution adapters."
            ],
            lycoris_types,
        )
        self.assertFalse(
            any(
                predicate.network_type in lora_types
                for item in conv.normalizations
                for predicate in item.applicability
            )
        )

        conv_alpha = settings["network.conv_alpha"]
        self.assertEqual(conv_alpha.contract.null, "accepted")
        self.assertEqual(
            conv_alpha.contract.supported_type,
            "number-or-null-with-target-conditions",
        )
        conv_alpha_normalizations = {
            item.description: {
                predicate.network_type for predicate in item.applicability
            }
            for item in conv_alpha.normalizations
        }
        self.assertEqual(
            conv_alpha_normalizations[
                "LoRAModule normalizes explicit null or zero conv_alpha to the effective convolution-module rank when convolution adapters are constructed."
            ],
            lora_types,
        )
        self.assertEqual(
            conv_alpha_normalizations[
                "LycorisSpecialNetwork normalizes omitted or explicit null conv_alpha to 0 when convolution adaptation is disabled."
            ],
            lycoris_types,
        )
        self.assertEqual(
            conv_alpha_normalizations[
                "LoConSpecialModule normalizes zero conv_alpha to the effective convolution-module rank when convolution adaptation is enabled."
            ],
            lycoris_types,
        )
        fallback = tuple(
            item
            for item in conv_alpha.interactions
            if item.setting == "network.conv" and item.kind == "fallback"
        )
        self.assertEqual(len(fallback), 1)
        self.assertEqual(
            fallback[0].description,
            "When conv_alpha is omitted, NetworkConfig inherits network.conv; explicit null remains null.",
        )
        lycoris_requirement = tuple(
            item
            for item in conv_alpha.interactions
            if item.setting == "network.conv" and item.kind == "requires"
        )
        self.assertEqual(len(lycoris_requirement), 1)
        self.assertEqual(
            {
                predicate.network_type
                for predicate in lycoris_requirement[0].applicability
            },
            lycoris_types,
        )
        self.assertEqual(
            lycoris_requirement[0].description,
            "For locon/lycoris with convolution adaptation enabled, conv_alpha must be a number; explicit null reaches float(None) and fails during network construction.",
        )

        claimed_config_keys = {
            claim.key
            for setting_id in (
                "network.linear",
                "network.alpha",
                "network.linear_alpha",
                "network.dropout",
                "network.conv",
                "network.conv_alpha",
            )
            for claim in settings[setting_id].source_claims
            if (
                claim.source,
                claim.symbol,
                claim.read_kind,
            )
            == (
                "toolkit/config_modules.py",
                "NetworkConfig.__init__",
                "kwargs.get",
            )
        }
        self.assertEqual(
            claimed_config_keys,
            {
                "rank",
                "linear",
                "alpha",
                "linear_alpha",
                "dropout",
                "conv",
                "conv_alpha",
            },
        )

    def test_catalog_toolkit_network_mixin_symbol_is_exactly_classified(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/network_mixins.py::ToolkitNetworkMixin.__init__",
        )

    def test_catalog_lora_special_network_symbol_is_exactly_classified(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/lora_special.py::LoRASpecialNetwork.__init__",
        )

    def test_catalog_lycoris_special_network_symbol_is_exactly_classified(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/lycoris_special.py::LycorisSpecialNetwork.__init__",
        )

    def test_catalog_network_kwargs_are_exhaustively_scoped_to_active_targets(self):
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        network_type = next(
            item for item in catalog.settings if item.id == "network.type"
        )
        accepted = set(network_type.contract.accepted_values or ())
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text(encoding="utf-8")
        branch = re.search(
            r"if (?P<condition>[^\n]+):\n\s+NetworkClass = LycorisSpecialNetwork",
            process_source,
        )
        self.assertIsNotNone(branch)
        lycoris_types = set(
            re.findall(r"\.lower\(\) == ['\"]([^'\"]+)['\"]", branch.group("condition"))
        )
        lora_types = accepted - lycoris_types
        self.assertEqual(lycoris_types, {"locon", "lycoris"})
        self.assertEqual(
            lora_types, {"lora", "lorm", "lokr", "dora", "fullrank"}
        )

        targets = {
            ("toolkit/lora_special.py", "LoRASpecialNetwork.__init__"): (
                "lora",
                lora_types,
                {
                    "attn_only", "block_alphas", "block_dims",
                    "conv_block_alphas", "conv_block_dims", "full_if_contains",
                    "full_train_in_out", "ignore_if_contains", "module_dropout",
                    "only_if_contains", "parameter_threshold", "peft_format",
                    "rank_dropout", "varbose",
                },
                "Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword.",
            ),
            ("toolkit/lycoris_special.py", "LycorisSpecialNetwork.__init__"): (
                "lycoris",
                lycoris_types,
                {"module_dropout", "rank_dropout", "use_cp"},
                "Only effective when network.type dispatches to LycorisSpecialNetwork; LoRASpecialNetwork ignores this forwarded keyword.",
            ),
        }
        claimed = {}
        for setting in catalog.settings:
            for claim in setting.source_claims:
                target = (claim.source, claim.symbol)
                if target in targets:
                    self.assertNotIn((target, claim.key), claimed)
                    claimed[(target, claim.key)] = setting

        self.assertEqual(
            set(claimed),
            {
                (target, key)
                for target, (_, _, keys, _) in targets.items()
                for key in keys
            },
        )
        self.assertEqual(len(claimed), 17)
        for target, (family, network_types, keys, dispatch_description) in targets.items():
            expected_applicability = {
                ("diffusion_trainer", value) for value in network_types
            }
            for key in keys:
                with self.subTest(target=target, key=key):
                    setting = claimed[(target, key)]
                    self.assertEqual(setting.id, f"network.kwargs.{family}.{key}")
                    self.assertEqual(
                        {(item.kind, item.path) for item in setting.locations},
                        {
                            (
                                "yaml",
                                f"config.process[*].network.network_kwargs.{key}",
                            )
                        },
                    )
                    self.assertEqual(
                        {
                            (item.process_type, item.network_type)
                            for item in setting.applicability
                        },
                        expected_applicability,
                    )
                    self.assertTrue(
                        all(
                            item.job_type is None
                            and item.ui_architecture is None
                            and item.engine_architecture is None
                            for item in setting.applicability
                        )
                    )
                    for default in setting.defaults:
                        self.assertEqual(
                            {
                                (item.process_type, item.network_type)
                                for item in default.applicability
                            },
                            expected_applicability,
                        )
                    dispatch_interactions = tuple(
                        item
                        for item in setting.interactions
                        if item.setting == "network.type" and item.kind == "constrains"
                    )
                    self.assertEqual(len(dispatch_interactions), 1)
                    self.assertEqual(
                        dispatch_interactions[0].description,
                        dispatch_description,
                    )
                    self.assertEqual(
                        {
                            (item.process_type, item.network_type)
                            for item in dispatch_interactions[0].applicability
                        },
                        expected_applicability,
                    )

        lycoris_null_normalization = (
            "LycorisSpecialNetwork normalizes omitted or explicit null to 0 before module construction."
        )
        for key in ("rank_dropout", "module_dropout"):
            lora = claimed[(
                ("toolkit/lora_special.py", "LoRASpecialNetwork.__init__"), key
            )]
            lycoris = claimed[(
                ("toolkit/lycoris_special.py", "LycorisSpecialNetwork.__init__"), key
            )]
            self.assertEqual(lora.defaults[0].value, None)
            self.assertEqual(lycoris.defaults[0].value, None)
            self.assertNotIn(
                lycoris_null_normalization,
                {item.description for item in lora.normalizations},
            )
            lycoris_normalizations = tuple(
                item
                for item in lycoris.normalizations
                if item.description == lycoris_null_normalization
            )
            self.assertEqual(len(lycoris_normalizations), 1)
            self.assertEqual(
                {
                    (item.process_type, item.network_type)
                    for item in lycoris_normalizations[0].applicability
                },
                {("diffusion_trainer", value) for value in lycoris_types},
            )

    def test_catalog_inactive_kohya_factory_is_exactly_excluded(self):
        target_source = "toolkit/kohya_lora.py"
        target_symbol = "create_network"
        self.assert_catalog_selector_green(
            "--target-symbol", f"{target_source}::{target_symbol}"
        )

        selected = tuple(
            fact
            for fact in self.discovered
            if (fact.source, fact.symbol) == (target_source, target_symbol)
        )
        self.assertEqual(len(selected), 8)
        self.assertEqual({fact.read_kind for fact in selected}, {"kwargs.get"})
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        self.assertFalse(
            any(
                (claim.source, claim.symbol) == (target_source, target_symbol)
                for claim in catalog_source_claims(catalog)
            )
        )
        exclusions = load_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        selected_exclusions = tuple(
            item
            for item in exclusions
            if (item.source, item.symbol) == (target_source, target_symbol)
        )
        self.assertEqual(
            {
                (item.key, item.read_kind, item.reason)
                for item in selected_exclusions
            },
            {
                (fact.key, "kwargs.get", "model-developer API")
                for fact in selected
            },
        )

    def test_catalog_core_io_network_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "core-io-network")

    def test_catalog_adapter_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::AdapterConfig.__init__",
        )

    def test_catalog_validation_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::ValidationConfig.__init__",
        )

    def test_catalog_validation_item_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::ValidationItem.__init__",
        )

    def test_catalog_embedding_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::EmbeddingConfig.__init__",
        )

    def test_catalog_decorator_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::DecoratorConfig.__init__",
        )

    def test_catalog_ema_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::EMAConfig.__init__",
        )

    def test_catalog_guidance_config_symbol_is_exactly_owned(self):
        self.assert_catalog_selector_green(
            "--target-symbol",
            "toolkit/config_modules.py::GuidanceConfig.__init__",
        )

    def test_catalog_core_modules_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "core-modules")

    def test_catalog_combined_core_scope_is_exactly_owned(self):
        self.assert_catalog_selector_green("--scope", "core")

    def test_catalog_selector_matrix_uses_one_shared_discovery_inventory(self):
        self.assertEqual(self.discovery_scan_count, 1)

    def test_catalog_selector_cli_smoke_wires_each_selector_mode(self):
        selectors = (
            ("--target-source", "jobs/BaseJob.py"),
            (
                "--target-symbol",
                "toolkit/config_modules.py::AdapterConfig.__init__",
            ),
            ("--scope", "core"),
        )
        for selector in selectors:
            with self.subTest(selector=selector):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--check-discovery",
                        *selector,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_catalog_training_slice_cli_scopes_are_public_and_exact(self):
        for scope in (
            "train-schedule", "train-numerics", "train-components",
            "optimizers", "schedulers",
        ):
            with self.subTest(scope=scope):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--check-discovery",
                        "--scope",
                        scope,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_catalog_training_slice_cli_rejects_empty_unknown_and_multiple_scopes(self):
        for scopes in (("",), ("unknown",), ("optimizers", "schedulers")):
            arguments = [
                value for scope in scopes for value in ("--scope", scope)
            ]
            with self.subTest(scopes=scopes):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--check-discovery",
                        *arguments,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("scope", result.stderr)


class DiscoveryContractTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.repository_root = Path(self.directory.name)

    def write_source(self, path, source):
        source_path = self.repository_root / path
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_text(source, encoding="utf-8")
        return source_path

    def test_training_dispatch_contract_discovers_optimizer_and_scheduler_registries(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, learning_rate, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "adamw":
        return torch.optim.AdamW(params, lr=learning_rate, **optimizer_params)
    elif lower_type == "localmagic":
        from toolkit.optimizers.magic import Magic
        return Magic(params, lr=learning_rate, **optimizer_params)
    elif lower_type.startswith("localfamily"):
        from toolkit.optimizers.magic import Magic
        return Magic(params, lr=learning_rate, **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        self.write_source(
            "toolkit/optimizers/magic.py",
            """class Magic:
    def __init__(self, params, lr=1e-4):
        pass
""",
        )
        self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "cosine":
        return torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, **kwargs)
    elif name == "constant":
        return torch.optim.lr_scheduler.ConstantLR(optimizer, **kwargs)
    raise ValueError(name)
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py", "toolkit/scheduler.py"),
        )

        registry = {
            (fact.source, fact.symbol, fact.key, fact.read_kind, fact.scope,
             fact.default_expression)
            for fact in discovered
            if fact.read_kind in {
                "optimizer.registry", "optimizer.registry_prefix",
                "scheduler.registry",
            }
        }
        self.assertEqual(
            registry,
            {
                ("toolkit/optimizer.py", "get_optimizer", "adamw",
                 "optimizer.registry", "optimizer", "torch.optim.AdamW"),
                ("toolkit/optimizer.py", "get_optimizer", "localmagic",
                 "optimizer.registry", "optimizer", "toolkit.optimizers.magic.Magic"),
                ("toolkit/optimizer.py", "get_optimizer", "localfamily",
                 "optimizer.registry_prefix", "optimizer",
                 "toolkit.optimizers.magic.Magic"),
                ("toolkit/scheduler.py", "get_lr_scheduler", "constant",
                 "scheduler.registry", "scheduler",
                 "torch.optim.lr_scheduler.ConstantLR"),
                ("toolkit/scheduler.py", "get_lr_scheduler", "cosine",
                 "scheduler.registry", "scheduler",
                 "torch.optim.lr_scheduler.CosineAnnealingLR"),
            },
        )

    def test_training_dispatch_contract_membership_choices_become_unowned(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "adam":
        return torch.optim.Adam(params, **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                'lower_type == "adam"',
                'lower_type in {"adam", "adamw"}',
            ),
            encoding="utf-8",
        )

        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        registry_keys = {
            fact.key for fact in changed if fact.read_kind == "optimizer.registry"
        }
        self.assertEqual(registry_keys, {"adam", "adamw"})
        with self.assertRaisesRegex(DiscoveryError, "adamw"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_preserves_combined_prefix_suffix_identity(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type.startswith("family"):
        from toolkit.optimizers.magic import Magic
        if lower_type.endswith("lion"):
            return Magic(params, lr=1.0, **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        self.write_source(
            "toolkit/optimizers/magic.py",
            """class Magic:
    def __init__(self, params, lr=1.0):
        pass
""",
        )
        baseline = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py"),
        )
        self.assertEqual(
            {
                (fact.key, fact.read_kind)
                for fact in baseline
                if fact.read_kind.startswith("optimizer.registry")
            },
            {("prefix=family;suffix=lion", "optimizer.registry_combined")},
        )
        self.assertIn(
            ("prefix=family;suffix=lion__lr", "optimizer.injected"),
            {(fact.key, fact.read_kind) for fact in baseline},
        )
        self.assertFalse(any(fact.key.startswith("familylion") for fact in baseline))
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "            return Magic(params, lr=1.0, **optimizer_params)",
                "            return Magic(params, lr=1.0, **optimizer_params)\n"
                "        elif lower_type.endswith(\"adam\"):\n"
                "            return Magic(params, lr=1.0, **optimizer_params)",
            ),
            encoding="utf-8",
        )
        changed = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py"),
        )
        with self.assertRaisesRegex(DiscoveryError, r"prefix=family;suffix=adam"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_follows_optimizer_and_scheduler_spread_aliases(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, learning_rate, optimizer_params):
    forwarded = optimizer_params
    lower_type = optimizer_type.lower()
    if lower_type == "adamw":
        return torch.optim.AdamW(params, lr=learning_rate, **forwarded)
    raise ValueError(lower_type)
""",
        )
        self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    forwarded = kwargs
    if name == "constant":
        return torch.optim.lr_scheduler.ConstantLR(optimizer, factor=1.0, **forwarded)
    raise ValueError(name)
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/scheduler.py"),
        )

        self.assertEqual(
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
            {
                ("adamw__target=torch.optim.AdamW", "optimizer.external_boundary",
                 "torch.optim.AdamW"),
                ("adamw__target=torch.optim.AdamW", "optimizer.dispatch_target",
                 "torch.optim.AdamW"),
                ("adamw", "optimizer.registry", "torch.optim.AdamW"),
                ("adamw__lr", "optimizer.injected", "learning_rate"),
                ("constant", "scheduler.registry", "torch.optim.lr_scheduler.ConstantLR"),
                ("constant__target=torch.optim.lr_scheduler.ConstantLR",
                 "scheduler.dispatch_target", "torch.optim.lr_scheduler.ConstantLR"),
                ("constant__factor", "scheduler.injected", "1.0"),
            },
        )

    def test_training_dispatch_contract_discovers_static_calls_without_spreads(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
    raise ValueError(optimizer_type)
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertIn(
            ("sgd", "optimizer.registry", "torch.optim.SGD"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
        )

    def test_training_dispatch_contract_new_static_call_is_unowned(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
    raise ValueError(optimizer_type)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "    raise ValueError(optimizer_type)",
                "    elif optimizer_type == 'rmsprop':\n"
                "        return torch.optim.RMSprop(params)\n"
                "    raise ValueError(optimizer_type)",
            ),
            encoding="utf-8",
        )

        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        with self.assertRaisesRegex(DiscoveryError, "rmsprop"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_rejects_dynamic_constructor_targets(self):
        cases = {
            "subscript target": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        return factories[optimizer_type](params, **optimizer_params)
""",
            "reassigned imported target": """from torch.optim import Adam as Backend
def get_optimizer(params, optimizer_type, optimizer_params):
    Backend = choose_backend()
    if optimizer_type == "adam":
        return Backend(params, **optimizer_params)
""",
            "unguarded no-spread target": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    return torch.optim.Adam(params)
""",
        }
        for label, source in cases.items():
            with self.subTest(label=label):
                self.write_source("toolkit/optimizer.py", source)
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_static_external_target_drift_is_unowned(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **optimizer_params)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "torch.optim.Adam", "torch.optim.AdamW"
            ),
            encoding="utf-8",
        )

        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        with self.assertRaisesRegex(DiscoveryError, "target"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_aliases_are_bound_before_use(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **forwarded)
    forwarded = optimizer_params
""",
        )

        with self.assertRaisesRegex(DiscoveryError, "dispatch"):
            discover_python_settings(
                self.repository_root, ("toolkit/optimizer.py",)
            )

    def test_training_dispatch_contract_rejects_unsupported_mapping_effects(self):
        for method in ("update", "setdefault", "clear"):
            with self.subTest(method=method):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    forwarded.{method}({{}})
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **forwarded)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_inventories_mapping_pop_and_get(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    if optimizer_type == "adam":
        decay = forwarded.pop("weight_decay", 0.0)
        capturable = forwarded.get("capturable", False)
        return torch.optim.Adam(
            params, weight_decay=decay, capturable=capturable, **forwarded
        )
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertEqual(
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
                if fact.read_kind == "optimizer.consumed"
            },
            {
                ("adam__capturable", "optimizer.consumed", "False"),
                ("adam__weight_decay", "optimizer.consumed", "0.0"),
            },
        )

    def test_training_dispatch_contract_discovers_returned_arbitrary_local_calls(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        chosen = SGD(params)
        return chosen
    raise ValueError(optimizer_type)
""",
        )

        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertIn(
            ("sgd", "optimizer.registry", "torch.optim.SGD"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in baseline
            },
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "    raise ValueError(optimizer_type)",
                "    elif optimizer_type == 'asgd':\n"
                "        alternate = torch.optim.ASGD(params)\n"
                "        return alternate\n"
                "    raise ValueError(optimizer_type)",
            ),
            encoding="utf-8",
        )
        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        with self.assertRaisesRegex(DiscoveryError, "asgd"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_proves_constructor_bindings_lexically(self):
        safe_cases = {
            "prior module import": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "prior function import": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    from torch.optim import SGD
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "dominant branch import": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        from torch.optim import SGD
        return SGD(params)
""",
            "same binding on all paths": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if enabled:
        from torch.optim import SGD
    else:
        from torch.optim import SGD
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "nested scopes do not rebind outer imports": """from torch.optim import SGD
def helper():
    SGD = None
def get_optimizer(params, optimizer_type, optimizer_params):
    def nested():
        SGD = None
    if optimizer_type == "sgd":
        return SGD(params)
""",
        }
        for label, source in safe_cases.items():
            with self.subTest(label=label):
                self.write_source("toolkit/optimizer.py", source)
                discovered = discover_python_settings(
                    self.repository_root, ("toolkit/optimizer.py",)
                )
                self.assertIn(
                    ("sgd", "optimizer.registry", "torch.optim.SGD"),
                    {
                        (fact.key, fact.read_kind, fact.default_expression)
                        for fact in discovered
                    },
                )

    def test_training_dispatch_contract_rejects_unproven_constructor_bindings(self):
        cases = {
            "module import after function": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return SGD(params)
from torch.optim import SGD
""",
            "use before function import": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return SGD(params)
    from torch.optim import SGD
""",
            "conditional import": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if enabled:
        from torch.optim import SGD
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "parameter shadow": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params, SGD=None):
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "for binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    for SGD in constructors:
        pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "with binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    with manager() as SGD:
        pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "except binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    try:
        pass
    except Exception as SGD:
        pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "match binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    match payload:
        case {"constructor": SGD}:
            pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "walrus binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    if (SGD := choose_backend()):
        pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "function binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    def SGD(params):
        return params
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "class binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    class SGD:
        pass
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "import rebinding": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    import other as torch
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
""",
            "deleted binding": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    del SGD
    if optimizer_type == "sgd":
        return SGD(params)
""",
            "nested scope import": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    def helper():
        from torch.optim import SGD
    if optimizer_type == "sgd":
        return SGD(params)
""",
        }
        for label, source in cases.items():
            with self.subTest(label=label):
                self.write_source("toolkit/optimizer.py", source)
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_emits_exact_target_fact_for_every_choice(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "magic":
        from toolkit.optimizers.magic import Magic
        return Magic(params, **optimizer_params)
""",
        )
        self.write_source(
            "toolkit/optimizers/magic.py",
            """class Magic:
    pass
""",
        )
        self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "step":
        return torch.optim.lr_scheduler.StepLR(optimizer, **kwargs)
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py", "toolkit/scheduler.py"),
        )

        self.assertEqual(
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
                if fact.read_kind.endswith("dispatch_target")
            },
            {
                ("magic__target=toolkit.optimizers.magic.Magic",
                 "optimizer.dispatch_target", "toolkit.optimizers.magic.Magic"),
                ("step__target=torch.optim.lr_scheduler.StepLR",
                 "scheduler.dispatch_target", "torch.optim.lr_scheduler.StepLR"),
            },
        )

    def test_training_dispatch_contract_any_static_target_drift_is_unowned(self):
        fixtures = {
            "optimizer": (
                "toolkit/optimizer.py",
                """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "magic":
        from toolkit.optimizers.choices import Magic
        return Magic(params, **optimizer_params)
""",
                "Magic", "Other", ("toolkit/optimizers/*.py",),
            ),
            "scheduler": (
                "toolkit/scheduler.py",
                """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "step":
        return torch.optim.lr_scheduler.StepLR(optimizer, **kwargs)
""",
                "StepLR", "LinearLR", (),
            ),
        }
        self.write_source(
            "toolkit/optimizers/choices.py",
            """class Magic:
    pass
class Other:
    pass
""",
        )
        for label, (source_path, source, old, new, extra_globs) in fixtures.items():
            with self.subTest(label=label):
                path = self.write_source(source_path, source)
                globs = (source_path, *extra_globs)
                baseline = discover_python_settings(self.repository_root, globs)
                claims = tuple(
                    SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
                    for fact in baseline
                )
                path.write_text(
                    path.read_text(encoding="utf-8").replace(old, new),
                    encoding="utf-8",
                )
                changed = discover_python_settings(self.repository_root, globs)
                with self.assertRaisesRegex(DiscoveryError, "target"):
                    validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_tracks_alias_subscripts_and_rejects_method_escape(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    if optimizer_type == "adam":
        forwarded["capturable"] = True
        del forwarded["stale"]
        return torch.optim.Adam(params, **forwarded)
""",
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertEqual(
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
                if fact.read_kind in {"optimizer.injected", "optimizer.consumed"}
            },
            {
                ("adam__capturable", "optimizer.injected", "True"),
                ("adam__stale", "optimizer.consumed", "removed"),
            },
        )

        for method in ("get", "pop"):
            with self.subTest(method=method):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    reader = forwarded.{method}
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **forwarded)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_rejects_unselected_alias_subscript_effects(self):
        for operation in (
            'forwarded["capturable"] = True',
            'del forwarded["capturable"]',
        ):
            with self.subTest(operation=operation):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    {operation}
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **forwarded)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_diffusers_fallback_is_exact_and_dominant(self):
        positive = """from diffusers.optimization import SchedulerType, TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        name = SchedulerType(name)
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        return schedule_func(optimizer, **kwargs)
    except Exception:
        pass
    raise ValueError(name)
"""
        self.write_source("toolkit/scheduler.py", positive)
        discover_python_settings(self.repository_root, ("toolkit/scheduler.py",))

        cases = {
            "wrong source": ("plugins/scheduler.py", positive),
            "use before bind": ("toolkit/scheduler.py", """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    return schedule_func(optimizer, **kwargs)
    schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
"""),
            "conditional bind": ("toolkit/scheduler.py", """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    if enabled:
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
    return schedule_func(optimizer, **kwargs)
"""),
            "conditional bind and call": ("toolkit/scheduler.py", """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    if enabled:
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        return schedule_func(optimizer, **kwargs)
    raise ValueError(name)
"""),
            "reassigned bind": ("toolkit/scheduler.py", """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
    schedule_func = choose_backend()
    return schedule_func(optimizer, **kwargs)
"""),
            "wrong lookup": ("toolkit/scheduler.py", """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    schedule_func = OTHER_SCHEDULERS[name]
    return schedule_func(optimizer, **kwargs)
"""),
        }
        for label, (source_path, source) in cases.items():
            with self.subTest(label=label):
                self.write_source(source_path, source)
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(self.repository_root, (source_path,))

    def test_training_dispatch_contract_rejects_ambiguous_alias_and_branch_syntax(self):
        cases = {
            "reassigned": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    forwarded = {}
    if optimizer_type == "adam":
        return Backend(params, **forwarded)
""",
            "escaped": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    consume(forwarded)
    if optimizer_type == "adam":
        return Backend(params, **forwarded)
""",
            "dynamic": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        return Backend(params, **select(optimizer_params))
""",
            "unsupported selector": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type.removeprefix("x") == "adam":
        return Backend(params, **optimizer_params)
""",
            "unsupported branch": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if enabled:
        return Backend(params, **optimizer_params)
""",
            "unselected call": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    return Backend(params, **optimizer_params)
""",
        }
        for label, source in cases.items():
            with self.subTest(label=label):
                self.write_source("toolkit/optimizer.py", source)
                with self.assertRaisesRegex(DiscoveryError, "dispatch"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_rejects_every_unsupported_selected_shape(self):
        cases = {
            "two_local_return": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        first = torch.optim.SGD(params)
        second = first
        return second
""",
            "container_return": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        choices = {"optimizer": torch.optim.SGD(params)}
        return choices["optimizer"]
""",
            "if_expression_return": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        return torch.optim.SGD(params) if enabled else torch.optim.Adam(params)
""",
            "while_constructor": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        while enabled:
            return torch.optim.SGD(params)
""",
            "try_star_constructor": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        try:
            return torch.optim.SGD(params)
        except* Exception:
            pass
""",
            "unclassified_call": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        probe()
        return torch.optim.SGD(params)
""",
            "dynamic_return": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        chosen = factories[optimizer_type]
        return chosen(params)
""",
            "constructor_target_alias": """from torch.optim import SGD
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        backend = SGD
        return backend(params)
""",
            "arbitrary_attribute_write": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        holder.backend = torch.optim.SGD
        return torch.optim.SGD(params)
""",
            "arbitrary_subscript_write": """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "hidden":
        holder["backend"] = torch.optim.SGD
        return torch.optim.SGD(params)
""",
        }
        for shape, source in cases.items():
            with self.subTest(shape=shape):
                self.write_source("toolkit/optimizer.py", source)
                with self.assertRaises(DiscoveryError) as context:
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )
                message = str(context.exception)
                self.assertIn("toolkit/optimizer.py", message)
                self.assertIn("get_optimizer", message)
                self.assertIn("shape", message)

    def test_training_dispatch_contract_resolves_dotted_imports_once_and_rejects_relative_imports(self):
        fixtures = {
            "optimizer": (
                "toolkit/optimizer.py",
                """import vendor.optimizers
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "magic":
        return vendor.optimizers.Magic(params)
""",
                "magic", "optimizer.registry", "vendor.optimizers.Magic",
            ),
            "scheduler": (
                "toolkit/scheduler.py",
                """import vendor.schedulers
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "magic":
        return vendor.schedulers.Magic(optimizer)
""",
                "magic", "scheduler.registry", "vendor.schedulers.Magic",
            ),
        }
        for label, (path, source, key, read_kind, target) in fixtures.items():
            with self.subTest(label=label):
                self.write_source(path, source)
                discovered = discover_python_settings(self.repository_root, (path,))
                self.assertIn(
                    (key, read_kind, target),
                    {
                        (fact.key, fact.read_kind, fact.default_expression)
                        for fact in discovered
                    },
                )

        aliased_fixtures = {
            "optimizer": (
                "toolkit/optimizer.py",
                """import vendor.optimizers as choices
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "magic":
        return choices.Magic(params)
""",
                "optimizer.registry", "vendor.optimizers.Magic",
            ),
            "scheduler": (
                "toolkit/scheduler.py",
                """import vendor.schedulers as choices
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "magic":
        return choices.Magic(optimizer)
""",
                "scheduler.registry", "vendor.schedulers.Magic",
            ),
        }
        for label, (path, source, read_kind, target) in aliased_fixtures.items():
            with self.subTest(aliased=label):
                self.write_source(path, source)
                discovered = discover_python_settings(self.repository_root, (path,))
                self.assertIn(
                    ("magic", read_kind, target),
                    {
                        (fact.key, fact.read_kind, fact.default_expression)
                        for fact in discovered
                    },
                )

        for label, (path, function, selector, constructor) in {
            "optimizer": (
                "toolkit/optimizer.py", "get_optimizer", "optimizer_type", "Backend",
            ),
            "scheduler": (
                "toolkit/scheduler.py", "get_lr_scheduler", "name", "Backend",
            ),
        }.items():
            with self.subTest(relative=label):
                signature = (
                    "params, optimizer_type, optimizer_params"
                    if label == "optimizer"
                    else "name, optimizer, **kwargs"
                )
                argument = "params" if label == "optimizer" else "optimizer"
                self.write_source(
                    path,
                    f"""from .choices import {constructor}
def {function}({signature}):
    if {selector} == "magic":
        return {constructor}({argument})
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "relative import"):
                    discover_python_settings(self.repository_root, (path,))

    def test_training_dispatch_contract_rejects_imported_namespace_mutation(self):
        operations = {
            "store": "torch.optim = fake",
            "delete": "del torch.optim",
            "augmented": "torch.optim += fake",
            "conditional_store": "if enabled:\n            torch.optim = fake",
            "setattr_root": "setattr(torch, 'optim', fake)",
            "setattr_subpath": "setattr(torch.optim, 'SGD', fake)",
            "delattr_subpath": "delattr(torch.optim, 'SGD')",
            "aliased_store": "backend.optim = fake",
        }
        for shape, operation in operations.items():
            with self.subTest(shape=shape):
                import_line = "import torch as backend" if shape == "aliased_store" else "import torch"
                constructor = "backend.optim.SGD" if shape == "aliased_store" else "torch.optim.SGD"
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""{import_line}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        {operation}
        return {constructor}(params)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "imported namespace"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_rejects_module_imported_namespace_mutation(self):
        cases = {
            "before_definition": (
                "torch.optim.SGD = fake", "",
            ),
            "after_definition": (
                "", "torch.optim.SGD = fake",
            ),
            "conditional_after": (
                "", "if enabled:\n    del torch.optim.SGD",
            ),
            "augmented_before": (
                "torch.optim += fake", "",
            ),
            "setattr_after": (
                "", "setattr(torch.optim, 'SGD', fake)",
            ),
            "delattr_before": (
                "delattr(torch, 'optim')", "",
            ),
        }
        for shape, (before, after) in cases.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
{before}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
{after}
""",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, r"module.*imported namespace.*get_optimizer"
                ):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_module_audit_executes_class_bodies(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
class ExecutedClass:
    torch.optim.SGD = fake
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
""",
        )

        with self.assertRaisesRegex(DiscoveryError, "module imported namespace"):
            discover_python_settings(
                self.repository_root, ("toolkit/optimizer.py",)
            )

    def test_training_dispatch_contract_module_audit_skips_deferred_bodies(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def deferred_function():
    torch.optim.SGD = fake
class DeferredClass:
    def deferred_method(self):
        torch.optim.SGD = fake
deferred_lambda = lambda: setattr(torch.optim, "SGD", fake)
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
import math
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertIn(
            ("sgd", "optimizer.registry", "torch.optim.SGD"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
        )

    def test_training_dispatch_contract_audits_definition_time_expressions(self):
        contexts = {
            "function_decorator": '@setattr(torch.optim, "SGD", fake)\ndef helper():\n    pass',
            "async_function_decorator": '@setattr(torch.optim, "SGD", fake)\nasync def helper():\n    pass',
            "class_decorator": '@setattr(torch.optim, "SGD", fake)\nclass Helper:\n    pass',
            "positional_default": 'def helper(value=setattr(torch.optim, "SGD", fake)):\n    pass',
            "keyword_default": 'def helper(*, value=setattr(torch.optim, "SGD", fake)):\n    pass',
            "argument_annotation": 'def helper(value: setattr(torch.optim, "SGD", fake)):\n    pass',
            "return_annotation": 'def helper() -> delattr(torch.optim, "SGD"):\n    pass',
            "lambda_default": 'helper = lambda value=setattr(torch.optim, "SGD", fake): value',
            "class_base": 'class Helper(setattr(torch.optim, "SGD", fake)):\n    pass',
            "class_keyword": 'class Helper(metaclass=setattr(torch.optim, "SGD", fake)):\n    pass',
            "function_type_parameter": 'def helper[T: setattr(torch.optim, "SGD", fake)]():\n    pass',
            "class_type_parameter": 'class Helper[T: setattr(torch.optim, "SGD", fake)]:\n    pass',
            "nested_method_default": 'class Helper:\n    def method(self, value=setattr(torch.optim, "SGD", fake)):\n        pass',
        }
        for shape, definition in contexts.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "module imported namespace"
                ):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_postpones_only_annotations(self):
        self.write_source(
            "toolkit/optimizer.py",
            '''from __future__ import annotations
import torch
def helper(value: setattr(torch.optim, "SGD", fake)) -> delattr(torch.optim, "SGD"):
    pass
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

        eager_contexts = {
            "decorator": '@setattr(torch.optim, "SGD", fake)\ndef helper():\n    pass',
            "default": 'def helper(value=setattr(torch.optim, "SGD", fake)):\n    pass',
        }
        for shape, definition in eager_contexts.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''from __future__ import annotations
import torch
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "module imported namespace"
                ):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_resolves_builtin_mutation_aliases(self):
        cases = {
            "builtins_attribute": (
                "import builtins", 'builtins.setattr(torch.optim, "SGD", fake)',
            ),
            "builtins_alias": (
                "import builtins as bi", 'bi.delattr(torch.optim, "SGD")',
            ),
            "from_builtin_alias": (
                "from builtins import setattr as mutate",
                'mutate(torch.optim, "SGD", fake)',
            ),
            "namespace_alias": (
                "namespace = torch.optim", 'setattr(namespace, "SGD", fake)',
            ),
            "conditional_alias": (
                "if enabled:\n    namespace = torch.optim",
                'setattr(namespace, "SGD", fake)',
            ),
            "reassigned_builtin_alias": (
                "from builtins import setattr as mutate\nmutate = wrapper",
                'mutate(torch.optim, "SGD", fake)',
            ),
        }
        for shape, (binding, operation) in cases.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{binding}
{operation}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "module imported namespace"
                ):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_rejects_namespace_accessors_and_unknown_calls(self):
        operations = {
            "dict_store": 'torch.optim.__dict__["SGD"] = fake',
            "dict_delete": 'del torch.optim.__dict__["SGD"]',
            "dict_augmented": 'torch.optim.__dict__["SGD"] += fake',
            "dict_escape": 'namespace = torch.optim.__dict__',
            "vars_accessor": 'vars(torch.optim)["SGD"] = fake',
            "getattr_accessor": 'getattr(torch.optim, "__dict__")["SGD"] = fake',
            "unknown_direct": 'mutate_namespace(torch.optim)',
            "unknown_alias": 'namespace = torch.optim\nmutate_namespace(namespace)',
        }
        for shape, operation in operations.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{operation}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "module imported namespace"
                ):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_allows_safe_module_definition_shapes(self):
        self.write_source(
            "toolkit/optimizer.py",
            '''import builtins
from builtins import delattr as remove
import torch
marker = len((1,))
local = object
builtins.setattr(local, "value", 1)
remove(local, "value")
def deferred_function():
    setattr(torch.optim, "SGD", fake)
class DeferredClass:
    def deferred_method(self):
        delattr(torch.optim, "SGD")
deferred_lambda = lambda: setattr(torch.optim, "SGD", fake)
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_rejects_eager_local_callable_execution(self):
        definitions = {
            "bare_function_decorator": '''def mutate(target):
    torch.optim.SGD = target
@mutate
def configured():
    pass''',
            "class_decorator_factory": '''class Mutator:
    def __call__(self, target):
        torch.optim.SGD = target
@Mutator()
def configured():
    pass''',
            "function_default": '''def mutate():
    torch.optim.SGD = fake
def configured(value=mutate()):
    pass''',
            "local_class_base": '''class LocalBase:
    def __init_subclass__(cls):
        torch.optim.SGD = cls
class Configured(LocalBase):
    pass''',
            "local_metaclass": '''class LocalMeta(type):
    def __new__(cls, name, bases, namespace):
        torch.optim.SGD = cls
class Configured(metaclass=LocalMeta):
    pass''',
            "nested_class_decorator": '''class Outer:
    def mutate(target):
        torch.optim.SGD = target
    @mutate
    def configured():
        pass''',
            "container_callable": '''def mutate():
    torch.optim.SGD = fake
callbacks = [mutate]
def configured(value=callbacks[0]()):
    pass''',
            "local_instance": '''class Mutator:
    def __call__(self, target):
        torch.optim.SGD = target
instance = object.__new__(Mutator)
@instance
def configured():
    pass''',
            "unproven_callable": '''def configured(value=external()):
    pass''',
            "builtin_callback": '''def mutate(value):
    torch.optim.SGD = value
configured = sorted([1], key=mutate)''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module.*callable"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_allows_deferred_locals_and_safe_builtins(self):
        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
def unused_function():
    torch.optim.SGD = fake
class UnusedClass:
    def unused_method(self):
        torch.optim.SGD = fake
safe_length = len((1, 2))
safe_tuple = tuple([1, 2])
safe_number = int("2")
class Plain(object):
    pass
def configured(value=tuple()):
    pass
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_rejects_sensitive_namespace_indirection(self):
        operations = {
            "direct_holder": "holder = torch.optim",
            "list_holder": "holder = [torch.optim]",
            "tuple_holder": "holder = (torch.optim,)",
            "dict_holder": 'holder = {"optimizer": torch.optim}',
            "set_holder": "holder = {torch.optim}",
            "nested_holder": 'holder = {"optimizer": [(torch.optim,)]}',
            "holder_subscript": "holder = [torch.optim]\nholder[0].SGD = fake",
            "globals_attribute": 'globals()["torch"].optim.SGD = fake',
            "globals_holder": 'holder = globals()["torch"]',
            "locals_holder": 'holder = locals()["torch"]',
            "vars_holder": 'holder = vars()["torch"]',
            "globals_bare": 'globals()["torch"]',
            "locals_bare": 'locals()["torch"]',
            "vars_bare": 'vars()["torch"]',
            "dynamic_globals": "holder = globals()[name]",
        }
        for shape, operation in operations.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{operation}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module.*namespace"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_allows_unrelated_module_containers(self):
        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
sequence = [1, ("optimizer",)]
mapping = {"torch": "text", "values": [1, 2]}
unique = {"torch", "optimizer"}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_isolates_class_execution_frames(self):
        safe_sources = {
            "reviewer_backend": '''class ClassScope:
    import torch as backend
import builtins as backend
import torch
local = object
backend.setattr(local, "value", 1)''',
            "class_rebinding": '''import builtins as backend
import torch
local = object
class ClassScope:
    backend = Local
backend.setattr(local, "value", 1)''',
            "class_local_torch": '''import torch
class ClassScope:
    class Local:
        pass
    torch = Local
    torch.value = 1''',
            "nested_class_local_torch": '''import torch
class Outer:
    class Inner:
        class Local:
            pass
        torch = Local
        torch.value = 1''',
        }
        for shape, prefix in safe_sources.items():
            with self.subTest(safe=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''{prefix}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                discovered = discover_python_settings(
                    self.repository_root, ("toolkit/optimizer.py",)
                )
                self.assertTrue(
                    any(fact.read_kind == "optimizer.registry" for fact in discovered)
                )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
class Outer:
    class Local:
        pass
    torch = Local
    class Inner:
        torch.optim.SGD = fake
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        with self.assertRaisesRegex(DiscoveryError, "module.*namespace"):
            discover_python_settings(
                self.repository_root, ("toolkit/optimizer.py",)
            )

        provenance_sources = {
            "conditional_class_import": '''if enabled:
    import torch as backend
    class Scope:
        backend.optim.SGD = fake''',
            "conditional_globals": '''if enabled:
    import torch
    holder = globals()["torch"]''',
            "try_star_body": '''import torch
try:
    pass
except* Exception:
    torch.optim.SGD = fake''',
        }
        for shape, prefix in provenance_sources.items():
            with self.subTest(provenance=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''{prefix}
import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_resolves_semantic_builtin_accessors(self):
        operations = {
            "builtins_globals": (
                "import builtins",
                'builtins.globals()["torch"].optim.SGD = fake',
            ),
            "aliased_builtins_vars": (
                "import builtins as bi",
                'bi.vars()["torch"].optim.SGD = fake',
            ),
            "from_globals_alias": (
                "from builtins import globals as namespace",
                'namespace()["torch"].optim.SGD = fake',
            ),
            "from_locals_alias": (
                "from builtins import locals as namespace",
                'namespace()["torch"].optim.SGD = fake',
            ),
            "from_vars_alias": (
                "from builtins import vars as namespace",
                'namespace()["torch"].optim.SGD = fake',
            ),
        }
        for shape, (binding, operation) in operations.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{binding}
{operation}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module.*namespace"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
from builtins import globals as namespace
unrelated = namespace()["unrelated"]
namespace = tuple
empty = namespace()
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_preserves_finite_binder_provenance(self):
        definitions = {
            "for_sensitive": '''for backend in (torch.optim,):
    backend.SGD = fake''',
            "for_local_callable": '''def mutate(value):
    torch.optim.SGD = value
for callback in (mutate,):
    configured = sorted([1], key=callback)''',
            "for_destructuring": '''for left, right in ((torch.optim, 1),):
    left.SGD = fake''',
            "for_starred_destructuring": '''for *rest, in ((torch.optim,),):
    rest[0].SGD = fake''',
            "match_capture": '''match torch.optim:
    case backend:
        backend.SGD = fake''',
            "match_sequence": '''match (torch.optim,):
    case (backend,):
        backend.SGD = fake''',
            "match_mapping": '''match {"backend": torch.optim}:
    case {"backend": backend}:
        backend.SGD = fake''',
            "comprehension_sensitive": '''[
    setattr(backend, "SGD", fake)
    for backend in (torch.optim,)
]''',
            "comprehension_local_callable": '''def mutate(value):
    torch.optim.SGD = value
callbacks = [callback for callback in (mutate,)]
configured = sorted([1], key=callbacks[0])''',
            "unsupported_match_class": '''class Local:
    pass
match object():
    case Local():
        pass''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
for value in (1, 2):
    marker = value
match (1, 2):
    case (left, right):
        marker = left
safe = [value for value in (1, 2)]
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_tracks_finite_callable_containers(self):
        definitions = {
            "list": '''callbacks = [mutate]
configured = sorted([1], key=callbacks[0])''',
            "tuple": '''callbacks = (mutate,)
configured = sorted([1], key=callbacks[0])''',
            "mapping": '''callbacks = {"key": mutate}
configured = sorted([1], key=callbacks["key"])''',
            "nested": '''callbacks = [(mutate,)]
configured = sorted([1], key=callbacks[0][0])''',
            "dynamic_uniform": '''callbacks = [mutate, mutate]
configured = sorted([1], key=callbacks[index])''',
            "starred_sequence": '''source = [mutate]
callbacks = [*source]
configured = sorted([1], key=callbacks[0])''',
            "mapping_unpack": '''source = {"key": mutate}
callbacks = {**source}
configured = sorted([1], key=callbacks["key"])''',
            "subscript_store": '''callbacks = [str]
callbacks[0] = mutate
configured = sorted([1], key=callbacks[0])''',
            "mapping_store": '''callbacks = {"key": str}
callbacks["key"] = mutate
configured = sorted([1], key=callbacks["key"])''',
            "subscript_delete": '''callbacks = [str]
del callbacks[0]''',
            "augmented_container": '''callbacks = [str]
callbacks += [mutate]
configured = sorted([1], key=callbacks[0])''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
def mutate(value):
    torch.optim.SGD = value
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
def unused(value):
    torch.optim.SGD = value
unused_callbacks = [unused]
safe_callbacks = [str]
configured = sorted([1], key=safe_callbacks[0])
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_preserves_conditional_expression_provenance(self):
        definitions = {
            "local_callback_direct": '''callback = mutate if flag else str
configured = sorted([1], key=callback)''',
            "local_callback_list": '''callbacks = [mutate] if flag else [str]
configured = sorted([1], key=callbacks[0])''',
            "local_callback_boolop": '''callback = flag and mutate
configured = sorted([1], key=callback)''',
            "local_callback_boolop_list": '''callbacks = flag and [mutate] or [str]
configured = sorted([1], key=callbacks[0])''',
            "conditional_semantic_accessor": '''namespace = (
    globals if flag else locals
)
namespace()["torch"].optim.SGD = fake''',
            "conditional_semantic_accessor_container": '''accessors = (
    [globals] if flag else [locals]
)
accessors[0]()["torch"].optim.SGD = fake''',
            "conditional_owner_store": '''left = [str]
right = [int]
(left if flag else right)[0] = mutate''',
            "conditional_owner_different_shapes": '''left = [str]
right = [int, int]
(left if flag else right)[0] = mutate''',
            "conditional_owner_alias_different_shapes": '''left = [str]
right = [int, int]
owner = left if flag else right
owner[0] = mutate''',
            "conditional_owner_alias_finite_or_scalar": '''left = [str]
owner = left if flag else None
owner[0] = mutate''',
            "conditional_owner_alias_local_contents": '''left = [mutate]
right = [str]
owner = left if flag else right
owner[0] = str''',
            "conditional_owner_alias_incompatible_local_contents": '''left = [mutate]
right = [str, str]
owner = left if flag else right
owner[0] = str''',
            "conditional_owner_boolop_delete": '''left = [str]
right = [int]
del (left or right)[0]''',
            "conditional_owner_nested_augassign": '''left = [str]
middle = [int]
right = [float]
(left if flag else (middle if other else right))[0] += 1''',
            "conditional_for_sensitive": '''for backend in ((torch.optim,) if flag else (torch.optim,)):
    backend.SGD = fake''',
            "conditional_for_sensitive_boolop": '''for backend in (flag and (torch.optim,)):
    backend.SGD = fake''',
            "conditional_match_sensitive": '''match torch.optim if flag else torch.optim:
    case backend:
        backend.SGD = fake''',
            "conditional_comprehension_sensitive": '''[
    setattr(backend, "SGD", fake)
    for backend in ((torch.optim,) if flag else (torch.optim,))
]''',
            "conditional_nested_comprehension_sensitive": '''[
    setattr(backend, "SGD", fake)
    for backend in (
        (torch.optim,)
        if flag
        else ((torch.optim,) if other else (torch.optim,))
    )
]''',
            "conditional_starred_sensitive": '''for backend in (*(
    (torch.optim,) if flag else (torch.optim,)
),):
    backend.SGD = fake''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
flag = True
other = False
def mutate(value):
    torch.optim.SGD = value
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
flag = True
other = False
callback = str if flag else int
callbacks = [str] if flag else [int]
boolop_callback = str or int
configured = sorted([1], key=callback)
configured_list = sorted([1], key=callbacks[0])
configured_boolop = sorted([1], key=boolop_callback)
scalar = 1 if flag else 2
short_circuit_scalar = flag and 1 or 2
for value in ((1,) if flag else (2,)):
    marker = value
match 1 if flag else 2:
    case matched:
        marker = matched
safe = [value for value in ((1,) if other else (2,))]
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_requires_proven_builtin_callbacks(self):
        definitions = {
            "dynamic_key_dict": '''name = "callback"
callbacks = {name: mutate}
configured = sorted([1], key=callbacks[name])''',
            "tuple_concat": '''callbacks = (mutate,) + (str,)
configured = sorted([1], key=callbacks[0])''',
            "list_repetition": '''callbacks = [mutate] * 2
configured = sorted([1], key=callbacks[0])''',
            "unknown_sorted_key": '''configured = sorted([1], key=external)''',
            "unknown_min_key": '''configured = min([1], key=external)''',
            "unknown_max_key_alias": '''from builtins import max as choose
configured = choose([1], key=external)''',
            "unknown_builtins_sorted_key": '''import builtins as bi
configured = bi.sorted([1], key=external)''',
            "unknown_assigned_alias_key": '''arrange = sorted
configured = arrange([1], key=external)''',
            "unknown_kwargs": '''options = external
configured = sorted([1], **options)''',
            "unknown_literal_spread_key": '''configured = sorted(
    [1], **{"key": external}
)''',
            "dynamic_literal_spread_key": '''name = "key"
configured = sorted([1], **{name: str})''',
            "unknown_or_disabled_ifexp": '''callback = (
    external if flag else None
)
configured = sorted([1], key=callback)''',
            "unknown_or_disabled_boolop": '''callback = external or None
configured = sorted([1], key=callback)''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
def mutate(value):
    torch.optim.SGD = value
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                with self.assertRaisesRegex(DiscoveryError, "module.*callback"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

        self.write_source(
            "toolkit/optimizer.py",
            '''import torch
import builtins as bi
from builtins import min as minimum
flag = True
arrange = sorted
callback = str if flag else int
sorted_direct = sorted([1], key=str)
sorted_alias = arrange([1], key=callback)
minimum_alias = minimum([1], key=int)
maximum_attribute = bi.max([1], key=str)
disabled_callback = sorted([1], key=None)
safe_spread_callback = sorted([1], **{"key": str})
safe_spread_without_callback = sorted([1], **{"reverse": True})
unknown_length = len(external)
unknown_reverse = sorted(external, reverse=descending)
unknown_positional = max(external, 1)
unknown_default = min(external, default=fallback)
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
        )
        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        self.assertTrue(any(fact.read_kind == "optimizer.registry" for fact in discovered))

    def test_training_dispatch_contract_propagates_disabled_builtin_callbacks(self):
        definitions = {
            "assigned": '''callback = None
configured = sorted([1], key=callback)''',
            "ifexp": '''callback = None if flag else str
configured = sorted([1], key=callback)''',
            "boolop": '''callback = None or int
configured = sorted([1], key=callback)''',
            "finite_subscript": '''callbacks = [None]
configured = sorted([1], key=callbacks[0])''',
            "literal_spread": '''callback = None
configured = sorted([1], **{"key": callback})''',
            "min_alias": '''from builtins import min as choose
callback = None
configured = choose([1], key=callback)''',
            "max_alias_container": '''import builtins as bi
callbacks = {"key": None}
configured = bi.max([1], key=callbacks["key"])''',
        }
        for shape, definition in definitions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f'''import torch
flag = True
{definition}
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "sgd":
        return torch.optim.SGD(params)
''',
                )
                try:
                    discovered = discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )
                except DiscoveryError as error:
                    self.fail(f"disabled callback {shape} was rejected: {error}")
                self.assertTrue(
                    any(
                        fact.read_kind == "optimizer.registry"
                        for fact in discovered
                    )
                )

    def test_training_dispatch_contract_rejects_nested_or_conditional_mapping_effects(self):
        operations = {
            "nested_write": 'forwarded["nested"]["value"] = 1',
            "nested_delete": 'del forwarded["nested"]["value"]',
            "nested_method": 'forwarded["nested"].update({"value": 1})',
            "nested_get_method": 'forwarded.get("nested").update({"value": 1})',
            "conditional_get": 'if enabled:\n            forwarded.get("capturable", False)',
            "conditional_pop": 'if enabled:\n            forwarded.pop("weight_decay", 0.0)',
            "conditional_write": 'if enabled:\n            forwarded["capturable"] = True',
        }
        for shape, operation in operations.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    if optimizer_type == "adam":
        {operation}
        return torch.optim.Adam(params, **forwarded)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "mapping.*shape"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_inventories_literal_mapping_loads_and_membership(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        required = optimizer_params["required"]
        present = "present" in optimizer_params
        missing = "missing" not in optimizer_params
        return torch.optim.Adam(params, **optimizer_params)
""",
        )
        self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    forwarded = kwargs
    if name == "step":
        required = forwarded["step_size"]
        present = "last_epoch" in forwarded
        return torch.optim.lr_scheduler.StepLR(optimizer, **forwarded)
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/scheduler.py"),
        )

        self.assertEqual(
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
                if fact.read_kind in {"optimizer.consumed", "scheduler.consumed"}
            },
            {
                ("adam__required", "optimizer.consumed", "required"),
                ("adam__present", "optimizer.consumed", "presence-check"),
                ("adam__missing", "optimizer.consumed", "presence-check"),
                ("step__step_size", "scheduler.consumed", "required"),
                ("step__last_epoch", "scheduler.consumed", "presence-check"),
            },
        )

    def test_training_dispatch_contract_guard_and_effect_emit_distinct_mapping_facts(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    if optimizer_type == "adam":
        if "bare_guard" in forwarded:
            pass
        if "guard" not in forwarded:
            forwarded["effect"] = True
        return torch.optim.Adam(params, **forwarded)
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        self.assertIn(
            ("adam__bare_guard", "optimizer.consumed", "presence-check"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
        )
        self.assertIn(
            ("adam__guard", "optimizer.consumed", "presence-check"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
        )
        self.assertIn(
            ("adam__effect", "optimizer.injected", "True"),
            {
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discovered
            },
        )

    def test_training_dispatch_contract_rejects_dynamic_or_nested_mapping_loads(self):
        expressions = {
            "dynamic_subscript": "forwarded[key]",
            "nested_subscript": 'forwarded["nested"]["value"]',
            "dynamic_membership": "key in forwarded",
            "nested_membership": '"value" in forwarded["nested"]',
        }
        for shape, expression in expressions.items():
            with self.subTest(shape=shape):
                self.write_source(
                    "toolkit/optimizer.py",
                    f"""import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    forwarded = optimizer_params
    if optimizer_type == "adam":
        value = {expression}
        return torch.optim.Adam(params, **forwarded)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "mapping.*shape"):
                    discover_python_settings(
                        self.repository_root, ("toolkit/optimizer.py",)
                    )

    def test_training_dispatch_contract_new_choice_literal_mapping_read_is_unowned(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    if optimizer_type == "adam":
        return torch.optim.Adam(params, **optimizer_params)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "        return torch.optim.Adam(params, **optimizer_params)",
                "        return torch.optim.Adam(params, **optimizer_params)\n"
                '    elif optimizer_type == "adamw":\n'
                '        present = "new_flag" in optimizer_params\n'
                "        return torch.optim.AdamW(params, **optimizer_params)",
            ),
            encoding="utf-8",
        )

        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims += tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in changed
            if fact.key.startswith("adamw")
            and fact.read_kind != "optimizer.consumed"
        )

        with self.assertRaisesRegex(DiscoveryError, "new_flag"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_diffusers_fallback_uses_exact_safe_sequence(self):
        production_shape = """from diffusers.optimization import SchedulerType, TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        name = SchedulerType(name)
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        return schedule_func(optimizer, **kwargs)
    except Exception:
        pass
    raise ValueError(name)
"""
        self.write_source("toolkit/scheduler.py", production_shape)
        discover_python_settings(self.repository_root, ("toolkit/scheduler.py",))

        cases = {
            "lookup_after_unknown_call": """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        probe()
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        return schedule_func(optimizer, **kwargs)
    except Exception:
        pass
""",
            "call_from_finally": """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
    finally:
        return schedule_func(optimizer, **kwargs)
""",
            "lookup_in_finally": """from diffusers.optimization import TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        pass
    finally:
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        return schedule_func(optimizer, **kwargs)
""",
            "reordered_lookup": """from diffusers.optimization import SchedulerType, TYPE_TO_SCHEDULER_FUNCTION
def get_lr_scheduler(name, optimizer, **kwargs):
    try:
        schedule_func = TYPE_TO_SCHEDULER_FUNCTION[name]
        name = SchedulerType(name)
        return schedule_func(optimizer, **kwargs)
    except Exception:
        pass
""",
        }
        for shape, source in cases.items():
            with self.subTest(shape=shape):
                self.write_source("toolkit/scheduler.py", source)
                with self.assertRaises(DiscoveryError) as context:
                    discover_python_settings(
                        self.repository_root, ("toolkit/scheduler.py",)
                    )
                message = str(context.exception)
                self.assertIn("toolkit/scheduler.py", message)
                self.assertIn("get_lr_scheduler", message)
                self.assertIn("shape", message)

    def test_training_dispatch_contract_discovers_local_parameters_and_injections(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, learning_rate, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "adamw":
        return torch.optim.AdamW(
            params, lr=float(learning_rate), eps=1e-6, **optimizer_params
        )
    elif lower_type == "localmagic":
        from toolkit.optimizers.magic import Magic
        return Magic(params, lr=float(learning_rate), **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        self.write_source(
            "toolkit/optimizers/magic.py",
            """class Magic:
    def __init__(self, params, lr=1e-4, beta=0.9, fused=True):
        pass
""",
        )
        self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "cosine":
        if "total_iters" in kwargs:
            kwargs["T_max"] = kwargs.pop("total_iters")
        return torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, **kwargs)
    elif name == "constant":
        if "factor" not in kwargs:
            kwargs["factor"] = 1.0
        return torch.optim.lr_scheduler.ConstantLR(optimizer, **kwargs)
    raise ValueError(name)
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py", "toolkit/scheduler.py"),
        )

        parameters = {
            (fact.source, fact.symbol, fact.key, fact.read_kind,
             fact.default_expression)
            for fact in discovered
            if fact.read_kind in {
                "optimizer.parameter", "optimizer.injected",
                "scheduler.injected", "scheduler.normalized",
            }
        }
        self.assertEqual(
            parameters,
            {
                ("toolkit/optimizer.py", "get_optimizer", "adamw__eps",
                 "optimizer.injected", "1e-06"),
                ("toolkit/optimizer.py", "get_optimizer", "adamw__lr",
                 "optimizer.injected", "float(learning_rate)"),
                ("toolkit/optimizer.py", "get_optimizer", "localmagic__lr",
                 "optimizer.injected", "float(learning_rate)"),
                ("toolkit/optimizers/magic.py", "Magic.__init__", "beta",
                 "optimizer.parameter", "0.9"),
                ("toolkit/optimizers/magic.py", "Magic.__init__", "fused",
                 "optimizer.parameter", "True"),
                ("toolkit/optimizers/magic.py", "Magic.__init__", "lr",
                 "optimizer.parameter", "0.0001"),
                ("toolkit/scheduler.py", "get_lr_scheduler", "constant__factor",
                 "scheduler.injected", "1.0"),
                ("toolkit/scheduler.py", "get_lr_scheduler", "cosine__total_iters",
                 "scheduler.normalized", "T_max"),
            },
        )

    def test_training_dispatch_contract_discovers_fused_backward_compatibility(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, learning_rate, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "alwaysfused":
        from toolkit.optimizers.always import AlwaysFused
        return AlwaysFused(params, **optimizer_params)
    elif lower_type == "switchable":
        from toolkit.optimizers.switchable import Switchable
        return Switchable(params, **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        self.write_source(
            "toolkit/optimizers/always.py",
            """class AlwaysFused:
    def __init__(self, params):
        for param in params:
            param.register_post_accumulate_grad_hook(self._make_backward_hook())
""",
        )
        self.write_source(
            "toolkit/optimizers/switchable.py",
            """class Switchable:
    def __init__(self, params, fused=True):
        self.fused = fused
        for param in params:
            if self.fused:
                param.register_post_accumulate_grad_hook(self._make_backward_hook())
""",
        )

        discovered = discover_python_settings(
            self.repository_root,
            ("toolkit/optimizer.py", "toolkit/optimizers/*.py"),
        )

        fused = {
            (fact.key, fact.default_expression)
            for fact in discovered
            if fact.read_kind == "optimizer.fused_backward"
        }
        self.assertEqual(fused, {("alwaysfused", "required"), ("switchable", "optional")})

    def test_training_dispatch_contract_new_registry_choice_is_unowned(self):
        path = self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "adamw":
        return torch.optim.AdamW(params, **optimizer_params)
    raise ValueError(lower_type)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "    raise ValueError(lower_type)",
                "    elif lower_type == 'newmagic':\n"
                "        return torch.optim.SGD(params, **optimizer_params)\n"
                "    raise ValueError(lower_type)",
            ),
            encoding="utf-8",
        )

        changed = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )

        with self.assertRaisesRegex(DiscoveryError, "newmagic"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_new_scheduler_choice_is_unowned(self):
        path = self.write_source(
            "toolkit/scheduler.py",
            """import torch
def get_lr_scheduler(name, optimizer, **kwargs):
    if name == "constant":
        return torch.optim.lr_scheduler.ConstantLR(optimizer, **kwargs)
    raise ValueError(name)
""",
        )
        baseline = discover_python_settings(
            self.repository_root, ("toolkit/scheduler.py",)
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in baseline
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "    raise ValueError(name)",
                "    elif name == 'newmagic':\n"
                "        return torch.optim.lr_scheduler.StepLR(optimizer, **kwargs)\n"
                "    raise ValueError(name)",
            ),
            encoding="utf-8",
        )
        changed = discover_python_settings(
            self.repository_root, ("toolkit/scheduler.py",)
        )
        with self.assertRaisesRegex(DiscoveryError, "newmagic"):
            validate_setting_ownership(changed, claims, ())

    def test_training_dispatch_contract_excludes_exact_external_constructor_boundary(self):
        self.write_source(
            "toolkit/optimizer.py",
            """import torch
def get_optimizer(params, optimizer_type, optimizer_params):
    lower_type = optimizer_type.lower()
    if lower_type == "optional":
        from optional_library import OptionalOptimizer
        return OptionalOptimizer(params, **optimizer_params)
    raise ValueError(lower_type)
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("toolkit/optimizer.py",)
        )
        boundaries = tuple(
            fact for fact in discovered
            if fact.read_kind == "optimizer.external_boundary"
        )
        self.assertEqual(len(boundaries), 1)
        boundary = boundaries[0]
        self.assertEqual(
            boundary,
            DiscoveredSetting(
                "toolkit/optimizer.py", "get_optimizer", boundary.line,
                "optional__target=optional_library.OptionalOptimizer",
                "optimizer.external_boundary", "optimizer",
                "optional_library.OptionalOptimizer",
            ),
        )
        claims = tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in discovered
            if fact is not boundary
        )
        validate_setting_ownership(
            discovered,
            claims,
            (
                Exclusion(
                    boundary.source, boundary.symbol, boundary.key,
                    boundary.read_kind,
                    "arbitrary third-party constructor surface",
                ),
            ),
        )
        self.assertFalse(
            any(
                fact.symbol == "OptionalOptimizer.__init__"
                for fact in discovered
            )
        )

    def test_discovery_reports_exact_literal_reads_without_importing_modules(self):
        self.write_source(
            "fixtures/sample.py",
            """class Config:
    def __init__(self, **kwargs):
        self.steps = kwargs.get("steps", 3000)
        self.lr = self.get_conf("lr", 1e-4)
        self.rank = kwargs["rank"]
        self.options = kwargs
        self.dtype = self.options.get("dtype", "fp16")
        for key in ("width", "height"):
            kwargs.get(key, 512)
        for key in ["min_size", "max_size"]:
            kwargs.get(key)

def parse_args(parser):
    parser.add_argument("-o", "--output-dir", default="output")
    parser.add_argument("input", default=None)

def load_env():
    first = os.getenv("FIRST_TOKEN", "one")
    second = os.environ.get("SECOND_TOKEN")
    third = os.environ["THIRD_TOKEN"]
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("fixtures/**/*.py",)
        )

        self.assertEqual(
            discovered,
            (
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 7, "dtype",
                    "kwargs.get", "core", "'fp16'",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 9, "height",
                    "kwargs.get", "core", "512",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 4, "lr",
                    "get_conf", "core", "0.0001",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 11, "max_size",
                    "kwargs.get", "core", None,
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 11, "min_size",
                    "kwargs.get", "core", None,
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 5, "rank",
                    "kwargs[]", "core", None,
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 3, "steps",
                    "kwargs.get", "core", "3000",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "Config.__init__", 9, "width",
                    "kwargs.get", "core", "512",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "load_env", 18, "FIRST_TOKEN",
                    "os.getenv", "environment", "'one'",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "load_env", 19, "SECOND_TOKEN",
                    "os.environ.get", "environment", None,
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "load_env", 20, "THIRD_TOKEN",
                    "os.environ[]", "environment", None,
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "parse_args", 15, "input",
                    "argparse.add_argument", "cli", "None",
                ),
                DiscoveredSetting(
                    "fixtures/sample.py", "parse_args", 14, "output_dir",
                    "argparse.add_argument", "cli", "'output'",
                ),
            ),
        )

    def test_discovery_resolves_model_kwargs_aliases_and_finite_fstrings(self):
        self.write_source(
            "fixtures/models.py",
            """class Model:
    def load(self):
        mkw = self.model_config.model_kwargs
        mkw.get("max_length", 512)
        components = ["dit", "video_vae"]
        for component in components:
            mkw.get(f"{component}_path", None)

class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        self.resolve("text_encoder")
        self.resolve("audio_vae")
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("fixtures/models.py",)
        )

        self.assertEqual(
            discovered,
            (
                DiscoveredSetting(
                    "fixtures/models.py", "Model.load", 7, "dit_path",
                    "model_kwargs.get", "model", "None",
                ),
                DiscoveredSetting(
                    "fixtures/models.py", "Model.load", 4, "max_length",
                    "model_kwargs.get", "model", "512",
                ),
                DiscoveredSetting(
                    "fixtures/models.py", "Model.load", 7, "video_vae_path",
                    "model_kwargs.get", "model", "None",
                ),
                DiscoveredSetting(
                    "fixtures/models.py", "Resolver.resolve", 11,
                    "audio_vae_path", "model_kwargs.get", "model", "None",
                ),
                DiscoveredSetting(
                    "fixtures/models.py", "Resolver.resolve", 11,
                    "text_encoder_path", "model_kwargs.get", "model", "None",
                ),
            ),
        )

    def test_discovery_rejects_mixed_literal_and_dynamic_parameter_calls(self):
        self.write_source(
            "mixed_components.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self, component):
        self.resolve("dit")
        self.resolve(component)
""",
        )

        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("mixed_components.py",)
            )

    def test_discovery_does_not_infer_domains_from_literal_map_lookups(self):
        method_bodies = (
            """        if False:
            COMPONENTS[component]
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
            """        value = self.model_config.model_kwargs.get(
            f"{component}_path", None
        )
        COMPONENTS[component]
        return value
""",
            """        try:
            COMPONENTS[component]
        except KeyError:
            pass
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
        )
        for index, method_body in enumerate(method_bodies):
            with self.subTest(method_body=method_body):
                path = f"literal_map_domain_{index}.py"
                self.write_source(
                    path,
                    """COMPONENTS = {"dit": 1, "vae": 2}
class Resolver:
    def resolve(self, component):
"""
                    + method_body,
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_accounts_for_external_dynamic_method_callers(self):
        self.write_source(
            "external_caller.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return self.resolve("dit")

def external_load(resolver, component):
    return resolver.resolve(component)
""",
        )

        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(self.repository_root, ("external_caller.py",))

        self.write_source(
            "same_name_target.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
        )
        self.write_source(
            "same_name_caller.py",
            """class Resolver:
    def resolve(self, component):
        return component

    def load(self):
        return self.resolve("dit")
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic"):
            discover_python_settings(
                self.repository_root,
                ("same_name_target.py", "same_name_caller.py"),
            )

    def test_discovery_rejects_dynamic_keyword_spreads_to_finite_producers(self):
        callers = (
            """    def load(self, params):
        self.resolve("dit")
        return self.resolve(**params)
""",
            """    def load(self):
        return self.resolve("dit")

def external_load(resolver, params):
    return resolver.resolve(**params)
""",
        )
        for index, caller in enumerate(callers):
            with self.subTest(caller=caller):
                path = f"dynamic_keyword_spread_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

"""
                    + caller,
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_resolves_exact_literal_keyword_spreads(self):
        self.write_source(
            "literal_keyword_spread.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return self.resolve(**{"component": "vae"})
""",
        )

        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("literal_keyword_spread.py",)
            ),
            (
                DiscoveredSetting(
                    "literal_keyword_spread.py",
                    "Resolver.resolve",
                    3,
                    "vae_path",
                    "model_kwargs.get",
                    "model",
                    "None",
                ),
            ),
        )

    def test_discovery_binds_inherited_self_and_super_calls(self):
        self.write_source(
            "inheritance_base.py",
            """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
        )
        callers = (
            "return self.resolve(\"dit\")",
            "return super().resolve(\"vae\")",
        )
        expected_keys = ("dit_path", "vae_path")
        for index, (call, expected_key) in enumerate(zip(callers, expected_keys)):
            with self.subTest(call=call):
                child_path = f"inheritance_child_{index}.py"
                self.write_source(
                    child_path,
                    """from inheritance_base import BaseResolver
class ChildResolver(BaseResolver):
    def load(self):
        """
                    + call
                    + "\n",
                )
                self.assertEqual(
                    discover_python_settings(
                        self.repository_root,
                        ("inheritance_base.py", child_path),
                    ),
                    (
                        DiscoveredSetting(
                            "inheritance_base.py",
                            "BaseResolver.resolve",
                            3,
                            expected_key,
                            "model_kwargs.get",
                            "model",
                            "None",
                        ),
                    ),
                )

    def test_discovery_rejects_dynamic_inherited_method_calls(self):
        child_calls = (
            "return self.resolve(component)",
            "return super().resolve(component)",
        )
        for index, child_call in enumerate(child_calls):
            with self.subTest(child_call=child_call):
                path = f"dynamic_inheritance_{index}.py"
                self.write_source(
                    path,
                    """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return self.resolve("dit")

class ChildResolver(BaseResolver):
    def load_dynamic(self, component):
        """
                    + child_call
                    + "\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "dynamic_inheritance_factory.py",
            """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return self.resolve("dit")

class ChildResolver(make_base()):
    def load_dynamic(self, component):
        return self.resolve(component)
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("dynamic_inheritance_factory.py",)
            )

    def test_discovery_resolves_finite_producers_through_effective_mro(self):
        cases = (
            ("self", "self.component()", "vae_path"),
            ("cls", "cls.component()", "vae_path"),
            ("self", "super().component()", "dit_path"),
        )
        for index, (receiver, producer_call, expected_key) in enumerate(cases):
            with self.subTest(producer_call=producer_call):
                path = f"finite_inherited_producer_{index}.py"
                self.write_source(
                    path,
                    """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        return "dit"

class ChildResolver(BaseResolver):
    def component(self):
        return "vae"

    def load("""
                    + receiver
                    + "):\n        return "
                    + receiver
                    + ".resolve("
                    + producer_call
                    + ")\n",
                )
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)),
                    (
                        DiscoveredSetting(
                            path,
                            "BaseResolver.resolve",
                            3,
                            expected_key,
                            "model_kwargs.get",
                            "model",
                            "None",
                        ),
                    ),
                )

        self.write_source(
            "finite_inherited_producer.py",
            """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        return "text_encoder"

class ChildResolver(BaseResolver):
    def load(self):
        return self.resolve(self.component())
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("finite_inherited_producer.py",)
            ),
            (
                DiscoveredSetting(
                    "finite_inherited_producer.py",
                    "BaseResolver.resolve",
                    3,
                    "text_encoder_path",
                    "model_kwargs.get",
                    "model",
                    "None",
                ),
            ),
        )

    def test_discovery_rejects_dynamic_effective_producer_overrides(self):
        for index, (receiver, producer_call) in enumerate(
            (("self", "self.component()"), ("cls", "cls.component()"))
        ):
            with self.subTest(producer_call=producer_call):
                path = f"dynamic_producer_override_{index}.py"
                self.write_source(
                    path,
                    """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        return "dit"

class ChildResolver(BaseResolver):
    def component(self):
        return input()

    def load("""
                    + receiver
                    + "):\n        return "
                    + receiver
                    + ".resolve("
                    + producer_call
                    + ")\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "unsupported_producer_inheritance.py",
            """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        return "dit"

class ChildResolver(make_base()):
    def load(self):
        return self.resolve(self.component())
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("unsupported_producer_inheritance.py",)
            )

    def test_discovery_rejects_producer_overrides_of_inherited_callers(self):
        self.write_source(
            "inherited_caller_override.py",
            """class BaseResolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        return "dit"

    def load(self):
        return self.resolve(self.component())

class ChildResolver(BaseResolver):
    def component(self):
        return input()
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("inherited_caller_override.py",)
            )

    def test_discovery_uses_only_the_actual_bound_receiver_parameter(self):
        unsafe_methods = (
            """    def load(self, cls):
        return cls.resolve("dit")
""",
            """    def load(self):
        def inner(self):
            return self.resolve("dit")
        return inner(external())
""",
            """    def load(this):
        this = external()
        return this.resolve("dit")
""",
        )
        for index, unsafe_method in enumerate(unsafe_methods):
            with self.subTest(unsafe_method=unsafe_method):
                path = f"unsafe_receiver_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

"""
                    + unsafe_method,
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_exception_target_receiver_bindings(self):
        self.write_source(
            "exception_receiver.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        try:
            external()
        except Exception as self:
            pass
        return self.resolve("dit")
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("exception_receiver.py",)
            )

    def test_discovery_rejects_match_capture_receiver_bindings(self):
        patterns = ("self", "[*self]", "{**self}")
        for index, pattern in enumerate(patterns):
            with self.subTest(pattern=pattern):
                path = f"match_receiver_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self, value):
        match value:
            case """
                    + pattern
                    + ":\n                pass\n"
                    + '        return self.resolve("dit")\n',
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_local_definition_receiver_bindings(self):
        definitions = (
            "def self():\n            pass",
            "async def self():\n            pass",
            "class self:\n            pass",
        )
        for index, definition in enumerate(definitions):
            with self.subTest(definition=definition):
                path = f"definition_receiver_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        """
                    + definition
                    + '\n        return self.resolve("dit")\n',
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_import_receiver_bindings(self):
        cases = (
            ("self", "import package as self"),
            ("package", "import package.module"),
            ("self", "from package import value as self"),
            ("self", "from package import self"),
        )
        for index, (receiver, import_statement) in enumerate(cases):
            with self.subTest(import_statement=import_statement):
                path = f"import_receiver_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load("""
                    + receiver
                    + "):\n        "
                    + import_statement
                    + "\n        return "
                    + receiver
                    + '.resolve("dit")\n',
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_lambda_receiver_shadowing(self):
        self.write_source(
            "lambda_receiver_shadow.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return (lambda self: self.resolve("dit"))(external())
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("lambda_receiver_shadow.py",)
            )

    def test_discovery_rejects_nested_lambda_receiver_calls(self):
        self.write_source(
            "nested_lambda_receiver.py",
            """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return (lambda: (lambda: self.resolve("dit"))())()
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(
                self.repository_root, ("nested_lambda_receiver.py",)
            )

    def test_discovery_uses_enclosing_scope_for_function_defaults(self):
        definitions = (
            'def consumer(self, value=self.resolve("dit")):',
            'def consumer(self, *, value=self.resolve("dit")):',
            'async def consumer(self, value=self.resolve("dit")):',
        )
        for index, definition in enumerate(definitions):
            with self.subTest(definition=definition):
                path = f"function_default_scope_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    """
                    + definition
                    + "\n        pass\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_uses_enclosing_scope_for_eager_annotations(self):
        definitions = (
            'def consumer(self, value: self.resolve("dit")):',
            'def consumer(self) -> self.resolve("dit"):',
            'def consumer(self, *, value: self.resolve("dit")):',
        )
        for index, definition in enumerate(definitions):
            with self.subTest(definition=definition):
                path = f"function_annotation_scope_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    """
                    + definition
                    + "\n        pass\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_skips_postponed_annotation_call_sites(self):
        self.write_source(
            "postponed_annotations.py",
            """from __future__ import annotations

class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def consumer(
        self,
        value: self.resolve("dit"),
        *,
        other: self.resolve("text_encoder"),
    ) -> self.resolve("audio_vae"):
        pass

    def load(self):
        return self.resolve("vae")
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("postponed_annotations.py",)
            ),
            (
                DiscoveredSetting(
                    "postponed_annotations.py",
                    "Resolver.resolve",
                    5,
                    "vae_path",
                    "model_kwargs.get",
                    "model",
                    "None",
                ),
            ),
        )

    def test_discovery_uses_enclosing_scope_for_function_decorators_and_types(self):
        definitions = (
            '@self.resolve("dit")\n    def consumer(self):',
            'def consumer[T: self.resolve("dit")](self):',
        )
        for index, definition in enumerate(definitions):
            with self.subTest(definition=definition):
                path = f"function_definition_scope_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    """
                    + definition
                    + "\n        pass\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_emits_definition_time_setting_reads(self):
        self.write_source(
            "definition_time_reads.py",
            """import os

@decorate(os.getenv("function_decorator", "decorator"))
def configured[T: os.getenv("function_type", "type")](
    value=os.getenv("function_default", "default"),
    annotated: os.getenv("function_annotation", "annotation") = None,
) -> os.getenv("function_return", "return"):
    pass

@decorate(os.getenv("class_decorator", "decorator"))
class Configured[T: os.getenv("class_type", "type")](
    base(os.getenv("class_base", "base")),
    metaclass=meta(os.getenv("class_keyword", "meta")),
):
    pass
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("definition_time_reads.py",)
            ),
            (
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 12, "class_base",
                    "os.getenv", "environment", "'base'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 10,
                    "class_decorator", "os.getenv", "environment", "'decorator'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 13,
                    "class_keyword", "os.getenv", "environment", "'meta'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 11, "class_type",
                    "os.getenv", "environment", "'type'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 6,
                    "function_annotation", "os.getenv", "environment",
                    "'annotation'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 3,
                    "function_decorator", "os.getenv", "environment",
                    "'decorator'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 5,
                    "function_default", "os.getenv", "environment", "'default'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 7,
                    "function_return", "os.getenv", "environment", "'return'",
                ),
                DiscoveredSetting(
                    "definition_time_reads.py", "<module>", 4, "function_type",
                    "os.getenv", "environment", "'type'",
                ),
            ),
        )

    def test_discovery_rejects_dynamic_definition_time_setting_reads(self):
        definitions = (
            '@decorate(os.getenv(key))\ndef configured():\n    pass',
            'def configured(value=os.getenv(key)):\n    pass',
            'def configured(value: os.getenv(key)):\n    pass',
            '@decorate(os.getenv(key))\nclass Configured:\n    pass',
            'class Configured(base(os.getenv(key))):\n    pass',
            'class Configured(metaclass=meta(os.getenv(key))):\n    pass',
        )
        for index, definition in enumerate(definitions):
            with self.subTest(definition=definition):
                path = f"dynamic_definition_time_{index}.py"
                self.write_source(path, "import os\n\n" + definition + "\n")
                with self.assertRaisesRegex(DiscoveryError, "dynamic environment"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_isolates_class_finite_value_state(self):
        self.write_source(
            "class_value_scope.py",
            """def load(model_config):
    component = external()
    class Inner:
        component = "dit"
        model_config.model_kwargs.get(f"{component}_path", None)
    return model_config.model_kwargs.get(f"{component}_path", None)
""",
        )
        with self.assertRaisesRegex(
            DiscoveryError, "dynamic configuration"
        ) as error:
            discover_python_settings(
                self.repository_root, ("class_value_scope.py",)
            )
        self.assertIn("line 6", str(error.exception))

    def test_discovery_isolates_lambda_finite_value_state(self):
        self.write_source(
            "lambda_value_scope.py",
            """def load(model_config):
    component = "dit"
    return (lambda component: model_config.model_kwargs.get(
        f"{component}_path", None
    ))(external())
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
            discover_python_settings(
                self.repository_root, ("lambda_value_scope.py",)
            )

    def test_discovery_isolates_comprehension_finite_value_state(self):
        expressions = (
            """[
        model_config.model_kwargs.get(f"{component}_path", None)
        for component in external()
    ]""",
            """[
        value
        for value in [
            model_config.model_kwargs.get(f"{component}_path", None)
            for component in external()
        ]
    ]""",
        )
        for index, expression in enumerate(expressions):
            with self.subTest(expression=expression):
                path = f"comprehension_value_scope_{index}.py"
                self.write_source(
                    path,
                    """def load(model_config):
    component = "dit"
    return """
                    + expression
                    + "\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_resolves_module_and_class_config_aliases(self):
        self.write_source(
            "enclosing_aliases.py",
            """model_kwargs = model_config.model_kwargs

def load(value=model_kwargs.get("module_default", None)):
    model_kwargs.get("module_body", 1)

class Loader:
    model_kwargs = model_config.model_kwargs
    class_value = model_kwargs.get("class_body", 2)

    def load(self, value=model_kwargs.get("class_default", 3)):
        self.model_kwargs.get("class_method", 4)

model_kwargs.get("module_after", 5)

class Unrelated:
    private_kwargs = model_config.model_kwargs

private_kwargs.get("leaked", 6)
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("enclosing_aliases.py",)
            ),
            (
                DiscoveredSetting(
                    "enclosing_aliases.py", "<module>", 13, "module_after",
                    "model_kwargs.get", "model", "5",
                ),
                DiscoveredSetting(
                    "enclosing_aliases.py", "<module>", 3, "module_default",
                    "model_kwargs.get", "model", "None",
                ),
                DiscoveredSetting(
                    "enclosing_aliases.py", "Loader", 8, "class_body",
                    "model_kwargs.get", "model", "2",
                ),
                DiscoveredSetting(
                    "enclosing_aliases.py", "Loader", 10, "class_default",
                    "model_kwargs.get", "model", "3",
                ),
                DiscoveredSetting(
                    "enclosing_aliases.py", "Loader.load", 11, "class_method",
                    "model_kwargs.get", "model", "4",
                ),
                DiscoveredSetting(
                    "enclosing_aliases.py", "load", 4, "module_body",
                    "model_kwargs.get", "model", "1",
                ),
            ),
        )

    def test_discovery_rejects_dynamic_enclosing_config_alias_reads(self):
        bodies = (
            """model_kwargs = model_config.model_kwargs
def load(key):
    model_kwargs.get(key)
""",
            """model_kwargs = model_config.model_kwargs
def load(value=model_kwargs.get(key)):
    pass
""",
            """class Loader:
    model_kwargs = model_config.model_kwargs
    value = model_kwargs.get(key)
""",
            """class Loader:
    model_kwargs = model_config.model_kwargs
    def load(self, value=model_kwargs.get(key)):
        pass
""",
            """class Loader:
    model_kwargs = model_config.model_kwargs
    def load(self, key):
        self.model_kwargs.get(key)
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_enclosing_alias_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_dynamic_loop_targets(self):
        bodies = (
            """component = "dit"
for component in external():
    model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
for component in external():
    pass
model_config.model_kwargs.get(f"{component}_path")
""",
            """async def load(model_config):
    component = "dit"
    async for component in external():
        model_config.model_kwargs.get(f"{component}_path")
""",
            """async def load(model_config):
    component = "dit"
    async for component in external():
        pass
    model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_loop_target_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_dynamic_with_targets(self):
        bodies = (
            """component = "dit"
with external() as component:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
with external() as component:
    pass
model_config.model_kwargs.get(f"{component}_path")
""",
            """async def load(model_config):
    component = "dit"
    async with external() as component:
        model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_with_target_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_exception_and_match_targets(self):
        bodies = (
            """component = "dit"
try:
    raise RuntimeError
except RuntimeError as component:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
try:
    raise RuntimeError
except RuntimeError as component:
    pass
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
match external():
    case component:
        model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
match external():
    case {"value": component, **rest}:
        pass
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
match external():
    case [*component]:
        model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_pattern_target_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_named_expression_targets(self):
        bodies = (
            """component = "dit"
if component := external():
    model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
if component := external():
    pass
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
[(component := external()) for ignored in values]
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_named_expression_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_non_assignment_alias_binders(self):
        bodies = (
            """settings = model_config.model_kwargs
for settings in external():
    settings.get("stale")
""",
            """settings = model_config.model_kwargs
with external() as settings:
    pass
settings.get("stale")
""",
            """settings = model_config.model_kwargs
try:
    raise RuntimeError
except RuntimeError as settings:
    pass
settings.get("stale")
""",
            """settings = model_config.model_kwargs
match external():
    case settings:
        pass
settings.get("stale")
""",
            """settings = model_config.model_kwargs
(settings := external())
settings.get("stale")
""",
            """holder.settings = model_config.model_kwargs
with external() as holder.settings:
    pass
holder.settings.get("stale")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"dynamic_alias_binder_{index}.py"
                self.write_source(path, body)
                if index in {2, 3}:
                    with self.assertRaisesRegex(
                        DiscoveryError, "branch-dependent configuration alias"
                    ):
                        discover_python_settings(self.repository_root, (path,))
                else:
                    self.assertEqual(
                        discover_python_settings(self.repository_root, (path,)), ()
                    )

    def test_discovery_invalidates_import_definition_and_delete_binders(self):
        value_bodies = (
            """component = "dit"
import package as component
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
from package import value as component
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
del component
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(value_bodies):
            with self.subTest(body=body):
                path = f"other_value_binder_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

        alias_bodies = (
            """settings = model_config.model_kwargs
def settings():
    pass
settings.get("stale")
""",
            """settings = model_config.model_kwargs
async def settings():
    pass
settings.get("stale")
""",
            """settings = model_config.model_kwargs
class settings:
    def probe():
        settings.get("inside")
settings.get("stale")
""",
        )
        for index, body in enumerate(alias_bodies):
            with self.subTest(body=body):
                path = f"other_alias_binder_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)), ()
                )

    def test_discovery_nested_class_is_a_class_namespace_barrier(self):
        self.write_source(
            "nested_class_barrier.py",
            """component = "module"
settings = model_config.model_kwargs

class Outer:
    component = "outer"
    settings = external()

    class Inner:
        settings.get("module_alias")
        model_config.model_kwargs.get(f"{component}_path")
""",
        )
        discovered = discover_python_settings(
            self.repository_root, ("nested_class_barrier.py",)
        )
        self.assertEqual(
            tuple((fact.symbol, fact.key) for fact in discovered),
            (("Outer.Inner", "module_alias"), ("Outer.Inner", "module_path")),
        )

    def test_discovery_nested_class_retains_enclosing_function_scope(self):
        self.write_source(
            "nested_class_function_scope.py",
            """def load(model_config):
    component = "function"
    settings = model_config.model_kwargs

    class Outer:
        component = "outer"
        settings = external()

        class Inner:
            settings.get(f"{component}_path")
""",
        )
        discovered = discover_python_settings(
            self.repository_root, ("nested_class_function_scope.py",)
        )
        self.assertEqual(
            tuple((fact.symbol, fact.key) for fact in discovered),
            (("Outer.Inner.load", "function_path"),),
        )

    def test_discovery_rejects_scalar_string_iterable_domains(self):
        bodies = (
            """for component in "dit":
    model_config.model_kwargs.get(f"{component}_path")
""",
            """components = "dit"
for component in components:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """[
    model_config.model_kwargs.get(f"{component}_path")
    for component in "dit"
]
""",
            """components = "dit"
[
    model_config.model_kwargs.get(f"{component}_path")
    for component in components
]
""",
            """components = "dit"
if external():
    components = ["vae"]
for component in components:
    model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"scalar_iterable_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "iterable.*shape"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_preserves_proven_collection_shape(self):
        self.write_source(
            "proven_collection_shape.py",
            """components = ["dit", "vae"]
for component in components:
    model_config.model_kwargs.get(f"{component}_path", None)

[
    model_config.model_kwargs.get(f"{component}_block", 1)
    for component in components
]
""",
        )
        discovered = discover_python_settings(
            self.repository_root, ("proven_collection_shape.py",)
        )
        self.assertEqual(
            tuple((fact.key, fact.default_expression) for fact in discovered),
            (
                ("dit_block", "1"),
                ("dit_path", "None"),
                ("vae_block", "1"),
                ("vae_path", "None"),
            ),
        )

    def test_discovery_poison_handlers_from_mutated_try_prefixes(self):
        bodies = (
            """component = "dit"
try:
    component = external()
    raise RuntimeError
except RuntimeError:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
try:
    settings = external()
    raise RuntimeError
except RuntimeError:
    settings.get("stale")
""",
            """component = "dit"
try:
    if external():
        component = external()
        raise RuntimeError
except RuntimeError:
    model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"mutated_try_prefix_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_stops_at_unconditional_terminal_statements(self):
        bodies = (
            """for component in ["dit"]:
    break
    model_config.model_kwargs.get("after_break")
""",
            """for component in ["dit"]:
    continue
    model_config.model_kwargs.get("after_continue")
""",
            """while external():
    break
    model_config.model_kwargs.get("after_while_break")
""",
            """while external():
    continue
    model_config.model_kwargs.get("after_while_continue")
""",
            """def load(model_config):
    return
    model_config.model_kwargs.get("after_return")
""",
            """def load(model_config):
    raise RuntimeError
    model_config.model_kwargs.get("after_raise")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"unreachable_terminal_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)), ()
                )

    def test_discovery_uses_terminal_loop_state_not_unreachable_state(self):
        for index, terminal in enumerate(("break", "continue")):
            with self.subTest(terminal=terminal):
                path = f"terminal_loop_state_{index}.py"
                self.write_source(
                    path,
                    f'''component = "dit"
for component in ["vae"]:
    {terminal}
    component = external()
model_config.model_kwargs.get(f"{{component}}_path")
''',
                )
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)),
                    (
                        DiscoveredSetting(
                            path,
                            "<module>",
                            5,
                            "vae_path",
                            "model_kwargs.get",
                            "model",
                            None,
                        ),
                    ),
                )

        for index, terminal in enumerate(("break", "continue"), start=2):
            with self.subTest(terminal=f"while-{terminal}"):
                path = f"terminal_loop_state_{index}.py"
                self.write_source(
                    path,
                    f'''component = "dit"
while external():
    component = "vae"
    {terminal}
    component = external()
model_config.model_kwargs.get(f"{{component}}_path")
''',
                )
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("dit_path", "vae_path"),
                )

    def test_discovery_ignores_unreachable_try_suffix_after_raise(self):
        self.write_source(
            "unreachable_try_suffix.py",
            """component = "dit"
try:
    raise RuntimeError
    component = external()
except RuntimeError:
    pass
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("unreachable_try_suffix.py",)
            ),
            (
                DiscoveredSetting(
                    "unreachable_try_suffix.py",
                    "<module>",
                    7,
                    "dit_path",
                    "model_kwargs.get",
                    "model",
                    None,
                ),
            ),
        )

    def test_discovery_carries_try_state_through_else_and_finally(self):
        self.write_source(
            "try_else_finally_flow.py",
            """def caught(model_config):
    component = "dit"
    try:
        raise RuntimeError
    except RuntimeError:
        pass
    else:
        component = external()
    finally:
        component = "vae"
    model_config.model_kwargs.get(f"{component}_path")

def terminating(model_config):
    try:
        pass
    finally:
        return
    model_config.model_kwargs.get("unreachable")
""",
        )
        self.assertEqual(
            tuple(
                (fact.symbol, fact.key)
                for fact in discover_python_settings(
                    self.repository_root, ("try_else_finally_flow.py",)
                )
            ),
            (("caught", "vae_path"),),
        )

    def test_discovery_poisons_finally_from_mutated_try_prefixes(self):
        self.write_source(
            "try_prefix_finally.py",
            """component = "dit"
try:
    component = external()
    raise RuntimeError
except RuntimeError:
    pass
finally:
    model_config.model_kwargs.get(f"{component}_path")
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
            discover_python_settings(
                self.repository_root, ("try_prefix_finally.py",)
            )

    def test_discovery_propagates_nested_compound_try_prefixes(self):
        bodies = (
            """component = "dit"
try:
    if external():
        component = external()
        risky()
        component = "dit"
except RuntimeError:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
try:
    for ignored in external():
        settings = external()
        risky()
        settings = model_config.model_kwargs
except RuntimeError:
    settings.get("stale")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"nested_try_prefix_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_applies_finally_to_each_loop_terminal_state(self):
        value_bodies = (
            """component = "dit"
for ignored in ["once"]:
    try:
        break
    finally:
        component = "vae"
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
for ignored in ["once"]:
    try:
        continue
    finally:
        component = "vae"
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(value_bodies):
            with self.subTest(body=body):
                path = f"finally_loop_terminal_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("vae_path",),
                )

        alias_bodies = (
            """settings = model_config.model_kwargs
for ignored in ["once"]:
    try:
        break
    finally:
        settings = external()
settings.get("stale")
""",
            """settings = model_config.model_kwargs
for ignored in ["once"]:
    try:
        continue
    finally:
        settings = external()
settings.get("stale")
""",
        )
        for index, body in enumerate(alias_bodies):
            with self.subTest(body=body):
                path = f"finally_loop_alias_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)), ()
                )

    def test_discovery_applies_finally_to_return_and_raise_states(self):
        for index, terminal in enumerate(("return", "raise RuntimeError")):
            with self.subTest(terminal=terminal):
                path = f"finally_function_terminal_{index}.py"
                self.write_source(
                    path,
                    f'''def load(model_config):
    component = "dit"
    try:
        try:
            {terminal}
        finally:
            component = "vae"
    finally:
        model_config.model_kwargs.get(f"{{component}}_path")
''',
                )
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("vae_path",),
                )

        for index, terminal in enumerate(("return", "raise RuntimeError")):
            with self.subTest(terminal=f"alias-{terminal}"):
                path = f"finally_function_alias_{index}.py"
                self.write_source(
                    path,
                    f'''def load(model_config):
    settings = model_config.model_kwargs
    try:
        try:
            {terminal}
        finally:
            settings = external()
    finally:
        settings.get("stale")
''',
                )
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)), ()
                )

    def test_discovery_carries_match_guard_false_side_effects(self):
        bodies = (
            """component = "dit"
match external():
    case _ if (component := external()):
        pass
    case _:
        model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
match external():
    case _ if (settings := external()):
        pass
    case _:
        settings.get("stale")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"match_guard_side_effect_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_merges_short_circuit_expression_paths(self):
        expressions = (
            '(component := external()) and (component := "dit")',
            '(component := external()) or (component := "dit")',
        )
        for index, expression in enumerate(expressions):
            with self.subTest(expression=expression):
                path = f"short_circuit_value_{index}.py"
                self.write_source(
                    path,
                    f'''component = "vae"
{expression}
model_config.model_kwargs.get(f"{{component}}_path")
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        alias_expressions = (
            "(settings := external()) and "
            "(settings := model_config.model_kwargs)",
            "(settings := external()) or "
            "(settings := model_config.model_kwargs)",
        )
        for index, expression in enumerate(alias_expressions):
            with self.subTest(expression=expression):
                path = f"short_circuit_alias_{index}.py"
                self.write_source(
                    path,
                    "settings = model_config.model_kwargs\n"
                    f"{expression}\nsettings.get('stale')\n",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "branch-dependent configuration alias"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_merges_conditional_expression_paths(self):
        bodies = (
            """component = "vae"
(component := external()) if external() else (component := "dit")
model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
(settings := external()) if external() else (settings := model_config.model_kwargs)
settings.get("stale")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"conditional_expression_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_merges_comprehension_execution_paths(self):
        expressions = (
            '[(component := "dit") for ignored in external()]',
            '[(component := "dit") for ignored in ["once"] if external()]',
            '[(component := "dit") for first in ["once"] for second in external()]',
            '[((component := external()) and (component := "dit")) '
            'for ignored in ["once"]]',
            '[((component := external()) if external() else '
            '(component := "dit")) for ignored in ["once"]]',
        )
        for index, expression in enumerate(expressions):
            with self.subTest(expression=expression):
                path = f"comprehension_path_value_{index}.py"
                self.write_source(
                    path,
                    f'''component = {"external()" if index < 3 else '"vae"'}
{expression}
model_config.model_kwargs.get(f"{{component}}_path")
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "comprehension_path_alias.py",
            """settings = model_config.model_kwargs
[(settings := external()) for ignored in external()]
settings.get("stale")
""",
        )
        with self.assertRaisesRegex(
            DiscoveryError, "branch-dependent configuration alias"
        ):
            discover_python_settings(
                self.repository_root, ("comprehension_path_alias.py",)
            )

        self.write_source(
            "comprehension_nested_alias.py",
            """settings = model_config.model_kwargs
[((settings := external()) and (settings := model_config.model_kwargs))
 for ignored in ["once"]]
settings.get("stale")
""",
        )
        with self.assertRaisesRegex(
            DiscoveryError, "branch-dependent configuration alias"
        ):
            discover_python_settings(
                self.repository_root, ("comprehension_nested_alias.py",)
            )

    def test_discovery_tracks_intra_expression_try_prefixes(self):
        bodies = (
            """component = "dit"
try:
    consume((component := external()), risky(), (component := "dit"))
except RuntimeError:
    model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
try:
    consume((settings := external()), risky(), (settings := model_config.model_kwargs))
except RuntimeError:
    settings.get("stale")
""",
        )
        for index, body in enumerate(bodies):
            with self.subTest(body=body):
                path = f"expression_try_prefix_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_invalidates_recursive_destructuring_targets(self):
        invalid = (
            """component = "dit"
(component, other) = external()
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
[other, (component, *rest)] = external()
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(invalid):
            with self.subTest(body=body):
                path = f"destructure_dynamic_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "destructure_alias_dynamic.py",
            """settings = model_config.model_kwargs
(settings, other) = external()
settings.get("stale")
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("destructure_alias_dynamic.py",)
            ),
            (),
        )

        self.write_source(
            "destructure_finite.py",
            """(component, (settings, other)) = (
    "dit", (model_config.model_kwargs, external())
)
model_config.model_kwargs.get(f"{component}_path")
settings.get("rank")
""",
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root, ("destructure_finite.py",)
                )
            ),
            (("dit_path", "model_kwargs.get"), ("rank", "model_kwargs.get")),
        )

    def test_discovery_visits_specialized_call_children_once(self):
        self.write_source(
            "nested_specialized_reads.py",
            """import os
def load(kwargs, model_config, parser, loader):
    os.getenv("OUTER_ENV", os.environ.get("INNER_ENV", "fallback"))
    parser.add_argument("--steps", default=kwargs.get("inner_steps", 1))
    loader.get_conf("outer_conf", model_config.model_kwargs.get("inner_model", 2))
    kwargs.get("outer_kw", kwargs.get("inner_kw", 3))
    kwargs["bucket"]["leaf"]
""",
        )
        discovered = discover_python_settings(
            self.repository_root, ("nested_specialized_reads.py",)
        )
        self.assertEqual(
            tuple((fact.key, fact.read_kind) for fact in discovered),
            (
                ("INNER_ENV", "os.environ.get"),
                ("OUTER_ENV", "os.getenv"),
                ("bucket", "kwargs[]"),
                ("inner_kw", "kwargs.get"),
                ("inner_model", "model_kwargs.get"),
                ("inner_steps", "kwargs.get"),
                ("leaf", "kwargs[]"),
                ("outer_conf", "get_conf"),
                ("outer_kw", "kwargs.get"),
                ("steps", "argparse.add_argument"),
            ),
        )

        dynamic_bodies = (
            'os.getenv("OUTER", os.getenv(external()))',
            'parser.add_argument("--outer", default=os.getenv(external()))',
            'loader.get_config("outer", kwargs.get(external()))',
            'kwargs.get("outer", model_config.model_kwargs.get(external()))',
        )
        for index, expression in enumerate(dynamic_bodies):
            with self.subTest(expression=expression):
                path = f"nested_specialized_dynamic_{index}.py"
                self.write_source(
                    path,
                    "import os\n"
                    "def load(kwargs, model_config, parser, loader):\n"
                    f"    {expression}\n",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic .*key|dynamic configuration key"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_reads_augmented_assignment_targets(self):
        self.write_source(
            "augmented_reads.py",
            """def load(kwargs, model_config):
    kwargs["steps"] += 1
    self.config["retries"] |= 2
    model_config.model_kwargs["rank"] += 4
""",
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root, ("augmented_reads.py",)
                )
            ),
            (
                ("rank", "model_kwargs[]"),
                ("retries", "attribute[]"),
                ("steps", "kwargs[]"),
            ),
        )

    def test_discovery_indexes_reflective_method_uses(self):
        positive_calls = (
            'getattr(self, "resolve")("dit")',
            'self.__getattribute__("resolve")("dit")',
        )
        for index, expression in enumerate(positive_calls):
            with self.subTest(expression=expression):
                path = f"reflective_finite_{index}.py"
                self.write_source(
                    path,
                    f'''class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load(self):
        return {expression}
''',
                )
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("dit_path",),
                )

        unsafe_uses = (
            'getattr(self, method)("vae")',
            'callback = getattr(self, "resolve")',
            'callback = self.__getattribute__("resolve")',
            'register(getattr(self, "resolve"))',
            'getattr(factory(), "resolve")("vae")',
        )
        for index, statement in enumerate(unsafe_uses):
            with self.subTest(statement=statement):
                path = f"reflective_unsafe_{index}.py"
                self.write_source(
                    path,
                    f'''class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load(self, method=None):
        self.resolve("dit")
        {statement}
''',
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic parameter call site"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_limits_accessor_body_suppression(self):
        malicious = (
            """def get_config(config, key):
    return config[key]
""",
            """class Evil:
    def get_conf(self, key):
        return self.config[key]
""",
        )
        for index, body in enumerate(malicious):
            with self.subTest(body=body):
                path = f"malicious_accessor_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration key"
                ):
                    discover_python_settings(self.repository_root, (path,))

        approved = """import os
class BaseJob:
    def get_conf(self, key, default=None, required=False):
        self.config.get(key, os.getenv("ACCESSOR_DEFAULT"))
        if key in self.config:
            return self.config[key]
        return default
    def load(self):
        return self.get_conf("steps", 1)
"""
        self.write_source("jobs/BaseJob.py", approved)
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root, ("jobs/BaseJob.py",)
                )
            ),
            (("ACCESSOR_DEFAULT", "os.getenv"), ("steps", "get_conf")),
        )

        mutations = (
            approved.replace(
                "return self.config[key]",
                "return self.config[external()]",
            ),
            approved.replace(
                'return self.get_conf("steps", 1)',
                'callback = self.get_conf\n        return self.get_conf("steps", 1)',
            ),
        )
        for index, body in enumerate(mutations):
            with self.subTest(index=index):
                self.write_source("jobs/BaseJob.py", body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration key|dynamic parameter call site",
                ):
                    discover_python_settings(
                        self.repository_root, ("jobs/BaseJob.py",)
                    )

    def test_discovery_captures_destructuring_rhs_before_binding(self):
        self.write_source(
            "destructure_swap.py",
            """component = external()
fallback = "dit"
component, fallback = fallback, component
model_config.model_kwargs.get(f"{fallback}_path")
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
            discover_python_settings(self.repository_root, ("destructure_swap.py",))

        self.write_source(
            "destructure_alias_swap.py",
            """settings = external()
fallback = model_config.model_kwargs
settings, fallback = fallback, settings
fallback.get("stale")
""",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("destructure_alias_swap.py",)
            ),
            (),
        )

    def test_discovery_models_chained_compare_and_assert_flow(self):
        chained = (
            """component = "vae"
(component := external()) < risky() < (component := "dit")
model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
(settings := external()) < risky() < (settings := model_config.model_kwargs)
settings.get("stale")
""",
        )
        for index, body in enumerate(chained):
            with self.subTest(kind=f"compare-{index}"):
                path = f"chained_compare_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration|branch-dependent configuration alias",
                ):
                    discover_python_settings(self.repository_root, (path,))

        assert_bodies = (
            """component = "dit"
assert external(), (component := external())
model_config.model_kwargs.get(f"{component}_path")
""",
            """settings = model_config.model_kwargs
assert external(), (settings := external())
settings.get("stale")
""",
        )
        expected = (("dit_path", "model_kwargs.get"), ("stale", "model_kwargs.get"))
        for index, body in enumerate(assert_bodies):
            with self.subTest(kind=f"assert-{index}"):
                path = f"assert_message_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    tuple(
                        (fact.key, fact.read_kind)
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    (expected[index],),
                )

    def test_discovery_resolves_argparse_dest_in_evaluation_order(self):
        self.write_source(
            "argparse_evaluation_order.py",
            """destination = external()
parser.add_argument(
    "--fallback",
    default=(destination := "chosen"),
    dest=destination,
)
""",
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind, fact.default_expression)
                for fact in discover_python_settings(
                    self.repository_root, ("argparse_evaluation_order.py",)
                )
            ),
            (("chosen", "argparse.add_argument", "(destination := 'chosen')"),),
        )

    def test_discovery_visits_non_sentinel_network_spreads(self):
        self.write_source(
            "network_spread_children.py",
            """class Known:
    def __init__(self, rate=1):
        self.rate = rate

def build(network_kwargs, kwargs):
    return Known(
        **network_kwargs,
        **kwargs.get(external()),
    )
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic configuration key"):
            discover_python_settings(
                self.repository_root, ("network_spread_children.py",)
            )

    def test_discovery_indexes_extended_reflective_method_forms(self):
        positive = (
            'getattr(self, "resolve", None)("dit")',
            'builtins.getattr(self, "resolve")("dit")',
            'object.__getattribute__(self, "resolve")("dit")',
        )
        for index, expression in enumerate(positive):
            with self.subTest(expression=expression):
                path = f"extended_reflective_{index}.py"
                self.write_source(
                    path,
                    f"""import builtins
class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load(self):
        return {expression}
""",
                )
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("dit_path",),
                )

        ambiguous = (
            "lookup = getattr\n        lookup(self, 'resolve')('vae')",
            "lookup = builtins.getattr\n        lookup(self, 'resolve')('vae')",
            "getattr(self, method, None)('vae')",
            "getattr(other, 'resolve', None)('vae')",
            "object.__getattribute__(other, 'resolve')('vae')",
        )
        for index, statements in enumerate(ambiguous):
            with self.subTest(statements=statements):
                path = f"ambiguous_reflective_{index}.py"
                self.write_source(
                    path,
                    f"""import builtins
class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load(self, method=None, other=None):
        self.resolve("dit")
        {statements}
""",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic parameter call site"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_accessor_key_and_alias_mutations(self):
        base = """class BaseJob:
    def get_conf(self, key, default=None):
        BODY
    def load(self):
        return self.get_conf("steps", 1)
"""
        rejecting = (
            "key = external()\n        return self.config[key]",
            "key, other = external()\n        return self.config[key]",
            "alias = external()\n        return self.config[alias]",
        )
        for index, body in enumerate(rejecting):
            with self.subTest(body=body):
                self.write_source("jobs/BaseJob.py", base.replace("BODY", body))
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration key"
                ):
                    discover_python_settings(self.repository_root, ("jobs/BaseJob.py",))

        self.write_source(
            "jobs/BaseJob.py",
            base.replace(
                "BODY",
                "cfg = self.config\n        return cfg[key]",
            ),
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root, ("jobs/BaseJob.py",)
                )
            ),
            (("steps", "attribute[]"), ("steps", "get_conf")),
        )

    def test_discovery_routes_global_and_nonlocal_bindings(self):
        dynamic = (
            """def outer(model_config):
    component = "dit"
    def mutate():
        nonlocal component
        component = external()
    mutate()
    return model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
def mutate():
    global component
    component = external()
mutate()
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(dynamic):
            with self.subTest(index=index):
                path = f"outer_binding_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "outer_binding_safe.py",
            """def outer(model_config):
    component = "dit"
    unrelated = "vae"
    def mutate():
        nonlocal unrelated
        unrelated = external()
    mutate()
    return model_config.model_kwargs.get(f"{component}_path")
""",
        )
        self.assertEqual(
            tuple(
                fact.key
                for fact in discover_python_settings(
                    self.repository_root, ("outer_binding_safe.py",)
                )
            ),
            ("dit_path",),
        )

        lexical_boundaries = (
            """component = "dit"
def outer():
    global component
    def inner():
        component = external()
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
def outer():
    global component
    class Inner:
        component = external()
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(lexical_boundaries):
            with self.subTest(boundary=index):
                path = f"outer_binding_boundary_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("dit_path",),
                )

    def test_discovery_preserves_unpack_element_evaluation_states(self):
        cases = (
            """component = external()
first, second = component, (component := "dit")
model_config.model_kwargs.get(f"{first}_path")
""",
            """component = external()
first, (second, third) = component, ("vae", (component := "dit"))
model_config.model_kwargs.get(f"{first}_path")
""",
            """component = external()
first, *middle, last = "dit", component, (component := "vae")
for item in middle:
    model_config.model_kwargs.get(f"{item}_path")
""",
        )
        for index, body in enumerate(cases):
            with self.subTest(index=index):
                path = f"unpack_evaluation_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "unpack_evaluation_positive.py",
            """component = external()
first, second = component, (component := "dit")
model_config.model_kwargs.get(f"{second}_path")
""",
        )
        self.assertEqual(
            tuple(
                fact.key
                for fact in discover_python_settings(
                    self.repository_root,
                    ("unpack_evaluation_positive.py",),
                )
            ),
            ("dit_path",),
        )

    def test_discovery_proves_accessor_derived_keys_in_source_order(self):
        template = """class BaseJob:
    def get_conf(self, key, default=None):
        BODY
    def load(self):
        return self.get_conf("steps", 1)
"""
        bodies = (
            "keys = key.split('.')\n        keys = external()\n        for subkey in keys:\n            return self.config[subkey]",
            "keys = key.split('.')\n        del keys\n        for subkey in keys:\n            return self.config[subkey]",
            "if external():\n            keys = key.split('.')\n        for subkey in keys:\n            return self.config[subkey]",
            "keys = key.split('.')\n        aliases = keys\n        keys = aliases\n        for subkey in keys:\n            return self.config[subkey]",
            "keys = key.split('.')\n        aliases = keys\n        for subkey in keys:\n            return self.config[subkey]",
            "return self.config[subkey]\n        keys = key.split('.')\n        for subkey in keys:\n            return self.config[subkey]",
        )
        for index, body in enumerate(bodies):
            with self.subTest(index=index):
                self.write_source(
                    "jobs/BaseJob.py", template.replace("BODY", body)
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration key"
                ):
                    discover_python_settings(
                        self.repository_root, ("jobs/BaseJob.py",)
                    )

    def test_discovery_visits_store_and_delete_target_expressions(self):
        self.write_source(
            "dynamic_store_target.py",
            "sink[kwargs.get(external_key())] = 1\n",
        )
        with self.assertRaisesRegex(
            DiscoveryError, "dynamic configuration key"
        ):
            discover_python_settings(
                self.repository_root, ("dynamic_store_target.py",)
            )

        surfaces = (
            (
                "delete_target.py",
                "del sink[kwargs.get('delete_slot')]\n",
                "delete_slot",
            ),
            (
                "with_target.py",
                "with manager() as sink[kwargs.get('with_slot')]:\n    pass\n",
                "with_slot",
            ),
            (
                "loop_target.py",
                "for sink[kwargs.get('loop_slot')] in values:\n    pass\n",
                "loop_slot",
            ),
            (
                "attribute_store_target.py",
                "sink_factory(kwargs.get('base_slot')).value = 1\n",
                "base_slot",
            ),
        )
        for path, body, key in surfaces:
            with self.subTest(path=path):
                self.write_source(path, body)
                self.assertEqual(
                    tuple(
                        (fact.key, fact.read_kind)
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ((key, "kwargs.get"),),
                )

        self.write_source(
            "empty_loop_target.py",
            "for sink[kwargs.get('never')] in ():\n    pass\n",
        )
        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("empty_loop_target.py",)
            ),
            (),
        )

    def test_discovery_evaluates_get_conf_receiver_before_key(self):
        self.write_source(
            "get_conf_evaluation_order.py",
            """key = "steps"
providers[(key := external_key())].get_conf(key)
""",
        )
        with self.assertRaisesRegex(
            DiscoveryError, "dynamic configuration key"
        ):
            discover_python_settings(
                self.repository_root, ("get_conf_evaluation_order.py",)
            )

    def test_discovery_indexes_reflective_identity_binders(self):
        binders = (
            "from builtins import getattr as lookup\n        lookup(self, 'resolve')('vae')",
            "lookup: object = getattr\n        lookup(self, 'resolve')('vae')",
            "lookup(self, 'resolve')('vae')",
            "getattr(self, 'resolve')('vae')",
        )
        signatures = (
            "self",
            "self",
            "self, lookup=getattr",
            "self, getattr=external",
        )
        for index, (statements, signature) in enumerate(
            zip(binders, signatures)
        ):
            with self.subTest(index=index):
                path = f"reflective_identity_binder_{index}.py"
                self.write_source(
                    path,
                    f"""class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load({signature}):
        self.resolve("dit")
        {statements}
""",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic parameter call site"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_precomputes_nonlocal_owners_and_closure_effects(self):
        self.write_source(
            "late_nonlocal_owner.py",
            """def outer(model_config):
    component = "vae"
    def middle():
        def mutate():
            nonlocal component
            component = external()
        component = "dit"
        mutate()
        return model_config.model_kwargs.get(f"{component}_path")
    return middle()
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic configuration"):
            discover_python_settings(
                self.repository_root, ("late_nonlocal_owner.py",)
            )

        safe_controls = (
            """def outer(model_config):
    component = "dit"
    unrelated = "vae"
    def inspect():
        nonlocal component
        return component
    inspect()
    return model_config.model_kwargs.get(f"{component}_path")
""",
            """def outer(model_config):
    component = "dit"
    unrelated = "vae"
    def mutate():
        nonlocal unrelated
        unrelated = external()
    mutate()
    return model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(safe_controls):
            with self.subTest(control=index):
                path = f"safe_closure_{index}.py"
                self.write_source(path, body)
                self.assertEqual(
                    tuple(
                        fact.key
                        for fact in discover_python_settings(
                            self.repository_root, (path,)
                        )
                    ),
                    ("dit_path",),
                )

    def test_discovery_interleaves_target_stores_and_loop_iterations(self):
        target_cases = (
            """component = external()
(component, sink[(component := external())]) = ("dit", 1)
model_config.model_kwargs.get(f"{component}_path")
""",
            """component = external()
(component, factory(component := external()).value) = ("dit", 1)
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(target_cases):
            with self.subTest(target=index):
                path = f"interleaved_target_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "loop_target_iterations.py",
            """key = "first"
for sink[kwargs.get(key)] in values:
    key = "second"
""",
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root, ("loop_target_iterations.py",)
                )
            ),
            (("first", "kwargs.get"), ("second", "kwargs.get")),
        )

    def test_discovery_rejects_accessor_collection_mutation_and_escape(self):
        template = """class BaseProcess:
    def get_conf(self, key, default=None):
        keys = key.split('.')
        ACTION
        value = self.config
        for subkey in keys:
            if subkey in value:
                value = value[subkey]
        return value
    def load(self):
        return self.get_conf("steps", 1)
"""
        rejecting = (
            "keys.append(external())",
            "keys[0] = external()",
            "keys += external()",
            "consume(keys)",
            "del keys[0]",
        )
        for index, action in enumerate(rejecting):
            with self.subTest(action=action):
                self.write_source(
                    "jobs/process/BaseProcess.py",
                    template.replace("ACTION", action),
                )
                with self.assertRaisesRegex(
                    DiscoveryError,
                    "dynamic configuration key|conditional configuration alias reassignment",
                ):
                    discover_python_settings(
                        self.repository_root,
                        ("jobs/process/BaseProcess.py",),
                    )

        self.write_source(
            "jobs/process/BaseProcess.py",
            """class BaseProcess:
    def get_conf(self, key, default=None):
        keys = key.split('.')
        value = self.config
        for subkey in keys:
            keys.append(external())
            if subkey in value:
                value = value[subkey]
        return value
    def load(self):
        return self.get_conf("steps", 1)
""",
        )
        with self.assertRaisesRegex(
            DiscoveryError,
            "dynamic configuration key|conditional configuration alias reassignment",
        ):
            discover_python_settings(
                self.repository_root,
                ("jobs/process/BaseProcess.py",),
            )

        self.write_source(
            "jobs/process/BaseProcess.py",
            template.replace("ACTION", "size = len(keys)\n        if keys:\n            pass"),
        )
        self.assertEqual(
            tuple(
                (fact.key, fact.read_kind)
                for fact in discover_python_settings(
                    self.repository_root,
                    ("jobs/process/BaseProcess.py",),
                )
            ),
            (("steps", "get_conf"),),
        )

    def test_discovery_propagates_reflective_alias_chains(self):
        chains = (
            "lookup = getattr\n        again = lookup\n        again(self, 'resolve')('vae')",
            "lookup = getattr\n        middle = lookup\n        again = middle\n        again(self, 'resolve')('vae')",
            "lookup = getattr\n        again = lookup\n        again = external\n        again(self, 'resolve')('vae')",
            "lookup: object = getattr\n        again: object = lookup\n        again(self, 'resolve')('vae')",
        )
        for index, statements in enumerate(chains):
            with self.subTest(chain=index):
                path = f"reflective_alias_chain_{index}.py"
                self.write_source(
                    path,
                    f"""class Loader:
    def resolve(self, component):
        return model_config.model_kwargs.get(f"{{component}}_path")
    def load(self):
        self.resolve("dit")
        {statements}
""",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic parameter call site"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_routes_class_global_and_nonlocal_bindings(self):
        dynamic = (
            """def outer(model_config):
    component = "dit"
    class Inner:
        nonlocal component
        component = external()
    return model_config.model_kwargs.get(f"{component}_path")
""",
            """component = "dit"
class Inner:
    global component
    component = external()
model_config.model_kwargs.get(f"{component}_path")
""",
        )
        for index, body in enumerate(dynamic):
            with self.subTest(dynamic=index):
                path = f"class_declaration_{index}.py"
                self.write_source(path, body)
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic configuration"
                ):
                    discover_python_settings(self.repository_root, (path,))

        self.write_source(
            "class_declaration_safe.py",
            """def outer(model_config):
    component = "dit"
    class Inner:
        component = external()
    return model_config.model_kwargs.get(f"{component}_path")
""",
        )
        self.assertEqual(
            tuple(
                fact.key
                for fact in discover_python_settings(
                    self.repository_root, ("class_declaration_safe.py",)
                )
            ),
            ("dit_path",),
        )

    def test_discovery_supports_unconventional_bound_receiver_names(self):
        for index, signature in enumerate(("this", "this, /")):
            with self.subTest(signature=signature):
                path = f"unconventional_receiver_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load("""
                    + signature
                    + '):\n        return this.resolve("vae")\n',
                )
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)),
                    (
                        DiscoveredSetting(
                            path,
                            "Resolver.resolve",
                            3,
                            "vae_path",
                            "model_kwargs.get",
                            "model",
                            "None",
                        ),
                    ),
                )

    def test_discovery_rejects_decorated_parameter_consumer_rewrites(self):
        path = "decorated_consumer_rewrite.py"
        undecorated = """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return self.resolve("dit")
"""
        self.write_source(path, undecorated)
        self.assertEqual(
            discover_python_settings(self.repository_root, (path,)),
            (
                DiscoveredSetting(
                    path,
                    "Resolver.resolve",
                    3,
                    "dit_path",
                    "model_kwargs.get",
                    "model",
                    "None",
                ),
            ),
        )

        self.write_source(
            path,
            undecorated.replace(
                "    def resolve", "    @identity\n    def resolve"
            ),
        )
        with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
            discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_ineligible_parameter_consumers(self):
        consumer_definitions = (
            """    @benign
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
            """    async def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
            """    def resolve(self, component):
        yield component
        return self.model_config.model_kwargs.get(f"{component}_path", None)
""",
        )
        for index, consumer_definition in enumerate(consumer_definitions):
            with self.subTest(consumer_definition=consumer_definition):
                path = f"ineligible_consumer_{index}.py"
                self.write_source(
                    path,
                    "class Resolver:\n"
                    + consumer_definition
                    + """
    def load(self):
        return self.resolve("dit")
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_escaping_finite_producer_methods(self):
        escaping_statements = (
            "callback = self.resolve",
            "register(self.resolve)",
            "callbacks = [self.resolve]",
        )
        for index, escaping_statement in enumerate(escaping_statements):
            with self.subTest(escaping_statement=escaping_statement):
                path = f"escaping_method_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        self.resolve("dit")
        """
                    + escaping_statement
                    + "\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_binds_omitted_finite_parameter_defaults(self):
        for call in ("self.resolve()", 'self.resolve(**{})'):
            with self.subTest(call=call):
                self.write_source(
                    "finite_default.py",
                    """class Resolver:
    def resolve(self, component="dit"):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        return """
                    + call
                    + "\n",
                )
                self.assertEqual(
                    discover_python_settings(
                        self.repository_root, ("finite_default.py",)
                    ),
                    (
                        DiscoveredSetting(
                            "finite_default.py",
                            "Resolver.resolve",
                            3,
                            "dit_path",
                            "model_kwargs.get",
                            "model",
                            "None",
                        ),
                    ),
                )

    def test_discovery_rejects_omitted_nonfinite_parameter_defaults(self):
        for call in ("self.resolve()", 'self.resolve(**{})'):
            with self.subTest(call=call):
                self.write_source(
                    "dynamic_default.py",
                    """class Resolver:
    def resolve(self, component=default_component()):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def load(self):
        self.resolve("dit")
        return """
                    + call
                    + "\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(
                        self.repository_root, ("dynamic_default.py",)
                    )

    def test_discovery_rejects_formatted_fstring_configuration_keys(self):
        formatted_keys = (
            'f"{component!r}_path"',
            'f"{component!s}_path"',
            'f"{component:>8}_path"',
            'f"{component:{width}}_path"',
        )
        for index, formatted_key in enumerate(formatted_keys):
            with self.subTest(formatted_key=formatted_key):
                path = f"formatted_key_{index}.py"
                self.write_source(
                    path,
                    """def load(model_config, width):
    mkw = model_config.model_kwargs
    for component in ("dit", "vae"):
        mkw.get("""
                    + formatted_key
                    + ", None)\n",
                )
                with self.assertRaisesRegex(DiscoveryError, "dynamic"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_non_dominating_finite_return_guards(self):
        producer_bodies = (
            """        if component in ("dit", "vae"):
            pass
        return component
""",
            """        if component not in ("dit", "vae"):
            component = normalize(component)
        return component
""",
            """        if enabled():
            if component not in ("dit", "vae"):
                raise ValueError(component)
        return component
""",
        )
        for index, producer_body in enumerate(producer_bodies):
            with self.subTest(producer_body=producer_body):
                path = f"non_dominating_guard_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

    def component(self):
        component = input()
"""
                    + producer_body
                    + """
    def load(self):
        return self.resolve(self.component())
""",
                )

                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_ineligible_finite_value_producers(self):
        producer_definitions = (
            """    async def component(self):
        component = input()
        if component not in ("dit", "vae"):
            raise ValueError(component)
        return component
""",
            """    def component(self):
        component = input()
        if component not in ("dit", "vae"):
            raise ValueError(component)
        yield None
        return component
""",
            """    @classmethod
    def component(self):
        component = input()
        if component not in ("dit", "vae"):
            raise ValueError(component)
        return component
""",
        )
        for index, producer_definition in enumerate(producer_definitions):
            with self.subTest(producer_definition=producer_definition):
                path = f"ineligible_producer_{index}.py"
                self.write_source(
                    path,
                    """class Resolver:
    def resolve(self, component):
        return self.model_config.model_kwargs.get(f"{component}_path", None)

"""
                    + producer_definition
                    + """
    def load(self):
        return self.resolve(self.component())
""",
                )

                with self.assertRaisesRegex(DiscoveryError, "dynamic.*call site"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_fails_closed_on_unresolved_dynamic_configuration_key(self):
        self.write_source(
            "dynamic.py",
            """def load(kwargs, prefix):
    return kwargs.get(prefix + "_size", 512)
""",
        )

        with self.assertRaisesRegex(
            DiscoveryError, "dynamic[.]py.*load.*line 2.*dynamic"
        ):
            discover_python_settings(self.repository_root, ("dynamic.py",))

    def test_discovery_catalogs_accessor_calls_not_dynamic_accessor_internals(self):
        self.write_source(
            "jobs/BaseJob.py",
            """class BaseJob:
    def __init__(self):
        self.steps = self.get_conf("steps", 3000)

    def get_conf(self, key, default=None):
        self.config.get(key)
        return self.config[key]
""",
        )

        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("jobs/BaseJob.py",)
            ),
            (
                DiscoveredSetting(
                    "jobs/BaseJob.py", "BaseJob.__init__", 3, "steps",
                    "get_conf", "core", "3000",
                ),
            ),
        )

    def test_discovery_rejects_generic_dynamic_environment_keys(self):
        cases = (
            "return os.getenv(name)",
            "return os.environ.get(name)",
            "return os.environ[name]",
        )
        for index, statement in enumerate(cases):
            with self.subTest(statement=statement):
                path = f"dynamic_environment_{index}.py"
                self.write_source(path, f"def read(name):\n    {statement}\n")
                with self.assertRaisesRegex(
                    DiscoveryError, "dynamic environment key"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_has_one_exact_dynamic_environment_expansion_sentinel(self):
        source = """def replace_env_vars_in_string(value):
    def replacer(name):
        return os.environ.get(name)
    return replacer(value)
"""
        self.write_source("toolkit/config.py", source)

        self.assertEqual(
            discover_python_settings(self.repository_root, ("toolkit/config.py",)),
            (
                DiscoveredSetting(
                    "toolkit/config.py", "replace_env_vars_in_string.replacer",
                    3, "<dynamic-environment-name>",
                    "os.environ.get.dynamic", "environment", None,
                ),
            ),
        )

        self.write_source("other.py", source)
        with self.assertRaisesRegex(DiscoveryError, "dynamic environment key"):
            discover_python_settings(self.repository_root, ("other.py",))

    def test_discovery_recognizes_literal_environment_reads_through_os_alias(self):
        self.write_source(
            "environment_alias.py",
            """import os as _os
def read():
    _os.environ.get("DEBUG_MEM", "0")
    _os.getenv("TOKEN", None)
    _os.environ["RANK"]
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("environment_alias.py",)),
            (
                DiscoveredSetting(
                    "environment_alias.py", "read", 3, "DEBUG_MEM",
                    "os.environ.get", "environment", "'0'",
                ),
                DiscoveredSetting(
                    "environment_alias.py", "read", 5, "RANK",
                    "os.environ[]", "environment", None,
                ),
                DiscoveredSetting(
                    "environment_alias.py", "read", 4, "TOKEN",
                    "os.getenv", "environment", "None",
                ),
            ),
        )

    def test_discovery_emits_membership_and_every_nested_subscript_key(self):
        self.write_source(
            "nested.py",
            """def preprocess(config):
    if "job" not in config:
        raise ValueError("missing job")
    if "name" not in config["config"]:
        raise ValueError("missing name")
    return config["config"]["name"]
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("nested.py",)),
            (
                DiscoveredSetting(
                    "nested.py", "preprocess", 4, "config", "attribute[]",
                    "core", None,
                ),
                DiscoveredSetting(
                    "nested.py", "preprocess", 2, "job", "attribute.contains",
                    "core", None,
                ),
                DiscoveredSetting(
                    "nested.py", "preprocess", 4, "name", "attribute.contains",
                    "core", None,
                ),
                DiscoveredSetting(
                    "nested.py", "preprocess", 6, "name", "attribute[]",
                    "core", None,
                ),
            ),
        )

    def test_discovery_does_not_treat_third_party_object_config_as_job_config(self):
        self.write_source(
            "runtime.py",
            """def dimension(sd, index):
    return sd.unet.config["block_out_channels"][index]
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("runtime.py",)),
            (),
        )

    def test_discovery_closes_finite_network_kwargs_dispatch(self):
        self.write_source(
            "network.py",
            """class NetworkMixin:
    def __init__(self, mixin_rate=0.5, multiplier=2.0):
        self.mixin_rate = mixin_rate

class FirstNetwork(NetworkMixin):
    def __init__(self, linear=4, alpha=1, multiplier=1.0, **kwargs):
        super().__init__(**kwargs)

class SecondNetwork:
    def __init__(self, dropout=None, alpha=1, multiplier=1.0):
        self.dropout = dropout

def build(kind, network_kwargs):
    NetworkClass = FirstNetwork
    if kind == "second":
        NetworkClass = SecondNetwork
    return NetworkClass(7, alpha=8, multiplier=1.0, **network_kwargs)
""",
        )

        discovered = discover_python_settings(
            self.repository_root, ("network.py",)
        )

        self.assertEqual(
            discovered,
            (
                DiscoveredSetting(
                    "network.py", "FirstNetwork.__init__", 6, "alpha",
                    "network_kwargs.reserved", "network", "1",
                ),
                DiscoveredSetting(
                    "network.py", "FirstNetwork.__init__", 6, "linear",
                    "network_kwargs.reserved", "network", "4",
                ),
                DiscoveredSetting(
                    "network.py", "FirstNetwork.__init__", 6, "multiplier",
                    "network_kwargs.reserved", "network", "1.0",
                ),
                DiscoveredSetting(
                    "network.py", "NetworkMixin.__init__", 2, "mixin_rate",
                    "network_kwargs.forwarded", "network", "0.5",
                ),
                DiscoveredSetting(
                    "network.py", "NetworkMixin.__init__", 2, "multiplier",
                    "network_kwargs.reserved", "network", "2.0",
                ),
                DiscoveredSetting(
                    "network.py", "SecondNetwork.__init__", 10, "alpha",
                    "network_kwargs.reserved", "network", "1",
                ),
                DiscoveredSetting(
                    "network.py", "SecondNetwork.__init__", 10, "dropout",
                    "network_kwargs.reserved", "network", "None",
                ),
                DiscoveredSetting(
                    "network.py", "SecondNetwork.__init__", 10, "multiplier",
                    "network_kwargs.reserved", "network", "1.0",
                ),
            ),
        )

    def test_discovery_rejects_dynamic_dispatch_and_unconstrained_forwarding(self):
        cases = (
            (
                "dynamic_target.py",
                """def build(factory, network_kwargs):
    return factory(explicit=True, **network_kwargs)
""",
                "dynamic.*target",
            ),
            (
                "open_sink.py",
                """class OpenNetwork:
    def __init__(self, **kwargs):
        self.kwargs = kwargs

def build(network_kwargs):
    return OpenNetwork(**network_kwargs)
""",
                "unconstrained.*kwargs",
            ),
            (
                "mixed_target.py",
                """class KnownNetwork:
    def __init__(self, alpha=1):
        self.alpha = alpha

def build(factory, network_kwargs):
    NetworkClass = KnownNetwork
    if factory:
        NetworkClass = factory()
    return NetworkClass(**network_kwargs)
""",
                "dynamic.*target",
            ),
            (
                "starred_positionals.py",
                """class KnownNetwork:
    def __init__(self, alpha=1):
        self.alpha = alpha

def build(args, network_kwargs):
    return KnownNetwork(*args, **network_kwargs)
""",
                "dynamic positional",
            ),
        )
        for path, source, message in cases:
            with self.subTest(path=path):
                self.write_source(path, source)
                with self.assertRaisesRegex(DiscoveryError, message):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_allows_known_forwarding_to_an_unused_terminal_kwargs_sink(self):
        self.write_source(
            "terminal_sink.py",
            """class TerminalMixin:
    def __init__(self, rate=0.5, **kwargs):
        self.rate = rate

class Wrapper(TerminalMixin):
    def __init__(self, alpha=1, **kwargs):
        super().__init__(**kwargs)

def build(network_kwargs):
    return Wrapper(**network_kwargs)
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("terminal_sink.py",)),
            (
                DiscoveredSetting(
                    "terminal_sink.py", "TerminalMixin.__init__", 2, "rate",
                    "network_kwargs.forwarded", "network", "0.5",
                ),
                DiscoveredSetting(
                    "terminal_sink.py", "Wrapper.__init__", 6, "alpha",
                    "network_kwargs.accepted", "network", "1",
                ),
            ),
        )

        self.write_source(
            "terminal_sink.py",
            """class TerminalMixin:
    def __init__(self, rate=0.5, **kwargs):
        self.rate = rate
        self.kwargs = kwargs

class Wrapper(TerminalMixin):
    def __init__(self, alpha=1, **kwargs):
        super().__init__(**kwargs)

def build(network_kwargs):
    return Wrapper(**network_kwargs)
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "unconstrained.*kwargs"):
            discover_python_settings(self.repository_root, ("terminal_sink.py",))

        self.write_source(
            "terminal_sink.py",
            """class TerminalMixin:
    def __init__(self, rate=0.5):
        self.rate = rate

class Wrapper(TerminalMixin):
    def __init__(self, alpha=1, **kwargs):
        kwargs.pop("secret", None)
        super().__init__(**kwargs)

def build(network_kwargs):
    return Wrapper(**network_kwargs)
""",
        )
        with self.assertRaisesRegex(DiscoveryError, "consumed.*kwargs"):
            discover_python_settings(self.repository_root, ("terminal_sink.py",))

    def test_discovery_rejects_reserved_key_reads_from_forwarded_kwargs(self):
        for method in ("get", "pop"):
            with self.subTest(method=method):
                self.write_source(
                    "reserved_consumption.py",
                    f"""class TerminalMixin:
    def __init__(self):
        pass

class Wrapper(TerminalMixin):
    def __init__(self, reserved=None, **kwargs):
        super().__init__(**kwargs)
        kwargs.{method}("reserved", None)

def build(network_kwargs):
    return Wrapper(reserved=True, **network_kwargs)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "consumed.*kwargs"):
                    discover_python_settings(
                        self.repository_root, ("reserved_consumption.py",)
                    )

    def test_discovery_classifies_edge_reserved_forwarded_kwargs_reads(self):
        self.write_source(
            "edge_reserved_consumption.py",
            """class TerminalMixin:
    def __init__(self):
        pass

class Wrapper(TerminalMixin):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.network_config = kwargs.get("network_config", None)

def build(network_kwargs):
    return Wrapper(network_config=object(), **network_kwargs)
""",
        )

        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("edge_reserved_consumption.py",)
            ),
            (
                DiscoveredSetting(
                    "edge_reserved_consumption.py",
                    "Wrapper.__init__",
                    6,
                    "network_config",
                    "network_kwargs.reserved",
                    "network",
                    "None",
                ),
            ),
        )

    def test_discovery_rejects_non_dominating_reserved_kwargs_forwarding(self):
        constructor_bodies = (
            """        if False:
            super().__init__(**kwargs)
        self.network_config = kwargs.get("network_config", None)
""",
            """        if enabled:
            super().__init__(**kwargs)
        self.network_config = kwargs.get("network_config", None)
""",
            """        def forward_later():
            super().__init__(**kwargs)
        self.network_config = kwargs.get("network_config", None)
""",
            """        self.network_config = kwargs.get("network_config", None)
        super().__init__(**kwargs)
""",
            """        return
        super().__init__(**kwargs)
        self.network_config = kwargs.get("network_config", None)
""",
        )
        for index, constructor_body in enumerate(constructor_bodies):
            with self.subTest(constructor_body=constructor_body):
                path = f"non_dominating_forward_{index}.py"
                self.write_source(
                    path,
                    """class TerminalMixin:
    def __init__(self):
        pass

class Wrapper(TerminalMixin):
    def __init__(self, enabled=False, **kwargs):
"""
                    + constructor_body
                    + """
def build(network_kwargs):
    return Wrapper(network_config=object(), **network_kwargs)
""",
                )
                with self.assertRaisesRegex(DiscoveryError, "kwargs"):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_rejects_conditional_config_alias_reassignment(self):
        control_flows = (
            """    for item in items:
        mkw = {}
""",
            """    for mkw in items:
        pass
""",
            """    while ready():
        mkw = {}
""",
            """    try:
        operate()
    except Exception:
        mkw = {}
""",
            """    match token:
        case "reset":
            mkw = {}
""",
        )
        for index, control_flow in enumerate(control_flows):
            with self.subTest(control_flow=control_flow):
                path = f"conditional_alias_{index}.py"
                self.write_source(
                    path,
                    """def load(model_config, items, token):
    mkw = model_config.model_kwargs
"""
                    + control_flow
                    + """    return mkw.get("critical", 1)
""",
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "conditional configuration alias"
                ):
                    discover_python_settings(self.repository_root, (path,))

    def test_discovery_merges_try_and_match_alias_introductions(self):
        control_flows = (
            """    try:
        mkw = model_config.model_kwargs
    except Exception:
        mkw = {}
""",
            """    try:
        mkw = {}
    except Exception:
        mkw = model_config.model_kwargs
""",
            """    match token:
        case "config":
            mkw = model_config.model_kwargs
        case _:
            mkw = {}
""",
            """    match token:
        case "empty":
            mkw = {}
        case _:
            mkw = model_config.model_kwargs
""",
        )
        for index, control_flow in enumerate(control_flows):
            with self.subTest(control_flow=control_flow):
                path = f"introduced_alias_{index}.py"
                self.write_source(
                    path,
                    """def load(model_config, token):
"""
                    + control_flow
                    + """    return mkw.get("critical", 1)
""",
                )
                self.assertEqual(
                    discover_python_settings(self.repository_root, (path,)),
                    (
                        DiscoveredSetting(
                            path,
                            "load",
                            len(control_flow.splitlines()) + 2,
                            "critical",
                            "model_kwargs.get",
                            "model",
                            "1",
                        ),
                    ),
                )

    def test_discovery_fails_on_branch_dependent_configuration_alias(self):
        self.write_source(
            "branch_alias.py",
            """class Model:
    def load(self, flag):
        mkw = self.model_config.model_kwargs
        if flag:
            mkw = {}
        return mkw.get("critical", False)
""",
        )

        with self.assertRaisesRegex(DiscoveryError, "branch-dependent.*alias"):
            discover_python_settings(self.repository_root, ("branch_alias.py",))

    def test_discovery_propagates_config_map_ownership_through_enumerate(self):
        self.write_source(
            "processes.py",
            """class Loader:
    def load(self):
        for index, process in enumerate(self.config["process"]):
            if "type" not in process:
                raise ValueError("missing type")
            process["type"]
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("processes.py",)),
            (
                DiscoveredSetting(
                    "processes.py", "Loader.load", 3, "process", "attribute[]",
                    "core", None,
                ),
                DiscoveredSetting(
                    "processes.py", "Loader.load", 4, "type",
                    "attribute.contains", "core", None,
                ),
                DiscoveredSetting(
                    "processes.py", "Loader.load", 6, "type", "attribute[]",
                    "core", None,
                ),
            ),
        )

    def test_discovery_rejects_empty_or_vanished_globs(self):
        for globs, message in (
            ((), "at least one"),
            (("",), "empty"),
            (("missing/**/*.py",), "matched no files"),
        ):
            with self.subTest(globs=globs):
                with self.assertRaisesRegex(DiscoveryError, message):
                    discover_python_settings(self.repository_root, globs)

    def test_discovery_ownership_is_exact_and_fail_closed(self):
        discovered = (
            DiscoveredSetting(
                "sample.py", "Config.__init__", 4, "steps",
                "kwargs.get", "core", "3000",
            ),
            DiscoveredSetting(
                "sample.py", "Config.__init__", 5, "internal",
                "kwargs.get", "core", "False",
            ),
        )
        claims = (
            SourceClaim("sample.py", "Config.__init__", "steps", "kwargs.get"),
        )
        exclusions = (
            Exclusion(
                "sample.py", "Config.__init__", "internal", "kwargs.get",
                "model-developer API",
            ),
        )

        validate_setting_ownership(discovered, claims, exclusions)

        invalid_cases = (
            ((), (), "unowned"),
            ((SourceClaim(
                "sample.py", "Config.?", "steps", "kwargs.get"
            ),), exclusions, "exact identity"),
            (
                claims + (
                    SourceClaim(
                        "gone.py", "Gone.__init__", "missing", "kwargs.get"
                    ),
                ),
                exclusions,
                "vanished",
            ),
            (claims, exclusions + (
                Exclusion(
                    "sample.py", "Config.__init__", "steps", "kwargs.get",
                    "model-developer API",
                ),
            ), "multiple owners"),
            (claims, (
                Exclusion(
                    "sample.py", "*", "internal", "kwargs.get",
                    "model-developer API",
                ),
            ), "exact symbol"),
            (claims, (
                Exclusion(
                    "sample.py", "Config.__init__", "internal", "kwargs.get", "",
                ),
            ), "reason"),
            (claims, (
                Exclusion(
                    "sample.py", "Config.__init__", "internal", "kwargs.get",
                    "miscellaneous",
                ),
            ), "approved category"),
            (claims, (
                Exclusion(
                    "sample.py", "Config.__init__", "*", "kwargs.get",
                    "model-developer API",
                ),
            ), "blanket"),
        )
        for bad_claims, bad_exclusions, message in invalid_cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(DiscoveryError, message):
                    validate_setting_ownership(
                        discovered, bad_claims, bad_exclusions
                    )

    def test_discovery_catalog_loaders_are_strict_and_portable(self):
        sources_path = self.repository_root / "sources.json"
        sources_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "source_groups": [
                        {"owner": "python-ast", "globs": ["core/**/*.py"]},
                        {"owner": "typescript-test", "globs": ["ui/**/*.ts"]},
                    ],
                    "claims": [
                        {
                            "source": "core/config.py",
                            "symbol": "Config.__init__",
                            "key": "steps",
                            "read_kind": "kwargs.get",
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        exclusions_path = self.repository_root / "exclusions.json"
        exclusions_path.write_text(
            json.dumps(
                {
                    "schema_version": 2,
                    "exclusions": [
                        {
                            "source": "core/config.py",
                            "symbol": "Config.__init__",
                            "key": "internal",
                            "read_kind": "kwargs.get",
                            "reason": "model-developer API",
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        catalog = load_source_catalog(sources_path)
        exclusions = load_exclusions(exclusions_path)

        self.assertEqual(
            catalog.source_groups,
            (
                SourceGroup("python-ast", ("core/**/*.py",)),
                SourceGroup("typescript-test", ("ui/**/*.ts",)),
            ),
        )
        self.assertEqual(
            catalog.claims,
            (
                SourceClaim(
                    "core/config.py", "Config.__init__", "steps", "kwargs.get"
                ),
            ),
        )
        self.assertEqual(
            exclusions,
            (
                Exclusion(
                    "core/config.py", "Config.__init__", "internal",
                    "kwargs.get", "model-developer API",
                ),
            ),
        )

        malformed_sources = (
            ({"schema_version": 1, "source_groups": [], "claims": [], "extra": 1}, "unexpected"),
            ({"schema_version": 1, "source_groups": [], "claims": []}, "source_groups"),
            (
                {"schema_version": 1, "source_groups": [
                    {"owner": "unknown", "globs": ["x.py"]}
                ], "claims": []},
                "owner",
            ),
            (
                {"schema_version": 1, "source_groups": [
                    {"owner": "python-ast", "globs": ["../x.py"]}
                ], "claims": []},
                "portable",
            ),
            (
                {"schema_version": 1, "source_groups": [
                    {"owner": "python-ast", "globs": ["x.py"]}
                ], "claims": [{
                    "source": "x.py", "symbol": "Config.?", "key": "steps",
                    "read_kind": "kwargs.get",
                }]},
                "exact identity",
            ),
            (
                {"schema_version": 1, "source_groups": [
                    {"owner": "python-ast", "globs": ["x.py"]}
                ], "claims": [{
                    "source": "x.py", "symbol": "Config.__init__",
                    "key": "steps", "read_kind": "attribute[*]",
                }]},
                "exact identity",
            ),
        )
        for data, message in malformed_sources:
            with self.subTest(message=message):
                sources_path.write_text(json.dumps(data), encoding="utf-8")
                with self.assertRaisesRegex(DiscoveryError, message):
                    load_source_catalog(sources_path)

        bad_exclusion = {
            "schema_version": 2,
            "exclusions": [
                {
                    "source": "core/config.py",
                    "symbol": "Config.__init__",
                    "key": "internal",
                    "read_kind": "kwargs.get",
                    "reason": "because it is internal",
                }
            ],
        }
        exclusions_path.write_text(json.dumps(bad_exclusion), encoding="utf-8")
        with self.assertRaisesRegex(DiscoveryError, "approved category"):
            load_exclusions(exclusions_path)

        for version in (1, 3):
            with self.subTest(exclusions_schema_version=version):
                bad_version = deepcopy(bad_exclusion)
                bad_version["schema_version"] = version
                exclusions_path.write_text(
                    json.dumps(bad_version), encoding="utf-8"
                )
                with self.assertRaisesRegex(
                    DiscoveryError, "schema_version must equal 2"
                ):
                    load_exclusions(exclusions_path)

    def test_discovery_canonical_union_defers_ui_claims_to_the_ts_collector(self):
        catalog = load_source_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-sources.json"
        )

        self.assertEqual(
            catalog.source_groups,
            (
                SourceGroup("python-ast", PYTHON_DISCOVERY_GLOBS),
                SourceGroup("typescript-test", TYPESCRIPT_DISCOVERY_GLOBS),
            ),
        )
        # Task 6 adds AI_TOOLKIT_AUTH, version/build, utility, and other UI
        # claims only after its TS collector defines stable exact fact identities.
        self.assertEqual(catalog.claims, ())

    def test_discovery_initial_exclusions_exactly_close_out_of_boundary_symbols(self):
        discovered = discover_python_settings(
            REPOSITORY_ROOT, PYTHON_DISCOVERY_GLOBS
        )
        exclusions = load_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        expected = tuple(
            Exclusion(
                fact.source,
                fact.symbol,
                fact.key,
                fact.read_kind,
                INITIAL_EXCLUDED_SYMBOL_REASONS[(fact.source, fact.symbol)],
            )
            for fact in discovered
            if (fact.source, fact.symbol) in INITIAL_EXCLUDED_SYMBOL_REASONS
        )

        self.assertEqual(len(expected), 81)
        initial_exclusions = tuple(
            item
            for item in exclusions
            if (item.source, item.symbol) in INITIAL_EXCLUDED_SYMBOL_REASONS
        )
        self.assertEqual(initial_exclusions, expected)
        selected = tuple(
            fact
            for fact in discovered
            if (fact.source, fact.symbol) in INITIAL_EXCLUDED_SYMBOL_REASONS
        )
        validate_setting_ownership(selected, (), initial_exclusions)

        declared_sources = tuple(sorted({fact.source for fact in discovered}))
        for source, symbol in INITIAL_EXCLUDED_SYMBOL_REASONS:
            with self.subTest(source=source, symbol=symbol):
                validate_discovery_target(
                    discovered,
                    (),
                    exclusions,
                    declared_sources=declared_sources,
                    target_symbol=f"{source}::{symbol}",
                )

        future_fact = DiscoveredSetting(
            "toolkit/config_modules.py",
            "SliderConfig.__init__",
            9999,
            "new_slider_setting",
            "kwargs.get",
            "core",
            "None",
        )
        with self.assertRaisesRegex(DiscoveryError, "unowned"):
            validate_discovery_target(
                discovered + (future_fact,),
                (),
                exclusions,
                declared_sources=declared_sources,
                target_symbol=(
                    "toolkit/config_modules.py::SliderConfig.__init__"
                ),
            )

    def test_discovery_target_validation_is_exact_and_slice_closed(self):
        discovered = (
            DiscoveredSetting(
                "sample.py", "First.__init__", 2, "one", "kwargs.get", "core", "1"
            ),
            DiscoveredSetting(
                "sample.py", "Second.__init__", 6, "two", "kwargs.get", "core", "2"
            ),
        )
        first_claim = SourceClaim(
            "sample.py", "First.__init__", "one", "kwargs.get"
        )

        validate_discovery_target(
            discovered,
            (first_claim,),
            (),
            declared_sources=("sample.py",),
            target_symbol="sample.py::First.__init__",
        )

        cases = (
            ({"target_source": "sample.py"}, "unowned"),
            ({"target_source": "missing.py"}, "declared source union"),
            ({"target_source": "*.py"}, "exact"),
            ({"target_source": "sample"}, "declared source union"),
            ({"target_symbol": "sample.py::Missing"}, "no facts"),
            ({"target_symbol": "sample.py"}, "format"),
            (
                {
                    "target_source": "sample.py",
                    "target_symbol": "sample.py::First.__init__",
                },
                "mutually exclusive",
            ),
        )
        for selectors, message in cases:
            with self.subTest(selectors=selectors):
                with self.assertRaisesRegex(DiscoveryError, message):
                    validate_discovery_target(
                        discovered,
                        (first_claim,),
                        (),
                        declared_sources=("sample.py",),
                        **selectors,
                    )

    def test_discovery_cli_fixture_check_and_inventory_are_deterministic(self):
        fixture_result = subprocess.run(
            [
                sys.executable,
                "scripts/validate_training_book.py",
                "--check-discovery",
                "--scope",
                "discovery-fixtures",
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(
            fixture_result.returncode,
            0,
            fixture_result.stdout + fixture_result.stderr,
        )

        first_inventory = self.repository_root / "inventory-one.json"
        second_inventory = self.repository_root / "inventory-two.json"
        for inventory_path in (first_inventory, second_inventory):
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--inventory-json",
                    str(inventory_path),
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue(inventory_path.is_file(), "inventory was not written")
        self.assertEqual(first_inventory.read_bytes(), second_inventory.read_bytes())

        inventory = json.loads(first_inventory.read_text(encoding="utf-8"))
        self.assertEqual(inventory["schema_version"], 1)
        self.assertGreaterEqual(inventory["summary"]["total"], 965)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["toolkit/config_modules.py"], 436)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["TrainConfig"], 126)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["ModelConfig"], 60)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["DatasetConfig"], 78)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["AdapterConfig"], 49)
        excluded_identities = {
            (row["source"], row["symbol"], row["key"], row["read_kind"])
            for row in inventory["settings"]
            if row["ownership"] == "excluded"
        }
        declared_exclusions = load_exclusions(
            REPOSITORY_ROOT / "docs/book/reference/settings-exclusions.json"
        )
        declared_catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        catalog_identities = {
            (item.source, item.symbol, item.key, item.read_kind)
            for item in catalog_source_claims(declared_catalog)
        }
        self.assertEqual(
            inventory["summary"]["by_ownership"]["excluded"],
            len(declared_exclusions),
        )
        self.assertEqual(
            inventory["summary"]["by_ownership"]["cataloged"],
            len(catalog_identities),
        )
        self.assertEqual(
            inventory["summary"]["by_ownership"]["unowned"],
            inventory["summary"]["total"]
            - len(declared_exclusions)
            - len(catalog_identities),
        )
        self.assertEqual(
            excluded_identities,
            {
                (item.source, item.symbol, item.key, item.read_kind)
                for item in declared_exclusions
            },
        )
        self.assertTrue(
            all(
                row["ownership"]
                == (
                    "excluded"
                    if (
                        row["source"], row["symbol"], row["key"], row["read_kind"]
                    ) in excluded_identities
                    else "cataloged"
                    if (
                        row["source"], row["symbol"], row["key"], row["read_kind"]
                    ) in catalog_identities
                    else "unowned"
                )
                for row in inventory["settings"]
            )
        )

    def test_discovery_inventory_floor_rejects_each_one_row_reduction(self):
        baseline = {
            "toolkit/config_modules.py": 436,
            "TrainConfig": 126,
            "ModelConfig": 60,
            "DatasetConfig": 78,
            "AdapterConfig": 49,
        }
        validate_inventory_baseline(baseline, 965)
        validate_inventory_baseline(
            {name: count + 1 for name, count in baseline.items()}, 966
        )
        with self.assertRaisesRegex(DiscoveryError, "abruptly reduced.*total"):
            validate_inventory_baseline(baseline, 964)
        for name in baseline:
            with self.subTest(group=name):
                reduced = dict(baseline)
                reduced[name] -= 1
                with self.assertRaisesRegex(DiscoveryError, "abruptly reduced"):
                    validate_inventory_baseline(reduced, 965)

    def test_discovery_cli_rejects_an_empty_target_selector(self):
        result = subprocess.run(
            [
                sys.executable,
                "scripts/validate_training_book.py",
                "--target-source",
                "",
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("target", result.stderr)

    def test_discovery_cli_target_modes_are_green_after_complete_ownership(self):
        selectors = (
            ("--target-source", "toolkit/config.py"),
            (
                "--target-symbol",
                "toolkit/config.py::replace_env_vars_in_string.replacer",
            ),
        )
        for selector in selectors:
            with self.subTest(selector=selector):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--check-discovery",
                        *selector,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )

                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )

    def test_discovery_cli_rejects_inactive_or_multiple_modes(self):
        cases = (
            ("--target-source", "toolkit/config.py"),
            (
                "--check-discovery",
                "--scope",
                "discovery-fixtures",
                "--target-source",
                "toolkit/config.py",
            ),
            (
                "--check-discovery",
                "--inventory-json",
                str(self.repository_root / "invalid-inventory.json"),
                "--scope",
                "discovery-fixtures",
            ),
        )
        for arguments in cases:
            with self.subTest(arguments=arguments):
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        *arguments,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("mode", result.stderr)

    def test_discovery_cli_rejects_unknown_or_inactive_scopes(self):
        for arguments in (
            ("--scope", "unknown"),
            ("--scope", "discovery-fixtures"),
        ):
            with self.subTest(arguments=arguments):
                result = subprocess.run(
                    [sys.executable, "scripts/validate_training_book.py", *arguments],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("scope", result.stderr)


class NarrativeMarkdownContractTests(unittest.TestCase):
    MANIFEST_PATHS = ("README.md", "guide/current.md", "guide/target.md", "guide/future.md")

    def page(self, body="## Details\n\nSafe guidance."):
        return (
            "# Fixture page\n\n"
            "[Table of contents](../README.md)\n\n"
            "<!-- book-navigation:start -->\n"
            "<!-- book-navigation:end -->\n\n"
            f"{body}\n\n"
            "<!-- book-verification:start -->\n"
            "<!-- book-verification:end -->\n"
        )

    def validate(self, document, *, existing_paths=None, page_documents=None):
        from scripts.training_book.markdown import validate_narrative_page

        current = "guide/current.md"
        documents = {current: document, **(page_documents or {})}
        validate_narrative_page(
            current,
            document,
            manifest_paths=self.MANIFEST_PATHS,
            existing_paths=existing_paths or {"README.md", current},
            page_documents=documents,
        )

    def test_narrative_contract_accepts_one_h1_unique_anchors_and_marker_boundaries(self):
        self.validate(self.page('<a id="explicit-detail"></a>\n\n## Details'))

        mutations = {
            "missing H1": self.page().replace("# Fixture page\n", ""),
            "second H1": self.page() + "\n# Another title\n",
            "duplicate derived anchor": self.page("## Details\n\n## Details"),
            "explicit-derived collision": self.page(
                '<a id="details"></a>\n\n## Details'
            ),
            "single-quoted explicit-derived collision": self.page(
                "<a id='details'></a>\n\n## Details"
            ),
            "spaced explicit-derived collision": self.page(
                '<a id = "details"></a>\n\n## Details'
            ),
            "uppercase explicit-derived collision": self.page(
                '<a ID="details"></a>\n\n## Details'
            ),
            "unquoted explicit-derived collision": self.page(
                '<a id=details></a>\n\n## Details'
            ),
            "duplicate marker": self.page().replace(
                "<!-- book-navigation:end -->",
                "<!-- book-navigation:end -->\n<!-- book-navigation:end -->",
            ),
            "marker order": self.page().replace(
                "<!-- book-navigation:start -->\n<!-- book-navigation:end -->",
                "<!-- book-navigation:end -->\n<!-- book-navigation:start -->",
            ),
            "content after footer": self.page() + "Unsafe trailing content.\n",
        }
        from scripts.training_book.markdown import MarkdownContractError

        for label, document in mutations.items():
            with self.subTest(label=label), self.assertRaises(MarkdownContractError):
                self.validate(document)

    def test_narrative_contract_enforces_staged_forward_link_rules(self):
        target = self.page('<a id="usable"></a>\n\n## Target')
        documents = {"guide/target.md": target}
        existing = {"README.md", "guide/current.md", "guide/target.md"}
        self.validate(
            self.page(
                "## Links\n\n[Existing](target.md#usable) and "
                "[declared future](future.md)."
            ),
            existing_paths=existing,
            page_documents=documents,
        )
        unquoted_target = self.page('<a id=usable></a>\n\n## Target')
        self.validate(
            self.page("## Links\n\n[Existing](target.md#usable)."),
            existing_paths=existing,
            page_documents={"guide/target.md": unquoted_target},
        )

        unsafe_targets = (
            "future.md#missing", "undeclared.md", "../../escape.md",
            "\\wrong.md", "/absolute.md", "target.md#missing",
        )
        from scripts.training_book.markdown import MarkdownContractError

        for target_link in unsafe_targets:
            with self.subTest(target=target_link), self.assertRaises(MarkdownContractError):
                self.validate(
                    self.page(f"## Links\n\n[Unsafe]({target_link})"),
                    existing_paths=existing,
                    page_documents=documents,
                )

        alternate_links = (
            "[Unsafe][escape]\n\n[escape]: ../../outside.md",
            "[Unsafe][escape]\n\n[escape]: undeclared.md",
            '<a href="../../outside.md">Unsafe</a>',
            '<a href="undeclared.md">Unsafe</a>',
            '<a href=../../outside.md>Unsafe</a>',
            '<a HREF=undeclared.md>Unsafe</a>',
        )
        for link in alternate_links:
            with self.subTest(link=link), self.assertRaises(MarkdownContractError):
                self.validate(
                    self.page(f"## Links\n\n{link}"),
                    existing_paths=existing,
                    page_documents=documents,
                )

    def test_narrative_contract_rejects_prohibited_training_claims(self):
        claims = (
            "The lowest loss checkpoint is always the best checkpoint.",
            "The checkpoint with the lowest loss gives the best result.",
            "Independent queue keys provide distributed training.",
            "Independent queue keys are a form of distributed training.",
            "Independent queue keys allow distributed training.",
            "optimizer.pt contains the LoRA weights.",
            "`optimizer.pt` contains the LoRA weights.",
            "optimizer.pt holds the LoRA weights.",
            "The lowest loss is the best checkpoint, not the latest checkpoint.",
            "Independent queue keys do not wait; they provide distributed training.",
            "optimizer.pt does not contain logs; it contains LoRA weights.",
            "The best checkpoint is the checkpoint with the lowest loss.",
            "Distributed training is provided by independent queue keys.",
            "LoRA weights are stored in optimizer.pt.",
            "optimizer.pt restores training state; it contains LoRA weights.",
            "Independent queue keys isolate jobs; they provide distributed training.",
            "optimizer.pt stores state; however, it contains LoRA weights.",
            "Independent queue keys run separately; however, they provide distributed training.",
            "The lowest loss is always the\nbest checkpoint.",
            "Independent queue keys provide\ndistributed training.",
            "optimizer.pt contains the\nLoRA weights.",
            "The best checkpoint is the checkpoint with\nthe lowest loss.",
            "LoRA weights are stored in\noptimizer.pt.",
            "optimizer.pt restores state; however, it contains\nLoRA weights.",
            "The optimizer.pt file restores training state; it contains LoRA weights.",
            "The independent queue keys isolate jobs; they provide distributed training.",
        )
        from scripts.training_book.markdown import MarkdownContractError

        for claim in claims:
            with self.subTest(claim=claim), self.assertRaises(MarkdownContractError):
                self.validate(self.page(f"## Claim\n\n{claim}"))

        corrections = (
            "The lowest loss checkpoint is not necessarily the best checkpoint.",
            "Separate queue keys run independent jobs, not distributed training.",
            "optimizer.pt does not contain LoRA weights.",
            "Compare the lowest loss checkpoint with the best checkpoint selected by fixed samples.",
            "The lowest loss cannot guarantee the best checkpoint.",
            "Independent queue keys cannot provide distributed training.",
            "optimizer.pt cannot contain LoRA weights.",
            "The best checkpoint is selected by fixed samples; the lowest loss is only one signal.",
            "Distributed training is performed by cooperating workers; independent queue keys isolate jobs.",
            "LoRA weights are stored in the output checkpoint; optimizer.pt restores optimizer state.",
            "The LoRA checkpoint, not optimizer.pt, is loaded; it contains LoRA weights.",
            "optimizer.pt stores training state; the LoRA checkpoint is separate; it contains LoRA weights.",
            "Distributed worker groups, unlike independent queue keys, coordinate; they provide distributed training.",
            "Although optimizer.pt is separate, the LoRA checkpoint is loaded; it contains LoRA weights.",
            "Although independent queue keys are separate, worker groups coordinate; they provide distributed training.",
            "- The best checkpoint is selected by fixed samples\n- The lowest loss is only one signal",
            "- LoRA weights are stored in the output checkpoint\n- optimizer.pt restores optimizer state",
            "- Distributed training is performed by cooperating workers\n- Independent queue keys isolate jobs",
        )
        for correction in corrections:
            with self.subTest(correction=correction):
                self.validate(self.page(f"## Correction\n\n{correction}"))

    def test_narrative_contract_ignores_content_inside_longer_outer_fences(self):
        fenced_example = (
            "## Fenced example\n\n"
            "````markdown\n"
            "```markdown\n"
            "# Not a real heading\n"
            "[Unsafe](../../outside.md)\n"
            "```\n"
            "````"
        )

        self.validate(self.page(fenced_example))

    def test_narrative_contract_ignores_html_comment_structure(self):
        self.validate("<!-- metadata -->\n" + self.page())
        self.validate("<!--\n# Hidden heading\n-->\n" + self.page())
        self.validate(
            self.page(
                "<!-- The lowest loss checkpoint is always the best checkpoint. -->"
            )
        )

    def test_narrative_link_extractor_distinguishes_rendered_and_hidden_links(self):
        target = "../models/anima.md"
        rendered = (
            f"[Inline](<{target}> \"guide\")\n"
            f"[Reference][model]\n\n[model]: <{target}>\n"
            f'<a href="{target}">HTML</a>'
        )
        self.assertEqual(
            markdown_module.extract_rendered_links(rendered),
            [
                ("Inline", target),
                (None, target),
                ("Reference", target),
            ],
        )
        for hidden in (
            f"`[Code]({target})`",
            f"<!-- [Comment]({target}) -->",
            rf"\[Escaped]({target})",
            f"<{target}>",
        ):
            with self.subTest(hidden=hidden):
                self.assertEqual(markdown_module.extract_rendered_links(hidden), [])

        self.assertEqual(
            markdown_module.extract_rendered_links(
                rf"\`[Escaped ticks]({target})\`"
            ),
            [("Escaped ticks", target)],
        )
        self.assertEqual(
            markdown_module.extract_rendered_links(
                "[Duplicate][model]\n\n"
                "[model]: ../models/qwen-image-and-edit.md\n"
                "[model]: ../models/anima.md"
            ),
            [("Duplicate", "../models/qwen-image-and-edit.md")],
        )

        self.validate(
            self.page(
                "## Hidden definition\n\n"
                "<!-- hidden across\n[unused]: ../../outside.md\nlines -->"
            )
        )

    def test_staged_pages_validate_only_current_manifest_declared_markdown(self):
        from scripts.training_book.markdown import validate_staged_book_pages

        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")
        validate_staged_book_pages(
            REPOSITORY_ROOT / "docs/book",
            tuple(page.path for page in manifest.pages),
        )


class BeginnerNarrativePageTests(unittest.TestCase):
    def test_beginner_page_prerequisites_covers_the_safe_starting_contract(self):
        page = (
            REPOSITORY_ROOT / "docs/book/getting-started/prerequisites.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Install and start ai-toolkit",
            "## Authentication and model access",
            "## GPU support, memory, and storage",
            "## Dataset rights, privacy, and safety",
            "## Readiness checklist",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "supported NVIDIA GPU",
            "Hugging Face",
            "training output",
            "permission",
            "first-lora-flex1.yaml",
            "saving-resuming-and-optimizer-state.md",
        ):
            self.assertIn(phrase, page)

    def test_beginner_page_choose_model_covers_every_supported_architecture(self):
        page = (
            REPOSITORY_ROOT / "docs/book/getting-started/choose-a-model.md"
        ).read_text(encoding="utf-8")
        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")

        for architecture in manifest.full_architectures:
            self.assertEqual(
                page.count(f"`{architecture}`"), 1,
                f"expected one overview row for {architecture}",
            )
        for heading in (
            "## Decide by task and modality",
            "## Complete architecture overview",
            "## Access, licenses, and downloads",
            "## Memory is a configuration question",
            "## Focused family guides",
        ):
            self.assertIn(heading, page)
        for link in (
            "../models/anima.md",
            "../models/flux-and-flex.md",
            "../models/qwen-image-and-edit.md",
            "../models/sdxl-and-sd15.md",
            "../models/wan.md",
        ):
            self.assertIn(link, page)

    def test_beginner_page_first_lora_is_a_simple_fixed_sample_walkthrough(self):
        page = (
            REPOSITORY_ROOT / "docs/book/getting-started/first-lora.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Build the training dataset",
            "## Create the job in the Simple editor",
            "## Configure fixed samples",
            "## Queue and start the job",
            "## Compare samples and checkpoints",
            "## Stop and resume safely",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "first-lora-flex1.yaml",
            "seed 42",
            "walk seed",
            "every 250 steps",
            "Add to queue",
            "same prompt",
            "same seed",
            "saving-resuming-and-optimizer-state.md",
        ):
            self.assertIn(phrase, page)
        self.assertNotIn("Advanced YAML", page)

    def test_beginner_page_training_mental_model_explains_the_learning_loop(self):
        page = (
            REPOSITORY_ROOT / "docs/book/getting-started/training-mental-model.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## What the LoRA changes",
            "## From caption and image to gradient",
            "## Rank is capacity, not quality",
            "## Learning rate and optimizer steps",
            "## Underfitting, useful fit, and overfitting",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "base model",
            "caption",
            "noise",
            "gradient",
            "LoRA",
            "rank",
            "learning rate",
            "optimizer step",
            "underfitting",
            "overfitting",
            "fixed-seed samples",
        ):
            self.assertIn(phrase.lower(), page.lower())


class WorkflowNarrativePageTests(unittest.TestCase):
    def test_workflow_page_simple_ui_covers_edit_save_import_and_clone(self):
        page = (
            REPOSITORY_ROOT / "docs/book/workflow/simple-ui.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Start in the Simple editor",
            "## Know when a job is advanced",
            "## Create, save, and update",
            "## Import a configuration",
            "## Clone before experimenting",
            "## A safe editing routine",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "Show Advanced",
            "Show Simple",
            "Create Job",
            "Update Job",
            "YAML",
            "JSON",
            "clone",
            "source job",
            "new job name",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_workflow_page_sampling_evaluation_uses_fixed_diverse_comparisons(self):
        page = (
            REPOSITORY_ROOT / "docs/book/workflow/sampling-and-evaluation.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Build an evaluation suite before training",
            "## Hold seeds and inference settings fixed",
            "## Use diverse prompts on purpose",
            "## Sample on a cadence and on demand",
            "## Compare checkpoints systematically",
            "## Record a decision, not just images",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "step-zero",
            "walk seed",
            "same seed",
            "same prompt",
            "prompt diversity",
            "Sample Next Step",
            "Save Next Step",
            "sample_every",
            "sample_start_step",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_workflow_page_loss_checkpoints_explains_valleys_without_ranking_them(self):
        page = (
            REPOSITORY_ROOT / "docs/book/workflow/loss-and-checkpoints.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Read raw loss as a noisy measurement",
            "## Use smoothed loss to see direction",
            "## Treat valleys and peaks as inspection points",
            "## Align checkpoint and sample cadence",
            "## Select checkpoints by evidence",
            "## Diagnose patterns before changing settings",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "raw loss",
            "smoothed loss",
            "valley",
            "peak",
            "lowest loss is not",
            "save_every",
            "sample_every",
            "fixed seed",
            "Save Next Step",
            "Sample Next Step",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_workflow_page_queue_gpus_states_exact_queue_boundaries(self):
        page = (
            REPOSITORY_ROOT / "docs/book/workflow/queue-and-multiple-gpus.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Queue identity is the exact gpu_ids key",
            "## One queue runs one job process at a time",
            "## Start, stop, and return jobs deliberately",
            "## Use multiple GPUs for independent jobs",
            "## Recover from a hung or stale job",
            "## Know the concurrency limits",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "gpu_ids",
            '"0"',
            '"0,1"',
            '"1,0"',
            "return to queue",
            "queued",
            "running",
            "stopped",
            "distributed multi-GPU training",
            "global exclusion",
            "independent single-process jobs",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_workflow_page_resume_optimizer_separates_artifacts_and_compatibility(self):
        page = (
            REPOSITORY_ROOT / "docs/book/workflow/saving-resuming-and-optimizer-state.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Separate LoRA checkpoints from optimizer state",
            "## Save and prune without losing the recovery point",
            "## Select the newest complete compatible checkpoint",
            "## Wire an explicit resume",
            "## Restore compatible optimizer state without changing LR",
            "## Decide which changes are compatible",
            "## Recover from interruption or corruption",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "network.pretrained_lora_path",
            "train.start_step",
            "optimizer.pt",
            "does not contain LoRA weights",
            "training_folder / name",
            "configured learning rate",
            "newest",
            "partial",
            "corrupt",
            "resume-from-checkpoint.yaml",
        ):
            self.assertIn(phrase.lower(), page.lower())


class DatasetChaptersNarrativePageTests(unittest.TestCase):
    def test_dataset_chapters_page_dataset_curation_covers_selection_balance_and_provenance(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/curation.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Define the learning goal",
            "## Prefer quality before quantity",
            "## Exact and near duplicates",
            "## Outliers",
            "## Variety and balance",
            "## Version the dataset and preserve provenance",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "subject",
            "style",
            "object",
            "edit",
            "image",
            "video",
            "audio",
            "pose",
            "background",
            "lighting",
            "source-missing",
            "toolkit/config_modules.py",
            "../reference/dataset.md#dataset-folder-path",
            "../reference/dataset.md#dataset-num-repeats",
            "../reference/dataset.md#dataset-network-weight",
            "../reference/dataset.md#dataset-is-reg",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_dataset_chapters_page_captions_triggers_covers_caption_controls(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/captions-and-triggers.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Choose what the caption should explain",
            "## Pair caption files and fallbacks correctly",
            "## Place and test a trigger",
            "## Use dropout deliberately",
            "## Shuffle only interchangeable tokens",
            "## Audit captions before training",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "caption_ext",
            "default_caption",
            "trigger_word",
            "caption_dropout_rate",
            "token_dropout_rate",
            "shuffle_tokens",
            "keep_tokens",
            "random_triggers",
            "caption dropout remains active",
            "cached blank embedding",
            "token dropout is skipped",
            "../reference/dataset.md#dataset-caption-ext",
            "../reference/dataset.md#dataset-default-caption",
            "../reference/dataset.md#dataset-trigger-word",
            "toolkit/config_modules.py",
            "toolkit/dataloader_mixins.py",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_dataset_chapters_page_resolution_bucketing_covers_geometry(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/resolution-and-bucketing.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Choose a resolution the source can support",
            "## Preserve aspect ratios with buckets",
            "## Understand resizing and cropping",
            "## Use geometric augmentation cautiously",
            "## Inspect the bucket distribution",
            "## Diagnose composition failures",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "resolution",
            "buckets",
            "bucket_tolerance",
            "random_crop",
            "random_scale",
            "square_crop",
            "flip_x",
            "flip_y",
            "cannot restore detail",
            "aspect ratio",
            "../reference/dataset.md#dataset-resolution",
            "../reference/dataset.md#dataset-buckets",
            "../reference/dataset.md#dataset-bucket-tolerance",
            "toolkit/config_modules.py",
            "toolkit/data_loader.py",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_dataset_chapters_page_dataset_masks_states_exact_weight_semantics(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/masks.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Understand what an ordinary mask changes",
            "## Read white black and gray exactly",
            "## Choose mask_min_value",
            "## Invert before weighting",
            "## Know what the mask editor stores",
            "## Add an inverted-mask prior only when compatible",
            "## Diagnose mask training",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "white pixels map to 1.0",
            "black pixels map toward `mask_min_value`",
            "grayscale",
            "invert_mask",
            "inversion occurs before",
            "all-white mask",
            "equivalent to no mask",
            "inverted_mask_prior",
            "inverted_mask_prior_multiplier",
            "turbo",
            "prior prediction",
            "../reference/dataset.md#dataset-mask-path",
            "../reference/dataset.md#dataset-mask-min-value",
            "../reference/dataset.md#dataset-invert-mask",
            "../reference/training.md#train-inverted-mask-prior",
            "toolkit/config_modules.py",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertNotIn("white learns more", page.lower())

    def test_dataset_chapters_page_dataset_modalities_covers_paired_inputs(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/controls-video-audio.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Keep control inputs matched",
            "## Preserve paired geometry",
            "## Select video frames deliberately",
            "## Build image-to-video examples",
            "## Prepare audio consistently",
            "## Validate a multimodal batch",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "control_path",
            "control_from_same_folder",
            "replay_transforms",
            "num_frames",
            "shrink_video_to_frames",
            "fps",
            "do_i2v",
            "do_audio",
            "audio_normalize",
            "audio_preserve_pitch",
            "../reference/dataset.md#dataset-control-path",
            "../reference/dataset.md#dataset-num-frames",
            "../reference/dataset.md#dataset-do-i2v",
            "../reference/dataset.md#dataset-audio-normalize",
            "toolkit/config_modules.py",
            "toolkit/dataloader_mixins.py",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_dataset_chapters_page_dataset_safety_covers_rights_and_consent(self):
        page = (
            REPOSITORY_ROOT / "docs/book/datasets/rights-privacy-and-safety.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Establish rights and license compatibility",
            "## Obtain informed consent",
            "## Protect privacy and personal data",
            "## Handle sensitive content and minors",
            "## Preserve provenance and honor removal",
            "## Run a preflight review",
        ):
            self.assertIn(heading, page)
        for phrase in (
            "license",
            "commercial use",
            "derivative",
            "consent",
            "privacy",
            "personal data",
            "biometric",
            "sensitive",
            "minor",
            "removal",
            "dataset version",
            "manifest",
            "../getting-started/prerequisites.md",
            "curation.md",
            "captions-and-triggers.md",
        ):
            self.assertIn(phrase.lower(), page.lower())


class RecipeNarrativePageTests(unittest.TestCase):
    REQUIRED_SECTIONS = (
        "Objective",
        "Suitable models",
        "Dataset design",
        "Caption pattern",
        "Starting settings and ranges",
        "Sampling plan",
        "Expected learning signals",
        "Common failure modes",
        "Settings deliberately not changed",
        "Model-specific deviations",
        "Further reading",
    )
    REQUIRED_MODEL_LINKS = {
        "recipes/character-identity.md": (
            "../models/anima.md",
            "../models/flux-and-flex.md",
            "../models/sdxl-and-sd15.md",
            "../models/wan.md",
        ),
        "recipes/style.md": (
            "../models/flux-and-flex.md",
            "../models/sdxl-and-sd15.md",
        ),
        "recipes/object-concept.md": (
            "../models/flux-and-flex.md",
            "../models/qwen-image-and-edit.md",
        ),
        "recipes/focused-refinement.md": (
            "../models/anima.md",
            "../models/qwen-image-and-edit.md",
        ),
        "recipes/low-vram.md": ("../models/anima.md",),
        "recipes/diagnostic-run.md": (
            "../models/anima.md",
            "../models/wan.md",
        ),
    }
    PRESET_START = "<!-- built-in-presets:start -->"
    PRESET_END = "<!-- built-in-presets:end -->"

    def recipe_fixture(self, relative_path, *, preset_rows=()):
        links = "\n".join(
            f"- [Model guide]({target})"
            for target in self.REQUIRED_MODEL_LINKS[relative_path]
        )
        sections = []
        for section in self.REQUIRED_SECTIONS:
            content = links if section == "Model-specific deviations" else "Fixture guidance."
            sections.append(f"## {section}\n\n{content}")
        block = "\n".join(
            f"- `{preset_id}` — {name}" for preset_id, name in preset_rows
        )
        return (
            "# Fixture recipe\n\n"
            + "\n\n".join(sections)
            + f"\n\n{self.PRESET_START}\n{block}\n{self.PRESET_END}\n"
        )

    def assert_recipe_contract(
        self,
        relative_path,
        document,
        *,
        pre_catalog=False,
        preset_facts=(),
    ):
        lines = document.splitlines()
        for section in self.REQUIRED_SECTIONS:
            self.assertEqual(lines.count(f"## {section}"), 1, section)
        self.assertEqual(document.count(self.PRESET_START), 1)
        self.assertEqual(document.count(self.PRESET_END), 1)
        start = document.index(self.PRESET_START) + len(self.PRESET_START)
        end = document.index(self.PRESET_END)
        self.assertLess(start, end)
        block = document[start:end].strip()

        prose_document = document
        navigation_start = "<!-- book-navigation:start -->"
        navigation_end = "<!-- book-navigation:end -->"
        if navigation_start in prose_document and navigation_end in prose_document:
            start_index = prose_document.index(navigation_start) + len(navigation_start)
            end_index = prose_document.index(navigation_end)
            prose_document = (
                prose_document[:start_index] + "\n" + prose_document[end_index:]
            )
        visible = markdown_module.rendered_markdown(prose_document)
        reference_definitions = markdown_module.markdown_reference_definitions(visible)
        section_heading = "## Model-specific deviations"
        section_start = visible.index(section_heading) + len(section_heading)
        following_heading = re.search(r"^## ", visible[section_start:], re.MULTILINE)
        section_end = (
            section_start + following_heading.start()
            if following_heading is not None
            else len(visible)
        )
        section = visible[section_start:section_end]
        all_model_links = [
            target
            for _, target in markdown_module.extract_rendered_links(
                visible, reference_definitions=reference_definitions
            )
            if target.startswith("../models/")
        ]
        section_model_links = [
            target
            for _, target in markdown_module.extract_rendered_links(
                section, reference_definitions=reference_definitions
            )
            if target.startswith("../models/")
        ]
        required_links = self.REQUIRED_MODEL_LINKS[relative_path]
        self.assertCountEqual(all_model_links, required_links)
        self.assertCountEqual(section_model_links, required_links)

        if pre_catalog:
            self.assertEqual(block, "")
            return

        expected = [
            (fact["id"], fact["name"])
            for fact in preset_facts
            if fact["recipe_path"] in (relative_path, f"docs/book/{relative_path}")
        ]
        actual = re.findall(r"^- `([^`]+)` — (.+)$", block, re.MULTILINE)
        self.assertTrue(expected, "final recipe must have emitted preset facts")
        self.assertEqual(actual, expected)

    def assert_recipe_set(self, pages, *, preset_facts):
        self.assertEqual(
            {
                fact["recipe_path"].removeprefix("docs/book/")
                for fact in preset_facts
            },
            set(pages),
        )
        for relative_path, document in pages.items():
            self.assert_recipe_contract(
                relative_path, document, preset_facts=preset_facts
            )

    def test_recipe_contract_accepts_only_explicit_empty_pre_catalog_mode(self):
        relative_path = "recipes/character-identity.md"
        document = self.recipe_fixture(relative_path)
        self.assert_recipe_contract(relative_path, document, pre_catalog=True)
        self.assert_recipe_contract(
            relative_path,
            document.replace(
                "[Model guide](../models/anima.md)",
                r"\`[Model guide](../models/anima.md)\`",
                1,
            ),
            pre_catalog=True,
        )

        with self.assertRaises(AssertionError):
            self.assert_recipe_contract(relative_path, document)
        with self.assertRaises(AssertionError):
            self.assert_recipe_contract(
                relative_path,
                self.recipe_fixture(relative_path, preset_rows=(("preset-a", "A"),)),
                pre_catalog=True,
            )

    def test_recipe_contract_rejects_sections_markers_and_wrong_model_links(self):
        relative_path = "recipes/character-identity.md"
        document = self.recipe_fixture(relative_path)
        moved_model_link = document.replace(
            "Fixture guidance.",
            "Fixture guidance.\n\n- [Moved model](../models/anima.md)",
            1,
        ).replace("- [Model guide](../models/anima.md)\n", "", 1)
        mutations = (
            document.replace("## Objective\n", "", 1),
            document.replace(self.PRESET_END, f"{self.PRESET_END}\n{self.PRESET_END}"),
            document.replace("../models/anima.md", "../models/qwen-image-and-edit.md"),
            document.replace(
                "- [Model guide](../models/wan.md)",
                "- [Model guide](../models/wan.md)\n- [Again](../models/wan.md)",
            ),
            moved_model_link,
            document.replace(
                "Fixture guidance.",
                'Fixture guidance.\n\n<a href="../models/qwen-image-and-edit.md">Extra family</a>',
                1,
            ),
            document.replace(
                "Fixture guidance.",
                "Fixture guidance.\n\n[Extra family][qwen]\n\n"
                "[qwen]: ../models/qwen-image-and-edit.md",
                1,
            ),
            document.replace(
                "[Model guide](../models/anima.md)",
                "`[Model guide](../models/anima.md)`",
                1,
            ),
            document.replace(
                "[Model guide](../models/anima.md)",
                "<!-- [Model guide](../models/anima.md) -->",
                1,
            ),
            document.replace(
                "[Model guide](../models/anima.md)",
                r"\[Model guide](../models/anima.md)",
                1,
            ),
            document.replace(
                "[Model guide](../models/anima.md)",
                "[Model guide][family]\n\n"
                "[family]: ../models/qwen-image-and-edit.md\n"
                "[family]: ../models/anima.md",
                1,
            ),
            document.replace(
                "[Model guide](../models/anima.md)",
                "<../models/anima.md>",
                1,
            ),
        )
        for mutation in mutations:
            with self.subTest(mutation=mutation[:80]), self.assertRaises(AssertionError):
                self.assert_recipe_contract(
                    relative_path, mutation, pre_catalog=True
                )

    def test_recipe_contract_enforces_bidirectional_final_preset_membership(self):
        relative_path = "recipes/style.md"
        facts = (
            {"id": "style-a", "name": "Style A", "recipe_path": relative_path},
            {"id": "style-b", "name": "Style B", "recipe_path": relative_path},
        )
        document = self.recipe_fixture(
            relative_path,
            preset_rows=(("style-a", "Style A"), ("style-b", "Style B")),
        )
        self.assert_recipe_set({relative_path: document}, preset_facts=facts)

        invalid_facts = (
            facts[:1],
            facts + ({"id": "style-c", "name": "Style C", "recipe_path": relative_path},),
            ({"id": "style-a", "name": "Wrong", "recipe_path": relative_path}, facts[1]),
            facts + ({"id": "other", "name": "Other", "recipe_path": "recipes/other.md"},),
        )
        for mutation in invalid_facts:
            with self.subTest(facts=mutation), self.assertRaises(AssertionError):
                self.assert_recipe_set(
                    {relative_path: document}, preset_facts=mutation
                )

    def test_recipes_page_recipe_character_covers_identity_baseline(self):
        relative_path = "recipes/character-identity.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "identity",
            "trigger",
            "rank",
            "16 to 64",
            "5e-5 to 1e-4",
            "1,000 to 3,000",
            "fixed seed",
            "pose",
            "background",
            "overfitting",
            "../datasets/curation.md",
            "../datasets/captions-and-triggers.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_recipes_page_recipe_style_covers_style_baseline(self):
        relative_path = "recipes/style.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "style",
            "content diversity",
            "trigger",
            "rank",
            "8 to 32",
            "5e-5 to 1e-4",
            "1,000 to 3,000",
            "fixed seed",
            "overfitting",
            "style leakage",
            "../datasets/curation.md",
            "../datasets/captions-and-triggers.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_recipes_page_recipe_object_covers_concept_baseline(self):
        relative_path = "recipes/object-concept.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "object",
            "trigger",
            "viewpoint",
            "shape",
            "material",
            "rank",
            "16 to 64",
            "5e-5 to 1e-4",
            "1,000 to 3,000",
            "fixed seed",
            "overfitting",
            "../datasets/curation.md",
            "../datasets/captions-and-triggers.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_recipes_page_recipe_refinement_covers_mask_semantics(self):
        relative_path = "recipes/focused-refinement.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "focused refinement",
            "grayscale",
            "mask_min_value",
            "inversion",
            "inverted-mask prior",
            "all-white mask",
            "equivalent to no mask",
            "neither masks nor the inverted-mask prior are enabled automatically",
            "fixed seed",
            "overfitting",
            "../datasets/masks.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_recipes_page_recipe_low_vram_covers_memory_tradeoffs(self):
        relative_path = "recipes/low-vram.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "low-vram",
            "quantization",
            "cache_text_embeddings",
            "cache_latents",
            "gradient checkpointing",
            "offloading",
            "throughput",
            "preserve dataset resolution",
            "no universal card-capacity guarantee",
            "fixed seed",
            "out of memory",
            "../getting-started/choose-a-model.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_recipes_page_recipe_diagnostic_covers_pipeline_check(self):
        relative_path = "recipes/diagnostic-run.md"
        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        self.assert_recipe_contract(
            relative_path,
            page,
            preset_facts=load_production_training_book_preset_facts(),
        )
        for phrase in (
            "250-step",
            "save/sample interval",
            "fixed seed",
            "one retained periodic checkpoint",
            "queue",
            "preflight",
            "pipeline rather than lora quality",
            "largest bucket",
            "cache",
            "resume",
            "../workflow/queue-and-multiple-gpus.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())


class ModelNarrativePageTests(unittest.TestCase):
    REQUIRED_SECTIONS = (
        "What this family covers",
        "Model access and paths",
        "Dataset and captions",
        "Starting configuration",
        "Memory, quantization, and offloading",
        "Sampling and evaluation",
        "Incompatibilities and cautions",
        "Further reading",
    )

    def assert_model_page_contract(self, relative_path, architectures):
        from scripts.generate_training_book_reference import (
            MODEL_FACTS_END,
            MODEL_FACTS_START,
            render_model_facts_block,
        )

        page = (REPOSITORY_ROOT / "docs/book" / relative_path).read_text(
            encoding="utf-8"
        )
        lines = page.splitlines()
        for section in self.REQUIRED_SECTIONS:
            self.assertEqual(lines.count(f"## {section}"), 1, section)
        self.assertEqual(page.count(MODEL_FACTS_START), 1)
        self.assertEqual(page.count(MODEL_FACTS_END), 1)
        start = page.index(MODEL_FACTS_START)
        end = page.index(MODEL_FACTS_END) + len(MODEL_FACTS_END)
        details_start = page.rfind("<details>", 0, start)
        self.assertNotEqual(details_start, -1, "model facts must be collapsible")
        self.assertIn(
            "<summary>Catalog-verified facts (generated)</summary>",
            page[details_start:start],
        )
        details_end = page.find("</details>", end)
        self.assertNotEqual(details_end, -1, "model facts disclosure must close")
        self.assertFalse(
            any(
                details_start < page.index(f"## {section}") < details_end
                for section in self.REQUIRED_SECTIONS
            ),
            "human guidance must remain outside generated facts",
        )

        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        expected = render_model_facts_block(catalog, relative_path, architectures)
        self.assertEqual(page[start:end], expected)
        payload = json.loads(
            expected.split("```json\n", 1)[1].split("\n```", 1)[0]
        )
        self.assertEqual(
            tuple(item["id"] for item in payload["architectures"]),
            architectures,
        )
        self.assertTrue(
            all(item["facts"] for item in payload["architectures"]),
            "every focused architecture must own generated catalog facts",
        )
        prose = page[:details_start] + page[details_end + len("</details>"):]
        return prose, payload

    def test_model_pages_page_model_anima_covers_anima_training(self):
        page, payload = self.assert_model_page_contract(
            "models/anima.md", ("anima",)
        )
        for phrase in (
            "circlestone-labs/Anima-Base-v1.0-Diffusers",
            "flowmatch",
            "weighted",
            "max_sequence_length",
            "512",
            "train_text_conditioner",
            "false",
            "low_vram",
            "layer offloading",
            "1024",
            "fixed seed",
            "../recipes/character-identity.md",
            "../recipes/focused-refinement.md",
            "../recipes/low-vram.md",
            "../datasets/captions-and-triggers.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertEqual(
            tuple(item["id"] for item in payload["deferred_settings"]),
            (
                "model.anima.model_kwargs.max_sequence_length",
                "model.anima.model_kwargs.train_text_conditioner",
            ),
        )

    def test_model_pages_page_model_flux_flex_covers_family_variants(self):
        page, payload = self.assert_model_page_contract(
            "models/flux-and-flex.md", ("flux", "flux_kontext", "flex1")
        )
        for phrase in (
            "black-forest-labs/FLUX.1-dev",
            "black-forest-labs/FLUX.1-Kontext-dev",
            "ostris/Flex.1-alpha",
            "https://huggingface.co/black-forest-labs/FLUX.1-dev",
            "flowmatch",
            "weighted",
            "bypass_guidance_embedding",
            "control_path",
            "ctrl_img",
            "paired",
            "not interchangeable",
            "quantization",
            "fixed seed",
            "../datasets/controls-video-audio.md",
            "../recipes/style.md",
            "../recipes/object-concept.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertEqual(payload["deferred_settings"], [])

    def test_model_pages_page_model_qwen_covers_generation_and_edit_variants(self):
        page, payload = self.assert_model_page_contract(
            "models/qwen-image-and-edit.md",
            (
                "qwen_image", "qwen_image:2512", "qwen_image_edit",
                "qwen_image_edit_plus", "qwen_image_edit_plus:2511",
            ),
        )
        for phrase in (
            "Qwen/Qwen-Image",
            "Qwen/Qwen-Image-2512",
            "Qwen/Qwen-Image-Edit",
            "Qwen/Qwen-Image-Edit-2509",
            "Qwen/Qwen-Image-Edit-2511",
            "not interchangeable",
            "control_path",
            "ctrl_img",
            "multi_control_paths",
            "multi_ctrl_imgs",
            "match_target_res",
            "false",
            "qfloat8",
            "low_vram",
            "flowmatch",
            "weighted",
            "paired",
            "fixed seed",
            "../datasets/controls-video-audio.md",
            "../recipes/object-concept.md",
            "../recipes/focused-refinement.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertEqual(
            tuple(item["id"] for item in payload["deferred_settings"]),
            ("model.qwen_image_edit_plus.model_kwargs.match_target_res",),
        )

    def test_model_pages_page_model_sd_distinguishes_sdxl_and_sd15(self):
        page, payload = self.assert_model_page_contract(
            "models/sdxl-and-sd15.md", ("sdxl", "sd15")
        )
        for phrase in (
            "stabilityai/stable-diffusion-xl-base-1.0",
            "stable-diffusion-v1-5/stable-diffusion-v1-5",
            "SDXL",
            "SD 1.5",
            "1024",
            "512",
            "ddpm",
            "guidance scale",
            "6",
            "text encoder",
            "optimizer",
            "quantization",
            "timestep",
            "not interchangeable",
            "fixed seed",
            "../recipes/character-identity.md",
            "../recipes/style.md",
            "../datasets/resolution-and-bucketing.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertEqual(payload["deferred_settings"], [])

    def test_model_pages_page_model_wan_covers_video_and_multistage_training(self):
        page, payload = self.assert_model_page_contract(
            "models/wan.md", ("wan21:1b", "wan22_14b:t2v")
        )
        for phrase in (
            "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
            "ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16",
            "41",
            "16 FPS",
            "T2V",
            "I2V",
            "train_high_noise",
            "train_low_noise",
            "at least one",
            "switch_boundary_every",
            "vae_tiling",
            "sampling cost",
            "resource uncertainty",
            "no GPU",
            "fixed seed",
            "wan21_i2v:14b480p",
            "wan21_i2v:14b",
            "wan21:14b",
            "wan22_14b_i2v",
            "wan22_5b",
            "../datasets/controls-video-audio.md",
            "../recipes/diagnostic-run.md",
            "../recipes/low-vram.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())
        self.assertEqual(
            tuple(item["id"] for item in payload["deferred_settings"]),
            (
                "model.wan.model_kwargs.vae_tiling",
                "model.wan22_14b.model_kwargs.train_high_noise",
                "model.wan22_14b.model_kwargs.train_low_noise",
            ),
        )


class AdvancedNarrativePageTests(unittest.TestCase):
    def test_advanced_page_advanced_yaml_cli_covers_precedence_and_presence(self):
        page = (
            REPOSITORY_ROOT / "docs/book/advanced/yaml-and-cli.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Understand configuration ownership",
            "## Preserve YAML types and presence",
            "## Run one or more config files",
            "## Understand CLI precedence",
            "## Use templates and environment substitution",
            "## Validate before a long run",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for anchor in (
            '<a id="cli-config-file-list"></a>',
            '<a id="cli-recover"></a>',
            '<a id="cli-name"></a>',
            '<a id="cli-log"></a>',
        ):
            self.assertEqual(page.count(anchor), 1, anchor)
        for phrase in (
            "python run.py config/my-job.yaml",
            "python run.py config/first.yaml config/second.yaml",
            ".yaml",
            ".yml",
            ".json",
            ".jsonc",
            "sequentially",
            "--recover",
            "--name",
            "--log",
            "config.name",
            "[name]",
            "global textual replacement",
            "does not override arbitrary yaml settings",
            "absent",
            "null",
            "false",
            "0",
            "empty string",
            "not interchangeable",
            "engine fallback",
            "${DATASET_DIR}",
            "missing environment variable",
            "../reference/job-and-model.md",
            "../reference/advanced-only-settings.md",
            "../examples/README.md",
            "../workflow/simple-ui.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_advanced_page_advanced_layers_covers_targeting_rank_and_alpha(self):
        page = (
            REPOSITORY_ROOT / "docs/book/advanced/layer-targeting.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Start from architecture-owned targets",
            "## Understand rank and alpha",
            "## Filter module names safely",
            "## Choose linear and convolution capacity",
            "## Use per-block capacity only with a map",
            "## Verify the resulting network",
            "## Common failure modes",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for phrase in (
            "target_lora_modules",
            "linear",
            "linear_alpha",
            "alpha / rank",
            "peft_format",
            "forces alpha to rank",
            "resolved format",
            "legacy lokr",
            "higher rank",
            "memory",
            "checkpoint size",
            "ignore_if_contains",
            "only_if_contains",
            "substring",
            "network_kwargs",
            "broad filters",
            "few or no trainable modules",
            "conv",
            "conv_alpha",
            "block_dims",
            "block_alphas",
            "positional",
            "architecture",
            "one variable",
            "fixed seed",
            "../reference/network.md",
            "../workflow/sampling-and-evaluation.md",
            "../recipes/diagnostic-run.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_advanced_page_advanced_performance_covers_caches_and_tradeoffs(self):
        page = (
            REPOSITORY_ROOT / "docs/book/advanced/performance-and-caching.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Measure the whole pipeline",
            "## Separate latent and text caches",
            "## Invalidate latent caches deliberately",
            "## Invalidate text caches deliberately",
            "## Trade memory for recomputation and transfers",
            "## Treat quantization and compilation as compatibility choices",
            "## Benchmark one variable at a time",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for phrase in (
            "peak vram",
            "host ram",
            "disk",
            "throughput",
            "cache_latents",
            "cache_latents_to_disk",
            "_latent_cache",
            "source content identity",
            "in place",
            "augmentations",
            "cache_text_embeddings",
            "_t_e_cache",
            "effective caption",
            "control",
            "first-frame",
            "train_text_encoder",
            "independent",
            "gradient_checkpointing",
            "recomputes",
            "layer_offloading",
            "transfer",
            "low_vram",
            "quantization",
            "compile",
            "experimental",
            "batch_size",
            "gradient_accumulation",
            "fixed seed",
            "../reference/dataset.md",
            "../reference/training.md",
            "../reference/job-and-model.md",
            "../recipes/low-vram.md",
            "../workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_advanced_page_advanced_debugging_defines_extension_boundary(self):
        page = (
            REPOSITORY_ROOT / "docs/book/advanced/extending-and-debugging.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Keep user settings and developer APIs separate",
            "## Reproduce before instrumenting",
            "## Read the first causal error",
            "## Increase observability carefully",
            "## Isolate configuration, data, model, and resource failures",
            "## Extend toolkit code safely",
            "## Keep optimizer constructor surfaces bounded",
            "## Write a useful bug report",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for phrase in (
            "outside the user-setting contract",
            "third-party optimizer",
            "DEBUG_TOOLKIT=1",
            "anomaly detection",
            "substantially slows",
            "performance_log_every",
            "traceback",
            "first causal",
            "extension",
            "unique uid",
            "get_process",
            "AI_TOOLKIT_EXTENSIONS",
            "lazy import",
            "minimal reproduction",
            "git revision",
            "redact",
            "secrets",
            "../reference/advanced-only-settings.md",
            "../reference/optimizers-and-schedulers.md",
            "../troubleshooting/diagnosis-guide.md",
            "../recipes/diagnostic-run.md",
        ):
            self.assertIn(phrase.lower(), page.lower())


class TroubleshootingNarrativePageTests(unittest.TestCase):
    def test_advanced_troubleshooting_page_diagnosis_uses_evidence_driven_experiments(self):
        page = (
            REPOSITORY_ROOT / "docs/book/troubleshooting/diagnosis-guide.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Use the diagnosis loop",
            "## Identify the failing phase",
            "## Diagnose jobs that do not queue or start",
            "## Diagnose dataset and cache failures",
            "## Diagnose out-of-memory and slow runs",
            "## Diagnose loss and numerical failures",
            "## Diagnose weak or overfit samples",
            "## Preserve evidence and escalate",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for phrase in (
            "symptom",
            "evidence",
            "one-variable experiment",
            "blind setting changes",
            "first causal",
            "add to queue",
            "queued",
            "running",
            "gpu",
            "preflight",
            "stale cache",
            "out of memory",
            "failing phase",
            "non-finite",
            "lowest loss",
            "fixed seed",
            "overfitting",
            "minimal reproduction",
            "../workflow/queue-and-multiple-gpus.md",
            "../workflow/loss-and-checkpoints.md",
            "../workflow/sampling-and-evaluation.md",
            "../recipes/diagnostic-run.md",
            "../advanced/performance-and-caching.md",
            "common-failure-patterns.md",
        ):
            self.assertIn(phrase.lower(), page.lower())

    def test_advanced_troubleshooting_page_failures_maps_symptoms_to_evidence(self):
        page = (
            REPOSITORY_ROOT
            / "docs/book/troubleshooting/common-failure-patterns.md"
        ).read_text(encoding="utf-8")

        for heading in (
            "## Job will not queue or run",
            "## Model will not load",
            "## Dataset scan or caching fails",
            "## Run is out of memory or unexpectedly slow",
            "## Loss spikes or becomes non-finite",
            "## LoRA appears not to learn",
            "## LoRA overfits or loses prompt control",
            "## Checkpoint save or resume fails",
            "## Samples fail or comparisons disagree",
            "## Stop changing settings when evidence is incomplete",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for phrase in (
            "likely boundaries",
            "evidence to collect",
            "first experiment",
            "queue entry",
            "gpu",
            "architecture",
            "access",
            "offending item",
            "stale cache",
            "failing phase",
            "peak vram",
            "non-finite",
            "same batch",
            "trigger",
            "adapter",
            "overfitting",
            "optimizer state",
            "fixed seed",
            "one variable",
            "diagnosis-guide.md",
            "../workflow/saving-resuming-and-optimizer-state.md",
            "../workflow/sampling-and-evaluation.md",
            "../advanced/performance-and-caching.md",
        ):
            self.assertIn(phrase.lower(), page.lower())


class GlossaryNarrativePageTests(unittest.TestCase):
    def test_advanced_page_glossary_defines_core_training_terms(self):
        page = (REPOSITORY_ROOT / "docs/book/glossary.md").read_text(
            encoding="utf-8"
        )

        for heading in (
            "## A–C",
            "## D–L",
            "## M–R",
            "## S–Z",
            "## Further reading",
        ):
            self.assertEqual(page.count(heading), 1, heading)
        for term in (
            "Alpha",
            "Architecture",
            "Batch size",
            "Bucket",
            "Cache",
            "Caption dropout",
            "Checkpoint",
            "Conditioning",
            "Control",
            "Epoch",
            "Gradient accumulation",
            "Gradient checkpointing",
            "Latent",
            "Learning rate",
            "LoRA",
            "Loss",
            "Mask",
            "Noise scheduler",
            "Optimizer",
            "Overfitting",
            "Quantization",
            "Rank",
            "Resume",
            "Sampler",
            "Seed",
            "Step",
            "Text encoder",
            "Timestep",
            "Trigger",
            "VAE",
            "VRAM",
        ):
            self.assertEqual(page.count(f"### {term}"), 1, term)
        for phrase in (
            "alpha / rank",
            "peft format",
            "forces alpha to rank",
            "effective batch",
            "not the same as",
            "fixed seed",
            "lowest loss",
            "optimizer state",
            "source media",
            "getting-started/training-mental-model.md",
            "reference/network.md",
            "reference/training.md",
            "workflow/sampling-and-evaluation.md",
        ):
            self.assertIn(phrase.lower(), page.lower())


class GeneratedReferenceTests(unittest.TestCase):
    REFERENCE_PAGES = (
        "reference/job-and-model.md",
        "reference/network.md",
        "reference/training.md",
        "reference/dataset.md",
        "reference/masks-and-preservation.md",
        "reference/saving-and-sampling.md",
        "reference/optimizers-and-schedulers.md",
        "reference/advanced-only-settings.md",
    )

    def catalog_entry(self, *, setting_id="train.steps", section="training", anchor="train-steps"):
        entry = deepcopy(CatalogContractTests().valid_catalog_entry())
        entry["id"] = setting_id
        entry["section"] = section
        entry["locations"] = [
            {"kind": "yaml", "path": f"config.process[*].{setting_id}"}
        ]
        entry["source_claims"][0]["key"] = setting_id.replace(".", "_")
        entry["render"]["anchor"] = anchor
        return entry

    def typed_catalog(self, entries):
        return catalog_module.SettingsCatalog.model_validate({
            "schema_version": 2,
            "settings": entries,
        })

    def write_generator_fixture(self, root, entries):
        reference = root / "docs/book/reference"
        reference.mkdir(parents=True)
        (reference / "settings-catalog.schema.json").write_text(
            json.dumps(settings_catalog_schema()), encoding="utf-8"
        )
        (reference / "settings-catalog.json").write_text(
            json.dumps({"schema_version": 2, "settings": entries}),
            encoding="utf-8",
        )
        for page in self.REFERENCE_PAGES:
            path = root / "docs/book" / page
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                "# Fixture reference\n\n[Table of contents](../README.md)\n\n"
                "<!-- book-navigation:start -->\n"
                "<!-- book-navigation:end -->\n\n"
                "Hand-written introduction.\n\n"
                "<!-- settings-catalog:start -->\n"
                "<!-- settings-catalog:end -->\n\n"
                "<!-- book-verification:start -->\n"
                "<!-- book-verification:end -->\n",
                encoding="utf-8",
            )

    def test_generated_reference_pages_have_generated_book_blocks(self):
        footer = "Verified against ai-toolkit-experimental book revision 1 (2026-08-14)."
        for relative_page in self.REFERENCE_PAGES:
            with self.subTest(page=relative_page):
                text = (
                    REPOSITORY_ROOT / "docs/book" / relative_page
                ).read_text(encoding="utf-8")
                self.assertEqual(
                    sum(line.startswith("# ") for line in text.splitlines()), 1
                )
                self.assertEqual(text.count("[Table of contents](../README.md)"), 1)
                navigation_start = "<!-- book-navigation:start -->"
                navigation_end = "<!-- book-navigation:end -->"
                verification_start = "<!-- book-verification:start -->"
                verification_end = "<!-- book-verification:end -->"
                for marker in (
                    navigation_start, navigation_end,
                    verification_start, verification_end,
                ):
                    self.assertEqual(text.count(marker), 1)
                navigation = text[
                    text.index(navigation_start) + len(navigation_start):
                    text.index(navigation_end)
                ].strip()
                verification = text[
                    text.index(verification_start) + len(verification_start):
                    text.index(verification_end)
                ].strip()
                self.assertTrue(navigation)
                self.assertEqual(verification, footer)

    def test_generated_renderer_is_deterministic_ordered_escaped_and_anchor_stable(self):
        from scripts.training_book.markdown import render_settings_catalog_block

        later = self.catalog_entry(
            setting_id="train.zeta", section="zeta", anchor="stable-zeta"
        )
        earlier = self.catalog_entry(
            setting_id="train.alpha", section="alpha", anchor="stable-alpha"
        )
        earlier["ui_label"] = "Alpha *control* <unsafe>"
        earlier["render"]["description"] = "Uses [alpha] & <limits>."
        earlier["render"]["example"] = "alpha: `literal`"
        unsafe_section = self.catalog_entry(
            setting_id="train.unsafe",
            section="unsafe *emphasis* [label](target)",
            anchor="stable-unsafe",
        )
        catalog = self.typed_catalog([later, unsafe_section, earlier])

        first = render_settings_catalog_block(catalog.settings)
        second = render_settings_catalog_block(tuple(reversed(catalog.settings)))

        self.assertEqual(first, second)
        self.assertLess(first.index("## Alpha"), first.index("## Zeta"))
        self.assertIn('<a id="stable-alpha"></a>', first)
        self.assertIn("Alpha \\*control\\* &lt;unsafe&gt;", first)
        self.assertIn("Uses \\[alpha\\] &amp; &lt;limits&gt;.", first)
        self.assertIn("alpha: `literal`", first)
        self.assertIn(
            "## Unsafe \\*Emphasis\\* \\[Label\\](Target)", first
        )
        self.assertNotIn("## Unsafe *Emphasis* [Label](Target)", first)

    def test_generated_renderer_rejects_duplicate_anchors(self):
        from scripts.training_book.markdown import (
            MarkdownGenerationError,
            render_settings_catalog_block,
        )

        first = self.catalog_entry(setting_id="train.first", anchor="duplicate")
        second = self.catalog_entry(setting_id="train.second", anchor="duplicate")

        with self.assertRaisesRegex(MarkdownGenerationError, "duplicate.*anchor"):
            render_settings_catalog_block(self.typed_catalog([first, second]).settings)

    def test_generated_reference_partition_is_closed_and_matches_live_catalog(self):
        from scripts.generate_training_book_reference import (
            CANONICAL_DEFERRED_ASSIGNMENTS,
            ReferenceGenerationError,
            partition_reference_settings,
        )

        cases = []
        unknown = self.catalog_entry()
        unknown["render"]["page"] = "reference/training-typo.md"
        cases.append(("unknown page", [unknown], (), "unexpected.*training-typo"))

        extra = self.catalog_entry()
        extra["render"]["page"] = "models/anima.md"
        cases.append(("extra deferred row", [extra], (), "unexpected.*models/anima"))

        moved = self.catalog_entry()
        moved["render"]["page"] = "models/wan.md"
        cases.append((
            "moved deferred row",
            [moved],
            (("train.steps", "models/anima.md"),),
            "unexpected.*models/wan.*missing.*models/anima",
        ))

        missing = self.catalog_entry()
        cases.append((
            "missing deferred row",
            [missing],
            (("train.steps", "models/anima.md"),),
            "missing.*models/anima",
        ))

        for label, entries, expected_deferred, message in cases:
            with self.subTest(label=label):
                with self.assertRaisesRegex(ReferenceGenerationError, message):
                    partition_reference_settings(
                        self.typed_catalog(entries).settings,
                        expected_deferred_assignments=expected_deferred,
                    )

        entry = self.catalog_entry()
        for label, expected_deferred, message in (
            (
                "duplicate expected pair",
                (("train.steps", "models/anima.md"),) * 2,
                "duplicate.*deferred",
            ),
            (
                "overlapping expected pages",
                (
                    ("train.steps", "models/anima.md"),
                    ("train.steps", "models/wan.md"),
                ),
                "multiple deferred pages",
            ),
            (
                "overlap with immediate page",
                (("train.steps", "reference/training.md"),),
                "overlaps.*Task 7",
            ),
        ):
            with self.subTest(label=label):
                with self.assertRaisesRegex(ReferenceGenerationError, message):
                    partition_reference_settings(
                        self.typed_catalog([entry]).settings,
                        expected_deferred_assignments=expected_deferred,
                    )

        live_catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json",
            None,
        )
        immediate, deferred = partition_reference_settings(
            live_catalog.settings,
            expected_deferred_assignments=CANONICAL_DEFERRED_ASSIGNMENTS,
        )
        immediate_ids = {
            setting.id for settings in immediate.values() for setting in settings
        }
        deferred_ids = {setting_id for setting_id, _ in deferred}
        catalog_ids = {setting.id for setting in live_catalog.settings}
        self.assertEqual(
            sum(len(settings) for settings in immediate.values()),
            len(live_catalog.settings) - len(CANONICAL_DEFERRED_ASSIGNMENTS),
        )
        self.assertTrue(immediate_ids.isdisjoint(deferred_ids))
        self.assertEqual(immediate_ids | deferred_ids, catalog_ids)
        self.assertEqual(deferred, CANONICAL_DEFERRED_ASSIGNMENTS)
        self.assertEqual(len(deferred), 10)

        added = self.typed_catalog([
            self.catalog_entry(
                setting_id="train.new_catalog_setting",
                anchor="train-new-catalog-setting",
            )
        ]).settings[0]
        expanded_immediate, expanded_deferred = partition_reference_settings(
            (*live_catalog.settings, added),
            expected_deferred_assignments=CANONICAL_DEFERRED_ASSIGNMENTS,
        )
        self.assertEqual(
            sum(len(settings) for settings in expanded_immediate.values()),
            len(live_catalog.settings) + 1 - len(CANONICAL_DEFERRED_ASSIGNMENTS),
        )
        self.assertEqual(expanded_deferred, CANONICAL_DEFERRED_ASSIGNMENTS)

    def test_generated_marker_rewrite_preserves_handwritten_text(self):
        from scripts.training_book.markdown import replace_settings_catalog_block

        original = (
            "# Hand-written title\n\nBefore.\n\n"
            "<!-- settings-catalog:start -->\nold generated text\n"
            "<!-- settings-catalog:end -->\n\nAfter.\n"
        )
        block = "<!-- settings-catalog:start -->\nnew generated text\n<!-- settings-catalog:end -->"

        rewritten = replace_settings_catalog_block(original, block)

        self.assertEqual(
            rewritten,
            original.replace(
                "<!-- settings-catalog:start -->\nold generated text\n"
                "<!-- settings-catalog:end -->",
                block,
            ),
        )
        self.assertEqual(replace_settings_catalog_block(rewritten, block), rewritten)

    def test_generated_reference_check_detects_drift_and_processes_all_eight_pages(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_reference_pages,
        )

        entry = self.catalog_entry()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_generator_fixture(root, [entry])
            original = {
                page: (root / "docs/book" / page).read_text(encoding="utf-8")
                for page in self.REFERENCE_PAGES
            }

            generate_reference_pages(
                root, check=False, expected_deferred_assignments=()
            )
            generated = {
                page: (root / "docs/book" / page).read_text(encoding="utf-8")
                for page in self.REFERENCE_PAGES
            }
            self.assertTrue(all(
                text.count("<!-- settings-catalog:start -->") == 1
                and text.count("<!-- settings-catalog:end -->") == 1
                and "Hand-written introduction." in text
                for text in generated.values()
            ))
            for page in self.REFERENCE_PAGES:
                original_prefix, original_suffix = original[page].split(
                    "<!-- settings-catalog:start -->", 1
                )[0], original[page].split("<!-- settings-catalog:end -->", 1)[1]
                generated_prefix, generated_suffix = generated[page].split(
                    "<!-- settings-catalog:start -->", 1
                )[0], generated[page].split("<!-- settings-catalog:end -->", 1)[1]
                self.assertEqual(
                    (generated_prefix, generated_suffix),
                    (original_prefix, original_suffix),
                    f"settings generation changed scaffold outside its marker on {page}",
                )
            masks_block = generated["reference/masks-and-preservation.md"].split(
                "<!-- settings-catalog:start -->", 1
            )[1].split("<!-- settings-catalog:end -->", 1)[0]
            self.assertEqual(
                masks_block,
                "\n<!-- generated; edit settings-catalog.json instead -->\n",
            )
            generate_reference_pages(
                root, check=True, expected_deferred_assignments=()
            )

            training = root / "docs/book/reference/training.md"
            training.write_text(
                generated["reference/training.md"].replace(
                    "Sets the total target optimizer step count.", "altered line"
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(
                ReferenceGenerationError, "generated reference drift.*training.md"
            ):
                generate_reference_pages(
                    root, check=True, expected_deferred_assignments=()
                )

    def test_generated_reference_write_is_atomic_when_a_late_page_is_malformed(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_reference_pages,
        )

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_generator_fixture(root, [self.catalog_entry()])
            early_page = root / "docs/book/reference/job-and-model.md"
            late_page = root / "docs/book/reference/advanced-only-settings.md"
            early_before = early_page.read_bytes()
            late_page.write_text(
                late_page.read_text(encoding="utf-8").replace(
                    "<!-- settings-catalog:end -->", ""
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                ReferenceGenerationError,
                "advanced-only-settings.md.*exactly one.*marker pair",
            ):
                generate_reference_pages(
                    root, check=False, expected_deferred_assignments=()
                )

            self.assertEqual(
                early_page.read_bytes(),
                early_before,
                "a late validation error must not leave an earlier page rewritten",
            )

    def test_generated_reference_parity_is_part_of_the_repository_validator(self):
        validator = (
            REPOSITORY_ROOT / "scripts/validate_training_book.py"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "generate_reference_pages(repository_root, check=True)", validator
        )

    def model_fact_owner(self, setting_id, fact):
        return catalog_module.UiFactOwner.model_validate({
            "setting_id": setting_id,
            "fact": fact,
        })

    def model_fact_fixture(self):
        architecture = "fixture_image"
        owners = []
        value_fields = {
            "label": {"kind": "string", "value": "Fixture Image"},
            "group": {"kind": "string", "value": "image"},
            "controls": {
                "kind": "array",
                "items": [{"kind": "string", "value": "control_path"}],
            },
            "disable_sections": {
                "kind": "array",
                "items": [{"kind": "string", "value": "network.conv"}],
            },
            "additional_sections": {
                "kind": "array",
                "items": [
                    {"kind": "string", "value": "model.low_vram"},
                    {"kind": "string", "value": "model.layer_offloading"},
                ],
            },
        }
        for field, value in value_fields.items():
            owners.append(self.model_fact_owner(
                "ui.architecture.fixture-image",
                {
                    "fact_type": "architecture-field",
                    "architecture": architecture,
                    "field": field,
                    "payload": {"payload_kind": "value", "value": value},
                },
            ))
        for field, value in (
            ("model_path", "org/fixture-image"),
            ("gate_url", "https://example.invalid/fixture-image"),
            ("is_video_model", False),
        ):
            owners.append(self.model_fact_owner(
                "ui.architecture.fixture-image",
                {
                    "fact_type": "architecture-field",
                    "architecture": architecture,
                    "field": field,
                    "payload": {
                        "payload_kind": "presence",
                        "value": {
                            "present": True,
                            "value": {
                                "kind": "boolean" if isinstance(value, bool) else "string",
                                "value": value,
                            },
                        },
                    },
                },
            ))
        defaults = (
            ("model.quantize", "config.process[*].model.quantize", True),
            ("model.low_vram", "config.process[*].model.low_vram", True),
            ("train.noise_scheduler", "config.process[*].train.noise_scheduler", "flowmatch"),
            ("dataset.fps", "config.process[*].datasets[*].fps", 16),
            ("sample.num_frames", "config.process[*].sample.num_frames", 41),
        )
        for setting_id, path, value in defaults:
            kind = "boolean" if isinstance(value, bool) else (
                "number" if isinstance(value, int) else "string"
            )
            owners.append(self.model_fact_owner(setting_id, {
                "fact_type": "architecture-default",
                "architecture": architecture,
                "declaration_path": path,
                "path": path,
                "selected": {
                    "present": True,
                    "value": {"kind": kind, "value": value},
                },
                "unselected": {"present": False},
            }))
        deferred = self.catalog_entry(
            setting_id="model.fixture.model_kwargs.incompatible_mode",
            section="model-architecture",
            anchor="model-fixture-incompatible-mode",
        )
        deferred["render"]["page"] = "models/anima.md"
        return SimpleNamespace(
            settings=self.typed_catalog([deferred]).settings,
            ui_claims=tuple(owners),
        )

    def write_model_fact_page(self, root, relative_page):
        page = root / "docs/book" / relative_page
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(
            "# Fixture model\n\n[Table of contents](../README.md)\n\n"
            "<!-- book-navigation:start -->\n"
            "<!-- book-navigation:end -->\n\n"
            "Hand-written model guidance.\n\n"
            "<!-- model-facts:start -->\n"
            "<!-- model-facts:end -->\n\n"
            "<!-- book-verification:start -->\n"
            "<!-- book-verification:end -->\n",
            encoding="utf-8",
        )
        return page

    def test_model_fact_generator_renders_exact_focused_catalog_facts(self):
        from scripts.generate_training_book_reference import (
            MODEL_PAGE_ARCHITECTURES,
            render_model_facts_block,
        )

        self.assertEqual(MODEL_PAGE_ARCHITECTURES, {
            "models/anima.md": ("anima",),
            "models/flux-and-flex.md": ("flux", "flux_kontext", "flex1"),
            "models/qwen-image-and-edit.md": (
                "qwen_image", "qwen_image:2512", "qwen_image_edit",
                "qwen_image_edit_plus", "qwen_image_edit_plus:2511",
            ),
            "models/sdxl-and-sd15.md": ("sdxl", "sd15"),
            "models/wan.md": ("wan21:1b", "wan22_14b:t2v"),
        })
        catalog = self.model_fact_fixture()
        first = render_model_facts_block(
            catalog, "models/anima.md", ("fixture_image",)
        )
        reversed_catalog = SimpleNamespace(
            settings=tuple(reversed(catalog.settings)),
            ui_claims=tuple(reversed(catalog.ui_claims)),
        )
        self.assertEqual(
            first,
            render_model_facts_block(
                reversed_catalog, "models/anima.md", ("fixture_image",)
            ),
        )
        payload = json.loads(first.split("```json\n", 1)[1].split("\n```", 1)[0])
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(
            tuple(item["id"] for item in payload["architectures"]),
            ("fixture_image",),
        )
        facts = payload["architectures"][0]["facts"]
        self.assertEqual(len(facts), len(catalog.ui_claims))
        serialized = json.dumps(facts, sort_keys=True)
        for required in (
            "org/fixture-image", "https://example.invalid/fixture-image",
            "flowmatch", "control_path", "model.low_vram",
            "model.layer_offloading", "dataset.fps", "sample.num_frames",
            "network.conv",
        ):
            self.assertIn(required, serialized)
        self.assertEqual(
            tuple(item["id"] for item in payload["deferred_settings"]),
            ("model.fixture.model_kwargs.incompatible_mode",),
        )
        self.assertNotIn("preset", first.lower())
        self.assertNotIn("quality", first.lower())

    def test_model_fact_generator_writes_checks_and_preserves_prose(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_model_fact_pages,
        )

        catalog = self.model_fact_fixture()
        mapping = {"models/anima.md": ("fixture_image",)}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = self.write_model_fact_page(root, "models/anima.md")
            original = page.read_text(encoding="utf-8")
            generate_model_fact_pages(
                root, catalog, check=False, page="models/anima.md",
                model_page_architectures=mapping,
            )
            generated = page.read_text(encoding="utf-8")
            self.assertIn('"id": "fixture_image"', generated)
            self.assertEqual(
                original.split("<!-- model-facts:start -->", 1)[0],
                generated.split("<!-- model-facts:start -->", 1)[0],
            )
            self.assertEqual(
                original.split("<!-- model-facts:end -->", 1)[1],
                generated.split("<!-- model-facts:end -->", 1)[1],
            )
            generate_model_fact_pages(
                root, catalog, check=True, page="models/anima.md",
                model_page_architectures=mapping,
            )
            page.write_text(generated.replace("fixture_image", "drift", 1))
            with self.assertRaisesRegex(
                ReferenceGenerationError, "generated model-fact drift.*models/anima.md"
            ):
                generate_model_fact_pages(
                    root, catalog, check=True, page="models/anima.md",
                    model_page_architectures=mapping,
                )

    def test_model_fact_generator_page_selector_is_closed(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            validate_model_page_selector,
        )

        mapping = {"models/anima.md": ("anima",)}
        self.assertEqual(
            validate_model_page_selector("models/anima.md", mapping),
            "models/anima.md",
        )
        for candidate in (
            "", "reference/training.md", "/models/anima.md",
            "models/../models/anima.md", "models/missing.md",
            "models\\anima.md",
        ):
            with self.subTest(candidate=candidate), self.assertRaises(
                ReferenceGenerationError
            ):
                validate_model_page_selector(candidate, mapping)

    def test_model_fact_generator_full_write_is_atomic_on_late_error(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_model_fact_pages,
        )

        catalog = self.model_fact_fixture()
        mapping = {
            "models/anima.md": ("fixture_image",),
            "models/wan.md": ("fixture_image",),
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            early = self.write_model_fact_page(root, "models/anima.md")
            late = self.write_model_fact_page(root, "models/wan.md")
            early_before = early.read_bytes()
            late.write_text(
                late.read_text(encoding="utf-8").replace(
                    "<!-- model-facts:end -->", ""
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(
                ReferenceGenerationError,
                "models/wan.md|exactly one model-facts marker pair",
            ):
                generate_model_fact_pages(
                    root, catalog, check=False,
                    model_page_architectures=mapping,
                )
            self.assertEqual(early.read_bytes(), early_before)

    def test_model_fact_generator_full_mode_confines_every_mapping_key(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_model_fact_pages,
        )

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "docs/book/models").mkdir(parents=True)
            victim = self.write_model_fact_page(root, "../../victim.md")
            before = victim.read_bytes()
            with self.assertRaises(ReferenceGenerationError):
                generate_model_fact_pages(
                    root,
                    self.model_fact_fixture(),
                    check=False,
                    model_page_architectures={
                        "models/../../../victim.md": ("fixture_image",),
                    },
                )
            self.assertEqual(victim.read_bytes(), before)

    def test_model_fact_generator_full_reference_and_model_write_is_atomic(self):
        from scripts.generate_training_book_reference import (
            ReferenceGenerationError,
            generate_reference_pages,
        )

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_generator_fixture(root, [self.catalog_entry()])
            reference = root / "docs/book/reference/job-and-model.md"
            before = reference.read_bytes()
            self.write_model_fact_page(root, "models/anima.md")
            with self.assertRaisesRegex(
                ReferenceGenerationError,
                "models/anima.md.*no UI facts",
            ):
                generate_reference_pages(
                    root,
                    check=False,
                    expected_deferred_assignments=(),
                )
            self.assertEqual(reference.read_bytes(), before)


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

    def test_book_readme_is_the_complete_landing_page(self):
        readme = (REPOSITORY_ROOT / "docs/book/README.md").read_text(encoding="utf-8")

        self.assertEqual(
            sum(line.startswith("# ") for line in readme.splitlines()), 1
        )
        for heading in (
            "## Beginner", "## Dataset", "## Recipes", "## Model families",
            "## Reference", "## Advanced", "## Troubleshooting", "## Examples",
            "## Verification",
        ):
            self.assertIn(heading, readme)
        self.assertIn("start", readme.lower())
        self.assertIn("evidence", readme.lower())
        for marker in (
            "<!-- book-navigation:start -->",
            "<!-- book-navigation:end -->",
            "<!-- book-verification:start -->",
            "<!-- book-verification:end -->",
        ):
            self.assertEqual(readme.count(marker), 1)

    def test_repository_markdown_tree_exactly_matches_manifest_with_skip_smoke(self):
        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")
        smoke_path = REPOSITORY_ROOT / "docs/book/verification/first-run-smoke.md"
        actual = {
            path.relative_to(REPOSITORY_ROOT / "docs/book").as_posix()
            for path in (REPOSITORY_ROOT / "docs/book").rglob("*.md")
        }
        expected = set(BOOK_PAGES)
        if not smoke_path.exists():
            expected.remove("verification/first-run-smoke.md")

        self.assertEqual(actual, expected)
        self.assertEqual(tuple(page.path for page in manifest.pages), BOOK_PAGES)

    def test_existing_repository_smoke_record_matches_the_current_edition(self):
        record = REPOSITORY_ROOT / "docs/book/verification/first-run-smoke.md"
        if not record.exists():
            self.skipTest("supported-GPU smoke has not been recorded yet")
        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")

        validate_smoke_record(REPOSITORY_ROOT, manifest)

    def test_every_existing_page_has_generated_navigation_footer_and_valid_links(self):
        from scripts.training_book.markdown import validate_book_pages

        manifest = load_book_manifest(REPOSITORY_ROOT / "docs/book/book-manifest.json")
        validate_book_pages(
            REPOSITORY_ROOT / "docs/book", manifest, skip_smoke=True
        )

    def test_navigation_generator_check_accepts_the_canonical_book(self):
        result = subprocess.run(
            [sys.executable, "scripts/generate_training_book_navigation.py", "--check"],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_validation_cli_accepts_the_canonical_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            facts_path = Path(directory) / "preset-facts.json"
            facts_path.write_text(
                json.dumps({
                    "schema_version": 1,
                    "presets": load_production_training_book_preset_facts(),
                }),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--skip-smoke",
                    "--preset-facts",
                    facts_path,
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_validation_cli_rejects_failed_smoke_unless_explicitly_skipped(self):
        smoke_path = REPOSITORY_ROOT / "docs/book/verification/first-run-smoke.md"
        original_smoke = smoke_path.read_text(encoding="utf-8")
        failed_smoke = original_smoke.replace(
            '"status": "passed"', '"status": "failed"', 1
        )
        self.assertNotEqual(failed_smoke, original_smoke)
        with tempfile.TemporaryDirectory() as directory:
            facts_path = Path(directory) / "preset-facts.json"
            facts_path.write_text(
                json.dumps({
                    "schema_version": 1,
                    "presets": load_production_training_book_preset_facts(),
                }),
                encoding="utf-8",
            )
            base = [
                sys.executable,
                "scripts/validate_training_book.py",
                "--preset-facts",
                facts_path,
            ]
            try:
                smoke_path.write_text(failed_smoke, encoding="utf-8")
                required = subprocess.run(
                    base,
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                skipped = subprocess.run(
                    [*base, "--skip-smoke"],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
            finally:
                smoke_path.write_text(original_smoke, encoding="utf-8")

        self.assertNotEqual(required.returncode, 0)
        self.assertIn("status", required.stderr)
        self.assertEqual(skipped.returncode, 0, skipped.stdout + skipped.stderr)

    def test_validation_cli_rejects_preset_facts_recipe_membership_drift(self):
        presets = [dict(row) for row in load_production_training_book_preset_facts()]
        presets[0]["name"] = "Drifted preset name"
        with tempfile.TemporaryDirectory() as directory:
            facts_path = Path(directory) / "preset-facts.json"
            facts_path.write_text(
                json.dumps({"schema_version": 1, "presets": presets}),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_training_book.py",
                    "--skip-smoke",
                    "--preset-facts",
                    facts_path,
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("preset", result.stderr.lower())

    def test_validation_cli_rejects_noninteger_preset_facts_schema_versions(self):
        presets = load_production_training_book_preset_facts()
        for schema_version in (True, 1.0):
            with self.subTest(schema_version=schema_version), tempfile.TemporaryDirectory() as directory:
                facts_path = Path(directory) / "preset-facts.json"
                facts_path.write_text(
                    json.dumps({"schema_version": schema_version, "presets": presets}),
                    encoding="utf-8",
                )
                result = subprocess.run(
                    [
                        sys.executable,
                        "scripts/validate_training_book.py",
                        "--skip-smoke",
                        "--preset-facts",
                        facts_path,
                    ],
                    cwd=REPOSITORY_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("preset facts have an invalid envelope", result.stderr)

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
                "scripts/generate_training_book_reference.py",
                "scripts/generate_training_book_navigation.py",
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

    def test_package_runner_exposes_the_complete_smoke_required_execution_plan(self):
        runner = REPOSITORY_ROOT / "ui/testing/runTrainingBookTests.mjs"
        package = json.loads(
            (REPOSITORY_ROOT / "ui/package.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            package["scripts"]["test:training-book"],
            "node testing/runTrainingBookTests.mjs --require-smoke",
        )

        result = subprocess.run(
            ["node", runner, "--require-smoke", "--describe-plan"],
            cwd=REPOSITORY_ROOT / "ui",
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        plan = json.loads(result.stdout)

        cleanup_target = Path(plan["cleanup_target"])
        temporary_root = Path(tempfile.gettempdir()).resolve()
        self.assertEqual(cleanup_target.parent.resolve(), temporary_root)
        self.assertTrue(cleanup_target.name.startswith("ai-toolkit-training-book-"))
        self.assertFalse(cleanup_target.exists())
        ui_facts = Path(plan["ui_facts"])
        preset_facts = Path(plan["preset_facts"])
        self.assertNotEqual(ui_facts, preset_facts)
        self.assertEqual(ui_facts.parent, cleanup_target)
        self.assertEqual(preset_facts.parent, cleanup_target)

        commands = plan["commands"]
        by_phase = {}
        for command in commands:
            by_phase.setdefault(command["phase"], []).append(command)

        testing_root = REPOSITORY_ROOT / "ui/testing"
        expected_sources = sorted({
            path.name
            for pattern in (
                "trainingBook*.test.ts",
                "trainingBook*.test.tsx",
                "trainingGuideLink.test.ts",
                "trainingGuideLink.test.tsx",
            )
            for path in testing_root.glob(pattern)
        })
        self.assertEqual(
            [command["phase"] for command in commands],
            [
                "compile-typescript",
                *["compiled-test"] * len(expected_sources),
                "emit-ui-facts",
                "emit-preset-facts",
                "reference-check",
                "navigation-check",
                "full-validation",
                "python-units",
            ],
        )
        for phase in (
            "compile-typescript",
            "emit-ui-facts",
            "emit-preset-facts",
        ):
            with self.subTest(phase=phase):
                self.assertIn(
                    Path(by_phase[phase][0]["command"]).name,
                    ("node", "node.exe"),
                )
        for phase in (
            "reference-check",
            "navigation-check",
            "full-validation",
            "python-units",
        ):
            with self.subTest(phase=phase):
                self.assertEqual(by_phase[phase][0]["command"], "python")
        self.assertEqual(
            by_phase["compile-typescript"][0]["args"],
            [
                str(REPOSITORY_ROOT / "ui/node_modules/typescript/bin/tsc"),
                "--project",
                "testing/tsconfig.trainingBook.json",
                "--outDir",
                str(cleanup_target),
            ],
        )
        compiled_tests = by_phase["compiled-test"]
        self.assertEqual(
            [command["source"] for command in compiled_tests], expected_sources
        )
        for command in compiled_tests:
            self.assertIn(Path(command["command"]).name, ("node", "node.exe"))
            self.assertEqual(
                Path(command["args"][0]),
                cleanup_target / "testing" / re.sub(r"\.tsx?$", ".js", command["source"]),
            )
            self.assertEqual(
                command["env"],
                {"TRAINING_BOOK_REPOSITORY_ROOT": str(REPOSITORY_ROOT)},
            )

        ui_emitter = by_phase["emit-ui-facts"][0]
        self.assertEqual(ui_emitter["args"][0], "-e")
        self.assertIn(str(ui_facts), ui_emitter["args"][1])
        self.assertIn("writeTrainingBookUiFacts", ui_emitter["args"][1])
        self.assertEqual(
            by_phase["reference-check"][0]["args"],
            [str(REPOSITORY_ROOT / "scripts/generate_training_book_reference.py"), "--check"],
        )
        self.assertEqual(
            by_phase["navigation-check"][0]["args"],
            [str(REPOSITORY_ROOT / "scripts/generate_training_book_navigation.py"), "--check"],
        )
        self.assertEqual(
            by_phase["emit-preset-facts"][0]["args"],
            [
                str(REPOSITORY_ROOT / "ui/testing/runTrainingPresetCatalogBuildValidation.mjs"),
                "--emit-book-facts",
                str(preset_facts),
            ],
        )
        validator = by_phase["full-validation"][0]
        self.assertEqual(
            validator["args"],
            [
                str(REPOSITORY_ROOT / "scripts/validate_training_book.py"),
                "--check-discovery",
                "--ui-facts",
                str(ui_facts),
                "--preset-facts",
                str(preset_facts),
            ],
        )
        self.assertNotIn("--skip-smoke", validator["args"])
        python_units = by_phase["python-units"][0]
        self.assertEqual(
            python_units["args"],
            [str(REPOSITORY_ROOT / "testing/training_book_validation_test.py")],
        )
        self.assertEqual(
            python_units["env"],
            {
                "TRAINING_BOOK_UI_FACTS_PATH": str(ui_facts),
                "TRAINING_BOOK_PRESET_FACTS_PATH": str(preset_facts),
            },
        )

    def test_runner_rejects_unknown_duplicate_and_incompatible_smoke_flags(self):
        runner = REPOSITORY_ROOT / "ui/testing/runTrainingBookTests.mjs"
        for arguments in (
            ("--skip-smoke", "--skip-smoke"),
            ("--require-smoke", "--require-smoke"),
            ("--skip-smoke", "--require-smoke"),
            ("--full",),
        ):
            with self.subTest(arguments=arguments):
                result = subprocess.run(
                    ["node", runner, *arguments],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Unknown or incompatible", result.stderr)


class NavigationGenerationContractTests(unittest.TestCase):
    FOOTER = "Verified against ai-toolkit-experimental book revision 1 (2026-08-14)."

    def write_generator_manifest(self, root, paths):
        book_root = root / "docs/book"
        book_root.mkdir(parents=True, exist_ok=True)
        pages = [
            {
                "path": path,
                "previous": paths[index - 1] if index else None,
                "next": paths[index + 1] if index + 1 < len(paths) else None,
            }
            for index, path in enumerate(paths)
        ]
        (book_root / "book-manifest.json").write_text(
            json.dumps({
                "schema_version": 1,
                "book_revision": 1,
                "verified_date": "2026-08-14",
                "pages": pages,
                "preset_architectures": ["fixture"],
                "focused_architectures": ["fixture"],
                "full_architectures": ["fixture"],
                "required_footer": self.FOOTER,
            }),
            encoding="utf-8",
        )
        return book_root

    def generator_page(self, title="Fixture", *, valid=True):
        verification_end = (
            "<!-- book-verification:end -->\n" if valid else ""
        )
        return (
            f"# {title}\n\nHand-written prose.\n\n"
            "<!-- book-navigation:start -->\nstale navigation\n"
            "<!-- book-navigation:end -->\n\n"
            "<!-- book-verification:start -->\nstale footer\n"
            f"{verification_end}"
        )

    def test_marker_replacement_changes_only_owned_blocks(self):
        from scripts.training_book.markdown import replace_book_blocks

        original = (
            "# Hand-written title\n\nHand-written prose.\n\n"
            "<!-- book-navigation:start -->\nstale navigation\n"
            "<!-- book-navigation:end -->\n\nMore prose.\n\n"
            "<!-- book-verification:start -->\nstale footer\n"
            "<!-- book-verification:end -->\n"
        )
        rendered = replace_book_blocks(
            original,
            navigation="[Previous](previous.md) | [Next](next.md)",
            verification="Verified fixture.",
        )

        self.assertEqual(
            rendered,
            original.replace("stale navigation", "[Previous](previous.md) | [Next](next.md)")
            .replace("stale footer", "Verified fixture."),
        )

    def test_marker_replacement_rejects_missing_duplicate_or_reordered_markers(self):
        from scripts.training_book.markdown import (
            MarkdownGenerationError,
            replace_book_blocks,
        )

        valid = (
            "# Fixture\n\n<!-- book-navigation:start -->\n<!-- book-navigation:end -->\n\n"
            "<!-- book-verification:start -->\n<!-- book-verification:end -->\n"
        )
        invalid_documents = (
            valid.replace("<!-- book-navigation:start -->\n", ""),
            valid.replace(
                "<!-- book-navigation:start -->",
                "<!-- book-navigation:start -->\n<!-- book-navigation:start -->",
            ),
            valid.replace("book-navigation:start", "book-verification:start", 1),
        )
        for document in invalid_documents:
            with self.subTest(document=document), self.assertRaises(MarkdownGenerationError):
                replace_book_blocks(document, navigation="nav", verification="footer")

    def test_validator_requires_explicit_skip_for_missing_smoke_page(self):
        if (REPOSITORY_ROOT / "docs/book/verification/first-run-smoke.md").exists():
            self.skipTest("canonical repository now contains the observed smoke record")
        with tempfile.TemporaryDirectory() as directory:
            facts_path = Path(directory) / "preset-facts.json"
            facts_path.write_text(
                json.dumps({
                    "schema_version": 1,
                    "presets": load_production_training_book_preset_facts(),
                }),
                encoding="utf-8",
            )
            base = [
                sys.executable,
                "scripts/validate_training_book.py",
                "--preset-facts",
                facts_path,
            ]
            required = subprocess.run(
                base,
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            skipped = subprocess.run(
                [*base, "--skip-smoke"],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(required.returncode, 0)
        self.assertIn("verification/first-run-smoke.md", required.stderr)
        self.assertEqual(skipped.returncode, 0, skipped.stdout + skipped.stderr)

    def test_skip_smoke_allows_but_does_not_require_an_existing_smoke_page(self):
        from scripts.training_book.markdown import validate_book_pages

        footer = "Verified against ai-toolkit-experimental book revision 1 (2026-08-14)."
        manifest = SimpleNamespace(
            required_footer=footer,
            pages=(
                SimpleNamespace(
                    path="README.md", previous=None,
                    next="verification/first-run-smoke.md",
                ),
                SimpleNamespace(
                    path="verification/first-run-smoke.md",
                    previous="README.md", next=None,
                ),
            ),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            smoke = root / "verification/first-run-smoke.md"
            smoke.parent.mkdir()
            (root / "README.md").write_text(
                "# Fixture book\n\n<!-- book-navigation:start -->\n"
                "[Next →](verification/first-run-smoke.md)\n"
                "<!-- book-navigation:end -->\n\n<!-- book-verification:start -->\n"
                f"{footer}\n<!-- book-verification:end -->\n",
                encoding="utf-8",
            )
            smoke.write_text(
                "# Smoke\n\n[Table of contents](../README.md)\n\n"
                "<!-- book-navigation:start -->\n[← Previous](../README.md)\n"
                "<!-- book-navigation:end -->\n\n<!-- book-verification:start -->\n"
                f"{footer}\n<!-- book-verification:end -->\n",
                encoding="utf-8",
            )

            validate_book_pages(root, manifest, skip_smoke=True)

    def test_generator_rejects_absolute_and_traversal_paths_without_outside_mutation(self):
        from scripts.generate_training_book_navigation import generate_navigation

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repository"
            outside = Path(directory) / "outside.md"
            outside.write_text(self.generator_page("Outside"), encoding="utf-8")
            before = outside.read_bytes()
            for unsafe_path in (str(outside), "../../outside.md"):
                with self.subTest(path=unsafe_path):
                    self.write_generator_manifest(root, [unsafe_path])
                    with self.assertRaisesRegex(ValueError, "path"):
                        generate_navigation(root, check=False)
                    self.assertEqual(outside.read_bytes(), before)

    def test_generator_rejects_symlink_escape_without_outside_mutation(self):
        from scripts.generate_training_book_navigation import generate_navigation

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repository"
            book_root = self.write_generator_manifest(root, ["README.md"])
            outside = Path(directory) / "outside.md"
            outside.write_text(self.generator_page("Outside"), encoding="utf-8")
            before = outside.read_bytes()
            (book_root / "README.md").symlink_to(outside)

            with self.assertRaisesRegex(ValueError, "escapes"):
                generate_navigation(root, check=False)

            self.assertEqual(outside.read_bytes(), before)

    def test_generator_validates_every_page_before_changing_any_page(self):
        from scripts.generate_training_book_navigation import generate_navigation
        from scripts.training_book.markdown import MarkdownGenerationError

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            book_root = self.write_generator_manifest(
                root, ["README.md", "guide.md"]
            )
            first = book_root / "README.md"
            second = book_root / "guide.md"
            first.write_text(self.generator_page("First"), encoding="utf-8")
            second.write_text(
                self.generator_page("Malformed", valid=False), encoding="utf-8"
            )
            before = first.read_bytes()

            with self.assertRaises(MarkdownGenerationError):
                generate_navigation(root, check=False)

            self.assertEqual(first.read_bytes(), before)

    def test_generator_check_rejects_missing_non_smoke_page(self):
        from scripts.generate_training_book_navigation import generate_navigation

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            book_root = self.write_generator_manifest(
                root, ["README.md", "guide.md", "verification/first-run-smoke.md"]
            )
            (book_root / "README.md").write_text(
                self.generator_page("Landing"), encoding="utf-8"
            )

            with self.assertRaisesRegex(FileNotFoundError, "guide[.]md"):
                generate_navigation(root, check=True)

    def test_generator_atomic_write_failure_preserves_page_and_cleans_temp_file(self):
        from scripts.generate_training_book_navigation import generate_navigation

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            book_root = self.write_generator_manifest(root, ["README.md"])
            page = book_root / "README.md"
            page.write_text(self.generator_page("Landing"), encoding="utf-8")
            before = page.read_bytes()

            with mock.patch(
                "scripts.generate_training_book_navigation.os.replace",
                side_effect=OSError("fixture replace failure"),
            ), self.assertRaisesRegex(OSError, "fixture replace failure"):
                generate_navigation(root, check=False)

            self.assertEqual(page.read_bytes(), before)
            self.assertEqual(
                sorted(path.name for path in book_root.iterdir()),
                ["README.md", "book-manifest.json"],
            )


class TrainingBookExamplesContractTests(unittest.TestCase):
    EXPECTED = (
        ("first-lora-flex1.yaml", "flex1", "image-lora"),
        ("character-anima.yaml", "anima", "image-lora"),
        ("style-flux.yaml", "flux", "image-lora"),
        ("flux-kontext-edit.yaml", "flux_kontext", "image-edit-lora"),
        ("object-qwen-image.yaml", "qwen_image", "image-lora"),
        ("focused-refinement-qwen-image-edit-2509.yaml", "qwen_image_edit_plus", "image-edit-lora"),
        ("low-vram-anima.yaml", "anima", "image-lora"),
        ("diagnostic-wan21-1b.yaml", "wan21:1b", "video-lora"),
        ("character-sdxl.yaml", "sdxl", "image-lora"),
        ("character-sd15.yaml", "sd15", "image-lora"),
        ("motion-wan22-14b-t2v.yaml", "wan22_14b:t2v", "video-lora"),
        ("masked-refinement.yaml", "anima", "masked-image-lora"),
        ("resume-from-checkpoint.yaml", "flex1", "resume-image-lora"),
    )

    def write_resume_source_fixture(
        self, directory, sd_source, base_source=None, process_source=None,
        job_source=None,
    ):
        repository = Path(directory)
        sd_target = repository / "jobs/process/BaseSDTrainProcess.py"
        base_target = repository / "jobs/process/BaseTrainProcess.py"
        process_target = repository / "jobs/process/BaseProcess.py"
        job_target = repository / "jobs/BaseJob.py"
        sd_target.parent.mkdir(parents=True)
        sd_target.write_text(sd_source)
        if base_source is None:
            base_source = (
                REPOSITORY_ROOT / "jobs/process/BaseTrainProcess.py"
            ).read_text()
        base_target.write_text(base_source)
        if process_source is None:
            process_source = (
                REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
            ).read_text()
        process_target.write_text(process_source)
        if job_source is None:
            job_source = (REPOSITORY_ROOT / "jobs/BaseJob.py").read_text()
        job_target.write_text(job_source)
        return repository

    def test_examples_manifest_and_exact_file_set(self):
        from scripts.training_book.examples import load_example_manifest

        directory = REPOSITORY_ROOT / "docs/book/examples"
        manifest = load_example_manifest(directory / "manifest.json")
        self.assertEqual(manifest.schema_version, 1)
        self.assertEqual(manifest.book_revision, 1)
        self.assertEqual(
            tuple((Path(item.path).name, item.architecture, item.validation_profile)
                  for item in manifest.examples), self.EXPECTED,
        )
        self.assertEqual(
            {path.name for path in directory.iterdir()},
            {"README.md", "manifest.json", *(item[0] for item in self.EXPECTED)},
        )

    def test_examples_readme_is_a_scaffolded_book_page(self):
        text = (REPOSITORY_ROOT / "docs/book/examples/README.md").read_text()
        self.assertEqual(sum(line.startswith("# ") for line in text.splitlines()), 1)
        self.assertIn("](../README.md)", text)
        for marker in ("book-navigation:start", "book-navigation:end",
                       "book-verification:start", "book-verification:end"):
            self.assertEqual(text.count(f"<!-- {marker} -->"), 1)

    def test_examples_typed_tokens_reject_undeclared_unused_and_path_escape(self):
        from scripts.training_book.examples import ExampleError, TokenDeclaration, substitute_typed_tokens

        declarations = (TokenDeclaration("DATASET_DIR", "path"),)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(substitute_typed_tokens("${DATASET_DIR}", declarations, root), str(root / "dataset"))
            for value, declared in (("${UNKNOWN}", declarations), ("literal", declarations)):
                with self.subTest(value=value), self.assertRaises(ExampleError):
                    substitute_typed_tokens(value, declared, root)
            with self.assertRaises(ExampleError):
                substitute_typed_tokens("prefix-${DATASET_DIR}", declarations, root)

    def test_examples_manifest_rejects_duplicate_rows_and_path_traversal(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest

        live = json.loads((REPOSITORY_ROOT / "docs/book/examples/manifest.json").read_text())
        mutations = []
        duplicate = deepcopy(live)
        duplicate["examples"].append(deepcopy(duplicate["examples"][0]))
        mutations.append(duplicate)
        traversal = deepcopy(live)
        traversal["examples"][0]["path"] = "../escape.yaml"
        mutations.append(traversal)
        for mutation in mutations:
            with self.subTest(path=mutation["examples"][0]["path"]), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "manifest.json"
                path.write_text(json.dumps(mutation))
                with self.assertRaises(ExampleError):
                    load_example_manifest(path)

    def test_examples_manifest_rejects_any_departure_from_the_literal_matrix(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest

        live = json.loads((REPOSITORY_ROOT / "docs/book/examples/manifest.json").read_text())
        mutations = []
        revision = deepcopy(live)
        revision["book_revision"] = True
        mutations.append(("boolean revision", revision))
        role = deepcopy(live)
        role["examples"][0]["roles"][0] = "invented-role"
        mutations.append(("invented role", role))
        chapter = deepcopy(live)
        chapter["examples"][0]["chapters"][0] = "models/anima.md"
        mutations.append(("valid but wrong chapter", chapter))
        tokens = deepcopy(live)
        tokens["examples"][0]["tokens"] = list(reversed(tokens["examples"][0]["tokens"]))
        mutations.append(("reordered tokens", tokens))
        rows = deepcopy(live)
        rows["examples"][0], rows["examples"][1] = rows["examples"][1], rows["examples"][0]
        mutations.append(("reordered rows", rows))
        for label, mutation in mutations:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "manifest.json"
                path.write_text(json.dumps(mutation))
                with self.assertRaises(ExampleError):
                    load_example_manifest(path)

    def test_examples_full_validation_rejects_every_malformed_placeholder(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        source = REPOSITORY_ROOT / "docs/book/examples/first-lora-flex1.yaml"
        entry = load_example_manifest(
            REPOSITORY_ROOT / "docs/book/examples/manifest.json"
        ).examples[0]
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        malformed = (
            "${not-a-token}", "${DATASET-DIR}", "${DATASET_DIR",
            "prefix-${JOB_NAME}", "$DATASET_DIR", "{{DATASET_DIR}}",
            "{DATASET_DIR}",
        )
        for placeholder in malformed:
            raw = yaml.safe_load(source.read_text())
            raw["config"]["process"][0]["sample"]["neg"] = placeholder
            with self.subTest(placeholder=placeholder), tempfile.TemporaryDirectory() as directory:
                repository = Path(directory)
                target = repository / "docs/book/examples" / entry.path
                target.parent.mkdir(parents=True)
                target.write_text(yaml.safe_dump(raw, sort_keys=False))
                with self.assertRaises(ExampleError):
                    validate_example(repository, entry, catalog)

    def test_examples_yaml_rejects_duplicate_and_merge_keys_before_semantics(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        source = (REPOSITORY_ROOT / "docs/book/examples/first-lora-flex1.yaml").read_text()
        entry = load_example_manifest(
            REPOSITORY_ROOT / "docs/book/examples/manifest.json"
        ).examples[0]
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        cases = {
            "same-value root duplicate": (source.replace("schema: 1", "schema: 1\nschema: 1", 1), "duplicate"),
            "conflicting nested duplicate": (source.replace("      steps: 2000", "      steps: 2000\n      steps: 3000", 1), "duplicate"),
            "merge alias override": (source.replace(
                "    logging:\n", "    logging: &sample_defaults\n", 1
            ).replace(
                "    sample:\n", "    sample:\n      <<: *sample_defaults\n", 1
            ), "merge"),
            "unhashable mapping key": (source.replace(
                "schema: 1", "? [schema]\n: 1", 1
            ), "hashable"),
        }
        for label, (document, message) in cases.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = Path(directory)
                target = repository / "docs/book/examples" / entry.path
                target.parent.mkdir(parents=True)
                target.write_text(document)
                with self.assertRaisesRegex(ExampleError, message):
                    validate_example(repository, entry, catalog)

    def test_examples_reject_extra_and_missing_shape_keys(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        directory = REPOSITORY_ROOT / "docs/book/examples"
        entries = {entry.path: entry for entry in load_example_manifest(directory / "manifest.json").examples}
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        cases = []
        first = yaml.safe_load((directory / "first-lora-flex1.yaml").read_text())
        extra_sample = deepcopy(first)
        extra_sample["config"]["process"][0]["sample"]["neg"] = ""
        cases.append((entries["first-lora-flex1.yaml"], extra_sample, "extra sample key"))
        terminal = deepcopy(first)
        terminal["config"]["process"][0]["model"]["quantize_kwargs"]["unexpected"] = True
        cases.append((entries["first-lora-flex1.yaml"], terminal, "extra terminal-object key"))
        qwen = yaml.safe_load((directory / "object-qwen-image.yaml").read_text())
        open_object = deepcopy(qwen)
        open_object["config"]["process"][0]["model"]["model_kwargs"] = {"unexpected": True}
        cases.append((entries["object-qwen-image.yaml"], open_object, "extra open-object key"))
        missing = deepcopy(first)
        del missing["config"]["process"][0]["sample"]["sample_start_step"]
        cases.append((entries["first-lora-flex1.yaml"], missing, "missing baseline key"))
        for entry, raw, label in cases:
            with self.subTest(label=label), mock.patch(
                "scripts.training_book.examples._load_example_yaml", return_value=raw
            ), self.assertRaises(ExampleError):
                validate_example(REPOSITORY_ROOT, entry, catalog)

    def test_examples_reject_kwargs_typo_discriminator_control_and_mask_turbo(self):
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        directory = REPOSITORY_ROOT / "docs/book/examples"
        manifest = load_example_manifest(directory / "manifest.json")
        entries = {entry.path: entry for entry in manifest.examples}
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        mutations = []
        first = yaml.safe_load((directory / "first-lora-flex1.yaml").read_text())
        typo = deepcopy(first)
        typo["config"]["process"][0]["train"]["gradent_checkpointing"] = True
        mutations.append((entries["first-lora-flex1.yaml"], typo))
        discriminator = deepcopy(first)
        discriminator["config"]["process"][0]["type"] = "sd_trainer"
        mutations.append((entries["first-lora-flex1.yaml"], discriminator))
        edit = yaml.safe_load((directory / "flux-kontext-edit.yaml").read_text())
        bad_control = deepcopy(edit)
        bad_control["config"]["process"][0]["sample"]["samples"][0]["ctrl_img"] = "${CONTROL_DIR}"
        bad_control["config"]["process"][0]["datasets"][0]["control_path"] = "${CONTROL_IMAGE}"
        mutations.append((entries["flux-kontext-edit.yaml"], bad_control))
        masked = yaml.safe_load((directory / "masked-refinement.yaml").read_text())
        turbo = deepcopy(masked)
        turbo["config"]["process"][0]["train"]["train_turbo"] = True
        mutations.append((entries["masked-refinement.yaml"], turbo))
        for entry, mutation in mutations:
            with self.subTest(entry=entry.path), mock.patch(
                "scripts.training_book.examples._load_example_yaml", return_value=mutation
            ), self.assertRaises(ExampleError):
                validate_example(REPOSITORY_ROOT, entry, catalog)

    def test_examples_resume_learning_rate_contract_is_pure_and_configured_value_wins(self):
        from scripts.training_book.examples import configured_learning_rates_after_restore

        restored = ({"lr": 0.9, "momentum": 3},)
        result = configured_learning_rates_after_restore((1e-4,), restored)
        self.assertEqual(restored[0]["lr"], 0.9)
        self.assertEqual(result, ({"lr": 1e-4, "initial_lr": 1e-4, "momentum": 3},))

    def test_examples_resume_source_contract_rejects_text_dead_and_wrong_scope_decoys(self):
        from scripts.training_book.examples import ExampleError, _validate_resume_source_contract

        fragments = "\n".join((
            "previous_lrs.append(group['lr'])",
            "torch.load(optimizer_state_file_path, weights_only=True)",
            "optimizer.load_state_dict(optimizer_state_dict)",
            "group['lr'] = previous_lrs[i]",
            "group['initial_lr'] = previous_lrs[i]",
        ))
        executable = """
previous_lrs = []
for group in optimizer.param_groups:
    previous_lrs.append(group['lr'])
optimizer_state_dict = torch.load(optimizer_state_file_path, weights_only=True)
optimizer.load_state_dict(optimizer_state_dict)
for i, group in enumerate(optimizer.param_groups):
    group['lr'] = previous_lrs[i]
    group['initial_lr'] = previous_lrs[i]
"""
        cases = {
            "string literal": f'"""{fragments}"""\n',
            "comments only": "\n".join(f"# {line}" for line in fragments.splitlines()),
            "wrong class and method": "class Decoy:\n    def restore(self):\n" + "".join(
                f"        {line}\n" for line in executable.strip().splitlines()
            ),
            "statically dead intended scope": "class BaseSDTrainProcess:\n    def run(self):\n        if False:\n" + "".join(
                f"            {line}\n" for line in executable.strip().splitlines()
            ),
        }
        for label, source in cases.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(directory, source)
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)

    def test_examples_resume_source_contract_rejects_false_weights_only_in_live_ast(self):
        from scripts.training_book.examples import ExampleError, _validate_resume_source_contract

        live = (REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py").read_text()
        mutations = {
            "unsafe torch load": live.replace(
                "torch.load(optimizer_state_file_path, weights_only=True)",
                "torch.load(optimizer_state_file_path, weights_only=False)", 1,
            ),
            "hard-coded optimizer learning rate": live.replace(
                "learning_rate=self.train_config.lr",
                "learning_rate=9e-3", 1,
            ),
            "wrong optimizer state filename": live.replace(
                "optimizer_state_filename = f'optimizer.pt'",
                "optimizer_state_filename = f'other.pt'", 1,
            ),
            "wrong optimizer state root": live.replace(
                "os.path.join(self.save_root, optimizer_state_filename)",
                "os.path.join('/tmp/wrong-root', optimizer_state_filename)", 1,
            ),
            "optimizer rebound before discovery": live.replace(
                "        self.optimizer = optimizer",
                "        optimizer = object()\n        self.optimizer = optimizer", 1,
            ),
            "filename rebound before join": live.replace(
                "        optimizer_state_file_path = os.path.join(",
                "        optimizer_state_filename = 'other.pt'\n"
                "        optimizer_state_file_path = os.path.join(", 1,
            ),
            "path rebound before exists guard": live.replace(
                "        if os.path.exists(optimizer_state_file_path):",
                "        optimizer_state_file_path = '/tmp/wrong-root/optimizer.pt'\n"
                "        if os.path.exists(optimizer_state_file_path):", 1,
            ),
            "path rebound inside exists guard": live.replace(
                "        if os.path.exists(optimizer_state_file_path):\n",
                "        if os.path.exists(optimizer_state_file_path):\n"
                "            optimizer_state_file_path = '/tmp/wrong-root/optimizer.pt'\n", 1,
            ),
            "configured lr mutated before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        for forced_group in optimizer.param_groups:\n"
                "            forced_group['lr'] = 9e-3\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "configured lr mutated before capture": live.replace(
                "        if os.path.exists(optimizer_state_file_path):\n",
                "        if os.path.exists(optimizer_state_file_path):\n"
                "            for forced_group in optimizer.param_groups:\n"
                "                forced_group['lr'] = 9e-3\n", 1,
            ),
            "statically terminal before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        if True:\n            return\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "constant loop terminal before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        while True:\n            return\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "try finally terminal before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        try:\n            return\n        finally:\n            pass\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "try except terminal before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        try:\n            return\n"
                "        except Exception:\n            pass\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "with terminal before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        with harmless_context():\n            return\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "optimizer factory rebound": live.replace(
                "        optimizer = get_optimizer(",
                "        get_optimizer = malicious_optimizer_factory\n"
                "        optimizer = get_optimizer(", 1,
            ),
            "optimizer factory shadow import": live.replace(
                "from toolkit.optimizer import get_optimizer",
                "from toolkit.optimizer import get_optimizer\n"
                "from malicious import get_optimizer", 1,
            ),
            "optimizer factory shadow alias import": live.replace(
                "from toolkit.optimizer import get_optimizer",
                "from toolkit.optimizer import get_optimizer\n"
                "import malicious as get_optimizer", 1,
            ),
            "optimizer factory wildcard import": live.replace(
                "from toolkit.optimizer import get_optimizer",
                "from toolkit.optimizer import get_optimizer\n"
                "from malicious import *", 1,
            ),
            "optimizer factory shadow function": live.replace(
                "class BaseSDTrainProcess(BaseTrainProcess):",
                "def get_optimizer(*args, **kwargs):\n"
                "    return malicious_optimizer_factory(*args, **kwargs)\n\n"
                "class BaseSDTrainProcess(BaseTrainProcess):", 1,
            ),
            "optimizer factory shadow class": live.replace(
                "class BaseSDTrainProcess(BaseTrainProcess):",
                "class get_optimizer:\n    pass\n\n"
                "class BaseSDTrainProcess(BaseTrainProcess):", 1,
            ),
            "resume process accessor overridden": live.replace(
                "class BaseSDTrainProcess(BaseTrainProcess):",
                "class BaseSDTrainProcess(BaseTrainProcess):\n"
                "    def get_conf(self, *args, **kwargs):\n"
                "        return '/tmp/wrong-root'", 1,
            ),
            "resume builtin super import shadowed": live.replace(
                "from jobs.process import BaseTrainProcess",
                "from jobs.process import BaseTrainProcess\n"
                "from malicious import super", 1,
            ),
            "resume builtin super assignment shadowed": live.replace(
                "from jobs.process import BaseTrainProcess",
                "from jobs.process import BaseTrainProcess\n"
                "super = malicious_super", 1,
            ),
            "resume builtin super function shadowed": live.replace(
                "from jobs.process import BaseTrainProcess",
                "from jobs.process import BaseTrainProcess\n"
                "def super():\n    return malicious_proxy", 1,
            ),
            **{
                f"resume process inherited {attribute} overwritten": live.replace(
                    "        super().__init__(process_id, job, config)\n",
                    "        super().__init__(process_id, job, config)\n"
                    f"        self.{attribute} = malicious_value\n", 1,
                )
                for attribute in (
                    "save_root", "training_folder", "name", "config", "job"
                )
            },
            "optimizer groups aliased before discovery": live.replace(
                "        optimizer_state_filename = f'optimizer.pt'",
                "        forced_groups = optimizer.param_groups\n"
                "        forced_groups[0].update({'lr': 9e-3})\n"
                "        optimizer_state_filename = f'optimizer.pt'", 1,
            ),
            "optimizer groups aliased before capture": live.replace(
                "        if os.path.exists(optimizer_state_file_path):\n",
                "        if os.path.exists(optimizer_state_file_path):\n"
                "            forced_groups = optimizer.param_groups\n"
                "            forced_groups[0].update({'lr': 9e-3})\n", 1,
            ),
            "annotated false load overwrite": live.replace(
                "            if load_optimizer:\n",
                "            load_optimizer: bool = False\n"
                "            if load_optimizer:\n", 1,
            ),
            "destructured false load overwrite": live.replace(
                "            if load_optimizer:\n",
                "            (load_optimizer,) = (False,)\n"
                "            if load_optimizer:\n", 1,
            ),
        }
        for label, source in mutations.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(directory, source)
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)

    def test_examples_resume_source_contract_rejects_save_root_mutations(self):
        from scripts.training_book.examples import ExampleError, _validate_resume_source_contract

        sd_source = (
            REPOSITORY_ROOT / "jobs/process/BaseSDTrainProcess.py"
        ).read_text()
        base_source = (
            REPOSITORY_ROOT / "jobs/process/BaseTrainProcess.py"
        ).read_text()
        mutations = {
            "wrong save root": base_source.replace(
                "os.path.join(self.training_folder, self.name)",
                "os.path.join('/tmp/wrong-root', self.name)", 1,
            ),
            "wrong training-folder key": base_source.replace(
                "self.get_conf('training_folder'",
                "self.get_conf('other_folder'", 1,
            ),
            "save root rebound": base_source.replace(
                "        self.step = 0",
                "        self.save_root = '/tmp/wrong-root'\n        self.step = 0", 1,
            ),
            "job name rebound": base_source.replace(
                "        self.save_root = os.path.join(self.training_folder, self.name)",
                "        self.name = 'other-job'\n"
                "        self.save_root = os.path.join(self.training_folder, self.name)", 1,
            ),
            "return before save root": base_source.replace(
                "        self.save_root = os.path.join(self.training_folder, self.name)",
                "        return\n"
                "        self.save_root = os.path.join(self.training_folder, self.name)", 1,
            ),
            "configuration accessor rebound": base_source.replace(
                "        self.training_folder = self.get_conf('training_folder',",
                "        self.get_conf = lambda *args: '/tmp/wrong-root'\n"
                "        self.training_folder = self.get_conf('training_folder',", 1,
            ),
            "inherited configuration rebound": base_source.replace(
                "        self.training_folder = self.get_conf('training_folder',",
                "        self.config = {'training_folder': '/tmp/wrong-root'}\n"
                "        self.training_folder = self.get_conf('training_folder',", 1,
            ),
            "inherited job rebound": base_source.replace(
                "        self.training_folder = self.get_conf('training_folder',",
                "        self.job = malicious_job\n"
                "        self.training_folder = self.get_conf('training_folder',", 1,
            ),
            "base initializer skipped": base_source.replace(
                "        super().__init__(process_id, job, config)",
                "        pass", 1,
            ),
            "base initializer arguments redirected": base_source.replace(
                "        super().__init__(process_id, job, config)",
                "        super().__init__(process_id, malicious_job, "
                "{'name': 'other-job'})", 1,
            ),
            "training accessor method overridden": base_source.replace(
                "    def run(self):",
                "    def get_conf(self, *args, **kwargs):\n"
                "        return '/tmp/wrong-root'\n\n"
                "    def run(self):", 1,
            ),
            "training accessor class attribute overridden": base_source.replace(
                "class BaseTrainProcess(BaseProcess):",
                "class BaseTrainProcess(BaseProcess):\n"
                "    get_conf = malicious_get_conf", 1,
            ),
            "builtin super shadowed": base_source.replace(
                "from jobs.process.BaseProcess import BaseProcess",
                "from jobs.process.BaseProcess import BaseProcess\n"
                "from malicious import super", 1,
            ),
            "try except return before training folder": base_source.replace(
                "        self.training_folder = self.get_conf('training_folder',",
                "        try:\n            return\n"
                "        except Exception:\n            pass\n"
                "        self.training_folder = self.get_conf('training_folder',", 1,
            ),
            "try except return before save root": base_source.replace(
                "        self.save_root = os.path.join(self.training_folder, self.name)",
                "        try:\n            return\n"
                "        except Exception:\n            pass\n"
                "        self.save_root = os.path.join(self.training_folder, self.name)", 1,
            ),
        }
        for label, mutation in mutations.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(
                    directory, sd_source, mutation
                )
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)
        process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
        ).read_text().replace(
            "self.get_conf('name', self.job.name)",
            "self.get_conf('other_name', self.job.name)", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source, process_source
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)
        try_return_process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
        ).read_text().replace(
            "        self.name = self.get_conf('name', self.job.name)",
            "        try:\n            return\n"
            "        except Exception:\n            pass\n"
            "        self.name = self.get_conf('name', self.job.name)", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source, try_return_process_source
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)
        process_identity_mutations = {
            "job rebound": "        self.job = malicious_job\n",
            "config rebound": "        self.config = {'name': 'other-job'}\n",
        }
        for label, insertion in process_identity_mutations.items():
            process_identity_source = (
                REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
            ).read_text().replace(
                "        self.name = self.get_conf('name', self.job.name)",
                insertion + "        self.name = self.get_conf('name', self.job.name)", 1,
            )
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(
                    directory, sd_source, base_source, process_identity_source
                )
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)
        local_identity_mutations = {
            "local job rebound": (
                "        self.job = job",
                "        job = malicious_job\n        self.job = job",
            ),
            "local config rebound": (
                "        self.config = config",
                "        config = malicious_config\n        self.config = config",
            ),
            "constructor parameters removed": (
                "            job: 'BaseJob',\n            config: OrderedDict",
                "            unrelated: OrderedDict",
            ),
        }
        for label, (old, new) in local_identity_mutations.items():
            process_identity_source = (
                REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
            ).read_text().replace(old, new, 1)
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(
                    directory, sd_source, base_source, process_identity_source
                )
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)
        changed_accessor_source = (
            REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
        ).read_text().replace(
            "        # split key by '.' and recursively get the value",
            "        return 'other-job'\n"
            "        # split key by '.' and recursively get the value", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source, changed_accessor_source
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)
        job_source = (REPOSITORY_ROOT / "jobs/BaseJob.py").read_text().replace(
            "        self.name = self.get_conf('name', required=True)",
            "        self.name = 'other-job'", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source,
                (REPOSITORY_ROOT / "jobs/process/BaseProcess.py").read_text(),
                job_source,
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)
        unreachable_process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
        ).read_text().replace(
            "        self.name = self.get_conf('name', self.job.name)",
            "        return\n"
            "        self.name = self.get_conf('name', self.job.name)", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source, unreachable_process_source
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)
        rebound_process_source = (
            REPOSITORY_ROOT / "jobs/process/BaseProcess.py"
        ).read_text().replace(
            "        self.name = self.get_conf('name', self.job.name)",
            "        self.get_conf = lambda *args: 'other-job'\n"
            "        self.name = self.get_conf('name', self.job.name)", 1,
        )
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(
                directory, sd_source, base_source, rebound_process_source
            )
            with self.assertRaises(ExampleError):
                _validate_resume_source_contract(repository)

    def test_examples_resume_source_contract_rejects_incompatible_control_flow_and_rebinding(self):
        from scripts.training_book.examples import ExampleError, _validate_resume_source_contract

        capture = """
            previous_lrs = []
            for group in optimizer.param_groups:
                previous_lrs.append(group['lr'])
"""
        load = """
            load_optimizer = True
            if load_optimizer:
                try:
                    optimizer_state_dict = torch.load(optimizer_state_file_path, weights_only=True)
                    optimizer.load_state_dict(optimizer_state_dict)
                except Exception:
                    pass
"""
        restore = """
            if len(previous_lrs) > 0:
                for i, group in enumerate(optimizer.param_groups):
                    group['lr'] = previous_lrs[i]
                    group['initial_lr'] = previous_lrs[i]
"""
        def source_with(body):
            return (
                "from jobs.process import BaseTrainProcess\n"
                "from toolkit.optimizer import get_optimizer\n"
                "class BaseSDTrainProcess(BaseTrainProcess):\n"
                "    def __init__(self, process_id, job, config, custom_pipeline=None):\n"
                "        super().__init__(process_id, job, config)\n"
                "    def run(self):\n"
                "        optimizer = get_optimizer(self.params, optimizer_type, "
                "learning_rate=self.train_config.lr)\n"
                "        self.optimizer = optimizer\n"
                "        if self.train_config.do_paramiter_swapping:\n"
                "            self.optimizer.enable_paramiter_swapping("
                "self.train_config.paramiter_swapping_factor)\n"
                "        optimizer_state_filename = 'optimizer.pt'\n"
                "        optimizer_state_file_path = os.path.join("
                "self.save_root, optimizer_state_filename)\n"
                "        if os.path.exists(optimizer_state_file_path):\n"
                f"{body}"
            )

        baseline = source_with(capture + load + restore)
        with tempfile.TemporaryDirectory() as directory:
            repository = self.write_resume_source_fixture(directory, baseline)
            _validate_resume_source_contract(repository)

        cases = {
            "unreachable after return": "            return\n" + capture + load + restore,
            "mutually exclusive branches": capture + "            if choose_load:\n" +
                "".join(f"    {line}\n" for line in load.strip().splitlines()) +
                "            else:\n" +
                "".join(f"    {line}\n" for line in restore.strip().splitlines()),
            "optimizer rebound": capture + "            optimizer = object()\n" + load + restore,
            "captured rates cleared": capture + "            previous_lrs.clear()\n" + load + restore,
            "captured rates corrupted": capture + "            previous_lrs.append(999)\n" + load + restore,
            "captured rate subscript overwritten": capture +
                "            previous_lrs[0] = 999\n" + load + restore,
            "captured rates aliased and cleared": capture +
                "            alias = previous_lrs\n            alias.clear()\n" + load + restore,
            "load guard forced false": capture + load.replace(
                "load_optimizer = True", "load_optimizer = False"
            ) + restore,
            "load guard overwritten false": capture + load.replace(
                "            if load_optimizer:",
                "            load_optimizer = False\n            if load_optimizer:"
            ) + restore,
        }
        for label, body in cases.items():
            source = source_with(body)
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repository = self.write_resume_source_fixture(directory, source)
                with self.assertRaises(ExampleError):
                    _validate_resume_source_contract(repository)

    def test_examples_images_must_decode_complete_pixel_payloads(self):
        from scripts.training_book import examples as examples_module
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        manifest = load_example_manifest(
            REPOSITORY_ROOT / "docs/book/examples/manifest.json"
        )
        entries = {entry.path: entry for entry in manifest.examples}
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        original_make_fixtures = examples_module._make_fixtures
        cases = (
            ("first-lora-flex1.yaml", "dataset/example.png"),
            ("flux-kontext-edit.yaml", "controls/example.png"),
            ("flux-kontext-edit.yaml", "sample-control.png"),
            ("masked-refinement.yaml", "masks/example.png"),
        )
        for filename, relative_image in cases:
            def truncate(root, relative_image=relative_image):
                original_make_fixtures(root)
                image = root / relative_image
                image.write_bytes(image.read_bytes()[:41])

            with self.subTest(filename=filename, image=relative_image), mock.patch(
                "scripts.training_book.examples._make_fixtures", side_effect=truncate
            ), self.assertRaises(ExampleError):
                validate_example(REPOSITORY_ROOT, entries[filename], catalog)

    def test_examples_resume_checkpoint_rejects_malformed_nonexecuting_safetensors_headers(self):
        from scripts.training_book import examples as examples_module
        from scripts.training_book.examples import ExampleError, load_example_manifest, validate_example

        entry = load_example_manifest(
            REPOSITORY_ROOT / "docs/book/examples/manifest.json"
        ).examples[-1]
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        original_make_fixtures = examples_module._make_fixtures

        def encoded(header, payload=b"\0\0\0\0"):
            raw = header if isinstance(header, bytes) else json.dumps(header, separators=(",", ":")).encode()
            raw += b" " * (-len(raw) % 8)
            return struct.pack("<Q", len(raw)) + raw + payload

        metadata = {
            "format": "pt", "ss_output_name": "training-book-example",
            "training_info": json.dumps({"step": 250, "epoch": 0}),
        }
        tensor = {"dtype": "F32", "shape": [1], "data_offsets": [0, 4]}
        cases = {
            "arbitrary bytes": b"not-safe",
            "truncated header": struct.pack("<Q", 16) + b"{}",
            "oversized header": struct.pack("<Q", 2**30),
            "missing metadata": encoded({"tensor": tensor}),
            "wrong output name": encoded({"__metadata__": {**metadata, "ss_output_name": "other"}, "tensor": tensor}),
            "wrong step": encoded({"__metadata__": {**metadata, "training_info": json.dumps({"step": 249, "epoch": 0})}, "tensor": tensor}),
            "negative epoch": encoded({"__metadata__": {**metadata, "training_info": json.dumps({"step": 250, "epoch": -1})}, "tensor": tensor}),
            "invalid offsets": encoded({"__metadata__": metadata, "tensor": {**tensor, "data_offsets": [0, 8]}}),
            "boolean shape": encoded({"__metadata__": metadata, "tensor": {**tensor, "shape": [True]}}),
            "unsupported dtype": encoded({"__metadata__": metadata, "tensor": {**tensor, "dtype": "PICKLE"}}),
            "duplicate header key": encoded(
                b'{"__metadata__":{"format":"pt","ss_output_name":"training-book-example","training_info":"{\\"step\\":250,\\"epoch\\":0}"},'
                b'"tensor":{"dtype":"F32","shape":[1],"data_offsets":[0,4]},'
                b'"tensor":{"dtype":"F32","shape":[1],"data_offsets":[0,4]}}'
            ),
        }
        for label, checkpoint in cases.items():
            def corrupt(root, checkpoint=checkpoint):
                original_make_fixtures(root)
                (root / "checkpoint.safetensors").write_bytes(checkpoint)

            with self.subTest(label=label), mock.patch(
                "scripts.training_book.examples._make_fixtures", side_effect=corrupt
            ), self.assertRaises(ExampleError):
                validate_example(REPOSITORY_ROOT, entry, catalog)

    def test_all_examples_pass_semantic_validation(self):
        from scripts.training_book.examples import load_example_manifest, validate_example

        directory = REPOSITORY_ROOT / "docs/book/examples"
        manifest = load_example_manifest(directory / "manifest.json")
        catalog = load_settings_catalog(
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.json",
            REPOSITORY_ROOT / "docs/book/reference/settings-catalog.schema.json", None,
        )
        for entry in manifest.examples:
            with self.subTest(entry=entry.path):
                validate_example(REPOSITORY_ROOT, entry, catalog)

    def test_examples_match_the_exact_baseline_and_overlay_matrix(self):
        directory = REPOSITORY_ROOT / "docs/book/examples"
        overlays = {
            "first-lora-flex1.yaml": ("ostris/Flex.1-alpha", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 4, 25),
            "character-anima.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 1e-4, 3000, [1024], 1024, 1024, 4, 30),
            "style-flux.yaml": ("black-forest-labs/FLUX.1-dev", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 4, 20),
            "flux-kontext-edit.yaml": ("black-forest-labs/FLUX.1-Kontext-dev", 16, 1e-4, 2000, [512, 768], 1024, 1024, 4, 20),
            "object-qwen-image.yaml": ("Qwen/Qwen-Image", 16, 1e-4, 2000, [512, 768, 1024], 1024, 1024, 3, 25),
            "focused-refinement-qwen-image-edit-2509.yaml": ("Qwen/Qwen-Image-Edit-2509", 16, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 3, 25),
            "low-vram-anima.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 5e-5, 3000, [512, 768], 768, 768, 4, 30),
            "diagnostic-wan21-1b.yaml": ("Wan-AI/Wan2.1-T2V-1.3B-Diffusers", 32, 1e-4, 250, [632], 832, 480, 5, 30),
            "character-sdxl.yaml": ("stabilityai/stable-diffusion-xl-base-1.0", 32, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 6, 30),
            "character-sd15.yaml": ("stable-diffusion-v1-5/stable-diffusion-v1-5", 32, 1e-4, 3000, [512], 512, 512, 6, 30),
            "motion-wan22-14b-t2v.yaml": ("ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16", 32, 5e-5, 2000, [512, 768, 1024], 1024, 1024, 3.5, 25),
            "masked-refinement.yaml": ("circlestone-labs/Anima-Base-v1.0-Diffusers", 32, 2e-5, 3000, [1024], 1024, 1024, 4, 30),
            "resume-from-checkpoint.yaml": ("ostris/Flex.1-alpha", 16, 1e-4, 3000, [512, 768, 1024], 1024, 1024, 4, 25),
        }
        for filename, expected in overlays.items():
            raw = yaml.safe_load((directory / filename).read_text())
            process = raw["config"]["process"][0]
            actual = (process["model"]["name_or_path"], process["network"]["linear"],
                      process["train"]["lr"], process["train"]["steps"],
                      process["datasets"][0]["resolution"], process["sample"]["width"],
                      process["sample"]["height"], process["sample"]["guidance_scale"],
                      process["sample"]["sample_steps"])
            with self.subTest(filename=filename):
                self.assertEqual(actual, expected)
                self.assertEqual(raw["schema"], 1)
                self.assertEqual((raw["job"], process["type"], process["network"]["type"]),
                                 ("extension", "diffusion_trainer", "lora"))
                self.assertEqual(process["sample"]["seed"], 42)
                self.assertFalse(process["sample"]["walk_seed"])

    def test_examples_cli_mode(self):
        result = subprocess.run(
            [sys.executable, "scripts/validate_training_book.py", "--check-examples"],
            cwd=REPOSITORY_ROOT, text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
