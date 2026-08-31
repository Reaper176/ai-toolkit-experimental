# Job and model settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This page lists catalog-owned job envelopes and model-selection settings. “UI-created value” means the value written by a newly created UI job, while “engine fallback” means the value used when configuration is absent; when they differ, neither is presented as a universal default. Architecture-specific values apply only under the stated predicates.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Job And Model

<a id="dataset-flip"></a>
### `dataset.flip`

Exact current UI/documentation field config.process\[\*\].datasets\[\*\].flip.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].flip`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].datasets[*].flip: value`
- Source symbols: none

<a id="dataset-multi-control-paths"></a>
### `dataset.multi-control-paths`

Exact current UI/documentation field config.process\[\*\].datasets\[\*\].multi\_control\_paths.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].multi_control_paths`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].datasets[*].multi_control_paths: value`
- Source symbols: none

<a id="job-device"></a>
### `job.device`

Selects the device string inherited by job-level processes.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.device`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `job` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `torch-device` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"cpu"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows a job to target a specific available compute device.
- Drawbacks: An unavailable or malformed device string prevents the process from running.
- Interactions: none
- Aliases: none
- Example: `device: cpu`
- Source symbols: `jobs/ExtensionJob.py` :: `ExtensionJob.__init__` :: `device` (`get_conf`); `jobs/MergeJob.py` :: `MergeJob.__init__` :: `device` (`get_conf`); `jobs/ModJob.py` :: `ModJob.__init__` :: `device` (`get_conf`); `jobs/TrainJob.py` :: `TrainJob.__init__` :: `device` (`get_conf`)

<a id="job-meta-name"></a>
### `job.meta.name`

Exact current UI/documentation field meta.name.

- UI label: not exposed in the Simple UI
- Locations: Yaml `meta.name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"[name]"` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `meta.name: value`
- Source symbols: none

<a id="job-meta-version"></a>
### `job.meta.version`

Exact current UI/documentation field meta.version.

- UI label: not exposed in the Simple UI
- Locations: Yaml `meta.version`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"1.0"` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `meta.version: value`
- Source symbols: none

<a id="job-name"></a>
### `job.name`

Names the job and supplies the inherited process name fallback.

- UI label: Training Name
- Locations: Yaml `config.name`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `job` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"my_first_lora_v1"` (all supported configurations)
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The CLI --name value overrides config.name for preprocessing; otherwise config.name is required. The selected name replaces every \[name\] token in the serialized configuration before the job is constructed. (all supported configurations)
- Benefits: Makes the job.name configuration boundary explicit.
- Drawbacks: An invalid job.name value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `name: example_job`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.__init__` :: `name` (`get_conf`); `toolkit/config.py` :: `preprocess_config` :: `name` (`attribute.contains`); `toolkit/config.py` :: `preprocess_config` :: `name` (`attribute[]`)

<a id="job-processes"></a>
### `job.processes`

Defines the nonempty ordered list of processes loaded for the job.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `job` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `object-list` / `object-list` / `object-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `[{"datasets":[{"cache_latents_to_disk":false,"caption_dropout_rate":0.05,"caption_ext":"txt","controls":[],"default_caption":"","flip_x":false,"flip_y":false,"folder_path":"/path/to/images/folder","is_reg":false,"mask_min_value":0.1,"mask_path":null,"network_weight":1,"num_frames":1,"num_repeats":1,"resolution":[512,768,1024],"shrink_video_to_frames":true}],"device":"cuda","logging":{"log_every":1,"use_ui_logger":true},"model":{"arch":"flex1","compile":false,"low_vram":false,"model_kwargs":{},"name_or_path":"ostris/Flex.1-alpha","qtype":"qfloat8","qtype_te":"qfloat8","quantize":true,"quantize_te":true},"network":{"conv":16,"conv_alpha":16,"linear":32,"linear_alpha":32,"lokr_factor":-1,"lokr_full_rank":true,"network_kwargs":{"ignore_if_contains":[]},"type":"lora"},"performance_log_every":10,"sample":{"fps":1,"guidance_scale":4,"height":1024,"neg":"","num_frames":1,"sample_every":250,"sample_start_step":0,"sample_steps":30,"sampler":"flowmatch","samples":[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}],"seed":42,"walk_seed":true,"width":1024},"save":{"dtype":"bf16","max_step_saves_to_keep":4,"push_to_hub":false,"save_every":250,"save_format":"diffusers"},"sqlite_db_path":"./aitk_db.db","train":{"batch_size":1,"bypass_guidance_embedding":true,"cache_text_embeddings":false,"content_or_style":"balanced","diff_output_preservation":false,"diff_output_preservation_class":"person","diff_output_preservation_multiplier":1,"disable_sampling":false,"dtype":"bf16","ema_config":{"ema_decay":0.99,"use_ema":false},"force_first_sample":false,"gradient_accumulation":1,"gradient_checkpointing":true,"inverted_mask_prior":false,"inverted_mask_prior_multiplier":0.5,"loss_type":"mse","lr":0.0001,"noise_scheduler":"flowmatch","optimizer":"adamw8bit","optimizer_params":{"weight_decay":0.0001},"skip_first_sample":false,"steps":3000,"switch_boundary_every":1,"timestep_type":"sigmoid","train_text_encoder":false,"train_unet":true,"unload_text_encoder":false},"training_folder":"output","trigger_word":null,"type":"diffusion_trainer"}]` (all supported configurations)
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the job.processes configuration boundary explicit.
- Drawbacks: An invalid job.processes value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `process: [{type: diffusion_trainer}]`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.load_processes` :: `process` (`attribute.contains`); `jobs/BaseJob.py` :: `BaseJob.load_processes` :: `process` (`attribute[]`)

<a id="model-multistage"></a>
### `model.multistage`

Exact current UI/documentation field config.process\[\*\].model.multistage.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.multistage`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].model.multistage: value`
- Source symbols: none

<a id="model-qie-match-target-res"></a>
### `model.qie.match-target-res`

Exact current UI/documentation field config.process\[\*\].model.qie.match\_target\_res.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.qie.match_target_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].model.qie.match_target_res: value`
- Source symbols: none

<a id="process-device"></a>
### `process.device`

Selects the device assigned to an individual process entry.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].device`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `torch-device` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: On macOS, the UI migrator forces each process device to mps; this is distinct from the root config.device job setting. (all supported configurations)
- Benefits: Allows process-level device selection independently of the root job device.
- Drawbacks: The UI forces mps on macOS, and unavailable device strings prevent the process from running.
- Interactions: none
- Aliases: none
- Example: `device: mps`
- Source symbols: none

<a id="process-name"></a>
### `process.name`

Overrides the inherited job name for one process.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"job.name"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and inherits job.name. (all supported configurations)
- Benefits: Distinguishes process output folders and timing labels in multi-process jobs.
- Drawbacks: Changing the name also changes name-derived output paths.
- Interactions: Fallback `job.name`: Omission or explicit null inherits job.name. (all supported configurations)
- Aliases: none
- Example: `name: refinement`
- Source symbols: `jobs/process/BaseProcess.py` :: `BaseProcess.__init__` :: `name` (`get_conf`)

<a id="process-performance-log-every"></a>
### `process.performance_log_every`

Sets the interval used by process performance logging; zero disables periodic logging.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].performance_log_every`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback 0. (all supported configurations)
- Benefits: Can expose timing trends during a long process.
- Drawbacks: Frequent performance logging adds console noise and a small measurement overhead.
- Interactions: none
- Aliases: none
- Example: `performance_log_every: 100`
- Source symbols: `jobs/process/BaseProcess.py` :: `BaseProcess.__init__` :: `performance_log_every` (`get_conf`)

<a id="process-type"></a>
### `process.type`

Selects the registered implementation for each process entry.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The UI migrator rewrites legacy ui\_trainer to diffusion\_trainer before queueing. (all supported configurations)
- Benefits: Makes the process.type configuration boundary explicit.
- Drawbacks: An invalid process.type value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `type: diffusion_trainer`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.load_processes` :: `type` (`attribute.contains`); `jobs/BaseJob.py` :: `BaseJob.load_processes` :: `type` (`attribute[]`)

<a id="root-config"></a>
### `root.config`

Provides the job configuration object consumed by the selected job implementation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `root` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: For file-backed configurations, every $\{ENVIRONMENT\_VARIABLE\} placeholder is resolved from the environment before JSON or YAML parsing; a missing variable raises ValueError. In-memory configuration dictionaries do not pass through this textual expansion. (all supported configurations)
- Benefits: Makes the root.config configuration boundary explicit.
- Drawbacks: An invalid root.config value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `config: {name: example_job, process: [{type: diffusion_trainer}]}`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.__init__` :: `config` (`attribute[]`); `toolkit/config.py` :: `preprocess_config` :: `config` (`attribute.contains`); `toolkit/config.py` :: `preprocess_config` :: `config` (`attribute[]`); `toolkit/config.py` :: `replace_env_vars_in_string.replacer` :: `<dynamic-environment-name>` (`os.environ.get.dynamic`)

<a id="root-job"></a>
### `root.job`

Selects the top-level job implementation that consumes the configuration.

- UI label: not exposed in the Simple UI
- Locations: Yaml `job`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `root` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"extension"` (all supported configurations)
- Engine fallback: absent (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: preprocess\_config requires the top-level job key before constructing a job. (all supported configurations)
- Benefits: Makes the root.job configuration boundary explicit.
- Drawbacks: An invalid root.job value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `job: extension`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.__init__` :: `job` (`attribute[]`); `toolkit/config.py` :: `preprocess_config` :: `job` (`attribute.contains`)

<a id="root-meta"></a>
### `root.meta`

Carries optional metadata from the job envelope into each process.

- UI label: not exposed in the Simple UI
- Locations: Yaml `meta`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `root` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the root.meta configuration boundary explicit.
- Drawbacks: An invalid root.meta value stops job configuration or process loading.
- Interactions: none
- Aliases: none
- Example: `meta: {owner: local}`
- Source symbols: `jobs/BaseJob.py` :: `BaseJob.__init__` :: `meta` (`attribute.contains`); `jobs/BaseJob.py` :: `BaseJob.__init__` :: `meta` (`attribute[]`)

<a id="ui-architecture-ace-step-15"></a>
### `ui.architecture.ace-step-15`

Exact UI metadata for the ACE-Step 1.5 architecture.

- UI label: ACE-Step 1.5
- Locations: Ui State `ui.architecture.ace-step-15`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ace_step_15`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ace_step_15"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ace_step_15`)
- Aliases: none
- Example: `ui.architecture.ace-step-15: value`
- Source symbols: none

<a id="ui-architecture-ace-step-15-xl"></a>
### `ui.architecture.ace-step-15-xl`

Exact UI metadata for the ACE-Step 1.5 XL architecture.

- UI label: ACE-Step 1.5 XL
- Locations: Ui State `ui.architecture.ace-step-15-xl`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ace_step_15_xl`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ace_step_15_xl"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ace_step_15_xl`)
- Aliases: none
- Example: `ui.architecture.ace-step-15-xl: value`
- Source symbols: none

<a id="ui-architecture-ace-step-15-xl-qtype-control"></a>
### `ui.architecture.ace-step-15-xl.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ace-step-15-xl-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`)
- Aliases: none
- Example: `ui.controls.architecture-ace-step-15-xl-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ace-step-15-qtype-control"></a>
### `ui.architecture.ace-step-15.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ace-step-15-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`)
- Aliases: none
- Example: `ui.controls.architecture-ace-step-15-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-anima"></a>
### `ui.architecture.anima`

Exact UI metadata for the Anima architecture.

- UI label: Anima
- Locations: Ui State `ui.architecture.anima`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`anima`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"anima"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`anima`)
- Aliases: none
- Example: `ui.architecture.anima: value`
- Source symbols: none

<a id="ui-architecture-anima-qtype-control"></a>
### `ui.architecture.anima.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-anima-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`anima`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`anima`)
- Aliases: none
- Example: `ui.controls.architecture-anima-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-boogu-image"></a>
### `ui.architecture.boogu-image`

Exact UI metadata for the Boogu Image architecture.

- UI label: Boogu Image
- Locations: Ui State `ui.architecture.boogu-image`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`boogu_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"boogu_image"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`boogu_image`)
- Aliases: none
- Example: `ui.architecture.boogu-image: value`
- Source symbols: none

<a id="ui-architecture-boogu-image-edit"></a>
### `ui.architecture.boogu-image-edit`

Exact UI metadata for the Boogu Image Edit architecture.

- UI label: Boogu Image Edit
- Locations: Ui State `ui.architecture.boogu-image-edit`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"boogu_image_edit"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`boogu_image_edit`)
- Aliases: none
- Example: `ui.architecture.boogu-image-edit: value`
- Source symbols: none

<a id="ui-architecture-boogu-image-edit-qtype-control"></a>
### `ui.architecture.boogu-image-edit.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-boogu-image-edit-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`)
- Aliases: none
- Example: `ui.controls.architecture-boogu-image-edit-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-boogu-image-qtype-control"></a>
### `ui.architecture.boogu-image.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-boogu-image-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`boogu_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`)
- Aliases: none
- Example: `ui.controls.architecture-boogu-image-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-chroma"></a>
### `ui.architecture.chroma`

Exact UI metadata for the Chroma architecture.

- UI label: Chroma
- Locations: Ui State `ui.architecture.chroma`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`chroma`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"chroma"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`chroma`)
- Aliases: none
- Example: `ui.architecture.chroma: value`
- Source symbols: none

<a id="ui-architecture-chroma-qtype-control"></a>
### `ui.architecture.chroma.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-chroma-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`chroma`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`chroma`)
- Aliases: none
- Example: `ui.controls.architecture-chroma-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ernie-image"></a>
### `ui.architecture.ernie-image`

Exact UI metadata for the ERNIE-Image architecture.

- UI label: ERNIE-Image
- Locations: Ui State `ui.architecture.ernie-image`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ernie_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ernie_image"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ernie_image`)
- Aliases: none
- Example: `ui.architecture.ernie-image: value`
- Source symbols: none

<a id="ui-architecture-ernie-image-qtype-control"></a>
### `ui.architecture.ernie-image.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ernie-image-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ernie_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`)
- Aliases: none
- Example: `ui.controls.architecture-ernie-image-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flex1"></a>
### `ui.architecture.flex1`

Exact UI metadata for the Flex.1 architecture.

- UI label: Flex.1
- Locations: Ui State `ui.architecture.flex1`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flex1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flex1"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flex1`)
- Aliases: none
- Example: `ui.architecture.flex1: value`
- Source symbols: none

<a id="ui-architecture-flex1-qtype-control"></a>
### `ui.architecture.flex1.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flex1-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flex1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flex1`)
- Aliases: none
- Example: `ui.controls.architecture-flex1-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flex2"></a>
### `ui.architecture.flex2`

Exact UI metadata for the Flex.2 architecture.

- UI label: Flex.2
- Locations: Ui State `ui.architecture.flex2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flex2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flex2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flex2`)
- Aliases: none
- Example: `ui.architecture.flex2: value`
- Source symbols: none

<a id="ui-architecture-flex2-qtype-control"></a>
### `ui.architecture.flex2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flex2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flex2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flex2`)
- Aliases: none
- Example: `ui.controls.architecture-flex2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flux"></a>
### `ui.architecture.flux`

Exact UI metadata for the FLUX.1 architecture.

- UI label: FLUX.1
- Locations: Ui State `ui.architecture.flux`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flux`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flux"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flux`)
- Aliases: none
- Example: `ui.architecture.flux: value`
- Source symbols: none

<a id="ui-architecture-flux-kontext"></a>
### `ui.architecture.flux-kontext`

Exact UI metadata for the FLUX.1-Kontext-dev architecture.

- UI label: FLUX.1-Kontext-dev
- Locations: Ui State `ui.architecture.flux-kontext`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flux_kontext`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flux_kontext"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flux_kontext`)
- Aliases: none
- Example: `ui.architecture.flux-kontext: value`
- Source symbols: none

<a id="ui-architecture-flux-kontext-qtype-control"></a>
### `ui.architecture.flux-kontext.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flux-kontext-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`)
- Aliases: none
- Example: `ui.controls.architecture-flux-kontext-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flux-qtype-control"></a>
### `ui.architecture.flux.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flux-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flux`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flux`)
- Aliases: none
- Example: `ui.controls.architecture-flux-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flux2"></a>
### `ui.architecture.flux2`

Exact UI metadata for the FLUX.2 architecture.

- UI label: FLUX.2
- Locations: Ui State `ui.architecture.flux2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flux2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flux2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flux2`)
- Aliases: none
- Example: `ui.architecture.flux2: value`
- Source symbols: none

<a id="ui-architecture-flux2-klein-4b"></a>
### `ui.architecture.flux2-klein-4b`

Exact UI metadata for the FLUX.2-klein-base-4B architecture.

- UI label: FLUX.2-klein-base-4B
- Locations: Ui State `ui.architecture.flux2-klein-4b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flux2_klein_4b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flux2_klein_4b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flux2_klein_4b`)
- Aliases: none
- Example: `ui.architecture.flux2-klein-4b: value`
- Source symbols: none

<a id="ui-architecture-flux2-klein-4b-qtype-control"></a>
### `ui.architecture.flux2-klein-4b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flux2-klein-4b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`)
- Aliases: none
- Example: `ui.controls.architecture-flux2-klein-4b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flux2-klein-9b"></a>
### `ui.architecture.flux2-klein-9b`

Exact UI metadata for the FLUX.2-klein-base-9B architecture.

- UI label: FLUX.2-klein-base-9B
- Locations: Ui State `ui.architecture.flux2-klein-9b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`flux2_klein_9b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"flux2_klein_9b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`flux2_klein_9b`)
- Aliases: none
- Example: `ui.architecture.flux2-klein-9b: value`
- Source symbols: none

<a id="ui-architecture-flux2-klein-9b-qtype-control"></a>
### `ui.architecture.flux2-klein-9b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flux2-klein-9b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`)
- Aliases: none
- Example: `ui.controls.architecture-flux2-klein-9b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-flux2-qtype-control"></a>
### `ui.architecture.flux2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-flux2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`flux2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`flux2`)
- Aliases: none
- Example: `ui.controls.architecture-flux2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-hidream"></a>
### `ui.architecture.hidream`

Exact UI metadata for the HiDream architecture.

- UI label: HiDream
- Locations: Ui State `ui.architecture.hidream`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`hidream`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"hidream"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`hidream`)
- Aliases: none
- Example: `ui.architecture.hidream: value`
- Source symbols: none

<a id="ui-architecture-hidream-e1"></a>
### `ui.architecture.hidream-e1`

Exact UI metadata for the HiDream E1 architecture.

- UI label: HiDream E1
- Locations: Ui State `ui.architecture.hidream-e1`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`hidream_e1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"hidream_e1"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`hidream_e1`)
- Aliases: none
- Example: `ui.architecture.hidream-e1: value`
- Source symbols: none

<a id="ui-architecture-hidream-e1-qtype-control"></a>
### `ui.architecture.hidream-e1.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-hidream-e1-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`)
- Aliases: none
- Example: `ui.controls.architecture-hidream-e1-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-hidream-o1"></a>
### `ui.architecture.hidream-o1`

Exact UI metadata for the HiDream-O1 architecture.

- UI label: HiDream-O1
- Locations: Ui State `ui.architecture.hidream-o1`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`hidream_o1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"hidream_o1"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`hidream_o1`)
- Aliases: none
- Example: `ui.architecture.hidream-o1: value`
- Source symbols: none

<a id="ui-architecture-hidream-o1-qtype-control"></a>
### `ui.architecture.hidream-o1.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-hidream-o1-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`)
- Aliases: none
- Example: `ui.controls.architecture-hidream-o1-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-hidream-qtype-control"></a>
### `ui.architecture.hidream.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-hidream-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`hidream`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/hidream_i1_full_torchao_uint3.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`hidream`)
- Aliases: none
- Example: `ui.controls.architecture-hidream-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ideogram4"></a>
### `ui.architecture.ideogram4`

Exact UI metadata for the Ideogram4 architecture.

- UI label: Ideogram4
- Locations: Ui State `ui.architecture.ideogram4`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ideogram4`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ideogram4"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ideogram4`)
- Aliases: none
- Example: `ui.architecture.ideogram4: value`
- Source symbols: none

<a id="ui-architecture-ideogram4-qtype-control"></a>
### `ui.architecture.ideogram4.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ideogram4-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Aliases: none
- Example: `ui.controls.architecture-ideogram4-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-krea2"></a>
### `ui.architecture.krea2`

Exact UI metadata for the Krea 2 (raw) architecture.

- UI label: Krea 2 (raw)
- Locations: Ui State `ui.architecture.krea2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`krea2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"krea2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`krea2`)
- Aliases: none
- Example: `ui.architecture.krea2: value`
- Source symbols: none

<a id="ui-architecture-krea2-o-edit"></a>
### `ui.architecture.krea2-o-edit`

Exact UI metadata for the Krea 2 (raw) \[Edit Training\] architecture.

- UI label: Krea 2 (raw) \[Edit Training\]
- Locations: Ui State `ui.architecture.krea2-o-edit`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`krea2:o_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"krea2:o_edit"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`krea2:o_edit`)
- Aliases: none
- Example: `ui.architecture.krea2-o-edit: value`
- Source symbols: none

<a id="ui-architecture-krea2-o-edit-turbo"></a>
### `ui.architecture.krea2-o-edit-turbo`

Exact UI metadata for the Krea 2 Turbo (w/ Training Adapter) \[Edit Training\] architecture.

- UI label: Krea 2 Turbo (w/ Training Adapter) \[Edit Training\]
- Locations: Ui State `ui.architecture.krea2-o-edit-turbo`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"krea2:o_edit_turbo"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`krea2:o_edit_turbo`)
- Aliases: none
- Example: `ui.architecture.krea2-o-edit-turbo: value`
- Source symbols: none

<a id="ui-architecture-krea2-o-edit-turbo-qtype-control"></a>
### `ui.architecture.krea2-o-edit-turbo.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-krea2-o-edit-turbo-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`)
- Aliases: none
- Example: `ui.controls.architecture-krea2-o-edit-turbo-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-krea2-o-edit-qtype-control"></a>
### `ui.architecture.krea2-o-edit.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-krea2-o-edit-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`)
- Aliases: none
- Example: `ui.controls.architecture-krea2-o-edit-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-krea2-turbo"></a>
### `ui.architecture.krea2-turbo`

Exact UI metadata for the Krea 2 Turbo (w/ Training Adapter) architecture.

- UI label: Krea 2 Turbo (w/ Training Adapter)
- Locations: Ui State `ui.architecture.krea2-turbo`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`krea2:turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"krea2:turbo"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`krea2:turbo`)
- Aliases: none
- Example: `ui.architecture.krea2-turbo: value`
- Source symbols: none

<a id="ui-architecture-krea2-turbo-qtype-control"></a>
### `ui.architecture.krea2-turbo.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-krea2-turbo-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`)
- Aliases: none
- Example: `ui.controls.architecture-krea2-turbo-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-krea2-qtype-control"></a>
### `ui.architecture.krea2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-krea2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`krea2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`krea2`)
- Aliases: none
- Example: `ui.controls.architecture-krea2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ltx2"></a>
### `ui.architecture.ltx2`

Exact UI metadata for the LTX-2 architecture.

- UI label: LTX-2
- Locations: Ui State `ui.architecture.ltx2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ltx2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ltx2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ltx2`)
- Aliases: none
- Example: `ui.architecture.ltx2: value`
- Source symbols: none

<a id="ui-architecture-ltx2-3"></a>
### `ui.architecture.ltx2-3`

Exact UI metadata for the LTX-2.3 architecture.

- UI label: LTX-2.3
- Locations: Ui State `ui.architecture.ltx2-3`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ltx2.3`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ltx2.3"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ltx2.3`)
- Aliases: none
- Example: `ui.architecture.ltx2-3: value`
- Source symbols: none

<a id="ui-architecture-ltx2-3-qtype-control"></a>
### `ui.architecture.ltx2-3.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ltx2-3-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`)
- Aliases: none
- Example: `ui.controls.architecture-ltx2-3-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ltx2-5"></a>
### `ui.architecture.ltx2-5`

Exact UI metadata for the LTX-2.5 architecture.

- UI label: LTX-2.5
- Locations: Ui State `ui.architecture.ltx2-5`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`ltx2.5`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"ltx2.5"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`ltx2.5`)
- Aliases: none
- Example: `ui.architecture.ltx2-5: value`
- Source symbols: none

<a id="ui-architecture-ltx2-5-qtype-control"></a>
### `ui.architecture.ltx2-5.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ltx2-5-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`)
- Aliases: none
- Example: `ui.controls.architecture-ltx2-5-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-ltx2-qtype-control"></a>
### `ui.architecture.ltx2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-ltx2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`ltx2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`ltx2`)
- Aliases: none
- Example: `ui.controls.architecture-ltx2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-lumina2"></a>
### `ui.architecture.lumina2`

Exact UI metadata for the Lumina2 architecture.

- UI label: Lumina2
- Locations: Ui State `ui.architecture.lumina2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`lumina2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"lumina2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`lumina2`)
- Aliases: none
- Example: `ui.architecture.lumina2: value`
- Source symbols: none

<a id="ui-architecture-lumina2-qtype-control"></a>
### `ui.architecture.lumina2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-lumina2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`lumina2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`lumina2`)
- Aliases: none
- Example: `ui.controls.architecture-lumina2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-mageflow"></a>
### `ui.architecture.mageflow`

Exact UI metadata for the Mage-Flow architecture.

- UI label: Mage-Flow
- Locations: Ui State `ui.architecture.mageflow`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`mageflow`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"mageflow"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`mageflow`)
- Aliases: none
- Example: `ui.architecture.mageflow: value`
- Source symbols: none

<a id="ui-architecture-mageflow-edit"></a>
### `ui.architecture.mageflow-edit`

Exact UI metadata for the Mage-Flow Edit architecture.

- UI label: Mage-Flow Edit
- Locations: Ui State `ui.architecture.mageflow-edit`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`mageflow_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"mageflow_edit"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`mageflow_edit`)
- Aliases: none
- Example: `ui.architecture.mageflow-edit: value`
- Source symbols: none

<a id="ui-architecture-mageflow-edit-qtype-control"></a>
### `ui.architecture.mageflow-edit.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-mageflow-edit-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`)
- Aliases: none
- Example: `ui.controls.architecture-mageflow-edit-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-mageflow-qtype-control"></a>
### `ui.architecture.mageflow.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-mageflow-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`mageflow`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`mageflow`)
- Aliases: none
- Example: `ui.controls.architecture-mageflow-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-minimax-h3"></a>
### `ui.architecture.minimax-h3`

Exact UI metadata for the MiniMax-H3 architecture.

- UI label: MiniMax-H3
- Locations: Ui State `ui.architecture.minimax-h3`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"minimax_h3"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`minimax_h3`)
- Aliases: none
- Example: `ui.architecture.minimax-h3: value`
- Source symbols: none

<a id="ui-architecture-minimax-h3-qtype-control"></a>
### `ui.architecture.minimax-h3.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-minimax-h3-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Aliases: none
- Example: `ui.controls.architecture-minimax-h3-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-nucleus-image"></a>
### `ui.architecture.nucleus-image`

Exact UI metadata for the Nucleus-Image architecture.

- UI label: Nucleus-Image
- Locations: Ui State `ui.architecture.nucleus-image`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`nucleus_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"nucleus_image"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`nucleus_image`)
- Aliases: none
- Example: `ui.architecture.nucleus-image: value`
- Source symbols: none

<a id="ui-architecture-nucleus-image-qtype-control"></a>
### `ui.architecture.nucleus-image.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-nucleus-image-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`)
- Aliases: none
- Example: `ui.controls.architecture-nucleus-image-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-omnigen2"></a>
### `ui.architecture.omnigen2`

Exact UI metadata for the OmniGen2 architecture.

- UI label: OmniGen2
- Locations: Ui State `ui.architecture.omnigen2`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`omnigen2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"omnigen2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`omnigen2`)
- Aliases: none
- Example: `ui.architecture.omnigen2: value`
- Source symbols: none

<a id="ui-architecture-omnigen2-qtype-control"></a>
### `ui.architecture.omnigen2.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-omnigen2-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`omnigen2`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`)
- Aliases: none
- Example: `ui.controls.architecture-omnigen2-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-prx-pixel"></a>
### `ui.architecture.prx-pixel`

Exact UI metadata for the PRXPixel (pixel space) architecture.

- UI label: PRXPixel (pixel space)
- Locations: Ui State `ui.architecture.prx-pixel`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`prx_pixel`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"prx_pixel"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`prx_pixel`)
- Aliases: none
- Example: `ui.architecture.prx-pixel: value`
- Source symbols: none

<a id="ui-architecture-prx-pixel-qtype-control"></a>
### `ui.architecture.prx-pixel.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-prx-pixel-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`)
- Aliases: none
- Example: `ui.controls.architecture-prx-pixel-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-qwen-image"></a>
### `ui.architecture.qwen-image`

Exact UI metadata for the Qwen-Image architecture.

- UI label: Qwen-Image
- Locations: Ui State `ui.architecture.qwen-image`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"qwen_image"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`qwen_image`)
- Aliases: none
- Example: `ui.architecture.qwen-image: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-2512"></a>
### `ui.architecture.qwen-image-2512`

Exact UI metadata for the Qwen-Image-2512 architecture.

- UI label: Qwen-Image-2512
- Locations: Ui State `ui.architecture.qwen-image-2512`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image:2512`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"qwen_image:2512"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`qwen_image:2512`)
- Aliases: none
- Example: `ui.architecture.qwen-image-2512: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-2512-qtype-control"></a>
### `ui.architecture.qwen-image-2512.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-qwen-image-2512-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint3.safetensors"`, `"uint4|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint4.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`)
- Aliases: none
- Example: `ui.controls.architecture-qwen-image-2512-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit"></a>
### `ui.architecture.qwen-image-edit`

Exact UI metadata for the Qwen-Image-Edit architecture.

- UI label: Qwen-Image-Edit
- Locations: Ui State `ui.architecture.qwen-image-edit`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"qwen_image_edit"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`qwen_image_edit`)
- Aliases: none
- Example: `ui.architecture.qwen-image-edit: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit-plus"></a>
### `ui.architecture.qwen-image-edit-plus`

Exact UI metadata for the Qwen-Image-Edit-2509 architecture.

- UI label: Qwen-Image-Edit-2509
- Locations: Ui State `ui.architecture.qwen-image-edit-plus`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image_edit_plus`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"qwen_image_edit_plus"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`qwen_image_edit_plus`)
- Aliases: none
- Example: `ui.architecture.qwen-image-edit-plus: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit-plus-2511"></a>
### `ui.architecture.qwen-image-edit-plus-2511`

Exact UI metadata for the Qwen-Image-Edit-2511 architecture.

- UI label: Qwen-Image-Edit-2511
- Locations: Ui State `ui.architecture.qwen-image-edit-plus-2511`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image_edit_plus:2511`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"qwen_image_edit_plus:2511"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`qwen_image_edit_plus:2511`)
- Aliases: none
- Example: `ui.architecture.qwen-image-edit-plus-2511: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit-plus-2511-qtype-control"></a>
### `ui.architecture.qwen-image-edit-plus-2511.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-qwen-image-edit-plus-2511-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_2511_torchao_uint3.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`)
- Aliases: none
- Example: `ui.controls.architecture-qwen-image-edit-plus-2511-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit-plus-qtype-control"></a>
### `ui.architecture.qwen-image-edit-plus.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-qwen-image-edit-plus-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_2509_torchao_uint3.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`)
- Aliases: none
- Example: `ui.controls.architecture-qwen-image-edit-plus-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-edit-qtype-control"></a>
### `ui.architecture.qwen-image-edit.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-qwen-image-edit-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_torchao_uint3.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`)
- Aliases: none
- Example: `ui.controls.architecture-qwen-image-edit-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-qwen-image-qtype-control"></a>
### `ui.architecture.qwen-image.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-qwen-image-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`qwen_image`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint3|ostris/accuracy_recovery_adapters/qwen_image_torchao_uint3.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`)
- Aliases: none
- Example: `ui.controls.architecture-qwen-image-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-sd15"></a>
### `ui.architecture.sd15`

Exact UI metadata for the SD 1.5 architecture.

- UI label: SD 1.5
- Locations: Ui State `ui.architecture.sd15`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`sd15`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"sd15"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`sd15`)
- Aliases: none
- Example: `ui.architecture.sd15: value`
- Source symbols: none

<a id="ui-architecture-sdxl"></a>
### `ui.architecture.sdxl`

Exact UI metadata for the SDXL architecture.

- UI label: SDXL
- Locations: Ui State `ui.architecture.sdxl`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`sdxl`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"sdxl"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`sdxl`)
- Aliases: none
- Example: `ui.architecture.sdxl: value`
- Source symbols: none

<a id="ui-architecture-wan21-14b"></a>
### `ui.architecture.wan21-14b`

Exact UI metadata for the Wan 2.1 (14B) architecture.

- UI label: Wan 2.1 (14B)
- Locations: Ui State `ui.architecture.wan21-14b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan21:14b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan21:14b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan21:14b`)
- Aliases: none
- Example: `ui.architecture.wan21-14b: value`
- Source symbols: none

<a id="ui-architecture-wan21-14b-qtype-control"></a>
### `ui.architecture.wan21-14b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan21-14b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`)
- Aliases: none
- Example: `ui.controls.architecture-wan21-14b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan21-1b"></a>
### `ui.architecture.wan21-1b`

Exact UI metadata for the Wan 2.1 (1.3B) architecture.

- UI label: Wan 2.1 (1.3B)
- Locations: Ui State `ui.architecture.wan21-1b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan21:1b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan21:1b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan21:1b`)
- Aliases: none
- Example: `ui.architecture.wan21-1b: value`
- Source symbols: none

<a id="ui-architecture-wan21-1b-qtype-control"></a>
### `ui.architecture.wan21-1b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan21-1b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`)
- Aliases: none
- Example: `ui.controls.architecture-wan21-1b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan21-i2v-14b"></a>
### `ui.architecture.wan21-i2v-14b`

Exact UI metadata for the Wan 2.1 I2V (14B-720P) architecture.

- UI label: Wan 2.1 I2V (14B-720P)
- Locations: Ui State `ui.architecture.wan21-i2v-14b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan21_i2v:14b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan21_i2v:14b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan21_i2v:14b`)
- Aliases: none
- Example: `ui.architecture.wan21-i2v-14b: value`
- Source symbols: none

<a id="ui-architecture-wan21-i2v-14b-qtype-control"></a>
### `ui.architecture.wan21-i2v-14b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan21-i2v-14b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`)
- Aliases: none
- Example: `ui.controls.architecture-wan21-i2v-14b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan21-i2v-14b480p"></a>
### `ui.architecture.wan21-i2v-14b480p`

Exact UI metadata for the Wan 2.1 I2V (14B-480P) architecture.

- UI label: Wan 2.1 I2V (14B-480P)
- Locations: Ui State `ui.architecture.wan21-i2v-14b480p`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan21_i2v:14b480p`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan21_i2v:14b480p"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan21_i2v:14b480p`)
- Aliases: none
- Example: `ui.architecture.wan21-i2v-14b480p: value`
- Source symbols: none

<a id="ui-architecture-wan21-i2v-14b480p-qtype-control"></a>
### `ui.architecture.wan21-i2v-14b480p.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan21-i2v-14b480p-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`)
- Aliases: none
- Example: `ui.controls.architecture-wan21-i2v-14b480p-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan22-14b-i2v"></a>
### `ui.architecture.wan22-14b-i2v`

Exact UI metadata for the Wan 2.2 I2V (14B) architecture.

- UI label: Wan 2.2 I2V (14B)
- Locations: Ui State `ui.architecture.wan22-14b-i2v`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan22_14b_i2v`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan22_14b_i2v"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan22_14b_i2v`)
- Aliases: none
- Example: `ui.architecture.wan22-14b-i2v: value`
- Source symbols: none

<a id="ui-architecture-wan22-14b-i2v-qtype-control"></a>
### `ui.architecture.wan22-14b-i2v.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan22-14b-i2v-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint4|ostris/accuracy_recovery_adapters/wan22_14b_i2v_torchao_uint4.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`)
- Aliases: none
- Example: `ui.controls.architecture-wan22-14b-i2v-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan22-14b-t2v"></a>
### `ui.architecture.wan22-14b-t2v`

Exact UI metadata for the Wan 2.2 (14B) architecture.

- UI label: Wan 2.2 (14B)
- Locations: Ui State `ui.architecture.wan22-14b-t2v`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan22_14b:t2v`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan22_14b:t2v"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan22_14b:t2v`)
- Aliases: none
- Example: `ui.architecture.wan22-14b-t2v: value`
- Source symbols: none

<a id="ui-architecture-wan22-14b-t2v-qtype-control"></a>
### `ui.architecture.wan22-14b-t2v.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan22-14b-t2v-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"uint4|ostris/accuracy_recovery_adapters/wan22_14b_t2i_torchao_uint4.safetensors"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`)
- Aliases: none
- Example: `ui.controls.architecture-wan22-14b-t2v-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-wan22-5b"></a>
### `ui.architecture.wan22-5b`

Exact UI metadata for the Wan 2.2 TI2V (5B) architecture.

- UI label: Wan 2.2 TI2V (5B)
- Locations: Ui State `ui.architecture.wan22-5b`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`wan22_5b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"wan22_5b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`wan22_5b`)
- Aliases: none
- Example: `ui.architecture.wan22-5b: value`
- Source symbols: none

<a id="ui-architecture-wan22-5b-qtype-control"></a>
### `ui.architecture.wan22-5b.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-wan22-5b-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Aliases: none
- Example: `ui.controls.architecture-wan22-5b-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-zeta-chroma"></a>
### `ui.architecture.zeta-chroma`

Exact UI metadata for the Zeta Chroma architecture.

- UI label: Zeta Chroma
- Locations: Ui State `ui.architecture.zeta-chroma`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`zeta_chroma`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"zeta_chroma"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`zeta_chroma`)
- Aliases: none
- Example: `ui.architecture.zeta-chroma: value`
- Source symbols: none

<a id="ui-architecture-zeta-chroma-qtype-control"></a>
### `ui.architecture.zeta-chroma.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-zeta-chroma-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`)
- Aliases: none
- Example: `ui.controls.architecture-zeta-chroma-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-zimage"></a>
### `ui.architecture.zimage`

Exact UI metadata for the Z-Image architecture.

- UI label: Z-Image
- Locations: Ui State `ui.architecture.zimage`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`zimage`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"zimage"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`zimage`)
- Aliases: none
- Example: `ui.architecture.zimage: value`
- Source symbols: none

<a id="ui-architecture-zimage-deturbo"></a>
### `ui.architecture.zimage-deturbo`

Exact UI metadata for the Z-Image De-Turbo (De-Distilled) architecture.

- UI label: Z-Image De-Turbo (De-Distilled)
- Locations: Ui State `ui.architecture.zimage-deturbo`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`zimage:deturbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"zimage:deturbo"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`zimage:deturbo`)
- Aliases: none
- Example: `ui.architecture.zimage-deturbo: value`
- Source symbols: none

<a id="ui-architecture-zimage-deturbo-qtype-control"></a>
### `ui.architecture.zimage-deturbo.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-zimage-deturbo-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`)
- Aliases: none
- Example: `ui.controls.architecture-zimage-deturbo-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-zimage-l2p"></a>
### `ui.architecture.zimage-l2p`

Exact UI metadata for the Z-Image L2P (pixel space) architecture.

- UI label: Z-Image L2P (pixel space)
- Locations: Ui State `ui.architecture.zimage-l2p`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`zimage_l2p`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"zimage_l2p"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`zimage_l2p`)
- Aliases: none
- Example: `ui.architecture.zimage-l2p: value`
- Source symbols: none

<a id="ui-architecture-zimage-l2p-qtype-control"></a>
### `ui.architecture.zimage-l2p.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-zimage-l2p-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Aliases: none
- Example: `ui.controls.architecture-zimage-l2p-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-zimage-turbo"></a>
### `ui.architecture.zimage-turbo`

Exact UI metadata for the Z-Image Turbo (w/ Training Adapter) architecture.

- UI label: Z-Image Turbo (w/ Training Adapter)
- Locations: Ui State `ui.architecture.zimage-turbo`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`zimage:turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: `"zimage:turbo"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.arch`: Controls the architecture-specific UI projection. (ui_architecture=`zimage:turbo`)
- Aliases: none
- Example: `ui.architecture.zimage-turbo: value`
- Source symbols: none

<a id="ui-architecture-zimage-turbo-qtype-control"></a>
### `ui.architecture.zimage-turbo.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-zimage-turbo-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Aliases: none
- Example: `ui.controls.architecture-zimage-turbo-qtype-control: value`
- Source symbols: none

<a id="ui-architecture-zimage-qtype-control"></a>
### `ui.architecture.zimage.qtype-control`

UI projection for Transformer.

- UI label: Transformer
- Locations: Ui State `ui.controls.architecture-zimage-qtype-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, ui_architecture=`zimage`
- Parser/supported/example types: `ui-state` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qtype`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, ui_architecture=`zimage`)
- Aliases: none
- Example: `ui.controls.architecture-zimage-qtype-control: value`
- Source symbols: none

<a id="ui-dataset-collection"></a>
### `ui.dataset.collection`

Exact current UI/documentation field config.process\[\*\].datasets\[\*\].

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*]`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].datasets[*]: value`
- Source symbols: none

<a id="ui-dataset-resolution-1024"></a>
### `ui.dataset.resolution-1024`

UI projection for 1024.

- UI label: 1024
- Locations: Ui State `ui.controls.dataset-resolution-1024`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-1024: value`
- Source symbols: none

<a id="ui-dataset-resolution-1280"></a>
### `ui.dataset.resolution-1280`

UI projection for 1280.

- UI label: 1280
- Locations: Ui State `ui.controls.dataset-resolution-1280`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-1280: value`
- Source symbols: none

<a id="ui-dataset-resolution-1328"></a>
### `ui.dataset.resolution-1328`

UI projection for 1328.

- UI label: 1328
- Locations: Ui State `ui.controls.dataset-resolution-1328`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-1328: value`
- Source symbols: none

<a id="ui-dataset-resolution-1536"></a>
### `ui.dataset.resolution-1536`

UI projection for 1536.

- UI label: 1536
- Locations: Ui State `ui.controls.dataset-resolution-1536`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-1536: value`
- Source symbols: none

<a id="ui-dataset-resolution-2048"></a>
### `ui.dataset.resolution-2048`

UI projection for 2048.

- UI label: 2048
- Locations: Ui State `ui.controls.dataset-resolution-2048`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-2048: value`
- Source symbols: none

<a id="ui-dataset-resolution-256"></a>
### `ui.dataset.resolution-256`

UI projection for 256.

- UI label: 256
- Locations: Ui State `ui.controls.dataset-resolution-256`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-256: value`
- Source symbols: none

<a id="ui-dataset-resolution-512"></a>
### `ui.dataset.resolution-512`

UI projection for 512.

- UI label: 512
- Locations: Ui State `ui.controls.dataset-resolution-512`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-512: value`
- Source symbols: none

<a id="ui-dataset-resolution-768"></a>
### `ui.dataset.resolution-768`

UI projection for 768.

- UI label: 768
- Locations: Ui State `ui.controls.dataset-resolution-768`
- Surfaces: `simple-ui`
- UI projection: `composite-option`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `ui-state` / `ui-projected` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `dataset.resolution`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`)
- Aliases: none
- Example: `ui.controls.dataset-resolution-768: value`
- Source symbols: none

<a id="ui-gpu-ids"></a>
### `ui.gpu-ids`

Exact current UI/documentation field gpuids.

- UI label: GPU ID
- Locations: Ui State `gpuids`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `undocumented` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `gpuids: value`
- Source symbols: none

<a id="ui-model-match-target-res-control"></a>
### `ui.model.match-target-res-control`

UI projection for Match Target Res.

- UI label: Match Target Res
- Locations: Ui State `ui.controls.model-match-target-res-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: ui_architecture=`qwen_image_edit_plus`; ui_architecture=`qwen_image_edit_plus:2511`; ui_architecture=`boogu_image_edit`; ui_architecture=`flux2`; ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `ui-state` / `ui-projected` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `model.qwen_image_edit_plus.model_kwargs.match_target_res`: Writes the exact discriminator-selected runtime setting. (ui_architecture=`qwen_image_edit_plus`; ui_architecture=`qwen_image_edit_plus:2511`); Affects `model.boogu_image.model_kwargs.match_target_res`: Writes the exact discriminator-selected runtime setting. (ui_architecture=`boogu_image_edit`); Affects `model.flux2.model_kwargs.match_target_res`: Writes the exact discriminator-selected runtime setting. (ui_architecture=`flux2`); Affects `model.krea2.model_kwargs.match_target_res`: Writes the exact discriminator-selected runtime setting. (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Aliases: none
- Example: `ui.controls.model-match-target-res-control: value`
- Source symbols: none

<a id="ui-optimizer-weight-decay-control"></a>
### `ui.optimizer.weight-decay-control`

UI projection for Weight Decay.

- UI label: Weight Decay
- Locations: Ui State `ui.controls.optimizer-weight-decay-control`
- Surfaces: `simple-ui`
- UI projection: `discriminator-control`
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `transient` / `ui-derived`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`; process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`; process_type=`diffusion_trainer`, optimizer=`automagic`; process_type=`diffusion_trainer`, optimizer=`automagic2`; process_type=`diffusion_trainer`, optimizer=`automagic3`; process_type=`diffusion_trainer`, optimizer=`automagicexperiment`; process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `ui-state` / `ui-projected` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: Affects `optimizer.adafactor.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`adafactor`); Affects `optimizer.adam8-adamw8.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`); Affects `optimizer.automagic.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`automagic`); Affects `optimizer.automagic2.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`automagic2`); Affects `optimizer.automagic3.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`automagic3`); Affects `optimizer.automagicexperiment.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer=`automagicexperiment`); Affects `optimizer.prodigy8bit*.param.weight_decay`: Writes the exact discriminator-selected runtime setting. (process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`)
- Aliases: none
- Example: `ui.controls.optimizer-weight-decay-control: value`
- Source symbols: none

<a id="ui-slider-anchor-class"></a>
### `ui.slider.anchor-class`

Exact current UI/documentation field config.process\[\*\].slider.anchor\_class.

- UI label: Anchor Class
- Locations: Yaml `config.process[*].slider.anchor_class`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].slider.anchor_class: value`
- Source symbols: none

<a id="ui-slider-negative-prompt"></a>
### `ui.slider.negative-prompt`

Exact current UI/documentation field config.process\[\*\].slider.negative\_prompt.

- UI label: Negative Prompt
- Locations: Yaml `config.process[*].slider.negative_prompt`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].slider.negative_prompt: value`
- Source symbols: none

<a id="ui-slider-positive-prompt"></a>
### `ui.slider.positive-prompt`

Exact current UI/documentation field config.process\[\*\].slider.positive\_prompt.

- UI label: Positive Prompt
- Locations: Yaml `config.process[*].slider.positive_prompt`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].slider.positive_prompt: value`
- Source symbols: none

<a id="ui-slider-target-class"></a>
### `ui.slider.target-class`

Exact current UI/documentation field config.process\[\*\].slider.target\_class.

- UI label: Target Class
- Locations: Yaml `config.process[*].slider.target_class`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `unknown` / `ui-projected` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current simple-UI behavior.
- Drawbacks: The UI projection can change when the form evolves.
- Interactions: none
- Aliases: none
- Example: `config.process[*].slider.target_class: value`
- Source symbols: none


## Model

<a id="model-accuracy-recovery-adapter"></a>
### `model.accuracy_recovery_adapter`

Selects the accuracy-recovery adapter paired with quantized model weights.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.accuracy_recovery_adapter`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `accuracy_recovery_adapter: /workspace/adapters/recovery.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `accuracy_recovery_adapter` (`kwargs.get`)

<a id="model-arch"></a>
### `model.arch`

Selects the engine architecture and migrates legacy architecture flags.

- UI label: Model Architecture
- Locations: Yaml `config.process[*].model.arch`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"ace_step_15"`, `"ace_step_15_xl"`, `"anima"`, `"boogu_image"`, `"chroma"`, `"ernie_image"`, `"flex1"`, `"flex2"`, `"flux"`, `"flux2"`, `"flux2_klein_4b"`, `"flux2_klein_9b"`, `"hidream"`, `"hidream_o1"`, `"krea2"`, `"krea2:turbo"`, `"lumina2"`, `"mageflow"`, `"nucleus_image"`, `"omnigen2"`, `"prx_pixel"`, `"qwen_image"`, `"qwen_image:2512"`, `"sd15"`, `"sdxl"`, `"zimage"`, `"zimage:deturbo"`, `"zimage_l2p"`, `"zimage:turbo"`, `"boogu_image_edit"`, `"flux_kontext"`, `"hidream_e1"`, `"mageflow_edit"`, `"qwen_image_edit"`, `"qwen_image_edit_plus"`, `"qwen_image_edit_plus:2511"`, `"ideogram4"`, `"krea2:o_edit"`, `"krea2:o_edit_turbo"`, `"zeta_chroma"`, `"ltx2"`, `"ltx2.3"`, `"ltx2.5"`, `"minimax_h3"`, `"wan21:1b"`, `"wan21:14b"`, `"wan21_i2v:14b480p"`, `"wan21_i2v:14b"`, `"wan22_14b:t2v"`, `"wan22_14b_i2v"`, `"wan22_5b"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A colon-suffixed UI tag is removed before dispatch. (all supported configurations); flex1 normalizes to the legacy engine architecture name flux. (all supported configurations); When arch is absent, legacy is\_\* flags select an architecture in source order; if none is true, the fallback is sd1. (all supported configurations); Changing architecture writes the selected architecture name, reverts current defaults from tuple index 1, then applies selected defaults from tuple index 0. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: Affects `model.te_name_or_path`: Changing model.arch applies the cataloged UI migration behavior for model.te\_name\_or\_path. (all supported configurations); Affects `model.vae_path`: Changing model.arch applies the cataloged UI migration behavior for model.vae\_path. (all supported configurations); Affects `model.low_vram`: Changing model.arch applies the cataloged UI migration behavior for model.low\_vram. (all supported configurations); Affects `model.layer_offloading`: Changing model.arch applies the cataloged UI migration behavior for model.layer\_offloading. (all supported configurations); Affects `model.layer_offloading_text_encoder_percent`: Changing model.arch applies the cataloged UI migration behavior for model.layer\_offloading\_text\_encoder\_percent. (all supported configurations); Affects `model.layer_offloading_transformer_percent`: Changing model.arch applies the cataloged UI migration behavior for model.layer\_offloading\_transformer\_percent. (all supported configurations); Affects `dataset.controls`: Changing model.arch applies the cataloged UI migration behavior for dataset.controls. (all supported configurations); Affects `dataset.control_path`: Changing model.arch applies the cataloged UI migration behavior for dataset.control\_path. (all supported configurations); Affects `dataset.control_path_1`: Changing model.arch applies the cataloged UI migration behavior for dataset.control\_path\_1. (all supported configurations); Affects `dataset.control_path_2`: Changing model.arch applies the cataloged UI migration behavior for dataset.control\_path\_2. (all supported configurations); Affects `dataset.control_path_3`: Changing model.arch applies the cataloged UI migration behavior for dataset.control\_path\_3. (all supported configurations); Affects `dataset.num_frames`: Changing model.arch applies the cataloged UI migration behavior for dataset.num\_frames. (all supported configurations); Affects `dataset.auto_frame_count`: Changing model.arch applies the cataloged UI migration behavior for dataset.auto\_frame\_count. (all supported configurations); Affects `sample.item.ctrl_img`: Changing model.arch applies the cataloged UI migration behavior for sample.item.ctrl\_img. (all supported configurations)
- Aliases: none
- Example: `arch: flux`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `arch` (`kwargs.get`)

<a id="model-assistant-lora-path"></a>
### `model.assistant_lora_path`

Loads a decompression or assistant LoRA alongside the base model.

- UI label: Training Adapter Path
- Locations: Yaml `config.process[*].model.assistant_lora_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: On Select present as `"ostris/krea2_turbo_training_adapter/krea2_turbo_training_adapter_v1.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `"ostris/krea2_turbo_training_adapter/krea2_turbo_training_adapter_v1.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `"ostris/zimage_turbo_training_adapter/zimage_turbo_training_adapter_v2.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `"ostris/krea2_turbo_training_adapter/krea2_turbo_training_adapter_v1.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `"ostris/krea2_turbo_training_adapter/krea2_turbo_training_adapter_v1.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `"ostris/zimage_turbo_training_adapter/zimage_turbo_training_adapter_v2.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `assistant_lora_path: /workspace/adapters/assistant.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `assistant_lora_path` (`kwargs.get`)

<a id="model-attn-masking"></a>
### `model.attn_masking`

Enables the FLUX-specific attention masking path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.attn_masking`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); A truthy value with a non-FLUX legacy architecture flag raises ValueError. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: Requires `model.is_flux`: The constructor rejects this feature unless the legacy FLUX flag is true. (all supported configurations)
- Aliases: none
- Example: `attn_masking: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `attn_masking` (`kwargs.get`)

<a id="model-auto-memory"></a>
### `model.auto_memory`

Legacy switch that delegates model memory movement to layer offloading.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.auto_memory`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `deprecated`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); auto\_memory is deprecated; use layer\_offloading instead. (all supported configurations); When present, the UI migrator copies auto\_memory with a false fallback to model.layer\_offloading and deletes auto\_memory after the write. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `auto_memory: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `auto_memory` (`kwargs.get`)

<a id="model-block-compile"></a>
### `model.block_compile`

Compiles eligible model blocks individually instead of compiling one whole graph.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.block_compile`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `block_compile: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `block_compile` (`kwargs.get`)

<a id="model-cache-size-limit"></a>
### `model.cache_size_limit`

Overrides the Torch Dynamo compilation cache-size limit.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.cache_size_limit`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `cache_size_limit: null`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `cache_size_limit` (`kwargs.get`)

<a id="model-compile"></a>
### `model.compile`

Enables experimental torch.compile model execution.

- UI label: Compile Model
- Locations: Yaml `config.process[*].model.compile`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); Quantized compilation is allowed but explicitly experimental. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: Affects `model.quantize`: Combining compilation and quantization is allowed as an experimental path. (all supported configurations)
- Aliases: none
- Example: `compile: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `compile` (`kwargs.get`)

<a id="model-compile-dynamic"></a>
### `model.compile_dynamic`

Controls dynamic-shape tracing for torch.compile.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.compile_dynamic`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `compile_dynamic: true`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `compile_dynamic` (`kwargs.get`)

<a id="model-compile-fullgraph"></a>
### `model.compile_fullgraph`

Requires torch.compile to capture a full graph.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.compile_fullgraph`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `compile_fullgraph: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `compile_fullgraph` (`kwargs.get`)

<a id="model-compile-mode"></a>
### `model.compile_mode`

Selects the torch.compile optimization mode.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.compile_mode`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; `"default"`, `"reduce-overhead"`, `"max-autotune"`, `"max-autotune-no-cudagraphs"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"default"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `compile_mode: default`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `compile_mode` (`kwargs.get`)

<a id="model-dtype"></a>
### `model.dtype`

Selects the base model tensor dtype before component-specific overrides.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.dtype`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; `"float"`, `"fp32"`, `"single"`, `"float32"`, `"fp16"`, `"half"`, `"float16"`, `"bf16"`, `"bfloat16"`, `"8bit"`, `"e4m3fn"`, `"float8"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"float16"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `dtype: bf16`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `dtype` (`kwargs.get`)

<a id="model-experimental-xl"></a>
### `model.experimental_xl`

Enables the legacy experimental SDXL loading path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.experimental_xl`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `experimental_xl: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `experimental_xl` (`kwargs.get`)

<a id="model-extras-name-or-path"></a>
### `model.extras_name_or_path`

Selects a shared source for extra components such as text encoders or a VAE.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.extras_name_or_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"model.name_or_path"}` (all supported configurations)
- Other runtime/default transitions: On Select present as `"Tongyi-MAI/Z-Image-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `"Tongyi-MAI/Z-Image-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"Tongyi-MAI/Z-Image-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `"Tongyi-MAI/Z-Image-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `"Tongyi-MAI/Z-Image-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"Tongyi-MAI/Z-Image-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: Omission inherits model.name\_or\_path; explicit null remains null. (all supported configurations)
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `extras_name_or_path: /workspace/model-extras`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `extras_name_or_path` (`kwargs.get`)

<a id="model-ignore-if-contains"></a>
### `model.ignore_if_contains`

Excludes model parameter names containing any listed fragment.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.ignore_if_contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-list` / `string-list-or-null` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `ignore_if_contains: [time_text_embed]`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `ignore_if_contains` (`kwargs.get`)

<a id="model-in-context"></a>
### `model.in_context`

Enables architecture-specific in-context model behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.in_context`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `in_context: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `in_context` (`kwargs.get`)

<a id="model-inference-lora-path"></a>
### `model.inference_lora_path`

Loads a LoRA intended to stay active for inference and sampling.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.inference_lora_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `inference_lora_path: /workspace/adapters/inference.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `inference_lora_path` (`kwargs.get`)

<a id="model-is-auraflow"></a>
### `model.is_auraflow`

Legacy flag that selects the AuraFlow architecture when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_auraflow`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_auraflow: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_auraflow` (`kwargs.get`)

<a id="model-is-flux"></a>
### `model.is_flux`

Legacy flag that selects the FLUX architecture when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_flux`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_flux: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_flux` (`kwargs.get`)

<a id="model-is-lumina2"></a>
### `model.is_lumina2`

Legacy flag that selects the Lumina 2 architecture when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_lumina2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_lumina2: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_lumina2` (`kwargs.get`)

<a id="model-is-pixart"></a>
### `model.is_pixart`

Legacy flag that selects the PixArt architecture when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_pixart`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_pixart: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_pixart` (`kwargs.get`)

<a id="model-is-pixart-sigma"></a>
### `model.is_pixart_sigma`

Legacy flag that selects PixArt Sigma and also enables PixArt behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_pixart_sigma`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); A truthy is\_pixart\_sigma value also forces is\_pixart true. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_pixart_sigma: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_pixart_sigma` (`kwargs.get`)

<a id="model-is-ssd"></a>
### `model.is_ssd`

Legacy flag that selects SSD and also enables SDXL-compatible behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_ssd`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); A truthy is\_ssd value also forces is\_xl true. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_ssd: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_ssd` (`kwargs.get`)

<a id="model-is-v2"></a>
### `model.is_v2`

Legacy flag that selects Stable Diffusion 2 when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_v2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_v2: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_v2` (`kwargs.get`)

<a id="model-is-v3"></a>
### `model.is_v3`

Legacy flag that selects Stable Diffusion 3 when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_v3`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_v3: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_v3` (`kwargs.get`)

<a id="model-is-v-pred"></a>
### `model.is_v_pred`

Marks the model as using v-prediction semantics.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_v_pred`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_v_pred: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_v_pred` (`kwargs.get`)

<a id="model-is-vega"></a>
### `model.is_vega`

Legacy flag that selects Vega and also enables SDXL-compatible behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_vega`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); A truthy is\_vega value also forces is\_xl true. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_vega: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_vega` (`kwargs.get`)

<a id="model-is-xl"></a>
### `model.is_xl`

Legacy flag that selects SDXL when arch is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.is_xl`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `is_xl: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `is_xl` (`kwargs.get`)

<a id="model-latent-space-version"></a>
### `model.latent_space_version`

Selects an architecture-specific latent-space compatibility version.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.latent_space_version`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `latent_space_version: v1`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `latent_space_version` (`kwargs.get`)

<a id="model-layer-offloading"></a>
### `model.layer_offloading`

Moves model layers between devices to reduce peak accelerator memory.

- UI label: Layer Offloading
- Locations: Yaml `config.process[*].model.layer_offloading`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"model.auto_memory"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits deprecated model.auto\_memory; explicit null remains falsey. (all supported configurations); When layer offloading is truthy, qfloat8 model and text-encoder qtypes normalize to float8. (all supported configurations); When model.layer\_offloading is unsupported and the main layer\_offloading property is present, changing architecture deletes layer\_offloading and both percentage fields from the copied model; when model.layer\_offloading is supported but the main property is absent, it writes layer\_offloading=false and both percentage fields to 1. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: Affects `model.qtype`: Layer offloading rewrites qfloat8 model quantization to float8. (all supported configurations); Affects `model.qtype_te`: Layer offloading rewrites qfloat8 text-encoder quantization to float8. (all supported configurations)
- Aliases: `config.process[*].model.auto_memory` → `model.layer_offloading` (Deprecated, Alias Wins): When auto\_memory is present, copy its falsey-coerced boolean value to layer\_offloading, then delete auto\_memory.
- Example: `layer_offloading: null`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `layer_offloading` (`kwargs.get`)

<a id="model-layer-offloading-text-encoder-percent"></a>
### `model.layer_offloading_text_encoder_percent`

Sets the fraction of text-encoder layers eligible for offloading.

- UI label: Text Encoder Offload %
- Locations: Yaml `config.process[*].model.layer_offloading_text_encoder_percent`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; `[0, 100]`; none
- UI normalization scales: config→UI `100`, UI→config `0.01`
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Changing architecture deletes layer\_offloading\_text\_encoder\_percent only when model.layer\_offloading is unsupported and the main layer\_offloading property is present; it initializes the percentage to 1 when model.layer\_offloading is supported but the main property is absent. (all supported configurations); The Simple UI multiplies the stored 0–1 fraction by 100 for display and multiplies the 0–100 slider value by 0.01 before storing it. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `layer_offloading_text_encoder_percent: 1`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `layer_offloading_text_encoder_percent` (`kwargs.get`)

<a id="model-layer-offloading-transformer-percent"></a>
### `model.layer_offloading_transformer_percent`

Sets the fraction of transformer layers eligible for offloading.

- UI label: Transformer Offload %
- Locations: Yaml `config.process[*].model.layer_offloading_transformer_percent`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; `[0, 100]`; none
- UI normalization scales: config→UI `100`, UI→config `0.01`
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Changing architecture deletes layer\_offloading\_transformer\_percent only when model.layer\_offloading is unsupported and the main layer\_offloading property is present; it initializes the percentage to 1 when model.layer\_offloading is supported but the main property is absent. (all supported configurations); The Simple UI multiplies the stored 0–1 fraction by 100 for display and multiplies the 0–100 slider value by 0.01 before storing it. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `layer_offloading_transformer_percent: 1`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `layer_offloading_transformer_percent` (`kwargs.get`)

<a id="model-lora-path"></a>
### `model.lora_path`

Loads a model-level LoRA before training starts.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.lora_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `lora_path: /workspace/adapters/base.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `lora_path` (`kwargs.get`)

<a id="model-low-vram"></a>
### `model.low_vram`

Enables architecture-specific low-VRAM loading and execution choices.

- UI label: Low VRAM
- Locations: Yaml `config.process[*].model.low_vram`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); Changing architecture writes low\_vram=false when the selected architecture does not support model.low\_vram. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `low_vram: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `low_vram` (`kwargs.get`)

<a id="model-model-kwargs"></a>
### `model.model_kwargs`

Passes architecture-specific options to the selected first-party model implementation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Exposes architecture-specific configuration without changing the common model envelope.
- Drawbacks: Unknown or incompatible nested keys can fail only when the selected model consumes them.
- Interactions: none
- Aliases: none
- Example: `model_kwargs: {}`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `model_kwargs` (`kwargs.get`)

<a id="model-model-paths"></a>
### `model.model_paths`

Provides named component paths for architectures with split model assets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_paths`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Exposes architecture-specific configuration without changing the common model envelope.
- Drawbacks: Unknown or incompatible nested keys can fail only when the selected model consumes them.
- Interactions: none
- Aliases: none
- Example: `model_paths: {}`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `model_paths` (`kwargs.get`)

<a id="model-name-or-path"></a>
### `model.name_or_path`

Selects the required local path or repository identifier for the base model.

- UI label: Name or Path
- Locations: Yaml `config.process[*].model.name_or_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `required-model-path-or-repository-id` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: On Select present as `"ostris/ace_step_1.5_ComfyUI_files/ace_step_1.5_base_aio.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `"ostris/ace_step_1.5_ComfyUI_files/ace_step_1.5_xl_base_aio.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `"circlestone-labs/Anima-Base-v1.0-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"Boogu/Boogu-Image-0.1-Base"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `"Boogu/Boogu-Image-0.1-Edit"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `"lodestones/Chroma1-Base"` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Select present as `"baidu/ERNIE-Image"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `"ostris/Flex.1-alpha"` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `"ostris/Flex.2-preview"` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Select present as `"black-forest-labs/FLUX.1-dev"` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Select present as `"black-forest-labs/FLUX.2-dev"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `"black-forest-labs/FLUX.2-klein-base-4B"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `"black-forest-labs/FLUX.2-klein-base-9B"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `"black-forest-labs/FLUX.1-Kontext-dev"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `"HiDream-ai/HiDream-I1-Full"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `"HiDream-ai/HiDream-E1-1"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `"HiDream-ai/HiDream-O1-Image"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `"ideogram-ai/ideogram-4-fp8"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `"krea/Krea-2-Raw"` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `"krea/Krea-2-Raw"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `"krea/Krea-2-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `"krea/Krea-2-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `"Lightricks/LTX-2"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `"Lightricks/LTX-2.3/ltx-2.3-22b-dev.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `"Lightricks/LTX-2.5"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"Alpha-VLLM/Lumina-Image-2.0"` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Select present as `"microsoft/Mage-Flow-Base"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `"microsoft/Mage-Flow-Edit-Base"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `"Comfy-Org/MiniMax-H3"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `"NucleusAI/Nucleus-Image"` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Select present as `"OmniGen2/OmniGen2"` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Select present as `"Photoroom/prxpixel-t2i"` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `"Qwen/Qwen-Image"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `"Qwen/Qwen-Image-2512"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `"Qwen/Qwen-Image-Edit"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `"Qwen/Qwen-Image-Edit-2509"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `"Qwen/Qwen-Image-Edit-2511"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `"stable-diffusion-v1-5/stable-diffusion-v1-5"` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `"stabilityai/stable-diffusion-xl-base-1.0"` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `"Wan-AI/Wan2.1-T2V-14B-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `"Wan-AI/Wan2.1-T2V-1.3B-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `"Wan-AI/Wan2.1-I2V-14B-720P-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `"Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `"ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `"ai-toolkit/Wan2.2-I2V-A14B-Diffusers-bf16"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `"Wan-AI/Wan2.2-TI2V-5B-Diffusers"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `"lodestones/Zeta-Chroma/zeta-chroma-base-x0-pixel-dino-distance.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `"Tongyi-MAI/Z-Image"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `"ostris/Z-Image-De-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"Tongyi-MAI/Z-Image-Turbo"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Select present as `"zhen-nan/L2P/model-1k-merge.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `"ostris/ace_step_1.5_ComfyUI_files/ace_step_1.5_base_aio.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `"ostris/ace_step_1.5_ComfyUI_files/ace_step_1.5_xl_base_aio.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `"circlestone-labs/Anima-Base-v1.0-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"Boogu/Boogu-Image-0.1-Base"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `"Boogu/Boogu-Image-0.1-Edit"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `"lodestones/Chroma1-Base"` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Select present as `"baidu/ERNIE-Image"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `"ostris/Flex.1-alpha"` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `"ostris/Flex.2-preview"` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Select present as `"black-forest-labs/FLUX.1-dev"` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Select present as `"black-forest-labs/FLUX.2-dev"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `"black-forest-labs/FLUX.2-klein-base-4B"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `"black-forest-labs/FLUX.2-klein-base-9B"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `"black-forest-labs/FLUX.1-Kontext-dev"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `"HiDream-ai/HiDream-I1-Full"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `"HiDream-ai/HiDream-E1-1"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `"HiDream-ai/HiDream-O1-Image"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `"ideogram-ai/ideogram-4-fp8"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `"krea/Krea-2-Raw"` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `"krea/Krea-2-Raw"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `"krea/Krea-2-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `"krea/Krea-2-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `"Lightricks/LTX-2"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `"Lightricks/LTX-2.3/ltx-2.3-22b-dev.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `"Lightricks/LTX-2.5"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"Alpha-VLLM/Lumina-Image-2.0"` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Select present as `"microsoft/Mage-Flow-Base"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `"microsoft/Mage-Flow-Edit-Base"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `"Comfy-Org/MiniMax-H3"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `"NucleusAI/Nucleus-Image"` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Select present as `"OmniGen2/OmniGen2"` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Select present as `"Photoroom/prxpixel-t2i"` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `"Qwen/Qwen-Image"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `"Qwen/Qwen-Image-2512"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `"Qwen/Qwen-Image-Edit"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `"Qwen/Qwen-Image-Edit-2509"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `"Qwen/Qwen-Image-Edit-2511"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `"stable-diffusion-v1-5/stable-diffusion-v1-5"` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `"stabilityai/stable-diffusion-xl-base-1.0"` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `"Wan-AI/Wan2.1-T2V-14B-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `"Wan-AI/Wan2.1-T2V-1.3B-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `"Wan-AI/Wan2.1-I2V-14B-720P-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `"Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `"ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `"ai-toolkit/Wan2.2-I2V-A14B-Diffusers-bf16"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `"Wan-AI/Wan2.2-TI2V-5B-Diffusers"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `"lodestones/Zeta-Chroma/zeta-chroma-base-x0-pixel-dino-distance.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `"Tongyi-MAI/Z-Image"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `"ostris/Z-Image-De-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"Tongyi-MAI/Z-Image-Turbo"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Select present as `"zhen-nan/L2P/model-1k-merge.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: Omission and explicit null reach the required-value check and raise ValueError before model loading. (all supported configurations)
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `name_or_path: /workspace/base-model`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `name_or_path` (`kwargs.get`)

<a id="model-only-if-contains"></a>
### `model.only_if_contains`

Limits selected model parameters to names containing one of the listed fragments.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.only_if_contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-list` / `string-list-or-null` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `only_if_contains: [transformer]`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `only_if_contains` (`kwargs.get`)

<a id="model-qtype"></a>
### `model.qtype`

Selects the base-model quantization type and can encode an accuracy-recovery adapter.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.qtype`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"qfloat8"` (all supported configurations)
- Other runtime/default transitions: On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `""` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `"convrot8"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"convrot8"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `""` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `"convrot8"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"convrot8"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: A qtype containing | is split once into the quantization type and accuracy recovery adapter path. (all supported configurations); Layer offloading normalizes qfloat8 to float8. (all supported configurations); On MPS, qfloat8 normalizes to convrot8 because MPS has no fp8 dtype. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: Affects `model.accuracy_recovery_adapter`: The pipe syntax can replace the separately configured accuracy-recovery adapter. (all supported configurations)
- Aliases: none
- Example: `qtype: qfloat8`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `qtype` (`kwargs.get`)

<a id="model-qtype-te"></a>
### `model.qtype_te`

Selects the text-encoder quantization type.

- UI label: Text Encoder
- Locations: Yaml `config.process[*].model.qtype_te`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"qfloat8"`, `"float8"`, `"convrot8"`, `"convrot4"`, `"nvfp4"`, `"convrotint7"`, `"convrotint6"`, `"convrotint5"`, `"convrotint4"`, `"convrotint3"`, `"convrotint2"`, `"convrotbitnet"`, `"uint7"`, `"uint6"`, `"uint5"`, `"uint4"`, `"uint3"`, `"uint2"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"qfloat8"` (all supported configurations)
- Other runtime/default transitions: On Select present as `""` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"convrot8"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"nvfp4"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `"qfloat8"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `""` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"convrot8"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"nvfp4"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `"qfloat8"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: Layer offloading normalizes qfloat8 to float8. (all supported configurations); On MPS, qfloat8 normalizes to convrot8 because MPS has no fp8 dtype. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `qtype_te: qfloat8`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `qtype_te` (`kwargs.get`)

<a id="model-quantize"></a>
### `model.quantize`

Enables base-model quantization.

- UI label: Transformer
- Locations: Yaml `config.process[*].model.quantize`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `false`, `true`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `quantize: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `quantize` (`kwargs.get`)

<a id="model-quantize-kwargs"></a>
### `model.quantize_kwargs`

Passes quantizer-specific options to base-model quantization.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.quantize_kwargs`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Exposes architecture-specific configuration without changing the common model envelope.
- Drawbacks: Unknown or incompatible nested keys can fail only when the selected model consumes them.
- Interactions: none
- Aliases: none
- Example: `quantize_kwargs: {}`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `quantize_kwargs` (`kwargs.get`)

<a id="model-quantize-te"></a>
### `model.quantize_te`

Enables text-encoder quantization, inheriting the base quantization switch when omitted.

- UI label: Text Encoder
- Locations: Yaml `config.process[*].model.quantize_te`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `false`, `true`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"model.quantize"}` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: Omission inherits model.quantize; explicit null remains null and is falsey. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: Fallback `model.quantize`: Omission inherits the base-model quantization switch. (all supported configurations)
- Aliases: none
- Example: `quantize_te: null`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `quantize_te` (`kwargs.get`)

<a id="model-refiner-name-or-path"></a>
### `model.refiner_name_or_path`

Selects an optional refiner model path or repository identifier.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.refiner_name_or_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `refiner_name_or_path: /workspace/refiner`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `refiner_name_or_path` (`kwargs.get`)

<a id="model-refiner-start-at"></a>
### `model.refiner_start_at`

Sets the denoising fraction at which the refiner takes over.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.refiner_start_at`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.5` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: Requires `model.refiner_name_or_path`: A takeover fraction has an effect only when a refiner model is configured. (all supported configurations)
- Aliases: none
- Example: `refiner_start_at: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `refiner_start_at` (`kwargs.get`)

<a id="model-split-model-other-module-param-count-scale"></a>
### `model.split_model_other_module_param_count_scale`

Weights non-transformer parameters when distributing a split model across GPUs.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.split_model_other_module_param_count_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.3` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `split_model_other_module_param_count_scale: 0.3`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `split_model_other_module_param_count_scale` (`kwargs.get`)

<a id="model-split-model-over-gpus"></a>
### `model.split_model_over_gpus`

Enables the experimental FLUX-only multi-GPU model split.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.split_model_over_gpus`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations); A truthy value with a non-FLUX legacy architecture flag raises ValueError. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: Requires `model.is_flux`: The constructor rejects this feature unless the legacy FLUX flag is true. (all supported configurations)
- Aliases: none
- Example: `split_model_over_gpus: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `split_model_over_gpus` (`kwargs.get`)

<a id="model-te-device"></a>
### `model.te_device`

Overrides the device used by the text encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.te_device`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `te_device: cuda:0`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `te_device` (`kwargs.get`)

<a id="model-te-dtype"></a>
### `model.te_dtype`

Overrides the text-encoder dtype and inherits model dtype when omitted.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.te_dtype`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"model.dtype"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits model.dtype; explicit null remains null. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `te_dtype: bf16`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `te_dtype` (`kwargs.get`)

<a id="model-te-name-or-path"></a>
### `model.te_name_or_path`

Selects an optional separate text-encoder source.

- UI label: Text Encoder Path
- Locations: Yaml `config.process[*].model.te_name_or_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Changing architecture deletes te\_name\_or\_path only when the selected architecture does not support model.te\_name\_or\_path, independently of model.vae\_path support. (all supported configurations)
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `te_name_or_path: /workspace/text-encoder`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `te_name_or_path` (`kwargs.get`)

<a id="model-text-encoder-bits"></a>
### `model.text_encoder_bits`

Selects legacy text-encoder precision in bits.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.text_encoder_bits`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer-or-null` / `integer`
- Accepted types/values: not separately constrained; `4`, `8`, `16`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `16` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `text_encoder_bits: 16`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `text_encoder_bits` (`kwargs.get`)

<a id="model-unconditional-lora-path"></a>
### `model.unconditional_lora_path`

Loads a LoRA only for the unconditional or negative CFG pass.

- UI label: Unconditional Adapter Path
- Locations: Yaml `config.process[*].model.unconditional_lora_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: On Select present as `"ostris/ideogram_4_unconditional_lora/ideogram_4_unconditional_lora_r16.safetensors"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `"ostris/ideogram_4_unconditional_lora/ideogram_4_unconditional_lora_r16.safetensors"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `unconditional_lora_path: /workspace/adapters/unconditional.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `unconditional_lora_path` (`kwargs.get`)

<a id="model-unet-path"></a>
### `model.unet_path`

Selects an optional separate UNet source.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.unet_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `unet_path: /workspace/unet`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `unet_path` (`kwargs.get`)

<a id="model-unet-sample-size"></a>
### `model.unet_sample_size`

Overrides the UNet sample-size metadata when supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.unet_sample_size`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `unet_sample_size: null`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `unet_sample_size` (`kwargs.get`)

<a id="model-use-flux-cfg"></a>
### `model.use_flux_cfg`

Enables FLUX classifier-free-guidance behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.use_flux_cfg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `use_flux_cfg: false`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `use_flux_cfg` (`kwargs.get`)

<a id="model-use-text-encoder-1"></a>
### `model.use_text_encoder_1`

Enables the first text encoder for models with multiple encoders.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.use_text_encoder_1`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `use_text_encoder_1: true`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `use_text_encoder_1` (`kwargs.get`)

<a id="model-use-text-encoder-2"></a>
### `model.use_text_encoder_2`

Enables the second text encoder for models with multiple encoders.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.use_text_encoder_2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: kwargs.get preserves explicit null; boolean consumers treat it as falsey rather than restoring the omission fallback. (all supported configurations)
- Benefits: Makes the behavior selectable for architectures and hardware that support it.
- Drawbacks: Enabling it on an unsupported architecture or device can fail or increase resource use; explicit null is preserved and acts falsey.
- Interactions: none
- Aliases: none
- Example: `use_text_encoder_2: true`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `use_text_encoder_2` (`kwargs.get`)

<a id="model-vae-device"></a>
### `model.vae_device`

Overrides the device used by the VAE.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.vae_device`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `vae_device: cuda:0`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `vae_device` (`kwargs.get`)

<a id="model-vae-dtype"></a>
### `model.vae_dtype`

Overrides the VAE dtype and inherits model dtype when omitted.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.vae_dtype`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-null` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"model.dtype"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits model.dtype; explicit null remains null. (all supported configurations)
- Benefits: Makes the model-loading or execution choice explicit and reproducible in YAML.
- Drawbacks: Unsupported values can fail later in model loading or produce incompatible precision, memory, or execution behavior.
- Interactions: none
- Aliases: none
- Example: `vae_dtype: bf16`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `vae_dtype` (`kwargs.get`)

<a id="model-vae-path"></a>
### `model.vae_path`

Selects an optional separate VAE source.

- UI label: VAE Path
- Locations: Yaml `config.process[*].model.vae_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Changing architecture deletes vae\_path only when the selected architecture does not support model.vae\_path, independently of model.te\_name\_or\_path support. (all supported configurations)
- Benefits: Allows the model assembly to use an explicit component or adapter source.
- Drawbacks: A missing or incompatible path or repository can prevent model assembly or produce mismatched components.
- Interactions: none
- Aliases: none
- Example: `vae_path: /workspace/vae`
- Source symbols: `toolkit/config_modules.py` :: `ModelConfig.__init__` :: `vae_path` (`kwargs.get`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
