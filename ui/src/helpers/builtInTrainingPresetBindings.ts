export interface BuiltInTrainingPresetArchitectureBinding {
  readonly ui_arch: string;
  readonly model_path: string;
  readonly engine_arch: string;
  readonly model_class: string;
}

export const BUILT_IN_ARCHITECTURE_BINDINGS = [
  {
    ui_arch: 'anima',
    model_path: 'circlestone-labs/Anima-Base-v1.0-Diffusers',
    engine_arch: 'anima',
    model_class: 'AnimaModel',
  },
  { ui_arch: 'flux', model_path: 'black-forest-labs/FLUX.1-dev', engine_arch: 'flux', model_class: 'StableDiffusion' },
  { ui_arch: 'flex1', model_path: 'ostris/Flex.1-alpha', engine_arch: 'flux', model_class: 'StableDiffusion' },
  { ui_arch: 'qwen_image', model_path: 'Qwen/Qwen-Image', engine_arch: 'qwen_image', model_class: 'QwenImageModel' },
  {
    ui_arch: 'qwen_image_edit_plus',
    model_path: 'Qwen/Qwen-Image-Edit-2509',
    engine_arch: 'qwen_image_edit_plus',
    model_class: 'QwenImageEditPlusModel',
  },
  {
    ui_arch: 'sdxl',
    model_path: 'stabilityai/stable-diffusion-xl-base-1.0',
    engine_arch: 'sdxl',
    model_class: 'StableDiffusion',
  },
  {
    ui_arch: 'sd15',
    model_path: 'stable-diffusion-v1-5/stable-diffusion-v1-5',
    engine_arch: 'sd15',
    model_class: 'StableDiffusion',
  },
  { ui_arch: 'wan21:1b', model_path: 'Wan-AI/Wan2.1-T2V-1.3B-Diffusers', engine_arch: 'wan21', model_class: 'Wan21' },
  {
    ui_arch: 'wan22_14b:t2v',
    model_path: 'ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16',
    engine_arch: 'wan22_14b',
    model_class: 'Wan2214bModel',
  },
] as const satisfies readonly BuiltInTrainingPresetArchitectureBinding[];

export type BuiltInPresetArchitecture = (typeof BUILT_IN_ARCHITECTURE_BINDINGS)[number]['ui_arch'];

export const BUILT_IN_ARCHITECTURE_ORDER = BUILT_IN_ARCHITECTURE_BINDINGS.map(binding => binding.ui_arch);

export const BUILT_IN_CATEGORY_ORDER = [
  'character',
  'style',
  'object',
  'refinement',
  'low-vram',
  'diagnostic',
] as const;

export type BuiltInPresetCategory = (typeof BUILT_IN_CATEGORY_ORDER)[number];

export const BUILT_IN_RECIPE_PATHS = [
  'docs/book/recipes/character-identity.md',
  'docs/book/recipes/style.md',
  'docs/book/recipes/object-concept.md',
  'docs/book/recipes/focused-refinement.md',
  'docs/book/recipes/low-vram.md',
  'docs/book/recipes/diagnostic-run.md',
] as const;

export type BuiltInPresetRecipePath = (typeof BUILT_IN_RECIPE_PATHS)[number];

export const BUILT_IN_PRESET_RELEASE_TIMESTAMP = '2026-08-14T00:00:00.000Z';
export const BUILT_IN_PRESET_REVISION = 1;
