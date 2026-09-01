# Train LoRAs for Wan video models

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This chapter gives focused starting guidance for the `wan21:1b` and `wan22_14b:t2v` selectors. Video training multiplies the dataset, memory, and evaluation variables that must be held constant, so begin with a diagnostic run before committing to a long job.

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
            "architecture": "wan21:1b",
            "declaration_path": "config.process[*].datasets[*].fps",
            "fact_type": "architecture-default",
            "path": "config.process[*].datasets[*].fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "undefined"
              }
            }
          },
          "setting_id": "dataset.fps"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
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
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
            "declaration_path": "config.process[*].sample.fps",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.fps"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "declaration_path": "config.process[*].sample.num_frames",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.num_frames",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 41
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.num_frames"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "datasets.num_frames"
                  },
                  {
                    "kind": "string",
                    "value": "model.low_vram"
                  },
                  {
                    "kind": "string",
                    "value": "datasets.auto_frame_count"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
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
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
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
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "group",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "video"
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "boolean",
                  "value": true
                }
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Wan 2.1 (1.3B)"
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
                }
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan21-1b"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-transition",
            "path": "config.process[*].datasets[*].fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "undefined"
              }
            }
          },
          "setting_id": "dataset.fps"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
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
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.fps"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.num_frames",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 41
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.num_frames"
        },
        {
          "fact": {
            "architecture": "wan21:1b",
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
            "architecture": "wan21:1b",
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
      "id": "wan21:1b"
    },
    {
      "facts": [
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].datasets[*].fps",
            "fact_type": "architecture-default",
            "path": "config.process[*].datasets[*].fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "undefined"
              }
            }
          },
          "setting_id": "dataset.fps"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].model.model_kwargs",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.model_kwargs.train_high_noise",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.wan22_14b.model_kwargs.train_high_noise"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].model.model_kwargs",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.model_kwargs.train_low_noise",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.wan22_14b.model_kwargs.train_low_noise"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].model.name_or_path",
            "fact_type": "architecture-default",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16"
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].sample.fps",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.fps"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].sample.num_frames",
            "fact_type": "architecture-default",
            "path": "config.process[*].sample.num_frames",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 41
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.num_frames"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "declaration_path": "config.process[*].train.timestep_type",
            "fact_type": "architecture-default",
            "path": "config.process[*].train.timestep_type",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "linear"
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
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-container",
            "path": "config.process[*].model.model_kwargs",
            "selected_present": true,
            "unselected_present": true
          },
          "setting_id": "model.wan22_14b.model_kwargs.train_high_noise"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "accuracy_recovery_adapters",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "entries": [
                    {
                      "key": "4 bit with ARA",
                      "value": {
                        "kind": "string",
                        "value": "uint4|ostris/accuracy_recovery_adapters/wan22_14b_t2i_torchao_uint4.safetensors"
                      }
                    }
                  ],
                  "kind": "object"
                }
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "additional_sections",
            "payload": {
              "payload_kind": "value",
              "value": {
                "items": [
                  {
                    "kind": "string",
                    "value": "datasets.num_frames"
                  },
                  {
                    "kind": "string",
                    "value": "model.low_vram"
                  },
                  {
                    "kind": "string",
                    "value": "model.multistage"
                  },
                  {
                    "kind": "string",
                    "value": "model.layer_offloading"
                  },
                  {
                    "kind": "string",
                    "value": "datasets.auto_frame_count"
                  }
                ],
                "kind": "array"
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "custom_model_select_options",
            "payload": {
              "payload_kind": "custom-options",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "gate_url",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "group",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "video"
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "has_multiline_prompts",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "is_video_model",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "boolean",
                  "value": true
                }
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "label",
            "payload": {
              "payload_kind": "value",
              "value": {
                "kind": "string",
                "value": "Wan 2.2 (14B)"
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "model_notes",
            "payload": {
              "payload_kind": "jsx",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "model_path",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": true,
                "value": {
                  "kind": "string",
                  "value": "ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16"
                }
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-field",
            "field": "sample_tags",
            "payload": {
              "payload_kind": "presence",
              "value": {
                "present": false
              }
            }
          },
          "setting_id": "ui.architecture.wan22-14b-t2v"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].datasets[*].fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "undefined"
              }
            }
          },
          "setting_id": "dataset.fps"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.model_kwargs.train_high_noise",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.wan22_14b.model_kwargs.train_high_noise"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.model_kwargs.train_low_noise",
            "selected": {
              "present": true,
              "value": {
                "kind": "boolean",
                "value": true
              }
            },
            "unselected": {
              "present": false
            }
          },
          "setting_id": "model.wan22_14b.model_kwargs.train_low_noise"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].model.name_or_path",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16"
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.fps",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 16
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.fps"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].sample.num_frames",
            "selected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 41
              }
            },
            "unselected": {
              "present": true,
              "value": {
                "kind": "number",
                "value": 1
              }
            }
          },
          "setting_id": "sample.num_frames"
        },
        {
          "fact": {
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
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
            "architecture": "wan22_14b:t2v",
            "fact_type": "architecture-transition",
            "path": "config.process[*].train.timestep_type",
            "selected": {
              "present": true,
              "value": {
                "kind": "string",
                "value": "linear"
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
      "id": "wan22_14b:t2v"
    }
  ],
  "deferred_settings": [
    {
      "aliases": [],
      "applicability": [
        {
          "ui_architecture": "wan21:1b"
        },
        {
          "ui_architecture": "wan21_i2v:14b480p"
        },
        {
          "ui_architecture": "wan21_i2v:14b"
        },
        {
          "ui_architecture": "wan21:14b"
        },
        {
          "ui_architecture": "wan22_14b:t2v"
        },
        {
          "ui_architecture": "wan22_14b_i2v"
        },
        {
          "ui_architecture": "wan22_5b"
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
              "ui_architecture": "wan21:1b"
            },
            {
              "ui_architecture": "wan21_i2v:14b480p"
            },
            {
              "ui_architecture": "wan21_i2v:14b"
            },
            {
              "ui_architecture": "wan21:14b"
            },
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            },
            {
              "ui_architecture": "wan22_5b"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": false
        }
      ],
      "id": "model.wan.model_kwargs.vae_tiling",
      "interactions": [],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.vae_tiling"
        }
      ],
      "normalizations": [
        {
          "applicability": [
            {
              "ui_architecture": "wan21:1b"
            },
            {
              "ui_architecture": "wan21_i2v:14b480p"
            },
            {
              "ui_architecture": "wan21_i2v:14b"
            },
            {
              "ui_architecture": "wan21:14b"
            },
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            },
            {
              "ui_architecture": "wan22_5b"
            }
          ],
          "description": "Explicit null is preserved and acts falsey at boolean consumers."
        }
      ],
      "persistence": "config",
      "render": {
        "anchor": "model-wan-model-kwargs-vae-tiling",
        "benefits": "Reduces peak VAE memory for large video frames.",
        "description": "Forces tiled VAE encoding and decoding for Wan-family models.",
        "drawbacks": "Tiling adds processing overhead and can introduce tile-boundary artifacts.",
        "example": "vae_tiling: true",
        "page": "models/wan.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "vae_tiling",
          "read_kind": "model_kwargs.get",
          "source": "toolkit/models/wan21/wan21.py",
          "symbol": "Wan21.use_vae_tiling"
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
          "ui_architecture": "wan22_14b:t2v"
        },
        {
          "ui_architecture": "wan22_14b_i2v"
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
        "supported_type": "boolean",
        "ui_nullable": false,
        "ui_optional": true,
        "ui_type": "boolean"
      },
      "defaults": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        }
      ],
      "id": "model.wan22_14b.model_kwargs.train_high_noise",
      "interactions": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "description": "At least one of the two Wan 2.2 noise stages must be truthy.",
          "kind": "affects",
          "setting": "model.wan22_14b.model_kwargs.train_low_noise"
        }
      ],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.train_high_noise"
        }
      ],
      "normalizations": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "description": "Explicit null is preserved and acts falsey at boolean consumers."
        }
      ],
      "persistence": "config",
      "render": {
        "anchor": "model-wan22-14b-model-kwargs-train-high-noise",
        "benefits": "Adapts the stage responsible for coarse high-noise denoising behavior.",
        "description": "Enables training the Wan 2.2 14B high-noise transformer stage; at least one noise stage must remain enabled.",
        "drawbacks": "Training both stages costs more memory and compute, while disabling both raises ValueError.",
        "example": "train_high_noise: true",
        "page": "models/wan.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "train_high_noise",
          "read_kind": "model_kwargs.get",
          "source": "extensions_built_in/diffusion_models/wan22/wan22_14b_model.py",
          "symbol": "Wan2214bModel.__init__"
        }
      ],
      "surfaces": [
        "simple-ui",
        "advanced-yaml"
      ],
      "ui_label": "High Noise"
    },
    {
      "aliases": [],
      "applicability": [
        {
          "ui_architecture": "wan22_14b:t2v"
        },
        {
          "ui_architecture": "wan22_14b_i2v"
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
        "supported_type": "boolean",
        "ui_nullable": false,
        "ui_optional": true,
        "ui_type": "boolean"
      },
      "defaults": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "engine-fallback",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "on-select",
          "presence": "present",
          "value": true
        },
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "kind": "on-leave",
          "presence": "absent"
        }
      ],
      "id": "model.wan22_14b.model_kwargs.train_low_noise",
      "interactions": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "description": "At least one of the two Wan 2.2 noise stages must be truthy.",
          "kind": "affects",
          "setting": "model.wan22_14b.model_kwargs.train_high_noise"
        }
      ],
      "lifecycle": "supported",
      "locations": [
        {
          "kind": "yaml",
          "path": "config.process[*].model.model_kwargs.train_low_noise"
        }
      ],
      "normalizations": [
        {
          "applicability": [
            {
              "ui_architecture": "wan22_14b:t2v"
            },
            {
              "ui_architecture": "wan22_14b_i2v"
            }
          ],
          "description": "Explicit null is preserved and acts falsey at boolean consumers."
        }
      ],
      "persistence": "config",
      "render": {
        "anchor": "model-wan22-14b-model-kwargs-train-low-noise",
        "benefits": "Adapts the stage responsible for fine low-noise denoising behavior.",
        "description": "Enables training the Wan 2.2 14B low-noise transformer stage; at least one noise stage must remain enabled.",
        "drawbacks": "Training both stages costs more memory and compute, while disabling both raises ValueError.",
        "example": "train_low_noise: true",
        "page": "models/wan.md"
      },
      "scope": "model",
      "section": "model",
      "source_claims": [
        {
          "key": "train_low_noise",
          "read_kind": "model_kwargs.get",
          "source": "extensions_built_in/diffusion_models/wan22/wan22_14b_model.py",
          "symbol": "Wan2214bModel.__init__"
        }
      ],
      "surfaces": [
        "simple-ui",
        "advanced-yaml"
      ],
      "ui_label": "Low Noise"
    }
  ],
  "schema_version": 1
}
```
<!-- model-facts:end -->
</details>

## What this family covers

`wan21:1b` selects `Wan-AI/Wan2.1-T2V-1.3B-Diffusers`, a text-to-video (T2V) architecture. `wan22_14b:t2v` selects `ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16`, a much larger T2V architecture with separate high-noise and low-noise stages.

The complete architecture catalog also records `wan21_i2v:14b480p`, `wan21_i2v:14b`, `wan21:14b`, `wan22_14b_i2v`, and `wan22_5b`. Those identifiers are a factual overview, not recipes in this chapter. In particular, T2V and image-to-video (I2V) are different conditioning tasks; do not treat an I2V selector, checkpoint, control image, or cache as interchangeable with a T2V run.

## Model access and paths

The generated facts above are the source of truth for the selected paths and current UI behavior. The catalog records no gate URL for either focused selector, but that does not waive model-card terms, access restrictions, or dataset rights. Record the exact path and revision with each run.

Do not infer compatibility from the shared Wan name. Confirm the selector, modality, major version, parameter scale, and T2V or I2V role before loading a checkpoint or LoRA. A successful file load is not proof that the conditioning layout or target modules match.

Local or derivative model paths add resource uncertainty: memory behavior, component precision, and required files can differ from the catalog-selected path. Re-run the short preflight whenever the base revision changes.

## Dataset and captions

Treat a video example as a temporal sequence, not a folder of unrelated still images. Curate stable subjects, coherent motion, useful camera variation, and enough diversity to prevent the trigger from absorbing backgrounds or one repeated action. Remove broken, duplicate, frozen, and badly decoded clips.

The focused selectors currently set dataset and sample playback to `16 FPS`, and the sample default is `41` frames. Keep frame count, FPS, crop, resolution, and prompt fixed for the first comparison. FPS describes playback timing; it does not repair missing motion or make differently sampled clips equivalent.

T2V examples learn from captions and video. I2V adds an initial-image conditioning relationship and may require paired controls such as `control_path` or `ctrl_img`; follow [controls, video, and audio datasets](../datasets/controls-video-audio.md) rather than copying an I2V layout into these focused T2V recipes.

Captions should describe identity, scene, action, direction, camera behavior, and temporal change that are actually visible. Keep the trigger consistent, but do not paste an identical full caption onto every clip. Caption accuracy matters more than ornamental prose.

## Starting configuration

Start with the architecture-selected `flowmatch` sampler and training noise scheduler, batch size 1, gradient checkpointing, and a short [diagnostic run](../recipes/diagnostic-run.md). Preserve the selected `41` frames and `16 FPS` until the end-to-end pipeline has trained, saved, and sampled successfully; then change one expensive dimension at a time.

Wan 2.2 14B T2V is multistage. `model.model_kwargs.train_high_noise` trains the coarse high-noise stage and `model.model_kwargs.train_low_noise` trains the fine low-noise stage. Both default to `true`, and at least one must remain enabled. Training both covers both stages but costs more memory and computation; a stage-only experiment produces a narrower artifact and must be labeled accordingly.

The model owns the high/low timestep split. `train.switch_boundary_every` controls training cadence: `1` switches at each supported boundary opportunity, while a larger positive value keeps the active trainable boundary for more steps. It does not move the model's timestep boundary. Long intervals can imbalance stage updates, so preserve `1` for the baseline unless a measured experiment justifies changing it.

Choose rank, alpha, learning rate, optimizer, and total steps from the closest role recipe, but validate them with video samples. Image-LoRA step counts are not automatically suitable for a smaller number of temporally dense clips.

## Memory, quantization, and offloading

The catalog-selected Wan 2.2 14B T2V configuration enables model and text-encoder quantization and `low_vram`; the Wan 2.1 1B selection does not enable model quantization but does enable text-encoder quantization. These are architecture-specific starting facts, not proof that another quantization format or checkpoint revision is compatible.

Use layer offloading where the selector exposes it, then measure the largest video bucket, backward pass, checkpoint save, and sample pass. Offloading can trade device memory for transfer overhead. A successful still-image-shaped preflight does not establish that the full frame sequence fits.

`model.model_kwargs.vae_tiling` defaults to `false`. Enabling it can reduce peak VAE memory for large video frames, but adds work and may introduce tile-boundary artifacts. Compare decoded motion and seams before relying on it.

There is no GPU guarantee in this guide. Peak memory depends on frame count, resolution, batch size, optimizer state, precision, quantization backend, checkpointing, offloading, stage selection, and software version. Use the [low-VRAM recipe](../recipes/low-vram.md) as an experiment order, not as a promised card size.

## Sampling and evaluation

Video sampling cost is substantially higher than evaluating one image because the pipeline denoises and decodes a temporal sequence. Budget time and memory for periodic samples before choosing an aggressive sample cadence.

Build a compact validation suite with a fixed seed, the same `41` frames, `16 FPS`, dimensions, prompt, negative prompt, sampler, guidance, steps, and LoRA strength. Include expected actions, held-out actions, camera motion, static scenes, and trigger-off prompts. Review individual frames and playback: identity may look correct in a thumbnail while motion flickers, deforms, freezes, or drifts.

For Wan 2.2 stage experiments, compare both coarse structure and fine detail. A high-noise-only LoRA may affect global motion and composition differently from a low-noise-only LoRA; that is an evaluation question, not a reason to select whichever checkpoint has the lowest instantaneous loss.

Keep sample settings identical across checkpoints and follow [sampling and evaluation](../workflow/sampling-and-evaluation.md). Confirm the preferred result across several seeds only after the fixed-seed grid narrows the candidates.

## Incompatibilities and cautions

Do not interchange T2V and I2V data layouts, control conditioning, base checkpoints, LoRAs, or caches. Do not reuse latent caches after changing the VAE, frame count, FPS-dependent preprocessing, resolution, crop, or source clips. Rebuild text caches after changing captions, tokenization, or the conditioning stack.

For Wan 2.2 14B, setting both `train_high_noise` and `train_low_noise` to `false` is invalid. Training only one stage changes the trainable model and save/load behavior; keep stage identity in filenames and run notes. Do not present one-stage results as a full two-stage LoRA without testing the intended inference workflow.

Quantization, offloading, fewer frames, smaller resolution, VAE tiling, and stage selection solve different bottlenecks and can change throughput or output. Apply one change at a time and retain evidence from the same prompt suite.

Resource uncertainty is unavoidable across GPUs and software builds. No GPU memory estimate should replace a short end-to-end preflight that includes sampling and saving.

## Further reading

- [Controls, video, and audio datasets](../datasets/controls-video-audio.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Low-VRAM recipe](../recipes/low-vram.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Saving, resuming, and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
