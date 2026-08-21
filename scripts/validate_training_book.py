#!/usr/bin/env python3
"""Validate the canonical training-book manifest and source inventory."""

import argparse
import json
import tempfile
from dataclasses import asdict
from pathlib import Path

from training_book.discovery import (
    DiscoveredSetting,
    DiscoveryError,
    SourceClaim,
    discover_python_settings,
    load_exclusions,
    load_source_catalog,
    ownership_status,
    validate_discovery_target,
    validate_inventory_baseline,
    validate_setting_ownership,
)
from training_book.catalog import catalog_source_claims, load_settings_catalog
from training_book.manifest import load_book_manifest, validate_book_manifest


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
CORE_IO_FACTORY_SOURCES = frozenset({"toolkit/kohya_lora.py"})
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


def _in_core_io_network(item) -> bool:
    return (
        (
            item.source == "toolkit/config_modules.py"
            and item.symbol in CORE_IO_CONFIG_SYMBOLS
        )
        or item.read_kind.startswith("network_kwargs.")
        or item.source in CORE_IO_FACTORY_SOURCES
    )


def _in_core_modules(item) -> bool:
    return (
        item.source == "toolkit/config_modules.py"
        and item.symbol in CORE_MODULE_SYMBOLS
    )


def _in_core(item) -> bool:
    return (
        item.source in CORE_PROCESS_SOURCES
        or _in_core_io_network(item)
        or _in_core_modules(item)
    )


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory-json", type=Path)
    parser.add_argument("--check-discovery", action="store_true")
    parser.add_argument("--scope", action="append", default=[])
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--target-source")
    target.add_argument("--target-symbol")
    return parser.parse_args()


def _python_globs(catalog) -> tuple[str, ...]:
    return tuple(
        pattern
        for group in catalog.source_groups
        if group.owner == "python-ast"
        for pattern in group.globs
    )


def _declared_python_sources(
    repository_root: Path, globs: tuple[str, ...]
) -> tuple[str, ...]:
    sources = {
        path.relative_to(repository_root).as_posix()
        for pattern in globs
        for path in repository_root.glob(pattern)
        if path.is_file() and path.suffix == ".py"
    }
    return tuple(sorted(sources))


def _validate_inventory_declarations(discovered, claims, exclusions) -> None:
    discovered_ids = {
        (fact.source, fact.symbol, fact.key, fact.read_kind) for fact in discovered
    }
    claim_ids = {
        (claim.source, claim.symbol, claim.key, claim.read_kind) for claim in claims
    }
    exclusion_ids = {
        (item.source, item.symbol, item.key, item.read_kind) for item in exclusions
    }
    doubled = sorted(claim_ids.intersection(exclusion_ids))
    if doubled:
        raise DiscoveryError(f"inventory contains double-owned declarations: {doubled!r}")
    vanished = sorted((claim_ids | exclusion_ids).difference(discovered_ids))
    if vanished:
        raise DiscoveryError(f"inventory contains vanished declared sources: {vanished!r}")


def _major_group_counts(discovered) -> dict[str, int]:
    config_facts = [
        fact for fact in discovered if fact.source == "toolkit/config_modules.py"
    ]
    result = {"toolkit/config_modules.py": len(config_facts)}
    for class_name in ("TrainConfig", "ModelConfig", "DatasetConfig", "AdapterConfig"):
        result[class_name] = sum(
            fact.symbol == f"{class_name}.__init__" for fact in config_facts
        )
    return result


def _write_inventory(path: Path, discovered, claims, exclusions) -> None:
    _validate_inventory_declarations(discovered, claims, exclusions)
    rows = ownership_status(discovered, claims, exclusions)
    status_counts: dict[str, int] = {}
    settings: list[dict[str, object]] = []
    for fact, status in rows:
        status_counts[status] = status_counts.get(status, 0) + 1
        settings.append({**asdict(fact), "ownership": status})
    major_groups = _major_group_counts(discovered)
    validate_inventory_baseline(major_groups, len(settings))
    payload = {
        "schema_version": 1,
        "settings": settings,
        "summary": {
            "by_ownership": dict(sorted(status_counts.items())),
            "major_groups": major_groups,
            "total": len(settings),
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def _check_discovery_fixture() -> None:
    source = """class Config:
    def __init__(self, **kwargs):
        self.steps = kwargs.get("steps", 3000)
        for key in ("width", "height"):
            kwargs.get(key, 512)
"""
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "sample.py").write_text(source, encoding="utf-8")
        discovered = discover_python_settings(root, ("sample.py",))
    expected = (
        DiscoveredSetting(
            "sample.py", "Config.__init__", 5, "height", "kwargs.get", "core", "512"
        ),
        DiscoveredSetting(
            "sample.py", "Config.__init__", 3, "steps", "kwargs.get", "core", "3000"
        ),
        DiscoveredSetting(
            "sample.py", "Config.__init__", 5, "width", "kwargs.get", "core", "512"
        ),
    )
    if discovered != expected:
        raise DiscoveryError(
            f"discovery fixture drifted: expected {expected!r}, got {discovered!r}"
        )
    validate_setting_ownership(
        discovered,
        tuple(
            SourceClaim(fact.source, fact.symbol, fact.key, fact.read_kind)
            for fact in expected
        ),
        (),
    )


def main() -> None:
    arguments = _arguments()
    repository_root = Path(__file__).resolve().parents[1]
    manifest = load_book_manifest(repository_root / "docs/book/book-manifest.json")
    validate_book_manifest(
        manifest, expected_full_architectures=FULL_ARCHITECTURES
    )
    settings_catalog = load_settings_catalog(
        repository_root / "docs/book/reference/settings-catalog.json",
        repository_root / "docs/book/reference/settings-catalog.schema.json",
        None,
    )
    has_target = (
        arguments.target_source is not None or arguments.target_symbol is not None
    )
    target_mode = False
    production_scope = None
    if arguments.check_discovery:
        if arguments.inventory_json is not None:
            raise DiscoveryError(
                "discovery mode cannot combine --check-discovery with --inventory-json"
            )
        if has_target:
            if arguments.scope:
                raise DiscoveryError(
                    "discovery mode cannot combine a target with --scope"
                )
            target_mode = True
        elif arguments.scope in (
            ["core-process"], ["core-io-network"], ["core-modules"], ["core"]
        ):
            production_scope = arguments.scope[0]
        elif arguments.scope != ["discovery-fixtures"]:
            raise DiscoveryError(
                "--check-discovery requires exactly --scope discovery-fixtures"
            )
        else:
            _check_discovery_fixture()
    elif has_target:
        raise DiscoveryError(
            "target discovery mode requires --check-discovery"
        )
    elif arguments.scope:
        raise DiscoveryError(
            "--scope values are inactive without their matching check mode"
        )

    needs_production_discovery = bool(
        arguments.inventory_json
        or target_mode
        or production_scope
    )
    if needs_production_discovery:
        source_catalog = load_source_catalog(
            repository_root / "docs/book/reference/settings-sources.json"
        )
        exclusions = load_exclusions(
            repository_root / "docs/book/reference/settings-exclusions.json"
        )
        # Task 2 inventories only the python-ast group. The typescript-test
        # group is already schema-validated, but Task 6 must emit its live AST
        # facts before AI_TOOLKIT_AUTH/version/build/utility claims are added.
        globs = _python_globs(source_catalog)
        discovered = discover_python_settings(repository_root, globs)
        claims = source_catalog.claims + catalog_source_claims(settings_catalog)
        if arguments.inventory_json:
            _write_inventory(
                arguments.inventory_json, discovered, claims, exclusions
            )
        if target_mode:
            validate_discovery_target(
                discovered,
                claims,
                exclusions,
                declared_sources=_declared_python_sources(repository_root, globs),
                target_source=arguments.target_source,
                target_symbol=arguments.target_symbol,
            )
        if production_scope == "core-process":
            validate_setting_ownership(
                tuple(
                    fact for fact in discovered
                    if fact.source in CORE_PROCESS_SOURCES
                ),
                tuple(
                    claim for claim in claims
                    if claim.source in CORE_PROCESS_SOURCES
                ),
                tuple(
                    item for item in exclusions
                    if item.source in CORE_PROCESS_SOURCES
                ),
            )
        if production_scope == "core-io-network":
            validate_setting_ownership(
                tuple(fact for fact in discovered if _in_core_io_network(fact)),
                tuple(claim for claim in claims if _in_core_io_network(claim)),
                tuple(item for item in exclusions if _in_core_io_network(item)),
            )
        if production_scope == "core-modules":
            validate_setting_ownership(
                tuple(fact for fact in discovered if _in_core_modules(fact)),
                tuple(claim for claim in claims if _in_core_modules(claim)),
                tuple(item for item in exclusions if _in_core_modules(item)),
            )
        if production_scope == "core":
            validate_setting_ownership(
                tuple(fact for fact in discovered if _in_core(fact)),
                tuple(claim for claim in claims if _in_core(claim)),
                tuple(item for item in exclusions if _in_core(item)),
            )


if __name__ == "__main__":
    main()
