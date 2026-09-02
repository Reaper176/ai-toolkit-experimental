import {
  BUILT_IN_ARCHITECTURE_BINDINGS,
  BUILT_IN_PRESET_RELEASE_TIMESTAMP,
  type BuiltInPresetArchitecture,
  type BuiltInPresetCategory,
  type BuiltInPresetRecipePath,
} from './builtInTrainingPresetBindings';
import {
  copyBuiltInPreset,
  validateBuiltInTrainingPresetRecord,
} from './builtInTrainingPresets';
import type { BuiltInTrainingPresetRecord, TrainingPresetSnapshotV1 } from './trainingPresets';

export interface BuiltInTrainingPresetRow {
  id: string;
  model_arch: BuiltInPresetArchitecture;
  intent_slug: string;
  catalog_revision: 1;
  name: string;
  summary: string;
  category: BuiltInPresetCategory;
  recipe_path: BuiltInPresetRecipePath;
  prerequisites: readonly string[];
  warnings: readonly string[];
  evidence: 'configuration-validated';
  memory_profile: 'A' | 'A-low' | 'F' | 'Flex' | 'Q' | 'QE' | 'SD' | 'W21' | 'W22';
  sample_profile: 'A' | 'Flux' | 'Flex' | 'Qwen' | 'SDXL' | 'SD15' | 'W21' | 'W22';
  linear_rank: 16 | 32;
  steps: 250 | 2000 | 3000;
  noise_scheduler: 'flowmatch' | 'ddpm';
  timestep_type: 'weighted' | 'sigmoid' | 'linear';
  content_or_style: 'content' | 'style' | 'balanced';
  max_step_saves_to_keep: 1 | 4;
}

function freezeLiteral<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) freezeLiteral(child, seen);
  return Object.freeze(value);
}

export const COMMON_BUILT_IN_SNAPSHOT = freezeLiteral({
  schema_version: 1,
  job: 'extension',
  config: {
    process: [{
      type: 'diffusion_trainer',
      network: { type: 'lora', linear: 32, linear_alpha: 32, network_kwargs: { ignore_if_contains: [] } },
      save: { dtype: 'bf16', save_every: 250, max_step_saves_to_keep: 4, save_format: 'diffusers', push_to_hub: false },
      train: {
        inverted_mask_prior: false,
        inverted_mask_prior_multiplier: 0.5,
        batch_size: 1,
        bypass_guidance_embedding: false,
        steps: 3000,
        gradient_accumulation: 1,
        train_unet: true,
        train_text_encoder: false,
        gradient_checkpointing: true,
        noise_scheduler: 'flowmatch',
        optimizer: 'adamw8bit',
        timestep_type: 'weighted',
        content_or_style: 'balanced',
        optimizer_params: { weight_decay: 0.0001 },
        unload_text_encoder: false,
        cache_text_embeddings: false,
        lr: 0.0001,
        lr_scheduler: 'constant',
        ema_config: { use_ema: false, ema_decay: 0.99 },
        skip_first_sample: false,
        force_first_sample: false,
        disable_sampling: false,
        dtype: 'bf16',
        diff_output_preservation: false,
        switch_boundary_every: 1,
        loss_type: 'mse',
      },
      logging: { log_every: 1, use_ui_logger: true, use_wandb: false },
      model: {},
      sample: { sample_every: 250, sample_start_step: 0, seed: 42, walk_seed: true },
    }],
  },
} as const);

const MEMORY_BASE = {
  layer_offloading: false,
  layer_offloading_transformer_percent: 1,
  layer_offloading_text_encoder_percent: 1,
  compile: false,
} as const;

export const BUILT_IN_PRESET_MEMORY_PROFILES = freezeLiteral({
  A: { quantize: false, quantize_te: false, qtype: '', qtype_te: '', low_vram: false, model_kwargs: {}, ...MEMORY_BASE },
  'A-low': { quantize: false, quantize_te: false, qtype: '', qtype_te: '', low_vram: true, model_kwargs: {}, ...MEMORY_BASE },
  F: { quantize: true, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: false, model_kwargs: {}, ...MEMORY_BASE },
  Flex: { quantize: true, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', quantize_kwargs: { exclude: ['*time_text_embed*'] }, low_vram: false, model_kwargs: {}, ...MEMORY_BASE },
  Q: { quantize: true, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: true, model_kwargs: {}, ...MEMORY_BASE },
  QE: { quantize: true, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: true, model_kwargs: { match_target_res: false }, ...MEMORY_BASE },
  SD: { quantize: false, quantize_te: false, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: false, model_kwargs: {}, ...MEMORY_BASE },
  W21: { quantize: false, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: false, model_kwargs: {}, ...MEMORY_BASE },
  W22: { quantize: true, quantize_te: true, qtype: 'qfloat8', qtype_te: 'qfloat8', low_vram: true, model_kwargs: { train_high_noise: true, train_low_noise: true }, ...MEMORY_BASE },
} as const);

export const BUILT_IN_PRESET_SAMPLE_PROFILES = freezeLiteral({
  A: { sampler: 'flowmatch', width: 1024, height: 1024, guidance_scale: 4, sample_steps: 30, num_frames: 1, fps: 1 },
  Flux: { sampler: 'flowmatch', width: 1024, height: 1024, guidance_scale: 4, sample_steps: 20, num_frames: 1, fps: 1 },
  Flex: { sampler: 'flowmatch', width: 1024, height: 1024, guidance_scale: 4, sample_steps: 25, num_frames: 1, fps: 1 },
  Qwen: { sampler: 'flowmatch', width: 1024, height: 1024, guidance_scale: 3, sample_steps: 25, num_frames: 1, fps: 1 },
  SDXL: { sampler: 'ddpm', width: 1024, height: 1024, guidance_scale: 6, sample_steps: 30, num_frames: 1, fps: 1 },
  SD15: { sampler: 'ddpm', width: 512, height: 512, guidance_scale: 6, sample_steps: 30, num_frames: 1, fps: 1 },
  W21: { sampler: 'flowmatch', width: 832, height: 480, guidance_scale: 5, sample_steps: 30, num_frames: 41, fps: 16 },
  W22: { sampler: 'flowmatch', width: 1024, height: 1024, guidance_scale: 3.5, sample_steps: 25, num_frames: 41, fps: 16 },
} as const);

const BASE_PREREQUISITES = freezeLiteral([
  'Select the exact model architecture shown by this preset.',
  'Review the linked recipe and provide a compatible dataset; dataset settings are not changed.',
] as const);
const BASE_WARNING = 'Configuration validation does not guarantee output quality or a specific VRAM requirement.';
const MASK_WARNING = 'Masks and inverted-mask prior are not enabled automatically.';
const VIDEO_PREREQUISITE = 'Video frame-count and FPS settings must be compatible with the linked Wan chapter.';

function rawRow(row: BuiltInTrainingPresetRow): BuiltInTrainingPresetRow {
  freezeLiteral(row.prerequisites);
  freezeLiteral(row.warnings);
  return Object.freeze(row);
}

export const BUILT_IN_PRESET_ROWS = Object.freeze([
  rawRow({ id: 'builtin:anima:character-identity@1', model_arch: 'anima', intent_slug: 'character-identity', catalog_revision: 1, name: 'Anima — Character / Identity', summary: 'Anima LoRA starting point biased toward recurring character or identity learning.', category: 'character', recipe_path: 'docs/book/recipes/character-identity.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'A', sample_profile: 'A', linear_rank: 32, steps: 3000, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:anima:focused-refinement@1', model_arch: 'anima', intent_slug: 'focused-refinement', catalog_revision: 1, name: 'Anima — Focused Refinement', summary: 'Anima starting point biased toward low-noise detail and focused refinement.', category: 'refinement', recipe_path: 'docs/book/recipes/focused-refinement.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING, MASK_WARNING], evidence: 'configuration-validated', memory_profile: 'A', sample_profile: 'A', linear_rank: 32, steps: 3000, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'style', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:anima:low-vram-starting-point@1', model_arch: 'anima', intent_slug: 'low-vram-starting-point', catalog_revision: 1, name: 'Anima — Low-VRAM Starting Point', summary: 'Anima character starting point with low-VRAM mode enabled; dataset memory settings remain unchanged.', category: 'low-vram', recipe_path: 'docs/book/recipes/low-vram.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING, 'Low-VRAM mode may reduce throughput and does not guarantee a specific VRAM requirement.'], evidence: 'configuration-validated', memory_profile: 'A-low', sample_profile: 'A', linear_rank: 32, steps: 3000, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'balanced', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:anima:short-diagnostic-run@1', model_arch: 'anima', intent_slug: 'short-diagnostic-run', catalog_revision: 1, name: 'Anima — Short Diagnostic Run', summary: 'One-interval Anima run for validating configuration, samples, saving, and queue behavior.', category: 'diagnostic', recipe_path: 'docs/book/recipes/diagnostic-run.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'A', sample_profile: 'A', linear_rank: 32, steps: 250, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'balanced', max_step_saves_to_keep: 1 }),
  rawRow({ id: 'builtin:flux:character-general-concept@1', model_arch: 'flux', intent_slug: 'character-general-concept', catalog_revision: 1, name: 'FLUX.1 — Character / General Concept', summary: 'FLUX.1 starting point biased toward subject and general concept learning.', category: 'character', recipe_path: 'docs/book/recipes/character-identity.md', prerequisites: [...BASE_PREREQUISITES, 'Access to the gated black-forest-labs/FLUX.1-dev repository is required.'], warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'F', sample_profile: 'Flux', linear_rank: 16, steps: 2000, noise_scheduler: 'flowmatch', timestep_type: 'sigmoid', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:flux:style-aesthetic@1', model_arch: 'flux', intent_slug: 'style-aesthetic', catalog_revision: 1, name: 'FLUX.1 — Style / Aesthetic', summary: 'FLUX.1 starting point biased toward style and aesthetic learning.', category: 'style', recipe_path: 'docs/book/recipes/style.md', prerequisites: [...BASE_PREREQUISITES, 'Access to the gated black-forest-labs/FLUX.1-dev repository is required.'], warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'F', sample_profile: 'Flux', linear_rank: 16, steps: 2000, noise_scheduler: 'flowmatch', timestep_type: 'sigmoid', content_or_style: 'style', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:flex1:object-general-concept@1', model_arch: 'flex1', intent_slug: 'object-general-concept', catalog_revision: 1, name: 'Flex.1 — Object / General Concept', summary: 'Flex.1 starting point for objects and general concepts with its required guidance behavior.', category: 'object', recipe_path: 'docs/book/recipes/object-concept.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'Flex', sample_profile: 'Flex', linear_rank: 16, steps: 2000, noise_scheduler: 'flowmatch', timestep_type: 'sigmoid', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:qwen_image:object-general-concept@1', model_arch: 'qwen_image', intent_slug: 'object-general-concept', catalog_revision: 1, name: 'Qwen Image — Object / General Concept', summary: 'Qwen Image low-VRAM starting point for objects and general concepts.', category: 'object', recipe_path: 'docs/book/recipes/object-concept.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'Q', sample_profile: 'Qwen', linear_rank: 16, steps: 2000, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:qwen_image_edit_plus:focused-refinement@1', model_arch: 'qwen_image_edit_plus', intent_slug: 'focused-refinement', catalog_revision: 1, name: 'Qwen Image Edit 2509 — Focused Refinement', summary: 'Qwen Image Edit 2509 starting point for paired edit/refinement training; control data is required.', category: 'refinement', recipe_path: 'docs/book/recipes/focused-refinement.md', prerequisites: [...BASE_PREREQUISITES, 'Filename-matched edit/control data is required.'], warnings: [BASE_WARNING, MASK_WARNING], evidence: 'configuration-validated', memory_profile: 'QE', sample_profile: 'Qwen', linear_rank: 16, steps: 3000, noise_scheduler: 'flowmatch', timestep_type: 'weighted', content_or_style: 'style', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:sdxl:character-identity@1', model_arch: 'sdxl', intent_slug: 'character-identity', catalog_revision: 1, name: 'SDXL — Character / Identity', summary: 'SDXL LoRA starting point biased toward character and identity learning.', category: 'character', recipe_path: 'docs/book/recipes/character-identity.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'SD', sample_profile: 'SDXL', linear_rank: 32, steps: 3000, noise_scheduler: 'ddpm', timestep_type: 'sigmoid', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:sdxl:style-aesthetic@1', model_arch: 'sdxl', intent_slug: 'style-aesthetic', catalog_revision: 1, name: 'SDXL — Style / Aesthetic', summary: 'SDXL LoRA starting point biased toward style and aesthetic learning.', category: 'style', recipe_path: 'docs/book/recipes/style.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'SD', sample_profile: 'SDXL', linear_rank: 32, steps: 3000, noise_scheduler: 'ddpm', timestep_type: 'sigmoid', content_or_style: 'style', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:sd15:character-identity@1', model_arch: 'sd15', intent_slug: 'character-identity', catalog_revision: 1, name: 'SD 1.5 — Character / Identity', summary: 'SD 1.5 LoRA starting point biased toward character and identity learning.', category: 'character', recipe_path: 'docs/book/recipes/character-identity.md', prerequisites: BASE_PREREQUISITES, warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'SD', sample_profile: 'SD15', linear_rank: 32, steps: 3000, noise_scheduler: 'ddpm', timestep_type: 'sigmoid', content_or_style: 'content', max_step_saves_to_keep: 4 }),
  rawRow({ id: 'builtin:wan21:1b:subject-motion-diagnostic@1', model_arch: 'wan21:1b', intent_slug: 'subject-motion-diagnostic', catalog_revision: 1, name: 'Wan 2.1 1.3B T2V — Subject / Motion Diagnostic', summary: 'One-interval Wan 2.1 1.3B T2V run for validating a video dataset and training pipeline.', category: 'diagnostic', recipe_path: 'docs/book/recipes/diagnostic-run.md', prerequisites: [...BASE_PREREQUISITES, VIDEO_PREREQUISITE], warnings: [BASE_WARNING], evidence: 'configuration-validated', memory_profile: 'W21', sample_profile: 'W21', linear_rank: 32, steps: 250, noise_scheduler: 'flowmatch', timestep_type: 'sigmoid', content_or_style: 'balanced', max_step_saves_to_keep: 1 }),
  rawRow({ id: 'builtin:wan22_14b:t2v:subject-motion-starting-point@1', model_arch: 'wan22_14b:t2v', intent_slug: 'subject-motion-starting-point', catalog_revision: 1, name: 'Wan 2.2 14B T2V — Subject / Motion Starting Point', summary: 'Wan 2.2 14B T2V starting point for subject and motion learning across both noise stages.', category: 'character', recipe_path: 'docs/book/recipes/character-identity.md', prerequisites: [...BASE_PREREQUISITES, VIDEO_PREREQUISITE], warnings: [BASE_WARNING, 'The Wan 2.2 14B model remains resource intensive despite quantization and low-VRAM settings.'], evidence: 'configuration-validated', memory_profile: 'W22', sample_profile: 'W22', linear_rank: 32, steps: 2000, noise_scheduler: 'flowmatch', timestep_type: 'linear', content_or_style: 'content', max_step_saves_to_keep: 4 }),
] as const satisfies readonly BuiltInTrainingPresetRow[]);

export function materializeBuiltInTrainingPresetRow(row: BuiltInTrainingPresetRow): BuiltInTrainingPresetRecord {
  const binding = BUILT_IN_ARCHITECTURE_BINDINGS.find(candidate => candidate.ui_arch === row.model_arch);
  const expectedId = `builtin:${row.model_arch}:${row.intent_slug}@${row.catalog_revision}`;
  if (row.id !== expectedId) throw new Error(`Built-in training preset row id must be ${expectedId}`);
  if (binding === undefined) throw new Error(`Built-in training preset row architecture is unsupported: ${row.model_arch}`);

  const snapshot = structuredClone(COMMON_BUILT_IN_SNAPSHOT) as unknown as TrainingPresetSnapshotV1;
  const process = snapshot.config.process[0] as Record<string, any>;
  process.network.linear = row.linear_rank;
  process.network.linear_alpha = row.linear_rank;
  if (row.memory_profile === 'SD') {
    process.network.conv = 16;
    process.network.conv_alpha = 16;
  }
  process.save.max_step_saves_to_keep = row.max_step_saves_to_keep;
  Object.assign(process.train, {
    steps: row.steps,
    noise_scheduler: row.noise_scheduler,
    timestep_type: row.timestep_type,
    content_or_style: row.content_or_style,
    bypass_guidance_embedding: row.memory_profile === 'Flex',
    switch_boundary_every: row.memory_profile === 'W22' ? 10 : 1,
  });
  process.model = {
    name_or_path: binding.model_path,
    arch: row.model_arch,
    ...structuredClone(BUILT_IN_PRESET_MEMORY_PROFILES[row.memory_profile]),
  };
  Object.assign(process.sample, structuredClone(BUILT_IN_PRESET_SAMPLE_PROFILES[row.sample_profile]));

  const accepted = validateBuiltInTrainingPresetRecord({
    id: row.id,
    name: row.name,
    source: 'builtin',
    read_only: true,
    schema_version: 1,
    snapshot,
    created_at: BUILT_IN_PRESET_RELEASE_TIMESTAMP,
    updated_at: BUILT_IN_PRESET_RELEASE_TIMESTAMP,
    category: row.category,
    intent_slug: row.intent_slug,
    model_arch: row.model_arch,
    catalog_revision: row.catalog_revision,
    summary: row.summary,
    recipe_path: row.recipe_path,
    prerequisites: [...row.prerequisites],
    warnings: [...row.warnings],
    evidence: row.evidence,
  });
  return copyBuiltInPreset(accepted);
}
