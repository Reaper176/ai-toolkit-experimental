# Saving and sampling settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This page covers checkpoint, validation, preview, and sampling settings assigned here by the catalog. UI-created schedules and engine fallbacks are shown separately, including absence as a meaningful state, so a generated job value is never confused with runtime fallback behavior.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Saving And Sampling

<a id="process-first-sample"></a>
### `process.first_sample`

Optional sampling overrides used only for the initial sample.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].first_sample`
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
- Benefits: Lets the first baseline sample differ from recurring samples.
- Drawbacks: A second sample configuration increases the chance of incomparable evaluation settings.
- Interactions: none
- Aliases: none
- Example: `first_sample: null`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `first_sample` (`get_conf`)

<a id="process-sample"></a>
### `process.sample`

Recurring sample configuration forwarded to SampleConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample`
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
- Benefits: Provides comparable progress images or media during training.
- Drawbacks: Sampling pauses training work and consumes memory and compute.
- Interactions: none
- Aliases: none
- Example: `sample: {}`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `sample` (`get_conf`)

<a id="sample-adapter-conditioning-scale"></a>
### `sample.adapter_conditioning_scale`

Scales adapter or ControlNet conditioning during generated samples.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.adapter_conditioning_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Benefits: Lets evaluation match the intended conditioning strength.
- Drawbacks: Excessive conditioning can dominate the prompt or amplify artifacts.
- Interactions: none
- Aliases: none
- Example: `adapter_conditioning_scale: 1`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `adapter_conditioning_scale` (`kwargs.get`)

<a id="sample-do-cfg-norm"></a>
### `sample.do_cfg_norm`

Enables classifier-free-guidance normalization for models that implement it.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.do_cfg_norm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can reduce overexposed guided samples on supported models.
- Drawbacks: It is model-specific and can change sample comparability.
- Interactions: none
- Aliases: none
- Example: `do_cfg_norm: false`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `do_cfg_norm` (`kwargs.get`)

<a id="sample-extra-values"></a>
### `sample.extra_values`

Supplies auxiliary numeric conditioning values to adapters that consume them.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.extra_values`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number-list` / `number-list` / `number-list`
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
- Benefits: Enables evaluation of adapters trained with extra conditioning channels.
- Drawbacks: The value count must match the adapter expectation.
- Interactions: none
- Aliases: none
- Example: `extra_values: []`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `extra_values` (`kwargs.get`)

<a id="sample-format"></a>
### `sample.format`

Chooses the image or animation file extension for samples.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.format`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"jpg"`, `"png"`, `"webp"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"jpg"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When num\_frames is greater than one, non-WebP formats are changed to animated WebP. (all supported configurations)
- Benefits: Matches sample output to quality and animation needs.
- Drawbacks: Lossy JPEG can hide detail, while animated output is larger.
- Interactions: Affects `sample.num_frames`: Multiple frames force animated WebP output. (all supported configurations)
- Aliases: none
- Example: `format: jpg`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `format` (`kwargs.get`)

<a id="sample-fps"></a>
### `sample.fps`

Sets playback frames per second for animated samples.

- UI label: FPS
- Locations: Yaml `config.process[*].sample.fps`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `16` (all supported configurations)
- Other runtime/default transitions: On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Controls the review speed of generated video samples.
- Drawbacks: It changes playback timing rather than the generated frame content.
- Interactions: none
- Aliases: none
- Example: `fps: 16`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `fps` (`kwargs.get`)

<a id="sample-guidance-rescale"></a>
### `sample.guidance_rescale`

Rescales classifier-free guidance to limit overexposure.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.guidance_rescale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can retain guidance while moderating extreme predictions.
- Drawbacks: Unsupported pipelines may ignore it and aggressive values alter prompt adherence.
- Interactions: none
- Aliases: none
- Example: `guidance_rescale: 0`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `guidance_rescale` (`kwargs.get`)

<a id="sample-guidance-scale"></a>
### `sample.guidance_scale`

Sets classifier-free guidance strength for recurring samples.

- UI label: Guidance Scale
- Locations: Yaml `config.process[*].sample.guidance_scale`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `4` (process_type=`diffusion_trainer`)
- Engine fallback: present as `7` (all supported configurations)
- Other runtime/default transitions: On Select present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `4` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `4` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `6` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `6` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `3` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `4` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `4` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `4` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `6` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `6` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `3` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `4` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: none
- Benefits: Controls how strongly samples follow the prompt.
- Drawbacks: High values can oversaturate or reduce natural variation.
- Interactions: none
- Aliases: none
- Example: `guidance_scale: 7`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `guidance_scale` (`kwargs.get`)

<a id="sample-height"></a>
### `sample.height`

Sets the requested sample height in pixels.

- UI label: Height
- Locations: Yaml `config.process[*].sample.height`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `1024` (process_type=`diffusion_trainer`)
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `2048` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `512` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `2048` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `512` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Lets evaluation use a model-appropriate aspect ratio.
- Drawbacks: Large heights increase memory and generation time and may be rounded by the model.
- Interactions: none
- Aliases: none
- Example: `height: 512`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `height` (`kwargs.get`)

<a id="sample-item-ctrl-idx"></a>
### `sample.item.ctrl_idx`

Selects which control input slot this sample item addresses.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].ctrl_idx`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Benefits: Targets the intended control stream for multi-control models.
- Drawbacks: An index unsupported by the model can select no useful control.
- Interactions: none
- Aliases: none
- Example: `ctrl_idx: 0`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `ctrl_idx` (`kwargs.get`)

<a id="sample-item-ctrl-img"></a>
### `sample.item.ctrl_img`

Sets the primary control image for this sample item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].ctrl_img`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
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
- Normalization: Changing to an architecture without sample.ctrl\_img deletes ctrl\_img from every sample item. (all supported configurations)
- Benefits: Evaluates conditioning against a fixed reference input.
- Drawbacks: A missing or incompatible image prevents meaningful controlled evaluation.
- Interactions: none
- Aliases: none
- Example: `ctrl_img: control.png`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `ctrl_img` (`kwargs.get`)

<a id="sample-item-ctrl-img-1"></a>
### `sample.item.ctrl_img_1`

Sets control image slot one, falling back to the primary control image.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].ctrl_img_1`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"sample item ctrl_img"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports models with explicitly numbered control inputs.
- Drawbacks: Duplicated or misordered control images can obscure which condition is active.
- Interactions: Fallback `sample.item.ctrl_img`: When omitted, this item uses sample.item.ctrl\_img. (all supported configurations)
- Aliases: none
- Example: `ctrl_img_1: control.png`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `ctrl_img_1` (`kwargs.get`)

<a id="sample-item-ctrl-img-2"></a>
### `sample.item.ctrl_img_2`

Sets the optional second control image.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].ctrl_img_2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
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
- Benefits: Exercises a model's second control condition.
- Drawbacks: It has no effect for models without that control slot.
- Interactions: none
- Aliases: none
- Example: `ctrl_img_2: control.png`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `ctrl_img_2` (`kwargs.get`)

<a id="sample-item-ctrl-img-3"></a>
### `sample.item.ctrl_img_3`

Sets the optional third control image.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].ctrl_img_3`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
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
- Benefits: Exercises a model's third control condition.
- Drawbacks: It has no effect for models without that control slot.
- Interactions: none
- Aliases: none
- Example: `ctrl_img_3: control.png`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `ctrl_img_3` (`kwargs.get`)

<a id="sample-item-do-cfg-norm"></a>
### `sample.item.do_cfg_norm`

Parses and stores an item-level classifier-free-guidance normalization flag that current sampling code does not consume.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].do_cfg_norm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: This value is parsed and stored on SampleItem, but the sampling process never reads it and instead forwards the top-level sample.do\_cfg\_norm value, so this per-item field is unconsumed and has no runtime effect. (all supported configurations)
- Benefits: Documents the inert field so configurations do not imply an item-level override that does not exist.
- Drawbacks: Changing it has no runtime effect; only the top-level sample.do\_cfg\_norm value is forwarded.
- Interactions: Affects `sample.do_cfg_norm`: Use sample.do\_cfg\_norm for the consumed CFG-normalization control; this stored item-level value does not override it. (all supported configurations)
- Aliases: none
- Example: `do_cfg_norm: false`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `do_cfg_norm` (`kwargs.get`)

<a id="sample-item-fps"></a>
### `sample.item.fps`

Overrides animation playback rate for this item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].fps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Engine fallback: present as `{"expression":"sample.fps"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tests a different playback rate without changing every sample.
- Drawbacks: It changes playback timing, not generated motion.
- Interactions: Fallback `sample.fps`: When omitted, this item uses sample.fps. (all supported configurations)
- Aliases: none
- Example: `fps: 24`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `fps` (`kwargs.get`)

<a id="sample-item-guidance-scale"></a>
### `sample.item.guidance_scale`

Overrides classifier-free guidance strength for this item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].guidance_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Engine fallback: present as `{"expression":"sample.guidance_scale"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tests prompt adherence at an item-specific strength.
- Drawbacks: Different strengths make direct visual comparisons less controlled.
- Interactions: Fallback `sample.guidance_scale`: When omitted, this item uses sample.guidance\_scale. (all supported configurations)
- Aliases: none
- Example: `guidance_scale: 4.0`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `guidance_scale` (`kwargs.get`)

<a id="sample-item-height"></a>
### `sample.item.height`

Overrides output height for this item.

- UI label: Height
- Locations: Yaml `config.process[*].sample.samples[*].height`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `integer`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"sample.height"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports fixed evaluation at multiple aspect ratios.
- Drawbacks: Larger sizes increase generation memory and time.
- Interactions: Fallback `sample.height`: When omitted, this item uses sample.height. (all supported configurations)
- Aliases: none
- Example: `height: 1024`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `height` (`kwargs.get`)

<a id="sample-item-neg"></a>
### `sample.item.neg`

Overrides the shared negative prompt for this item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].neg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-or-boolean` / `negative-prompt-or-false` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"sample.neg"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Targets item-specific unwanted traits.
- Drawbacks: A broad negative prompt can suppress intended content.
- Interactions: Fallback `sample.neg`: When omitted, this item uses sample.neg. (all supported configurations)
- Aliases: none
- Example: `neg: low quality`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `neg` (`kwargs.get`)

<a id="sample-item-network-multiplier"></a>
### `sample.item.network_multiplier`

Overrides trained-network strength for this item.

- UI label: LoRA Scale
- Locations: Yaml `config.process[*].sample.samples[*].network_multiplier`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"sample.network_multiplier"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A string value is converted to float; conversion failure prints a warning and uses 1.0. (all supported configurations)
- Benefits: Compares the learned effect at a chosen multiplier.
- Drawbacks: A deployment-mismatched value can misrepresent progress.
- Interactions: Fallback `sample.network_multiplier`: When omitted, this item uses sample.network\_multiplier. (all supported configurations)
- Aliases: none
- Example: `network_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `network_multiplier` (`kwargs.get`)

<a id="sample-item-num-frames"></a>
### `sample.item.num_frames`

Overrides generated frame count for this item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].num_frames`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Engine fallback: present as `{"expression":"sample.num_frames"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Evaluates a specific temporal length.
- Drawbacks: More frames increase generation memory and time.
- Interactions: Fallback `sample.num_frames`: When omitted, this item uses sample.num\_frames. (all supported configurations)
- Aliases: none
- Example: `num_frames: 1`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `num_frames` (`kwargs.get`)

<a id="sample-item-prompt"></a>
### `sample.item.prompt`

Sets the positive prompt for this sample item.

- UI label: Prompt
- Locations: Yaml `config.process[*].sample.samples[*].prompt`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`false`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Creates a stable qualitative evaluation target.
- Drawbacks: A missing prompt is omitted from the legacy prompts view and may not produce a useful evaluation.
- Interactions: none
- Aliases: none
- Example: `prompt: a portrait`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `prompt` (`kwargs.get`)

<a id="sample-item-sample-steps"></a>
### `sample.item.sample_steps`

Overrides denoising steps for this item.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples[*].sample_steps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Engine fallback: present as `{"expression":"sample.sample_steps"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tests a chosen quality/speed point.
- Drawbacks: Many steps slow sampling and can reduce comparability.
- Interactions: Fallback `sample.sample_steps`: When omitted, this item uses sample.sample\_steps. (all supported configurations)
- Aliases: none
- Example: `sample_steps: 20`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `sample_steps` (`kwargs.get`)

<a id="sample-item-seed"></a>
### `sample.item.seed`

Sets an optional fixed seed; null requests automatic seed selection.

- UI label: Seed
- Locations: Yaml `config.process[*].sample.samples[*].seed`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `integer`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports either exact repeatability or automatic variation.
- Drawbacks: Automatic seeds make repeated progress samples harder to compare.
- Interactions: none
- Aliases: none
- Example: `seed: 42`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `seed` (`kwargs.get`)

<a id="sample-item-width"></a>
### `sample.item.width`

Overrides output width for this item.

- UI label: Width
- Locations: Yaml `config.process[*].sample.samples[*].width`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `integer`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"sample.width"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports fixed evaluation at multiple aspect ratios.
- Drawbacks: Larger sizes increase generation memory and time.
- Interactions: Fallback `sample.width`: When omitted, this item uses sample.width. (all supported configurations)
- Aliases: none
- Example: `width: 1024`
- Source symbols: `toolkit/config_modules.py` :: `SampleItem.__init__` :: `width` (`kwargs.get`)

<a id="sample-neg"></a>
### `sample.neg`

Defines the shared negative prompt, with false acting as the disabled sentinel.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.neg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-or-boolean` / `negative-prompt-or-false` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `""` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `"worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, signature, artist name"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `""` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `"worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, signature, artist name"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `""` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Keeps unwanted traits consistently discouraged across samples.
- Drawbacks: A broad negative prompt can suppress desired content.
- Interactions: none
- Aliases: none
- Example: `neg: low quality`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `neg` (`kwargs.get`)

<a id="sample-network-multiplier"></a>
### `sample.network_multiplier`

Scales the trained network while rendering samples.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.network_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
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
- Benefits: Makes it possible to compare weaker or stronger adapter influence.
- Drawbacks: A multiplier unlike deployment strength can misrepresent training progress.
- Interactions: none
- Aliases: none
- Example: `network_multiplier: 1`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `network_multiplier` (`kwargs.get`)

<a id="sample-num-frames"></a>
### `sample.num_frames`

Sets the number of frames generated for each sample.

- UI label: Num Frames
- Locations: Yaml `config.process[*].sample.num_frames`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `121` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `121` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `121` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `107` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `41` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `121` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `1` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `121` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `121` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `121` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `107` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `41` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `121` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `1` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Enables temporal evaluation for video-capable models.
- Drawbacks: More frames increase memory and generation time.
- Interactions: Overrides `sample.format`: Multiple frames force the format to animated WebP. (all supported configurations)
- Aliases: none
- Example: `num_frames: 1`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `num_frames` (`kwargs.get`)

<a id="sample-refiner-start-at"></a>
### `sample.refiner_start_at`

Sets the denoising fraction where an available refiner takes over.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.refiner_start_at`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `fraction` / `number`
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
- Benefits: Balances base-model composition and refiner detail.
- Drawbacks: An unsuitable handoff can create discontinuities or weak refinement.
- Interactions: none
- Aliases: none
- Example: `refiner_start_at: 0.5`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `refiner_start_at` (`kwargs.get`)

<a id="sample-sample-every"></a>
### `sample.sample_every`

Sets the optimizer-step interval between recurring sample batches.

- UI label: Sample Every
- Locations: Yaml `config.process[*].sample.sample_every`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `250` (process_type=`diffusion_trainer`)
- Engine fallback: present as `100` (all supported configurations)
- Other runtime/default transitions: On Select present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `250` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `250` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: Zero or explicit null is preserved and falsey at the truthiness guard, so either value disables periodic sample cadence; sampling explicitly requested through first/final or manual paths is separate from this periodic check. (all supported configurations)
- Benefits: Provides regular visual progress checks.
- Drawbacks: Short intervals pause training frequently.
- Interactions: none
- Aliases: none
- Example: `sample_every: 100`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `sample_every` (`kwargs.get`)

<a id="sample-sample-start-step"></a>
### `sample.sample_start_step`

Delays recurring sampling until the configured training step.

- UI label: Sample Start Step
- Locations: Yaml `config.process[*].sample.sample_start_step`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `0` (process_type=`diffusion_trainer`)
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: On Select present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `0` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `0` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Avoids spending time on very early samples.
- Drawbacks: A late start can hide early divergence.
- Interactions: none
- Aliases: none
- Example: `sample_start_step: 0`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `sample_start_step` (`kwargs.get`)

<a id="sample-sample-steps"></a>
### `sample.sample_steps`

Sets the denoising step count used for each sample.

- UI label: Sample Steps
- Locations: Yaml `config.process[*].sample.sample_steps`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `30` (process_type=`diffusion_trainer`)
- Engine fallback: present as `20` (all supported configurations)
- Other runtime/default transitions: On Select present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `30` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `8` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `9` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `25` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `25` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `28` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `30` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `25` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `9` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `25` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `30` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `8` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `9` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `25` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `25` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `28` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `30` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `25` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `9` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `25` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: none
- Benefits: Trades sample speed for iterative refinement.
- Drawbacks: Many steps slow evaluation and may not help the selected sampler.
- Interactions: none
- Aliases: none
- Example: `sample_steps: 20`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `sample_steps` (`kwargs.get`)

<a id="sample-sampler"></a>
### `sample.sampler`

Selects the sampler used for progress generation.

- UI label: Sampler
- Locations: Yaml `config.process[*].sample.sampler`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `registered-sampler` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"flowmatch"`, `"ddpm"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"flowmatch"` (process_type=`diffusion_trainer`)
- Engine fallback: present as `"ddpm"` (all supported configurations)
- Other runtime/default transitions: On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`anima`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`chroma`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ernie_image`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex1`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flex2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`lumina2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`omnigen2`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`); On Select present as `"ddpm"` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `"ddpm"` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`sdxl`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`); On Select present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`); On Leave present as `"flowmatch"` (process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`)
- Architecture overrides: On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`anima`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`chroma`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ernie_image`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex1`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flex2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_4b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux2_klein_9b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`flux_kontext`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`hidream_e1`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`lumina2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`omnigen2`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image:2512`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`qwen_image_edit_plus:2511`; On Select present as `"ddpm"` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `"ddpm"` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`sdxl`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zeta_chroma`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:deturbo`; On Select present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`; On Leave present as `"flowmatch"` for process_type=`diffusion_trainer`, ui_architecture=`zimage:turbo`
- Normalization: none
- Benefits: Allows evaluation with a sampler appropriate to the model.
- Drawbacks: An unsupported sampler fails generation and sampler changes reduce comparability.
- Interactions: none
- Aliases: none
- Example: `sampler: ddpm`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `sampler` (`kwargs.get`)

<a id="sample-samples"></a>
### `sample.samples`

Defines per-item prompts and optional generation overrides for recurring evaluation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].sample.samples`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `sample-item-list` / `object-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `[{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"}]` (process_type=`diffusion_trainer`); present as `[{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a red-haired woman in a green jacket playing chess at an outdoor park table, mid-move over a wooden board, while a fiery explosion erupts from a building in the distant background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cinematic, tense, candid realism.\",\n    \"lighting\": \"Overcast afternoon daylight, soft and low-contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8C9B82\", \"#B7402A\", \"#5A5F57\", \"#9AA7AE\", \"#D98A3D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban public park on an overcast afternoon under a pale grey-blue sky, cool-neutral white balance. A grassy lawn with scattered fallen leaves stretches behind the foreground table, bordered by a paved walking path and a row of bare-branched trees. In the far distance, a multi-story stone building erupts in a large orange-and-yellow fireball with a thick black smoke plume rising and rolling outward, sending a faint haze across the upper sky. The blast is out of focus and far off, framed between the tree trunks.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          90,\n          760,\n          520\n        ],\n        \"desc\": \"Woman seated at a park chess table, leaning slightly forward mid-move. Long wavy red hair falling past her shoulders, fair skin with light freckles, focused expression looking down at the board. Olive-green canvas jacket over a cream knit top, dark jeans. Right hand reaching toward a chess piece, left hand resting on the table edge.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          520,\n          300,\n          830,\n          720\n        ],\n        \"desc\": \"Square wooden chessboard on a round concrete park table, set with a full arrangement of carved boxwood chess pieces in natural and dark-stained wood. A few captured pieces sit off to the side near the board's right edge, one black knight tipped on its side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          540,\n          720,\n          760\n        ],\n        \"desc\": \"Empty green-painted metal park chair with a slatted backrest on the far side of the chess table, facing the woman, slightly angled to the right.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a woman in a grey beanie holding a coffee cup while sitting at a wooden cafe table by a window, with a blurred cafe interior behind her.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cozy, relaxed, intimate.\",\n    \"lighting\": \"Soft diffused window daylight, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, shallow depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9A5A3E\", \"#E0D2BA\", \"#7C7872\", \"#B07C45\", \"#33312D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small cafe shot in natural daylight with cool-neutral white balance. A large window occupies the left portion of the frame, soft diffused daylight falling across the scene. Exposed brick wall in warm reddish-brown tones runs along the back, partly out of focus. A wooden shelf mounted on the back wall holds a row of white ceramic mugs and a small potted trailing plant. Pendant lights with matte black shades hang from the ceiling, slightly blurred. The floor is wide-plank weathered oak. Distant blurred tables and chairs recede into the soft-focus background on the right side.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          300,\n          820,\n          720\n        ],\n        \"desc\": \"Woman sitting at a cafe table, facing slightly left toward the window. Light-medium skin tone, shoulder-length wavy auburn hair tucked under a ribbed grey wool beanie. Wearing a cream chunky-knit sweater with sleeves pushed to the forearms. Both hands wrapped around a coffee cup held near chest height, relaxed half-smile, gaze directed out the window.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          460,\n          400,\n          640,\n          580\n        ],\n        \"desc\": \"White ceramic cappuccino cup with a thin handle, held in the woman's hands near chest height. Pale foam visible at the rim with a simple leaf latte-art pattern.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          140,\n          1000,\n          900\n        ],\n        \"desc\": \"Rectangular wooden cafe table in warm honey-toned oak, occupying the lower foreground. Visible grain along the surface, one rounded corner facing the camera.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          180,\n          940,\n          420\n        ],\n        \"desc\": \"Small folded paper menu card standing upright on the table to the lower left, plain off-white stock with a thin printed border.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          800,\n          210,\n          910,\n          400\n        ],\n        \"text\": \"MENU\",\n        \"desc\": \"Single word in small upright serif capitals, dark grey ink, centered on the front of the folded paper menu card on the table.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A fish-eye lens photograph of a horse DJing behind turntables at a packed night club, holding a martini glass, surrounded by laser lights and drifting smoke-machine haze on a glowing dance floor.\",\n  \"style_description\": {\n    \"aesthetics\": \"High-energy, surreal, neon nightlife.\",\n    \"lighting\": \"Dim club lighting with magenta and cyan washes and crisscrossing green and magenta laser beams cutting through haze.\",\n    \"photo\": \"Fish-eye lens with strong barrel distortion, deep shadow contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0B0B12\", \"#D81E8F\", \"#1FB6C9\", \"#37C46A\", \"#6A4A2E\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a dark night club shot through a fish-eye lens with strong barrel distortion bowing the edges of the frame. Black walls and low ceiling studded with mounted laser-light fixtures throwing crisscrossing green and magenta beams that cut through thick drifting haze from a smoke machine. Ambient lighting is dim with cool magenta and cyan washes pooling across a glossy black dance floor that reflects fragmented colored beams. A blurred simplified crowd of clubgoers fills the mid-distance, hands raised, rendered as dark silhouettes against the colored glow.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          120,\n          250,\n          720,\n          760\n        ],\n        \"desc\": \"A brown horse standing upright behind a DJ booth in the role of a club DJ, head and long muzzle tilted slightly down toward the equipment, dark mane falling along the neck, alert ears pricked forward. One front hoof rests on a turntable while the other holds aloft a martini glass. Wears large black over-ear headphones around the neck and ears.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          180,\n          860,\n          840\n        ],\n        \"desc\": \"A black DJ booth console spanning the lower foreground, fitted with two silver turntables flanking a central mixer with glowing knobs, faders and small green and red LED indicators. Front panel faces the viewer, exaggerated and curved by the fish-eye distortion.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          470,\n          690\n        ],\n        \"desc\": \"A clear martini glass with a thin stem held aloft, containing pale yellow liquid and a single green olive on a cocktail pick, catching small highlights from the colored club lighting.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          640,\n          360,\n          720,\n          640\n        ],\n        \"text\": \"NEON\\nSTABLE\",\n        \"desc\": \"Illuminated club logo on the front face of the DJ booth in a bold sans-serif display typeface, glowing magenta, slightly warped by the fish-eye curvature.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a smiling man proudly showing off his graphic t-shirt on a sandy beach, with a great white shark leaping out of the ocean in the background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Bright, playful, candid.\",\n    \"lighting\": \"Bright overcast daylight, soft and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, natural depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C9B68C\", \"#2E6B7A\", \"#9FB7BE\", \"#1B3A5C\", \"#E7E2D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Sandy beach scene under a bright overcast sky with cool-neutral white balance. Pale tan sand stretches across the lower portion, slightly damp and packed near the waterline with scattered footprints. Behind the man, the open ocean fills the midground, deep blue-green with choppy whitecaps and rolling waves breaking toward the shore. The horizon line sits high in the frame where the sea meets a hazy pale sky with thin diffuse clouds. Soft even daylight, no harsh shadows, accurate natural color.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          540,\n          720,\n          860\n        ],\n        \"desc\": \"Great white shark mid-leap, fully breaching the ocean surface in the background, body angled diagonally with mouth open and rows of teeth visible. Grey dorsal surface, white underbelly, water cascading and spraying off its body. Smaller in scale due to distance behind the man.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          260,\n          950,\n          640\n        ],\n        \"desc\": \"Man standing on the beach facing the camera, medium-tall build, light-medium skin tone, short brown hair. Grinning widely with a proud expression, gripping the hem of his t-shirt with both hands and pulling it outward to display the front print. Wearing teal swim shorts. Slightly off-center to the left.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          360,\n          330,\n          540,\n          560\n        ],\n        \"text\": \"BEACH\\nVIBES\",\n        \"desc\": \"Bold sans-serif print across the chest of the man's white t-shirt, stacked on two lines in navy blue, slightly curved with the fabric as he stretches it toward the camera.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A brown grizzly bear standing upright on its hind legs, lifting a wooden log onto a half-built log cabin in a snow-covered mountain clearing, with snowy pine forest and peaks behind, rendered as a 35mm film photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Serene, rugged, wintry.\",\n    \"lighting\": \"Pale overcast winter daylight, even and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, soft natural focus.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#E8EDF0\", \"#6B4A30\", \"#3C5240\", \"#9AA6AD\", \"#C8A877\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Snow-covered alpine clearing under a pale overcast winter sky with soft diffused daylight and cool-neutral white balance. Thick fresh snow blankets the ground, undisturbed except around the build site. A dense forest of snow-laden evergreen pines fills the midground, their branches drooping under powder. Jagged grey-and-white granite mountain peaks rise across the distant horizon, partly veiled in light haze. Faint snowflakes drift through the air. The light is even and shadowless across the scene.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          120,\n          760,\n          560\n        ],\n        \"desc\": \"Large brown grizzly bear standing upright on its hind legs, thick shaggy fur with darker brown legs and a lighter tan muzzle. Front paws gripping a debarked pine log, raising it toward the cabin wall. Head turned in profile, small rounded ears, focused expression, breath fogging in the cold air.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          520,\n          880,\n          940\n        ],\n        \"desc\": \"Half-built log cabin made of stacked horizontal debarked pine logs notched and interlocked at the corners. Roughly four log courses high with an open doorway gap on the front face, snow dusting the topmost logs and a small pile of unused logs leaning against the right wall.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          60,\n          880,\n          320\n        ],\n        \"desc\": \"Loose stack of cut pine logs lying on the snowy ground in the lower-left foreground, debarked pale tan wood with sawn ends, partially dusted with fresh snow, ready for building.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          400,\n          760,\n          520\n        ],\n        \"desc\": \"Rusted double-bit felling axe with a worn wooden handle stuck blade-first into a flat-topped tree stump near the bear's feet, snow gathered on the stump's top surface.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A punk rocker woman mid-performance on a concert stage, playing an electric guitar and singing into a microphone, with laser lights cutting through haze in a 35mm concert photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Gritty, energetic, high-contrast.\",\n    \"lighting\": \"Dark stage lit by green and magenta laser beams through haze, deep shadow contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm concert photograph, subtle grain, deep contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0C0C10\", \"#37C46A\", \"#D81E8F\", \"#C9C9C9\", \"#5A4633\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A dark concert stage shell with a black back wall and exposed steel truss rigging overhead holding stage fixtures. Green and magenta laser beams fan out across the upper space, cutting through a light haze that fills the air and scatters the beams into visible shafts. The stage floor is matte black with scuffed gaffer-tape marks. Distant blurred crowd silhouettes fill the lower foreground edge, lit faintly by stage spill. 35mm concert photograph with cool-neutral white balance and deep shadow contrast.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          280,\n          860,\n          720\n        ],\n        \"desc\": \"Punk rocker woman standing center stage mid-song, pale skin, spiked bleached-blonde hair with shaved sides, dark smudged eyeliner, mouth open singing with intense expression. Black sleeveless band tee, studded leather choker, ripped black skinny jeans, fingerless gloves. Right hand strumming, left hand on the fretboard, body leaning forward toward the mic.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          200,\n          820,\n          560\n        ],\n        \"desc\": \"Black electric guitar with a glossy solid body, white pickguard, chrome hardware and visible strings, slung low across the woman's torso on a studded leather strap, neck angled up toward the upper left.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          520,\n          660\n        ],\n        \"desc\": \"Black wired stage microphone on a slim chrome boom stand, positioned directly in front of the woman's open mouth, mesh head catching a small highlight from the stage light.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          40,\n          980,\n          300\n        ],\n        \"desc\": \"Black foldback stage monitor wedge angled up toward the performer, sitting on the front edge of the stage floor, scuffed casing with a metal grille front.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          600,\n          720,\n          720,\n          940\n        ],\n        \"text\": \"RIOT\",\n        \"desc\": \"Bold uppercase condensed sans-serif band logo in white spray-paint style stenciled across the front of the black speaker stack at lower right, slightly distressed edges.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a bearded hipster man assembling a wooden chair on a workbench in a cluttered woodworking shop, surrounded by hand tools and lumber.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rustic, focused, artisanal.\",\n    \"lighting\": \"Diffused overcast daylight from a high window, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8A5A3C\", \"#6E4327\", \"#9A9488\", \"#4A5340\", \"#C7B299\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small woodworking workshop with weathered exposed-brick walls on the left and unfinished plywood-panel walls on the right. Sawdust-dusted concrete floor. A pegboard mounted on the rear wall holds rows of hanging hand tools. A single industrial window high on the left wall lets in diffused overcast daylight with a cool-neutral white balance. Fine sawdust haze drifts in the air. Coils of wood shavings and scattered offcuts rest near the wall base. Shot on 35mm film.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          300,\n          720,\n          680\n        ],\n        \"desc\": \"Bearded hipster man in his mid-thirties, medium-fair skin, full reddish-brown beard and short slicked-back dark hair. Wearing a rolled-sleeve olive flannel shirt, brown leather apron, and dark jeans. Leaning forward over the bench, both hands gripping a wooden chair leg, focused downward expression.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          250,\n          820,\n          760\n        ],\n        \"desc\": \"Partially assembled wooden chair made of light oak, seat and two back slats attached, one rear leg detached and held in the man's hands. Raw unfinished surface with visible grain, clamped at one joint with a small metal bar clamp.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          80,\n          900,\n          920\n        ],\n        \"desc\": \"Heavy wooden workbench with a thick scarred top, vise mounted on the front-left edge. Surface cluttered with a hand plane, two chisels, a wooden mallet, and a coiled tape measure scattered across the right side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          640,\n          40,\n          860,\n          200\n        ],\n        \"desc\": \"Cordless drill resting on its side on the bench top near the front-left corner, black and orange body with a chuck-mounted bit.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          700,\n          520,\n          760,\n          700\n        ],\n        \"text\": \"OAKWELL\\nWORKS\",\n        \"desc\": \"Small stamped logo branded into the leather apron's chest panel, two stacked lines in a condensed serif font, dark burnt-brown tone on tan leather.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A studio fashion photograph of a man in a medium shot modeling a casual outfit against a seamless white backdrop, lit with even studio lighting.\",\n  \"style_description\": {\n    \"aesthetics\": \"Clean, minimal, editorial.\",\n    \"lighting\": \"Even diffused studio softbox lighting, neutral white balance, shadowless.\",\n    \"photo\": \"Studio fashion photograph, sharp focus, seamless white cyclorama.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#F2F2F0\", \"#9A9CA0\", \"#2A2F3C\", \"#5B5E66\", \"#D8D8D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Seamless white studio backdrop, smoothly lit with even diffused studio lighting from soft boxes on both sides, producing a clean bright cyclorama with no visible seams, corners, or shadows behind the subject. Neutral white balance.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          80,\n          300,\n          950,\n          720\n        ],\n        \"desc\": \"Man standing in a medium shot, facing the camera at a slight three-quarter angle. Short dark brown hair neatly styled, light-medium skin tone, clean-shaven, calm neutral expression with a soft closed-mouth look directed at the camera. Wears a fitted heather-grey crewneck t-shirt and dark navy slim chino trousers. Arms relaxed at his sides, shoulders squared. Off-center to the left following rule-of-thirds framing.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a man standing on a city sidewalk holding a white cardboard sign reading 'this is a sign', shot at eye-level with neutral daylight.\",\n  \"style_description\": {\n    \"aesthetics\": \"Plain, candid, documentary.\",\n    \"lighting\": \"Overcast daylight, soft and even, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, eye-level, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9AA0A4\", \"#7C4A38\", \"#3A3D44\", \"#1E3A66\", \"#E8E6E0\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban sidewalk scene under overcast daylight with cool-neutral white balance. A grey concrete pavement runs along the bottom, bordered by the brick facade of a low storefront building with large plate-glass windows. A few out-of-focus pedestrians and a parked dark sedan sit in the blurred mid-distance. Pale grey sky visible above the rooflines.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          330,\n          880,\n          680\n        ],\n        \"desc\": \"Man standing facing the camera, medium build, light skin tone, short brown hair and a trimmed beard. Wearing a charcoal-grey crew-neck shirt and dark blue jeans, relaxed neutral expression looking toward the lens. Both hands raised at chest height gripping the top edge of a cardboard sign held in front of his torso.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          400,\n          360,\n          640,\n          660\n        ],\n        \"desc\": \"Rectangular white cardboard sign with slightly worn edges, held upright in front of the man's chest, plain matte surface with hand-written black marker lettering across the center.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          460,\n          380,\n          580,\n          640\n        ],\n        \"text\": \"this is a sign\",\n        \"desc\": \"Hand-written black marker lettering in a casual sans-serif lowercase style, single line centered across the white cardboard sign.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a muscular bulldog in a worn leather jacket standing beside a battered motorcycle in a post-apocalyptic desert, gripping a sawed-off shotgun, with a hazy ruined skyline on the horizon.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rugged, cinematic, post-apocalyptic.\",\n    \"lighting\": \"Pale dust-choked daylight softened by airborne grit, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, hazy distance.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C2A878\", \"#6B4A2E\", \"#3A352E\", \"#9A8A6C\", \"#B5562A\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A sun-scorched post-apocalyptic desert under a pale dust-choked sky, cool-neutral white balance with a thin haze of airborne grit softening the light. Cracked sandy hardpan stretches to a distant horizon where the silhouettes of half-collapsed buildings, a leaning radio tower, and rusted girders rise out of the heat shimmer. Scattered scrub brush and faint tire tracks mark the packed dirt, and a thin band of overcast cloud sits low over the ruined skyline.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          280,\n          330,\n          820,\n          720\n        ],\n        \"desc\": \"Muscular English bulldog standing upright on its hind legs in a confident pose, fawn-and-white coat, broad wrinkled face with an underbite and alert dark eyes. Wears a scuffed brown leather biker jacket with a popped collar, frayed cuffs, and a worn metal zipper. Front paws grip a sawed-off double-barrel shotgun held across the chest.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          40,\n          880,\n          420\n        ],\n        \"desc\": \"Battered chopper-style motorcycle parked at an angle just left of the bulldog, matte-black fuel tank with chipped paint, rusted chrome exhaust pipes, cracked leather seat, and dusty spoked wheels. Handlebars wrapped in worn tape, a small dented headlamp at the front.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          300,\n          900,\n          760\n        ],\n        \"desc\": \"Scattered debris on the desert floor in front of the bulldog: a crushed metal fuel can, a few spent brass shotgun shells, and a broken length of rusted pipe half-buried in the sand.\"\n      }\n    ]\n  }\n}\n"}]` (process_type=`diffusion_trainer`); present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` (process_type=`diffusion_trainer`)
- Engine fallback: present as `[]` (all supported configurations)
- Other runtime/default transitions: On Select present as `[{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"}]` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `[{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"}]` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `[{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a red-haired woman in a green jacket playing chess at an outdoor park table, mid-move over a wooden board, while a fiery explosion erupts from a building in the distant background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cinematic, tense, candid realism.\",\n    \"lighting\": \"Overcast afternoon daylight, soft and low-contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8C9B82\", \"#B7402A\", \"#5A5F57\", \"#9AA7AE\", \"#D98A3D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban public park on an overcast afternoon under a pale grey-blue sky, cool-neutral white balance. A grassy lawn with scattered fallen leaves stretches behind the foreground table, bordered by a paved walking path and a row of bare-branched trees. In the far distance, a multi-story stone building erupts in a large orange-and-yellow fireball with a thick black smoke plume rising and rolling outward, sending a faint haze across the upper sky. The blast is out of focus and far off, framed between the tree trunks.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          90,\n          760,\n          520\n        ],\n        \"desc\": \"Woman seated at a park chess table, leaning slightly forward mid-move. Long wavy red hair falling past her shoulders, fair skin with light freckles, focused expression looking down at the board. Olive-green canvas jacket over a cream knit top, dark jeans. Right hand reaching toward a chess piece, left hand resting on the table edge.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          520,\n          300,\n          830,\n          720\n        ],\n        \"desc\": \"Square wooden chessboard on a round concrete park table, set with a full arrangement of carved boxwood chess pieces in natural and dark-stained wood. A few captured pieces sit off to the side near the board's right edge, one black knight tipped on its side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          540,\n          720,\n          760\n        ],\n        \"desc\": \"Empty green-painted metal park chair with a slatted backrest on the far side of the chess table, facing the woman, slightly angled to the right.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a woman in a grey beanie holding a coffee cup while sitting at a wooden cafe table by a window, with a blurred cafe interior behind her.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cozy, relaxed, intimate.\",\n    \"lighting\": \"Soft diffused window daylight, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, shallow depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9A5A3E\", \"#E0D2BA\", \"#7C7872\", \"#B07C45\", \"#33312D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small cafe shot in natural daylight with cool-neutral white balance. A large window occupies the left portion of the frame, soft diffused daylight falling across the scene. Exposed brick wall in warm reddish-brown tones runs along the back, partly out of focus. A wooden shelf mounted on the back wall holds a row of white ceramic mugs and a small potted trailing plant. Pendant lights with matte black shades hang from the ceiling, slightly blurred. The floor is wide-plank weathered oak. Distant blurred tables and chairs recede into the soft-focus background on the right side.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          300,\n          820,\n          720\n        ],\n        \"desc\": \"Woman sitting at a cafe table, facing slightly left toward the window. Light-medium skin tone, shoulder-length wavy auburn hair tucked under a ribbed grey wool beanie. Wearing a cream chunky-knit sweater with sleeves pushed to the forearms. Both hands wrapped around a coffee cup held near chest height, relaxed half-smile, gaze directed out the window.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          460,\n          400,\n          640,\n          580\n        ],\n        \"desc\": \"White ceramic cappuccino cup with a thin handle, held in the woman's hands near chest height. Pale foam visible at the rim with a simple leaf latte-art pattern.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          140,\n          1000,\n          900\n        ],\n        \"desc\": \"Rectangular wooden cafe table in warm honey-toned oak, occupying the lower foreground. Visible grain along the surface, one rounded corner facing the camera.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          180,\n          940,\n          420\n        ],\n        \"desc\": \"Small folded paper menu card standing upright on the table to the lower left, plain off-white stock with a thin printed border.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          800,\n          210,\n          910,\n          400\n        ],\n        \"text\": \"MENU\",\n        \"desc\": \"Single word in small upright serif capitals, dark grey ink, centered on the front of the folded paper menu card on the table.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A fish-eye lens photograph of a horse DJing behind turntables at a packed night club, holding a martini glass, surrounded by laser lights and drifting smoke-machine haze on a glowing dance floor.\",\n  \"style_description\": {\n    \"aesthetics\": \"High-energy, surreal, neon nightlife.\",\n    \"lighting\": \"Dim club lighting with magenta and cyan washes and crisscrossing green and magenta laser beams cutting through haze.\",\n    \"photo\": \"Fish-eye lens with strong barrel distortion, deep shadow contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0B0B12\", \"#D81E8F\", \"#1FB6C9\", \"#37C46A\", \"#6A4A2E\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a dark night club shot through a fish-eye lens with strong barrel distortion bowing the edges of the frame. Black walls and low ceiling studded with mounted laser-light fixtures throwing crisscrossing green and magenta beams that cut through thick drifting haze from a smoke machine. Ambient lighting is dim with cool magenta and cyan washes pooling across a glossy black dance floor that reflects fragmented colored beams. A blurred simplified crowd of clubgoers fills the mid-distance, hands raised, rendered as dark silhouettes against the colored glow.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          120,\n          250,\n          720,\n          760\n        ],\n        \"desc\": \"A brown horse standing upright behind a DJ booth in the role of a club DJ, head and long muzzle tilted slightly down toward the equipment, dark mane falling along the neck, alert ears pricked forward. One front hoof rests on a turntable while the other holds aloft a martini glass. Wears large black over-ear headphones around the neck and ears.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          180,\n          860,\n          840\n        ],\n        \"desc\": \"A black DJ booth console spanning the lower foreground, fitted with two silver turntables flanking a central mixer with glowing knobs, faders and small green and red LED indicators. Front panel faces the viewer, exaggerated and curved by the fish-eye distortion.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          470,\n          690\n        ],\n        \"desc\": \"A clear martini glass with a thin stem held aloft, containing pale yellow liquid and a single green olive on a cocktail pick, catching small highlights from the colored club lighting.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          640,\n          360,\n          720,\n          640\n        ],\n        \"text\": \"NEON\\nSTABLE\",\n        \"desc\": \"Illuminated club logo on the front face of the DJ booth in a bold sans-serif display typeface, glowing magenta, slightly warped by the fish-eye curvature.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a smiling man proudly showing off his graphic t-shirt on a sandy beach, with a great white shark leaping out of the ocean in the background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Bright, playful, candid.\",\n    \"lighting\": \"Bright overcast daylight, soft and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, natural depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C9B68C\", \"#2E6B7A\", \"#9FB7BE\", \"#1B3A5C\", \"#E7E2D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Sandy beach scene under a bright overcast sky with cool-neutral white balance. Pale tan sand stretches across the lower portion, slightly damp and packed near the waterline with scattered footprints. Behind the man, the open ocean fills the midground, deep blue-green with choppy whitecaps and rolling waves breaking toward the shore. The horizon line sits high in the frame where the sea meets a hazy pale sky with thin diffuse clouds. Soft even daylight, no harsh shadows, accurate natural color.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          540,\n          720,\n          860\n        ],\n        \"desc\": \"Great white shark mid-leap, fully breaching the ocean surface in the background, body angled diagonally with mouth open and rows of teeth visible. Grey dorsal surface, white underbelly, water cascading and spraying off its body. Smaller in scale due to distance behind the man.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          260,\n          950,\n          640\n        ],\n        \"desc\": \"Man standing on the beach facing the camera, medium-tall build, light-medium skin tone, short brown hair. Grinning widely with a proud expression, gripping the hem of his t-shirt with both hands and pulling it outward to display the front print. Wearing teal swim shorts. Slightly off-center to the left.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          360,\n          330,\n          540,\n          560\n        ],\n        \"text\": \"BEACH\\nVIBES\",\n        \"desc\": \"Bold sans-serif print across the chest of the man's white t-shirt, stacked on two lines in navy blue, slightly curved with the fabric as he stretches it toward the camera.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A brown grizzly bear standing upright on its hind legs, lifting a wooden log onto a half-built log cabin in a snow-covered mountain clearing, with snowy pine forest and peaks behind, rendered as a 35mm film photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Serene, rugged, wintry.\",\n    \"lighting\": \"Pale overcast winter daylight, even and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, soft natural focus.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#E8EDF0\", \"#6B4A30\", \"#3C5240\", \"#9AA6AD\", \"#C8A877\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Snow-covered alpine clearing under a pale overcast winter sky with soft diffused daylight and cool-neutral white balance. Thick fresh snow blankets the ground, undisturbed except around the build site. A dense forest of snow-laden evergreen pines fills the midground, their branches drooping under powder. Jagged grey-and-white granite mountain peaks rise across the distant horizon, partly veiled in light haze. Faint snowflakes drift through the air. The light is even and shadowless across the scene.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          120,\n          760,\n          560\n        ],\n        \"desc\": \"Large brown grizzly bear standing upright on its hind legs, thick shaggy fur with darker brown legs and a lighter tan muzzle. Front paws gripping a debarked pine log, raising it toward the cabin wall. Head turned in profile, small rounded ears, focused expression, breath fogging in the cold air.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          520,\n          880,\n          940\n        ],\n        \"desc\": \"Half-built log cabin made of stacked horizontal debarked pine logs notched and interlocked at the corners. Roughly four log courses high with an open doorway gap on the front face, snow dusting the topmost logs and a small pile of unused logs leaning against the right wall.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          60,\n          880,\n          320\n        ],\n        \"desc\": \"Loose stack of cut pine logs lying on the snowy ground in the lower-left foreground, debarked pale tan wood with sawn ends, partially dusted with fresh snow, ready for building.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          400,\n          760,\n          520\n        ],\n        \"desc\": \"Rusted double-bit felling axe with a worn wooden handle stuck blade-first into a flat-topped tree stump near the bear's feet, snow gathered on the stump's top surface.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A punk rocker woman mid-performance on a concert stage, playing an electric guitar and singing into a microphone, with laser lights cutting through haze in a 35mm concert photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Gritty, energetic, high-contrast.\",\n    \"lighting\": \"Dark stage lit by green and magenta laser beams through haze, deep shadow contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm concert photograph, subtle grain, deep contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0C0C10\", \"#37C46A\", \"#D81E8F\", \"#C9C9C9\", \"#5A4633\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A dark concert stage shell with a black back wall and exposed steel truss rigging overhead holding stage fixtures. Green and magenta laser beams fan out across the upper space, cutting through a light haze that fills the air and scatters the beams into visible shafts. The stage floor is matte black with scuffed gaffer-tape marks. Distant blurred crowd silhouettes fill the lower foreground edge, lit faintly by stage spill. 35mm concert photograph with cool-neutral white balance and deep shadow contrast.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          280,\n          860,\n          720\n        ],\n        \"desc\": \"Punk rocker woman standing center stage mid-song, pale skin, spiked bleached-blonde hair with shaved sides, dark smudged eyeliner, mouth open singing with intense expression. Black sleeveless band tee, studded leather choker, ripped black skinny jeans, fingerless gloves. Right hand strumming, left hand on the fretboard, body leaning forward toward the mic.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          200,\n          820,\n          560\n        ],\n        \"desc\": \"Black electric guitar with a glossy solid body, white pickguard, chrome hardware and visible strings, slung low across the woman's torso on a studded leather strap, neck angled up toward the upper left.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          520,\n          660\n        ],\n        \"desc\": \"Black wired stage microphone on a slim chrome boom stand, positioned directly in front of the woman's open mouth, mesh head catching a small highlight from the stage light.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          40,\n          980,\n          300\n        ],\n        \"desc\": \"Black foldback stage monitor wedge angled up toward the performer, sitting on the front edge of the stage floor, scuffed casing with a metal grille front.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          600,\n          720,\n          720,\n          940\n        ],\n        \"text\": \"RIOT\",\n        \"desc\": \"Bold uppercase condensed sans-serif band logo in white spray-paint style stenciled across the front of the black speaker stack at lower right, slightly distressed edges.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a bearded hipster man assembling a wooden chair on a workbench in a cluttered woodworking shop, surrounded by hand tools and lumber.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rustic, focused, artisanal.\",\n    \"lighting\": \"Diffused overcast daylight from a high window, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8A5A3C\", \"#6E4327\", \"#9A9488\", \"#4A5340\", \"#C7B299\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small woodworking workshop with weathered exposed-brick walls on the left and unfinished plywood-panel walls on the right. Sawdust-dusted concrete floor. A pegboard mounted on the rear wall holds rows of hanging hand tools. A single industrial window high on the left wall lets in diffused overcast daylight with a cool-neutral white balance. Fine sawdust haze drifts in the air. Coils of wood shavings and scattered offcuts rest near the wall base. Shot on 35mm film.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          300,\n          720,\n          680\n        ],\n        \"desc\": \"Bearded hipster man in his mid-thirties, medium-fair skin, full reddish-brown beard and short slicked-back dark hair. Wearing a rolled-sleeve olive flannel shirt, brown leather apron, and dark jeans. Leaning forward over the bench, both hands gripping a wooden chair leg, focused downward expression.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          250,\n          820,\n          760\n        ],\n        \"desc\": \"Partially assembled wooden chair made of light oak, seat and two back slats attached, one rear leg detached and held in the man's hands. Raw unfinished surface with visible grain, clamped at one joint with a small metal bar clamp.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          80,\n          900,\n          920\n        ],\n        \"desc\": \"Heavy wooden workbench with a thick scarred top, vise mounted on the front-left edge. Surface cluttered with a hand plane, two chisels, a wooden mallet, and a coiled tape measure scattered across the right side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          640,\n          40,\n          860,\n          200\n        ],\n        \"desc\": \"Cordless drill resting on its side on the bench top near the front-left corner, black and orange body with a chuck-mounted bit.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          700,\n          520,\n          760,\n          700\n        ],\n        \"text\": \"OAKWELL\\nWORKS\",\n        \"desc\": \"Small stamped logo branded into the leather apron's chest panel, two stacked lines in a condensed serif font, dark burnt-brown tone on tan leather.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A studio fashion photograph of a man in a medium shot modeling a casual outfit against a seamless white backdrop, lit with even studio lighting.\",\n  \"style_description\": {\n    \"aesthetics\": \"Clean, minimal, editorial.\",\n    \"lighting\": \"Even diffused studio softbox lighting, neutral white balance, shadowless.\",\n    \"photo\": \"Studio fashion photograph, sharp focus, seamless white cyclorama.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#F2F2F0\", \"#9A9CA0\", \"#2A2F3C\", \"#5B5E66\", \"#D8D8D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Seamless white studio backdrop, smoothly lit with even diffused studio lighting from soft boxes on both sides, producing a clean bright cyclorama with no visible seams, corners, or shadows behind the subject. Neutral white balance.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          80,\n          300,\n          950,\n          720\n        ],\n        \"desc\": \"Man standing in a medium shot, facing the camera at a slight three-quarter angle. Short dark brown hair neatly styled, light-medium skin tone, clean-shaven, calm neutral expression with a soft closed-mouth look directed at the camera. Wears a fitted heather-grey crewneck t-shirt and dark navy slim chino trousers. Arms relaxed at his sides, shoulders squared. Off-center to the left following rule-of-thirds framing.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a man standing on a city sidewalk holding a white cardboard sign reading 'this is a sign', shot at eye-level with neutral daylight.\",\n  \"style_description\": {\n    \"aesthetics\": \"Plain, candid, documentary.\",\n    \"lighting\": \"Overcast daylight, soft and even, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, eye-level, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9AA0A4\", \"#7C4A38\", \"#3A3D44\", \"#1E3A66\", \"#E8E6E0\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban sidewalk scene under overcast daylight with cool-neutral white balance. A grey concrete pavement runs along the bottom, bordered by the brick facade of a low storefront building with large plate-glass windows. A few out-of-focus pedestrians and a parked dark sedan sit in the blurred mid-distance. Pale grey sky visible above the rooflines.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          330,\n          880,\n          680\n        ],\n        \"desc\": \"Man standing facing the camera, medium build, light skin tone, short brown hair and a trimmed beard. Wearing a charcoal-grey crew-neck shirt and dark blue jeans, relaxed neutral expression looking toward the lens. Both hands raised at chest height gripping the top edge of a cardboard sign held in front of his torso.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          400,\n          360,\n          640,\n          660\n        ],\n        \"desc\": \"Rectangular white cardboard sign with slightly worn edges, held upright in front of the man's chest, plain matte surface with hand-written black marker lettering across the center.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          460,\n          380,\n          580,\n          640\n        ],\n        \"text\": \"this is a sign\",\n        \"desc\": \"Hand-written black marker lettering in a casual sans-serif lowercase style, single line centered across the white cardboard sign.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a muscular bulldog in a worn leather jacket standing beside a battered motorcycle in a post-apocalyptic desert, gripping a sawed-off shotgun, with a hazy ruined skyline on the horizon.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rugged, cinematic, post-apocalyptic.\",\n    \"lighting\": \"Pale dust-choked daylight softened by airborne grit, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, hazy distance.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C2A878\", \"#6B4A2E\", \"#3A352E\", \"#9A8A6C\", \"#B5562A\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A sun-scorched post-apocalyptic desert under a pale dust-choked sky, cool-neutral white balance with a thin haze of airborne grit softening the light. Cracked sandy hardpan stretches to a distant horizon where the silhouettes of half-collapsed buildings, a leaning radio tower, and rusted girders rise out of the heat shimmer. Scattered scrub brush and faint tire tracks mark the packed dirt, and a thin band of overcast cloud sits low over the ruined skyline.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          280,\n          330,\n          820,\n          720\n        ],\n        \"desc\": \"Muscular English bulldog standing upright on its hind legs in a confident pose, fawn-and-white coat, broad wrinkled face with an underbite and alert dark eyes. Wears a scuffed brown leather biker jacket with a popped collar, frayed cuffs, and a worn metal zipper. Front paws grip a sawed-off double-barrel shotgun held across the chest.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          40,\n          880,\n          420\n        ],\n        \"desc\": \"Battered chopper-style motorcycle parked at an angle just left of the bulldog, matte-black fuel tank with chipped paint, rusted chrome exhaust pipes, cracked leather seat, and dusty spoked wheels. Handlebars wrapped in worn tape, a small dented headlamp at the front.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          300,\n          900,\n          760\n        ],\n        \"desc\": \"Scattered debris on the desert floor in front of the bulldog: a crushed metal fuel can, a few spent brass shotgun shells, and a broken length of rusted pipe half-buried in the sand.\"\n      }\n    ]\n  }\n}\n"}]` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `[{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"}]` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `[{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"},{"prompt":"\n<CAPTION>my style song</CAPTION>\n<LYRICS>\n[Intro choir]\nLaura\nLaura\nLaura\nLaura Training\n\n[Verse 1]\nA new open model, she been training it nightly\nAI tool kit, she configures it tightly,\nLoss curves dropping down to the floor\nWondering if she's done or she should train it some more.\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Verse 4]\nShe's caching all the latents\nnow she doesn't need a vay\nTraining on some voices\nWhat will she make them say\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Guitar Solo]\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Chorus]\nLaura training\nShe trains on what she pleases\nLaura training\nNo paying corporate sleazes\nLaura training\nThis could be her best one\nWhy go outside, Laura training is too fun\n\n[Instrumental Break]\n\n[Outro]\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\nAh yeah!\nIt's Converging!\n</LYRICS>\n<BPM>112</BPM>\n<KEYSCALE>A minor</KEYSCALE>\n<TIMESIGNATURE>4</TIMESIGNATURE>\n<DURATION>180</DURATION>\n<LANGUAGE>en</LANGUAGE>\n"}]` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `[{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a red-haired woman in a green jacket playing chess at an outdoor park table, mid-move over a wooden board, while a fiery explosion erupts from a building in the distant background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cinematic, tense, candid realism.\",\n    \"lighting\": \"Overcast afternoon daylight, soft and low-contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8C9B82\", \"#B7402A\", \"#5A5F57\", \"#9AA7AE\", \"#D98A3D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban public park on an overcast afternoon under a pale grey-blue sky, cool-neutral white balance. A grassy lawn with scattered fallen leaves stretches behind the foreground table, bordered by a paved walking path and a row of bare-branched trees. In the far distance, a multi-story stone building erupts in a large orange-and-yellow fireball with a thick black smoke plume rising and rolling outward, sending a faint haze across the upper sky. The blast is out of focus and far off, framed between the tree trunks.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          90,\n          760,\n          520\n        ],\n        \"desc\": \"Woman seated at a park chess table, leaning slightly forward mid-move. Long wavy red hair falling past her shoulders, fair skin with light freckles, focused expression looking down at the board. Olive-green canvas jacket over a cream knit top, dark jeans. Right hand reaching toward a chess piece, left hand resting on the table edge.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          520,\n          300,\n          830,\n          720\n        ],\n        \"desc\": \"Square wooden chessboard on a round concrete park table, set with a full arrangement of carved boxwood chess pieces in natural and dark-stained wood. A few captured pieces sit off to the side near the board's right edge, one black knight tipped on its side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          540,\n          720,\n          760\n        ],\n        \"desc\": \"Empty green-painted metal park chair with a slatted backrest on the far side of the chess table, facing the woman, slightly angled to the right.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a woman in a grey beanie holding a coffee cup while sitting at a wooden cafe table by a window, with a blurred cafe interior behind her.\",\n  \"style_description\": {\n    \"aesthetics\": \"Cozy, relaxed, intimate.\",\n    \"lighting\": \"Soft diffused window daylight, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, shallow depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9A5A3E\", \"#E0D2BA\", \"#7C7872\", \"#B07C45\", \"#33312D\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small cafe shot in natural daylight with cool-neutral white balance. A large window occupies the left portion of the frame, soft diffused daylight falling across the scene. Exposed brick wall in warm reddish-brown tones runs along the back, partly out of focus. A wooden shelf mounted on the back wall holds a row of white ceramic mugs and a small potted trailing plant. Pendant lights with matte black shades hang from the ceiling, slightly blurred. The floor is wide-plank weathered oak. Distant blurred tables and chairs recede into the soft-focus background on the right side.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          300,\n          820,\n          720\n        ],\n        \"desc\": \"Woman sitting at a cafe table, facing slightly left toward the window. Light-medium skin tone, shoulder-length wavy auburn hair tucked under a ribbed grey wool beanie. Wearing a cream chunky-knit sweater with sleeves pushed to the forearms. Both hands wrapped around a coffee cup held near chest height, relaxed half-smile, gaze directed out the window.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          460,\n          400,\n          640,\n          580\n        ],\n        \"desc\": \"White ceramic cappuccino cup with a thin handle, held in the woman's hands near chest height. Pale foam visible at the rim with a simple leaf latte-art pattern.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          140,\n          1000,\n          900\n        ],\n        \"desc\": \"Rectangular wooden cafe table in warm honey-toned oak, occupying the lower foreground. Visible grain along the surface, one rounded corner facing the camera.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          180,\n          940,\n          420\n        ],\n        \"desc\": \"Small folded paper menu card standing upright on the table to the lower left, plain off-white stock with a thin printed border.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          800,\n          210,\n          910,\n          400\n        ],\n        \"text\": \"MENU\",\n        \"desc\": \"Single word in small upright serif capitals, dark grey ink, centered on the front of the folded paper menu card on the table.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A fish-eye lens photograph of a horse DJing behind turntables at a packed night club, holding a martini glass, surrounded by laser lights and drifting smoke-machine haze on a glowing dance floor.\",\n  \"style_description\": {\n    \"aesthetics\": \"High-energy, surreal, neon nightlife.\",\n    \"lighting\": \"Dim club lighting with magenta and cyan washes and crisscrossing green and magenta laser beams cutting through haze.\",\n    \"photo\": \"Fish-eye lens with strong barrel distortion, deep shadow contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0B0B12\", \"#D81E8F\", \"#1FB6C9\", \"#37C46A\", \"#6A4A2E\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a dark night club shot through a fish-eye lens with strong barrel distortion bowing the edges of the frame. Black walls and low ceiling studded with mounted laser-light fixtures throwing crisscrossing green and magenta beams that cut through thick drifting haze from a smoke machine. Ambient lighting is dim with cool magenta and cyan washes pooling across a glossy black dance floor that reflects fragmented colored beams. A blurred simplified crowd of clubgoers fills the mid-distance, hands raised, rendered as dark silhouettes against the colored glow.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          120,\n          250,\n          720,\n          760\n        ],\n        \"desc\": \"A brown horse standing upright behind a DJ booth in the role of a club DJ, head and long muzzle tilted slightly down toward the equipment, dark mane falling along the neck, alert ears pricked forward. One front hoof rests on a turntable while the other holds aloft a martini glass. Wears large black over-ear headphones around the neck and ears.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          180,\n          860,\n          840\n        ],\n        \"desc\": \"A black DJ booth console spanning the lower foreground, fitted with two silver turntables flanking a central mixer with glowing knobs, faders and small green and red LED indicators. Front panel faces the viewer, exaggerated and curved by the fish-eye distortion.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          470,\n          690\n        ],\n        \"desc\": \"A clear martini glass with a thin stem held aloft, containing pale yellow liquid and a single green olive on a cocktail pick, catching small highlights from the colored club lighting.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          640,\n          360,\n          720,\n          640\n        ],\n        \"text\": \"NEON\\nSTABLE\",\n        \"desc\": \"Illuminated club logo on the front face of the DJ booth in a bold sans-serif display typeface, glowing magenta, slightly warped by the fish-eye curvature.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a smiling man proudly showing off his graphic t-shirt on a sandy beach, with a great white shark leaping out of the ocean in the background.\",\n  \"style_description\": {\n    \"aesthetics\": \"Bright, playful, candid.\",\n    \"lighting\": \"Bright overcast daylight, soft and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, natural depth of field, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C9B68C\", \"#2E6B7A\", \"#9FB7BE\", \"#1B3A5C\", \"#E7E2D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Sandy beach scene under a bright overcast sky with cool-neutral white balance. Pale tan sand stretches across the lower portion, slightly damp and packed near the waterline with scattered footprints. Behind the man, the open ocean fills the midground, deep blue-green with choppy whitecaps and rolling waves breaking toward the shore. The horizon line sits high in the frame where the sea meets a hazy pale sky with thin diffuse clouds. Soft even daylight, no harsh shadows, accurate natural color.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          540,\n          720,\n          860\n        ],\n        \"desc\": \"Great white shark mid-leap, fully breaching the ocean surface in the background, body angled diagonally with mouth open and rows of teeth visible. Grey dorsal surface, white underbelly, water cascading and spraying off its body. Smaller in scale due to distance behind the man.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          260,\n          950,\n          640\n        ],\n        \"desc\": \"Man standing on the beach facing the camera, medium-tall build, light-medium skin tone, short brown hair. Grinning widely with a proud expression, gripping the hem of his t-shirt with both hands and pulling it outward to display the front print. Wearing teal swim shorts. Slightly off-center to the left.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          360,\n          330,\n          540,\n          560\n        ],\n        \"text\": \"BEACH\\nVIBES\",\n        \"desc\": \"Bold sans-serif print across the chest of the man's white t-shirt, stacked on two lines in navy blue, slightly curved with the fabric as he stretches it toward the camera.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A brown grizzly bear standing upright on its hind legs, lifting a wooden log onto a half-built log cabin in a snow-covered mountain clearing, with snowy pine forest and peaks behind, rendered as a 35mm film photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Serene, rugged, wintry.\",\n    \"lighting\": \"Pale overcast winter daylight, even and shadowless, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, subtle grain, soft natural focus.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#E8EDF0\", \"#6B4A30\", \"#3C5240\", \"#9AA6AD\", \"#C8A877\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Snow-covered alpine clearing under a pale overcast winter sky with soft diffused daylight and cool-neutral white balance. Thick fresh snow blankets the ground, undisturbed except around the build site. A dense forest of snow-laden evergreen pines fills the midground, their branches drooping under powder. Jagged grey-and-white granite mountain peaks rise across the distant horizon, partly veiled in light haze. Faint snowflakes drift through the air. The light is even and shadowless across the scene.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          120,\n          760,\n          560\n        ],\n        \"desc\": \"Large brown grizzly bear standing upright on its hind legs, thick shaggy fur with darker brown legs and a lighter tan muzzle. Front paws gripping a debarked pine log, raising it toward the cabin wall. Head turned in profile, small rounded ears, focused expression, breath fogging in the cold air.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          520,\n          880,\n          940\n        ],\n        \"desc\": \"Half-built log cabin made of stacked horizontal debarked pine logs notched and interlocked at the corners. Roughly four log courses high with an open doorway gap on the front face, snow dusting the topmost logs and a small pile of unused logs leaning against the right wall.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          700,\n          60,\n          880,\n          320\n        ],\n        \"desc\": \"Loose stack of cut pine logs lying on the snowy ground in the lower-left foreground, debarked pale tan wood with sawn ends, partially dusted with fresh snow, ready for building.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          400,\n          760,\n          520\n        ],\n        \"desc\": \"Rusted double-bit felling axe with a worn wooden handle stuck blade-first into a flat-topped tree stump near the bear's feet, snow gathered on the stump's top surface.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A punk rocker woman mid-performance on a concert stage, playing an electric guitar and singing into a microphone, with laser lights cutting through haze in a 35mm concert photograph.\",\n  \"style_description\": {\n    \"aesthetics\": \"Gritty, energetic, high-contrast.\",\n    \"lighting\": \"Dark stage lit by green and magenta laser beams through haze, deep shadow contrast, cool-neutral white balance.\",\n    \"photo\": \"35mm concert photograph, subtle grain, deep contrast.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#0C0C10\", \"#37C46A\", \"#D81E8F\", \"#C9C9C9\", \"#5A4633\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A dark concert stage shell with a black back wall and exposed steel truss rigging overhead holding stage fixtures. Green and magenta laser beams fan out across the upper space, cutting through a light haze that fills the air and scatters the beams into visible shafts. The stage floor is matte black with scuffed gaffer-tape marks. Distant blurred crowd silhouettes fill the lower foreground edge, lit faintly by stage spill. 35mm concert photograph with cool-neutral white balance and deep shadow contrast.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          280,\n          860,\n          720\n        ],\n        \"desc\": \"Punk rocker woman standing center stage mid-song, pale skin, spiked bleached-blonde hair with shaved sides, dark smudged eyeliner, mouth open singing with intense expression. Black sleeveless band tee, studded leather choker, ripped black skinny jeans, fingerless gloves. Right hand strumming, left hand on the fretboard, body leaning forward toward the mic.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          200,\n          820,\n          560\n        ],\n        \"desc\": \"Black electric guitar with a glossy solid body, white pickguard, chrome hardware and visible strings, slung low across the woman's torso on a studded leather strap, neck angled up toward the upper left.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          300,\n          560,\n          520,\n          660\n        ],\n        \"desc\": \"Black wired stage microphone on a slim chrome boom stand, positioned directly in front of the woman's open mouth, mesh head catching a small highlight from the stage light.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          40,\n          980,\n          300\n        ],\n        \"desc\": \"Black foldback stage monitor wedge angled up toward the performer, sitting on the front edge of the stage floor, scuffed casing with a metal grille front.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          600,\n          720,\n          720,\n          940\n        ],\n        \"text\": \"RIOT\",\n        \"desc\": \"Bold uppercase condensed sans-serif band logo in white spray-paint style stenciled across the front of the black speaker stack at lower right, slightly distressed edges.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a bearded hipster man assembling a wooden chair on a workbench in a cluttered woodworking shop, surrounded by hand tools and lumber.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rustic, focused, artisanal.\",\n    \"lighting\": \"Diffused overcast daylight from a high window, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, natural depth of field.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#8A5A3C\", \"#6E4327\", \"#9A9488\", \"#4A5340\", \"#C7B299\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Interior of a small woodworking workshop with weathered exposed-brick walls on the left and unfinished plywood-panel walls on the right. Sawdust-dusted concrete floor. A pegboard mounted on the rear wall holds rows of hanging hand tools. A single industrial window high on the left wall lets in diffused overcast daylight with a cool-neutral white balance. Fine sawdust haze drifts in the air. Coils of wood shavings and scattered offcuts rest near the wall base. Shot on 35mm film.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          150,\n          300,\n          720,\n          680\n        ],\n        \"desc\": \"Bearded hipster man in his mid-thirties, medium-fair skin, full reddish-brown beard and short slicked-back dark hair. Wearing a rolled-sleeve olive flannel shirt, brown leather apron, and dark jeans. Leaning forward over the bench, both hands gripping a wooden chair leg, focused downward expression.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          420,\n          250,\n          820,\n          760\n        ],\n        \"desc\": \"Partially assembled wooden chair made of light oak, seat and two back slats attached, one rear leg detached and held in the man's hands. Raw unfinished surface with visible grain, clamped at one joint with a small metal bar clamp.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          600,\n          80,\n          900,\n          920\n        ],\n        \"desc\": \"Heavy wooden workbench with a thick scarred top, vise mounted on the front-left edge. Surface cluttered with a hand plane, two chisels, a wooden mallet, and a coiled tape measure scattered across the right side.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          640,\n          40,\n          860,\n          200\n        ],\n        \"desc\": \"Cordless drill resting on its side on the bench top near the front-left corner, black and orange body with a chuck-mounted bit.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          700,\n          520,\n          760,\n          700\n        ],\n        \"text\": \"OAKWELL\\nWORKS\",\n        \"desc\": \"Small stamped logo branded into the leather apron's chest panel, two stacked lines in a condensed serif font, dark burnt-brown tone on tan leather.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A studio fashion photograph of a man in a medium shot modeling a casual outfit against a seamless white backdrop, lit with even studio lighting.\",\n  \"style_description\": {\n    \"aesthetics\": \"Clean, minimal, editorial.\",\n    \"lighting\": \"Even diffused studio softbox lighting, neutral white balance, shadowless.\",\n    \"photo\": \"Studio fashion photograph, sharp focus, seamless white cyclorama.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#F2F2F0\", \"#9A9CA0\", \"#2A2F3C\", \"#5B5E66\", \"#D8D8D6\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"Seamless white studio backdrop, smoothly lit with even diffused studio lighting from soft boxes on both sides, producing a clean bright cyclorama with no visible seams, corners, or shadows behind the subject. Neutral white balance.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          80,\n          300,\n          950,\n          720\n        ],\n        \"desc\": \"Man standing in a medium shot, facing the camera at a slight three-quarter angle. Short dark brown hair neatly styled, light-medium skin tone, clean-shaven, calm neutral expression with a soft closed-mouth look directed at the camera. Wears a fitted heather-grey crewneck t-shirt and dark navy slim chino trousers. Arms relaxed at his sides, shoulders squared. Off-center to the left following rule-of-thirds framing.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a man standing on a city sidewalk holding a white cardboard sign reading 'this is a sign', shot at eye-level with neutral daylight.\",\n  \"style_description\": {\n    \"aesthetics\": \"Plain, candid, documentary.\",\n    \"lighting\": \"Overcast daylight, soft and even, cool-neutral white balance.\",\n    \"photo\": \"35mm film still, eye-level, subtle grain.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#9AA0A4\", \"#7C4A38\", \"#3A3D44\", \"#1E3A66\", \"#E8E6E0\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"An urban sidewalk scene under overcast daylight with cool-neutral white balance. A grey concrete pavement runs along the bottom, bordered by the brick facade of a low storefront building with large plate-glass windows. A few out-of-focus pedestrians and a parked dark sedan sit in the blurred mid-distance. Pale grey sky visible above the rooflines.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          180,\n          330,\n          880,\n          680\n        ],\n        \"desc\": \"Man standing facing the camera, medium build, light skin tone, short brown hair and a trimmed beard. Wearing a charcoal-grey crew-neck shirt and dark blue jeans, relaxed neutral expression looking toward the lens. Both hands raised at chest height gripping the top edge of a cardboard sign held in front of his torso.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          400,\n          360,\n          640,\n          660\n        ],\n        \"desc\": \"Rectangular white cardboard sign with slightly worn edges, held upright in front of the man's chest, plain matte surface with hand-written black marker lettering across the center.\"\n      },\n      {\n        \"type\": \"text\",\n        \"bbox\": [\n          460,\n          380,\n          580,\n          640\n        ],\n        \"text\": \"this is a sign\",\n        \"desc\": \"Hand-written black marker lettering in a casual sans-serif lowercase style, single line centered across the white cardboard sign.\"\n      }\n    ]\n  }\n}\n"},{"prompt":"\n{\n  \"high_level_description\": \"A 35mm film photograph of a muscular bulldog in a worn leather jacket standing beside a battered motorcycle in a post-apocalyptic desert, gripping a sawed-off shotgun, with a hazy ruined skyline on the horizon.\",\n  \"style_description\": {\n    \"aesthetics\": \"Rugged, cinematic, post-apocalyptic.\",\n    \"lighting\": \"Pale dust-choked daylight softened by airborne grit, cool-neutral white balance, low contrast.\",\n    \"photo\": \"35mm film still, subtle grain, hazy distance.\",\n    \"medium\": \"photograph\",\n    \"color_palette\": [\"#C2A878\", \"#6B4A2E\", \"#3A352E\", \"#9A8A6C\", \"#B5562A\"]\n  },\n  \"compositional_deconstruction\": {\n    \"background\": \"A sun-scorched post-apocalyptic desert under a pale dust-choked sky, cool-neutral white balance with a thin haze of airborne grit softening the light. Cracked sandy hardpan stretches to a distant horizon where the silhouettes of half-collapsed buildings, a leaning radio tower, and rusted girders rise out of the heat shimmer. Scattered scrub brush and faint tire tracks mark the packed dirt, and a thin band of overcast cloud sits low over the ruined skyline.\",\n    \"elements\": [\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          280,\n          330,\n          820,\n          720\n        ],\n        \"desc\": \"Muscular English bulldog standing upright on its hind legs in a confident pose, fawn-and-white coat, broad wrinkled face with an underbite and alert dark eyes. Wears a scuffed brown leather biker jacket with a popped collar, frayed cuffs, and a worn metal zipper. Front paws grip a sawed-off double-barrel shotgun held across the chest.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          480,\n          40,\n          880,\n          420\n        ],\n        \"desc\": \"Battered chopper-style motorcycle parked at an angle just left of the bulldog, matte-black fuel tank with chipped paint, rusted chrome exhaust pipes, cracked leather seat, and dusty spoked wheels. Handlebars wrapped in worn tape, a small dented headlamp at the front.\"\n      },\n      {\n        \"type\": \"obj\",\n        \"bbox\": [\n          760,\n          300,\n          900,\n          760\n        ],\n        \"desc\": \"Scattered debris on the desert floor in front of the bulldog: a crushed metal fuel can, a few spent brass shotgun shells, and a broken length of rusted pipe half-buried in the sand.\"\n      }\n    ]\n  }\n}\n"}]` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `[{"prompt":"woman with red hair, playing chess at the park, bomb going off in the background"},{"prompt":"a woman holding a coffee cup, in a beanie, sitting at a cafe"},{"prompt":"a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini"},{"prompt":"a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background"},{"prompt":"a bear building a log cabin in the snow covered mountains"},{"prompt":"woman playing the guitar, on stage, singing a song, laser lights, punk rocker"},{"prompt":"hipster man with a beard, building a chair, in a wood shop"},{"prompt":"photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop"},{"prompt":"a man holding a sign that says, 'this is a sign'"},{"prompt":"a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle"}]` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: Legacy prompts strings are converted in order to sample objects containing a prompt field. (all supported configurations); Legacy prompts migration overwrites samples only for a nonempty prompts array, preserves source order, and deletes prompts after the write. (all supported configurations)
- Benefits: Supports several fixed evaluation cases with independent seeds, sizes, and controls.
- Drawbacks: Large lists lengthen every sampling event; legacy prompts cannot express per-item overrides.
- Interactions: none
- Aliases: `config.process[*].sample.prompts` → `sample.samples` (Legacy, Alias Wins): Convert each nonempty legacy prompts array in source order to sample objects containing a prompt field, overwrite samples, then delete prompts.
- Example: `samples: [{prompt: "a portrait", seed: 42}]`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `prompts` (`kwargs.get`); `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `samples` (`kwargs.get`)

<a id="sample-seed"></a>
### `sample.seed`

Sets the starting sample seed.

- UI label: Seed
- Locations: Yaml `config.process[*].sample.seed`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `42` (process_type=`diffusion_trainer`)
- Engine fallback: present as `0` (all supported configurations)
- Other runtime/default transitions: On Select present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `42` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `42` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Makes recurring evaluations reproducible.
- Drawbacks: A single seed can hide variation or seed-specific failure.
- Interactions: none
- Aliases: none
- Example: `seed: 0`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `seed` (`kwargs.get`)

<a id="sample-walk-seed"></a>
### `sample.walk_seed`

Advances the seed between recurring sample events.

- UI label: Walk Seed
- Locations: Yaml `config.process[*].sample.walk_seed`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `true` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`
- Normalization: none
- Benefits: Shows progress across varied latent inputs.
- Drawbacks: Changing latents makes step-to-step visual comparison less direct.
- Interactions: none
- Aliases: none
- Example: `walk_seed: false`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `walk_seed` (`kwargs.get`)

<a id="sample-width"></a>
### `sample.width`

Sets the requested sample width in pixels.

- UI label: Width
- Locations: Yaml `config.process[*].sample.width`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `sample` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `1024` (process_type=`diffusion_trainer`)
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`); On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`); On Select present as `2048` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `512` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`sd15`); On Select present as `768` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `1024` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15`; On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ace_step_15_xl`; On Select present as `2048` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `512` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`sd15`; On Select present as `768` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `1024` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Lets evaluation use a model-appropriate aspect ratio.
- Drawbacks: Large widths increase memory and generation time and may be rounded by the model.
- Interactions: none
- Aliases: none
- Example: `width: 512`
- Source symbols: `toolkit/config_modules.py` :: `SampleConfig.__init__` :: `width` (`kwargs.get`)

<a id="save-dtype"></a>
### `save.dtype`

Selects the dtype used when checkpoint tensors are serialized.

- UI label: Data Type
- Locations: Yaml `config.process[*].save.dtype`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `torch-dtype-name` / `string`
- Accepted types/values: not separately constrained; `"float"`, `"fp32"`, `"single"`, `"float32"`, `"fp16"`, `"half"`, `"float16"`, `"bf16"`, `"bfloat16"`, `"8bit"`, `"e4m3fn"`, `"float8"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"bf16"`, `"fp16"`, `"fp32"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"float16"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can reduce checkpoint size or preserve higher precision.
- Drawbacks: Low-precision formats can lose detail, and unsupported dtype strings fail downstream.
- Interactions: none
- Aliases: none
- Example: `dtype: float16`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `dtype` (`kwargs.get`)

<a id="save-hf-private"></a>
### `save.hf_private`

Marks a newly created Hugging Face repository private when hub upload is enabled.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].save.hf_private`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Keeps uploaded training artifacts access-controlled.
- Drawbacks: Private repositories require authenticated access for later downloads.
- Interactions: none
- Aliases: none
- Example: `hf_private: true`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `hf_private` (`kwargs.get`)

<a id="save-hf-repo-id"></a>
### `save.hf_repo_id`

Names the Hugging Face repository that receives uploaded checkpoints.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].save.hf_repo_id`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
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
- Benefits: Routes artifacts to a stable remote repository.
- Drawbacks: A missing or unauthorized repository identifier makes hub upload fail.
- Interactions: none
- Aliases: none
- Example: `hf_repo_id: owner/model-lora`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `hf_repo_id` (`kwargs.get`)

<a id="save-max-step-saves-to-keep"></a>
### `save.max_step_saves_to_keep`

Limits how many numbered step checkpoints remain after cleanup.

- UI label: Max Step Saves to Keep
- Locations: Yaml `config.process[*].save.max_step_saves_to_keep`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `5` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Zero means unlimited numbered checkpoints: Python's \[:-0\] slice is empty, so retention performs no cleanup. Positive values retain that many numbered checkpoint artifacts; the single save-root optimizer.pt is overwritten on a successful optimizer-state save rather than retained as one file per checkpoint. (all supported configurations)
- Benefits: Bounds checkpoint disk usage during long runs.
- Drawbacks: A small limit removes older recovery points.
- Interactions: none
- Aliases: none
- Example: `max_step_saves_to_keep: 5`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `max_step_saves_to_keep` (`kwargs.get`)

<a id="save-push-to-hub"></a>
### `save.push_to_hub`

Uploads saved output to the configured Hugging Face repository after training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].save.push_to_hub`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Publishes or backs up the resulting artifacts automatically.
- Drawbacks: Requires credentials and network access and can expose artifacts if privacy is misconfigured.
- Interactions: none
- Aliases: none
- Example: `push_to_hub: false`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `push_to_hub` (`kwargs.get`)

<a id="save-save-every"></a>
### `save.save_every`

Sets the optimizer-step interval between numbered checkpoints.

- UI label: Save Every
- Locations: Yaml `config.process[*].save.save_every`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
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
- Engine fallback: present as `1000` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Zero or explicit null is preserved and falsey at the truthiness guard, so either value disables periodic save cadence; the unconditional final save still occurs at training completion. Each scheduled model/network save also attempts to serialize the active optimizer state to optimizer.pt at the save root; optimizer-state save failures are reported without making optimizer.pt a LoRA checkpoint. (all supported configurations)
- Benefits: Creates recovery and comparison points during training.
- Drawbacks: Short intervals interrupt training more often and consume more storage.
- Interactions: none
- Aliases: none
- Example: `save_every: 1000`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `save_every` (`kwargs.get`)

<a id="save-save-format"></a>
### `save.save_format`

Chooses safetensors output or a Diffusers directory.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].save.save_format`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `save` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"safetensors"`, `"diffusers"`
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
- Benefits: Matches the artifact layout to downstream tooling.
- Drawbacks: Diffusers output uses multiple files, while safetensors may not fit every full-model workflow.
- Interactions: none
- Aliases: none
- Example: `save_format: safetensors`
- Source symbols: `toolkit/config_modules.py` :: `SaveConfig.__init__` :: `save_format` (`kwargs.get`)


## Training

<a id="process-save"></a>
### `process.save`

Checkpoint configuration forwarded to SaveConfig.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].save`
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
- Benefits: Controls checkpoint cadence and serialization.
- Drawbacks: Frequent or retained checkpoints consume storage and time.
- Interactions: none
- Aliases: none
- Example: `save: {}`
- Source symbols: `jobs/process/BaseSDTrainProcess.py` :: `BaseSDTrainProcess.__init__` :: `save` (`get_conf`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
