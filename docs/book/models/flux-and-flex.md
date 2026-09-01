# Train LoRAs for FLUX and Flex

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This chapter covers the focused `flux`, `flux_kontext`, and `flex1` selectors. They share flow-matching defaults, but their checkpoints, conditioning paths, dataset requirements, and architecture overrides are not interchangeable.

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
            "architecture": "flux",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "black-forest-labs/FLUX.1-dev"
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
            "architecture": "flux",
            "declaration_path": "config.process[*].model.quantize",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux",
            "declaration_path": "config.process[*].model.quantize_te",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux",
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
            "architecture": "flux",
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
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
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
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
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
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
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
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "https://huggingface.co/black-forest-labs/FLUX.1-dev"
                }
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
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
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "FLUX.1"
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "black-forest-labs/FLUX.1-dev"
                }
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux"
        },
        {
          "fact": {
            "architecture": "flux",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "black-forest-labs/FLUX.1-dev"
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
            "architecture": "flux",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux",
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
            "architecture": "flux",
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
        }
      ],
      "id": "flux"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "flux_kontext",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "black-forest-labs/FLUX.1-Kontext-dev"
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
            "architecture": "flux_kontext",
            "declaration_path": "config.process[*].model.quantize",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux_kontext",
            "declaration_path": "config.process[*].model.quantize_te",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux_kontext",
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
            "architecture": "flux_kontext",
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
            "architecture": "flux_kontext",
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
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "datasets.control_path"
                  },
                  {
                    "kind": "string",
                    "value": "sample.ctrl_img"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
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
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
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
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev"
                }
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "group",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "instruction"
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "FLUX.1-Kontext-dev"
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "black-forest-labs/FLUX.1-Kontext-dev"
                }
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flux-kontext"
        },
        {
          "fact": {
            "architecture": "flux_kontext",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "black-forest-labs/FLUX.1-Kontext-dev"
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
            "architecture": "flux_kontext",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux_kontext",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flux_kontext",
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
            "architecture": "flux_kontext",
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
            "architecture": "flux_kontext",
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
      "id": "flux_kontext"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "flex1",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ostris/Flex.1-alpha"
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
            "architecture": "flex1",
            "declaration_path": "config.process[*].model.quantize",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flex1",
            "declaration_path": "config.process[*].model.quantize_te",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flex1",
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
            "architecture": "flex1",
            "declaration_path": "config.process[*].train.bypass_guidance_embedding",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.bypass_guidance_embedding",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
          "setting_id": "train.bypass_guidance_embedding"
        },
        {
          "fact": {
            "architecture": "flex1",
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
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
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
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
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
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
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
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
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
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Flex.1"
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "ostris/Flex.1-alpha"
                }
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.flex1"
        },
        {
          "fact": {
            "architecture": "flex1",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ostris/Flex.1-alpha"
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
            "architecture": "flex1",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flex1",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.quantize_te",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
            "architecture": "flex1",
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
            "architecture": "flex1",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.bypass_guidance_embedding",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
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
          "setting_id": "train.bypass_guidance_embedding"
        },
        {
          "fact": {
            "architecture": "flex1",
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
        }
      ],
      "id": "flex1"
    }
  ],
  "deferred_settings": [],
  "schema_version": 1
}
```
<!-- model-facts:end -->

## What this family covers

Use `flux` for ordinary text-to-image FLUX.1 LoRA training, `flux_kontext` for instruction/edit training with paired image conditioning, and `flex1` for the Flex.1 image architecture. The current selected paths are:

- `black-forest-labs/FLUX.1-dev` for `flux`;
- `black-forest-labs/FLUX.1-Kontext-dev` for `flux_kontext`;
- `ostris/Flex.1-alpha` for `flex1`.

The names are architecture discriminators, not cosmetic labels. A Kontext dataset does not become a regular FLUX dataset when the selector changes, and a Flex checkpoint is not a drop-in FLUX.1 replacement.

## Model access and paths

The catalog records `https://huggingface.co/black-forest-labs/FLUX.1-dev` as the FLUX.1 gate URL and the corresponding Kontext repository URL for `flux_kontext`. Accept any required upstream terms and authenticate before queueing; a local file-exists check does not prove remote access.

No gate URL is recorded for the current `ostris/Flex.1-alpha` selector. That absence is not a license grant. Record the checkpoint revision and review the source terms for every model used.

Keep selector and checkpoint path paired exactly. Variant suffixes and repository names are not interchangeable: using a plausible but wrong path can fail at load time or, worse, create a misleading conditioning mismatch.

## Dataset and captions

Regular FLUX.1 and Flex.1 use ordinary curated image/caption datasets. Vary the semantic content for style work and vary viewpoint, context, scale, and lighting for object or identity work. Use one stable trigger and caption attributes that should remain controllable.

FLUX Kontext is an instruction/edit architecture. Its UI adds `datasets.control_path` and `sample.ctrl_img`. Every training target must be paired with the intended control image by the dataset's matching rules, and the spatial transforms must preserve correspondence. A training caption should describe the intended result or transformation consistently with the configuration, not silently contradict the paired input.

At sampling time, supply a real `ctrl_img` that was not used as a target duplicate. A missing, misaligned, or unrelated control image makes the edit evaluation invalid. Follow [control and paired-input curation](../datasets/controls-video-audio.md).

## Starting configuration

All three selectors use `flowmatch` for the selected sampling scheduler and training noise scheduler. Preserve that pairing in the first baseline. Kontext additionally selects a `weighted` timestep type; do not transfer that override to another variant without a controlled reason.

The selected FLUX.1, Kontext, and Flex.1 transitions enable model and text-encoder quantization. Keep the exact resolved qtypes and exclusion patterns from the chosen configuration recorded. Quantization is a memory/compatibility choice, not evidence that the LoRA will learn faster or better.

Flex.1 selects `bypass_guidance_embedding: true`. Preserve it for the baseline instead of copying a guidance-embedding assumption from FLUX.1. Choose LoRA rank, alpha, learning rate, and duration from the role recipe, then change one variable per comparison.

## Memory, quantization, and offloading

Measure loading, the largest bucket, backward pass, checkpoint save, and real sample pass separately. Text encoders, cached embeddings, transformer activations, optimizer state, and sampling can peak at different times.

The selected quantization toggles reduce memory only through the supported implementation and resolved qtypes. More aggressive quantization can trade numerical fidelity, compatibility, or throughput. Do not assume the same exclusions suit all three variants.

Text-embedding and latent caches can avoid repeated encoder work, but they are tied to the relevant model components, captions, image preprocessing, and augmentation policy. Rebuild stale caches after changing those inputs. If offloading is introduced through advanced configuration, record host-memory use and step-time cost rather than describing it as free VRAM.

## Sampling and evaluation

Create a sample suite with a fixed seed before training. Hold model revision, sampler, dimensions, inference steps, prompts, and LoRA strength constant across checkpoints. Compare trigger-on and trigger-off behavior plus held-out content appropriate to the concept.

For Kontext, keep a fixed set of paired control images and transformation prompts. Evaluate whether the output follows both the control input and instruction while preserving unrelated details. For regular FLUX.1 and Flex.1, evaluate prompt control and generalization without inventing an edit-input path.

Use periodic checkpoint grids and confirm candidates across additional seeds. Loss is an optimization signal, not a perceptual ranking. Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Incompatibilities and cautions

The Simple UI hides `network.conv` for all three focused selectors. Treat that as an architecture/UI contract; do not copy convolutional LoRA fields from another family into a baseline.

Kontext's `control_path` and `ctrl_img` are paired requirements for training and evaluation, not optional decoration. Conversely, regular `flux` and `flex1` do not gain Kontext behavior by adding a similarly named image field.

Do not change selector, checkpoint, conditioning data, quantization, scheduler, and caption strategy in one experiment. A successful load does not prove the combination is semantically compatible, and a failed sample cannot identify which simultaneous change caused it.

## Further reading

- [Style recipe](../recipes/style.md)
- [Object and product recipe](../recipes/object-concept.md)
- [Character and identity recipe](../recipes/character-identity.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Control, video, and audio datasets](../datasets/controls-video-audio.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Job and model settings reference](../reference/job-and-model.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
