# Dataset settings reference

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](training.md) · [Next →](masks-and-preservation.md)
<!-- book-navigation:end -->

This page covers dataset sources, captions, bucketing, masks, controls, modality options, and cache behavior assigned here by the catalog. UI-created values are not assumed to equal engine fallbacks, and each normalization or applicability condition is part of the setting contract.

<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->

## Dataset

<a id="dataset-alpha-mask"></a>
### `dataset.alpha_mask`

Uses each source image's alpha channel as its mask.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].alpha_mask`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Keeps image and mask pixels in one filename and transform path.
- Drawbacks: Sources without a meaningful alpha channel do not provide useful focus masks.
- Interactions: Overrides `dataset.mask_path`: When alpha\_mask is true, the source path supplies the mask instead of mask\_path matching. (all supported configurations)
- Aliases: none
- Example: `alpha_mask: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `alpha_mask` (`kwargs.get`)

<a id="dataset-audio-normalize"></a>
### `dataset.audio_normalize`

Normalizes audio volume during loading.

- UI label: Audio Normalize
- Locations: Yaml `config.process[*].datasets[*].audio_normalize`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Reduces loudness variation across clips when absolute volume is not part of the concept.
- Drawbacks: It removes meaningful amplitude differences and can amplify noise in quiet recordings.
- Interactions: Requires `dataset.do_audio`: Normalization matters only when the loader extracts audio. (all supported configurations)
- Aliases: none
- Example: `audio_normalize: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `audio_normalize` (`kwargs.get`)

<a id="dataset-audio-preserve-pitch"></a>
### `dataset.audio_preserve_pitch`

Preserves pitch while time-stretching audio to the selected video frame span.

- UI label: Audio Preserve Pitch
- Locations: Yaml `config.process[*].datasets[*].audio_preserve_pitch`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Avoids chipmunk or lowered pitch when duration is adjusted.
- Drawbacks: Pitch-preserving transforms cost more processing and may add artifacts.
- Interactions: Requires `dataset.do_audio`: Pitch preservation matters only when audio is loaded and duration is adjusted. (all supported configurations)
- Aliases: none
- Example: `audio_preserve_pitch: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `audio_preserve_pitch` (`kwargs.get`)

<a id="dataset-augmentations"></a>
### `dataset.augmentations`

Defines structured Albumentations operations.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].augmentations`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `object-list` / `object-list`
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
- Benefits: Allows controlled image augmentation with explicit methods and parameters.
- Drawbacks: Invalid method names fail and active augmentations disable latent caching.
- Interactions: Conflicts `dataset.cache_latents`: A nonempty augmentation list disables both memory and disk latent caching. (all supported configurations)
- Aliases: none
- Example: `augmentations: null`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `augmentations` (`kwargs.get`)

<a id="dataset-augments"></a>
### `dataset.augments`

Selects legacy named augmentation operations.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].augments`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `legacy`
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
- Benefits: Keeps older augmentation configurations available.
- Drawbacks: Any active augmentation disables latent caching because cached latents would freeze one augmented result.
- Interactions: Conflicts `dataset.cache_latents`: Nonempty augments disable both memory and disk latent caching. (all supported configurations)
- Aliases: none
- Example: `augments: []`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `augments` (`kwargs.get`)

<a id="dataset-auto-frame-count"></a>
### `dataset.auto_frame_count`

Derives the number of frames from the source duration at the configured FPS.

- UI label: Auto Frame Count
- Locations: Yaml `config.process[*].datasets[*].auto_frame_count`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: FileItemDTO computes the effective frame count from source duration before bucket construction, and the resulting value is included in the video bucket key. (all supported configurations); Changing to an architecture without datasets.auto\_frame\_count deletes every dataset auto\_frame\_count value. (all supported configurations)
- Benefits: Retains variable clip duration for models and batching paths that support it.
- Drawbacks: Variable frame counts produce variable memory use, and training rejects batch sizes greater than one when auto frame count is enabled.
- Interactions: none
- Aliases: none
- Example: `auto_frame_count: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `auto_frame_count` (`kwargs.get`)

<a id="dataset-bucket-tolerance"></a>
### `dataset.bucket_tolerance`

Stores the bucket divisibility used while sizing media.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].bucket_tolerance`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `runtime` / `runtime-forced`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `64` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: AiToolkitDataset replaces the configured value with sd.get\_bucket\_divisibility() before building buckets. (all supported configurations)
- Benefits: Keeps generated bucket dimensions compatible with the active model.
- Drawbacks: The diffusion dataset loader overwrites this value with the model's divisibility, so a YAML value is not authoritative.
- Interactions: none
- Aliases: none
- Example: `bucket_tolerance: 64`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `bucket_tolerance` (`kwargs.get`)

<a id="dataset-buckets"></a>
### `dataset.buckets`

Groups media by compatible aspect-ratio buckets.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].buckets`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission uses true. An explicit null is preserved by kwargs.get and is falsey at loader consumers, so it disables bucketing rather than restoring the true fallback; video loading then rejects the disabled bucket mode. (all supported configurations)
- Benefits: Preserves varied aspect ratios with less destructive cropping.
- Drawbacks: All datasets in one loader must agree on bucket use and very sparse buckets can reduce batching efficiency.
- Interactions: none
- Aliases: none
- Example: `buckets: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `buckets` (`kwargs.get`)

<a id="dataset-cache-clip-vision-to-disk"></a>
### `dataset.cache_clip_vision_to_disk`

Caches CLIP-image embeddings as safetensors on disk.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].cache_clip_vision_to_disk`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Avoids recomputing compatible visual-reference embeddings on later epochs or runs.
- Drawbacks: Consumes disk space and must be regenerated when reference images, transforms, or the compatible embedding space changes.
- Interactions: none
- Aliases: none
- Example: `cache_clip_vision_to_disk: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_clip_vision_to_disk` (`kwargs.get`)

<a id="dataset-cache-latents"></a>
### `dataset.cache_latents`

Caches encoded latents in host memory after first-epoch preparation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].cache_latents`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Avoids repeated VAE encoding and disk reads on later epochs when memory is available.
- Drawbacks: Consumes system memory and freezes pixel-space augmentations; active augmentations disable latent caching.
- Interactions: Conflicts `dataset.augmentations`: Any configured augmentation disables memory and disk latent caching. (all supported configurations)
- Aliases: none
- Example: `cache_latents: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_latents` (`kwargs.get`)

<a id="dataset-cache-latents-num-workers"></a>
### `dataset.cache_latents_num_workers`

Sets the worker count used to decode and prepare latent-cache inputs.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].cache_latents_num_workers`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `{"expression":"min(6, os.cpu_count() or 1)"}` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Parallel preparation can shorten the initial cache-building phase.
- Drawbacks: Too many workers increase memory, I/O contention, and process overhead.
- Interactions: none
- Aliases: none
- Example: `cache_latents_num_workers: 4`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_latents_num_workers` (`kwargs.get`)

<a id="dataset-cache-latents-to-disk"></a>
### `dataset.cache_latents_to_disk`

Writes versioned latent safetensors keyed by source basename, crop geometry, and preprocessing flags beneath each media directory's \_latent\_cache; the key omits source content identity.

- UI label: Cache Latents
- Locations: Yaml `config.process[*].datasets[*].cache_latents_to_disk`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: The cache filename hashes source basename, crop geometry, latent-space versions, and enabled frame/audio preprocessing flags, not a source content digest. The latent key omits source content identity, so replacing source media in place may reuse a stale cache; clear the cache roots and regenerate after in-place media or conditioning changes. Immutable preset verification tolerates only the exact roots media/\_latent\_cache and media/\_t\_e\_cache; nested cache roots are rejected. A source-missing file retained from a prior verified manifest is copied and hash-checked into the new immutable version, but runtime caches remain version-local provenance and may need regeneration there. (all supported configurations)
- Benefits: Reuses compatible encoded latents across later runs without keeping every latent in memory.
- Drawbacks: Consumes disk space; because keys do not digest source bytes, in-place source changes can reuse stale entries and require manual clearing and regeneration.
- Interactions: Conflicts `dataset.augmentations`: Any configured augmentation disables memory and disk latent caching. (all supported configurations)
- Aliases: none
- Example: `cache_latents_to_disk: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_latents_to_disk` (`kwargs.get`)

<a id="dataset-cache-tensors-to-disk"></a>
### `dataset.cache_tensors_to_disk`

Adds cleaned pixel, video, or audio tensors to the latent cache file.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].cache_tensors_to_disk`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Allows compatible training paths to avoid decoding source media after caches are prepared.
- Drawbacks: Cache files grow and a cache created without this flag is invalid for tensor reuse.
- Interactions: Requires `dataset.cache_latents_to_disk`: Tensor payloads are written through the disk latent-cache path. (all supported configurations)
- Aliases: none
- Example: `cache_tensors_to_disk: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_tensors_to_disk` (`kwargs.get`)

<a id="dataset-cache-text-embeddings"></a>
### `dataset.cache_text_embeddings`

Caches caption embeddings in versioned, caption-hashed safetensors beneath \_t\_e\_cache.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].cache_text_embeddings`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Normalization: Text cache keys include the effective caption, text-embedding-space version, a control\_path string, or a first-frame flag, not content digests for control or first-frame media. Replacing those files in place may reuse a stale cache; clear the exact roots media/\_latent\_cache and media/\_t\_e\_cache and regenerate. Immutable preset verification tolerates those exact roots only; nested cache roots are rejected. (all supported configurations)
- Benefits: Avoids repeated text-encoder work and can allow the text encoder to unload when it is not being trained.
- Drawbacks: Caption or path/flag changes create different identities, but in-place control or first-frame content changes do not; clear stale caches manually. Text-encoder training is incompatible with fixed cached embeddings.
- Interactions: none
- Aliases: none
- Example: `cache_text_embeddings: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `cache_text_embeddings` (`kwargs.get`)

<a id="dataset-caption-dropout-rate"></a>
### `dataset.caption_dropout_rate`

Sets the probability of replacing an item's caption with an empty caption.

- UI label: Caption Dropout Rate
- Locations: Yaml `config.process[*].datasets[*].caption_dropout_rate`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[0, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `0.05` (process_type=`diffusion_trainer`)
- Engine fallback: present as `0.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Teaches some unconditional behavior and can reduce over-reliance on exact wording.
- Drawbacks: Too much dropout weakens prompt alignment and trigger learning.
- Interactions: none
- Aliases: none
- Example: `caption_dropout_rate: 0.05`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `caption_dropout_rate` (`kwargs.get`)

<a id="dataset-caption-ext"></a>
### `dataset.caption_ext`

Selects the sidecar caption extension.

- UI label: Caption Extension
- Locations: Yaml `config.process[*].datasets[*].caption_ext`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; `"txt"`, `"json"`, `"caption"`
- UI normalization scales: none
- UI-created value: present as `"txt"` (process_type=`diffusion_trainer`)
- Engine fallback: present as `".txt"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A nonempty value without a leading dot is normalized by prepending one dot. (all supported configurations)
- Benefits: Matches captions to media without changing media filenames.
- Drawbacks: An incorrect extension silently leaves items on their default-caption path.
- Interactions: none
- Aliases: none
- Example: `caption_ext: txt`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `caption_ext` (`kwargs.get`)

<a id="dataset-caption-type"></a>
### `dataset.caption_type`

Provides the legacy caption extension alias.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].caption_type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `legacy`
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
- Benefits: Keeps older dataset configurations loadable.
- Drawbacks: It overrides caption\_ext when truthy; new configurations should use caption\_ext directly.
- Interactions: none
- Aliases: `config.process[*].datasets[*].caption_type` → `dataset.caption_ext` (Legacy, Alias Wins): Replace caption\_type with caption\_ext; the legacy truthy value currently wins.
- Example: `caption_type: txt`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `caption_type` (`kwargs.get`)

<a id="dataset-clip-image-augmentations"></a>
### `dataset.clip_image_augmentations`

Defines augmentations for CLIP reference images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].clip_image_augmentations`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `object-list` / `object-list` / `object-list`
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
- Benefits: Adds controlled robustness to visual-reference conditioning.
- Drawbacks: Transforms can destroy identity or composition cues and require compatible replay behavior.
- Interactions: none
- Aliases: none
- Example: `clip_image_augmentations: null`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `clip_image_augmentations` (`kwargs.get`)

<a id="dataset-clip-image-from-same-folder"></a>
### `dataset.clip_image_from_same_folder`

Selects CLIP reference images from the same grouped source folder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].clip_image_from_same_folder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Avoids a separate reference directory for curated groups.
- Drawbacks: Random sibling selection can pair unrelated images if folder grouping is weak.
- Interactions: none
- Aliases: none
- Example: `clip_image_from_same_folder: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `clip_image_from_same_folder` (`kwargs.get`)

<a id="dataset-clip-image-path"></a>
### `dataset.clip_image_path`

Names a directory of filename-matched CLIP or reference images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].clip_image_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Provides visual-reference embeddings alongside training targets.
- Drawbacks: It is meaningful only for adapters or models that consume CLIP-image conditioning.
- Interactions: none
- Aliases: none
- Example: `clip_image_path: /datasets/clip-reference`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `clip_image_path` (`kwargs.get`)

<a id="dataset-clip-image-shuffle-augmentations"></a>
### `dataset.clip_image_shuffle_augmentations`

Randomizes the order of CLIP-image augmentations where supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].clip_image_shuffle_augmentations`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
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
- Benefits: Varies composed reference transforms.
- Drawbacks: Order-sensitive transforms can produce unstable or unrealistic references.
- Interactions: none
- Aliases: none
- Example: `clip_image_shuffle_augmentations: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `clip_image_shuffle_augmentations` (`kwargs.get`)

<a id="dataset-control-from-same-folder"></a>
### `dataset.control_from_same_folder`

Selects random sibling images as controls instead of a separate matched directory.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].control_from_same_folder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Supports grouped reference sets without duplicating files into control folders.
- Drawbacks: The selected control varies randomly and can be semantically unrelated if folders are not curated.
- Interactions: none
- Aliases: none
- Example: `control_from_same_folder: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_from_same_folder` (`kwargs.get`)

<a id="dataset-control-path"></a>
### `dataset.control_path`

Names one control directory or a list of matched control directories.

- UI label: Control Dataset
- Locations: Yaml `config.process[*].datasets[*].control_path`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: `path`, `string-list`; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Architecture changes initialize the active single-control path to null, copy a nonempty multi-control path into it when needed, and delete it for multi-control or no-control architectures. (all supported configurations)
- Benefits: Pairs conditioning images with targets by filename basename.
- Drawbacks: Missing or mismatched basenames leave items without the intended control and multiple paths increase preprocessing cost.
- Interactions: none
- Aliases: none
- Example: `control_path: /datasets/my-concept-controls`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_path` (`kwargs.get`)

<a id="dataset-control-path-1"></a>
### `dataset.control_path_1`

Provides UI-friendly control directory slot one.

- UI label: Control Dataset 1
- Locations: Yaml `config.process[*].datasets[*].control_path_1`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When any numbered control path is truthy, the nonempty numbered paths replace control\_path as an ordered list. (all supported configurations); Architecture changes initialize multi-control path 1 to null, copy a nonempty single-control path into it only when empty, and delete it for single-control or no-control architectures. (all supported configurations)
- Benefits: Lets the UI serialize the first member of a multi-control list.
- Drawbacks: It is folded into control\_path and has no separate runtime identity.
- Interactions: none
- Aliases: none
- Example: `control_path_1: /datasets/control-a`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_path_1` (`kwargs.get`)

<a id="dataset-control-path-2"></a>
### `dataset.control_path_2`

Provides UI-friendly control directory slot two.

- UI label: Control Dataset 2
- Locations: Yaml `config.process[*].datasets[*].control_path_2`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When any numbered control path is truthy, the nonempty numbered paths replace control\_path as an ordered list. (all supported configurations); Architecture changes initialize multi-control path 2 to null and delete it for single-control or no-control architectures. (all supported configurations)
- Benefits: Adds a second filename-matched control stream.
- Drawbacks: It requires a model that consumes multiple controls and is folded into control\_path.
- Interactions: none
- Aliases: none
- Example: `control_path_2: /datasets/control-b`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_path_2` (`kwargs.get`)

<a id="dataset-control-path-3"></a>
### `dataset.control_path_3`

Provides UI-friendly control directory slot three.

- UI label: Control Dataset 3
- Locations: Yaml `config.process[*].datasets[*].control_path_3`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: When any numbered control path is truthy, the nonempty numbered paths replace control\_path as an ordered list. (all supported configurations); Architecture changes initialize multi-control path 3 to null and delete it for single-control or no-control architectures. (all supported configurations)
- Benefits: Adds a third filename-matched control stream.
- Drawbacks: It requires a model that consumes multiple controls and is folded into control\_path.
- Interactions: none
- Aliases: none
- Example: `control_path_3: /datasets/control-c`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_path_3` (`kwargs.get`)

<a id="dataset-control-transparent-color"></a>
### `dataset.control_transparent_color`

Sets the RGB fill used for transparent regions in control images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].control_transparent_color`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer-list` / `integer-list` / `integer-list`
- Accepted types/values: `integer-list`; not enumerated
- Supported range: not numerically bounded; collection length: `3`
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `[0,0,0]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Makes alpha compositing deterministic for control preprocessing.
- Drawbacks: The wrong fill color introduces unintended conditioning edges or tones.
- Interactions: none
- Aliases: none
- Example: `control_transparent_color: [0, 0, 0]`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `control_transparent_color` (`kwargs.get`)

<a id="dataset-controls"></a>
### `dataset.controls`

Requests automatic control generation types for the dataset.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].controls`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-list` / `string-list` / `string-list`
- Accepted types/values: not separately constrained; `"depth"`, `"line"`, `"pose"`, `"inpaint"`, `"mask"`, `"sapiens2_mask"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `[]` (process_type=`diffusion_trainer`)
- Engine fallback: present as `[]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Changing architecture writes every dataset controls list from the selected architecture controls, falling back to an empty list. (all supported configurations)
- Benefits: Can derive supported controls such as depth, pose, inpaint, or masks during setup.
- Drawbacks: Generation increases preprocessing cost and unsupported control names fail downstream.
- Interactions: none
- Aliases: none
- Example: `controls: [depth]`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `controls` (`kwargs.get`)

<a id="dataset-dataset-path"></a>
### `dataset.dataset_path`

Selects either a media directory or a JSON caption map and takes precedence over folder\_path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].dataset_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Supports a JSON-backed dataset while retaining folder\_path compatibility.
- Drawbacks: A wrong path is treated as a JSON file when it is not a directory and then fails to open.
- Interactions: Overrides `dataset.folder_path`: A non-null dataset\_path is the source selected instead of folder\_path. (all supported configurations)
- Aliases: none
- Example: `dataset_path: /datasets/my-concept`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `dataset_path` (`kwargs.get`)

<a id="dataset-debug"></a>
### `dataset.debug`

Enables dataset frame-count and selection diagnostics.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].debug`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Provides extra evidence when video frame selection is unexpected.
- Drawbacks: Verbose diagnostics slow and clutter normal training runs.
- Interactions: none
- Aliases: none
- Example: `debug: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `debug` (`kwargs.get`)

<a id="dataset-default-caption"></a>
### `dataset.default_caption`

Provides caption text when an item has no usable caption file or map entry.

- UI label: Default Caption
- Locations: Yaml `config.process[*].datasets[*].default_caption`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `string`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `""` (process_type=`diffusion_trainer`)
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supplies a deterministic fallback for intentionally uncaptained media.
- Drawbacks: A broad fallback repeated across many items can teach weak or misleading associations.
- Interactions: none
- Aliases: none
- Example: `default_caption: a photo of [trigger]`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `default_caption` (`kwargs.get`)

<a id="dataset-diff-output-preservation"></a>
### `dataset.diff_output_preservation`

Marks this dataset for differential-output-preservation caption handling.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].diff_output_preservation`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
- Persistence/authority: `runtime` / `runtime-forced`
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
- Benefits: Lets the loader prepare the trigger-removed class caption requested by the training preservation mode.
- Drawbacks: The training process overwrites this field when differential output preservation is enabled, so setting it alone does not enable the loss.
- Interactions: Requires `train.diff_output_preservation`: The training setting enables the preservation pass and injects this dataset value. (all supported configurations)
- Aliases: none
- Example: `diff_output_preservation: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `diff_output_preservation` (`kwargs.get`)

<a id="dataset-diff-output-preservation-class"></a>
### `dataset.diff_output_preservation_class`

Stores the class phrase injected for differential-output-preservation captions.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].diff_output_preservation_class`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
- Persistence/authority: `runtime` / `runtime-forced`
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
- Benefits: Keeps the loader's replacement caption aligned with the training preservation class.
- Drawbacks: A mismatched class phrase compares against the wrong semantic baseline.
- Interactions: Requires `train.diff_output_preservation_class`: The training setting is copied into each dataset when differential output preservation is active. (all supported configurations)
- Aliases: none
- Example: `diff_output_preservation_class: person`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `diff_output_preservation_class` (`kwargs.get`)

<a id="dataset-do-audio"></a>
### `dataset.do_audio`

Loads audio from video items for models that support audio conditioning or generation.

- UI label: Do Audio
- Locations: Yaml `config.process[*].datasets[*].do_audio`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: none
- Benefits: Keeps synchronized audio available to compatible video/audio architectures.
- Drawbacks: It increases decode and cache cost and is ineffective for models without audio support.
- Interactions: none
- Aliases: none
- Example: `do_audio: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `do_audio` (`kwargs.get`)

<a id="dataset-do-i2v"></a>
### `dataset.do_i2v`

Enables image-to-video conditioning for models that implement both text-to-video and I2V.

- UI label: Do I2V
- Locations: Yaml `config.process[*].datasets[*].do_i2v`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `false` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `true` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `false` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `true` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Lets compatible video models train from a starting image condition.
- Drawbacks: Unsupported architectures ignore or reject the I2V path and require matching source preparation.
- Interactions: none
- Aliases: none
- Example: `do_i2v: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `do_i2v` (`kwargs.get`)

<a id="dataset-extra-values"></a>
### `dataset.extra_values`

Supplies auxiliary numeric conditioning values for compatible adapters or models.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].extra_values`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Carries fixed dataset-level conditioning alongside each item.
- Drawbacks: The length and meaning are model-specific, so mismatched values can fail or train the wrong condition.
- Interactions: none
- Aliases: none
- Example: `extra_values: []`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `extra_values` (`kwargs.get`)

<a id="dataset-fast-image-size"></a>
### `dataset.fast_image_size`

Requests the faster image-dimension probing path.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].fast_image_size`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
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
- Normalization: AiToolkitDataset maintains .aitk\_size.json with a dataloader schema version and per-file quick signature; mismatched versions or signatures force size metadata to be rebuilt. (all supported configurations)
- Benefits: Can reduce metadata scan time on compatible files.
- Drawbacks: The source warns that the fast method can return errors; leave it disabled unless the dataset format is known safe.
- Interactions: none
- Aliases: none
- Example: `fast_image_size: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `fast_image_size` (`kwargs.get`)

<a id="dataset-flip-x"></a>
### `dataset.flip_x`

Adds a horizontally flipped copy of each dataset item.

- UI label: Flip X
- Locations: Yaml `config.process[*].datasets[*].flip_x`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Doubles pose or composition variation when left-right orientation is not semantic.
- Drawbacks: It is harmful for text, asymmetric identities, handed objects, and directional details.
- Interactions: none
- Aliases: none
- Example: `flip_x: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `flip_x` (`kwargs.get`)

<a id="dataset-flip-y"></a>
### `dataset.flip_y`

Adds a vertically flipped copy of each dataset item.

- UI label: Flip Y
- Locations: Yaml `config.process[*].datasets[*].flip_y`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Can augment rare orientation-invariant textures.
- Drawbacks: Upside-down subjects are usually invalid training examples.
- Interactions: none
- Aliases: none
- Example: `flip_y: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `flip_y` (`kwargs.get`)

<a id="dataset-folder-path"></a>
### `dataset.folder_path`

Points to a directory containing the training media.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].folder_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `"/path/to/images/folder"` (process_type=`diffusion_trainer`)
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: For an immutable dataset preset version, the server verifies the authoritative snapshot, replaces folder\_path with that version's managed media root, and retains version and manifest-digest provenance in the saved job usage. (all supported configurations)
- Benefits: Keeps a live dataset rooted at one explicit directory while preset-backed jobs resolve a verified immutable version.
- Drawbacks: A missing or unreadable live directory prevents dataset construction; preset paths are server-resolved and must not be treated as portable user paths.
- Interactions: none
- Aliases: none
- Example: `folder_path: /datasets/my-concept`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `folder_path` (`kwargs.get`)

<a id="dataset-fps"></a>
### `dataset.fps`

Sets the frame sampling rate when videos are not shrunk evenly to num\_frames.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].fps`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `24` (all supported configurations)
- Other runtime/default transitions: On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`); On Select present as `16` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`); On Select present as `24` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`)
- Architecture overrides: On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.3`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`ltx2.5`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan21:14b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan21:1b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan21_i2v:14b480p`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b:t2v`; On Select present as `16` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan22_14b_i2v`; On Select present as `24` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`wan22_5b`
- Normalization: none
- Benefits: Keeps motion timing explicit for trimmed or FPS-based sampling.
- Drawbacks: An incorrect source FPS changes apparent motion speed and can cause insufficient-frame failures.
- Interactions: Affects `dataset.shrink_video_to_frames`: FPS is used for selection when shrink\_video\_to\_frames is false and by automatic frame count. (all supported configurations)
- Aliases: none
- Example: `fps: 16`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `fps` (`kwargs.get`)

<a id="dataset-full-size-control-images"></a>
### `dataset.full_size_control_images`

Keeps full control images instead of cropping them to the target crop where supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].full_size_control_images`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission uses true. An explicit null is preserved and is falsey at the control-image consumer, so it disables full-size control handling and follows the crop path rather than restoring the true fallback. (all supported configurations)
- Benefits: Preserves complete reference content for CLIP-style and other full-image controls.
- Drawbacks: Target and control geometry can diverge when a spatial control needed matched cropping.
- Interactions: none
- Aliases: none
- Example: `full_size_control_images: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `full_size_control_images` (`kwargs.get`)

<a id="dataset-guidance-type"></a>
### `dataset.guidance_type`

Selects the guidance interpretation attached to dataset items.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].guidance_type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `"targeted"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Supports model-specific guidance training modes through one dataset contract.
- Drawbacks: Unsupported values fail later in the model-specific guidance path.
- Interactions: none
- Aliases: none
- Example: `guidance_type: targeted`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `guidance_type` (`kwargs.get`)

<a id="dataset-inpaint-path"></a>
### `dataset.inpaint_path`

Names a directory of filename-matched RGBA inpaint controls.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].inpaint_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Supplies spatial inpaint conditioning aligned to each source.
- Drawbacks: Only PNG or WebP matches with a meaningful alpha channel and bucketed geometry are supported.
- Interactions: none
- Aliases: none
- Example: `inpaint_path: /datasets/inpaint-controls`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `inpaint_path` (`kwargs.get`)

<a id="dataset-invert-mask"></a>
### `dataset.invert_mask`

Inverts mask grayscale values before they are remapped to the configured floor.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].invert_mask`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Switches focus between the painted and complementary regions without repainting files.
- Drawbacks: Forgetting the inversion reverses which region receives the larger ordinary masked-loss weight.
- Interactions: Affects `dataset.mask_min_value`: Inversion occurs before black-to-floor and white-to-one remapping. (all supported configurations)
- Aliases: none
- Example: `invert_mask: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `invert_mask` (`kwargs.get`)

<a id="dataset-is-reg"></a>
### `dataset.is_reg`

Marks this dataset as a regularization dataset.

- UI label: Is Regularization
- Locations: Yaml `config.process[*].datasets[*].is_reg`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: `boolean`; optional=`true`, nullable=`false`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `false` (process_type=`diffusion_trainer`)
- Engine fallback: present as `false` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Separates prior or class examples from concept examples in the training loader.
- Drawbacks: Mislabeling concept images as regularization data changes their loss role.
- Interactions: none
- Aliases: none
- Example: `is_reg: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `is_reg` (`kwargs.get`)

<a id="dataset-keep-tokens"></a>
### `dataset.keep_tokens`

Keeps this many leading caption tokens fixed during shuffling.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].keep_tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
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
- Benefits: Preserves a trigger or subject phrase at the front of shuffled tag captions.
- Drawbacks: A value larger than the useful prefix reduces the benefit of shuffling.
- Interactions: none
- Aliases: none
- Example: `keep_tokens: 1`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `keep_tokens` (`kwargs.get`)

<a id="dataset-load-image-when-caching-latents"></a>
### `dataset.load_image_when_caching_latents`

Keeps source-image loading enabled while cached latents are prepared or consumed.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].load_image_when_caching_latents`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Supports paths that still need pixel data alongside latents.
- Drawbacks: Adds decode and memory cost that latent caching usually avoids.
- Interactions: Requires `dataset.cache_latents`: This override is meaningful only on latent-caching paths. (all supported configurations)
- Aliases: none
- Example: `load_image_when_caching_latents: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `load_image_when_caching_latents` (`kwargs.get`)

<a id="dataset-loss-multiplier"></a>
### `dataset.loss_multiplier`

Multiplies the per-item loss from this dataset.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].loss_multiplier`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `1.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides a direct dataset-level loss weighting control.
- Drawbacks: Large multipliers amplify noisy or mislabeled examples as well as useful ones.
- Interactions: none
- Aliases: none
- Example: `loss_multiplier: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `loss_multiplier` (`kwargs.get`)

<a id="dataset-mask-min-value"></a>
### `dataset.mask_min_value`

Sets the loss-weight floor assigned to black mask pixels before mask normalization.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].mask_min_value`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, 1]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `0.1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `0.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: A small positive floor keeps unpainted regions weakly represented instead of dropping them completely.
- Drawbacks: Zero with an all-black mask produces a zero mean before normalization; high floors reduce focus.
- Interactions: Requires `dataset.mask_path`: The floor affects training only when a mask or alpha mask is resolved. (all supported configurations)
- Aliases: none
- Example: `mask_min_value: 0.1`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `mask_min_value` (`kwargs.get`)

<a id="dataset-mask-path"></a>
### `dataset.mask_path`

Names the resolved directory of grayscale masks matched to source basenames; ordinary white receives full weight and black maps toward mask\_min\_value.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].mask_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `runtime` / `server-overwritten`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `path` / `path` / `path`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `null` (process_type=`diffusion_trainer`)
- Engine fallback: present as `null` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: A browser save request writes mask\_path as null and the jobs route rejects a nonempty client override; preset mask paths are also server-managed. For a non-preset runtime job outside the save request, the server still supports a trusted explicit live mask\_path when it is canonical, is a real directory rather than a symlink, and stays under the configured datasets root. Otherwise the server resolves managed live or immutable preset masks. The mask editor stores an all-white mask as DELETE, making that ordinary full-weight case maskless. (all supported configurations)
- Benefits: Limits ordinary masked loss toward selected regions while preserving continuous grayscale weighting; after normalization, an all-white mask is equivalent to no mask for ordinary masked loss.
- Drawbacks: Browser save and preset paths are server-managed; only a trusted explicit canonical live directory remains supported for a non-preset runtime job outside that save path.
- Interactions: Affects `dataset.mask_min_value`: Black pixels map toward mask\_min\_value while white pixels map to 1.0. (all supported configurations); Affects `train.inverted_mask_prior`: Resolved masks are required before the inverted outside-mask prior can run; it separately weights the complementary region. (all supported configurations)
- Aliases: none
- Example: `mask_path: null`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `mask_path` (`kwargs.get`)

<a id="dataset-network-weight"></a>
### `dataset.network_weight`

Scales network training contribution for examples from this dataset.

- UI label: LoRA Weight
- Locations: Yaml `config.process[*].datasets[*].network_weight`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `1.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Balances multiple datasets without physically duplicating files.
- Drawbacks: Large weights can make a small dataset dominate updates.
- Interactions: none
- Aliases: none
- Example: `network_weight: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `network_weight` (`kwargs.get`)

<a id="dataset-num-controls-from-same-folder"></a>
### `dataset.num_controls_from_same_folder`

Limits the number of sibling controls sampled from the source folder.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].num_controls_from_same_folder`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
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
- Benefits: Bounds multi-reference conditioning from grouped images.
- Drawbacks: Large values increase memory and require enough valid sibling images.
- Interactions: Requires `dataset.control_from_same_folder`: This count is used only when same-folder controls are enabled. (all supported configurations)
- Aliases: none
- Example: `num_controls_from_same_folder: 1`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `num_controls_from_same_folder` (`kwargs.get`)

<a id="dataset-num-frames"></a>
### `dataset.num_frames`

Sets the number of frames requested from each video item; one selects image loading.

- UI label: Num Frames
- Locations: Yaml `config.process[*].datasets[*].num_frames`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`false`, nullable=`true`
- UI values/range/suggestions: not enumerated; `[1, +∞]`; none
- UI normalization scales: none
- UI-created value: present as `1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: On Select present as `39` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`); On Leave present as `{"kind":"undefined"}` (process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`)
- Architecture overrides: On Select present as `39` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`; On Leave present as `{"kind":"undefined"}` for process_type=`diffusion_trainer`, ui_architecture=`minimax_h3`
- Normalization: Changing to an architecture without datasets.num\_frames resets every dataset num\_frames to 1. (all supported configurations)
- Benefits: Controls temporal training length and allows image and video modes through one dataset contract.
- Drawbacks: More frames increase memory sharply and must match model temporal constraints.
- Interactions: none
- Aliases: none
- Example: `num_frames: 41`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `num_frames` (`kwargs.get`)

<a id="dataset-num-repeats"></a>
### `dataset.num_repeats`

Repeats the discovered file list this many times.

- UI label: Num Repeats
- Locations: Yaml `config.process[*].datasets[*].num_repeats`
- Surfaces: `simple-ui`, `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: `number`; optional=`true`, nullable=`true`
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `1` (process_type=`diffusion_trainer`)
- Engine fallback: present as `1` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Raises the sampling frequency of a smaller dataset relative to others.
- Drawbacks: Repeats do not add information and can accelerate overfitting.
- Interactions: none
- Aliases: `dataset.num_repeats` → `dataset.num_repeats` (Legacy, Replacement Wins): Use config.process\[\*\].datasets\[\*\].num\_repeats in job YAML.
- Example: `num_repeats: 1`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `num_repeats` (`kwargs.get`)

<a id="dataset-num-workers"></a>
### `dataset.num_workers`

Sets the training DataLoader worker-process count.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].num_workers`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `2` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Parallel workers can overlap item preparation with GPU work.
- Drawbacks: High counts consume memory and increase startup overhead; zero disables prefetch\_factor.
- Interactions: none
- Aliases: none
- Example: `num_workers: 2`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `num_workers` (`kwargs.get`)

<a id="dataset-poi"></a>
### `dataset.poi`

Names the removed point-of-interest dataset option.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].poi`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `deprecated`
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
- Benefits: There is no supported benefit; null preserves compatibility with old files that omitted the feature.
- Drawbacks: Any non-null value raises because point-of-interest training is no longer supported.
- Interactions: none
- Aliases: none
- Example: `poi: null`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `poi` (`kwargs.get`)

<a id="dataset-prefetch-factor"></a>
### `dataset.prefetch_factor`

Sets batches prefetched per DataLoader worker when workers are enabled.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].prefetch_factor`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
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
- Benefits: Can hide storage and preprocessing latency.
- Drawbacks: Large values multiply host-memory use and have no effect when num\_workers is zero.
- Interactions: Requires `dataset.num_workers`: The loader passes prefetch\_factor only when num\_workers is greater than zero. (all supported configurations)
- Aliases: none
- Example: `prefetch_factor: 2`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `prefetch_factor` (`kwargs.get`)

<a id="dataset-prior-reg"></a>
### `dataset.prior_reg`

Marks the dataset for prior-regularization handling in consumers that inspect this flag.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].prior_reg`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Preserves an explicit prior-data distinction for compatible training paths.
- Drawbacks: The main diffusion dataset split uses is\_reg; prior\_reg alone does not place the dataset in the regularization loader.
- Interactions: none
- Aliases: none
- Example: `prior_reg: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `prior_reg` (`kwargs.get`)

<a id="dataset-random-crop"></a>
### `dataset.random_crop`

Uses random crops instead of deterministic centered crops where supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].random_crop`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Adds framing diversity when source images contain safe crop margins.
- Drawbacks: Important features near the edges can be removed.
- Interactions: none
- Aliases: none
- Example: `random_crop: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `random_crop` (`kwargs.get`)

<a id="dataset-random-scale"></a>
### `dataset.random_scale`

Enables random pre-crop scale variation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].random_scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Adds scale diversity for suitable datasets.
- Drawbacks: It can crop away identity details and forces random cropping in the loader.
- Interactions: Overrides `dataset.random_crop`: When random\_scale is true, the loader uses random cropping regardless of random\_crop. (all supported configurations)
- Aliases: none
- Example: `random_scale: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `random_scale` (`kwargs.get`)

<a id="dataset-random-triggers"></a>
### `dataset.random_triggers`

Provides alternate trigger strings, or an existing path to a line-delimited trigger file.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].random_triggers`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string-list` / `string-list` / `string-list`
- Accepted types/values: `string`, `string-list`; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `[]` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: An existing string path is loaded as a line-delimited trigger list. A nonexistent string path remains a string, so the downstream random.sample consumer samples individual characters rather than treating it as one trigger. (all supported configurations)
- Benefits: Can vary trigger wording across samples when that variation is intentional.
- Drawbacks: Uncurated alternates weaken a stable activation phrase; a nonexistent string path remains a string and causes individual characters to be sampled.
- Interactions: none
- Aliases: none
- Example: `random_triggers: [sks_person, subject_token]`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `random_triggers` (`kwargs.get`)

<a id="dataset-random-triggers-max"></a>
### `dataset.random_triggers_max`

Limits how many random trigger strings are inserted into one caption.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].random_triggers_max`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
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
- Normalization: Zero disables random-trigger insertion. One deterministically inserts exactly one when triggers are truthy. A value greater than one uses randint from zero through the configured maximum before sampling, and must be less than or equal to the resolved trigger population length; otherwise randint can intermittently choose an oversized count and random.sample raises ValueError. (all supported configurations)
- Benefits: Bounds trigger augmentation while permitting controlled variation.
- Drawbacks: A value larger than the resolved trigger population can fail intermittently with ValueError when randint chooses too many entries for random.sample.
- Interactions: Constrains `dataset.random_triggers`: For a positive value, random\_triggers\_max must be less than or equal to the resolved trigger population length, including character population when a nonexistent path remains a string. (all supported configurations)
- Aliases: none
- Example: `random_triggers_max: 1`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `random_triggers_max` (`kwargs.get`)

<a id="dataset-replacements"></a>
### `dataset.replacements`

Defines caption replacement rules consumed by compatible caption processing.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].replacements`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Centralizes deterministic caption substitutions for a dataset.
- Drawbacks: Ambiguous replacement pairs can rewrite unintended text.
- Interactions: none
- Aliases: none
- Example: `replacements: []`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `replacements` (`kwargs.get`)

<a id="dataset-replay-transforms"></a>
### `dataset.replay_transforms`

Replays spatial transforms onto matched control images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].replay_transforms`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission uses true. An explicit null is preserved and is falsey at the augmentation consumer, so it disables replaying the source transform onto controls rather than restoring the true fallback. (all supported configurations)
- Benefits: Keeps control, mask, and target geometry aligned after augmentation.
- Drawbacks: Disabling it can misalign paired supervision unless the consumer intentionally needs independent transforms.
- Interactions: none
- Aliases: none
- Example: `replay_transforms: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `replay_transforms` (`kwargs.get`)

<a id="dataset-resolution"></a>
### `dataset.resolution`

Sets the target dataset resolution used for bucket construction and preprocessing.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].resolution`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `integer` / `integer` / `integer`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `[1, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `[512,768,1024]` (process_type=`diffusion_trainer`)
- Engine fallback: present as `512` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Controls the spatial detail and memory tradeoff for training items.
- Drawbacks: Upscaling cannot restore missing detail, while excessive resolution raises memory and preprocessing cost.
- Interactions: none
- Aliases: none
- Example: `resolution: 1024`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `resolution` (`kwargs.get`)

<a id="dataset-scale"></a>
### `dataset.scale`

Scales source dimensions before cropping and bucket preparation.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].scale`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `number` / `number` / `number`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: `(0, +∞]`; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `1.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Provides an explicit pre-crop size adjustment for specialized datasets.
- Drawbacks: Values that shrink too far can cause items to be rejected or lose detail.
- Interactions: none
- Aliases: none
- Example: `scale: 1.0`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `scale` (`kwargs.get`)

<a id="dataset-shrink-video-to-frames"></a>
### `dataset.shrink_video_to_frames`

Samples frames across the full video to fit num\_frames.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].shrink_video_to_frames`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `boolean` / `boolean` / `boolean`
- Accepted types/values: not separately constrained; not enumerated
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `accepted`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: present as `true` (process_type=`diffusion_trainer`)
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission uses true. An explicit null is preserved and is falsey at frame selection, so it disables whole-video shrinking and follows the configured-FPS path when the other frame-selection conditions do not take precedence. (all supported configurations)
- Benefits: Covers the whole clip with a fixed temporal batch length.
- Drawbacks: Long clips can appear sped up; disabling it uses FPS-based contiguous sampling instead.
- Interactions: none
- Aliases: none
- Example: `shrink_video_to_frames: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `shrink_video_to_frames` (`kwargs.get`)

<a id="dataset-shuffle-augmentations"></a>
### `dataset.shuffle_augmentations`

Requests randomized ordering for configured image augmentations.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].shuffle_augmentations`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `experimental`
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
- Benefits: Can vary composite transforms when the loader path supports shuffling.
- Drawbacks: Order changes can create unrealistic images and this field has limited consumer coverage.
- Interactions: none
- Aliases: none
- Example: `shuffle_augmentations: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `shuffle_augmentations` (`kwargs.get`)

<a id="dataset-shuffle-tokens"></a>
### `dataset.shuffle_tokens`

Enables shuffling of caption tokens after the protected prefix.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].shuffle_tokens`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Reduces accidental dependence on tag order for comma-separated captions.
- Drawbacks: Shuffling prose-like captions damages syntax and cached text embeddings freeze one ordering.
- Interactions: Affects `dataset.keep_tokens`: keep\_tokens protects the leading tokens from shuffling. (all supported configurations)
- Aliases: none
- Example: `shuffle_tokens: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `shuffle_tokens` (`kwargs.get`)

<a id="dataset-square-crop"></a>
### `dataset.square_crop`

Requests square cropping in loader paths that consume this flag.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].square_crop`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Provides an explicit square framing mode for compatible datasets.
- Drawbacks: Square crops discard content from non-square sources and this flag is not universal.
- Interactions: none
- Aliases: none
- Example: `square_crop: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `square_crop` (`kwargs.get`)

<a id="dataset-standardize-images"></a>
### `dataset.standardize_images`

Applies the model-family standardization transform after tensor conversion.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].standardize_images`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Matches the specialized SD15 or SDXL normalization path when explicitly required.
- Drawbacks: Using the wrong family normalization changes the data distribution.
- Interactions: none
- Aliases: none
- Example: `standardize_images: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `standardize_images` (`kwargs.get`)

<a id="dataset-token-dropout-rate"></a>
### `dataset.token_dropout_rate`

Sets the probability of dropping eligible caption tokens.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].token_dropout_rate`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `0.0` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Adds bounded caption robustness when text embeddings are computed live.
- Drawbacks: High dropout removes useful supervision and is bypassed when text embeddings are cached.
- Interactions: none
- Aliases: none
- Example: `token_dropout_rate: 0.0`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `token_dropout_rate` (`kwargs.get`)

<a id="dataset-trigger-word"></a>
### `dataset.trigger_word`

Overrides the process trigger word for this dataset.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].trigger_word`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Allows separate concepts in multiple datasets to use distinct triggers.
- Drawbacks: Inconsistent trigger usage across captions reduces controllability.
- Interactions: none
- Aliases: none
- Example: `trigger_word: sks_person`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `trigger_word` (`kwargs.get`)

<a id="dataset-trim-auto-frame-count-tail"></a>
### `dataset.trim_auto_frame_count_tail`

Trims unsupported tail frames from automatically counted videos instead of stretching the full clip.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].trim_auto_frame_count_tail`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Engine fallback: present as `true` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: Omission uses true. An explicit null is preserved and is falsey at auto-frame consumers, so it disables tail-trim behavior rather than restoring the true fallback. (all supported configurations)
- Benefits: Preserves the requested temporal spacing while meeting model frame-count constraints.
- Drawbacks: A short tail segment is omitted.
- Interactions: Requires `dataset.auto_frame_count`: Tail trimming applies only to automatically derived frame counts. (all supported configurations)
- Aliases: none
- Example: `trim_auto_frame_count_tail: true`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `trim_auto_frame_count_tail` (`kwargs.get`)

<a id="dataset-type"></a>
### `dataset.type`

Selects the dataset loader family.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].type`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
- Persistence/authority: `config` / `user`
- Applies to: process_type=`diffusion_trainer`
- Parser/supported/example types: `string` / `string` / `string`
- Accepted types/values: not separately constrained; `"image"`
- Supported range: not numerically bounded; collection length: not fixed
- Null behavior: `rejected`
- UI type/presence: not exposed; not exposed
- UI values/range/suggestions: not enumerated; not numerically bounded; none
- UI normalization scales: none
- UI-created value: not declared
- Engine fallback: present as `"image"` (all supported configurations)
- Other runtime/default transitions: none
- Architecture overrides: none
- Normalization: none
- Benefits: Use image for the diffusion LoRA loader supported by this training path.
- Drawbacks: Other values are rejected by the diffusion dataloader factory.
- Interactions: none
- Aliases: none
- Example: `type: image`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `type` (`kwargs.get`)

<a id="dataset-unconditional-path"></a>
### `dataset.unconditional_path`

Names a directory of filename-matched unconditional reference images.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].unconditional_path`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Provides paired unconditional inputs for compatible preservation or conditioning paths.
- Drawbacks: Missing matches remove the intended unconditional pair.
- Interactions: none
- Aliases: none
- Example: `unconditional_path: null`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `unconditional_path` (`kwargs.get`)

<a id="dataset-use-short-captions"></a>
### `dataset.use_short_captions`

Selects caption\_short from JSON-backed dataset records where supported.

- UI label: not exposed in the Simple UI
- Locations: Yaml `config.process[*].datasets[*].use_short_captions`
- Surfaces: `advanced-yaml`
- UI projection: none
- Scope/lifecycle: `dataset` / `supported`
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
- Benefits: Lets a dataset retain both detailed and compact caption variants.
- Drawbacks: Folder sidecars do not provide the JSON caption\_short field.
- Interactions: none
- Aliases: none
- Example: `use_short_captions: false`
- Source symbols: `toolkit/config_modules.py` :: `DatasetConfig.__init__` :: `use_short_captions` (`kwargs.get`)
<!-- settings-catalog:end -->

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
