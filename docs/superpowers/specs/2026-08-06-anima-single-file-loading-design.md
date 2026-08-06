# Anima Single-File Loading Design

## Goal

Allow Anima training jobs to use a local ComfyUI-style `.safetensors`
checkpoint together with explicit local Qwen3 text-encoder and Qwen Image VAE
files. Preserve the existing behavior for Hugging Face model IDs and complete
Diffusers directories.

The motivating job uses:

- Anima checkpoint:
  `/run/media/john/Athalor/temper/Models/checkpoints/anima/anima_baseV10.safetensors`
- Qwen3 text encoder:
  `/run/media/john/Athalor/temper/Models/TextEncoders/qwen_3_06b_base.safetensors`
- Qwen Image VAE:
  `/run/media/john/Athalor/temper/Models/VAE/anima/qwen_image_vae.safetensors`

## Root Cause

`AnimaModel.load_model` currently passes `model.name_or_path` directly to
`AnimaAutoBlocks().init_pipeline`. That method expects a Hugging Face model ID
or a directory containing `modular_model_index.json` or `model_index.json`.
When it receives a valid single-file Anima checkpoint, pipeline initialization
fails before any ROCm or model-weight loading occurs.

The checkpoint is not a complete pipeline archive. It contains both the Anima
Cosmos transformer (`net.*`) and its matching text conditioner
(`net.llm_adapter.*`). The Qwen3 encoder, VAE, tokenizers, and scheduler are
separate components.

## User-Facing Configuration

The Anima job form will expose two optional fields in the Model section:

- **Text Encoder Path** maps to the existing `model.te_name_or_path` key.
- **VAE Path** maps to the existing `model.vae_path` key.

These controls appear only for the Anima architecture. Their values are stored
in the job configuration, so editing or cloning a configured job preserves the
component choices. Personal absolute paths will not be hard-coded as portable
application defaults.

The failed `my_first_lora_v1` job will be updated after verification to use the
three local paths listed above. A backup of `aitk_db.db` will be created before
that database update.

## Loading Modes

The loader selects one of two modes from `model.name_or_path`:

1. **Existing pipeline mode:** A Hugging Face model ID or local Diffusers
   directory follows the current pipeline initialization and component-loading
   behavior.
2. **Single-file mode:** An existing local file with a `.safetensors` extension
   uses the component assembly flow described below.

Other local files are rejected with an actionable unsupported-format error.
The mode decision is isolated in a small helper so it can be tested without
loading model weights.

## Single-File Component Assembly

The official `circlestone-labs/Anima-Base-v1.0-Diffusers` repository supplies
the pipeline structure and component configuration. It also supplies the
tokenizers and scheduler metadata because those are not safetensors weights.
Only small configuration and tokenizer artifacts may be downloaded when they
are absent from the Hugging Face cache.

The loader performs these steps in order:

1. Validate the Anima checkpoint, text-encoder path, and VAE path before large
   allocations. Single-file mode requires both local component paths.
2. Initialize the modular Anima pipeline structure from the official repository
   metadata without loading its transformer, conditioner, text encoder, or VAE
   weights.
3. Load the local checkpoint's Cosmos transformer weights through Diffusers'
   supported original-checkpoint conversion path and official transformer
   configuration.
4. Extract only `net.llm_adapter.*` tensors from the same checkpoint, strip the
   checkpoint wrapper prefix, and strictly load them into an
   `AnimaTextConditioner` created from the official conditioner configuration.
5. Create the Qwen3 text encoder from its official configuration and strictly
   load the local `te_name_or_path` safetensors.
6. Create the Qwen Image VAE from its official configuration, normalize the
   ComfyUI-style VAE keys into Diffusers component keys, and strictly load the
   local `vae_path` weights.
7. Load the tokenizers and scheduler metadata, register all resolved components
   on the modular pipeline, and continue through the existing scheduler update,
   quantization, layer offloading, and device-placement flow.

Loading the conditioner separately is required. Passing the complete checkpoint
only to `CosmosTransformer3DModel.from_single_file` loads the transformer but
reports the conditioner tensors as unused; silently accepting that state would
pair a custom transformer with the wrong conditioner.

## Validation and Errors

The loader will fail before training with messages that name the component and
configured path when:

- a required path is blank, missing, or not a regular file;
- a local component is not a `.safetensors` file;
- checkpoint prefixes do not identify an Anima transformer and conditioner;
- strict state-dictionary loading finds missing, unexpected, or incompatible
  tensors;
- official configuration or tokenizer metadata is unavailable from both cache
  and network.

Supplying an explicit local component path never silently falls back to the
official component weights. Existing pipeline mode retains its present errors
and fallback behavior.

## UI and Type Changes

The frontend `ModelConfig` type will include optional `te_name_or_path` and
`vae_path` properties. The model-option metadata will gain Anima-only additional
sections for these fields, following the existing conditional controls used for
low-VRAM, layer-offloading, and adapter paths.

Changing away from the Anima architecture will clear fields that are not
supported by the newly selected architecture, following the existing
architecture-change cleanup pattern. Existing saved jobs without these keys
remain valid in pipeline mode.

## Testing

Implementation will follow test-driven development.

Automated tests will cover:

- selection of pipeline mode versus local single-file mode;
- validation of required local paths and file extensions;
- separation and prefix normalization of transformer and conditioner tensors;
- deterministic normalization of ComfyUI Qwen Image VAE keys;
- rejection of missing or incompatible conditioner tensors;
- the regression that a `.safetensors` path is not passed directly to
  `AnimaAutoBlocks.init_pipeline`;
- preservation of existing Hugging Face and local Diffusers-directory behavior;
- frontend defaults, conditional visibility, and architecture-change cleanup for
  the two component path fields where practical in the current test setup.

Final integration verification will use the three real local files. It must
show that the loader reaches `Model Loaded` on GPU 0, the AMD Radeon RX 7900 XTX.
The verification run will then be stopped before committing to the complete
100-step training job. The database job record will be updated only after this
loader verification succeeds.

## Scope Boundaries

This change supports Anima single-file checkpoints and the matching local
Qwen3/Qwen Image component formats. It does not add a general model converter,
automatic filesystem discovery, machine-wide component defaults, support for
arbitrary text encoders or VAEs, or changes to ROCm device selection.
