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
from training_book.catalog import (
    catalog_source_claims,
    load_settings_catalog,
    load_training_book_ui_facts,
)
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
TRAIN_SCHEDULE_KEYS = frozenset(
    """adapter_lr batch_size content_or_style embedding_lr gradient_accumulation
    gradient_accumulation_steps learnable_snr_gos linear_timesteps linear_timesteps2
    lr lr_scheduler lr_scheduler_params max_denoising_steps min_denoising_steps
    min_snr_gamma next_sample_timesteps noise_scheduler num_train_timesteps refiner_lr
    reg_weight single_item_batching snr_gamma start_step steps switch_boundary_every
    text_encoder_lr timestep_type unet_lr weight_jitter""".split()
)
TRAIN_COMPONENT_KEYS = frozenset(
    """adapter_assist_name_or_path adapter_assist_type attention_backend
    bypass_guidance_embedding cache_text_embeddings diffusion_feature_extractor_path
    diffusion_feature_extractor_weight do_paramiter_swapping free_u
    latent_feature_extractor_path latent_feature_loss_weight match_adapter_assist
    match_adapter_chance merge_network_on_save merge_network_on_save_strength
    negative_prompt optimizer optimizer_params paramiter_swapping_factor sdp
    short_and_long_captions short_and_long_captions_encoder_split train_refiner
    train_text_encoder train_turbo train_unet unload_text_encoder validation_config
    xformers""".split()
)
TRAIN_NUMERIC_KEYS = frozenset(
    """adaptive_scaling_factor audio_loss_multiplier batch_noise_correction_scale
    blank_prompt_preservation blank_prompt_preservation_multiplier blended_blur_noise
    cfg_rescale cfg_scale correct_pred_norm correct_pred_norm_multiplier
    diff_output_preservation diff_output_preservation_class
    diff_output_preservation_multiplier differential_guidance_scale disable_sampling
    do_batch_noise_correction do_blank_stabilization do_cfg do_differential_guidance
    do_fft_loss do_fft_velocity_equiv_weight do_guidance_loss
    do_guidance_loss_cfg_zero do_prior_divergence do_random_cfg
    do_signal_amplification do_signal_correction_noise dtype dynamic_noise_offset
    ema_config force_consistent_noise force_first_sample gradient_checkpointing
    guidance_loss_schedule guidance_loss_target img_multiplier inverted_mask_prior
    inverted_mask_prior_multiplier latent_multiplier loss_target loss_type
    match_noise_norm max_cfg_scale max_grad_norm max_loss max_loss_debug
    max_negative_prompts noise_multiplier noise_offset noisy_latent_multiplier
    optimal_noise_pairing_samples pred_scaler prompt_dropout_prob
    prompt_saturation_chance random_noise_multiplier random_noise_shift
    show_turbo_outputs signal_amplification_strength signal_correction_noise_scale
    skip_first_sample standardize_images standardize_latents t0_loss_target
    t0_velocity_equiv_weight target_noise_multiplier target_norm_std
    target_norm_std_value unconditional_prompt""".split()
)
DATASET_CORE_KEYS = frozenset(
    """augmentations augments bucket_tolerance buckets caption_dropout_rate
    caption_ext caption_type dataset_path default_caption diff_output_preservation
    diff_output_preservation_class extra_values flip_x flip_y folder_path
    guidance_type is_reg keep_tokens loss_multiplier network_weight num_repeats poi
    prior_reg random_crop random_scale random_triggers random_triggers_max
    replacements replay_transforms resolution scale shuffle_augmentations
    shuffle_tokens square_crop standardize_images token_dropout_rate trigger_word
    type use_short_captions""".split()
)
DATASET_MODALITY_KEYS = frozenset(
    """alpha_mask audio_normalize audio_preserve_pitch auto_frame_count
    clip_image_augmentations clip_image_from_same_folder clip_image_path
    clip_image_shuffle_augmentations control_from_same_folder control_path
    control_path_1 control_path_2 control_path_3 control_transparent_color controls
    do_audio do_i2v fps full_size_control_images inpaint_path invert_mask
    mask_min_value mask_path num_controls_from_same_folder num_frames
    shrink_video_to_frames trim_auto_frame_count_tail unconditional_path""".split()
)
DATASET_CACHE_KEYS = frozenset(
    """cache_clip_vision_to_disk cache_latents cache_latents_num_workers
    cache_latents_to_disk cache_tensors_to_disk cache_text_embeddings debug
    fast_image_size load_image_when_caching_latents num_workers
    prefetch_factor""".split()
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


def _in_training(item) -> bool:
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


def _in_model_config(item) -> bool:
    return (
        item.source == "toolkit/config_modules.py"
        and item.symbol == "ModelConfig.__init__"
    )


def _in_cli_environment(item) -> bool:
    return item.source in {
        "run.py",
        "toolkit/config.py",
        "toolkit/paths.py",
        "toolkit/memory_management/manager_modules.py",
    }


def _in_model_family_core(item) -> bool:
    return item.source in {
        "extensions_built_in/diffusion_models/anima/anima.py",
        "extensions_built_in/diffusion_models/chroma/chroma_model.py",
        "extensions_built_in/diffusion_models/chroma/chroma_radiance_model.py",
        "extensions_built_in/diffusion_models/flux_kontext/flux_kontext.py",
        "extensions_built_in/diffusion_models/zeta_chroma/zeta_chroma_model.py",
        "extensions_built_in/flex2/flex2.py",
        "toolkit/models/flux.py",
    }


def _in_train_config_keys(item, keys) -> bool:
    return (
        item.source == "toolkit/config_modules.py"
        and item.symbol == "TrainConfig.__init__"
        and item.key in keys
    )


def _in_optimizers(item) -> bool:
    return (
        item.source == "toolkit/optimizer.py"
        or item.source.startswith("toolkit/optimizers/")
        or _in_train_config_keys(item, {"optimizer", "optimizer_params"})
    )


def _in_schedulers(item) -> bool:
    return (
        item.source == "toolkit/scheduler.py"
        or item.source.startswith("toolkit/samplers/")
        or _in_train_config_keys(item, {"lr_scheduler", "lr_scheduler_params"})
    )


def _in_dataset_keys(item, keys) -> bool:
    return (
        item.source == "toolkit/config_modules.py"
        and item.symbol == "DatasetConfig.__init__"
        and item.key in keys
    )


def _in_data_loader_cache(item) -> bool:
    return item.source in DATA_LOADER_SOURCES or _in_dataset_keys(
        item, DATASET_CACHE_KEYS
    )


def _in_save_sample_validation(item) -> bool:
    return (
        item.source == "toolkit/config_modules.py"
        and (
            item.symbol in SAVE_SAMPLE_SYMBOLS
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


def _in_data(item) -> bool:
    return (
        (
            item.source == "toolkit/config_modules.py"
            and item.symbol == "DatasetConfig.__init__"
        )
        or _in_data_loader_cache(item)
        or _in_save_sample_validation(item)
    )


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory-json", type=Path)
    parser.add_argument("--ui-facts", type=Path)
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
    if arguments.ui_facts is not None:
        load_training_book_ui_facts(arguments.ui_facts)
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
            ["core-process"], ["core-io-network"], ["core-modules"], ["core"],
            ["training"], ["train-schedule"], ["train-numerics"],
            ["train-components"], ["optimizers"], ["schedulers"],
            ["model-config"],
            ["cli-environment"],
            ["model-family-core"],
            ["dataset-core"], ["dataset-modalities"], ["data-loader-cache"],
            ["save-sample-validation"], ["data"],
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
        if production_scope == "training":
            validate_setting_ownership(
                tuple(fact for fact in discovered if _in_training(fact)),
                tuple(claim for claim in claims if _in_training(claim)),
                tuple(item for item in exclusions if _in_training(item)),
            )
        slice_predicates = {
            "train-schedule": lambda item: _in_train_config_keys(item, TRAIN_SCHEDULE_KEYS),
            "train-numerics": lambda item: _in_train_config_keys(item, TRAIN_NUMERIC_KEYS),
            "train-components": lambda item: _in_train_config_keys(item, TRAIN_COMPONENT_KEYS),
            "optimizers": _in_optimizers,
            "schedulers": _in_schedulers,
            "model-config": _in_model_config,
            "cli-environment": _in_cli_environment,
            "model-family-core": _in_model_family_core,
            "dataset-core": lambda item: _in_dataset_keys(item, DATASET_CORE_KEYS),
            "dataset-modalities": lambda item: _in_dataset_keys(item, DATASET_MODALITY_KEYS),
            "data-loader-cache": _in_data_loader_cache,
            "save-sample-validation": _in_save_sample_validation,
            "data": _in_data,
        }
        if production_scope in slice_predicates:
            predicate = slice_predicates[production_scope]
            validate_setting_ownership(
                tuple(fact for fact in discovered if predicate(fact)),
                tuple(claim for claim in claims if predicate(claim)),
                tuple(item for item in exclusions if predicate(item)),
            )


if __name__ == "__main__":
    main()
