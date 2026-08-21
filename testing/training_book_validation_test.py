import json
import re
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

from scripts.training_book.manifest import (  # noqa: E402
    BookManifest,
    load_book_manifest,
    validate_book_manifest,
)
from scripts.training_book.catalog import (  # noqa: E402
    CatalogError,
    catalog_source_claims,
    load_settings_catalog,
    settings_catalog_schema,
    validate_settings_catalog,
)
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

    def test_catalog_contract_accepts_the_representative_shape_and_empty_catalog(self):
        catalog = validate_settings_catalog(
            {"schema_version": 1, "settings": [self.valid_catalog_entry()]},
            self.discovered_steps(),
        )
        empty = validate_settings_catalog(
            {"schema_version": 1, "settings": []}, ()
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
                        {"schema_version": 1, "settings": settings},
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
                        {"schema_version": 1, "settings": [entry]},
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
                    "schema_version": 1,
                    "settings": [self.valid_catalog_entry(), overlapping],
                },
                self.discovered_steps(),
            )
        validate_settings_catalog(
            {
                "schema_version": 1,
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
            {"schema_version": 1, "settings": [lora, lycoris]}, discovered
        )
        lycoris["applicability"] = [{"network_type": "lora"}]
        with self.assertRaisesRegex(CatalogError, "overlapping.*location"):
            validate_settings_catalog(
                {"schema_version": 1, "settings": [lora, lycoris]}, discovered
            )

    def test_catalog_contract_rejects_blank_teaching_prose(self):
        entry = self.valid_catalog_entry()
        entry["render"]["drawbacks"] = "   "

        with self.assertRaisesRegex(CatalogError, "render.drawbacks"):
            validate_settings_catalog(
                {"schema_version": 1, "settings": [entry]},
                self.discovered_steps(),
            )

    def test_catalog_contract_rejects_an_ambiguous_default_authority(self):
        entry = self.valid_catalog_entry()
        entry["defaults"][0]["kind"] = "default"

        with self.assertRaisesRegex(CatalogError, "default.*authority"):
            validate_settings_catalog(
                {"schema_version": 1, "settings": [entry]},
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
            {"schema_version": 1, "settings": [entry]}, self.discovered_steps()
        )
        entry["defaults"][0]["value"] = None
        with self.assertRaisesRegex(CatalogError, "presence.*absent.*value"):
            validate_settings_catalog(
                {"schema_version": 1, "settings": [entry]},
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
                {"schema_version": 1, "settings": [entry]},
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
                        {"schema_version": 1, "settings": [candidate]}, discovered
                    )

    def test_catalog_contract_rejects_empty_source_claims(self):
        entry = self.valid_catalog_entry()
        entry["source_claims"] = []

        with self.assertRaisesRegex(CatalogError, "source_claims"):
            validate_settings_catalog(
                {"schema_version": 1, "settings": [entry]}, ()
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
                        {"schema_version": 1, "settings": [entry]},
                        self.discovered_steps(),
                    )

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


class CatalogProductionSliceTests(unittest.TestCase):
    def assert_catalog_selector_green(self, *arguments):
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
        self.assertEqual(
            result.returncode,
            0,
            result.stdout + result.stderr,
        )

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

        discovered = discover_python_settings(
            REPOSITORY_ROOT, PYTHON_DISCOVERY_GLOBS
        )
        selected = tuple(
            fact
            for fact in discovered
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
                    "schema_version": 1,
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
            "schema_version": 1,
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

    def test_discovery_cli_target_modes_reach_target_ownership_validation(self):
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

                self.assertNotEqual(result.returncode, 0)
                self.assertIn("unowned", result.stderr)
                self.assertNotIn("requires exactly --scope", result.stderr)

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
