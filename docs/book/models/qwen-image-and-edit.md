# Train LoRAs for Qwen Image and Image Edit

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](flux-and-flex.md) · [Next →](sdxl-and-sd15.md)
<!-- book-navigation:end -->

This chapter covers five focused Qwen selectors: two text-to-image variants and three edit variants. Their version suffixes, checkpoint paths, and control-input shapes are not interchangeable.

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
            "architecture": "qwen_image",
            "declaration_path": "config.process[*].model.low_vram",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image"
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
            "architecture": "qwen_image",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "3 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint3|ostris/accuracy_recovery_adapters/qwen_image_torchao_uint3.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
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
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
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
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
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
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
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
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Qwen-Image"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Qwen/Qwen-Image"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image"
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
            "architecture": "qwen_image",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
            "architecture": "qwen_image",
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
      "id": "qwen_image"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "declaration_path": "config.process[*].model.low_vram",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-2512"
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
            "architecture": "qwen_image:2512",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "3 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint3|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint3.safetensors"
                      }
                    },
                    {
                      "key": "4 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint4|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint4.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
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
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
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
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
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
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
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
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Qwen-Image-2512"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Qwen/Qwen-Image-2512"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-2512"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-2512"
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
            "architecture": "qwen_image:2512",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
            "architecture": "qwen_image:2512",
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
      "id": "qwen_image:2512"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "declaration_path": "config.process[*].model.low_vram",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit"
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
            "architecture": "qwen_image_edit",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "3 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_torchao_uint3.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
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
                  },
                  {
                    "kind": "string",
                    "value": "model.low_vram"
                  },
                  {
                    "kind": "string",
                    "value": "model.layer_offloading"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
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
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
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
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
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
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Qwen-Image-Edit"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Qwen/Qwen-Image-Edit"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit"
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
            "architecture": "qwen_image_edit",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
            "architecture": "qwen_image_edit",
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
      "id": "qwen_image_edit"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "declaration_path": "config.process[*].model.low_vram",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "declaration_path": "config.process[*].model.model_kwargs",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.model_kwargs.match_target_res",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit-2509"
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
            "architecture": "qwen_image_edit_plus",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
            "declaration_path": "config.process[*].train.unload_text_encoder",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.unload_text_encoder",
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
          "setting_id": "train.unload_text_encoder"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-container",
            "path": "config.process[*].model.model_kwargs",
            "selected_present": true,
            "unselected_present": true
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "3 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_2509_torchao_uint3.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "datasets.multi_control_paths"
                  },
                  {
                    "kind": "string",
                    "value": "sample.multi_ctrl_imgs"
                  },
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
                    "value": "model.qie.match_target_res"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
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
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "disable_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "network.conv"
                  },
                  {
                    "kind": "string",
                    "value": "train.unload_text_encoder"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
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
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Qwen-Image-Edit-2509"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Qwen/Qwen-Image-Edit-2509"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.model_kwargs.match_target_res",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit-2509"
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
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
            "architecture": "qwen_image_edit_plus",
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
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.unload_text_encoder",
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
          "setting_id": "train.unload_text_encoder"
        }
      ],
      "id": "qwen_image_edit_plus"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "declaration_path": "config.process[*].model.low_vram",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "declaration_path": "config.process[*].model.model_kwargs",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.model_kwargs.match_target_res",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit-2511"
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
            "architecture": "qwen_image_edit_plus:2511",
            "declaration_path": "config.process[*].model.qtype",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
            "declaration_path": "config.process[*].train.unload_text_encoder",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.unload_text_encoder",
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
          "setting_id": "train.unload_text_encoder"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-container",
            "path": "config.process[*].model.model_kwargs",
            "selected_present": true,
            "unselected_present": true
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "3 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_2511_torchao_uint3.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "datasets.multi_control_paths"
                  },
                  {
                    "kind": "string",
                    "value": "sample.multi_ctrl_imgs"
                  },
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
                    "value": "model.qie.match_target_res"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
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
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "disable_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "network.conv"
                  },
                  {
                    "kind": "string",
                    "value": "train.unload_text_encoder"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
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
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Qwen-Image-Edit-2511"
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Qwen/Qwen-Image-Edit-2511"
                }
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.qwen-image-edit-plus-2511"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.low_vram",
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
          "setting_id": "model.low_vram"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.model_kwargs.match_target_res",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": false
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.qwen_image_edit_plus.model_kwargs.match_target_res"
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Qwen/Qwen-Image-Edit-2511"
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
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.qtype",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "qfloat8"
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
            "architecture": "qwen_image_edit_plus:2511",
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
        },
        {
          "fact": {
            "architecture": "qwen_image_edit_plus:2511",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.unload_text_encoder",
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
          "setting_id": "train.unload_text_encoder"
        }
      ],
      "id": "qwen_image_edit_plus:2511"
    }
  ],
  "deferred_settings": [
    {
      "aliases": [],
      "applicability": [
        {
          "ui_architecture": "qwen_image_edit_plus"
        },
        {
          "ui_architecture": "qwen_image_edit_plus:2511"
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
              "ui_architecture": "qwen_image_edit_plus"
            },
            {
              "ui_architecture": "qwen_image_edit_plus:2511"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": false
        },
        {
          "applicability": [
            {
              "ui_architecture": "qwen_image_edit_plus"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": false
        },
        {
          "applicability": [
            {
              "ui_architecture": "qwen_image_edit_plus"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        },
        {
          "applicability": [
            {
              "ui_architecture": "qwen_image_edit_plus:2511"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": false
        },
        {
          "applicability": [
            {
              "ui_architecture": "qwen_image_edit_plus:2511"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        }
      ],
      "id": "model.qwen_image_edit_plus.model_kwargs.match_target_res",
      "interactions": [],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.match_target_res"
        }
      ],
      "normalizations": [
        {
          "applicability": [
            {
              "ui_architecture": "qwen_image_edit_plus"
            },
            {
              "ui_architecture": "qwen_image_edit_plus:2511"
            }
          ],
          "description": "Explicit null is preserved and acts falsey, retaining the fixed default control-image pixel budget."
        }
      ],
      "persistence": "config",
      "render": {
        "anchor": "model-qwen-image-edit-plus-model-kwargs-match-target-res",
        "benefits": "Aligns control-image token detail with the target output resolution.",
        "description": "Sizes encoded Qwen Image Edit Plus control images from the current target latent resolution instead of the fixed control-image pixel budget.",
        "drawbacks": "Large target resolutions increase control-image encoding memory and time and can reduce consistency across buckets.",
        "example": "match_target_res: false",
        "page": "models/qwen-image-and-edit.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "match_target_res",
          "read_kind": "model_kwargs.get",
          "source": "extensions_built_in/diffusion_models/qwen_image/qwen_image_edit_plus.py",
          "symbol": "QwenImageEditPlusModel.get_noise_prediction"
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

Choose the selector that matches the actual task and checkpoint:

- `qwen_image` uses `Qwen/Qwen-Image` for text-to-image generation;
- `qwen_image:2512` uses `Qwen/Qwen-Image-2512` for that specific generation revision;
- `qwen_image_edit` uses `Qwen/Qwen-Image-Edit` with a single paired control/edit input;
- `qwen_image_edit_plus` uses `Qwen/Qwen-Image-Edit-2509` with multi-control input support;
- `qwen_image_edit_plus:2511` uses `Qwen/Qwen-Image-Edit-2511` with the corresponding multi-control path.

Do not strip a suffix or substitute a newer repository while leaving the old architecture discriminator. A similar name does not prove state-dict, conditioning, or preprocessing compatibility.

## Model access and paths

The catalog records no gate URL for these five selectors. That means only that the UI fact is absent; it is not a license or access claim. Verify the source repository, revision, terms, authentication, and local storage before starting a job.

Keep a resolved configuration or job export beside each experiment. Record both selector and `name_or_path`, because “Qwen Image Edit” alone does not distinguish the base edit model, the 2509 Edit Plus model, and the 2511 variant.

Changing model revision can change latent, text, or control encoding behavior. Rebuild relevant caches and rerun a short diagnostic rather than reusing artifacts solely because filenames still match.

## Dataset and captions

For `qwen_image` and `qwen_image:2512`, use ordinary curated image/caption pairs. Caption the target content accurately and vary contexts that should remain prompt-controllable.

For `qwen_image_edit`, set `datasets.control_path` and provide one aligned control source for each target. Sampling uses `sample.ctrl_img`. Pair by the documented filename/folder rules, replay spatial transforms, and inspect overlays after crop and resize.

The two Edit Plus selectors expose `datasets.multi_control_paths` and `sample.multi_ctrl_imgs`. Preserve control ordering and meaning consistently across the dataset and sample configuration. Every target, caption/instruction, and list of control inputs must describe the same transformation. A list of unrelated images is not valid multi-control supervision.

Hold out target/control pairs for evaluation. Follow [control and paired-input curation](../datasets/controls-video-audio.md), and do not confuse an edit-conditioning image with a grayscale loss mask.

## Starting configuration

All five selectors choose `flowmatch` for the sampling and training noise schedulers and `weighted` for timestep selection. They also select `low_vram: true`, model quantization, text-encoder quantization, and a model qtype of `qfloat8`. Preserve those resolved defaults in the first baseline.

Choose LoRA rank, alpha, learning rate, and duration from the object or focused-refinement recipe. Run a short diagnostic that reaches caching, a backward step, saving, and a real edit or generation sample before extending the run.

For Edit Plus 2509 and 2511, `match_target_res` has an engine fallback and selected value of `false`. With that baseline, control-image encoding uses the fixed control-image pixel budget rather than deriving size from the current target latent resolution. Test `true` only as a separate resolution experiment.

## Memory, quantization, and offloading

The selected low-VRAM and `qfloat8` configuration is a starting memory policy, not a graphics-card capacity guarantee. Peak memory changes with target and control resolution, number of controls, text length, batch shape, caching, optimizer state, checkpointing, offloading, and sampling.

Edit Plus can be especially sensitive to control count and resolution. Enabling `match_target_res` may align control token detail with output size, but large targets increase encoding memory and time and can make buckets less comparable.

All five selectors expose layer offloading. Measure its host-memory and throughput cost. Cache text embeddings or latents only when compatible with the intended caption, preprocessing, and control transformations, and rebuild caches after changing a determining input.

The Edit Plus selectors retain `train.unload_text_encoder: false` while the Simple UI hides that section for those variants. Do not force a copied unload setting without verifying the architecture path.

## Sampling and evaluation

Use a fixed seed and hold sampler, prompts/instructions, dimensions, inference steps, LoRA strength, and control inputs constant across checkpoint grids. Generation variants need trigger-on/off and held-out semantic prompts. Edit variants need held-out source/control pairs and transformations.

Judge both instruction compliance and preservation. A result can match the target caption while ignoring the input, or preserve the input while failing the requested edit. For multi-control samples, vary one control at a time when diagnosing which input is being followed.

Compare periodic checkpoints, then confirm candidates across more seeds and control examples. Do not rank them by loss alone. Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Incompatibilities and cautions

The Simple UI hides `network.conv` for all five selectors. The two Edit Plus selectors also hide the text-encoder unloading section. Treat these as architecture-specific UI contracts, not invitations to paste hidden fields from another model.

Single-control `control_path`/`ctrl_img` and multi-control `multi_control_paths`/`multi_ctrl_imgs` are different shapes. Do not mix a scalar and list or change ordering between training and sampling. Likewise, a generation selector does not acquire edit behavior just because a control-like field is added manually.

Do not change revision, control topology, `match_target_res`, quantization, target resolution, and caption strategy simultaneously. Each changes a distinct part of the experiment and can invalidate caches or comparisons.

## Further reading

- [Object and product recipe](../recipes/object-concept.md)
- [Focused-refinement recipe](../recipes/focused-refinement.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Control, video, and audio datasets](../datasets/controls-video-audio.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Job and model settings reference](../reference/job-and-model.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
