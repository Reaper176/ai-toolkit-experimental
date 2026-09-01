# Train LoRAs for SDXL and Stable Diffusion 1.5

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This chapter covers the focused `sdxl` and `sd15` selectors. Both use a DDPM training path in the current catalog, but their checkpoints, latent-scale expectations, text conditioning, and useful resolutions are not interchangeable.

## Catalog-verified facts

<!-- model-facts:start -->
<!-- generated; edit settings-catalog.json instead -->
```json
{
  "architectures": [
    {
      "facts": [
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "stabilityai/stable-diffusion-xl-base-1.0"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            }
          },
          "setting_id": "model.name_or_path"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].model.quantize",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            }
          },
          "setting_id": "model.quantize"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].model.quantize_te",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            }
          },
          "setting_id": "model.quantize_te"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].sample.guidance_scale",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.guidance_scale",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 6
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 4
              }
            }
          },
          "setting_id": "sample.guidance_scale"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].sample.sampler",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "sample.sampler"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "declaration_path": "config.process[*].train.noise_scheduler",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "train.noise_scheduler"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "controls",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "disable_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "model.quantize"
                  },
                  {
                    "kind": "string",
                    "value": "train.timestep_type"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "group",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "image"
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "SDXL"
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "stabilityai/stable-diffusion-xl-base-1.0"
                }
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sdxl"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "stabilityai/stable-diffusion-xl-base-1.0"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            }
          },
          "setting_id": "model.name_or_path"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            }
          },
          "setting_id": "model.quantize"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            }
          },
          "setting_id": "model.quantize_te"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.guidance_scale",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 6
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 4
              }
            }
          },
          "setting_id": "sample.guidance_scale"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "sample.sampler"
        },
        {
          "fact": {
            "architecture": "sdxl",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "train.noise_scheduler"
        }
      ],
      "id": "sdxl"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "stable-diffusion-v1-5/stable-diffusion-v1-5"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            }
          },
          "setting_id": "model.name_or_path"
        },
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].sample.guidance_scale",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.guidance_scale",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 6
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 4
              }
            }
          },
          "setting_id": "sample.guidance_scale"
        },
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].sample.height",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.height",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 512
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1024
              }
            }
          },
          "setting_id": "sample.height"
        },
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].sample.sampler",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "sample.sampler"
        },
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].sample.width",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.width",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 512
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1024
              }
            }
          },
          "setting_id": "sample.width"
        },
        {
          "fact": {
            "architecture": "sd15",
            "declaration_path": "config.process[*].train.noise_scheduler",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "train.noise_scheduler"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "controls",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "disable_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "model.quantize"
                  },
                  {
                    "kind": "string",
                    "value": "train.timestep_type"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "group",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "image"
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "SD 1.5"
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "stable-diffusion-v1-5/stable-diffusion-v1-5"
                }
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.sd15"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "stable-diffusion-v1-5/stable-diffusion-v1-5"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            }
          },
          "setting_id": "model.name_or_path"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.guidance_scale",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 6
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 4
              }
            }
          },
          "setting_id": "sample.guidance_scale"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.height",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 512
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1024
              }
            }
          },
          "setting_id": "sample.height"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "sample.sampler"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.width",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 512
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1024
              }
            }
          },
          "setting_id": "sample.width"
        },
        {
          "fact": {
            "architecture": "sd15",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ddpm"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
              }
            }
          },
          "setting_id": "train.noise_scheduler"
        }
      ],
      "id": "sd15"
    }
  ],
  "deferred_settings": [],
  "schema_version": 1
}
```
<!-- model-facts:end -->

## What this family covers

Use `sdxl` with the selected `stabilityai/stable-diffusion-xl-base-1.0` path and `sd15` with `stable-diffusion-v1-5/stable-diffusion-v1-5`. They are separate base-model families, not small and large modes of one checkpoint.

SDXL is generally the appropriate starting family for a 1024-scale image workflow when its base capabilities fit the concept. SD 1.5 remains useful for its smaller 512-scale pipeline, ecosystem, and lower resource demands. These are practical starting scales, not requirements that every source be square.

## Model access and paths

The catalog records no gate URL for either selector. Verify repository terms, access, revision, and any derivative checkpoint license independently. Store the exact model identity with the training configuration.

Do not load an SD 1.5 checkpoint under `sdxl`, an SDXL checkpoint under `sd15`, or assume that a LoRA trained for one will attach correctly to the other. Tensor shapes, conditioning, and target modules differ even when filenames use familiar Stable Diffusion terminology.

If using a derivative base, confirm that it truly belongs to the selected family and compare against the same base during sampling. Changing the base checkpoint between training and evaluation can hide or exaggerate LoRA behavior.

## Dataset and captions

Curate the same semantic coverage demanded by the role: varied identity context, diverse style content, or multiple object viewpoints. Remove duplicates and preserve enough source detail for the selected training resolution.

For SDXL, begin with resolution buckets centered on the intended 1024-scale workflow when memory and source quality support it. For SD 1.5, the selector's sample defaults are `512` by `512`; use aspect-ratio buckets rather than forcing every image into a square crop. Follow [resolution and bucketing](../datasets/resolution-and-bucketing.md).

Use one consistent trigger and accurate attribute captions. SDXL and SD 1.5 do not share an identical text-conditioning stack, so text encoder training, cached embeddings, token limits, and caption behavior must be validated within the selected family. Do not reuse text-embedding caches across them.

## Starting configuration

Both selectors choose `ddpm` for the sample scheduler and training noise scheduler. Their selected guidance scale is `6`. Preserve these values for the first checkpoint grid so the architecture comparison is not confounded by a sampler change.

The SDXL selection explicitly leaves model and text-encoder quantization `false`; both selectors hide the model quantization and timestep-type sections in the Simple UI. Do not paste flow-matching timestep settings or quantization fields from a transformer-family recipe.

Choose rank, alpha, learning rate, optimizer, and duration from the role recipe, then run a short diagnostic. SDXL's larger pipeline may call for different memory compromises from SD 1.5, but optimizer changes also affect state memory and update behavior. Keep the optimizer constant when comparing capacity or duration.

Start with text encoder training off unless the experiment specifically needs conditioning adaptation and the selected family configuration supports it. Enabling it adds memory, trainable parameters, and another overfitting path; it is not an automatic remedy for weak captions.

## Memory, quantization, and offloading

Measure the largest bucket, backward pass, save, and actual sample pass. SDXL normally has a higher memory burden than SD 1.5 at their respective starting scales, but no fixed card-capacity statement is reliable across optimizers, precision, batch shape, checkpointing, and software versions.

Use batch size 1, gradient checkpointing, compatible caches, and measured resolution choices before inventing unsupported quantization. The Simple UI intentionally hides model quantization for these selectors. Advanced settings do not become compatible merely because a YAML parser accepts the key.

Latent caches depend on the VAE, source images, crop/bucket behavior, and cache-dependent augmentations. Text caches depend on the selected conditioning stack, captions, tokenization, encoders, and supported dropout variants. Rebuild after changing those determinants.

## Sampling and evaluation

Prepare a fixed seed, prompt suite, dimensions, DDPM sampler, inference steps, guidance scale, and LoRA strength before training. Use family-appropriate dimensions: do not compare a 512 SD 1.5 output directly with a 1024 SDXL output and attribute every difference to training.

Include trigger-on/off prompts, familiar and held-out content, and prompts that test composition rather than only close crops. Compare periodic checkpoints at the same settings, then verify the preferred checkpoint across more seeds.

Loss confirms optimization but does not select the best perceptual checkpoint. Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Incompatibilities and cautions

SDXL and SD 1.5 checkpoints, LoRA weights, text-embedding caches, and architecture-specific target modules are not interchangeable. Keep family identity explicit in filenames and run records.

The UI hides `model.quantize` and `train.timestep_type` for both selectors. Do not transfer Qwen/FLUX low-memory defaults or flow-matching scheduler assumptions into this DDPM baseline.

Resolution, batch size, optimizer, text encoder training, rank, and duration all affect memory or learning behavior. Change one major axis at a time. If lowering resolution is necessary, treat it as a possible detail/quality change rather than a free optimization.

## Further reading

- [Character and identity recipe](../recipes/character-identity.md)
- [Style recipe](../recipes/style.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Optimizers and schedulers reference](../reference/optimizers-and-schedulers.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
