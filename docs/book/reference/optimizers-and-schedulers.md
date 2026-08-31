# Optimizer and scheduler settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This page covers optimizer selection, optimizer-specific parameters, learning-rate schedulers, and scheduler parameters assigned here by the catalog. Applicability predicates are authoritative: similarly named parameters are not interchangeable across implementations, and UI-created values remain distinct from engine fallbacks.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Optimizers And Schedulers

<a id="optimizer-adafactor-param-beta1"></a>
### `optimizer.adafactor.param.beta1`

In adafactor, controls first-moment momentum and null disables that state; discovered defaults are Adafactor.\_\_init\_\_.beta1=None.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.beta1`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.beta1":"None"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to retain momentum only when smoothing is wanted.
- Drawbacks: With adafactor, stale momentum risks preserving an obsolete direction.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether beta1 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `beta1: null`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `beta1` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-clip_threshold"></a>
### `optimizer.adafactor.param.clip_threshold`

In adafactor, RMS-clips the preconditioned update; discovered defaults are Adafactor.\_\_init\_\_.clip\_threshold=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.clip_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.clip_threshold":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to bound unusually large normalized updates.
- Drawbacks: With adafactor, too-small clipping risks suppressing learning.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether clip\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `clip_threshold: 1.0`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `clip_threshold` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-decay_rate"></a>
### `optimizer.adafactor.param.decay_rate`

In adafactor, sets Adafactor time-varying second-moment exponent; discovered defaults are Adafactor.\_\_init\_\_.decay\_rate=-0.8.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.decay_rate`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.decay_rate":"-0.8"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to shape weighting of recent squared gradients.
- Drawbacks: With adafactor, poor decay risks stale or noisy variance.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether decay\_rate is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `decay_rate: -0.8`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `decay_rate` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-do_paramiter_swapping"></a>
### `optimizer.adafactor.param.do_paramiter_swapping`

In adafactor, rotates subsets of trainable parameters; discovered defaults are Adafactor.\_\_init\_\_.do\_paramiter\_swapping=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.do_paramiter_swapping`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.do_paramiter_swapping":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use this value to reduce active parameter memory.
- Drawbacks: With adafactor, small active subsets risk slower coverage.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether do\_paramiter\_swapping is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `do_paramiter_swapping: false`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `do_paramiter_swapping` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-eps"></a>
### `optimizer.adafactor.param.eps`

In adafactor, adds a denominator stability floor; discovered defaults are Adafactor.\_\_init\_\_.eps=(1e-30, 0.001).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number-pair` / `two-positive-numbers` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.eps":"(1e-30, 0.001)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to avoid division by tiny second moments.
- Drawbacks: With adafactor, large eps risks suppressing small gradients.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `eps: [1.0e-30, 0.001]`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-lr"></a>
### `optimizer.adafactor.param.lr`

In adafactor, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adafactor\_\_lr=float(learning\_rate), Adafactor.\_\_init\_\_.lr=None.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.lr":"None","get_optimizer.adafactor__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adafactor, optimizer\_params duplication raises TypeError. For adafactor, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__lr` (`optimizer.injected`); `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-paramiter_swapping_factor"></a>
### `optimizer.adafactor.param.paramiter_swapping_factor`

In adafactor, sets the active swapping fraction; discovered defaults are Adafactor.\_\_init\_\_.paramiter\_swapping\_factor=0.1.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.paramiter_swapping_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.paramiter_swapping_factor":"0.1"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to balance coverage against memory.
- Drawbacks: With adafactor, tiny fractions risk sparse coverage.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether paramiter\_swapping\_factor is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `paramiter_swapping_factor: 0.1`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `paramiter_swapping_factor` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-relative_step"></a>
### `optimizer.adafactor.param.relative_step`

In adafactor, selects Adafactor internal relative steps; discovered defaults are get\_optimizer.adafactor\_\_relative\_step=False, Adafactor.\_\_init\_\_.relative\_step=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.relative_step`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `false-only` / `boolean`
- Accepted types/values: not separately constrained; `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.relative_step":"True","get_optimizer.adafactor__relative_step":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use relative\_step: false so the dispatcher’s manual train.lr remains valid.
- Drawbacks: With adafactor, true with manual lr raises ValueError. relative\_step=true is unusable through get\_optimizer because it always injects a manual learning rate; Adafactor raises ValueError for that combination.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether relative\_step is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `relative_step: false`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__relative_step` (`optimizer.injected`); `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__relative_step` (`optimizer.consumed`); `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `relative_step` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-scale_parameter"></a>
### `optimizer.adafactor.param.scale_parameter`

In adafactor, scales relative rate by parameter RMS; discovered defaults are get\_optimizer.adafactor\_\_scale\_parameter=False, Adafactor.\_\_init\_\_.scale\_parameter=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.scale_parameter`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.scale_parameter":"True","get_optimizer.adafactor__scale_parameter":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use this value to adapt steps to tensor magnitude.
- Drawbacks: With adafactor, different RMS values risk uneven rates.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether scale\_parameter is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `scale_parameter: true`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__scale_parameter` (`optimizer.injected`); `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__scale_parameter` (`optimizer.consumed`); `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `scale_parameter` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-stochastic_accumulation"></a>
### `optimizer.adafactor.param.stochastic_accumulation`

In adafactor, controls low-precision stochastic gradient accumulation; discovered defaults are Adafactor.\_\_init\_\_.stochastic\_accumulation=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.stochastic_accumulation`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.stochastic_accumulation":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use this value to preserve tiny micro-batch contributions.
- Drawbacks: With adafactor, falsey input risks losing small contributions.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether stochastic\_accumulation is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `stochastic_accumulation: true`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `stochastic_accumulation` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-stochastic_rounding"></a>
### `optimizer.adafactor.param.stochastic_rounding`

In adafactor, controls stochastic low-precision writes; discovered defaults are Adafactor.\_\_init\_\_.stochastic\_rounding=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.stochastic_rounding`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.stochastic_rounding":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use this value to reduce rounding bias.
- Drawbacks: With adafactor, falsey input risks systematic bias.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether stochastic\_rounding is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `stochastic_rounding: true`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `stochastic_rounding` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-warmup_init"></a>
### `optimizer.adafactor.param.warmup_init`

In adafactor, selects Adafactor relative-step warmup; discovered defaults are get\_optimizer.adafactor\_\_warmup\_init=False, Adafactor.\_\_init\_\_.warmup\_init=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.warmup_init`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `boolean` / `false-only` / `boolean`
- Accepted types/values: not separately constrained; `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.warmup_init":"False","get_optimizer.adafactor__warmup_init":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adafactor, use this value to keep dispatcher-compatible manual-rate mode false.
- Drawbacks: With adafactor, true requires relative\_step and raises ValueError here. warmup\_init=true is unusable through get\_optimizer because it always injects a manual learning rate; Adafactor raises ValueError for that combination.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether warmup\_init is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `warmup_init: false`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__warmup_init` (`optimizer.injected`); `toolkit/optimizer.py` :: `get_optimizer` :: `adafactor__warmup_init` (`optimizer.consumed`); `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `warmup_init` (`optimizer.parameter`)

<a id="optimizer-adafactor-param-weight_decay"></a>
### `optimizer.adafactor.param.weight_decay`

In adafactor, sets regularization strength; discovered defaults are Adafactor.\_\_init\_\_.weight\_decay=0.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adafactor`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adafactor.__init__.weight_decay":"0.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adafactor, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With adafactor, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0.0`
- Source symbols: `toolkit/optimizers/adafactor.py` :: `Adafactor.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-adagrad-param-lr"></a>
### `optimizer.adagrad.param.lr`

In adagrad, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adagrad\_\_lr=float(learning\_rate).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adagrad`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adagrad__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adagrad, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adagrad, optimizer\_params duplication raises TypeError. For adagrad, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adagrad__lr` (`optimizer.injected`)

<a id="optimizer-adam-param-eps"></a>
### `optimizer.adam.param.eps`

In adam, adds a denominator stability floor; discovered defaults are get\_optimizer.adam\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adam__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With adam, large eps risks suppressing small gradients. For adam, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam__eps` (`optimizer.injected`)

<a id="optimizer-adam-param-lr"></a>
### `optimizer.adam.param.lr`

In adam, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adam\_\_lr=float(learning\_rate).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adam__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adam, optimizer\_params duplication raises TypeError. For adam, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam__lr` (`optimizer.injected`)

<a id="optimizer-adam8-adamw8-param-betas"></a>
### `optimizer.adam8-adamw8.param.betas`

In adam8 and adamw8, supplies first- and second-moment decays; discovered defaults are Adam8bit.\_\_init\_\_.betas=(0.9, 0.999).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.betas`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`
- Parser/supported/example types: `number-pair` / `two-numbers-in-[0, 1)` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adam8bit.__init__.betas":"(0.9, 0.999)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8 and adamw8, use this value to control momentum and variance averaging.
- Drawbacks: With adam8 and adamw8, out-of-range coefficients raise ValueError or risk invalid moments.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether betas is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `betas: [0.0, 0.999]`
- Source symbols: `toolkit/optimizers/adam8bit.py` :: `Adam8bit.__init__` :: `betas` (`optimizer.parameter`)

<a id="optimizer-adam8-adamw8-param-eps"></a>
### `optimizer.adam8-adamw8.param.eps`

In adam8 and adamw8, adds a denominator stability floor; discovered defaults are get\_optimizer.adam8\_\_eps=1e-06, get\_optimizer.adamw8\_\_eps=1e-06, Adam8bit.\_\_init\_\_.eps=1e-08.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adam8bit.__init__.eps":"1e-08","get_optimizer.adam8__eps":"1e-06","get_optimizer.adamw8__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8 and adamw8, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With adam8 and adamw8, large eps risks suppressing small gradients. For adam8 or adamw8, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam8__eps` (`optimizer.injected`); `toolkit/optimizers/adam8bit.py` :: `Adam8bit.__init__` :: `eps` (`optimizer.parameter`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8__eps` (`optimizer.injected`)

<a id="optimizer-adam8-adamw8-param-lr"></a>
### `optimizer.adam8-adamw8.param.lr`

In adam8 and adamw8, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adam8\_\_lr=learning\_rate, get\_optimizer.adamw8\_\_lr=learning\_rate, Adam8bit.\_\_init\_\_.lr=0.001.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adam8bit.__init__.lr":"0.001","get_optimizer.adam8__lr":"learning_rate","get_optimizer.adamw8__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8 and adamw8, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adam8 and adamw8, optimizer\_params duplication raises TypeError. For adam8 or adamw8, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam8__lr` (`optimizer.injected`); `toolkit/optimizers/adam8bit.py` :: `Adam8bit.__init__` :: `lr` (`optimizer.parameter`); `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8__lr` (`optimizer.injected`)

<a id="optimizer-adam8-adamw8-param-weight_decay"></a>
### `optimizer.adam8-adamw8.param.weight_decay`

In adam8 and adamw8, sets regularization strength; discovered defaults are Adam8bit.\_\_init\_\_.weight\_decay=0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8`; process_type=`diffusion_trainer`, optimizer=`adamw8`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adam8bit.__init__.weight_decay":"0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8 and adamw8, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With adam8 and adamw8, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0`
- Source symbols: `toolkit/optimizers/adam8bit.py` :: `Adam8bit.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-adam8-param-decouple"></a>
### `optimizer.adam8.param.decouple`

In adam8, selects decoupled or coupled weight decay; the Adam8bit constructor default is decouple=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.decouple`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Adam8bit.__init__.decouple":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For adam8, use this value to choose whether decay acts on weights or gradients.
- Drawbacks: With adam8, the wrong form risks changing the objective.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether decouple is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `decouple: true`
- Source symbols: `toolkit/optimizers/adam8bit.py` :: `Adam8bit.__init__` :: `decouple` (`optimizer.parameter`)

<a id="optimizer-adam8bit-param-eps"></a>
### `optimizer.adam8bit.param.eps`

In adam8bit, adds a denominator stability floor; discovered defaults are get\_optimizer.adam8bit\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adam8bit__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8bit, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With adam8bit, large eps risks suppressing small gradients. For adam8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam8bit__eps` (`optimizer.injected`)

<a id="optimizer-adam8bit-param-lr"></a>
### `optimizer.adam8bit.param.lr`

In adam8bit, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adam8bit\_\_lr=learning\_rate.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adam8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adam8bit__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adam8bit, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adam8bit, optimizer\_params duplication raises TypeError. For adam8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adam8bit__lr` (`optimizer.injected`)

<a id="optimizer-adamw-param-eps"></a>
### `optimizer.adamw.param.eps`

In adamw, adds a denominator stability floor; discovered defaults are get\_optimizer.adamw\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adamw`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adamw__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adamw, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With adamw, large eps risks suppressing small gradients. For adamw, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adamw__eps` (`optimizer.injected`)

<a id="optimizer-adamw-param-lr"></a>
### `optimizer.adamw.param.lr`

In adamw, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adamw\_\_lr=float(learning\_rate).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adamw`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adamw__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adamw, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adamw, optimizer\_params duplication raises TypeError. For adamw, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adamw__lr` (`optimizer.injected`)

<a id="optimizer-adamw8bit-param-eps"></a>
### `optimizer.adamw8bit.param.eps`

In adamw8bit, adds a denominator stability floor; discovered defaults are get\_optimizer.adamw8bit\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adamw8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adamw8bit__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adamw8bit, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With adamw8bit, large eps risks suppressing small gradients. For adamw8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8bit__eps` (`optimizer.injected`)

<a id="optimizer-adamw8bit-param-lr"></a>
### `optimizer.adamw8bit.param.lr`

In adamw8bit, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.adamw8bit\_\_lr=learning\_rate.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`adamw8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.adamw8bit__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For adamw8bit, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With adamw8bit, optimizer\_params duplication raises TypeError. For adamw8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `adamw8bit__lr` (`optimizer.injected`)

<a id="optimizer-ademamix8bit-param-eps"></a>
### `optimizer.ademamix8bit.param.eps`

In ademamix8bit, adds a denominator stability floor; discovered defaults are get\_optimizer.ademamix8bit\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`ademamix8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.ademamix8bit__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For ademamix8bit, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With ademamix8bit, large eps risks suppressing small gradients. For ademamix8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `ademamix8bit__eps` (`optimizer.injected`)

<a id="optimizer-ademamix8bit-param-lr"></a>
### `optimizer.ademamix8bit.param.lr`

In ademamix8bit, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.ademamix8bit\_\_lr=learning\_rate.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`ademamix8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.ademamix8bit__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For ademamix8bit, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With ademamix8bit, optimizer\_params duplication raises TypeError. For ademamix8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `ademamix8bit__lr` (`optimizer.injected`)

<a id="optimizer-automagic-param-beta2"></a>
### `optimizer.automagic.param.beta2`

In automagic, sets squared-gradient EMA decay; discovered defaults are Automagic.\_\_init\_\_.beta2=0.999.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.beta2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.beta2":"0.999"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to smooth noisy variance estimates.
- Drawbacks: With automagic, near-one decay reacts slowly and low decay risks noise.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether beta2 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `beta2: 0.999`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `beta2` (`optimizer.parameter`)

<a id="optimizer-automagic-param-clip_threshold"></a>
### `optimizer.automagic.param.clip_threshold`

In automagic, RMS-clips the preconditioned update; discovered defaults are Automagic.\_\_init\_\_.clip\_threshold=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.clip_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.clip_threshold":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to bound unusually large normalized updates.
- Drawbacks: With automagic, too-small clipping risks suppressing learning.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether clip\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `clip_threshold: 1.0`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `clip_threshold` (`optimizer.parameter`)

<a id="optimizer-automagic-param-do_paramiter_swapping"></a>
### `optimizer.automagic.param.do_paramiter_swapping`

In automagic, rotates subsets of trainable parameters; discovered defaults are Automagic.\_\_init\_\_.do\_paramiter\_swapping=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.do_paramiter_swapping`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.do_paramiter_swapping":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For automagic, use this value to reduce active parameter memory.
- Drawbacks: With automagic, small active subsets risk slower coverage.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether do\_paramiter\_swapping is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `do_paramiter_swapping: false`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `do_paramiter_swapping` (`optimizer.parameter`)

<a id="optimizer-automagic-param-eps"></a>
### `optimizer.automagic.param.eps`

Automagic uses scalar eps directly and uses the first element when eps is a tuple or list to stabilize its squared-gradient update.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number-or-number-pair` / `positive-number-or-two-positive-numbers` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.eps":"(1e-30, 0.001)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use eps: 1e-30 to match Automagic’s scalar update floor without changing its denominator scale.
- Drawbacks: A large Automagic eps can dominate small gradients and risks suppressing useful updates.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `eps: 1.0e-30`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-automagic-param-lr"></a>
### `optimizer.automagic.param.lr`

In automagic, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.automagic\_\_lr=float(learning\_rate), Automagic.\_\_init\_\_.lr=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.lr":"1e-06","get_optimizer.automagic__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With automagic, optimizer\_params duplication raises TypeError. For automagic, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `automagic__lr` (`optimizer.injected`); `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-automagic-param-lr_bump"></a>
### `optimizer.automagic.param.lr_bump`

In automagic, sets additive Automagic rate adjustment; discovered defaults are Automagic.\_\_init\_\_.lr\_bump=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr_bump`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.lr_bump":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to control rate exploration speed.
- Drawbacks: With automagic, large bumps risk oscillation.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr\_bump is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `lr_bump: 1.0e-6`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `lr_bump` (`optimizer.parameter`)

<a id="optimizer-automagic-param-max_lr"></a>
### `optimizer.automagic.param.max_lr`

In automagic, caps adaptive learning rate; discovered defaults are Automagic.\_\_init\_\_.max\_lr=0.001.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.max_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.max_lr":"0.001"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to prevent excessive adaptive rates.
- Drawbacks: With automagic, a high ceiling risks allowing its squared-gradient controller to take excessive adaptive steps.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether max\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `max_lr: 0.001`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `max_lr` (`optimizer.parameter`)

<a id="optimizer-automagic-param-min_lr"></a>
### `optimizer.automagic.param.min_lr`

In automagic, floors adaptive learning rate; discovered defaults are Automagic.\_\_init\_\_.min\_lr=1e-07.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.min_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.min_lr":"1e-07"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to prevent the rate vanishing.
- Drawbacks: With automagic, a high floor risks preventing the adaptive rate from shrinking enough after unstable gradients.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether min\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `min_lr: 1.0e-7`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `min_lr` (`optimizer.parameter`)

<a id="optimizer-automagic-param-paramiter_swapping_factor"></a>
### `optimizer.automagic.param.paramiter_swapping_factor`

In automagic, sets the active swapping fraction; discovered defaults are Automagic.\_\_init\_\_.paramiter\_swapping\_factor=0.1.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.paramiter_swapping_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.paramiter_swapping_factor":"0.1"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to balance coverage against memory.
- Drawbacks: With automagic, tiny fractions risk sparse coverage.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether paramiter\_swapping\_factor is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `paramiter_swapping_factor: 0.1`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `paramiter_swapping_factor` (`optimizer.parameter`)

<a id="optimizer-automagic-param-weight_decay"></a>
### `optimizer.automagic.param.weight_decay`

In automagic, sets regularization strength; discovered defaults are Automagic.\_\_init\_\_.weight\_decay=0.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic.__init__.weight_decay":"0.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With automagic, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0.0`
- Source symbols: `toolkit/optimizers/automagic.py` :: `Automagic.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-agreement_threshold"></a>
### `optimizer.automagic2.param.agreement_threshold`

In automagic2, measures update-sign agreement before Automagic2 chooses the LR bump direction; discovered defaults are Automagic2.\_\_init\_\_.agreement\_threshold=0.5.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.agreement_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.agreement_threshold":"0.5"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to tune when Automagic2 raises rather than lowers its rate.
- Drawbacks: With automagic2, extreme thresholds risk one-way rate movement.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether agreement\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `agreement_threshold: 0.5`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `agreement_threshold` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-beta2"></a>
### `optimizer.automagic2.param.beta2`

In automagic2, sets squared-gradient EMA decay; discovered defaults are Automagic2.\_\_init\_\_.beta2=0.999.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.beta2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.beta2":"0.999"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to smooth noisy variance estimates.
- Drawbacks: With automagic2, near-one decay reacts slowly and low decay risks noise.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether beta2 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `beta2: 0.999`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `beta2` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-clip_threshold"></a>
### `optimizer.automagic2.param.clip_threshold`

In automagic2, RMS-clips the preconditioned update; discovered defaults are Automagic2.\_\_init\_\_.clip\_threshold=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.clip_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.clip_threshold":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to bound unusually large normalized updates.
- Drawbacks: With automagic2, too-small clipping risks suppressing learning.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether clip\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `clip_threshold: 1.0`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `clip_threshold` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-eps"></a>
### `optimizer.automagic2.param.eps`

In automagic2, adds a denominator stability floor; discovered defaults are Automagic2.\_\_init\_\_.eps=1e-30.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.eps":"1e-30"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to avoid division by tiny second moments.
- Drawbacks: With automagic2, large eps risks suppressing small gradients.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `eps: 1.0e-30`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-lr"></a>
### `optimizer.automagic2.param.lr`

In automagic2, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.automagic2\_\_lr=float(learning\_rate), Automagic2.\_\_init\_\_.lr=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.lr":"1e-06","get_optimizer.automagic2__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Automagic2 replaces a starting train.lr above 1e-3 with 1e-6 before optimizer state is created. (all supported configurations)
- Benefits: For automagic2, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With automagic2, optimizer\_params duplication raises TypeError. For automagic2, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `automagic2__lr` (`optimizer.injected`); `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-lr_bump"></a>
### `optimizer.automagic2.param.lr_bump`

In automagic2, sets additive Automagic rate adjustment; discovered defaults are Automagic2.\_\_init\_\_.lr\_bump=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr_bump`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.lr_bump":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to control rate exploration speed.
- Drawbacks: With automagic2, large bumps risk oscillation.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr\_bump is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `lr_bump: 1.0e-6`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `lr_bump` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-max_lr"></a>
### `optimizer.automagic2.param.max_lr`

In automagic2, caps adaptive learning rate; discovered defaults are Automagic2.\_\_init\_\_.max\_lr=0.001.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.max_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.max_lr":"0.001"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to prevent excessive adaptive rates.
- Drawbacks: With automagic2, a high ceiling risks allowing excessive adaptive steps before direction changes reduce the rate.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether max\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `max_lr: 0.001`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `max_lr` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-min_lr"></a>
### `optimizer.automagic2.param.min_lr`

In automagic2, floors adaptive learning rate; discovered defaults are Automagic2.\_\_init\_\_.min\_lr=1e-07.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.min_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.min_lr":"1e-07"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to prevent the rate vanishing.
- Drawbacks: With automagic2, a high floor risks preventing the adaptive rate from shrinking enough after direction changes.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether min\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `min_lr: 1.0e-7`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `min_lr` (`optimizer.parameter`)

<a id="optimizer-automagic2-param-weight_decay"></a>
### `optimizer.automagic2.param.weight_decay`

In automagic2, sets regularization strength; discovered defaults are Automagic2.\_\_init\_\_.weight\_decay=0.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic2`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic2.__init__.weight_decay":"0.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic2, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With automagic2, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0.0`
- Source symbols: `toolkit/optimizers/automagic2.py` :: `Automagic2.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-beta2"></a>
### `optimizer.automagic3.param.beta2`

In automagic3, sets squared-gradient EMA decay; discovered defaults are Automagic3.\_\_init\_\_.beta2=0.999.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.beta2`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.beta2":"0.999"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to smooth noisy variance estimates.
- Drawbacks: With automagic3, near-one decay reacts slowly and low decay risks noise.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether beta2 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `beta2: 0.999`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `beta2` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-clip_threshold"></a>
### `optimizer.automagic3.param.clip_threshold`

In automagic3, RMS-clips the preconditioned update; discovered defaults are Automagic3.\_\_init\_\_.clip\_threshold=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.clip_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.clip_threshold":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to bound unusually large normalized updates.
- Drawbacks: With automagic3, too-small clipping risks suppressing learning.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether clip\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `clip_threshold: 1.0`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `clip_threshold` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-eps"></a>
### `optimizer.automagic3.param.eps`

In automagic3, adds a denominator stability floor; discovered defaults are Automagic3.\_\_init\_\_.eps=1e-30.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.eps":"1e-30"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to avoid division by tiny second moments.
- Drawbacks: With automagic3, large eps risks suppressing small gradients.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `eps: 1.0e-30`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-fused"></a>
### `optimizer.automagic3.param.fused`

automagic3 fused=true applies parameter updates inside backward and frees each gradient; fused=false restores ordinary .step() updates.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.fused`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.fused":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: Use fused=false with automagic3 when gradient accumulation or pre-step gradient clipping must operate normally.
- Drawbacks: With automagic3 fused=true, updates occur before ordinary gradient accumulation and gradient clipping, risking different optimization behavior.
- Interactions: Conflicts `train.gradient_accumulation`: fused=true updates during each backward pass before micro-batch gradients can accumulate; fused=false restores ordinary accumulation. (all supported configurations); Conflicts `train.max_grad_norm`: fused=true consumes and clears gradients before the trainer can clip them; fused=false restores pre-step clipping. (all supported configurations)
- Aliases: none
- Example: `fused: false`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `fused` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-lr"></a>
### `optimizer.automagic3.param.lr`

In automagic3, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.automagic3\_\_lr=float(learning\_rate), Automagic3.\_\_init\_\_.lr=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.lr":"1e-06","get_optimizer.automagic3__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With automagic3, optimizer\_params duplication raises TypeError. For automagic3, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `automagic3__lr` (`optimizer.injected`); `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-max_lr"></a>
### `optimizer.automagic3.param.max_lr`

In automagic3, caps adaptive learning rate; discovered defaults are Automagic3.\_\_init\_\_.max\_lr=1000.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.max_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.max_lr":"1000.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to prevent excessive adaptive rates.
- Drawbacks: With automagic3, a ceiling below min\_lr can raise ValueError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether max\_lr is accepted, injected, or ignored. (all supported configurations); Constrains `optimizer.automagic3.param.min_lr`: Automagic3 requires max\_lr &gt;= min\_lr during construction. (all supported configurations)
- Aliases: none
- Example: `max_lr: 1000.0`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `max_lr` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-min_lr"></a>
### `optimizer.automagic3.param.min_lr`

In automagic3, floors adaptive learning rate; discovered defaults are Automagic3.\_\_init\_\_.min\_lr=1e-08.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.min_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.min_lr":"1e-08"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to prevent the rate vanishing.
- Drawbacks: With automagic3, a floor above max\_lr can raise ValueError. If Automagic3 min\_lr exceeds max\_lr, construction raises ValueError; a floor that is too high risks preventing the controller from reducing unstable steps.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether min\_lr is accepted, injected, or ignored. (all supported configurations); Constrains `optimizer.automagic3.param.max_lr`: Automagic3 requires min\_lr &lt;= max\_lr during construction. (all supported configurations)
- Aliases: none
- Example: `min_lr: 1.0e-8`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `min_lr` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-polarity_history"></a>
### `optimizer.automagic3.param.polarity_history`

In automagic3, sets the sign-vote window; discovered defaults are Automagic3.\_\_init\_\_.polarity\_history=8.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.polarity_history`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `integer` / `integer-clamped-2-through-64` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[2, 64]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.polarity_history":"8"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: automagic3 converts polarity\_history to int and clamps it to the inclusive range 2 through 64. (all supported configurations)
- Benefits: For automagic3, use this value to balance response speed against history.
- Drawbacks: With automagic3, out-of-range input is clamped and risks changed intent.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether polarity\_history is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `polarity_history: 8`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `polarity_history` (`optimizer.parameter`)

<a id="optimizer-automagic3-param-weight_decay"></a>
### `optimizer.automagic3.param.weight_decay`

In automagic3, sets regularization strength; discovered defaults are Automagic3.\_\_init\_\_.weight\_decay=0.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagic3`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Automagic3.__init__.weight_decay":"0.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagic3, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With automagic3, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0.0`
- Source symbols: `toolkit/optimizers/automagic3.py` :: `Automagic3.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-betas"></a>
### `optimizer.automagicexperiment.param.betas`

AutomagicEXPERIMENT requires beta1=0 and uses beta2 for its bias-corrected squared-gradient EMA.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.betas`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number-pair` / `pair-beta1-exactly-0-beta2-in-[0,1)` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.betas":"(0.0, 0.999)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use betas: \[0.0, 0.999\] to preserve the source default and its sign-history controller.
- Drawbacks: beta1 must be exactly 0 or AutomagicEXPERIMENT raises ValueError; beta2 outside \[0, 1) risks invalid EMA behavior.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether betas is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `betas: [0.0, 0.999]`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `betas` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-clip_threshold"></a>
### `optimizer.automagicexperiment.param.clip_threshold`

In automagicexperiment, RMS-clips the preconditioned update; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.clip\_threshold=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.clip_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.clip_threshold":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use this value to bound unusually large normalized updates.
- Drawbacks: With automagicexperiment, too-small clipping risks suppressing learning.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether clip\_threshold is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `clip_threshold: 1.0`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `clip_threshold` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-eps"></a>
### `optimizer.automagicexperiment.param.eps`

In automagicexperiment, adds a denominator stability floor; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.eps=1e-08.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.eps":"1e-08"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use this value to avoid division by tiny second moments.
- Drawbacks: With automagicexperiment, large eps risks suppressing small gradients.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `eps: 1.0e-8`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-fused"></a>
### `optimizer.automagicexperiment.param.fused`

automagicexperiment fused=true applies parameter updates inside backward and frees each gradient; fused=false restores ordinary .step() updates.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.fused`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.fused":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: Use fused=false with automagicexperiment when gradient accumulation or pre-step gradient clipping must operate normally.
- Drawbacks: With automagicexperiment fused=true, updates occur before ordinary gradient accumulation and gradient clipping, risking different optimization behavior.
- Interactions: Conflicts `train.gradient_accumulation`: fused=true updates during each backward pass before micro-batch gradients can accumulate; fused=false restores ordinary accumulation. (all supported configurations); Conflicts `train.max_grad_norm`: fused=true consumes and clears gradients before the trainer can clip them; fused=false restores pre-step clipping. (all supported configurations)
- Aliases: none
- Example: `fused: false`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `fused` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-lr"></a>
### `optimizer.automagicexperiment.param.lr`

In automagicexperiment, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.automagicexperiment\_\_lr=float(learning\_rate), AutomagicEXPERIMENT.\_\_init\_\_.lr=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.lr":"1e-06","get_optimizer.automagicexperiment__lr":"float(learning_rate)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With automagicexperiment, optimizer\_params duplication raises TypeError. For automagicexperiment, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `automagicexperiment__lr` (`optimizer.injected`); `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-max_lr"></a>
### `optimizer.automagicexperiment.param.max_lr`

In automagicexperiment, caps adaptive learning rate; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.max\_lr=1000.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.max_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.max_lr":"1000.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use this value to prevent excessive adaptive rates.
- Drawbacks: With automagicexperiment, a high ceiling risks letting its sign-history controller retain excessive adaptive rates.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether max\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `max_lr: 1000.0`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `max_lr` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-min_lr"></a>
### `optimizer.automagicexperiment.param.min_lr`

In automagicexperiment, floors adaptive learning rate; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.min\_lr=1e-30.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.min_lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.min_lr":"1e-30"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use this value to prevent the rate vanishing.
- Drawbacks: With automagicexperiment, a high floor risks preventing its sign-history controller from reducing unstable rates.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether min\_lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `min_lr: 1.0e-30`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `min_lr` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-polarity_history"></a>
### `optimizer.automagicexperiment.param.polarity_history`

In automagicexperiment, sets the sign-vote window; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.polarity\_history=8.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.polarity_history`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `integer` / `integer-clamped-2-through-64` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[2, 64]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.polarity_history":"8"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: automagicexperiment converts polarity\_history to int and clamps it to the inclusive range 2 through 64. (all supported configurations)
- Benefits: For automagicexperiment, use this value to balance response speed against history.
- Drawbacks: With automagicexperiment, out-of-range input is clamped and risks changed intent.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether polarity\_history is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `polarity_history: 8`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `polarity_history` (`optimizer.parameter`)

<a id="optimizer-automagicexperiment-param-weight_decay"></a>
### `optimizer.automagicexperiment.param.weight_decay`

In automagicexperiment, sets regularization strength; discovered defaults are AutomagicEXPERIMENT.\_\_init\_\_.weight\_decay=0.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer=`automagicexperiment`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"AutomagicEXPERIMENT.__init__.weight_decay":"0.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For automagicexperiment, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With automagicexperiment, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0.0`
- Source symbols: `toolkit/optimizers/automagicEXPERIMENT.py` :: `AutomagicEXPERIMENT.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="optimizer-dadaptation-param-eps"></a>
### `optimizer.dadaptation.param.eps`

In dadaptation, adds a denominator stability floor; discovered defaults are get\_optimizer.dadaptation\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`dadaptation`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.dadaptation__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For dadaptation, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With dadaptation, large eps risks suppressing small gradients. For dadaptation, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `dadaptation__eps` (`optimizer.injected`)

<a id="optimizer-dadaptation-param-lr"></a>
### `optimizer.dadaptation.param.lr`

In dadaptation, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.dadaptation\_\_lr=use\_lr.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`dadaptation`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.dadaptation__lr":"use_lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When train.lr is below 0.1, get\_optimizer replaces it with 1.0 before dispatch. (optimizer=`dadaptation`)
- Benefits: For dadaptation, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With dadaptation, optimizer\_params duplication raises TypeError. For dadaptation, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `dadaptation__lr` (`optimizer.injected`)

<a id="optimizer-dadaptationadam-param-eps"></a>
### `optimizer.dadaptationadam.param.eps`

For the dadaptationadam example and every DAdaptation name ending in adam, the dispatcher injects eps=1e-6 into DAdaptLion.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`dadaptation`, optimizer_suffix=`adam`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prefix=dadaptation;suffix=adam__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For dadaptationadam, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With dadaptationadam, large eps risks suppressing small gradients. For dadaptationadam, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=adam__eps` (`optimizer.injected`)

<a id="optimizer-dadaptationadam-param-lr"></a>
### `optimizer.dadaptationadam.param.lr`

For the dadaptationadam example and every DAdaptation name ending in adam, the dispatcher passes normalized train.lr to DAdaptLion.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`dadaptation`, optimizer_suffix=`adam`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prefix=dadaptation;suffix=adam__lr":"use_lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When train.lr is below 0.1, get\_optimizer replaces it with 1.0 before dispatch. (optimizer_prefix=`dadaptation`, optimizer_suffix=`adam`)
- Benefits: For dadaptationadam, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With dadaptationadam, optimizer\_params duplication raises TypeError. For dadaptationadam, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=adam__lr` (`optimizer.injected`)

<a id="optimizer-dadaptationlion-param-eps"></a>
### `optimizer.dadaptationlion.param.eps`

For the dadaptationlion example and every DAdaptation name ending in lion, the dispatcher injects eps=1e-6 into DAdaptLion.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`dadaptation`, optimizer_suffix=`lion`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prefix=dadaptation;suffix=lion__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For dadaptationlion, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With dadaptationlion, large eps risks suppressing small gradients. For dadaptationlion, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=lion__eps` (`optimizer.injected`)

<a id="optimizer-dadaptationlion-param-lr"></a>
### `optimizer.dadaptationlion.param.lr`

For the dadaptationlion example and every DAdaptation name ending in lion, the dispatcher passes normalized train.lr to DAdaptLion.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`dadaptation`, optimizer_suffix=`lion`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prefix=dadaptation;suffix=lion__lr":"use_lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When train.lr is below 0.1, get\_optimizer replaces it with 1.0 before dispatch. (optimizer_prefix=`dadaptation`, optimizer_suffix=`lion`)
- Benefits: For dadaptationlion, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With dadaptationlion, optimizer\_params duplication raises TypeError. For dadaptationlion, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prefix=dadaptation;suffix=lion__lr` (`optimizer.injected`)

<a id="optimizer-lion-param-lr"></a>
### `optimizer.lion.param.lr`

In lion, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.lion\_\_lr=learning\_rate.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`lion`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.lion__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For lion, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With lion, optimizer\_params duplication raises TypeError. For lion, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `lion__lr` (`optimizer.injected`)

<a id="optimizer-lion8bit-param-lr"></a>
### `optimizer.lion8bit.param.lr`

In lion8bit, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.lion8bit\_\_lr=learning\_rate.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer=`lion8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.lion8bit__lr":"learning_rate"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For lion8bit, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With lion8bit, optimizer\_params duplication raises TypeError. For lion8bit, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `lion8bit__lr` (`optimizer.injected`)

<a id="optimizer-prodigyprefix-param-eps"></a>
### `optimizer.prodigy*.param.eps`

In prodigy\*, adds a denominator stability floor; discovered defaults are get\_optimizer.prodigy\_\_eps=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy`, optimizer_exclude_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prodigy__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy\*, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With prodigy\*, large eps risks suppressing small gradients. For prodigy\*, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy__eps` (`optimizer.injected`)

<a id="optimizer-prodigyprefix-param-lr"></a>
### `optimizer.prodigy*.param.lr`

In prodigy\*, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.prodigy\_\_lr=use\_lr.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy`, optimizer_exclude_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_optimizer.prodigy__lr":"use_lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When train.lr is below 0.1, get\_optimizer replaces it with 1.0 before dispatch. (optimizer_prefix=`prodigy`, optimizer_exclude_prefix=`prodigy8bit`)
- Benefits: For prodigy\*, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With prodigy\*, optimizer\_params duplication raises TypeError. For prodigy\*, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy__lr` (`optimizer.injected`)

<a id="optimizer-prodigy8bitprefix-param-beta3"></a>
### `optimizer.prodigy8bit*.param.beta3`

In prodigy8bit\*, sets Prodigy third-moment decay and null derives sqrt(beta2); discovered defaults are Prodigy8bit.\_\_init\_\_.beta3=None.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.beta3`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `probability` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1)`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.beta3":"None"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to derive beta3 from beta2 unless a separate decay is needed.
- Drawbacks: With prodigy8bit\*, an incompatible decay risks distorting the distance estimate.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether beta3 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `beta3: null`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `beta3` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-betas"></a>
### `optimizer.prodigy8bit*.param.betas`

In prodigy8bit\*, supplies first- and second-moment decays; discovered defaults are Prodigy8bit.\_\_init\_\_.betas=(0.9, 0.999).

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.betas`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number-pair` / `two-numbers-in-[0, 1)` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.betas":"(0.9, 0.999)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to control momentum and variance averaging.
- Drawbacks: With prodigy8bit\*, out-of-range coefficients raise ValueError or risk invalid moments.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether betas is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `betas: [0.0, 0.999]`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `betas` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-d0"></a>
### `optimizer.prodigy8bit*.param.d0`

In prodigy8bit\*, initializes Prodigy distance-to-solution; discovered defaults are Prodigy8bit.\_\_init\_\_.d0=1e-06.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.d0`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.d0":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to start the estimate from a small positive scale.
- Drawbacks: With prodigy8bit\*, nonpositive values raise ValueError and large values risk aggressive steps.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether d0 is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `d0: 1.0e-6`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `d0` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-d_coef"></a>
### `optimizer.prodigy8bit*.param.d_coef`

In prodigy8bit\*, scales Prodigy estimated distance; discovered defaults are Prodigy8bit.\_\_init\_\_.d\_coef=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.d_coef`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.d_coef":"1.0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to adjust adaptive-step aggressiveness.
- Drawbacks: With prodigy8bit\*, large coefficients risk oversized steps.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether d\_coef is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `d_coef: 1.0`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `d_coef` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-decouple"></a>
### `optimizer.prodigy8bit*.param.decouple`

In prodigy8bit\*, selects decoupled or coupled weight decay; discovered defaults are Prodigy8bit.\_\_init\_\_.decouple=True.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.decouple`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.decouple":"True"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For prodigy8bit\*, use this value to choose whether decay acts on weights or gradients.
- Drawbacks: With prodigy8bit\*, the wrong form risks changing the objective.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether decouple is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `decouple: true`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `decouple` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-eps"></a>
### `optimizer.prodigy8bit*.param.eps`

In prodigy8bit\*, adds a denominator stability floor; discovered defaults are get\_optimizer.prodigy8bit\_\_eps=1e-06, Prodigy8bit.\_\_init\_\_.eps=1e-08.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.eps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.eps":"1e-08","get_optimizer.prodigy8bit__eps":"1e-06"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use train.lr and leave optimizer\_params empty so eps is supplied once.
- Drawbacks: With prodigy8bit\*, large eps risks suppressing small gradients. For prodigy8bit\*, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether eps is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy8bit__eps` (`optimizer.injected`); `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `eps` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-fsdp_in_use"></a>
### `optimizer.prodigy8bit*.param.fsdp_in_use`

In prodigy8bit\*, selects Prodigy8bit FSDP behavior; discovered defaults are Prodigy8bit.\_\_init\_\_.fsdp\_in\_use=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.fsdp_in_use`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.fsdp_in_use":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For prodigy8bit\*, use this value to match distributed-state execution.
- Drawbacks: With prodigy8bit\*, the wrong mode risks synchronization assumptions.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether fsdp\_in\_use is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `fsdp_in_use: false`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `fsdp_in_use` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-growth_rate"></a>
### `optimizer.prodigy8bit*.param.growth_rate`

In prodigy8bit\*, caps Prodigy distance growth; discovered defaults are Prodigy8bit.\_\_init\_\_.growth\_rate=float('inf').

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.growth_rate`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `positive-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.growth_rate":"float('inf')"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to limit abrupt estimate expansion.
- Drawbacks: With prodigy8bit\*, excess growth risks abrupt steps.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether growth\_rate is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `growth_rate: 1.02`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `growth_rate` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-lr"></a>
### `optimizer.prodigy8bit*.param.lr`

In prodigy8bit\*, receives train.lr from the dispatcher; discovered defaults are get\_optimizer.prodigy8bit\_\_lr=use\_lr, Prodigy8bit.\_\_init\_\_.lr=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.lr`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.lr":"1.0","get_optimizer.prodigy8bit__lr":"use_lr"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When train.lr is below 0.1, get\_optimizer replaces it with 1.0 before dispatch. (optimizer_prefix=`prodigy8bit`)
- Benefits: For prodigy8bit\*, use train.lr and leave optimizer\_params empty so lr is supplied once.
- Drawbacks: With prodigy8bit\*, optimizer\_params duplication raises TypeError. For prodigy8bit\*, optimizer\_params presence for this key duplicates an unconditional dispatcher keyword and raises TypeError.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether lr is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `optimizer_params: {}`
- Source symbols: `toolkit/optimizer.py` :: `get_optimizer` :: `prodigy8bit__lr` (`optimizer.injected`); `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `lr` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-safeguard_warmup"></a>
### `optimizer.prodigy8bit*.param.safeguard_warmup`

In prodigy8bit\*, limits early Prodigy distance growth; discovered defaults are Prodigy8bit.\_\_init\_\_.safeguard\_warmup=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.safeguard_warmup`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.safeguard_warmup":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For prodigy8bit\*, use this value to make warmup conservative.
- Drawbacks: With prodigy8bit\*, disabling it risks rapid early growth.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether safeguard\_warmup is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `safeguard_warmup: false`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `safeguard_warmup` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-use_bias_correction"></a>
### `optimizer.prodigy8bit*.param.use_bias_correction`

In prodigy8bit\*, controls Prodigy8bit moment correction; discovered defaults are Prodigy8bit.\_\_init\_\_.use\_bias\_correction=False.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.use_bias_correction`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; `true`, `false`, `null`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.use_bias_correction":"False"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Explicit null is preserved by Python constructor assignment and remains falsey wherever this parameter is tested as a condition. (all supported configurations)
- Benefits: For prodigy8bit\*, use this value to compensate early-step estimates.
- Drawbacks: With prodigy8bit\*, disabling it risks startup bias.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether use\_bias\_correction is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `use_bias_correction: false`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `use_bias_correction` (`optimizer.parameter`)

<a id="optimizer-prodigy8bitprefix-param-weight_decay"></a>
### `optimizer.prodigy8bit*.param.weight_decay`

In prodigy8bit\*, sets regularization strength; discovered defaults are Prodigy8bit.\_\_init\_\_.weight\_decay=0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.optimizer_params.weight_decay`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `optimizer` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, optimizer_prefix=`prodigy8bit`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"Prodigy8bit.__init__.weight_decay":"0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: For prodigy8bit\*, use this value to regularize with a deliberate nonnegative coefficient.
- Drawbacks: With prodigy8bit\*, excess decay risks erasing learned weights.
- Interactions: Requires `train.optimizer`: The selected optimizer determines whether weight\_decay is accepted, injected, or ignored. (all supported configurations)
- Aliases: none
- Example: `weight_decay: 0`
- Source symbols: `toolkit/optimizers/prodigy_8bit.py` :: `Prodigy8bit.__init__` :: `weight_decay` (`optimizer.parameter`)

<a id="scheduler-constant-param-factor"></a>
### `scheduler.constant.param.factor`

In constant, sets ConstantLR base-rate multiplier; discovered defaults are get\_lr\_scheduler.factor=null, get\_lr\_scheduler.constant\_\_factor=1.0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params.factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, scheduler=`constant`
- Parser/supported/example types: `number` / `constant-factor` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_lr_scheduler.constant__factor":"1.0","get_lr_scheduler.factor":null}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: The local constant scheduler injects factor 1.0 only when factor is absent. (all supported configurations)
- Benefits: For constant, use this value to hold a fixed fraction of base LR.
- Drawbacks: With constant, out-of-range factors raise ValueError. Invalid local constructor arguments propagate their native TypeError or ValueError.
- Interactions: Requires `train.lr_scheduler`: factor is locally defaulted for constant and otherwise passes through only to the selected constructor. (all supported configurations)
- Aliases: none
- Example: `factor: 1.0`
- Source symbols: `toolkit/scheduler.py` :: `get_lr_scheduler` :: `factor` (`kwargs.contains`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant__factor` (`scheduler.injected`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant__factor` (`scheduler.consumed`)

<a id="scheduler-constant_with_warmup-param-num_warmup_steps"></a>
### `scheduler.constant_with_warmup.param.num_warmup_steps`

In constant\_with\_warmup, sets constant-with-warmup ramp length; discovered defaults are get\_lr\_scheduler.num\_warmup\_steps=null, get\_lr\_scheduler.constant\_with\_warmup\_\_num\_warmup\_steps=1000.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params.num_warmup_steps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, scheduler=`constant_with_warmup`
- Parser/supported/example types: `integer` / `nonnegative-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_lr_scheduler.constant_with_warmup__num_warmup_steps":"1000","get_lr_scheduler.num_warmup_steps":null}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: constant\_with\_warmup injects 1000 and prints a warning when num\_warmup\_steps is absent. (all supported configurations)
- Benefits: For constant\_with\_warmup, use this value to ramp gradually before full LR.
- Drawbacks: With constant\_with\_warmup, long warmup risks never reaching base LR. Invalid local constructor arguments propagate their native TypeError or ValueError.
- Interactions: Requires `train.lr_scheduler`: The local default is consumed by constant\_with\_warmup; Diffusers schedulers may accept their own warmup parameter. (all supported configurations)
- Aliases: none
- Example: `num_warmup_steps: 100`
- Source symbols: `toolkit/scheduler.py` :: `get_lr_scheduler` :: `num_warmup_steps` (`kwargs.contains`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant_with_warmup__num_warmup_steps` (`scheduler.injected`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant_with_warmup__num_warmup_steps` (`scheduler.consumed`)

<a id="scheduler-constant_with_warmup-param-total_iters"></a>
### `scheduler.constant_with_warmup.param.total_iters`

BaseSDTrainProcess overwrites total\_iters with train.steps for constant\_with\_warmup whenever max\_iterations is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params.total_iters`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `server-overwritten`
- Applies to: process_type=`diffusion_trainer`, scheduler=`constant_with_warmup`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_lr_scheduler.constant_with_warmup__total_iters":"removed"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: constant\_with\_warmup removes total\_iters before calling the Diffusers warmup helper. (all supported configurations); When max\_iterations is absent, any supplied total\_iters, including explicit null, is overwritten with train.steps by BaseSDTrainProcess before scheduler dispatch. (all supported configurations); constant\_with\_warmup deletes the server-supplied total\_iters before calling the Diffusers warmup constructor. (all supported configurations)
- Benefits: Use train.steps to control the effective constant\_with\_warmup run length; leaving lr\_scheduler\_params empty follows the actual precedence.
- Drawbacks: Supplying max\_iterations is not a safe workaround: without total\_iters the unconditional deletion raises KeyError, while with total\_iters the unsupported max\_iterations key leaks to the warmup constructor and raises TypeError.
- Interactions: Overrides `train.steps`: train.steps overwrites total\_iters whenever max\_iterations is absent. (all supported configurations); Requires `train.lr_scheduler`: The selected scheduler decides whether total\_iters is renamed, removed, or passed through. (all supported configurations)
- Aliases: none
- Example: `lr_scheduler_params: {}`
- Source symbols: `toolkit/scheduler.py` :: `get_lr_scheduler` :: `constant_with_warmup__total_iters` (`scheduler.consumed`)

<a id="scheduler-cosine-param-total_iters"></a>
### `scheduler.cosine.param.total_iters`

BaseSDTrainProcess overwrites total\_iters with train.steps for cosine whenever max\_iterations is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params.total_iters`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `server-overwritten`
- Applies to: process_type=`diffusion_trainer`, scheduler=`cosine`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_lr_scheduler.cosine__total_iters":"T_max","get_lr_scheduler.total_iters":null}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: cosine renames total\_iters to the PyTorch constructor key T\_max. (all supported configurations); When max\_iterations is absent, any supplied total\_iters, including explicit null, is overwritten with train.steps by BaseSDTrainProcess before scheduler dispatch. (all supported configurations)
- Benefits: Use train.steps to control the effective cosine run length; leaving lr\_scheduler\_params empty follows the actual precedence.
- Drawbacks: Supplying max\_iterations avoids the overwrite but leaks that unsupported key to the local cosine constructor and raises TypeError, so it is not a safe workaround.
- Interactions: Overrides `train.steps`: train.steps overwrites total\_iters whenever max\_iterations is absent. (all supported configurations); Requires `train.lr_scheduler`: The selected scheduler decides whether total\_iters is renamed, removed, or passed through. (all supported configurations)
- Aliases: none
- Example: `lr_scheduler_params: {}`
- Source symbols: `toolkit/scheduler.py` :: `get_lr_scheduler` :: `total_iters` (`kwargs.contains`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine__total_iters` (`scheduler.normalized`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine__total_iters` (`scheduler.consumed`)

<a id="scheduler-cosine_with_restarts-param-total_iters"></a>
### `scheduler.cosine_with_restarts.param.total_iters`

BaseSDTrainProcess overwrites total\_iters with train.steps for cosine\_with\_restarts whenever max\_iterations is absent.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].train.lr_scheduler_params.total_iters`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `scheduler` / `supported`
- Persistence/authority: `config` / `server-overwritten`
- Applies to: process_type=`diffusion_trainer`, scheduler=`cosine_with_restarts`
- Parser/supported/example types: `integer` / `positive-integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"get_lr_scheduler.cosine_with_restarts__total_iters":"T_0"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: cosine\_with\_restarts renames total\_iters to the PyTorch constructor key T\_0. (all supported configurations); When max\_iterations is absent, any supplied total\_iters, including explicit null, is overwritten with train.steps by BaseSDTrainProcess before scheduler dispatch. (all supported configurations)
- Benefits: Use train.steps to control the effective cosine\_with\_restarts run length; leaving lr\_scheduler\_params empty follows the actual precedence.
- Drawbacks: Supplying max\_iterations avoids the overwrite but leaks that unsupported key to the local cosine\_with\_restarts constructor and raises TypeError, so it is not a safe workaround.
- Interactions: Overrides `train.steps`: train.steps overwrites total\_iters whenever max\_iterations is absent. (all supported configurations); Requires `train.lr_scheduler`: The selected scheduler decides whether total\_iters is renamed, removed, or passed through. (all supported configurations)
- Aliases: none
- Example: `lr_scheduler_params: {}`
- Source symbols: `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine_with_restarts__total_iters` (`scheduler.normalized`); `toolkit/scheduler.py` :: `get_lr_scheduler` :: `cosine_with_restarts__total_iters` (`scheduler.consumed`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
