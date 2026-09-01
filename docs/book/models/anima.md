# Train LoRAs for Anima

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This chapter narrows the general LoRA workflow to ai-toolkit's `anima` architecture. Treat the generated catalog block as the exact UI/default record and the prose as guidance for constructing and evaluating a run.

## Catalog-verified facts

<details>
<summary>Catalog-verified facts (generated)</summary>

<!-- model-facts:start -->
<!-- generated; edit settings-catalog.json instead -->
```json
{
  "architectures": [
    {
      "facts": [
        {
          "fact": {
            "architecture": "anima",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "circlestone-labs/Anima-Base-v1.0-Diffusers"
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
            "architecture": "anima",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
              }
            }
          },
          "setting_id": "model.qtype"
        },
        {
          "fact": {
            "architecture": "anima",
            "declaration_path": "config.process[*].model.qtype_te",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
              }
            }
          },
          "setting_id": "model.qtype_te"
        },
        {
          "fact": {
            "architecture": "anima",
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
            "architecture": "anima",
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
            "architecture": "anima",
            "declaration_path": "config.process[*].sample.neg",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.neg",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, signature, artist name"
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
          "setting_id": "sample.neg"
        },
        {
          "fact": {
            "architecture": "anima",
            "declaration_path": "config.process[*].sample.sampler",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
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
            "architecture": "anima",
            "declaration_path": "config.process[*].train.noise_scheduler",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
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
            "architecture": "anima",
            "declaration_path": "config.process[*].train.timestep_type",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.timestep_type",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "weighted"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "sigmoid"
              }
            }
          },
          "setting_id": "train.timestep_type"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "model.low_vram"
                  },
                  {
                    "kind": "string",
                    "value": "model.layer_offloading"
                  },
                  {
                    "kind": "string",
                    "value": "model.te_name_or_path"
                  },
                  {
                    "kind": "string",
                    "value": "model.vae_path"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
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
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "disable_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "network.conv"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
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
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Anima"
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "circlestone-labs/Anima-Base-v1.0-Diffusers"
                }
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.anima"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "circlestone-labs/Anima-Base-v1.0-Diffusers"
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
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
              }
            }
          },
          "setting_id": "model.qtype"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": ""
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
              }
            }
          },
          "setting_id": "model.qtype_te"
        },
        {
          "fact": {
            "architecture": "anima",
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
            "architecture": "anima",
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
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.neg",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, signature, artist name"
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
          "setting_id": "sample.neg"
        },
        {
          "fact": {
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.sampler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
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
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.noise_scheduler",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "flowmatch"
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
            "architecture": "anima",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.timestep_type",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "weighted"
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "sigmoid"
              }
            }
          },
          "setting_id": "train.timestep_type"
        }
      ],
      "id": "anima"
    }
  ],
  "deferred_settings": [
    {
      "aliases": [],
      "applicability": [
        {
          "engine_architecture": "anima"
        }
      ],
      "authority": "user",
      "contract": {
        "example_type": "integer",
        "null": "rejected",
        "parser_type": "integer",
        "range": {
          "maximum_inclusive": true,
          "minimum": 1,
          "minimum_inclusive": true
        },
        "supported_type": "positive-integer"
      },
      "defaults": [
        {
          "applicability": [
            {
              "engine_architecture": "anima"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": 512
        }
      ],
      "id": "model.anima.model_kwargs.max_sequence_length",
      "interactions": [],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.max_sequence_length"
        }
      ],
      "normalizations": [],
      "persistence": "config",
      "render": {
        "anchor": "model-anima-model-kwargs-max-sequence-length",
        "benefits": "Longer captions can preserve more prompt context.",
        "description": "Limits the token sequence length used by the Anima text conditioner.",
        "drawbacks": "Longer sequences increase text-encoding memory and compute.",
        "example": "max_sequence_length: 512",
        "page": "models/anima.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "max_sequence_length",
          "read_kind": "model_kwargs.get",
          "source": "extensions_built_in/diffusion_models/anima/anima.py",
          "symbol": "AnimaModel.__init__"
        }
      ],
      "surfaces": [
        "advanced-yaml"
      ]
    },
    {
      "aliases": [],
      "applicability": [
        {
          "engine_architecture": "anima"
        }
      ],
      "authority": "user",
      "contract": {
        "accepted_values": [
          false,
          true,
          null
        ],
        "example_type": "boolean",
        "null": "accepted",
        "parser_type": "boolean",
        "supported_type": "boolean"
      },
      "defaults": [
        {
          "applicability": [
            {
              "engine_architecture": "anima"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": false
        }
      ],
      "id": "model.anima.model_kwargs.train_text_conditioner",
      "interactions": [],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.train_text_conditioner"
        }
      ],
      "normalizations": [
        {
          "applicability": [
            {
              "engine_architecture": "anima"
            }
          ],
          "description": "Explicit null is preserved by model_kwargs.get and acts falsey at boolean consumers."
        }
      ],
      "persistence": "config",
      "render": {
        "anchor": "model-anima-model-kwargs-train-text-conditioner",
        "benefits": "Allows the conditioning projection to adapt to the dataset.",
        "description": "Enables gradient training for Anima text-conditioner projection layers.",
        "drawbacks": "Adds trainable parameters and memory use and can overfit text conditioning.",
        "example": "train_text_conditioner: false",
        "page": "models/anima.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "train_text_conditioner",
          "read_kind": "model_kwargs.get",
          "source": "extensions_built_in/diffusion_models/anima/anima.py",
          "symbol": "AnimaModel.__init__"
        }
      ],
      "surfaces": [
        "advanced-yaml"
      ]
    }
  ],
  "schema_version": 1
}
```
<!-- model-facts:end -->
</details>

## What this family covers

Anima is an image-generation architecture in the Simple UI. The current selected model path is `circlestone-labs/Anima-Base-v1.0-Diffusers`. The catalog records no gate URL and no architecture-specific control input for this selector; verify model access and license terms at the source you actually use.

Use Anima for still-image character, identity, style, object, or focused-refinement experiments when its base capabilities match the goal. It is not a video architecture, and settings copied from Wan, FLUX, Qwen Image, SDXL, or SD 1.5 are not interchangeable merely because each can train a LoRA.

## Model access and paths

Start with the catalog-selected path unless a compatible local or remote Anima checkpoint has been validated. Record the exact revision with the job. The UI exposes optional text-encoder and VAE path sections for Anima; changing either component changes the conditioning or latent pipeline and can invalidate caches or comparisons.

The model-specific `model_kwargs` include:

- `max_sequence_length`, whose engine fallback is `512`; longer sequences retain more caption context but consume more text-encoding memory and compute;
- `train_text_conditioner`, whose engine fallback is `false`; enabling it adds trainable projection parameters, memory use, and another route to text-conditioning overfitting.

Keep both at their fallback values for the first baseline unless the experiment has a measured reason to change them. `train_text_conditioner` is distinct from the general text-encoder training switch.

## Dataset and captions

Curate for the intended role before choosing capacity. For an identity, vary viewpoint, pose, expression, clothing, background, and lighting. For a style, preserve treatment while varying semantic content. For a focused mask experiment, first retain an unmasked control run.

Use one consistent trigger and caption attributes that should remain controllable. Do not depend on the `512` token ceiling to compensate for vague, repetitive, or inaccurate captions. Decide caption and dropout behavior before enabling text-embedding caches; follow [captions and triggers](../datasets/captions-and-triggers.md).

A `1024`-pixel square bucket is a reasonable diagnostic starting point when the sources support that detail, but it is not a universal Anima requirement or VRAM guarantee. Preserve aspect ratios through the documented bucket policy and test the largest actual bucket before a long run.

## Starting configuration

Select the `anima` architecture and confirm the resolved model path. The current architecture transition sets both the sampling scheduler and training noise scheduler to `flowmatch`, with a `weighted` timestep type. Preserve those values for the first controlled baseline.

Choose rank, alpha, learning rate, and duration from the role recipe rather than inventing an architecture-wide optimum. For example, the identity recipe begins with a bounded rank and learning-rate experiment; run its short diagnostic before extending to thousands of steps. Keep optimizer, scheduler, seed, prompts, dimensions, and dataset version recorded with every comparison.

The Anima UI selection leaves model and text-encoder quantization switches `false` and their selected qtype values empty. That is a factual default, not a claim that quantization is unsupported or always undesirable. Add a supported qtype only as a separate memory experiment.

## Memory, quantization, and offloading

Anima exposes `low_vram`, layer offloading, custom text-encoder path, and custom VAE path sections. Their presence means the controls are available; it does not mean every control is enabled or that a particular graphics card is guaranteed to fit.

Measure peak memory on the largest training bucket and on a real sample pass. Apply compatible interventions one at a time: batch size 1, text-embedding and latent caches, gradient checkpointing, supported quantization, then `low_vram` or layer offloading. Caching reduces repeated encoder work but can freeze cache-dependent caption or image transformations. Offloading trades device memory for transfers, host memory, and lower throughput.

Changing the VAE, text encoder, image preprocessing, captions, or relevant dropout policy can make old cache artifacts stale. Rebuild rather than assume they remain reusable. See the [low-VRAM recipe](../recipes/low-vram.md) for a controlled memory ladder.

## Sampling and evaluation

Prepare samples before training and use a fixed seed, prompt suite, inference dimensions, sampler, inference steps, and LoRA strength across checkpoints. Include trigger-on and trigger-off prompts plus held-out subjects, backgrounds, poses, or compositions appropriate to the role.

Use `flowmatch` consistently for the baseline sample comparison. The catalog also records Anima's selected negative-prompt text; if you change it, record that as an evaluation-variable change rather than attributing every output difference to the LoRA.

Sample periodically and compare grids. Loss confirms optimization activity but does not rank identity, prompt control, style transfer, or generalization. Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md) and verify promising checkpoints across additional seeds.

## Incompatibilities and cautions

The Simple UI hides the convolutional-network section for Anima (`network.conv`). Do not infer compatibility from an advanced key merely because another architecture exposes it. Use the architecture-specific selector and generated facts as the starting contract.

Do not simultaneously change `max_sequence_length`, enable `train_text_conditioner`, quantize components, alter the VAE, and increase LoRA capacity. Each affects a different part of the pipeline, and a combined change cannot identify the cause of improvement or failure.

An all-white ordinary non-inverted mask is equivalent to no mask; mask inversion and the inverted-mask prior are separate behaviors. Neither is an Anima default. Use the [focused-refinement recipe](../recipes/focused-refinement.md) only after an unmasked baseline demonstrates a spatial problem.

## Further reading

- [Character and identity recipe](../recipes/character-identity.md)
- [Focused-refinement recipe](../recipes/focused-refinement.md)
- [Low-VRAM recipe](../recipes/low-vram.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Job and model settings reference](../reference/job-and-model.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
