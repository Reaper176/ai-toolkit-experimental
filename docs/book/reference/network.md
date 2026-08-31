# Network settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This page covers the trainable network, adapter, embedding, and related module settings assigned here by the catalog. UI-created values and engine fallbacks are separate authorities, and applicability notes identify settings that exist only for particular network implementations.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Network

<a id="network-all-layers"></a>
### `network.all_layers`

Attaches differential full-weight modules to remaining eligible non-linear/non-convolution leaves.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.all_layers`
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
- Benefits: Can adapt weight-bearing layers outside the usual LoRA targets.
- Drawbacks: It greatly increases trainable parameters and checkpoint size.
- Interactions: none
- Aliases: none
- Example: `all_layers: false`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `all_layers` (`kwargs.get`)

<a id="network-alpha"></a>
### `network.alpha`

Sets the base network scaling alpha; explicit null or zero becomes the effective module rank in both active implementation families.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.alpha`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When linear\_alpha is omitted, LoRAModule normalizes inherited explicit null or zero network.alpha to the effective per-module rank. (network_type=`lora`; network_type=`lorm`; network_type=`lokr`; network_type=`dora`; network_type=`fullrank`); When linear\_alpha is omitted, LoConSpecialModule normalizes inherited explicit null or zero network.alpha to the effective per-module rank. (network_type=`locon`; network_type=`lycoris`)
- Benefits: Controls effective update scale independently of rank.
- Drawbacks: A poor alpha-to-rank relationship can weaken or exaggerate updates.
- Interactions: Affects `network.linear_alpha`: network.alpha is forwarded as module alpha only through network.linear\_alpha's omission fallback; an explicit linear\_alpha overrides it. (all supported configurations)
- Aliases: none
- Example: `alpha: 1`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `alpha` (`kwargs.get`)

<a id="network-conv"></a>
### `network.conv`

Sets convolution rank; LoRASpecialNetwork preserves null while LycorisSpecialNetwork normalizes null to 0, and both disable convolution adaptation unless another network mode forces it.

- UI label: Conv Rank
- Locations: Yaml `config.process[*].network.conv`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `nonnegative-integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, 1024]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: LycorisSpecialNetwork normalizes omitted or explicit null conv to 0, disabling convolution adapters. (network_type=`locon`; network_type=`lycoris`)
- Benefits: Adds capacity for convolution features.
- Drawbacks: It increases parameters and is unsupported or unnecessary for some architectures.
- Interactions: none
- Aliases: none
- Example: `conv: 4`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `conv` (`kwargs.get`)

<a id="network-conv-alpha"></a>
### `network.conv_alpha`

Sets convolution alpha. Omission inherits conv; explicit null becomes convolution rank in LoRA modules, becomes 0 when LyCORIS convolution is disabled, and is invalid when LyCORIS convolution is enabled.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.conv_alpha`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number-or-null-with-target-conditions` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"network.conv"}` (all supported configurations)
- Other runtime/default transitions: On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`ideogram4`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`mageflow`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`); On Select present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`); On Leave present as `16` (process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`)
- Architecture overrides: On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`boogu_image_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`ideogram4`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:o_edit_turbo`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`krea2:turbo`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`mageflow`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`mageflow_edit`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`prx_pixel`; On Select present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`; On Leave present as `16` for process_type=`diffusion_trainer`, ui_architecture=`zimage_l2p`
- Normalization: LoRAModule normalizes explicit null or zero conv\_alpha to the effective convolution-module rank when convolution adapters are constructed. (network_type=`lora`; network_type=`lorm`; network_type=`lokr`; network_type=`dora`; network_type=`fullrank`); LycorisSpecialNetwork normalizes omitted or explicit null conv\_alpha to 0 when convolution adaptation is disabled. (network_type=`locon`; network_type=`lycoris`); LoConSpecialModule normalizes zero conv\_alpha to the effective convolution-module rank when convolution adaptation is enabled. (network_type=`locon`; network_type=`lycoris`)
- Benefits: Tunes convolution update scaling separately.
- Drawbacks: A mismatched scale can over- or under-emphasize convolution updates, and explicit null fails for enabled LyCORIS convolution.
- Interactions: Fallback `network.conv`: When conv\_alpha is omitted, NetworkConfig inherits network.conv; explicit null remains null. (all supported configurations); Requires `network.conv`: For locon/lycoris with convolution adaptation enabled, conv\_alpha must be a number; explicit null reaches float(None) and fails during network construction. (network_type=`locon`; network_type=`lycoris`)
- Aliases: none
- Example: `conv_alpha: 4`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `conv_alpha` (`kwargs.get`)

<a id="network-dropout"></a>
### `network.dropout`

Sets network dropout; LoRASpecialNetwork preserves null while LycorisSpecialNetwork normalizes null to 0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `probability-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LycorisSpecialNetwork normalizes omitted or explicit null dropout to 0 before module construction. (network_type=`locon`; network_type=`lycoris`)
- Benefits: Can regularize a high-capacity network.
- Drawbacks: Too much dropout slows learning or removes useful signal.
- Interactions: none
- Aliases: none
- Example: `dropout: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `dropout` (`kwargs.get`)

<a id="network-kwargs-lora-attn-only"></a>
### `network.kwargs.lora.attn_only`

Records the historical attention-only switch accepted by the active constructor.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.attn_only`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `unconsumed`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Preserves compatibility with configurations that still carry the field.
- Drawbacks: The current constructor does not use the value to filter modules.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `attn_only: false`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `attn_only` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-block-alphas"></a>
### `network.kwargs.lora.block_alphas`

Supplies per-block alpha values paired with block dimensions.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.block_alphas`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `number-list` / `number-list-or-null` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tunes update scaling independently for each selected block.
- Drawbacks: Length or ordering mismatches with block dimensions produce invalid or unintended shapes.
- Interactions: Requires `network.kwargs.lora.block_dims`: Alpha entries correspond positionally to block\_dims. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`); Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `block_alphas: [1.0, 1.0]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `block_alphas` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-block-dims"></a>
### `network.kwargs.lora.block_dims`

Supplies per-block ranks for linear and 1x1 convolution targets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.block_dims`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `integer-list` / `positive-integer-list-or-null` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allocates network capacity differently across model blocks.
- Drawbacks: Large ranks increase memory and size; list shape must match the architecture.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `block_dims: [8, 16]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `block_dims` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-conv-block-alphas"></a>
### `network.kwargs.lora.conv_block_alphas`

Supplies per-block alpha values for 3x3 convolution targets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.conv_block_alphas`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `number-list` / `number-list-or-null` / `number-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tunes convolution scaling by model block.
- Drawbacks: It requires matching convolution block dimensions and architecture ordering.
- Interactions: Requires `network.kwargs.lora.conv_block_dims`: Alpha entries correspond positionally to conv\_block\_dims. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`); Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `conv_block_alphas: [1.0, 1.0]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `conv_block_alphas` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-conv-block-dims"></a>
### `network.kwargs.lora.conv_block_dims`

Supplies per-block ranks for 3x3 convolution targets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.conv_block_dims`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `integer-list` / `positive-integer-list-or-null` / `integer-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Allocates convolution capacity by block.
- Drawbacks: It increases parameters and must align with convolution block alphas.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `conv_block_dims: [4, 8]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `conv_block_dims` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-full-if-contains"></a>
### `network.kwargs.lora.full_if_contains`

Replaces matching weighted leaf modules with full-weight modules instead of ordinary LoRA modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.full_if_contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `string-list` / `string-or-string-list-or-null` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A single string is converted to a one-element list; null becomes an empty list. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Benefits: Gives selected layers full adaptation capacity.
- Drawbacks: Matching broad substrings can greatly increase trainable parameters and checkpoint size.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `full_if_contains: ["proj_out"]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `full_if_contains` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-full-train-in-out"></a>
### `network.kwargs.lora.full_train_in_out`

Adds full training modules for supported network input and output layers.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.full_train_in_out`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can adapt boundary projections that ordinary target replacement omits.
- Drawbacks: It adds full-weight parameters and may reduce checkpoint portability.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `full_train_in_out: false`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `full_train_in_out` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-ignore-if-contains"></a>
### `network.kwargs.lora.ignore_if_contains`

Skips candidate modules whose names contain any listed substring.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.ignore_if_contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `string-list` / `string-list-or-null` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: On Select present as `["ff_i.experts","ff_i.gate"]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream`); On Leave present as `[]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream`); On Select present as `["ff_i.experts","ff_i.gate"]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_e1`); On Leave present as `[]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_e1`); On Select present as `["lm_head","patch_embed","visual"]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_o1`); On Leave present as `[]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_o1`); On Select present as `["adaln_proj"]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`minimax_h3`); On Leave present as `[]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`minimax_h3`); On Select present as `["img_mlp.experts","img_mlp.gate"]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`nucleus_image`); On Leave present as `[]` (process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`nucleus_image`)
- Architecture overrides: On Select present as `["ff_i.experts","ff_i.gate"]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream`; On Leave present as `[]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream`; On Select present as `["ff_i.experts","ff_i.gate"]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_e1`; On Leave present as `[]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_e1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_e1`; On Select present as `["lm_head","patch_embed","visual"]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_o1`; On Leave present as `[]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`hidream_o1`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`hidream_o1`; On Select present as `["adaln_proj"]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`minimax_h3`; On Leave present as `[]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`minimax_h3`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`minimax_h3`; On Select present as `["img_mlp.experts","img_mlp.gate"]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`nucleus_image`; On Leave present as `[]` for process_type=`diffusion_trainer`, network_type=`lora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lorm`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`lokr`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`dora`, ui_architecture=`nucleus_image`; process_type=`diffusion_trainer`, network_type=`fullrank`, ui_architecture=`nucleus_image`
- Normalization: Null becomes an empty exclusion list. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Benefits: Removes unwanted or unstable targets from the network.
- Drawbacks: Broad filters can silently exclude most trainable layers.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `ignore_if_contains: ["text_encoder"]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `ignore_if_contains` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-module-dropout"></a>
### `network.kwargs.lora.module_dropout`

Sets LoRA-family whole-module dropout probability; null remains unset.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.module_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `number` / `probability-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Regularizes by occasionally bypassing an adapter module.
- Drawbacks: High probability weakens training and increases stochastic variation.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `module_dropout: 0.1`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `module_dropout` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-only-if-contains"></a>
### `network.kwargs.lora.only_if_contains`

Keeps candidate modules only when their names contain a listed substring.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.only_if_contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `string-list` / `string-list-or-null` / `string-list`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Restricts adaptation to a deliberate subnetwork.
- Drawbacks: Overly narrow filters can leave few or no trainable modules.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `only_if_contains: ["transformer_blocks"]`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `only_if_contains` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-parameter-threshold"></a>
### `network.kwargs.lora.parameter_threshold`

Skips candidate modules whose parameter count is below the threshold.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.parameter_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `number` / `nonnegative-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Avoids spending adapter capacity on small layers.
- Drawbacks: A high threshold can remove important targets.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `parameter_threshold: 0`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `parameter_threshold` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-peft-format"></a>
### `network.kwargs.lora.peft_format`

Uses PEFT-style module names and scaling behavior.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.peft_format`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Transformer-family networks force PEFT format unless legacy LoKr format is active; PEFT format sets alpha equal to rank. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Benefits: Improves compatibility with PEFT-oriented checkpoints for supported architectures.
- Drawbacks: It changes key names and forces alpha to rank, affecting interoperability with legacy formats.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `peft_format: false`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `peft_format` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-rank-dropout"></a>
### `network.kwargs.lora.rank_dropout`

Sets LoRA-family rank-component dropout probability; null remains unset.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.rank_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `number` / `probability-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Regularizes individual low-rank components.
- Drawbacks: High values reduce effective capacity and slow learning.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `rank_dropout: 0.1`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `rank_dropout` (`network_kwargs.accepted`)

<a id="network-kwargs-lora-varbose"></a>
### `network.kwargs.lora.varbose`

Prints the list of skipped modules using the constructor's legacy misspelled key.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.varbose`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `legacy`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Helps diagnose target selection.
- Drawbacks: It can produce long output and the misspelled key is retained only for compatibility.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LoRASpecialNetwork; LycorisSpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`lora`; process_type=`diffusion_trainer`, network_type=`lorm`; process_type=`diffusion_trainer`, network_type=`lokr`; process_type=`diffusion_trainer`, network_type=`dora`; process_type=`diffusion_trainer`, network_type=`fullrank`)
- Aliases: none
- Example: `varbose: false`
- Source symbols: `toolkit/lora_special.py` :: `LoRASpecialNetwork.__init__` :: `varbose` (`network_kwargs.accepted`)

<a id="network-kwargs-lycoris-module-dropout"></a>
### `network.kwargs.lycoris.module_dropout`

Sets LyCORIS whole-module dropout probability; omitted or null becomes 0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.module_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`
- Parser/supported/example types: `number` / `probability-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LycorisSpecialNetwork normalizes omitted or explicit null to 0 before module construction. (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Benefits: Regularizes by occasionally bypassing an adapter module.
- Drawbacks: High probability weakens training and increases stochastic variation.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LycorisSpecialNetwork; LoRASpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Aliases: none
- Example: `module_dropout: 0.1`
- Source symbols: `toolkit/lycoris_special.py` :: `LycorisSpecialNetwork.__init__` :: `module_dropout` (`network_kwargs.accepted`)

<a id="network-kwargs-lycoris-rank-dropout"></a>
### `network.kwargs.lycoris.rank_dropout`

Sets LyCORIS rank-component dropout probability; omitted or null becomes 0.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.rank_dropout`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`
- Parser/supported/example types: `number` / `probability-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LycorisSpecialNetwork normalizes omitted or explicit null to 0 before module construction. (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Benefits: Regularizes individual low-rank components.
- Drawbacks: High values reduce effective capacity and slow learning.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LycorisSpecialNetwork; LoRASpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Aliases: none
- Example: `rank_dropout: 0.1`
- Source symbols: `toolkit/lycoris_special.py` :: `LycorisSpecialNetwork.__init__` :: `rank_dropout` (`network_kwargs.accepted`)

<a id="network-kwargs-lycoris-use-cp"></a>
### `network.kwargs.lycoris.use_cp`

Enables CP decomposition for eligible non-1x1 LoCon convolution modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs.use_cp`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can reduce the parameter cost of convolution adaptation.
- Drawbacks: It changes module shape and checkpoint compatibility and applies only to eligible convolutions.
- Interactions: Constrains `network.type`: Only effective when network.type dispatches to LycorisSpecialNetwork; LoRASpecialNetwork ignores this forwarded keyword. (process_type=`diffusion_trainer`, network_type=`locon`; process_type=`diffusion_trainer`, network_type=`lycoris`)
- Aliases: none
- Example: `use_cp: true`
- Source symbols: `toolkit/lycoris_special.py` :: `LycorisSpecialNetwork.__init__` :: `use_cp` (`network_kwargs.accepted`)

<a id="network-layer-offloading"></a>
### `network.layer_offloading`

Enables network layer offloading during training.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.layer_offloading`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
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
- Benefits: Can reduce resident memory for supported network workflows.
- Drawbacks: Offloading adds transfers and cannot be merged in every save path.
- Interactions: none
- Aliases: none
- Example: `layer_offloading: false`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `layer_offloading` (`kwargs.get`)

<a id="network-linear"></a>
### `network.linear`

Sets the low-rank dimension for linear modules; null is treated as absent, with legacy rank checked before linear and 4 used when neither has a value.

- UI label: Linear Rank
- Locations: Yaml `config.process[*].network.linear`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `positive-integer-or-null` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `normalized-to-absent`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, 1024]`; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `4` (all supported configurations)
- Other runtime/default transitions: On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `32` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `128` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `32` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`)
- Architecture overrides: On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `32` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `128` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `32` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`
- Normalization: NetworkConfig treats null rank and linear values as absent: the first non-null legacy rank wins, then non-null linear, otherwise both effective values become 4. (all supported configurations)
- Benefits: Controls the primary tradeoff between adapter capacity and size.
- Drawbacks: Higher rank increases memory, training time, and checkpoint size; low rank may underfit.
- Interactions: none
- Aliases: `config.process[*].network.rank` → `network.linear` (Legacy, Alias Wins): Rename rank to linear. A non-null legacy rank wins; otherwise a non-null linear value is used; null values are treated as absent.
- Example: `linear: 16`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `rank` (`kwargs.get`); `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `linear` (`kwargs.get`)

<a id="network-linear-alpha"></a>
### `network.linear_alpha`

Sets linear-module alpha. Omission inherits base alpha; explicit null or zero becomes the effective module rank in both active implementation families.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.linear_alpha`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number-or-null` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"network.alpha"}` (all supported configurations)
- Other runtime/default transitions: On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `32` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `128` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`); On Leave present as `32` (process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`)
- Architecture overrides: On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `32` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `128` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`; On Leave present as `32` for process_type=`diffusion_trainer`, ui_architecture=`nucleus_image`
- Normalization: LoRAModule normalizes explicit null or zero linear\_alpha to the effective per-module rank. (network_type=`lora`; network_type=`lorm`; network_type=`lokr`; network_type=`dora`; network_type=`fullrank`); LoConSpecialModule normalizes explicit null or zero linear\_alpha to the effective per-module rank. (network_type=`locon`; network_type=`lycoris`)
- Benefits: Tunes linear update scaling separately.
- Drawbacks: A mismatched scale can over- or under-emphasize linear updates.
- Interactions: Fallback `network.alpha`: When linear\_alpha is omitted, NetworkConfig inherits network.alpha; explicit null remains null until module construction. (all supported configurations)
- Aliases: none
- Example: `linear_alpha: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `linear_alpha` (`kwargs.get`)

<a id="network-lokr-factor"></a>
### `network.lokr_factor`

Sets the LoKr factor; minus one requests automatic largest-factor selection.

- UI label: LoKr Factor
- Locations: Yaml `config.process[*].network.lokr_factor`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer-factor-or-auto` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `integer`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `-1`, `4`, `8`, `16`, `32`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `-1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls LoKr decomposition shape.
- Drawbacks: An unsuitable factor can fail shape construction or reduce useful capacity.
- Interactions: Requires `network.type`: This setting affects construction only for the LoKr network type. (all supported configurations)
- Aliases: none
- Example: `lokr_factor: -1`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `lokr_factor` (`kwargs.get`)

<a id="network-lokr-full-rank"></a>
### `network.lokr_full_rank`

For LoKr, forces effectively full-rank dimensions and alphas.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lokr_full_rank`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
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
- Normalization: When true for LoKr, linear/conv dimensions and alphas are overwritten with a full-rank sentinel. (all supported configurations)
- Benefits: Maximizes LoKr representational capacity.
- Drawbacks: It sharply increases parameter count and memory use.
- Interactions: Requires `network.type`: This setting affects construction only for the LoKr network type. (all supported configurations)
- Aliases: none
- Example: `lokr_full_rank: true`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `lokr_full_rank` (`kwargs.get`)

<a id="network-lorm"></a>
### `network.lorm`

Provides nested LoRM extraction configuration.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `lorm-config-or-null` / `object`
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
- Benefits: Enables module-specific low-rank extraction behavior.
- Drawbacks: LoRM changes network construction and requires careful extraction rules.
- Interactions: none
- Aliases: none
- Example: `lorm: {}`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `lorm` (`kwargs.get`)

<a id="network-lorm-do-conv"></a>
### `network.lorm.do_conv`

Enables LoRM attachment to eligible convolution modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.do_conv`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
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
- Benefits: Extends extraction beyond linear layers when convolution adaptation is needed.
- Drawbacks: Adds trainable capacity, memory use, and larger extracted output.
- Interactions: none
- Aliases: none
- Example: `do_conv: false`
- Source symbols: `toolkit/config_modules.py` :: `LoRMConfig.__init__` :: `do_conv` (`kwargs.get`)

<a id="network-lorm-extract-mode"></a>
### `network.lorm.extract_mode`

Chooses the default rank-extraction rule for LoRM modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.extract_mode`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `extract-mode` / `string`
- Accepted types/values: not separately constrained; `"fixed"`, `"threshold"`, `"ratio"`, `"quantile"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"ratio"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls whether rank is selected by count, threshold, ratio, or quantile.
- Drawbacks: The same numeric parameter has different meaning under each mode.
- Interactions: none
- Aliases: none
- Example: `extract_mode: "ratio"`
- Source symbols: `toolkit/config_modules.py` :: `LoRMConfig.__init__` :: `extract_mode` (`kwargs.get`)

<a id="network-lorm-extract-mode-param"></a>
### `network.lorm.extract_mode_param`

Supplies the default numeric argument for the selected extraction mode.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.extract_mode_param`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `mode-dependent-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.25` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Tunes the compression/retention tradeoff.
- Drawbacks: An unsuitable value can discard useful components or retain excessive rank.
- Interactions: Requires `network.lorm.extract_mode`: Its interpretation is selected by extract\_mode. (all supported configurations)
- Aliases: none
- Example: `extract_mode_param: 0.25`
- Source symbols: `toolkit/config_modules.py` :: `LoRMConfig.__init__` :: `extract_mode_param` (`kwargs.get`)

<a id="network-lorm-module-contains"></a>
### `network.lorm.module.contains`

Matches module names; pipe-separated pieces must all occur, with a second check using underscores for dots.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.module_settings[*].contains`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `substring-pieces` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"4nt$3"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Matching retries after replacing dots in the contains expression with underscores. (all supported configurations)
- Benefits: Targets extraction settings to a chosen family of module names.
- Drawbacks: A broad pattern can affect unintended modules; a nonmatching pattern is silently unused.
- Interactions: none
- Aliases: none
- Example: `contains: "4nt$3"`
- Source symbols: `toolkit/config_modules.py` :: `LormModuleSettingsConfig.__init__` :: `contains` (`kwargs.get`)

<a id="network-lorm-module-extract-mode"></a>
### `network.lorm.module.extract_mode`

Overrides the extraction rule for matching modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.module_settings[*].extract_mode`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `extract-mode` / `string`
- Accepted types/values: not separately constrained; `"fixed"`, `"threshold"`, `"ratio"`, `"quantile"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"ratio"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LoRMConfig first fills an omitted module override from the corresponding top-level LoRM value. (all supported configurations)
- Benefits: Lets one module group use a different rank-selection strategy.
- Drawbacks: Its parameter meaning changes with the selected mode.
- Interactions: none
- Aliases: none
- Example: `extract_mode: "ratio"`
- Source symbols: `toolkit/config_modules.py` :: `LormModuleSettingsConfig.__init__` :: `extract_mode` (`kwargs.get`)

<a id="network-lorm-module-extract-mode-param"></a>
### `network.lorm.module.extract_mode_param`

Overrides the numeric extraction parameter for matching modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.module_settings[*].extract_mode_param`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `mode-dependent-number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `0.25` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LoRMConfig first fills an omitted module override from the corresponding top-level LoRM value. (all supported configurations)
- Benefits: Tunes compression separately for a module family.
- Drawbacks: An unsuitable value can retain too much or too little rank.
- Interactions: Requires `network.lorm.module.extract_mode`: Its interpretation is selected by the module rule's extraction mode. (all supported configurations)
- Aliases: none
- Example: `extract_mode_param: 0.25`
- Source symbols: `toolkit/config_modules.py` :: `LormModuleSettingsConfig.__init__` :: `extract_mode_param` (`kwargs.get`)

<a id="network-lorm-module-parameter-threshold"></a>
### `network.lorm.module.parameter_threshold`

Overrides the parameter-count eligibility threshold for matching modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.module_settings[*].parameter_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
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
- Normalization: LoRMConfig first fills an omitted module override from the corresponding top-level LoRM value. (all supported configurations)
- Benefits: Skips small modules within the matched family.
- Drawbacks: A high threshold can remove intended adaptation targets.
- Interactions: none
- Aliases: none
- Example: `parameter_threshold: 0`
- Source symbols: `toolkit/config_modules.py` :: `LormModuleSettingsConfig.__init__` :: `parameter_threshold` (`kwargs.get`)

<a id="network-lorm-module-settings"></a>
### `network.lorm.module_settings`

Defines ordered module-name matching rules that override LoRM extraction defaults.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.module_settings`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `lorm-module-rule-list` / `object-list`
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
- Normalization: Each module rule is merged over the top-level extraction mode, parameter, and threshold defaults before parsing. (all supported configurations)
- Benefits: Allows different rank extraction for distinct module groups.
- Drawbacks: Broad or misordered patterns can apply an unintended override.
- Interactions: none
- Aliases: none
- Example: `module_settings: []`
- Source symbols: `toolkit/config_modules.py` :: `LoRMConfig.__init__` :: `module_settings` (`kwargs.get`)

<a id="network-lorm-parameter-threshold"></a>
### `network.lorm.parameter_threshold`

Sets the default parameter-count threshold used when selecting eligible modules.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.lorm.parameter_threshold`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `experimental`
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
- Benefits: Skips modules below the chosen size boundary.
- Drawbacks: A high threshold can exclude layers needed by the concept.
- Interactions: none
- Aliases: none
- Example: `parameter_threshold: 0`
- Source symbols: `toolkit/config_modules.py` :: `LoRMConfig.__init__` :: `parameter_threshold` (`kwargs.get`)

<a id="network-network-kwargs"></a>
### `network.network_kwargs`

Carries explicitly supported advanced arguments to the active first-party network constructor.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.network_kwargs`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object` / `closed-active-network-arguments` / `object`
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
- Benefits: Exposes fine-grained target, rank-dropout, and module-shape controls.
- Drawbacks: Unknown or engine-reserved keys are rejected by the documented active dispatch boundary.
- Interactions: none
- Aliases: none
- Example: `network_kwargs: {}`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `network_kwargs` (`kwargs.get`)

<a id="network-old-lokr-format"></a>
### `network.old_lokr_format`

Requests the legacy LoKr naming/serialization behavior when the base model permits it.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.old_lokr_format`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `legacy`
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
- Benefits: Supports compatibility with older LoKr checkpoints.
- Drawbacks: Legacy format choices can reduce interoperability with current tooling.
- Interactions: none
- Aliases: none
- Example: `old_lokr_format: false`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `old_lokr_format` (`kwargs.get`)

<a id="network-pretrained-lora-path"></a>
### `network.pretrained_lora_path`

Loads a local network checkpoint as the initial network state when no later resume checkpoint wins.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.pretrained_lora_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `existing-checkpoint-path-or-null` / `path`
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
- Normalization: This path supplies LoRA weights only. Optimizer state uses separate path-based auto-discovery at &lt;training\_folder&gt;/&lt;name&gt;/optimizer.pt, the run's save root, not beside pretrained\_lora\_path; that lookup does not prove the optimizer state belongs to these weights. (all supported configurations)
- Benefits: Supports refinement or continuation from existing LoRA weights.
- Drawbacks: A missing path is reported and ignored; incompatible weights can fail loading.
- Interactions: Affects `train.start_step`: It is the user's responsibility to align loaded LoRA weights, the explicit step counter, save-root identity, and any auto-discovered optimizer.pt state. (all supported configurations)
- Aliases: none
- Example: `pretrained_lora_path: /workspace/base-lora.safetensors`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `pretrained_lora_path` (`kwargs.get`)

<a id="network-split-multistage-loras"></a>
### `network.split_multistage_loras`

Records the historical multi-stage LoRA splitting switch.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.split_multistage_loras`
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
- Benefits: Preserves configuration compatibility while the field remains accepted.
- Drawbacks: The current core process does not consume this parsed value.
- Interactions: none
- Aliases: none
- Example: `split_multistage_loras: true`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `split_multistage_loras` (`kwargs.get`)

<a id="network-transformer-only"></a>
### `network.transformer_only`

Restricts network attachment to transformer-side modules where supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].network.transformer_only`
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
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`)
- Architecture overrides: On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`hidream_o1`
- Normalization: none
- Benefits: Avoids adapting other model components.
- Drawbacks: It can omit useful targets for architectures that need broader adaptation.
- Interactions: none
- Aliases: none
- Example: `transformer_only: true`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `transformer_only` (`kwargs.get`)

<a id="network-type"></a>
### `network.type`

Selects the network implementation family.

- UI label: Target Type
- Locations: Yaml `config.process[*].network.type`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `network` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `network-type` / `string`
- Accepted types/values: not separately constrained; `"lora"`, `"locon"`, `"lycoris"`, `"lorm"`, `"lokr"`, `"dora"`, `"fullrank"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: `"lora"`, `"lokr"`; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"lora"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: LoRM forces linear/rank to 4 and forces conv to 4 when LoRM convolution extraction is enabled. (all supported configurations); Runtime dispatch and downstream implementation-mode checks normalize network.type with lower(). (all supported configurations); locon and lycoris dispatch to LycorisSpecialNetwork; lora, lorm, lokr, dora, and fullrank dispatch to LoRASpecialNetwork. (all supported configurations)
- Benefits: Chooses the LoRA-family or LyCORIS constructor and its supported implementation mode.
- Drawbacks: Changing type changes supported parameters and checkpoint compatibility.
- Interactions: none
- Aliases: none
- Example: `type: "lora"`
- Source symbols: `toolkit/config_modules.py` :: `NetworkConfig.__init__` :: `type` (`kwargs.get`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
