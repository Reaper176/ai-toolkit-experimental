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

from scripts.training_book.manifest import (  # noqa: E402
    BookManifest,
    load_book_manifest,
    validate_book_manifest,
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
            "accessor.py",
            """class Process:
    def __init__(self):
        self.steps = self.get_conf("steps", 3000)

    def get_conf(self, key, default=None):
        self.config.get(key)
        return self.config[key]
""",
        )

        self.assertEqual(
            discover_python_settings(self.repository_root, ("accessor.py",)),
            (
                DiscoveredSetting(
                    "accessor.py", "Process.__init__", 3, "steps",
                    "get_conf", "core", "3000",
                ),
            ),
        )

    def test_discovery_ignores_open_environment_interpolation_helpers(self):
        self.write_source(
            "environment_helper.py",
            """def replace(match):
    variable_name = match.group(1)
    return os.environ.get(variable_name)
""",
        )

        self.assertEqual(
            discover_python_settings(
                self.repository_root, ("environment_helper.py",)
            ),
            (),
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
        self.assertGreater(inventory["summary"]["total"], 500)
        self.assertGreater(inventory["summary"]["major_groups"]["toolkit/config_modules.py"], 400)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["TrainConfig"], 120)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["ModelConfig"], 60)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["DatasetConfig"], 70)
        self.assertGreaterEqual(inventory["summary"]["major_groups"]["AdapterConfig"], 45)
        self.assertTrue(
            all(row["ownership"] == "unowned" for row in inventory["settings"])
        )

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
