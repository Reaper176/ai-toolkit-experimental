# Training settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This page covers optimization targets, loss behavior, timestep selection, and other training controls assigned here by the catalog. A UI-created value describes newly authored UI configuration; an engine fallback describes absent-key behavior. Architecture overrides and runtime-forced values are shown independently.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Training

<a id="embedding-init-words"></a>
### `embedding.init_words`

Sets the source text used to initialize new embedding token vectors.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding.init_words`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `initialization-text` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"*"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of embedding init words.
- Drawbacks: Poor initialization can slow convergence or bias the learned token toward an unrelated concept.
- Interactions: none
- Aliases: none
- Example: `init_words: person`
- Source symbols: `toolkit/config_modules.py` :: `EmbeddingConfig.__init__` :: `init_words` (`kwargs.get`)

<a id="embedding-save-format"></a>
### `embedding.save_format`

Chooses safetensors or PyTorch serialization for the learned embedding.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding.save_format`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `embedding-save-format` / `string`
- Accepted types/values: not separately constrained; `"safetensors"`, `"pt"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"safetensors"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of embedding save format.
- Drawbacks: PyTorch and safetensors outputs target different consumers and have different safety properties.
- Interactions: none
- Aliases: none
- Example: `save_format: safetensors`
- Source symbols: `toolkit/config_modules.py` :: `EmbeddingConfig.__init__` :: `save_format` (`kwargs.get`)

<a id="embedding-tokens"></a>
### `embedding.tokens`

Sets the number of trainable tokens allocated to the embedding.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding.tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
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
- Engine fallback: present as `4` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of embedding tokens.
- Drawbacks: More tokens add capacity but make prompting and optimization more complex.
- Interactions: none
- Aliases: none
- Example: `tokens: 4`
- Source symbols: `toolkit/config_modules.py` :: `EmbeddingConfig.__init__` :: `tokens` (`kwargs.get`)

<a id="embedding-trigger"></a>
### `embedding.trigger`

Sets the prompt trigger that expands to the learned embedding tokens.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding.trigger`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
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
- Engine fallback: present as `"custom_embedding"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of embedding trigger.
- Drawbacks: A common trigger can collide with existing vocabulary and entangle the concept.
- Interactions: none
- Aliases: none
- Example: `trigger: my_embedding`
- Source symbols: `toolkit/config_modules.py` :: `EmbeddingConfig.__init__` :: `trigger` (`kwargs.get`)

<a id="embedding-trigger-class-name"></a>
### `embedding.trigger_class_name`

Sets the class name used with the embedding trigger for inverted masked-prior behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding.trigger_class_name`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
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
- Benefits: Provides explicit control of embedding trigger class name.
- Drawbacks: An incorrect class name gives preservation prompts the wrong semantic target.
- Interactions: Affects `embedding.trigger`: The class name supplies the preservation class associated with the trigger. (all supported configurations)
- Aliases: none
- Example: `trigger_class_name: person`
- Source symbols: `toolkit/config_modules.py` :: `EmbeddingConfig.__init__` :: `trigger_class_name` (`kwargs.get`)

<a id="process-adapter"></a>
### `process.adapter`

Optional adapter configuration; a present object initializes AdapterConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].adapter`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Enables adapter training alongside or instead of a network.
- Drawbacks: Unsupported adapter/model combinations fail or alter the trainable module set.
- Interactions: none
- Aliases: none
- Example: `adapter: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `adapter` (`get_conf`)

<a id="process-datasets"></a>
### `process.datasets`

Dataset configuration list passed through preprocessing and DatasetConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `object-list` / `object-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Allows one process to combine training and regularization datasets.
- Drawbacks: An empty or incompatible dataset list leaves the trainer without usable training data.
- Interactions: none
- Aliases: none
- Example: `datasets: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `datasets` (`get_conf`)

<a id="process-decorator"></a>
### `process.decorator`

Optional decorator configuration used by supported Flux models.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].decorator`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Enables decorator-token training when the model supports it.
- Drawbacks: The process rejects decorator configuration for non-Flux models.
- Interactions: none
- Aliases: none
- Example: `decorator: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `decorator` (`get_conf`)

<a id="process-decorator-num-tokens"></a>
### `process.decorator.num_tokens`

Sets the number of trainable decorator tokens created for a supported Flux process.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].decorator.num_tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, engine_architecture=`flux`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `4` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls decorator representation capacity.
- Drawbacks: More tokens increase trainable state and prompt complexity; decorator configuration is rejected for non-Flux models.
- Interactions: none
- Aliases: none
- Example: `num_tokens: 4`
- Source symbols: `toolkit/config_modules.py` :: `DecoratorConfig.__init__` :: `num_tokens` (`kwargs.get`)

<a id="process-do-lorm"></a>
### `process.do_lorm`

Parses do\_lorm into the process configuration, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].do_lorm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback false. (all supported configurations)
- Benefits: Documents the parsed compatibility field so inert legacy configuration is recognizable.
- Drawbacks: Changing it has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `do_lorm: false`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `do_lorm` (`get_conf`)

<a id="process-embedding"></a>
### `process.embedding`

Optional embedding configuration used to create trainable tokens.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].embedding`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Enables embedding training within the diffusion trainer.
- Drawbacks: Trigger and token settings must be compatible with the selected text encoders.
- Interactions: none
- Aliases: none
- Example: `embedding: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `embedding` (`get_conf`)

<a id="process-guidance"></a>
### `process.guidance`

Optional training-guidance configuration.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].guidance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Enables class-targeted guidance when the process supports it.
- Drawbacks: Guidance adds computation and requires compatible prompts and targets.
- Interactions: none
- Aliases: none
- Example: `guidance: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `guidance` (`get_conf`)

<a id="process-log-dir"></a>
### `process.log_dir`

Sets the TensorBoard log directory, inheriting job.log\_dir when omitted or null.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].log_dir`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"job.log_dir when defined, otherwise null"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and inherits job.log\_dir when available, otherwise leaving logging disabled. (all supported configurations)
- Benefits: Keeps TensorBoard event files in a chosen location.
- Drawbacks: An unwritable resolved path fails logging; when neither process nor job supplies a path, TensorBoard setup remains disabled.
- Interactions: Fallback `job.log_dir`: Omission or explicit null inherits job.log\_dir. (all supported configurations)
- Aliases: none
- Example: `log_dir: /workspace/logs`
- Source symbols: `jobs/process/BaseTrainProcess.py` :: `BaseTrainProcess.__init__` :: `log_dir` (`get_conf`)

<a id="process-logging"></a>
### `process.logging`

Logging configuration forwarded to LoggingConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].logging`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback empty object. (all supported configurations); When logging is absent, the UI migrator writes \{log\_every: 1, use\_ui\_logger: true\}; an explicitly present value, including null, is retained. (all supported configurations)
- Benefits: Controls console, UI, and external experiment logging.
- Drawbacks: External logging can add latency or require credentials.
- Interactions: none
- Aliases: none
- Example: `logging: {}`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `logging` (`get_conf`)

<a id="process-lorm-extract-mode"></a>
### `process.lorm_extract_mode`

Parses lorm\_extract\_mode into the process configuration, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].lorm_extract_mode`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"ratio"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback ratio. (all supported configurations)
- Benefits: Documents the parsed compatibility field and its historical default value.
- Drawbacks: Changing it has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `lorm_extract_mode: ratio`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `lorm_extract_mode` (`get_conf`)

<a id="process-lorm-extract-mode-param"></a>
### `process.lorm_extract_mode_param`

Parses lorm\_extract\_mode\_param into the process configuration, but current production code never reads the assigned attribute.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].lorm_extract_mode_param`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.25` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback 0.25. (all supported configurations)
- Benefits: Documents the parsed compatibility field and its historical numeric value.
- Drawbacks: Changing it has no runtime effect because no production path reads the assigned attribute.
- Interactions: none
- Aliases: none
- Example: `lorm_extract_mode_param: 0.25`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `lorm_extract_mode_param` (`get_conf`)

<a id="process-model"></a>
### `process.model`

Model configuration forwarded to ModelConfig after dtype synchronization.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].model`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The process overwrites model.dtype with the parsed training dtype before ModelConfig is created. (all supported configurations); BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback empty object. (all supported configurations)
- Benefits: Selects and configures the base diffusion model.
- Drawbacks: An incompatible model configuration prevents loading or changes memory requirements.
- Interactions: none
- Aliases: none
- Example: `model: {}`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `model` (`get_conf`)

<a id="process-network"></a>
### `process.network`

Optional network configuration forwarded to NetworkConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Enables LoRA, LyCORIS, and related trainable network types.
- Drawbacks: Network shape choices affect capacity, memory use, and checkpoint compatibility.
- Interactions: none
- Aliases: none
- Example: `network: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `network` (`get_conf`)

<a id="process-torch-profiler"></a>
### `process.torch_profiler`

Enables a PyTorch profiler around the training loop.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].torch_profiler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback false. (all supported configurations)
- Benefits: Can identify expensive operations during diagnosis.
- Drawbacks: Profiling adds substantial overhead and verbose output.
- Interactions: none
- Aliases: none
- Example: `torch_profiler: false`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `torch_profiler` (`get_conf`)

<a id="process-train"></a>
### `process.train`

Training configuration forwarded to TrainConfig; omission or null becomes an empty object.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback empty object. (all supported configurations)
- Benefits: Controls the optimizer-step and precision behavior of the process.
- Drawbacks: Invalid combinations can fail validation or produce poor training behavior.
- Interactions: none
- Aliases: none
- Example: `train: {}`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `train` (`get_conf`)

<a id="process-training-folder"></a>
### `process.training_folder`

Sets the training artifact root, inheriting job.training\_folder when omitted or null.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].training_folder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"job.training_folder when defined, otherwise null"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and inherits job.training\_folder when available, otherwise leaving the folder unresolved. (all supported configurations)
- Benefits: Controls where the named process folder and saved configuration are created.
- Drawbacks: The process cannot initialize its output path when no usable folder is supplied.
- Interactions: Fallback `job.training_folder`: Omission or explicit null inherits job.training\_folder. (all supported configurations)
- Aliases: none
- Example: `training_folder: /workspace/output`
- Source symbols: `jobs/process/BaseTrainProcess.py` :: `BaseTrainProcess.__init__` :: `training_folder` (`get_conf`)

<a id="process-training-seed"></a>
### `process.training_seed`

Overrides the inherited random seed for process initialization.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].training_seed`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"job.training_seed when defined, otherwise null"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A present seed is applied to PyTorch, available CUDA generators, and Python random. (all supported configurations); BaseProcess.get\_conf treats explicit null like omission and inherits job.training\_seed when available, otherwise leaving the seed unset. (all supported configurations)
- Benefits: Helps reproduce initialization and other seeded process behavior.
- Drawbacks: It does not make nondeterministic kernels or every external component deterministic.
- Interactions: Fallback `job.training_seed`: Omission or explicit null inherits job.training\_seed. (all supported configurations)
- Aliases: none
- Example: `training_seed: 42`
- Source symbols: `jobs/process/BaseTrainProcess.py` :: `BaseTrainProcess.__init__` :: `training_seed` (`get_conf`)

<a id="process-trigger-word"></a>
### `process.trigger_word`

Defines a process-level trigger inherited by datasets and sample prompts when applicable.

- UI label: Trigger Word
- Locations: Yaml `config.process[*].trigger_word`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `process` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: `string`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: BaseProcess.get\_conf treats explicit null like omission and applies the engine fallback null. (all supported configurations)
- Benefits: Keeps concept activation consistent across training data and evaluation prompts.
- Drawbacks: An unsuitable or common trigger can entangle the learned concept with existing vocabulary.
- Interactions: none
- Aliases: none
- Example: `trigger_word: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `trigger_word` (`get_conf`)

<a id="train-adapter-assist-name-or-path"></a>
### `train.adapter_assist_name_or_path`

Loads an assistant adapter used during supported denoising passes.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.adapter_assist_name_or_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `path-or-null` / `path`
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
- Benefits: Reuses a pretrained adapter as auxiliary conditioning during training.
- Drawbacks: The path must match the selected adapter type and loadable model format.
- Interactions: none
- Aliases: none
- Example: `adapter_assist_name_or_path: /models/adapter`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `adapter_assist_name_or_path` (`kwargs.get`)

<a id="train-adapter-assist-type"></a>
### `train.adapter_assist_type`

Selects the t2i-adapter or control-net assistant loader.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.adapter_assist_type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"t2i"`, `"control_net"`
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
- Benefits: Routes the assistant path to the matching adapter implementation.
- Drawbacks: Any other spelling raises an unknown adapter-assist type error.
- Interactions: Requires `train.adapter_assist_name_or_path`: The type selects how a configured assistant path is loaded. (all supported configurations)
- Aliases: none
- Example: `adapter_assist_type: t2i`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `adapter_assist_type` (`kwargs.get`)

<a id="train-adapter-lr"></a>
### `train.adapter_lr`

Overrides the learning rate for the optional adapter component.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.adapter_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits train.lr; explicit null is preserved and is not a numeric learning rate. (all supported configurations)
- Benefits: Use 5e-6 for conservative adapter tuning when its pretrained behavior should mostly be retained.
- Drawbacks: A low rate risks under-training the adapter, while an excessive rate can erase useful conditioning behavior.
- Interactions: none
- Aliases: none
- Example: `adapter_lr: 5e-6`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `adapter_lr` (`kwargs.get`)

<a id="train-adaptive-scaling-factor"></a>
### `train.adaptive_scaling_factor`

Lets supported loaders adapt latent scaling from observed image norms.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.adaptive_scaling_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can compensate when encoded magnitudes differ from the model's expected scale.
- Drawbacks: Adaptive scaling changes input statistics and can make runs harder to compare.
- Interactions: none
- Aliases: none
- Example: `adaptive_scaling_factor: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `adaptive_scaling_factor` (`kwargs.get`)

<a id="train-attention-backend"></a>
### `train.attention_backend`

Requests an attention backend on components that expose set\_attention\_backend.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.attention_backend`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Engine fallback: present as `"native"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows compatible models to select optimized attention implementations.
- Drawbacks: Backend names and availability depend on installed Diffusers and hardware support.
- Interactions: Affects `train.xformers`: Both controls may be applied; actual precedence belongs to the model's attention implementation. (all supported configurations)
- Aliases: none
- Example: `attention_backend: native`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `attention_backend` (`kwargs.get`)

<a id="train-audio-loss-multiplier"></a>
### `train.audio_loss_multiplier`

Scales the audio loss contribution in audio-capable training.

- UI label: Audio Loss Multiplier
- Locations: Yaml `config.process[*].train.audio_loss_multiplier`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Balances audio supervision against other loss terms in multimodal batches.
- Drawbacks: A large multiplier can let audio dominate the shared update.
- Interactions: none
- Aliases: none
- Example: `audio_loss_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `audio_loss_multiplier` (`kwargs.get`)

<a id="train-batch-noise-correction-scale"></a>
### `train.batch_noise_correction_scale`

Sets the strength of noise borrowed from other items for batch correction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.batch_noise_correction_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can discourage the model from drifting toward unrelated examples in the same batch.
- Drawbacks: Strong correction adds cross-example interference and depends on meaningful batches.
- Interactions: none
- Aliases: none
- Example: `batch_noise_correction_scale: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `batch_noise_correction_scale` (`kwargs.get`)

<a id="train-batch-size"></a>
### `train.batch_size`

Sets the number of dataset items processed together in each micro-batch.

- UI label: Batch Size
- Locations: Yaml `config.process[*].train.batch_size`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use a larger batch when memory permits and a smoother per-step gradient estimate is useful.
- Drawbacks: Larger batches risk out-of-memory failures and change the effective batch with accumulation.
- Interactions: Affects `train.gradient_accumulation`: Effective batch size grows with both the micro-batch size and accumulated micro-batches. (all supported configurations)
- Aliases: none
- Example: `batch_size: 1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `batch_size` (`kwargs.get`)

<a id="train-blank-prompt-preservation"></a>
### `train.blank_prompt_preservation`

Adds a preservation target generated from an empty prompt.

- UI label: Blank Prompt Preservation
- Locations: Yaml `config.process[*].train.blank_prompt_preservation`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Helps retain the base model's unconditional behavior while a network learns a concept.
- Drawbacks: It requires a network and cannot run with differential output preservation.
- Interactions: Conflicts `train.diff_output_preservation`: Configuration validation rejects enabling both preservation modes. (all supported configurations)
- Aliases: none
- Example: `blank_prompt_preservation: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `blank_prompt_preservation` (`kwargs.get`)

<a id="train-blank-prompt-preservation-multiplier"></a>
### `train.blank_prompt_preservation_multiplier`

Scales the blank-prompt preservation loss.

- UI label: BPP Loss Multiplier
- Locations: Yaml `config.process[*].train.blank_prompt_preservation_multiplier`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows preservation strength to be balanced against the main objective.
- Drawbacks: Too much preservation can suppress learning of the requested concept.
- Interactions: Requires `train.blank_prompt_preservation`: The multiplier is consumed only when blank-prompt preservation supplies the active target. (all supported configurations)
- Aliases: none
- Example: `blank_prompt_preservation_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `blank_prompt_preservation_multiplier` (`kwargs.get`)

<a id="train-blended-blur-noise"></a>
### `train.blended_blur_noise`

Blends blurred structure into generated training noise.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.blended_blur_noise`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can expose the denoiser to a structured-noise variant for targeted experiments.
- Drawbacks: The altered noise distribution may not match the base model's training process.
- Interactions: none
- Aliases: none
- Example: `blended_blur_noise: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `blended_blur_noise` (`kwargs.get`)

<a id="train-bypass-guidance-embedding"></a>
### `train.bypass_guidance_embedding`

Bypasses guidance embeddings on compatible guided models.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.bypass_guidance_embedding`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flex2`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flex2`
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Supports models or training objectives that do not use their guidance embedding.
- Drawbacks: Configuration validation rejects this together with guidance loss.
- Interactions: Conflicts `train.do_guidance_loss`: Configuration validation rejects bypassed guidance embeddings together with guidance loss. (all supported configurations)
- Aliases: none
- Example: `bypass_guidance_embedding: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `bypass_guidance_embedding` (`kwargs.get`)

<a id="train-cache-text-embeddings"></a>
### `train.cache_text_embeddings`

Forces every dataset to cache text embeddings.

- UI label: Cache Text Embeddings
- Locations: Yaml `config.process[*].train.cache_text_embeddings`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Avoids repeated text encoding and allows the encoder to be unloaded.
- Drawbacks: Cached text cannot reflect text-encoder updates, so text-encoder training is rejected.
- Interactions: Conflicts `train.train_text_encoder`: Cached embeddings cannot track encoder updates and SDTrainer rejects this combination. (all supported configurations); Affects `train.unload_text_encoder`: Any dataset text cache enters the same cache-and-unload path as unload\_text\_encoder. (all supported configurations); Affects `dataset.cache_latents`: Text embedding caching is independent of latent caching; enabling one does not imply the other. (all supported configurations)
- Aliases: none
- Example: `cache_text_embeddings: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `cache_text_embeddings` (`kwargs.get`)

<a id="train-cfg-rescale"></a>
### `train.cfg_rescale`

Sets the CFG rescale used during CFG-enabled training targets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.cfg_rescale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission or explicit null is replaced with cfg\_scale. (all supported configurations)
- Benefits: Separates guidance amplitude correction from the primary CFG scale.
- Drawbacks: Omission falls back to cfg\_scale, while an ill-chosen value can distort targets.
- Interactions: Fallback `train.cfg_scale`: Omission is normalized to cfg\_scale before training uses the value. (all supported configurations)
- Aliases: none
- Example: `cfg_rescale: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `cfg_rescale` (`kwargs.get`)

<a id="train-cfg-scale"></a>
### `train.cfg_scale`

Sets the base classifier-free guidance scale used by training paths.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.cfg_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides direct control over conditional extrapolation when CFG training is enabled.
- Drawbacks: High guidance can amplify prediction errors and destabilize targets.
- Interactions: none
- Aliases: none
- Example: `cfg_scale: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `cfg_scale` (`kwargs.get`)

<a id="train-content-or-style"></a>
### `train.content_or_style`

Biases timestep sampling toward content, style, or a balanced distribution.

- UI label: Timestep Bias
- Locations: Yaml `config.process[*].train.content_or_style`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"balanced"`, `"style"`, `"content"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"balanced"`, `"content"`, `"style"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"balanced"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use content or style weighting when the concept benefits from emphasis on structure or appearance.
- Drawbacks: Strong weighting risks weakening learning in the other part of the denoising trajectory.
- Interactions: Affects `train.timestep_type`: Content/style bias is used after specialized timestep modes, so those modes can take precedence. (all supported configurations)
- Aliases: none
- Example: `content_or_style: balanced`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `content_or_style` (`kwargs.get`)

<a id="train-correct-pred-norm"></a>
### `train.correct_pred_norm`

Corrects target statistics using the prediction mean and standard deviation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.correct_pred_norm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can counter prediction-norm drift when a prior prediction is available.
- Drawbacks: The extra prior pass and normalization can increase cost and alter loss geometry.
- Interactions: none
- Aliases: none
- Example: `correct_pred_norm: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `correct_pred_norm` (`kwargs.get`)

<a id="train-correct-pred-norm-multiplier"></a>
### `train.correct_pred_norm_multiplier`

Scales prediction-norm correction before it is applied.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.correct_pred_norm_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the norm correction to be introduced gently.
- Drawbacks: Large multipliers can overcorrect and replace useful target variation.
- Interactions: none
- Aliases: none
- Example: `correct_pred_norm_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `correct_pred_norm_multiplier` (`kwargs.get`)

<a id="train-diff-output-preservation"></a>
### `train.diff_output_preservation`

Preserves the network-off output for a prompt with the trigger removed.

- UI label: Differential Output Preservation
- Locations: Yaml `config.process[*].train.diff_output_preservation`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Helps a LoRA learn the trigger-specific difference instead of rewriting the whole class.
- Drawbacks: It requires a trigger and network, conflicts with text-encoder training, and excludes blank preservation.
- Interactions: Conflicts `train.blank_prompt_preservation`: Configuration validation rejects enabling both preservation modes. (all supported configurations); Conflicts `train.train_text_encoder`: SDTrainer rejects differential output preservation while text encoders are trained. (all supported configurations)
- Aliases: none
- Example: `diff_output_preservation: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `diff_output_preservation` (`kwargs.get`)

<a id="train-diff-output-preservation-class"></a>
### `train.diff_output_preservation_class`

Replaces the trigger with a class phrase for differential preservation.

- UI label: DOP Preservation Class
- Locations: Yaml `config.process[*].train.diff_output_preservation_class`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `""` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides a stable class prompt when the trigger should be removed from the reference pass.
- Drawbacks: A poor replacement class teaches preservation against the wrong semantic baseline.
- Interactions: none
- Aliases: none
- Example: `diff_output_preservation_class: person`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `diff_output_preservation_class` (`kwargs.get`)

<a id="train-diff-output-preservation-multiplier"></a>
### `train.diff_output_preservation_multiplier`

Scales the differential-output preservation loss.

- UI label: DOP Loss Multiplier
- Locations: Yaml `config.process[*].train.diff_output_preservation_multiplier`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Balances class preservation against trigger-specific learning.
- Drawbacks: Excessive weight can prevent the network from making the desired change.
- Interactions: Requires `train.diff_output_preservation`: The multiplier is consumed only when differential preservation supplies the active preservation target. (all supported configurations)
- Aliases: none
- Example: `diff_output_preservation_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `diff_output_preservation_multiplier` (`kwargs.get`)

<a id="train-differential-guidance-scale"></a>
### `train.differential_guidance_scale`

Sets the extrapolation scale for differential guidance loss.

- UI label: Differential Guidance Scale
- Locations: Yaml `config.process[*].train.differential_guidance_scale`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `3` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls how strongly the guided difference contributes to training.
- Drawbacks: Large extrapolation magnifies noisy differences and can destabilize loss.
- Interactions: Requires `train.do_differential_guidance`: The scale is consumed by the differential-guidance path. (all supported configurations)
- Aliases: none
- Example: `differential_guidance_scale: 3.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `differential_guidance_scale` (`kwargs.get`)

<a id="train-diffusion-feature-extractor-path"></a>
### `train.diffusion_feature_extractor_path`

Loads the diffusion feature extractor used for auxiliary feature loss.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.diffusion_feature_extractor_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `path-or-null` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.latent_feature_extractor_path"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits latent\_feature\_extractor\_path; explicit null disables extractor loading. (all supported configurations)
- Benefits: Adds a learned perceptual target from the configured extractor.
- Drawbacks: Loading another model costs memory and only supported extractor structures are checkpointed.
- Interactions: Fallback `train.latent_feature_extractor_path`: Omission inherits the legacy latent feature extractor path. (all supported configurations)
- Aliases: none
- Example: `diffusion_feature_extractor_path: /models/feature-extractor`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `diffusion_feature_extractor_path` (`kwargs.get`)

<a id="train-diffusion-feature-extractor-weight"></a>
### `train.diffusion_feature_extractor_weight`

Scales auxiliary diffusion-feature loss.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.diffusion_feature_extractor_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.latent_feature_loss_weight"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits latent\_feature\_loss\_weight. (all supported configurations)
- Benefits: Balances feature similarity against the primary diffusion objective.
- Drawbacks: A large weight can make extractor features dominate optimization.
- Interactions: Fallback `train.latent_feature_loss_weight`: Omission inherits the legacy latent feature loss weight. (all supported configurations)
- Aliases: none
- Example: `diffusion_feature_extractor_weight: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `diffusion_feature_extractor_weight` (`kwargs.get`)

<a id="train-disable-sampling"></a>
### `train.disable_sampling`

Disables first, periodic, and final sample generation for the run.

- UI label: Disable Sampling
- Locations: Yaml `config.process[*].train.disable_sampling`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Saves generation time and memory in runs evaluated by other means.
- Drawbacks: Removing samples makes qualitative regressions harder to catch during training.
- Interactions: Overrides `train.skip_first_sample`: Disabling sampling subsumes the first-sample skip. (all supported configurations); Overrides `train.force_first_sample`: Disabling sampling prevents even a forced first sample. (all supported configurations)
- Aliases: none
- Example: `disable_sampling: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `disable_sampling` (`kwargs.get`)

<a id="train-do-batch-noise-correction"></a>
### `train.do_batch_noise_correction`

Enables batch-derived noise correction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_batch_noise_correction`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can push each item away from features represented by its batch neighbors.
- Drawbacks: It adds a batch-dependent signal and has little meaning for isolated items.
- Interactions: none
- Aliases: none
- Example: `do_batch_noise_correction: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_batch_noise_correction` (`kwargs.get`)

<a id="train-do-blank-stabilization"></a>
### `train.do_blank_stabilization`

Enables zero-prediction stabilization for empty prompts.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_blank_stabilization`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can reduce unwanted output from unconditional text conditioning.
- Drawbacks: The extra objective may weaken useful unconditional behavior if overemphasized.
- Interactions: none
- Aliases: none
- Example: `do_blank_stabilization: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_blank_stabilization` (`kwargs.get`)

<a id="train-do-cfg"></a>
### `train.do_cfg`

Enables classifier-free-guidance construction during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_cfg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can train against conditional and unconditional predictions explicitly.
- Drawbacks: CFG training adds model work and depends on compatible prompt handling.
- Interactions: none
- Aliases: none
- Example: `do_cfg: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_cfg` (`kwargs.get`)

<a id="train-do-differential-guidance"></a>
### `train.do_differential_guidance`

Enables the differential-guidance objective.

- UI label: Do Differential Guidance
- Locations: Yaml `config.process[*].train.do_differential_guidance`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can emphasize the change produced by guidance instead of only absolute prediction error.
- Drawbacks: The additional extrapolated target can be noisy and is architecture-sensitive.
- Interactions: Requires `train.differential_guidance_scale`: The scale controls the differential-guidance extrapolation. (all supported configurations)
- Aliases: none
- Example: `do_differential_guidance: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_differential_guidance` (`kwargs.get`)

<a id="train-do-fft-loss"></a>
### `train.do_fft_loss`

Adds a frequency-domain loss term.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_fft_loss`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can emphasize frequency structure that pixel losses underweight.
- Drawbacks: FFT loss increases computation and may over-prioritize texture frequencies.
- Interactions: none
- Aliases: none
- Example: `do_fft_loss: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_fft_loss` (`kwargs.get`)

<a id="train-do-fft-velocity-equiv-weight"></a>
### `train.do_fft_velocity_equiv_weight`

Applies velocity-equivalent weighting to the FFT objective.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_fft_velocity_equiv_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can align frequency loss weighting with velocity-style timestep behavior.
- Drawbacks: Combining specialized weights makes the effective objective harder to interpret.
- Interactions: none
- Aliases: none
- Example: `do_fft_velocity_equiv_weight: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_fft_velocity_equiv_weight` (`kwargs.get`)

<a id="train-do-guidance-loss"></a>
### `train.do_guidance_loss`

Enables a guidance-distillation loss toward a configured target.

- UI label: Contrastive Guidance Loss
- Locations: Yaml `config.process[*].train.do_guidance_loss`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Supports models that need explicit guidance behavior during fine-tuning.
- Drawbacks: It conflicts with bypassed guidance embeddings and adds another coupled objective.
- Interactions: Requires `train.guidance_loss_target`: The target supplies the guidance value used by the auxiliary loss. (all supported configurations); Requires `train.guidance_loss_schedule`: The schedule controls whether that target stays constant or decays with sigma. (all supported configurations); Conflicts `train.bypass_guidance_embedding`: Configuration validation rejects guidance loss while guidance embedding is bypassed. (all supported configurations)
- Aliases: none
- Example: `do_guidance_loss: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_guidance_loss` (`kwargs.get`)

<a id="train-do-guidance-loss-cfg-zero"></a>
### `train.do_guidance_loss_cfg_zero`

Uses zero CFG conditioning for the guidance-loss auxiliary pass.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_guidance_loss_cfg_zero`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can isolate guidance behavior from a nonzero CFG baseline.
- Drawbacks: Zero conditioning may be inappropriate for models trained around a fixed guidance value.
- Interactions: none
- Aliases: none
- Example: `do_guidance_loss_cfg_zero: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_guidance_loss_cfg_zero` (`kwargs.get`)

<a id="train-do-paramiter-swapping"></a>
### `train.do_paramiter_swapping`

Rotates which parameters require gradients during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_paramiter_swapping`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can lower active-gradient memory by updating a subset at a time.
- Drawbacks: The trainer calls optimizer-specific swapping hooks and unsupported optimizers fail.
- Interactions: Requires `train.optimizer`: The selected optimizer must expose enable\_paramiter\_swapping and the wrapped optimizer must expose swap\_paramiters. (all supported configurations); Requires `train.paramiter_swapping_factor`: The factor sets the active parameter target when swapping is enabled. (all supported configurations)
- Aliases: none
- Example: `do_paramiter_swapping: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_paramiter_swapping` (`kwargs.get`)

<a id="train-do-prior-divergence"></a>
### `train.do_prior_divergence`

Applies negative prior loss to encourage divergence from the base prediction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_prior_divergence`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can deliberately push a concept away from its pretrained prior.
- Drawbacks: Negative loss can erase useful prior knowledge or produce unstable gradients.
- Interactions: none
- Aliases: none
- Example: `do_prior_divergence: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_prior_divergence` (`kwargs.get`)

<a id="train-do-random-cfg"></a>
### `train.do_random_cfg`

Randomizes CFG scale within the configured range.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_random_cfg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Exposes the model to more than one guidance strength.
- Drawbacks: Random guidance adds target variance and depends on a sensible maximum scale.
- Interactions: Requires `train.max_cfg_scale`: Random CFG needs the configured maximum to define its scale range. (all supported configurations)
- Aliases: none
- Example: `do_random_cfg: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_random_cfg` (`kwargs.get`)

<a id="train-do-signal-amplification"></a>
### `train.do_signal_amplification`

Amplifies selected training signal before target construction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_signal_amplification`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can strengthen a weak target signal in experimental recipes.
- Drawbacks: Amplification also magnifies noise and can destabilize updates.
- Interactions: none
- Aliases: none
- Example: `do_signal_amplification: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_signal_amplification` (`kwargs.get`)

<a id="train-do-signal-correction-noise"></a>
### `train.do_signal_correction_noise`

Adds signal-correction noise during noising.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.do_signal_correction_noise`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can compensate for signal leakage in selected training setups.
- Drawbacks: The corrected distribution differs from ordinary scheduler noise.
- Interactions: none
- Aliases: none
- Example: `do_signal_correction_noise: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `do_signal_correction_noise` (`kwargs.get`)

<a id="train-dtype"></a>
### `train.dtype`

Selects the tensor dtype used by training components.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.dtype`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"float"`, `"fp32"`, `"single"`, `"float32"`, `"fp16"`, `"half"`, `"float16"`, `"bf16"`, `"bfloat16"`, `"8bit"`, `"e4m3fn"`, `"float8"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"fp32"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Lower precision can reduce memory use and increase accelerator throughput.
- Drawbacks: Low precision can overflow or lose small updates, and float8 needs hardware and kernels that support it.
- Interactions: none
- Aliases: none
- Example: `dtype: bf16`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `dtype` (`kwargs.get`)

<a id="train-dynamic-noise-offset"></a>
### `train.dynamic_noise_offset`

Makes noise offset vary dynamically instead of remaining fixed.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.dynamic_noise_offset`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can diversify offset exposure across training examples.
- Drawbacks: Dynamic offsets add variance and reduce reproducibility of the target distribution.
- Interactions: none
- Aliases: none
- Example: `dynamic_noise_offset: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `dynamic_noise_offset` (`kwargs.get`)

<a id="train-ema-ema-decay"></a>
### `train.ema.ema_decay`

Sets exponential moving-average decay for shadow parameters.

- UI label: EMA Decay
- Locations: Yaml `config.process[*].train.ema_config.ema_decay`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `fraction` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.999` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of EMA ema decay.
- Drawbacks: High decay responds slowly; low decay follows noisy current weights too closely.
- Interactions: Requires `train.ema.use_ema`: This setting is effective only when EMA is enabled. (all supported configurations)
- Aliases: none
- Example: `ema_decay: 0.999`
- Source symbols: `toolkit/config_modules.py` :: `EMAConfig.__init__` :: `ema_decay` (`kwargs.get`)

<a id="train-ema-param-multiplier"></a>
### `train.ema.param_multiplier`

Multiplies live parameters after every EMA update.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.ema_config.param_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides explicit control of EMA param multiplier.
- Drawbacks: Values other than one directly grow or shrink live weights and can destabilize training.
- Interactions: Requires `train.ema.use_ema`: This setting is effective only when EMA is enabled. (all supported configurations)
- Aliases: none
- Example: `param_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `EMAConfig.__init__` :: `param_multiplier` (`kwargs.get`)

<a id="train-ema-use-ema"></a>
### `train.ema.use_ema`

Enables creation and updates of exponential moving-average shadow weights.

- UI label: Use EMA
- Locations: Yaml `config.process[*].train.ema_config.use_ema`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: TrainConfig replaces the entire EMA object with \{use\_ema: false\} unless the input object explicitly enables EMA. (all supported configurations)
- Benefits: Provides explicit control of EMA use ema.
- Drawbacks: EMA consumes an additional copy of trainable parameters and update time.
- Interactions: none
- Aliases: none
- Example: `use_ema: true`
- Source symbols: `toolkit/config_modules.py` :: `EMAConfig.__init__` :: `use_ema` (`kwargs.get`)

<a id="train-ema-use-feedback"></a>
### `train.ema.use_feedback`

Feeds a scaled EMA difference back into live parameters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.ema_config.use_feedback`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Provides explicit control of EMA use feedback.
- Drawbacks: Feedback changes optimization dynamics and can destabilize an otherwise tuned run.
- Interactions: Requires `train.ema.use_ema`: This setting is effective only when EMA is enabled. (all supported configurations)
- Aliases: none
- Example: `use_feedback: false`
- Source symbols: `toolkit/config_modules.py` :: `EMAConfig.__init__` :: `use_feedback` (`kwargs.get`)

<a id="train-ema-config"></a>
### `train.ema_config`

Configures the exponential moving average of trained parameters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.ema_config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object-or-null` / `object`
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
- Normalization: Omission or null becomes an EMAConfig with use\_ema false; an object with use\_ema true is normalized before construction. (all supported configurations)
- Benefits: EMA can provide a smoother parameter snapshot for saving or evaluation.
- Drawbacks: It consumes additional memory and a slow decay can lag rapid learning.
- Interactions: none
- Aliases: none
- Example: `ema_config: {use_ema: true, ema_decay: 0.99}`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `ema_config` (`kwargs.get`)

<a id="train-embedding-lr"></a>
### `train.embedding_lr`

Overrides the learning rate for trained embedding parameters.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.embedding_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits train.lr; explicit null is preserved and is not a numeric learning rate. (all supported configurations)
- Benefits: Use 1e-5 when an embedding should learn steadily without outrunning the surrounding network.
- Drawbacks: An embedding rate that is too high risks collapsing token meaning into a narrow dataset pattern.
- Interactions: none
- Aliases: none
- Example: `embedding_lr: 1e-5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `embedding_lr` (`kwargs.get`)

<a id="train-force-consistent-noise"></a>
### `train.force_consistent_noise`

Reuses consistent noise for the same image and size.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.force_consistent_noise`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Reduces noise variation when comparing repeated presentations of an example.
- Drawbacks: Less noise diversity can encourage memorization of image-specific trajectories.
- Interactions: none
- Aliases: none
- Example: `force_consistent_noise: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `force_consistent_noise` (`kwargs.get`)

<a id="train-force-first-sample"></a>
### `train.force_first_sample`

Forces initial sample generation even when ordinary first-sample logic would skip it.

- UI label: Force First Sample
- Locations: Yaml `config.process[*].train.force_first_sample`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Provides a baseline sample at the start of a run.
- Drawbacks: The extra generation delays training and disable\_sampling still takes precedence.
- Interactions: Overrides `train.disable_sampling`: disable\_sampling takes precedence and prevents the forced first sample. (all supported configurations)
- Aliases: none
- Example: `force_first_sample: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `force_first_sample` (`kwargs.get`)

<a id="train-free-u"></a>
### `train.free_u`

Enables FreeU behavior around supported training and sampling passes.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.free_u`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can rebalance backbone and skip features without changing model weights.
- Drawbacks: Only trainers and models implementing the FreeU hooks respond to this flag.
- Interactions: none
- Aliases: none
- Example: `free_u: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `free_u` (`kwargs.get`)

<a id="train-gradient-accumulation"></a>
### `train.gradient_accumulation`

Sets the number of micro-batches accumulated for each visible training step.

- UI label: Gradient Accumulation
- Locations: Yaml `config.process[*].train.gradient_accumulation`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use accumulation to increase effective batch size when a full batch does not fit in memory.
- Drawbacks: More accumulation risks slower feedback and cannot be combined with a nondefault legacy interval; fused-backward optimizers update during each backward call instead of waiting for this outer accumulation loop.
- Interactions: Conflicts `train.gradient_accumulation_steps`: TrainConfig raises when gradient\_accumulation exceeds 1 while gradient\_accumulation\_steps is not 1. (all supported configurations)
- Aliases: none
- Example: `gradient_accumulation: 4`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `gradient_accumulation` (`kwargs.get`)

<a id="train-gradient-accumulation-steps"></a>
### `train.gradient_accumulation_steps`

Sets the legacy optimizer-step interval, with -1 accumulating for an entire epoch.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.gradient_accumulation_steps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
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
- Benefits: Use 1 for ordinary stepping or -1 only for a deliberately small epoch-sized accumulation.
- Drawbacks: Large or epoch-wide accumulation risks high memory use and conflicts with gradient\_accumulation above 1.
- Interactions: Conflicts `train.gradient_accumulation`: The legacy interval must remain 1 when the current accumulation setting exceeds 1. (all supported configurations)
- Aliases: none
- Example: `gradient_accumulation_steps: 1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `gradient_accumulation_steps` (`kwargs.get`)

<a id="train-gradient-checkpointing"></a>
### `train.gradient_checkpointing`

Recomputes supported module activations during backward to save memory.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.gradient_checkpointing`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Enables larger models or resolutions within the same VRAM budget.
- Drawbacks: Backward becomes slower and only components exposing checkpoint support are affected.
- Interactions: none
- Aliases: none
- Example: `gradient_checkpointing: true`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `gradient_checkpointing` (`kwargs.get`)

<a id="train-guidance-loss-schedule"></a>
### `train.guidance_loss_schedule`

Chooses constant or sigma-decayed guidance-loss targeting.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.guidance_loss_schedule`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"constant"`, `"sigma"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"sigma"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Sigma decay reduces extrapolation as fresh-noise influence becomes less predictable.
- Drawbacks: A schedule that does not match the model's guidance behavior can misweight timesteps.
- Interactions: Requires `train.do_guidance_loss`: The schedule affects training only while guidance loss is enabled. (all supported configurations)
- Aliases: none
- Example: `guidance_loss_schedule: sigma`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `guidance_loss_schedule` (`kwargs.get`)

<a id="train-guidance-loss-target"></a>
### `train.guidance_loss_target`

A scalar such as guidance\_loss\_target: 3.0 stays constant. An exact pair such as \[2.0, 5.0\] uses element 0 initially, then randomizes each training batch between elements 0 and 1 while guidance loss is enabled.

- UI label: Guidance Loss Target
- Locations: Yaml `config.process[*].train.guidance_loss_target`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number-or-number-pair` / `number or exactly two numbers in a tuple/list` / `number-list`
- Accepted types/values: `number`, `number-list`; not enumerated
- Supported range: not numerically bounded; collection length: `2`
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `3` (all supported configurations)
- Other runtime/default transitions: On Select present as `3.5` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `3.5` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: An exact two-number tuple guidance target is converted to a two-number list after parsing. (all supported configurations)
- Benefits: Use a scalar for one fixed auxiliary-guidance target or a two-number pair to sample a bounded target per training example.
- Drawbacks: A one-element list reaches element 1 and raises IndexError during training. Extra elements are ignored by the runtime and are outside the supported exact-pair contract; aggressive targets can amplify unstable conditional differences.
- Interactions: Requires `train.do_guidance_loss`: The target affects training only while guidance loss is enabled. (all supported configurations)
- Aliases: none
- Example: `guidance_loss_target: [2.0, 5.0]`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `guidance_loss_target` (`kwargs.get`)

<a id="train-img-multiplier"></a>
### `train.img_multiplier`

Scales image tensors before supported latent preparation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.img_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can correct known input scaling differences in specialized pipelines.
- Drawbacks: Changing image magnitude can invalidate model normalization assumptions.
- Interactions: none
- Aliases: none
- Example: `img_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `img_multiplier` (`kwargs.get`)

<a id="train-inverted-mask-prior"></a>
### `train.inverted_mask_prior`

Uses the network-off prediction as an unmasked-region prior target.

- UI label: Inverted Mask Prior
- Locations: Yaml `config.process[*].train.inverted_mask_prior`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Preserves areas outside a dataset mask while the masked concept changes.
- Drawbacks: It requires masks and a prior prediction, and Turbo training triggers source assertions.
- Interactions: Affects `train.inverted_mask_prior_multiplier`: The multiplier directly scales the prior loss outside the active mask. (all supported configurations); Conflicts `train.train_turbo`: SDTrainer asserts that Turbo training is disabled when it computes the inverted-mask prior. (all supported configurations)
- Aliases: none
- Example: `inverted_mask_prior: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `inverted_mask_prior` (`kwargs.get`)

<a id="train-inverted-mask-prior-multiplier"></a>
### `train.inverted_mask_prior_multiplier`

Scales loss from the inverted-mask prior region.

- UI label: Inverted Mask Prior Multiplier
- Locations: Yaml `config.process[*].train.inverted_mask_prior_multiplier`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.5` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Balances unmasked preservation against learning inside the mask.
- Drawbacks: A large value can dominate the main masked objective.
- Interactions: Requires `train.inverted_mask_prior`: The multiplier is used only when an inverted-mask prior prediction and mask are available. (all supported configurations)
- Aliases: none
- Example: `inverted_mask_prior_multiplier: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `inverted_mask_prior_multiplier` (`kwargs.get`)

<a id="train-latent-feature-extractor-path"></a>
### `train.latent_feature_extractor_path`

Provides the legacy name for diffusion\_feature\_extractor\_path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.latent_feature_extractor_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `path-or-null` / `path`
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
- Benefits: Keeps older configurations working as the fallback extractor path.
- Drawbacks: The legacy name is less clear and loses precedence when the replacement is supplied.
- Interactions: Fallback `train.diffusion_feature_extractor_path`: This legacy value supplies the fallback for the replacement field. (all supported configurations)
- Aliases: `config.process[*].train.latent_feature_extractor_path` → `train.diffusion_feature_extractor_path` (Legacy, Replacement Wins): Rename latent\_feature\_extractor\_path to diffusion\_feature\_extractor\_path.
- Example: `latent_feature_extractor_path: /models/feature-extractor`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `latent_feature_extractor_path` (`kwargs.get`)

<a id="train-latent-feature-loss-weight"></a>
### `train.latent_feature_loss_weight`

Provides the legacy fallback for diffusion\_feature\_extractor\_weight.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.latent_feature_loss_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves auxiliary-loss strength in older configurations.
- Drawbacks: The replacement weight takes precedence, so keeping both can be confusing.
- Interactions: Fallback `train.diffusion_feature_extractor_weight`: This legacy value supplies the fallback for the replacement field. (all supported configurations)
- Aliases: `config.process[*].train.latent_feature_loss_weight` → `train.diffusion_feature_extractor_weight` (Legacy, Replacement Wins): Rename latent\_feature\_loss\_weight to diffusion\_feature\_extractor\_weight.
- Example: `latent_feature_loss_weight: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `latent_feature_loss_weight` (`kwargs.get`)

<a id="train-latent-multiplier"></a>
### `train.latent_multiplier`

Scales clean latents used by supported training paths.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.latent_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can match a specialized model's latent magnitude convention.
- Drawbacks: Incorrect scaling changes both noising and target magnitudes.
- Interactions: none
- Aliases: none
- Example: `latent_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `latent_multiplier` (`kwargs.get`)

<a id="train-learnable-snr-gos"></a>
### `train.learnable_snr_gos`

Enables learned gamma, offset, and scale terms for timestep loss balancing.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.learnable_snr_gos`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Use the learned adjustment only for experiments that need adaptive weighting across timesteps.
- Drawbacks: The experimental adjustment risks harder-to-diagnose loss dynamics than fixed weighting.
- Interactions: none
- Aliases: none
- Example: `learnable_snr_gos: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `learnable_snr_gos` (`kwargs.get`)

<a id="train-linear-timesteps"></a>
### `train.linear_timesteps`

Enables the first legacy linear-timestep weighting table.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.linear_timesteps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Use it only with scheduler paths that expose the matching precomputed weights.
- Drawbacks: Enabling legacy weighting risks unexpected emphasis and overlaps with timestep\_type linear.
- Interactions: Affects `train.timestep_type`: The legacy flag also makes guidance paths treat timestep weighting as linear. (all supported configurations)
- Aliases: none
- Example: `linear_timesteps: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `linear_timesteps` (`kwargs.get`)

<a id="train-linear-timesteps2"></a>
### `train.linear_timesteps2`

Enables the second legacy linear-timestep weighting table.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.linear_timesteps2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Use it only when the selected scheduler provides the alternate weighting table.
- Drawbacks: The alternate legacy curve risks unintended timestep bias and is not universal across schedulers.
- Interactions: Affects `train.timestep_type`: The alternate legacy flag also makes guidance paths treat timestep weighting as linear. (all supported configurations)
- Aliases: none
- Example: `linear_timesteps2: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `linear_timesteps2` (`kwargs.get`)

<a id="train-loss-target"></a>
### `train.loss_target`

Selects which prediction target the loss compares against.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.loss_target`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"noise"`, `"source"`, `"unaugmented"`, `"differential_noise"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"noise"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports noise prediction and source-oriented objectives used by specialized recipes.
- Drawbacks: A target incompatible with the scheduler or model prediction type produces misleading gradients.
- Interactions: none
- Aliases: none
- Example: `loss_target: noise`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `loss_target` (`kwargs.get`)

<a id="train-loss-type"></a>
### `train.loss_type`

Selects MSE or a recognized alternate loss calculation.

- UI label: Loss Type
- Locations: Yaml `config.process[*].train.loss_type`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"mse"`, `"mae"`, `"wavelet"`, `"stepped"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"mse"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: MAE, pseudo-Huber, wavelet, stepped, and mean-flow paths allow task-specific error shaping.
- Drawbacks: Unrecognized spellings fall through ordinary MSE paths instead of selecting a new loss.
- Interactions: none
- Aliases: none
- Example: `loss_type: pseudo_huber`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `loss_type` (`kwargs.get`)

<a id="train-lr"></a>
### `train.lr`

Sets the global learning rate inherited by components without an override.

- UI label: Learning Rate
- Locations: Yaml `config.process[*].train.lr`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1e-06` (all supported configurations)
- Other runtime/default transitions: On Select present as `0.0002` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `0.0001` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `0.0001` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `0.0001` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`)
- Architecture overrides: On Select present as `0.0002` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `0.0001` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `0.0001` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `0.0001` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`
- Normalization: Before loading any structurally loadable save-root optimizer.pt, BaseSDTrainProcess records the newly configured learning rates and reapplies each configured learning rate and initial\_lr afterward, so restored optimizer state does not silently replace the current LR. (all supported configurations)
- Benefits: Use 1e-4 as an assertive starting example when rapid adapter learning is more important than conservatism.
- Drawbacks: A high global rate risks unstable updates or fast overfitting, so validate samples early.
- Interactions: none
- Aliases: none
- Example: `lr: 1e-4`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `lr` (`kwargs.get`)

<a id="train-lr-scheduler"></a>
### `train.lr_scheduler`

Selects constant, constant\_with\_warmup, cosine, cosine\_with\_restarts, linear, or step locally; other names are attempted through the installed Diffusers SchedulerType registry.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `local-or-diffusers-scheduler-name` / `string`
- Accepted types/values: not separately constrained; `"constant"`, `"constant_with_warmup"`, `"cosine"`, `"cosine_with_restarts"`, `"linear"`, `"step"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"constant"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use a constant schedule when a fixed rate is easier to reason about across short fine-tuning runs.
- Drawbacks: Local scheduler constructor TypeError or ValueError propagates unchanged; only a failed Diffusers fallback is translated to the dispatcher ValueError.
- Interactions: none
- Aliases: none
- Example: `lr_scheduler: constant`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `lr_scheduler` (`kwargs.get`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant_with_warmup` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine_with_restarts` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `linear` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `step` (`scheduler.registry`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant__target=torch.optim.lr_scheduler.ConstantLR` (`scheduler.dispatch_target`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant_with_warmup__target=diffusers.optimization.get_constant_schedule_with_warmup` (`scheduler.dispatch_target`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine__target=torch.optim.lr_scheduler.CosineAnnealingLR` (`scheduler.dispatch_target`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine_with_restarts__target=torch.optim.lr_scheduler.CosineAnnealingWarmRestarts` (`scheduler.dispatch_target`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `linear__target=torch.optim.lr_scheduler.LinearLR` (`scheduler.dispatch_target`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `step__target=torch.optim.lr_scheduler.StepLR` (`scheduler.dispatch_target`)

<a id="train-lr-scheduler-params"></a>
### `train.lr_scheduler_params`

Passes scheduler-specific keyword arguments to learning-rate scheduler dispatch.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
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
- Benefits: Use total\_iters to align compatible cosine schedules with the intended training duration.
- Drawbacks: Unsupported keys risk constructor errors, and constant\_with\_warmup removes total\_iters before dispatch.
- Interactions: Requires `train.lr_scheduler`: These keyword arguments are interpreted only by the selected learning-rate scheduler. (all supported configurations)
- Aliases: none
- Example: `lr_scheduler_params: {total_iters: 1000}`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `lr_scheduler_params` (`kwargs.get`)

<a id="train-match-adapter-assist"></a>
### `train.match_adapter_assist`

Enables the legacy shortcut that raises a zero adapter-match chance to one.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.match_adapter_assist`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: True changes a zero match\_adapter\_chance to 1.0; otherwise the parsed boolean is not retained. (all supported configurations); Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Maintains previous always-match behavior without rewriting old files.
- Drawbacks: It is not stored as a TrainConfig attribute and only normalizes match\_adapter\_chance.
- Interactions: Overrides `train.match_adapter_chance`: When true and match\_adapter\_chance is zero, parsing raises the chance to 1.0. (all supported configurations)
- Aliases: none
- Example: `match_adapter_assist: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `match_adapter_assist` (`kwargs.get`)

<a id="train-match-adapter-chance"></a>
### `train.match_adapter_chance`

Sets the probability of matching the assistant adapter on an eligible batch.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.match_adapter_chance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Mixes assisted and unassisted passes within one run.
- Drawbacks: High probability can make the network depend on auxiliary adapter residuals.
- Interactions: none
- Aliases: none
- Example: `match_adapter_chance: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `match_adapter_chance` (`kwargs.get`)

<a id="train-match-noise-norm"></a>
### `train.match_noise_norm`

Matches sampled noise norm before loss construction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.match_noise_norm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can retain the model's learned brightness or magnitude distribution.
- Drawbacks: Norm matching removes natural variation and can bias the noise statistics.
- Interactions: none
- Aliases: none
- Example: `match_noise_norm: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `match_noise_norm` (`kwargs.get`)

<a id="train-max-cfg-scale"></a>
### `train.max_cfg_scale`

Sets the upper CFG scale used when random CFG is enabled.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_cfg_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.cfg_scale"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits cfg\_scale; explicit null is preserved and is not a numeric upper bound. (all supported configurations)
- Benefits: Bounds random guidance to a deliberate range.
- Drawbacks: A maximum below cfg\_scale or an excessive ceiling makes randomization unhelpful or unstable.
- Interactions: Constrains `train.cfg_scale`: Random CFG draws use cfg\_scale as the lower endpoint and max\_cfg\_scale as the upper endpoint. (all supported configurations)
- Aliases: none
- Example: `max_cfg_scale: 4.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_cfg_scale` (`kwargs.get`)

<a id="train-max-denoising-steps"></a>
### `train.max_denoising_steps`

Sets the highest denoising-step index eligible for sampled training timesteps.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_denoising_steps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Engine fallback: present as `999` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use a lower ceiling to avoid the noisiest part of a scheduler when a recipe calls for that focus.
- Drawbacks: A low ceiling risks weakening generation from heavily noised latents.
- Interactions: Constrains `train.min_denoising_steps`: The upper timestep bound is paired with the configured lower bound. (all supported configurations)
- Aliases: none
- Example: `max_denoising_steps: 999`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_denoising_steps` (`kwargs.get`)

<a id="train-max-grad-norm"></a>
### `train.max_grad_norm`

Clips ordinary optimizer gradients to the configured norm.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_grad_norm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Limits unusually large updates before non-fused optimizer steps.
- Drawbacks: Fused-backward optimizers update inside backward before this clipping point, so the limit cannot constrain those updates.
- Interactions: none
- Aliases: none
- Example: `max_grad_norm: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_grad_norm` (`kwargs.get`)

<a id="train-max-loss"></a>
### `train.max_loss`

Clips supported per-step loss values at a maximum.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_loss`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`)
- Architecture overrides: On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`
- Normalization: none
- Benefits: Can keep rare extreme losses from dominating an update.
- Drawbacks: Clipping can hide data or numerical failures and changes the objective above the cap.
- Interactions: none
- Aliases: none
- Example: `max_loss: 10.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_loss` (`kwargs.get`)

<a id="train-max-loss-debug"></a>
### `train.max_loss_debug`

Enables detailed diagnostics when loss exceeds the configured maximum.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_loss_debug`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Helps trace examples that create extreme loss values.
- Drawbacks: Additional diagnostics can be noisy and do not fix the underlying instability.
- Interactions: none
- Aliases: none
- Example: `max_loss_debug: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_loss_debug` (`kwargs.get`)

<a id="train-max-negative-prompts"></a>
### `train.max_negative_prompts`

Limits how many negative prompts are retained for supported CFG paths.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.max_negative_prompts`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Bounds negative-conditioning work and memory.
- Drawbacks: Too few negatives reduce variety; extra entries add encoding cost.
- Interactions: none
- Aliases: none
- Example: `max_negative_prompts: 1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `max_negative_prompts` (`kwargs.get`)

<a id="train-merge-network-on-save"></a>
### `train.merge_network_on_save`

Saves checkpoints with network weights merged into the base model.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.merge_network_on_save`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Produces a directly usable full-model checkpoint at save time.
- Drawbacks: Merged saves are larger and change how later checkpoints and pretrained networks are loaded.
- Interactions: none
- Aliases: none
- Example: `merge_network_on_save: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `merge_network_on_save` (`kwargs.get`)

<a id="train-merge-network-on-save-strength"></a>
### `train.merge_network_on_save_strength`

Sets the network strength used during merge-on-save.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.merge_network_on_save_strength`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows a merged checkpoint to bake in less than full adapter strength.
- Drawbacks: A nonunit strength changes the exported model relative to training-time behavior.
- Interactions: Requires `train.merge_network_on_save`: Merge strength is consumed while network weights are merged for saving. (all supported configurations)
- Aliases: none
- Example: `merge_network_on_save_strength: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `merge_network_on_save_strength` (`kwargs.get`)

<a id="train-min-denoising-steps"></a>
### `train.min_denoising_steps`

Sets the lowest denoising-step index eligible for sampled training timesteps.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.min_denoising_steps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Benefits: Use a higher floor to focus learning away from the cleanest end of the trajectory.
- Drawbacks: A restrictive floor risks leaving low-noise behavior under-trained.
- Interactions: Constrains `train.max_denoising_steps`: The lower timestep bound must not exceed the effective upper bound. (all supported configurations)
- Aliases: none
- Example: `min_denoising_steps: 0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `min_denoising_steps` (`kwargs.get`)

<a id="train-min-snr-gamma"></a>
### `train.min_snr_gamma`

Enables minimum-SNR loss weighting when set to a positive number.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.min_snr_gamma`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `positive-number` / `number`
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
- Benefits: Use a positive gamma to reduce domination by timesteps with extreme signal-to-noise ratios.
- Drawbacks: Poorly chosen weighting risks suppressing useful gradients from parts of the trajectory.
- Interactions: none
- Aliases: none
- Example: `min_snr_gamma: 5.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `min_snr_gamma` (`kwargs.get`)

<a id="train-negative-prompt"></a>
### `train.negative_prompt`

Provides one negative prompt or a file containing a prompt pool.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.negative_prompt`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string-or-path-or-null` / `string`
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
- Benefits: Adds reusable unconditional text for CFG-oriented training paths.
- Drawbacks: A file path is interpreted from the local filesystem and unsuitable negatives bias conditioning.
- Interactions: none
- Aliases: none
- Example: `negative_prompt: low quality`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `negative_prompt` (`kwargs.get`)

<a id="train-next-sample-timesteps"></a>
### `train.next_sample_timesteps`

Sets the shortened timestep count used by next-sample training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.next_sample_timesteps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Benefits: Use a small count when timestep\_type is next\_sample and the recipe needs a short denoising path.
- Drawbacks: Too few timesteps risk coarse targets; the value has no effect outside next-sample handling.
- Interactions: Requires `train.timestep_type`: This count is consumed when timestep\_type selects next\_sample. (all supported configurations)
- Aliases: none
- Example: `next_sample_timesteps: 8`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `next_sample_timesteps` (`kwargs.get`)

<a id="train-noise-multiplier"></a>
### `train.noise_multiplier`

Scales the primary sampled noise.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.noise_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows deliberate adjustment of noising strength in specialized recipes.
- Drawbacks: Departing from scheduler scale changes the training distribution.
- Interactions: none
- Aliases: none
- Example: `noise_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `noise_multiplier` (`kwargs.get`)

<a id="train-noise-offset"></a>
### `train.noise_offset`

Adds an offset component to sampled training noise.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.noise_offset`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can improve learning of very bright or dark image distributions.
- Drawbacks: Large offsets bias the model away from the scheduler's original noise process.
- Interactions: none
- Aliases: none
- Example: `noise_offset: 0.05`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `noise_offset` (`kwargs.get`)

<a id="train-noise-scheduler"></a>
### `train.noise_scheduler`

Selects the diffusion noise schedule used to add training noise.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.noise_scheduler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Engine fallback: present as `"ddpm"` (all supported configurations)
- Other runtime/default transitions: On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `"ddpm"` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `"ddpm"` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `"ddpm"` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `"ddpm"` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: none
- Benefits: Using the schedule expected by the base model keeps timestep and target calculations aligned.
- Drawbacks: A mismatched schedule risks training against a noise process the base model was not designed to reverse.
- Interactions: none
- Aliases: none
- Example: `noise_scheduler: ddpm`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `noise_scheduler` (`kwargs.get`)

<a id="train-noisy-latent-multiplier"></a>
### `train.noisy_latent_multiplier`

Scales latents after noise is applied.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.noisy_latent_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can match specialized model input magnitude conventions.
- Drawbacks: The multiplier alters the denoiser input without changing the nominal timestep.
- Interactions: none
- Aliases: none
- Example: `noisy_latent_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `noisy_latent_multiplier` (`kwargs.get`)

<a id="train-num-train-timesteps"></a>
### `train.num_train_timesteps`

Sets the training timestep domain used by supported flow and weighting paths.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.num_train_timesteps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Engine fallback: present as `1000` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use the base model's expected timestep count so sampled indices and scheduler scaling agree.
- Drawbacks: A mismatched count risks incorrect timestep normalization and out-of-range assumptions.
- Interactions: none
- Aliases: none
- Example: `num_train_timesteps: 1000`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `num_train_timesteps` (`kwargs.get`)

<a id="train-optimal-noise-pairing-samples"></a>
### `train.optimal_noise_pairing_samples`

Sets the candidate count for optimal noise pairing.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimal_noise_pairing_samples`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Multiple candidates can choose noise better matched to an image under the pairing heuristic.
- Drawbacks: More candidates increase preparation cost and can reduce stochastic diversity.
- Interactions: none
- Aliases: none
- Example: `optimal_noise_pairing_samples: 1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `optimal_noise_pairing_samples` (`kwargs.get`)

<a id="train-optimizer"></a>
### `train.optimizer`

Dispatches optimizer names by closed selectors: any name that starts with dadaptation and ends with adam or ends with lion constructs DAdaptLion, while exact bare dadaptation constructs deprecated DAdaptAdam and prints a migration warning. Automagic2 is always fused into backward; Automagic3 and AutomagicEXPERIMENT default to fused but accept fused=false for ordinary optimizer stepping.

- UI label: Optimizer
- Locations: Yaml `config.process[*].train.optimizer`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"adafactor"`, `"adagrad"`, `"adam"`, `"adam8"`, `"adam8bit"`, `"adamw"`, `"adamw8"`, `"adamw8bit"`, `"ademamix8bit"`, `"automagic"`, `"automagic2"`, `"automagic3"`, `"automagicexperiment"`, `"dadaptation"`, `"dadaptation*adam"`, `"dadaptation*lion"`, `"lion"`, `"lion8bit"`, `"prodigy*"`, `"prodigy8bit*"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"adafactor"`, `"adam"`, `"adamw"`, `"adamw8bit"`, `"automagic"`, `"automagic2"`, `"automagic3"`, `"prodigyopt"`, `"prodigy8bit"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"adamw"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes optimizer algorithm, optional-library, and adaptive learning-rate behavior explicit.
- Drawbacks: dadaptation, prodigyopt, bitsandbytes, and lion\_pytorch choices fail when unavailable; Prodigy branches and DAdaptation replace train.lr below 0.1 with 1.0. Automagic2 always fused bypasses ordinary gradient accumulation and pre-step gradient clipping. For AdamW8, optimizer\_params.decouple duplicates the dispatcher-injected decouple keyword and raises TypeError.
- Interactions: none
- Aliases: none
- Example: `optimizer: adamw`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `optimizer` (`kwargs.get`); `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adagrad` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam8` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam8bit` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8bit` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `ademamix8bit` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic2` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic3` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagicexperiment` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `dadaptation` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=adam` (`optimizer.registry_combined`); `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=lion` (`optimizer.registry_combined`); `toolkit/optimizer.py` :: `get_optimizer` :: `lion` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `lion8bit` (`optimizer.registry`); `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy` (`optimizer.registry_prefix`); `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy8bit` (`optimizer.registry_prefix`); `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__target=toolkit.optimizers.adafactor.Adafactor` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adagrad__target=torch.optim.Adagrad` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam__target=torch.optim.Adam` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam8__target=toolkit.optimizers.adam8bit.Adam8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adam8bit__target=bitsandbytes.optim.Adam8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw__target=torch.optim.AdamW` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8__target=toolkit.optimizers.adam8bit.Adam8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8bit__target=bitsandbytes.optim.AdamW8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `ademamix8bit__target=bitsandbytes.optim.AdEMAMix8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic__target=toolkit.optimizers.automagic.Automagic` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic2__target=toolkit.optimizers.automagic2.Automagic2` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic3__target=toolkit.optimizers.automagic3.Automagic3` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagicexperiment__target=toolkit.optimizers.automagicEXPERIMENT.AutomagicEXPERIMENT` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `dadaptation__target=dadaptation.DAdaptAdam` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=adam__target=dadaptation.DAdaptLion` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=lion__target=dadaptation.DAdaptLion` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `lion__target=lion_pytorch.Lion` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `lion8bit__target=bitsandbytes.optim.Lion8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy__target=prodigyopt.Prodigy` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy8bit__target=toolkit.optimizers.prodigy_8bit.Prodigy8bit` (`optimizer.dispatch_target`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic2` (`optimizer.fused_backward`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagic3` (`optimizer.fused_backward`); `toolkit/optimizer.py` :: `get_optimizer` :: `automagicexperiment` (`optimizer.fused_backward`)

<a id="train-optimizer-params"></a>
### `train.optimizer_params`

Passes optimizer-specific keyword arguments through dispatch.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: get\_optimizer replaces an omitted or explicit null optimizer\_params value with an empty object. (all supported configurations)
- Benefits: Exposes first-party optimizer controls without adding top-level TrainConfig fields.
- Drawbacks: Unknown or duplicate injected arguments raise constructor errors; external constructor surfaces are not finite.
- Interactions: Requires `train.optimizer`: The selected optimizer determines which keyword parameters are valid. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {weight_decay: 0.01}`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `optimizer_params` (`kwargs.get`)

<a id="train-paramiter-swapping-factor"></a>
### `train.paramiter_swapping_factor`

Sets the target fraction of parameters kept active during swapping.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.paramiter_swapping_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Engine fallback: present as `0.1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Trades active-gradient memory for sparser per-step parameter coverage.
- Drawbacks: A small fraction slows coverage and is ignored unless parameter swapping is enabled.
- Interactions: Requires `train.do_paramiter_swapping`: The factor is consumed only when parameter swapping is active. (all supported configurations)
- Aliases: none
- Example: `paramiter_swapping_factor: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `paramiter_swapping_factor` (`kwargs.get`)

<a id="train-pred-scaler"></a>
### `train.pred_scaler`

Scales model predictions before selected loss calculations.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.pred_scaler`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can tune detail emphasis in experimental objectives.
- Drawbacks: Prediction scaling changes loss magnitude and can require learning-rate retuning.
- Interactions: none
- Aliases: none
- Example: `pred_scaler: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `pred_scaler` (`kwargs.get`)

<a id="train-prompt-dropout-prob"></a>
### `train.prompt_dropout_prob`

Sets the probability of dropping text before encoding.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.prompt_dropout_prob`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
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
- Benefits: Builds robustness to missing conditioning and supplies unconditional examples.
- Drawbacks: Too much dropout weakens prompt alignment.
- Interactions: none
- Aliases: none
- Example: `prompt_dropout_prob: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `prompt_dropout_prob` (`kwargs.get`)

<a id="train-prompt-saturation-chance"></a>
### `train.prompt_saturation_chance`

Sets the chance of repeating a prompt to saturate the encoder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.prompt_saturation_chance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Can test stronger text-encoder activation for prompt-sensitive concepts.
- Drawbacks: Repeated text may create unnatural conditioning and token truncation.
- Interactions: none
- Aliases: none
- Example: `prompt_saturation_chance: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `prompt_saturation_chance` (`kwargs.get`)

<a id="train-random-noise-multiplier"></a>
### `train.random_noise_multiplier`

Adds random variation to the noise multiplier.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.random_noise_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
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
- Benefits: Broadens the noising strengths seen during training.
- Drawbacks: Extra randomness makes targets less reproducible and can exceed useful scale.
- Interactions: none
- Aliases: none
- Example: `random_noise_multiplier: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `random_noise_multiplier` (`kwargs.get`)

<a id="train-random-noise-shift"></a>
### `train.random_noise_shift`

Randomly shifts sampled noise values.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.random_noise_shift`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can diversify offset-like perturbations across batches.
- Drawbacks: Large shifts bias the noise mean and destabilize scheduler assumptions.
- Interactions: none
- Aliases: none
- Example: `random_noise_shift: 0.05`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `random_noise_shift` (`kwargs.get`)

<a id="train-refiner-lr"></a>
### `train.refiner_lr`

Overrides the learning rate for a trainable refiner component.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.refiner_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits train.lr; explicit null is preserved and is not a numeric learning rate. (all supported configurations)
- Benefits: Use 1e-5 for slow refinement updates when preserving the pretrained refiner is important.
- Drawbacks: A very small rate risks negligible change, while a larger one can over-specialize the refiner.
- Interactions: none
- Aliases: none
- Example: `refiner_lr: 1e-5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `refiner_lr` (`kwargs.get`)

<a id="train-reg-weight"></a>
### `train.reg_weight`

Scales loss from regularization images relative to ordinary training images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.reg_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use a lower or higher multiplier to tune how strongly prior-preservation examples affect updates.
- Drawbacks: Excessive regularization weight risks under-learning the target concept; too little risks forgetting.
- Interactions: none
- Aliases: none
- Example: `reg_weight: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `reg_weight` (`kwargs.get`)

<a id="train-sdp"></a>
### `train.sdp`

Enables PyTorch math, flash, and memory-efficient SDP backends globally.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.sdp`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Allows PyTorch to select among available scaled-dot-product attention kernels.
- Drawbacks: Global backend changes are hardware-dependent and can overlap other attention controls.
- Interactions: none
- Aliases: none
- Example: `sdp: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `sdp` (`kwargs.get`)

<a id="train-short-and-long-captions"></a>
### `train.short_and_long_captions`

Duplicates eligible non-regularization items with short and long captions.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.short_and_long_captions`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Trains prompt behavior from both concise and detailed descriptions.
- Drawbacks: It doubles the logical batch and requires datasets prepared with both caption forms.
- Interactions: Affects `train.batch_size`: Eligible items are doubled, increasing the logical batch presented to training. (all supported configurations)
- Aliases: none
- Example: `short_and_long_captions: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `short_and_long_captions` (`kwargs.get`)

<a id="train-short-and-long-captions-encoder-split"></a>
### `train.short_and_long_captions_encoder_split`

Sends short and long caption forms to separate SDXL text encoders.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.short_and_long_captions_encoder_split`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can specialize the two SDXL encoders on complementary caption lengths.
- Drawbacks: The flag is limited to SDXL handling and does not duplicate captions by itself.
- Interactions: Affects `train.short_and_long_captions`: Encoder splitting chooses caption forms per SDXL encoder and does not itself enable duplication. (all supported configurations)
- Aliases: none
- Example: `short_and_long_captions_encoder_split: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `short_and_long_captions_encoder_split` (`kwargs.get`)

<a id="train-show-turbo-outputs"></a>
### `train.show_turbo_outputs`

Shows raw Turbo outputs in the sampling path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.show_turbo_outputs`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Makes Turbo-specific behavior visible during qualitative evaluation.
- Drawbacks: It has no training effect without train\_turbo and adds sample work.
- Interactions: Requires `train.train_turbo`: Raw Turbo output display is reached only in Turbo sampling. (all supported configurations)
- Aliases: none
- Example: `show_turbo_outputs: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `show_turbo_outputs` (`kwargs.get`)

<a id="train-signal-amplification-strength"></a>
### `train.signal_amplification_strength`

Sets the strength used when signal amplification is enabled.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.signal_amplification_strength`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.5` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows the experimental signal boost to be tuned gradually.
- Drawbacks: High strength magnifies artifacts along with useful signal.
- Interactions: none
- Aliases: none
- Example: `signal_amplification_strength: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `signal_amplification_strength` (`kwargs.get`)

<a id="train-signal-correction-noise-scale"></a>
### `train.signal_correction_noise_scale`

Scales the correction-noise term.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.signal_correction_noise_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls how much signal correction changes the sampled noise.
- Drawbacks: Large values can overwhelm the scheduler noise.
- Interactions: none
- Aliases: none
- Example: `signal_correction_noise_scale: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `signal_correction_noise_scale` (`kwargs.get`)

<a id="train-single-item-batching"></a>
### `train.single_item_batching`

Forces supported batching tricks to process one item at a time while accumulating gradients.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.single_item_batching`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Use single-item batching when a training method expands a logical batch but needs isolated forwards.
- Drawbacks: Serializing items risks lower throughput and still accumulates their gradients before the update.
- Interactions: none
- Aliases: none
- Example: `single_item_batching: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `single_item_batching` (`kwargs.get`)

<a id="train-skip-first-sample"></a>
### `train.skip_first_sample`

Skips automatic sample generation at the first training step.

- UI label: Skip First Sample
- Locations: Yaml `config.process[*].train.skip_first_sample`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Starts optimization sooner when a baseline sample is unnecessary.
- Drawbacks: Without an initial sample there is no direct visual before-and-after reference.
- Interactions: Overrides `train.force_first_sample`: skip\_first\_sample is checked before force\_first\_sample in initial sampling logic. (all supported configurations)
- Aliases: none
- Example: `skip_first_sample: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `skip_first_sample` (`kwargs.get`)

<a id="train-snr-gamma"></a>
### `train.snr_gamma`

Enables SNR-based loss weighting with the configured gamma.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.snr_gamma`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `positive-number` / `number`
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
- Benefits: Use SNR weighting when balancing timestep contributions is more useful than uniform loss.
- Drawbacks: An aggressive gamma risks shifting learning away from timesteps important to the target model.
- Interactions: none
- Aliases: none
- Example: `snr_gamma: 5.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `snr_gamma` (`kwargs.get`)

<a id="train-standardize-images"></a>
### `train.standardize_images`

Standardizes image inputs to reference mean and variance.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.standardize_images`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can align atypical datasets with expected input statistics.
- Drawbacks: Standardization changes colors and contrast when the model did not expect it.
- Interactions: none
- Aliases: none
- Example: `standardize_images: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `standardize_images` (`kwargs.get`)

<a id="train-standardize-latents"></a>
### `train.standardize_latents`

Standardizes encoded latents before training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.standardize_latents`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can compensate for latent statistics that differ from the model baseline.
- Drawbacks: It changes the latent distribution and may conflict with fixed VAE scaling.
- Interactions: none
- Aliases: none
- Example: `standardize_latents: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `standardize_latents` (`kwargs.get`)

<a id="train-start-step"></a>
### `train.start_step`

Overrides the initial step counter before the training loop starts.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.start_step`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A non-null value sets the loop counter directly; it does not locate LoRA weights or optimizer.pt. Optimizer auto-discovery is path-based at the save root: if optimizer.pt exists and its state is structurally loadable, it can load with no checkpoint, no step, and no provenance binding. The did\_change\_weights guard is only set for LoRA rank-shape conversion, not general weight changes. A stale optimizer state can therefore load, and a load failure merely logs and continues; it is the user responsibility to align weights, step, and save root. (all supported configurations)
- Benefits: Use start\_step when deliberately resuming step-sensitive scheduling from a known counter.
- Drawbacks: A mismatched counter risks skipped work, shifted sampling, and scheduler state that disagrees with checkpoints.
- Interactions: Constrains `train.steps`: start\_step changes the initial counter used by the loop and must remain meaningful relative to the target step count. (all supported configurations); Affects `network.pretrained_lora_path`: Resume progression is coherent only when the user aligns the explicit counter and weights while intentionally choosing the same job name/training folder for save-root optimizer discovery. (all supported configurations)
- Aliases: none
- Example: `start_step: 1200`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `start_step` (`kwargs.get`)

<a id="train-steps"></a>
### `train.steps`

Sets the target number of optimizer steps for the run.

- UI label: Steps
- Locations: Yaml `config.process[*].train.steps`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1000` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use a larger step budget when the dataset and validation samples still improve without overfitting.
- Drawbacks: Long schedules risk overfitting and resume behavior depends on the saved step counter.
- Interactions: Affects `train.start_step`: The loop runs from the effective starting counter toward train.steps, so resumed counters reduce remaining iterations. (all supported configurations)
- Aliases: none
- Example: `steps: 3000`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `steps` (`kwargs.get`)

<a id="train-switch-boundary-every"></a>
### `train.switch_boundary_every`

Sets how often multi-stage training switches the active model boundary.

- UI label: Switch Every
- Locations: Yaml `config.process[*].train.switch_boundary_every`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use 1 to alternate at every supported boundary opportunity or a larger interval for longer stage runs.
- Drawbacks: A long interval risks imbalanced stage updates; the setting is inert for single-stage models.
- Interactions: none
- Aliases: none
- Example: `switch_boundary_every: 1`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `switch_boundary_every` (`kwargs.get`)

<a id="train-t0-loss-target"></a>
### `train.t0_loss_target`

Adds a target based on prediction at timestep zero.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.t0_loss_target`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can directly supervise the fully denoised endpoint.
- Drawbacks: The extra target increases compute and may compete with the sampled-timestep objective.
- Interactions: none
- Aliases: none
- Example: `t0_loss_target: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `t0_loss_target` (`kwargs.get`)

<a id="train-t0-velocity-equiv-weight"></a>
### `train.t0_velocity_equiv_weight`

Applies velocity-equivalent weighting to the timestep-zero loss.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.t0_velocity_equiv_weight`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can align the endpoint objective with velocity prediction scaling.
- Drawbacks: Specialized weighting complicates comparison with ordinary t0 loss.
- Interactions: none
- Aliases: none
- Example: `t0_velocity_equiv_weight: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `t0_velocity_equiv_weight` (`kwargs.get`)

<a id="train-target-noise-multiplier"></a>
### `train.target_noise_multiplier`

Scales noise used in target construction independently of input noise.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.target_noise_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allows experimental target magnitude adjustment.
- Drawbacks: Different input and target scales can create inconsistent denoising supervision.
- Interactions: none
- Aliases: none
- Example: `target_noise_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `target_noise_multiplier` (`kwargs.get`)

<a id="train-target-norm-std"></a>
### `train.target_norm_std`

Enables target standard-deviation correction when set.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.target_norm_std`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can encourage predictions toward a chosen output spread.
- Drawbacks: Forcing a target spread can remove useful variation or destabilize normalization.
- Interactions: none
- Aliases: none
- Example: `target_norm_std: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `target_norm_std` (`kwargs.get`)

<a id="train-target-norm-std-value"></a>
### `train.target_norm_std_value`

Sets the desired standard deviation for target-norm correction.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.target_norm_std_value`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides the numeric endpoint used by the correction path.
- Drawbacks: A mismatched value biases output contrast or magnitude.
- Interactions: Requires `train.target_norm_std`: The target value is used when target standard-deviation correction is enabled. (all supported configurations)
- Aliases: none
- Example: `target_norm_std_value: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `target_norm_std_value` (`kwargs.get`)

<a id="train-text-encoder-lr"></a>
### `train.text_encoder_lr`

Parses a text-encoder-specific learning-rate value, but the diffusion trainer does not consume this field.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.text_encoder_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits train.lr; explicit null is preserved and is not a numeric learning rate. (all supported configurations)
- Benefits: The literal 2e-5 records a cautious comparison tier; use train.lr for the active optimizer learning rate.
- Drawbacks: This unconsumed value has no effect on current diffusion training, which risks misleading readers who expect a text-encoder override.
- Interactions: none
- Aliases: none
- Example: `text_encoder_lr: 2e-5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `text_encoder_lr` (`kwargs.get`)

<a id="train-timestep-type"></a>
### `train.timestep_type`

Selects the supported timestep sampling strategy.

- UI label: Timestep Type
- Locations: Yaml `config.process[*].train.timestep_type`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"sigmoid"`, `"linear"`, `"lognorm_blend"`, `"next_sample"`, `"weighted"`, `"one_step"`, `"two_step"`, `"four_step"`, `"eight_step"`, `"shift"`, `"flux_shift"`, `"lumina2_shift"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"sigmoid"`, `"linear"`, `"shift"`, `"weighted"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"sigmoid"` (all supported configurations)
- Other runtime/default transitions: On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `"shift"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `"shift"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"weighted"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Select present as `"linear"` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `"sigmoid"` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `"shift"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `"shift"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"weighted"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Select present as `"linear"` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `"sigmoid"` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: none
- Benefits: Use sigmoid for the engine fallback or a model-compatible specialized strategy for deliberate trajectory emphasis.
- Drawbacks: An unsupported or model-incompatible strategy risks a runtime ValueError or poorly distributed training noise.
- Interactions: none
- Aliases: none
- Example: `timestep_type: sigmoid`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `timestep_type` (`kwargs.get`)

<a id="train-train-refiner"></a>
### `train.train_refiner`

Includes an available refiner network in trainable parameter groups.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.train_refiner`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Allows refiner behavior to adapt alongside the primary denoiser.
- Drawbacks: It has no effect without a refiner and increases trainable state when one is loaded.
- Interactions: none
- Aliases: none
- Example: `train_refiner: true`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `train_refiner` (`kwargs.get`)

<a id="train-train-text-encoder"></a>
### `train.train_text_encoder`

Includes supported text-encoder parameters in training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.train_text_encoder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can adapt how prompts represent a new concept or trigger.
- Drawbacks: It increases memory and conflicts with unloading, text-embedding caches, and differential preservation.
- Interactions: Conflicts `train.unload_text_encoder`: A text encoder cannot be trained after it is moved out of the active training path. (all supported configurations); Conflicts `train.cache_text_embeddings`: Static cached embeddings cannot reflect text-encoder parameter updates. (all supported configurations); Conflicts `train.diff_output_preservation`: SDTrainer explicitly rejects differential preservation with text-encoder training. (all supported configurations)
- Aliases: none
- Example: `train_text_encoder: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `train_text_encoder` (`kwargs.get`)

<a id="train-train-turbo"></a>
### `train.train_turbo`

Switches supported loss and target paths to Turbo training behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.train_turbo`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Enables fine-tuning recipes for compatible distilled Turbo models.
- Drawbacks: Several ordinary targets assert against Turbo mode, including inverted-mask prior handling.
- Interactions: Conflicts `train.inverted_mask_prior`: Inverted-mask prior code asserts that train\_turbo is false. (all supported configurations); Affects `train.show_turbo_outputs`: Raw Turbo output display is reached only when both settings are enabled. (all supported configurations)
- Aliases: none
- Example: `train_turbo: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `train_turbo` (`kwargs.get`)

<a id="train-train-unet"></a>
### `train.train_unet`

Includes the primary denoising network in trainable parameter groups.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.train_unet`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Provides the usual target for LoRA and fine-tuning updates.
- Drawbacks: Disabling it leaves learning to other explicitly enabled components.
- Interactions: none
- Aliases: none
- Example: `train_unet: true`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `train_unet` (`kwargs.get`)

<a id="train-unconditional-prompt"></a>
### `train.unconditional_prompt`

Sets the unconditional text used by guidance loss.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.unconditional_prompt`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
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
- Benefits: Allows guidance training to use a deliberate negative or empty baseline.
- Drawbacks: A semantically loaded baseline changes what the guidance difference means.
- Interactions: none
- Aliases: none
- Example: `unconditional_prompt: low quality`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `unconditional_prompt` (`kwargs.get`)

<a id="train-unet-lr"></a>
### `train.unet_lr`

Parses a denoiser-specific learning-rate value, but the diffusion trainer does not consume this field.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.unet_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"train.lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission inherits train.lr; explicit null is preserved and is not a numeric learning rate. (all supported configurations)
- Benefits: The literal 5e-5 records a cautious comparison tier; use train.lr for the active optimizer learning rate.
- Drawbacks: This unconsumed value has no effect on current diffusion training, which risks misleading readers who expect a denoiser override.
- Interactions: none
- Aliases: none
- Example: `unet_lr: 5e-5`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `unet_lr` (`kwargs.get`)

<a id="train-unload-text-encoder"></a>
### `train.unload_text_encoder`

Caches static prompt embeddings and moves the text encoder off the accelerator.

- UI label: Unload TE
- Locations: Yaml `config.process[*].train.unload_text_encoder`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Reduces VRAM use when prompt embeddings will not change.
- Drawbacks: It rejects text-encoder training and limits dynamic prompt behavior to cached values.
- Interactions: Conflicts `train.train_text_encoder`: SDTrainer raises before unloading when text-encoder training is enabled. (all supported configurations); Affects `train.cache_text_embeddings`: Dataset text caches also cause the text encoder to be unloaded after prompt caching. (all supported configurations)
- Aliases: none
- Example: `unload_text_encoder: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `unload_text_encoder` (`kwargs.get`)

<a id="train-validation-item-image-path"></a>
### `train.validation.item.image_path`

Points to the fixed image encoded for one validation case.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.validation_config.validation_items[*].image_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `existing-image-path` / `path`
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
- Benefits: Makes each validation item's image path explicit and repeatable.
- Drawbacks: An empty or missing path causes the item to be skipped.
- Interactions: none
- Aliases: none
- Example: `image_path: /workspace/validation.png`
- Source symbols: `toolkit/config_modules.py` :: `ValidationItem.__init__` :: `image_path` (`kwargs.get`)

<a id="train-validation-item-prompt"></a>
### `train.validation.item.prompt`

Sets the prompt paired with this validation image.

- UI label: Prompt
- Locations: Yaml `config.process[*].train.validation_config.validation_items[*].prompt`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `""` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes each validation item's prompt explicit and repeatable.
- Drawbacks: A prompt unrelated to the image makes the validation loss harder to interpret.
- Interactions: none
- Aliases: none
- Example: `prompt: a portrait photo`
- Source symbols: `toolkit/config_modules.py` :: `ValidationItem.__init__` :: `prompt` (`kwargs.get`)

<a id="train-validation-resolution"></a>
### `train.validation.resolution`

Sets the square resolution used to cache and compare validation latents.

- UI label: Validation Resolution
- Locations: Yaml `config.process[*].train.validation_config.resolution`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[64, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes resolution explicit for repeatable validation checks.
- Drawbacks: Higher resolution increases validation memory and time and must suit the model.
- Interactions: none
- Aliases: none
- Example: `resolution: 512`
- Source symbols: `toolkit/config_modules.py` :: `ValidationConfig.__init__` :: `resolution` (`kwargs.get`)

<a id="train-validation-validate-every-n-steps"></a>
### `train.validation.validate_every_n_steps`

Sets the optimizer-step interval between validation loss evaluations.

- UI label: Validate Every
- Locations: Yaml `config.process[*].train.validation_config.validate_every_n_steps`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `10` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Zero or explicit null is preserved and falsey at the truthiness guard, so either value disables periodic validation cadence, but initial validation still runs when the current step equals start\_step. (all supported configurations)
- Benefits: Makes validate every n steps explicit for repeatable validation checks.
- Drawbacks: Short intervals add repeated validation work and slow training.
- Interactions: none
- Aliases: none
- Example: `validate_every_n_steps: 10`
- Source symbols: `toolkit/config_modules.py` :: `ValidationConfig.__init__` :: `validate_every_n_steps` (`kwargs.get`)

<a id="train-validation-validation-items"></a>
### `train.validation.validation_items`

Lists fixed images and prompts used for validation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.validation_config.validation_items`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `validation-item-list` / `object-list`
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
- Normalization: Mapping items are converted to ValidationItem objects; existing ValidationItem objects are retained. (all supported configurations)
- Benefits: Makes validation items explicit for repeatable validation checks.
- Drawbacks: Missing or invalid image items are skipped, and an empty usable list disables validation.
- Interactions: none
- Aliases: none
- Example: `validation_items: [{image_path: /workspace/val.png, prompt: "a portrait"}]`
- Source symbols: `toolkit/config_modules.py` :: `ValidationConfig.__init__` :: `validation_items` (`kwargs.get`)

<a id="train-validation-validation-sigmas"></a>
### `train.validation.validation_sigmas`

Lists noise sigma levels evaluated for each validation item.

- UI label: Validation Sigmas
- Locations: Yaml `config.process[*].train.validation_config.validation_sigmas`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number-list` / `sigma-list` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number-list`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `[0.5]`, `[1,0.5]`, `[1,0.66,0.33]`, `[1,0.75,0.5,0.25]`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `[1,0.75,0.5,0.25]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes validation sigmas explicit for repeatable validation checks.
- Drawbacks: More sigma levels multiply validation work; unsuitable levels may not represent the training regime.
- Interactions: none
- Aliases: none
- Example: `validation_sigmas: [1.0, 0.5, 0.25]`
- Source symbols: `toolkit/config_modules.py` :: `ValidationConfig.__init__` :: `validation_sigmas` (`kwargs.get`)

<a id="train-validation-config"></a>
### `train.validation_config`

Constructs the optional in-training validation configuration.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.validation_config`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `object-or-null` / `object`
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
- Benefits: Runs configured validation items on a step interval after successful batches.
- Drawbacks: Validation adds model work and an invalid nested object fails ValidationConfig construction.
- Interactions: none
- Aliases: none
- Example: `validation_config: {validate_every_n_steps: 10, resolution: 512}`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `validation_config` (`kwargs.get`)

<a id="train-weight-jitter"></a>
### `train.weight_jitter`

Parses weight\_jitter on TrainConfig, but current diffusion training leaves this field unconsumed.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.weight_jitter`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Keeping 0.0 makes the parsed value explicit while acknowledging that it has no effect in the diffusion trainer.
- Drawbacks: A nonzero value has no effect here; similarly named slider-trainer fields are separate consumers and do not consume TrainConfig.weight\_jitter.
- Interactions: none
- Aliases: none
- Example: `weight_jitter: 0.0`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `weight_jitter` (`kwargs.get`)

<a id="train-xformers"></a>
### `train.xformers`

Enables xFormers memory-efficient attention on supported modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.xformers`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `train` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by kwargs.get and remains falsey wherever downstream code uses this value as a condition. (all supported configurations)
- Benefits: Can reduce attention memory on installations with compatible xFormers kernels.
- Drawbacks: It requires xFormers support and can overlap the explicit attention-backend setting.
- Interactions: Affects `train.attention_backend`: xFormers is enabled before an explicit non-native attention backend is requested. (all supported configurations)
- Aliases: none
- Example: `xformers: false`
- Source symbols: `toolkit/config_modules.py` :: `TrainConfig.__init__` :: `xformers` (`kwargs.get`)

<a id="ui.job-loss-graph.clip-outliers"></a>
### `ui.job-loss-graph.clip-outliers`

Persists the clip outliers preference for the loss graph under the current job URL.

- UI label: Clip outliers
- Locations: Ui State `browser.localStorage.jobLossGraph.clipOutliers`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.clipOutliers: false`
- Source symbols: none

<a id="ui.job-loss-graph.enabled"></a>
### `ui.job-loss-graph.enabled`

Persists the visible loss series preference for the loss graph under the current job URL.

- UI label: Visible loss series
- Locations: Ui State `browser.localStorage.jobLossGraph.enabled`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `string-boolean-map` / `object`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `object`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `{}` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: An absent entry means the series is enabled; only an explicit false value hides a loss series. (all supported configurations)
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.enabled: {}`
- Source symbols: none

<a id="ui.job-loss-graph.plot-stride"></a>
### `ui.job-loss-graph.plot-stride`

Persists the plot stride preference for the loss graph under the current job URL.

- UI label: Plot stride
- Locations: Ui State `browser.localStorage.jobLossGraph.plotStride`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `number-integer-coerced-minimum-1` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; `[1, 20]`; none
- UI normalization scales: none
- UI-created value: present as `1` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The slider writes 1 through 20; rendering coerces the stored number to an integer and enforces a minimum stride of one. (all supported configurations)
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.plotStride: 1`
- Source symbols: none

<a id="ui.job-loss-graph.show-trend"></a>
### `ui.job-loss-graph.show-trend`

Persists the trend preference for the loss graph under the current job URL.

- UI label: Trend
- Locations: Ui State `browser.localStorage.jobLossGraph.showTrend`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `true` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.showTrend: true`
- Source symbols: none

<a id="ui.job-loss-graph.smoothing"></a>
### `ui.job-loss-graph.smoothing`

Persists the smoothing preference for the loss graph under the current job URL.

- UI label: Smoothing
- Locations: Ui State `browser.localStorage.jobLossGraph.smoothing`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `number-normalized-to-0-through-100` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; `[0, 100]`; none
- UI normalization scales: none
- UI-created value: present as `80` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The slider writes 0 through 100; rendering divides by 100 and clamps the effective smoothing factor to that interval. (all supported configurations)
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.smoothing: 80`
- Source symbols: none

<a id="ui.job-loss-graph.use-log-scale"></a>
### `ui.job-loss-graph.use-log-scale`

Persists the log y preference for the loss graph under the current job URL.

- UI label: Log Y
- Locations: Ui State `browser.localStorage.jobLossGraph.useLogScale`
- Surfaces: `simple-ui`
- UI projection: none
- Scope/lifecycle: `ui-state` / `supported`
- Persistence/authority: `browser-storage` / `user`
- Applies to: all supported configurations
- Parser/supported/example types: `ui-state` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (all supported configurations)
- Engine fallback: not declared
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Restores this graph preference when the same job URL is opened again.
- Drawbacks: The preference is browser-local and does not alter training or synchronize to another browser.
- Interactions: none
- Aliases: none
- Example: `browser.localStorage.jobLossGraph.useLogScale: false`
- Source symbols: none
<!-- settings-catalog:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
