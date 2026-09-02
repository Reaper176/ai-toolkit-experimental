# Advanced-only settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](optimizers-and-schedulers.md) · [Next →](../advanced/yaml-and-cli.md)
<!-- book-navigation:end -->

This page collects catalog settings intended for advanced YAML, CLI, environment, or specialized model workflows rather than ordinary Simple UI editing. Absent values, engine fallbacks, runtime-forced values, and architecture overrides retain their separate authorities; the generated contract does not promote an implementation fallback into a recommendation.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Advanced Only Settings

<a id="adapter-adapter-type"></a>
### `adapter.adapter_type`

Selects the concrete adapter architecture variant used by adapter implementations.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.adapter_type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `adapter-architecture-name` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"full_adapter"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Selects the concrete T2I adapter architecture variant constructed for the run.
- Drawbacks: An unsupported variant fails construction or is incompatible with the selected model.
- Interactions: none
- Aliases: none
- Example: `adapter_type: full_adapter`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `adapter_type` (`kwargs.get`)

<a id="adapter-channels"></a>
### `adapter.channels`

Sets the channel width at each T2I-adapter stage.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.channels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer-list` / `positive-integer-list` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `[320,640,1280,1280]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Defines per-stage feature widths so adapter capacity follows the target feature pyramid.
- Drawbacks: Widths that do not match the model produce shape errors and larger widths consume more memory.
- Interactions: none
- Aliases: none
- Example: `channels: [320, 640, 1280, 1280]`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `channels` (`kwargs.get`)

<a id="adapter-class-names"></a>
### `adapter.class_names`

Lists class names used by class-aware adapter workflows.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.class_names`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-list` / `string-list` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `[]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supplies an ordered label vocabulary for adapters that consume class-conditioned inputs.
- Drawbacks: Incorrect ordering or names mislabel class-conditioned data.
- Interactions: none
- Aliases: none
- Example: `class_names: ["cat", "dog"]`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `class_names` (`kwargs.get`)

<a id="adapter-clip-layer"></a>
### `adapter.clip_layer`

Selects which CLIP vision representation supplies adapter features.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.clip_layer`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `clip-layer-or-null` / `string`
- Accepted types/values: not separately constrained; `"penultimate_hidden_states"`, `"image_embeds"`, `"last_hidden_state"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When omitted, ip+ selects penultimate\_hidden\_states and other adapter types select last\_hidden\_state. (all supported configurations)
- Benefits: Chooses which CLIP representation supplies image conditioning to IP-style adapters.
- Drawbacks: The wrong representation can degrade conditioning or mismatch adapter weights.
- Interactions: none
- Aliases: none
- Example: `clip_layer: image_embeds`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `clip_layer` (`kwargs.get`)

<a id="adapter-control-image-dropout"></a>
### `adapter.control_image_dropout`

Sets the chance that control input is replaced with noise during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.control_image_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Regularizes control dependence by replacing a chosen fraction of control images with noise.
- Drawbacks: High dropout weakens control adherence; zero provides no dropout regularization.
- Interactions: none
- Aliases: none
- Example: `control_image_dropout: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `control_image_dropout` (`kwargs.get`)

<a id="adapter-conv-pooling"></a>
### `adapter.conv_pooling`

Enables convolutional pooling of adapter embeddings.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.conv_pooling`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Enables a trainable convolutional pooling stage for image-encoder embeddings.
- Drawbacks: Pooling changes embedding shape and must match the adapter implementation.
- Interactions: none
- Aliases: none
- Example: `conv_pooling: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `conv_pooling` (`kwargs.get`)

<a id="adapter-conv-pooling-stacks"></a>
### `adapter.conv_pooling_stacks`

Sets the number of convolutional pooling stacks.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.conv_pooling_stacks`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets the depth of the convolutional pooling stack used for image embeddings.
- Drawbacks: More stacks add capacity, memory use, and training cost.
- Interactions: none
- Aliases: none
- Example: `conv_pooling_stacks: 2`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `conv_pooling_stacks` (`kwargs.get`)

<a id="adapter-downscale-factor"></a>
### `adapter.downscale_factor`

Sets the spatial downscale factor used by the adapter.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.downscale_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `8` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Aligns adapter spatial reduction with the latent scale expected by the model.
- Drawbacks: A factor inconsistent with model latent resolution causes shape or quality problems.
- Interactions: none
- Aliases: none
- Example: `downscale_factor: 8`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `downscale_factor` (`kwargs.get`)

<a id="adapter-flux-only-double"></a>
### `adapter.flux_only_double`

Restricts Flux adapter application to double-stream blocks.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.flux_only_double`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Restricts Flux adaptation to double-stream blocks when single-stream coverage is unnecessary.
- Drawbacks: It omits single-stream blocks and can reduce adapter reach.
- Interactions: none
- Aliases: none
- Example: `flux_only_double: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `flux_only_double` (`kwargs.get`)

<a id="adapter-has-inpainting-input"></a>
### `adapter.has_inpainting_input`

Adds the inpainting input channel behavior expected by control adapters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.has_inpainting_input`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Declares the additional inpainting input so compatible control adapters accept mask-conditioned channels.
- Drawbacks: Enabling it without matching data/model channels produces incompatible inputs.
- Interactions: none
- Aliases: none
- Example: `has_inpainting_input: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `has_inpainting_input` (`kwargs.get`)

<a id="adapter-head-dim"></a>
### `adapter.head_dim`

Sets the feature dimension per iLoRA attention head.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.head_dim`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1024` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets the feature width assigned to each iLoRA attention head.
- Drawbacks: Incompatible dimensions cause shape errors; large dimensions cost memory.
- Interactions: none
- Aliases: none
- Example: `head_dim: 1024`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `head_dim` (`kwargs.get`)

<a id="adapter-i2v-do-start-frame"></a>
### `adapter.i2v_do_start_frame`

Appends the masked start frame for image-to-video adapter pretraining.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.i2v_do_start_frame`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Appends the masked starting frame used by compatible image-to-video adapter pretraining.
- Drawbacks: It changes the expected input layout and is only meaningful for compatible I2V adapters.
- Interactions: none
- Aliases: none
- Example: `i2v_do_start_frame: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `i2v_do_start_frame` (`kwargs.get`)

<a id="adapter-ilora-down"></a>
### `adapter.ilora_down`

Parses ilora\_down into AdapterConfig, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.ilora_down`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Documents the parsed ilora\_down compatibility field and its true default value.
- Drawbacks: Changing ilora\_down has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `ilora_down: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `ilora_down` (`kwargs.get`)

<a id="adapter-ilora-mid"></a>
### `adapter.ilora_mid`

Parses ilora\_mid into AdapterConfig, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.ilora_mid`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Documents the parsed ilora\_mid compatibility field and its true default value.
- Drawbacks: Changing ilora\_mid has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `ilora_mid: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `ilora_mid` (`kwargs.get`)

<a id="adapter-ilora-up"></a>
### `adapter.ilora_up`

Parses ilora\_up into AdapterConfig, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.ilora_up`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Documents the parsed ilora\_up compatibility field and its true default value.
- Drawbacks: Changing ilora\_up has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `ilora_up: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `ilora_up` (`kwargs.get`)

<a id="adapter-image-dir"></a>
### `adapter.image_dir`

Parses image\_dir into AdapterConfig, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.image_dir`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `directory-path-or-null` / `path`
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
- Benefits: Documents the parsed compatibility field for configurations that still contain it.
- Drawbacks: Changing it has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `image_dir: /workspace/adapter-images`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `image_dir` (`kwargs.get`)

<a id="adapter-image-encoder-arch"></a>
### `adapter.image_encoder_arch`

Selects the image-encoder architecture used by the adapter.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.image_encoder_arch`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `image-encoder-architecture` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"clip"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Selects the image-encoder implementation that interprets the configured checkpoint.
- Drawbacks: Architecture and checkpoint must agree or loading fails.
- Interactions: none
- Aliases: none
- Example: `image_encoder_arch: clip`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `image_encoder_arch` (`kwargs.get`)

<a id="adapter-image-encoder-path"></a>
### `adapter.image_encoder_path`

Overrides the image-encoder checkpoint path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.image_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `model-path-or-null` / `path`
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
- Benefits: Loads a chosen image-encoder checkpoint instead of relying on an implicit source.
- Drawbacks: A missing or incompatible checkpoint prevents encoder loading.
- Interactions: none
- Aliases: none
- Example: `image_encoder_path: /workspace/image-encoder`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `image_encoder_path` (`kwargs.get`)

<a id="adapter-in-channels"></a>
### `adapter.in_channels`

Sets adapter input channel count.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.in_channels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `3` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Matches the adapter input projection to the channel count of prepared control tensors.
- Drawbacks: It must match prepared control inputs or tensor shapes fail.
- Interactions: none
- Aliases: none
- Example: `in_channels: 3`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `in_channels` (`kwargs.get`)

<a id="adapter-invert-inpaint-mask-chance"></a>
### `adapter.invert_inpaint_mask_chance`

Sets the chance of inverting an inpainting mask during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.invert_inpaint_mask_chance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Adds stochastic mask inversion so an inpainting adapter sees both mask orientations.
- Drawbacks: High values change mask semantics frequently and can confuse preservation behavior.
- Interactions: none
- Aliases: none
- Example: `invert_inpaint_mask_chance: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `invert_inpaint_mask_chance` (`kwargs.get`)

<a id="adapter-lora-config"></a>
### `adapter.lora_config`

Provides nested network settings for control-LoRA adapters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.lora_config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `network-config-or-null` / `object`
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
- Normalization: A present object is parsed through NetworkConfig before use. (all supported configurations)
- Benefits: Builds the nested NetworkConfig that controls rank and related Control-LoRA behavior.
- Drawbacks: Invalid network settings fail nested NetworkConfig parsing or produce incompatible weights.
- Interactions: none
- Aliases: none
- Example: `lora_config: {linear: 8}`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `lora_config` (`kwargs.get`)

<a id="adapter-merge-scaler"></a>
### `adapter.merge_scaler`

Merges a trained channel scaler into adapter weights on save.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.merge_scaler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Folds the trained channel scaler into saved adapter weights for simpler deployment.
- Drawbacks: Merged output is harder to resume as a separately trainable scaler.
- Interactions: Requires `adapter.train_scaler`: This setting is relevant when scaler training is enabled. (all supported configurations)
- Aliases: none
- Example: `merge_scaler: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `merge_scaler` (`kwargs.get`)

<a id="adapter-name-or-path"></a>
### `adapter.name_or_path`

Selects an existing adapter name or local path to load.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.name_or_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `model-path-or-null` / `path`
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
- Benefits: Initializes the adapter from a named or filesystem checkpoint source.
- Drawbacks: Incompatible weights or a missing path prevent initialization.
- Interactions: none
- Aliases: none
- Example: `name_or_path: /workspace/adapter`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `name_or_path` (`kwargs.get`)

<a id="adapter-num-cloned-blocks"></a>
### `adapter.num_cloned_blocks`

Sets how many model blocks are cloned for LLM adapter training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.num_cloned_blocks`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets how many language-model blocks are cloned for LLM adapter capacity.
- Drawbacks: More cloned blocks sharply increase memory and parameter count.
- Interactions: none
- Aliases: none
- Example: `num_cloned_blocks: 2`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `num_cloned_blocks` (`kwargs.get`)

<a id="adapter-num-control-images"></a>
### `adapter.num_control_images`

Sets the number of control images expected per example.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.num_control_images`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Configures Control-LoRA to consume the intended number of simultaneous control images.
- Drawbacks: Dataset and model inputs must supply the same count.
- Interactions: none
- Aliases: none
- Example: `num_control_images: 2`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `num_control_images` (`kwargs.get`)

<a id="adapter-num-heads"></a>
### `adapter.num_heads`

Sets the number of iLoRA attention heads.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.num_heads`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets the number of attention heads used by the iLoRA adapter.
- Drawbacks: More heads change shapes and increase computation.
- Interactions: none
- Aliases: none
- Example: `num_heads: 4`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `num_heads` (`kwargs.get`)

<a id="adapter-num-res-blocks"></a>
### `adapter.num_res_blocks`

Sets residual blocks per T2I-adapter stage.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.num_res_blocks`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `2` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls residual-block depth and therefore representational capacity in the adapter.
- Drawbacks: More blocks add compute and capacity; checkpoint shapes must match.
- Interactions: none
- Aliases: none
- Example: `num_res_blocks: 2`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `num_res_blocks` (`kwargs.get`)

<a id="adapter-num-tokens"></a>
### `adapter.num_tokens`

Sets the number of adapter conditioning tokens.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.num_tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When omitted, type ip+ selects 16 tokens and type ip selects 4 tokens. (all supported configurations)
- Benefits: Determines how many learned image-conditioning tokens an IP adapter emits.
- Drawbacks: Token count changes memory and checkpoint shapes and must match the adapter type.
- Interactions: none
- Aliases: none
- Example: `num_tokens: 16`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `num_tokens` (`kwargs.get`)

<a id="adapter-pixtral-max-image-size"></a>
### `adapter.pixtral_max_image_size`

Caps image size for Pixtral adapter preprocessing.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.pixtral_max_image_size`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Caps Pixtral encoder input size to balance retained detail against memory use.
- Drawbacks: Large caps increase encoder memory; small caps discard detail.
- Interactions: none
- Aliases: none
- Example: `pixtral_max_image_size: 512`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `pixtral_max_image_size` (`kwargs.get`)

<a id="adapter-pixtral-random-image-size"></a>
### `adapter.pixtral_random_image_size`

Randomizes Pixtral image size during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.pixtral_random_image_size`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Introduces input-size variation when preparing images for the Pixtral encoder.
- Drawbacks: It adds scale variation but reduces exact batch-shape predictability.
- Interactions: none
- Aliases: none
- Example: `pixtral_random_image_size: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `pixtral_random_image_size` (`kwargs.get`)

<a id="adapter-quad-image"></a>
### `adapter.quad_image`

Enables four-image composition for applicable vision adapters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.quad_image`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Enables the adapter's quad-image input mode when that implementation supports it.
- Drawbacks: It changes expected inputs and increases image-encoding work.
- Interactions: none
- Aliases: none
- Example: `quad_image: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `quad_image` (`kwargs.get`)

<a id="adapter-quantize-llm"></a>
### `adapter.quantize_llm`

Quantizes the LLM used by applicable adapter workflows.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.quantize_llm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Reduces memory required by the language-model component through quantized loading.
- Drawbacks: Quantization saves memory but can reduce fidelity or add backend constraints.
- Interactions: none
- Aliases: none
- Example: `quantize_llm: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `quantize_llm` (`kwargs.get`)

<a id="adapter-safe-channels"></a>
### `adapter.safe_channels`

Sets SAFE adapter hidden channel width.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.safe_channels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `2048` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets the main feature width used by SAFE image-encoder adapter components.
- Drawbacks: Larger widths cost memory and must match saved weights.
- Interactions: none
- Aliases: none
- Example: `safe_channels: 2048`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `safe_channels` (`kwargs.get`)

<a id="adapter-safe-reducer-channels"></a>
### `adapter.safe_reducer_channels`

Sets SAFE reducer channel width.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.safe_reducer_channels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets the SAFE reducer width that compresses encoder features before conditioning.
- Drawbacks: An incompatible width causes shape mismatch and larger widths cost memory.
- Interactions: none
- Aliases: none
- Example: `safe_reducer_channels: 512`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `safe_reducer_channels` (`kwargs.get`)

<a id="adapter-safe-tokens"></a>
### `adapter.safe_tokens`

Sets the number of SAFE adapter tokens.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.safe_tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `8` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sets how many conditioning tokens the SAFE image encoder produces.
- Drawbacks: Token count changes conditioning shape and checkpoint compatibility.
- Interactions: none
- Aliases: none
- Example: `safe_tokens: 8`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `safe_tokens` (`kwargs.get`)

<a id="adapter-scaler-lr"></a>
### `adapter.scaler_lr`

Overrides learning rate for the trainable adapter scaler.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.scaler_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `positive-number-or-null` / `number`
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
- Benefits: Tunes the channel scaler with a learning rate independent of other adapter parameters.
- Drawbacks: An excessive scaler rate can destabilize its channel weights.
- Interactions: Requires `adapter.train_scaler`: This setting is relevant when scaler training is enabled. (all supported configurations)
- Aliases: none
- Example: `scaler_lr: 0.0001`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `scaler_lr` (`kwargs.get`)

<a id="adapter-sparse-autoencoder-dim"></a>
### `adapter.sparse_autoencoder_dim`

Sets sparse-autoencoder feature dimension for applicable adapters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.sparse_autoencoder_dim`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Chooses the latent width of the optional sparse autoencoder pooling path.
- Drawbacks: Large dimensions increase memory; incompatible dimensions fail shape construction.
- Interactions: none
- Aliases: none
- Example: `sparse_autoencoder_dim: 4096`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `sparse_autoencoder_dim` (`kwargs.get`)

<a id="adapter-subpixel-downscale-factor"></a>
### `adapter.subpixel_downscale_factor`

Sets the subpixel adapter downscale factor.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.subpixel_downscale_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `8` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Matches subpixel spatial packing to the scale expected by that adapter architecture.
- Drawbacks: It must match the intended spatial packing or shapes and quality suffer.
- Interactions: none
- Aliases: none
- Example: `subpixel_downscale_factor: 8`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `subpixel_downscale_factor` (`kwargs.get`)

<a id="adapter-test-img-path"></a>
### `adapter.test_img_path`

Provides one or more fixed test image paths for adapter evaluation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.test_img_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-or-string-list` / `path-or-path-list-or-null` / `string-list`
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
- Normalization: A comma-separated string is split, trimmed, and emptied pieces are discarded. (all supported configurations)
- Benefits: Provides fixed test images for repeatable adapter evaluation during development.
- Drawbacks: Missing files prevent fixed-image evaluation.
- Interactions: none
- Aliases: none
- Example: `test_img_path: ["/workspace/test.png"]`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `test_img_path` (`kwargs.get`)

<a id="adapter-text-encoder-arch"></a>
### `adapter.text_encoder_arch`

Selects the adapter text-encoder architecture.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.text_encoder_arch`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `text-encoder-architecture` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"clip"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Selects the text-encoder architecture used by adapters with textual conditioning.
- Drawbacks: It must match the configured checkpoint and adapter implementation.
- Interactions: none
- Aliases: none
- Example: `text_encoder_arch: clip`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `text_encoder_arch` (`kwargs.get`)

<a id="adapter-text-encoder-path"></a>
### `adapter.text_encoder_path`

Overrides the adapter text-encoder checkpoint path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `model-path-or-null` / `path`
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
- Benefits: Loads a specific text-encoder checkpoint for the adapter conditioning path.
- Drawbacks: A missing or incompatible checkpoint prevents loading.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/text-encoder`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `text_encoder_path` (`kwargs.get`)

<a id="adapter-train"></a>
### `adapter.train`

Enables training of the configured adapter.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.train`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Includes adapter parameters in training instead of using the adapter only for conditioning.
- Drawbacks: Leaving it false keeps the adapter out of the trainable adapter path.
- Interactions: none
- Aliases: none
- Example: `train: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `train` (`kwargs.get`)

<a id="adapter-train-image-encoder"></a>
### `adapter.train_image_encoder`

Enables image-encoder parameter training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.train_image_encoder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the image encoder to adapt its representations to the training dataset.
- Drawbacks: It raises memory use and can overfit a small image set.
- Interactions: none
- Aliases: none
- Example: `train_image_encoder: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `train_image_encoder` (`kwargs.get`)

<a id="adapter-train-only-image-encoder"></a>
### `adapter.train_only_image_encoder`

Restricts adapter training to the image encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.train_only_image_encoder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: True also forces train\_image\_encoder true. (all supported configurations)
- Benefits: Focuses optimization on the image encoder while leaving other adapter parameters fixed.
- Drawbacks: It prevents other adapter parameters from learning.
- Interactions: Affects `adapter.train_image_encoder`: This narrows or forces image-encoder training. (all supported configurations)
- Aliases: none
- Example: `train_only_image_encoder: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `train_only_image_encoder` (`kwargs.get`)

<a id="adapter-train-only-image-encoder-positional-embedding"></a>
### `adapter.train_only_image_encoder_positional_embedding`

Restricts image-encoder training to positional embeddings.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.train_only_image_encoder_positional_embedding`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Limits image-encoder updates to positional embeddings for a narrowly scoped adaptation.
- Drawbacks: It offers very limited capacity and is only useful for targeted adaptation.
- Interactions: Affects `adapter.train_image_encoder`: This narrows or forces image-encoder training. (all supported configurations)
- Aliases: none
- Example: `train_only_image_encoder_positional_embedding: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `train_only_image_encoder_positional_embedding` (`kwargs.get`)

<a id="adapter-train-scaler"></a>
### `adapter.train_scaler`

Enables training of the adapter channel scaler.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.train_scaler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Adds a trainable channel scaler that can correct systematic conditioning bias.
- Drawbacks: It adds a separate trainable component that needs an appropriate learning rate.
- Interactions: none
- Aliases: none
- Example: `train_scaler: true`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `train_scaler` (`kwargs.get`)

<a id="adapter-trigger"></a>
### `adapter.trigger`

Sets the token that activates applicable adapter conditioning.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.trigger`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `nonblank-trigger` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"tri993r"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Defines the trigger token used to associate prompts with adapter conditioning.
- Drawbacks: A common or inconsistent trigger can entangle adapter behavior.
- Interactions: none
- Aliases: none
- Example: `trigger: tri993r`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `trigger` (`kwargs.get`)

<a id="adapter-trigger-class-name"></a>
### `adapter.trigger_class_name`

Sets the class name associated with the adapter trigger for masked-prior workflows.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.trigger_class_name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
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
- Benefits: Names the semantic class used when constructing preservation-aware adapter prompts.
- Drawbacks: An incorrect class name gives the preservation target the wrong semantics.
- Interactions: none
- Aliases: none
- Example: `trigger_class_name: person`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `trigger_class_name` (`kwargs.get`)

<a id="adapter-type"></a>
### `adapter.type`

Selects the top-level adapter family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter.type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `adapter-type` / `string`
- Accepted types/values: not separately constrained; `"t2i"`, `"ip"`, `"ip+"`, `"clip"`, `"ilora"`, `"photo_maker"`, `"control_net"`, `"control_lora"`, `"i2v"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"t2i"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Dispatches construction to the intended adapter family, such as IP or Control-LoRA.
- Drawbacks: Each family requires different inputs, weights, and compatible model support.
- Interactions: none
- Aliases: none
- Example: `type: control_lora`
- Source symbols: `toolkit/config_modules.py` :: `AdapterConfig.__init__` :: `type` (`kwargs.get`)

<a id="environment-aitk-job-id"></a>
### `environment.aitk_job_id`

Carries the server-assigned job identifier into a diffusion trainer process.

- UI label: not exposed in the Simple UI
- Locations: Environment `AITK_JOB_ID`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `transient` / `server-overwritten`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `nonblank-job-id` / `string`
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
- Normalization: A present environment value is stripped of surrounding whitespace before use. (all supported configurations)
- Benefits: Links process status and logs to the matching UI job record.
- Drawbacks: Without a matching server job and database the process runs without UI-trainer status integration.
- Interactions: Requires `process.sqlite_db_path`: UI job status integration is active only when the configured database path exists as well. (all supported configurations)
- Aliases: none
- Example: `AITK_JOB_ID=job_123`
- Source symbols: `extensions_built_in/sd_trainer/DiffusionTrainer.py` :: `DiffusionTrainer.__init__` :: `AITK_JOB_ID` (`os.environ.get`); `extensions_built_in/sd_trainer/UITrainer.py` :: `UITrainer.__init__` :: `AITK_JOB_ID` (`os.environ.get`)

<a id="logging-log-every"></a>
### `logging.log_every`

Sets the optimizer-step interval between metric log updates.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.log_every`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `100` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Balances metric visibility against logging overhead.
- Drawbacks: Very frequent updates add output and external-logger traffic.
- Interactions: none
- Aliases: none
- Example: `log_every: 100`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `log_every` (`kwargs.get`)

<a id="logging-project-name"></a>
### `logging.project_name`

Names the external experiment project used by configured loggers.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.project_name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"ai-toolkit"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Groups related training runs in experiment tracking.
- Drawbacks: Changing it can fragment runs across multiple projects.
- Interactions: none
- Aliases: none
- Example: `project_name: ai-toolkit`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `project_name` (`kwargs.get`)

<a id="logging-run-name"></a>
### `logging.run_name`

Overrides the run name sent to experiment logging.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.run_name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
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
- Benefits: Makes runs easier to identify and compare.
- Drawbacks: Duplicate or vague names make experiment history harder to interpret.
- Interactions: none
- Aliases: none
- Example: `run_name: character-v2`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `run_name` (`kwargs.get`)

<a id="logging-use-ui-logger"></a>
### `logging.use_ui_logger`

Enables metric delivery through the toolkit UI logger.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.use_ui_logger`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Shows training metrics in the local job interface.
- Drawbacks: It depends on the UI job integration and adds logging work.
- Interactions: none
- Aliases: none
- Example: `use_ui_logger: true`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `use_ui_logger` (`kwargs.get`)

<a id="logging-use-wandb"></a>
### `logging.use_wandb`

Enables Weights &amp; Biases experiment logging.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.use_wandb`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides remote metric history and run comparison.
- Drawbacks: Requires the dependency, credentials, and network access.
- Interactions: none
- Aliases: none
- Example: `use_wandb: true`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `use_wandb` (`kwargs.get`)

<a id="logging-verbose"></a>
### `logging.verbose`

Enables verbose logger output.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging.verbose`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `logging` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides more diagnostic context while troubleshooting.
- Drawbacks: Produces substantially noisier logs.
- Interactions: none
- Aliases: none
- Example: `verbose: true`
- Source symbols: `toolkit/config_modules.py` :: `LoggingConfig.__init__` :: `verbose` (`kwargs.get`)

<a id="process-guidance-guidance-scale"></a>
### `process.guidance.guidance_scale`

Sets the scale stored for the optional process guidance configuration.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].guidance.guidance_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves the guidance scale field for compatibility with guidance-aware extensions.
- Drawbacks: The current core trainer parses but does not consume this guidance object, so changing it has no runtime effect.
- Interactions: none
- Aliases: none
- Example: `guidance_scale: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `GuidanceConfig.__init__` :: `guidance_scale` (`kwargs.get`)

<a id="process-guidance-negative-prompt"></a>
### `process.guidance.negative_prompt`

Stores the negative prompt for optional training guidance.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].guidance.negative_prompt`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `""` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves the negative prompt field for compatibility with guidance-aware extensions.
- Drawbacks: The current core trainer parses but does not consume this guidance object.
- Interactions: none
- Aliases: none
- Example: `negative_prompt: low quality`
- Source symbols: `toolkit/config_modules.py` :: `GuidanceConfig.__init__` :: `negative_prompt` (`kwargs.get`)

<a id="process-guidance-positive-prompt"></a>
### `process.guidance.positive_prompt`

Stores the positive prompt for optional training guidance.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].guidance.positive_prompt`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `""` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves the positive prompt field for compatibility with guidance-aware extensions.
- Drawbacks: The current core trainer parses but does not consume this guidance object.
- Interactions: none
- Aliases: none
- Example: `positive_prompt: a portrait`
- Source symbols: `toolkit/config_modules.py` :: `GuidanceConfig.__init__` :: `positive_prompt` (`kwargs.get`)

<a id="process-guidance-target-class"></a>
### `process.guidance.target_class`

Stores the target class for optional training guidance.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].guidance.target_class`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `""` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves the target class field for compatibility with guidance-aware extensions.
- Drawbacks: The current core trainer parses but does not consume this guidance object.
- Interactions: none
- Aliases: none
- Example: `target_class: person`
- Source symbols: `toolkit/config_modules.py` :: `GuidanceConfig.__init__` :: `target_class` (`kwargs.get`)

<a id="process-sqlite-db-path"></a>
### `process.sqlite_db_path`

Points the diffusion trainer at the SQLite database used for UI job status.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sqlite_db_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `sqlite-database-path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"./aitk_db.db"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows a launched process to report progress and stop state to the local UI database.
- Drawbacks: A missing path disables UI-trainer integration; an incorrect existing database can target the wrong state store.
- Interactions: Requires `environment.aitk_job_id`: UI job status integration also requires a present server job identifier. (all supported configurations)
- Aliases: none
- Example: `sqlite_db_path: ./aitk_db.db`
- Source symbols: `extensions_built_in/sd_trainer/DiffusionTrainer.py` :: `DiffusionTrainer.__init__` :: `sqlite_db_path` (`attribute.get`); `extensions_built_in/sd_trainer/UITrainer.py` :: `UITrainer.__init__` :: `sqlite_db_path` (`attribute.get`)


## Environment

<a id="environment-ai-toolkit-offload-depth"></a>
### `environment.ai_toolkit_offload_depth`

Sets the per-layer memory-management pipeline depth.

- UI label: not exposed in the Simple UI
- Locations: Environment `AI_TOOLKIT_OFFLOAD_DEPTH`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `experimental`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `integer-string` / `positive-integer-string` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"4"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The environment string is parsed immediately with int; omission uses the string 4. (all supported configurations)
- Benefits: Allows advanced tuning of the balance between transfer overlap and memory pressure.
- Drawbacks: Invalid strings fail module import, while unsuitable depths can stall transfers or increase memory use.
- Interactions: none
- Aliases: none
- Example: `AI_TOOLKIT_OFFLOAD_DEPTH=4 python run.py config/character.yaml`
- Source symbols: `toolkit/memory_management/manager_modules.py` :: `<module>` :: `AI_TOOLKIT_OFFLOAD_DEPTH` (`os.environ.get`)

<a id="environment-debug-toolkit"></a>
### `environment.debug_toolkit`

Enables Torch autograd anomaly detection for toolkit debugging.

- UI label: not exposed in the Simple UI
- Locations: Environment `DEBUG_TOOLKIT`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `zero-or-one-string` / `string`
- Accepted types/values: not separately constrained; `"0"`, `"1"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"0"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Only the exact string 1 enables anomaly detection; omission uses 0. (all supported configurations)
- Benefits: Provides stack information for invalid gradients during diagnosis.
- Drawbacks: Anomaly detection substantially slows training and should not remain enabled for normal runs.
- Interactions: none
- Aliases: none
- Example: `DEBUG_TOOLKIT=1 python run.py config/diagnostic.yaml`
- Source symbols: `run.py` :: `<module>` :: `DEBUG_TOOLKIT` (`os.environ.get`)

<a id="environment-hf-hub-disable-xet"></a>
### `environment.hf_hub_disable_xet`

Controls whether Hugging Face Hub Xet transport is disabled.

- UI label: not exposed in the Simple UI
- Locations: Environment `HF_HUB_DISABLE_XET`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `zero-or-one-string` / `string`
- Accepted types/values: not separately constrained; `"0"`, `"1"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"0"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: run.py preserves a supplied string and otherwise writes the default string 0 back to the process environment. (all supported configurations)
- Benefits: Allows operators to disable Xet when it is incompatible with their network or storage environment.
- Drawbacks: Disabling Xet can reduce transfer performance for repositories that support it.
- Interactions: none
- Aliases: none
- Example: `HF_HUB_DISABLE_XET=1 python run.py config/character.yaml`
- Source symbols: `run.py` :: `<module>` :: `HF_HUB_DISABLE_XET` (`os.getenv`)

<a id="environment-hf-token"></a>
### `environment.hf_token`

Supplies Hugging Face authentication to first-party model download clients.

- UI label: not exposed in the Simple UI
- Locations: Environment `HF_TOKEN`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `hugging-face-access-token-or-absent` / `string`
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
- Benefits: Allows access to gated model repositories the account is authorized to use.
- Drawbacks: Tokens are secrets and must not be committed to configurations, logs, or datasets.
- Interactions: none
- Aliases: none
- Example: `HF_TOKEN=hf_example_redacted`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/flux2/flux2_model.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/ideogram4/ideogram4.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/krea2/krea2.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/ltx2/ltx2.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`); `extensions_built_in/diffusion_models/z_image/z_image_l2p_model.py` :: `<module>` :: `HF_TOKEN` (`os.getenv`)

<a id="environment-hf-xet-high-performance"></a>
### `environment.hf_xet_high_performance`

Controls Hugging Face Xet high-performance transfer mode.

- UI label: not exposed in the Simple UI
- Locations: Environment `HF_XET_HIGH_PERFORMANCE`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `string` / `zero-or-one-string` / `string`
- Accepted types/values: not separately constrained; `"0"`, `"1"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"1"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: run.py preserves a supplied string and otherwise writes the default string 1 back to the process environment. (all supported configurations)
- Benefits: Can improve model download throughput when Xet transport is available.
- Drawbacks: High-performance transfer can consume more network, CPU, or storage resources.
- Interactions: none
- Aliases: none
- Example: `HF_XET_HIGH_PERFORMANCE=0 python run.py config/character.yaml`
- Source symbols: `run.py` :: `<module>` :: `HF_XET_HIGH_PERFORMANCE` (`os.getenv`)

<a id="environment-models-path"></a>
### `environment.models_path`

Overrides the toolkit-wide local models directory.

- UI label: not exposed in the Simple UI
- Locations: Environment `MODELS_PATH`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `path` / `directory-path-or-absent` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"toolkit_root/models"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Only a present nonblank value overrides the default &lt;toolkit-root&gt;/models directory; blank strings use the default. (all supported configurations)
- Benefits: Places shared model assets on a larger or centrally managed volume.
- Drawbacks: A wrong directory can make local model assets appear missing.
- Interactions: none
- Aliases: none
- Example: `MODELS_PATH=/workspace/models python run.py config/character.yaml`
- Source symbols: `toolkit/paths.py` :: `<module>` :: `MODELS_PATH` (`os.environ[]`)

<a id="environment-seed"></a>
### `environment.seed`

Seeds Python, NumPy, Torch, and all CUDA generators before jobs run.

- UI label: not exposed in the Simple UI
- Locations: Environment `SEED`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `integer-string` / `integer-string-or-absent` / `integer`
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
- Normalization: The environment string is parsed with int; invalid strings print an error and leave startup seeding disabled. (all supported configurations)
- Benefits: Improves reproducibility of command-line runs that use the same software and hardware path.
- Drawbacks: A seed does not guarantee bit-identical results across devices or nondeterministic kernels; an invalid value is reported and ignored.
- Interactions: none
- Aliases: none
- Example: `SEED=42 python run.py config/character.yaml`
- Source symbols: `run.py` :: `<module>` :: `SEED` (`os.environ[]`)

<a id="environment-use-bf16-rope"></a>
### `environment.use_bf16_rope`

Uses bfloat16 for HiDream O1 rotary-position embedding calculations.

- UI label: not exposed in the Simple UI
- Locations: Environment `USE_BF16_ROPE`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `experimental`
- Persistence/authority: `runtime` / `user`
- Applies to: ui_architecture=`hidream_o1`
- Parser/supported/example types: `string` / `zero-or-one-string` / `string`
- Accepted types/values: not separately constrained; `"0"`, `"1"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"0"` (ui_architecture=`hidream_o1`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `"0"` for ui_architecture=`hidream_o1`
- Normalization: Only the exact string 1 selects bfloat16 rotary-position computations; omission uses 0. (ui_architecture=`hidream_o1`)
- Benefits: Can reduce memory and align RoPE computation with bfloat16 execution.
- Drawbacks: Reduced precision can change numerical behavior and is an advanced compatibility option.
- Interactions: none
- Aliases: none
- Example: `USE_BF16_ROPE=1`
- Source symbols: `extensions_built_in/diffusion_models/hidream/src/hidream_o1/qwen3_vl_transformers.py` :: `<module>` :: `USE_BF16_ROPE` (`os.environ.get`)


## Job And Model

<a id="cli-file-server-port"></a>
### `cli.file-server-port`

Public port accepted by the UI file-server launcher.

- UI label: not exposed in the Simple UI
- Locations: Cli `--port`; Ui State `ui.file_server.port`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `cli` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `integer`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `--port 8675`
- Source symbols: none

<a id="environment-ai-toolkit-auth"></a>
### `environment.ai_toolkit_auth`

Server-side authentication secret.

- UI label: not exposed in the Simple UI
- Locations: Environment `AI_TOOLKIT_AUTH`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `AI_TOOLKIT_AUTH=value`
- Source symbols: none

<a id="environment-ai-toolkit-db-journal-mode"></a>
### `environment.ai_toolkit_db_journal_mode`

SQLite journal-mode override.

- UI label: not exposed in the Simple UI
- Locations: Environment `AI_TOOLKIT_DB_JOURNAL_MODE`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: `"DELETE"`, `"TRUNCATE"`, `"PERSIST"`, `"MEMORY"`, `"WAL"`, `"OFF"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `AI_TOOLKIT_DB_JOURNAL_MODE=value`
- Source symbols: none

<a id="environment-ai-toolkit-file-server-workers"></a>
### `environment.ai_toolkit_file_server_workers`

Positive file-server worker count.

- UI label: not exposed in the Simple UI
- Locations: Environment `AI_TOOLKIT_FILE_SERVER_WORKERS`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `integer`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `AI_TOOLKIT_FILE_SERVER_WORKERS=value`
- Source symbols: none

<a id="environment-ostris-cloud-api-key"></a>
### `environment.ostris_cloud_api_key`

Optional Ostris Cloud API key.

- UI label: not exposed in the Simple UI
- Locations: Environment `OSTRIS_CLOUD_API_KEY`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `OSTRIS_CLOUD_API_KEY=value`
- Source symbols: none

<a id="environment-ostris-cloud-app-url"></a>
### `environment.ostris_cloud_app_url`

Optional Ostris Cloud application URL.

- UI label: not exposed in the Simple UI
- Locations: Environment `OSTRIS_CLOUD_APP_URL`
- Surfaces: `cli`
- UI projection: none
- Scope/lifecycle: `environment` / `supported`
- Persistence/authority: `runtime` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `OSTRIS_CLOUD_APP_URL=value`
- Source symbols: none

<a id="settings-data-root"></a>
### `settings.data-root`

Database-backed root for UI metadata and snapshots.

- UI label: not exposed in the Simple UI
- Locations: Ui State `settings.DATA_ROOT`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `path`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `settings.DATA_ROOT: value`
- Source symbols: none

<a id="settings-datasets-folder"></a>
### `settings.datasets-folder`

Database-backed root for live datasets.

- UI label: Dataset Folder Path
- Locations: Ui State `settings.DATASETS_FOLDER`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `path`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `settings.DATASETS_FOLDER: value`
- Source symbols: none

<a id="settings-hf-token"></a>
### `settings.hf-token`

Database-backed token forwarded to training jobs.

- UI label: Hugging Face Token
- Locations: Ui State `settings.HF_TOKEN`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
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
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `settings.HF_TOKEN: value`
- Source symbols: none

<a id="settings-models-path"></a>
### `settings.models-path`

Database fallback for the shared models root.

- UI label: Models Folder Path
- Locations: Ui State `settings.MODELS_PATH`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `path`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `settings.MODELS_PATH: value`
- Source symbols: none

<a id="settings-training-folder"></a>
### `settings.training-folder`

Database-backed root for training outputs.

- UI label: Training Folder Path
- Locations: Ui State `settings.TRAINING_FOLDER`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `database` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `path`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `settings.TRAINING_FOLDER: value`
- Source symbols: none

<a id="ui-auth-token"></a>
### `ui.auth-token`

Browser-stored authentication token transported as a Bearer header.

- UI label: Password
- Locations: Ui State `browser.localStorage.AI_TOOLKIT_AUTH`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: Affects `environment.ai_toolkit_auth`: Authenticates against the separately configured server secret. (all supported configurations)
- Aliases: none
- Example: `browser.localStorage.AI_TOOLKIT_AUTH: secret`
- Source symbols: none

<a id="ui-theme-preference"></a>
### `ui.theme-preference`

User-selected light or dark browser theme.

- UI label: Theme
- Locations: Ui State `browser.localStorage.theme`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `exact-global-state` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"dark"`, `"light"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"dark"` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Records the exact current global or server setting boundary.
- Drawbacks: Changing this value can affect every UI session or queued job.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.theme: dark`
- Source symbols: none


## Model

<a id="model-boogu-image-model-kwargs-attention-backend"></a>
### `model.boogu_image.model_kwargs.attention_backend`

Selects the attention implementation used while loading and running the model.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.attention_backend`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"native"` (ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `"native"` for ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `attention_backend: native`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image.py` :: `BooguImageModel.load_model` :: `attention_backend` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-control-image-max-pixels"></a>
### `model.boogu_image.model_kwargs.control_image_max_pixels`

Caps the pixel budget used when encoding control images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.control_image_max_pixels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"1024 * 1024"}` (ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"1024 * 1024"}` for ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `control_image_max_pixels: 512`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image_edit.py` :: `BooguImageEditModel._ref_target_pixels` :: `control_image_max_pixels` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-match-target-res"></a>
### `model.boogu_image.model_kwargs.match_target_res`

Sizes reference or control conditioning from the current target resolution.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.match_target_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: On Select present as `false` (ui_architecture=`boogu_image_edit`); On Leave absent (ui_architecture=`boogu_image_edit`)
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`boogu_image_edit`; On Select present as `false` for ui_architecture=`boogu_image_edit`; On Leave absent for ui_architecture=`boogu_image_edit`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`boogu_image_edit`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `match_target_res: false`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image_edit.py` :: `BooguImageEditModel._encode_ref_latents` :: `match_target_res` (`model_kwargs.get`); `extensions_built_in/diffusion_models/boogu_image/boogu_image_edit.py` :: `BooguImageEditModel._ref_target_pixels` :: `match_target_res` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-max-text-length"></a>
### `model.boogu_image.model_kwargs.max_text_length`

Sets the maximum text token length used by this model family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.max_text_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1024` (ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `1024` for ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `max_text_length: 1024`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image.py` :: `BooguImageModel.__init__` :: `max_text_length` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-text-encoder-path"></a>
### `model.boogu_image.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"base"}` (ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"base"}` for ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image.py` :: `BooguImageModel.load_model` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-text-encoder-subfolder"></a>
### `model.boogu_image.model_kwargs.text_encoder_subfolder`

Selects the text-encoder subfolder inside the configured source.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_subfolder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"mllm"` (ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `"mllm"` for ui_architecture=`boogu_image`; ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `text_encoder_subfolder: mllm`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image.py` :: `BooguImageModel.load_model` :: `text_encoder_subfolder` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-vlm-max-pixels"></a>
### `model.boogu_image.model_kwargs.vlm_max_pixels`

Caps the pixel budget supplied to the vision-language encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vlm_max_pixels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"384 * 384"}` (ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"384 * 384"}` for ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `vlm_max_pixels: 512`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image_edit.py` :: `BooguImageEditModel.get_prompt_embeds` :: `vlm_max_pixels` (`model_kwargs.get`)

<a id="model-boogu-image-model-kwargs-vlm-max-side-length"></a>
### `model.boogu_image.model_kwargs.vlm_max_side_length`

Caps the longest side supplied to the vision-language encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vlm_max_side_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`boogu_image_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `768` (ui_architecture=`boogu_image_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `768` for ui_architecture=`boogu_image_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `vlm_max_side_length: 768`
- Source symbols: `extensions_built_in/diffusion_models/boogu_image/boogu_image_edit.py` :: `BooguImageEditModel.get_prompt_embeds` :: `vlm_max_side_length` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-control-dropout"></a>
### `model.flex2.model_kwargs.control_dropout`

Sets the chance of dropping a supplied Flex 2 control image during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.control_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `0.5` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `0` for engine_architecture=`flex2`; On Select present as `0.5` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: none
- Benefits: Teaches the model to remain useful when control is absent.
- Drawbacks: Too much dropout weakens control adherence.
- Interactions: none
- Aliases: none
- Example: `control_dropout: 0.1`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `control_dropout` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-do-random-inpainting"></a>
### `model.flex2.model_kwargs.do_random_inpainting`

Generates a random inpainting condition when a Flex 2 row has no inpaint tensor.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.do_random_inpainting`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `false` for engine_architecture=`flex2`; On Select present as `true` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: Explicit null is preserved by model\_kwargs.get and acts falsey at boolean consumers. (engine_architecture=`flex2`)
- Benefits: Adds inpainting examples without requiring every row to include a mask.
- Drawbacks: Synthetic masks can shift training away from the curated data distribution.
- Interactions: none
- Aliases: none
- Example: `do_random_inpainting: false`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `do_random_inpainting` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-inpaint-dropout"></a>
### `model.flex2.model_kwargs.inpaint_dropout`

Sets the chance of dropping a Flex 2 inpainting condition.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.inpaint_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `0.5` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `0` for engine_architecture=`flex2`; On Select present as `0.5` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: none
- Benefits: Improves robustness to missing inpainting control.
- Drawbacks: Too much dropout reduces inpainting specialization.
- Interactions: none
- Aliases: none
- Example: `inpaint_dropout: 0.1`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `inpaint_dropout` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-inpaint-random-chance"></a>
### `model.flex2.model_kwargs.inpaint_random_chance`

Sets the chance of replacing a supplied Flex 2 inpainting mask with a random mask.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.inpaint_random_chance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `0.2` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `0` for engine_architecture=`flex2`; On Select present as `0.2` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: none
- Benefits: Varies mask geometry during inpainting training.
- Drawbacks: Random replacement can discard valuable curated mask structure.
- Interactions: none
- Aliases: none
- Example: `inpaint_random_chance: 0.1`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `inpaint_random_chance` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-invert-inpaint-mask-chance"></a>
### `model.flex2.model_kwargs.invert_inpaint_mask_chance`

Sets the chance of inverting a Flex 2 inpainting mask.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.invert_inpaint_mask_chance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `0.2` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `0` for engine_architecture=`flex2`; On Select present as `0.2` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: none
- Benefits: Balances learning across masked and complementary regions.
- Drawbacks: Frequent inversion can contradict the intended mask semantics.
- Interactions: none
- Aliases: none
- Example: `invert_inpaint_mask_chance: 0.1`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `invert_inpaint_mask_chance` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-random-blur-mask"></a>
### `model.flex2.model_kwargs.random_blur_mask`

Randomly blurs Flex 2 inpainting mask boundaries.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.random_blur_mask`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `false` for engine_architecture=`flex2`; On Select present as `true` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: Explicit null is preserved by model\_kwargs.get and acts falsey at boolean consumers. (engine_architecture=`flex2`)
- Benefits: Can reduce sensitivity to perfectly sharp mask edges.
- Drawbacks: Blurred boundaries can train unwanted transition regions.
- Interactions: none
- Aliases: none
- Example: `random_blur_mask: false`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `random_blur_mask` (`model_kwargs.get`)

<a id="model-flex2-model-kwargs-random-dialate-mask"></a>
### `model.flex2.model_kwargs.random_dialate_mask`

Randomly dilates Flex 2 inpainting masks; the live key intentionally retains the dialate spelling.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.random_dialate_mask`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: engine_architecture=`flex2`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (engine_architecture=`flex2`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`flex2`, engine_architecture=`flex2`); On Leave absent (ui_architecture=`flex2`, engine_architecture=`flex2`)
- Architecture overrides: Engine Fallback present as `false` for engine_architecture=`flex2`; On Select present as `true` for ui_architecture=`flex2`, engine_architecture=`flex2`; On Leave absent for ui_architecture=`flex2`, engine_architecture=`flex2`
- Normalization: Explicit null is preserved by model\_kwargs.get and acts falsey at boolean consumers. (engine_architecture=`flex2`)
- Benefits: Varies mask coverage around the target region.
- Drawbacks: Expansion can include pixels that were meant to stay preserved.
- Interactions: none
- Aliases: none
- Example: `random_dialate_mask: false`
- Source symbols: `extensions_built_in/flex2/flex2.py` :: `Flex2.__init__` :: `random_dialate_mask` (`model_kwargs.get`)

<a id="model-flux2-model-kwargs-match-target-res"></a>
### `model.flux2.model_kwargs.match_target_res`

Sizes reference or control conditioning from the current target resolution.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.match_target_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`flux2`; ui_architecture=`flux2_klein_4b`; ui_architecture=`flux2_klein_9b`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`flux2`)
- Other runtime/default transitions: On Select present as `false` (ui_architecture=`flux2`); On Leave absent (ui_architecture=`flux2`); On Select present as `false` (ui_architecture=`flux2_klein_4b`); On Leave absent (ui_architecture=`flux2_klein_4b`); On Select present as `false` (ui_architecture=`flux2_klein_9b`); On Leave absent (ui_architecture=`flux2_klein_9b`)
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`flux2`; On Select present as `false` for ui_architecture=`flux2`; On Leave absent for ui_architecture=`flux2`; On Select present as `false` for ui_architecture=`flux2_klein_4b`; On Leave absent for ui_architecture=`flux2_klein_4b`; On Select present as `false` for ui_architecture=`flux2_klein_9b`; On Leave absent for ui_architecture=`flux2_klein_9b`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`flux2`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `match_target_res: false`
- Source symbols: `extensions_built_in/diffusion_models/flux2/flux2_model.py` :: `Flux2Model.get_noise_prediction` :: `match_target_res` (`model_kwargs.get`)

<a id="model-hidream-model-kwargs-llama-model-path"></a>
### `model.hidream.model_kwargs.llama_model_path`

Overrides the Llama text-model source used by HiDream.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.llama_model_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`hidream`; ui_architecture=`hidream_e1`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"LLAMA_MODEL_PATH"}` (ui_architecture=`hidream`; ui_architecture=`hidream_e1`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"LLAMA_MODEL_PATH"}` for ui_architecture=`hidream`; ui_architecture=`hidream_e1`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `llama_model_path: /workspace/components/llama_model`
- Source symbols: `extensions_built_in/diffusion_models/hidream/hidream_model.py` :: `HidreamModel.load_model` :: `llama_model_path` (`model_kwargs.get`)

<a id="model-hidream-o1-model-kwargs-is-comfy-weight"></a>
### `model.hidream_o1.model_kwargs.is_comfy_weight`

Interprets HiDream O1 transformer weights using the Comfy-format layout.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.is_comfy_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`hidream_o1`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`hidream_o1`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`hidream_o1`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`hidream_o1`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `is_comfy_weight: false`
- Source symbols: `extensions_built_in/diffusion_models/hidream/hidream_o1_model.py` :: `HidreamO1Model.__init__` :: `is_comfy_weight` (`model_kwargs.get`)

<a id="model-hidream-o1-model-kwargs-noise-scale"></a>
### `model.hidream_o1.model_kwargs.noise_scale`

Sets the HiDream O1 training noise scale.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.noise_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`hidream_o1`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"DEFAULT_NOISE_SCALE"}` (ui_architecture=`hidream_o1`)
- Other runtime/default transitions: On Select present as `8` (ui_architecture=`hidream_o1`); On Leave absent (ui_architecture=`hidream_o1`)
- Architecture overrides: Engine Fallback present as `{"expression":"DEFAULT_NOISE_SCALE"}` for ui_architecture=`hidream_o1`; On Select present as `8` for ui_architecture=`hidream_o1`; On Leave absent for ui_architecture=`hidream_o1`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `noise_scale: 1`
- Source symbols: `extensions_built_in/diffusion_models/hidream/hidream_o1_model.py` :: `HidreamO1Model.__init__` :: `noise_scale` (`model_kwargs.get`)

<a id="model-hidream-o1-model-kwargs-noise-scale-inference"></a>
### `model.hidream_o1.model_kwargs.noise_scale_inference`

Overrides the HiDream O1 noise scale used for inference samples.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.noise_scale_inference`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`hidream_o1`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"self.noise_scale"}` (ui_architecture=`hidream_o1`)
- Other runtime/default transitions: On Select present as `8` (ui_architecture=`hidream_o1`); On Leave absent (ui_architecture=`hidream_o1`)
- Architecture overrides: Engine Fallback present as `{"expression":"self.noise_scale"}` for ui_architecture=`hidream_o1`; On Select present as `8` for ui_architecture=`hidream_o1`; On Leave absent for ui_architecture=`hidream_o1`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `noise_scale_inference: 1`
- Source symbols: `extensions_built_in/diffusion_models/hidream/hidream_o1_model.py` :: `HidreamO1Model.__init__` :: `noise_scale_inference` (`model_kwargs.get`)

<a id="model-ideogram4-model-kwargs-ideogram-schedule-mu"></a>
### `model.ideogram4.model_kwargs.ideogram_schedule_mu`

Sets the mean of the Ideogram schedule transformation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.ideogram_schedule_mu`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ideogram4`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (ui_architecture=`ideogram4`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `0` for ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `ideogram_schedule_mu: 0`
- Source symbols: `extensions_built_in/diffusion_models/ideogram4/src/pipeline.py` :: `Ideogram4Pipeline.__call__` :: `ideogram_schedule_mu` (`model_kwargs.get`)

<a id="model-ideogram4-model-kwargs-ideogram-schedule-std"></a>
### `model.ideogram4.model_kwargs.ideogram_schedule_std`

Sets the standard deviation of the Ideogram schedule transformation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.ideogram_schedule_std`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ideogram4`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1.75` (ui_architecture=`ideogram4`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `1.75` for ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `ideogram_schedule_std: 1.75`
- Source symbols: `extensions_built_in/diffusion_models/ideogram4/src/pipeline.py` :: `Ideogram4Pipeline.__call__` :: `ideogram_schedule_std` (`model_kwargs.get`)

<a id="model-ideogram4-model-kwargs-max-text-length"></a>
### `model.ideogram4.model_kwargs.max_text_length`

Sets the maximum text token length used by this model family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.max_text_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ideogram4`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `3072` (ui_architecture=`ideogram4`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `3072` for ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `max_text_length: 3072`
- Source symbols: `extensions_built_in/diffusion_models/ideogram4/ideogram4.py` :: `Ideogram4Model.__init__` :: `max_text_length` (`model_kwargs.get`)

<a id="model-ideogram4-model-kwargs-text-encoder-path"></a>
### `model.ideogram4.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ideogram4`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"QWEN3_VL_PATH"}` (ui_architecture=`ideogram4`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"QWEN3_VL_PATH"}` for ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/ideogram4/ideogram4.py` :: `Ideogram4Model._load_text_encoder` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-checkpoint-filename"></a>
### `model.krea2.model_kwargs.checkpoint_filename`

Selects a specific transformer checkpoint file inside the model source.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.checkpoint_filename`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `checkpoint_filename: /workspace/components/checkpoint_filename`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._load_transformer` :: `checkpoint_filename` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-control-image-max-pixels"></a>
### `model.krea2.model_kwargs.control_image_max_pixels`

Caps the pixel budget used when encoding control images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.control_image_max_pixels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"1024 * 1024"}` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"1024 * 1024"}` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `control_image_max_pixels: 512`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._ref_target_pixels` :: `control_image_max_pixels` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-edit"></a>
### `model.krea2.model_kwargs.edit`

Selects Krea 2 edit-model behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.edit`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`krea2:o_edit`); On Leave absent (ui_architecture=`krea2:o_edit`); On Select present as `true` (ui_architecture=`krea2:o_edit_turbo`); On Leave absent (ui_architecture=`krea2:o_edit_turbo`)
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for ui_architecture=`krea2:o_edit`; On Leave absent for ui_architecture=`krea2:o_edit`; On Select present as `true` for ui_architecture=`krea2:o_edit_turbo`; On Leave absent for ui_architecture=`krea2:o_edit_turbo`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `edit: false`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model.__init__` :: `edit` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-kv-cache"></a>
### `model.krea2.model_kwargs.kv_cache`

Enables the Krea 2 text-encoder key/value cache.

- UI label: KV Cache
- Locations: Yaml `config.process[*].model.model_kwargs.kv_cache`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`krea2:o_edit`); On Leave absent (ui_architecture=`krea2:o_edit`); On Select present as `true` (ui_architecture=`krea2:o_edit_turbo`); On Leave absent (ui_architecture=`krea2:o_edit_turbo`)
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for ui_architecture=`krea2:o_edit`; On Leave absent for ui_architecture=`krea2:o_edit`; On Select present as `true` for ui_architecture=`krea2:o_edit_turbo`; On Leave absent for ui_architecture=`krea2:o_edit_turbo`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `kv_cache: false`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model.__init__` :: `kv_cache` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-match-target-res"></a>
### `model.krea2.model_kwargs.match_target_res`

Sizes reference or control conditioning from the current target resolution.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.match_target_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: On Select present as `true` (ui_architecture=`krea2:o_edit`); On Leave absent (ui_architecture=`krea2:o_edit`); On Select present as `true` (ui_architecture=`krea2:o_edit_turbo`); On Leave absent (ui_architecture=`krea2:o_edit_turbo`)
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`; On Select present as `true` for ui_architecture=`krea2:o_edit`; On Leave absent for ui_architecture=`krea2:o_edit`; On Select present as `true` for ui_architecture=`krea2:o_edit_turbo`; On Leave absent for ui_architecture=`krea2:o_edit_turbo`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `match_target_res: false`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._encode_ref_latents` :: `match_target_res` (`model_kwargs.get`); `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._ref_target_pixels` :: `match_target_res` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-max-text-length"></a>
### `model.krea2.model_kwargs.max_text_length`

Sets the maximum text token length used by this model family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.max_text_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `512` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `512` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `max_text_length: 512`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model.__init__` :: `max_text_length` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-mmdit-config"></a>
### `model.krea2.model_kwargs.mmdit_config`

Overrides Krea 2 MMDiT construction fields.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.mmdit_config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{}` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `mmdit_config: {}`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._load_transformer` :: `mmdit_config` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-schedule-max-res"></a>
### `model.krea2.model_kwargs.schedule_max_res`

Sets the high-resolution endpoint used by the Krea 2 schedule.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.schedule_max_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1280` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `1280` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `schedule_max_res: 1280`
- Source symbols: `extensions_built_in/diffusion_models/krea2/src/pipeline.py` :: `Krea2Pipeline.__call__` :: `schedule_max_res` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-schedule-min-res"></a>
### `model.krea2.model_kwargs.schedule_min_res`

Sets the low-resolution endpoint used by the Krea 2 schedule.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.schedule_min_res`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `256` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `256` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `schedule_min_res: 256`
- Source symbols: `extensions_built_in/diffusion_models/krea2/src/pipeline.py` :: `Krea2Pipeline.__call__` :: `schedule_min_res` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-schedule-mu"></a>
### `model.krea2.model_kwargs.schedule_mu`

Overrides the Krea 2 schedule shift directly.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.schedule_mu`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `schedule_mu: 1`
- Source symbols: `extensions_built_in/diffusion_models/krea2/src/pipeline.py` :: `Krea2Pipeline.__call__` :: `schedule_mu` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-schedule-y1"></a>
### `model.krea2.model_kwargs.schedule_y1`

Sets the first interpolation endpoint for the Krea 2 schedule.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.schedule_y1`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.5` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `0.5` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `schedule_y1: 0.5`
- Source symbols: `extensions_built_in/diffusion_models/krea2/src/pipeline.py` :: `Krea2Pipeline.__call__` :: `schedule_y1` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-schedule-y2"></a>
### `model.krea2.model_kwargs.schedule_y2`

Sets the second interpolation endpoint for the Krea 2 schedule.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.schedule_y2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1.15` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `1.15` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `schedule_y2: 1.15`
- Source symbols: `extensions_built_in/diffusion_models/krea2/src/pipeline.py` :: `Krea2Pipeline.__call__` :: `schedule_y2` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-text-encoder-path"></a>
### `model.krea2.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"QWEN3_VL_PATH"}` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"QWEN3_VL_PATH"}` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._load_text_encoder` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-vae-path"></a>
### `model.krea2.model_kwargs.vae_path`

Overrides the VAE repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"QWEN_IMAGE_VAE_PATH"}` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"QWEN_IMAGE_VAE_PATH"}` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `vae_path: /workspace/components/vae`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._load_vae` :: `vae_path` (`model_kwargs.get`)

<a id="model-krea2-model-kwargs-vlm-max-pixels"></a>
### `model.krea2.model_kwargs.vlm_max_pixels`

Caps the pixel budget supplied to the vision-language encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vlm_max_pixels`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"384 * 384"}` (ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{"expression":"384 * 384"}` for ui_architecture=`krea2`; ui_architecture=`krea2:turbo`; ui_architecture=`krea2:o_edit`; ui_architecture=`krea2:o_edit_turbo`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `vlm_max_pixels: 512`
- Source symbols: `extensions_built_in/diffusion_models/krea2/krea2.py` :: `Krea2Model._prep_vlm_images` :: `vlm_max_pixels` (`model_kwargs.get`)

<a id="model-ltx2-model-kwargs-audio-vae-path"></a>
### `model.ltx2.model_kwargs.audio_vae_path`

Overrides the audio VAE component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.audio_vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `audio_vae_path: /workspace/components/audio_vae`
- Source symbols: `extensions_built_in/diffusion_models/ltx2/ltx2.py` :: `LTX25Model._resolve_comfy_file` :: `audio_vae_path` (`model_kwargs.get`)

<a id="model-ltx2-model-kwargs-dit-path"></a>
### `model.ltx2.model_kwargs.dit_path`

Overrides the diffusion-transformer component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.dit_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `dit_path: /workspace/components/dit`
- Source symbols: `extensions_built_in/diffusion_models/ltx2/ltx2.py` :: `LTX25Model._resolve_comfy_file` :: `dit_path` (`model_kwargs.get`)

<a id="model-ltx2-model-kwargs-text-encoder-path"></a>
### `model.ltx2.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/ltx2/ltx2.py` :: `LTX25Model._resolve_comfy_file` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-ltx2-model-kwargs-video-vae-path"></a>
### `model.ltx2.model_kwargs.video_vae_path`

Overrides the video VAE component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.video_vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`ltx2`; ui_architecture=`ltx2.3`; ui_architecture=`ltx2.5`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `video_vae_path: /workspace/components/video_vae`
- Source symbols: `extensions_built_in/diffusion_models/ltx2/ltx2.py` :: `LTX25Model._resolve_comfy_file` :: `video_vae_path` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-cfg-renormalization"></a>
### `model.mageflow.model_kwargs.cfg_renormalization`

Enables MageFlow classifier-free-guidance renormalization.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.cfg_renormalization`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `cfg_renormalization: false`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/src/pipeline.py` :: `MageFlowPipeline.__call__` :: `cfg_renormalization` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-max-text-length"></a>
### `model.mageflow.model_kwargs.max_text_length`

Sets the maximum text token length used by this model family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.max_text_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `2048` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `2048` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `max_text_length: 2048`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel.__init__` :: `max_text_length` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-static-shift"></a>
### `model.mageflow.model_kwargs.static_shift`

Sets the fixed MageFlow sampling schedule shift.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.static_shift`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `6` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `6` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `static_shift: 6`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/src/pipeline.py` :: `MageFlowPipeline.__call__` :: `static_shift` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-text-encoder-path"></a>
### `model.mageflow.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel._load_text_encoder` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-transformer-config"></a>
### `model.mageflow.model_kwargs.transformer_config`

Overrides transformer construction fields.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.transformer_config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `{}` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `transformer_config: {}`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel._load_transformer` :: `transformer_config` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-vae-path"></a>
### `model.mageflow.model_kwargs.vae_path`

Overrides the VAE repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `vae_path: /workspace/components/vae`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel._load_vae` :: `vae_path` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-vae-sample-posterior"></a>
### `model.mageflow.model_kwargs.vae_sample_posterior`

Samples the VAE posterior instead of using its deterministic mode.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vae_sample_posterior`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `true` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `vae_sample_posterior: true`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel._load_vae` :: `vae_sample_posterior` (`model_kwargs.get`)

<a id="model-mageflow-model-kwargs-vl-cond-long-edge"></a>
### `model.mageflow.model_kwargs.vl_cond_long_edge`

Sets the long-edge resolution for vision-language conditioning.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.vl_cond_long_edge`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `384` (ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `384` for ui_architecture=`mageflow`; ui_architecture=`mageflow_edit`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `vl_cond_long_edge: 384`
- Source symbols: `extensions_built_in/diffusion_models/mageflow/mageflow.py` :: `MageFlowModel.get_prompt_embeds` :: `vl_cond_long_edge` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-audio-vae-path"></a>
### `model.minimax_h3.model_kwargs.audio_vae_path`

Overrides the audio VAE component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.audio_vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `audio_vae_path: /workspace/components/audio_vae`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `audio_vae_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-dit-fl2va-path"></a>
### `model.minimax_h3.model_kwargs.dit_fl2va_path`

Overrides the Minimax flow-to-video/audio transformer path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.dit_fl2va_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `dit_fl2va_path: /workspace/components/dit_fl2va`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `dit_fl2va_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-dit-fl2va-pruned-path"></a>
### `model.minimax_h3.model_kwargs.dit_fl2va_pruned_path`

Overrides the pruned Minimax flow-to-video/audio transformer path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.dit_fl2va_pruned_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `dit_fl2va_pruned_path: /workspace/components/dit_fl2va_pruned`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `dit_fl2va_pruned_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-dit-ref2va-path"></a>
### `model.minimax_h3.model_kwargs.dit_ref2va_path`

Overrides the Minimax reference-to-video/audio transformer path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.dit_ref2va_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `dit_ref2va_path: /workspace/components/dit_ref2va`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `dit_ref2va_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-dit-ref2va-pruned-path"></a>
### `model.minimax_h3.model_kwargs.dit_ref2va_pruned_path`

Overrides the pruned Minimax reference-to-video/audio transformer path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.dit_ref2va_pruned_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `dit_ref2va_pruned_path: /workspace/components/dit_ref2va_pruned`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `dit_ref2va_pruned_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-max-text-length"></a>
### `model.minimax_h3.model_kwargs.max_text_length`

Sets the maximum text token length used by this model family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.max_text_length`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `512` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `512` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Larger values increase memory or compute, while unsupported values can fail downstream shape checks.
- Interactions: none
- Aliases: none
- Example: `max_text_length: 512`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model.__init__` :: `max_text_length` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-partition"></a>
### `model.minimax_h3.model_kwargs.partition`

Selects the Minimax H3 diffusion-transformer partition.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.partition`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"fl2va_pruned"` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `"fl2va_pruned"` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Exposes the model-family tuning value without changing common training settings.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `partition: fl2va_pruned`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._dit_component` :: `partition` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-sample-audio"></a>
### `model.minimax_h3.model_kwargs.sample_audio`

Enables audio generation in Minimax H3 training samples.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.sample_audio`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `true` for ui_architecture=`minimax_h3`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`minimax_h3`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `sample_audio: true`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model.generate_single_image` :: `sample_audio` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-text-encoder-path"></a>
### `model.minimax_h3.model_kwargs.text_encoder_path`

Overrides the text-encoder repository or local component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.text_encoder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `text_encoder_path: /workspace/components/text_encoder`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `text_encoder_path` (`model_kwargs.get`)

<a id="model-minimax-h3-model-kwargs-video-vae-path"></a>
### `model.minimax_h3.model_kwargs.video_vae_path`

Overrides the video VAE component path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.video_vae_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`minimax_h3`
- Parser/supported/example types: `path` / `component-path-or-repository-id-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (ui_architecture=`minimax_h3`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `null` for ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Allows explicit component placement, reuse, or replacement.
- Drawbacks: Missing or incompatible components prevent loading or create mismatched model assemblies.
- Interactions: none
- Aliases: none
- Example: `video_vae_path: /workspace/components/video_vae`
- Source symbols: `extensions_built_in/diffusion_models/minimax_h3/minimax_h3.py` :: `MinimaxH3Model._resolve_comfy_file` :: `video_vae_path` (`model_kwargs.get`)

<a id="model-omnigen2-model-kwargs-use-image-refiner"></a>
### `model.omnigen2.model_kwargs.use_image_refiner`

Uses OmniGen 2 image-refiner transformer blocks for layer targeting.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model.model_kwargs.use_image_refiner`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `model` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: ui_architecture=`omnigen2`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `false`, `true`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (ui_architecture=`omnigen2`)
- Other runtime/default transitions: none
- Architecture overrides: Engine Fallback present as `false` for ui_architecture=`omnigen2`
- Normalization: Explicit null is preserved and acts falsey at boolean consumers. (ui_architecture=`omnigen2`)
- Benefits: Makes the optional model-family behavior reproducible in configuration.
- Drawbacks: Unsupported values can reduce quality, increase memory or compute, or fail in the model-specific consumer.
- Interactions: none
- Aliases: none
- Example: `use_image_refiner: false`
- Source symbols: `extensions_built_in/diffusion_models/omnigen2/__init__.py` :: `OmniGen2Model.get_transformer_block_names` :: `use_image_refiner` (`model_kwargs.get`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
