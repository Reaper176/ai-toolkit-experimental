# Performance, memory, and caching

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Performance tuning moves work among the accelerator, host memory, storage, and repeated computation. There is no universally fastest or lowest-memory configuration: measure the complete workload on the exact model, dataset, hardware, and software revision you intend to use.

## Measure the whole pipeline

Record separate timings for model load, dataset scan, cache construction, steady training, sampling, checkpoint save, and shutdown. Also record peak VRAM, peak host RAM, cache and checkpoint disk use, training throughput, sample latency, and whether the run completed without retries.

A setting can improve steps per second while making startup, sampling, or saving much slower. Conversely, a cache may make the first epoch slower and later epochs faster. Compare equal work: the same largest bucket, batch shape, frame count, optimizer, checkpoint/sample cadence, and number of optimizer steps.

Warm-up effects matter for compilation, filesystem caches, and allocator state. Separate the first measured interval from steady state, but do not omit startup cost when judging a short run.

## Separate latent and text caches

Latent caching and text-embedding caching are independent:

- `dataset.cache_latents` keeps compatible encoded latents in host memory;
- `dataset.cache_latents_to_disk` writes reusable latent files beneath `_latent_cache`;
- `dataset.cache_text_embeddings` caches per-dataset caption embeddings beneath `_t_e_cache`;
- `train.cache_text_embeddings` forces text caching for every dataset.

Enabling one does not imply the other. Latents avoid repeated media decoding, preprocessing, and VAE encoding. Text caches avoid repeated text-encoder work and may allow the encoder to unload when it is not trained. Both consume another resource and freeze inputs that would otherwise be evaluated dynamically.

Memory caches disappear with the process. Disk caches can survive later runs, but persistence does not prove compatibility. Treat cache provenance as part of the experiment: record the base model, VAE or encoders, dataset revision, preprocessing, and toolkit revision.

## Invalidate latent caches deliberately

The disk latent key includes the source basename, crop geometry, latent-space versions, and enabled frame/audio preprocessing flags. It does not include a digest of source content identity. Replacing media in place under the same name can therefore reuse a stale entry.

Clear the relevant `_latent_cache` and rebuild after changing or replacing source images/video/audio, the VAE or compatible model encoding space, crop/bucket geometry, resolution policy, frame preprocessing, controls that affect the encoded input, or other cache-determining transforms. When uncertainty remains, rebuilding is safer than interpreting results from unknown latents.

Configured pixel-space augmentations disable both memory and disk latent caching because a fixed latent would freeze the augmented result. Do not enable `cache_latents` or `cache_latents_to_disk` and assume augmentations still vary each epoch; inspect the resolved behavior.

`dataset.cache_latents_num_workers` can shorten preparation, but more workers also increase host RAM, I/O contention, and process overhead. Benchmark it against the actual storage device rather than setting it to the CPU count automatically.

## Invalidate text caches deliberately

Text-cache identity includes the effective caption and text-embedding-space version. It can also include a control-path string or first-frame flag, but it does not digest control or first-frame media content. Replacing those files in place can leave a stale `_t_e_cache`; clear both relevant cache roots when the paired conditioning content changes.

Rebuild text caches after changing captions, caption extension/defaults, trigger substitution, tokenizer or text encoder, model conditioning revision, or cached caption variants. Caption changes normally create a different identity, but explicit cleanup keeps provenance understandable and removes orphaned files.

`train_text_encoder` is incompatible with fixed `cache_text_embeddings`: cached vectors cannot reflect encoder parameter updates, and the trainer rejects the combination. Decide whether the encoder will train before building the cache.

Token-level dynamic behavior may be frozen or bypassed by caching, while supported caption-dropout variants can select among separately cached embeddings. Establish the intended caption/dropout policy first and verify it on a diagnostic run rather than assuming every stochastic text transform remains active.

## Trade memory for recomputation and transfers

`train.gradient_checkpointing` recomputes supported activations during backward instead of retaining all of them. It can reduce peak VRAM, but backward becomes slower and only components exposing checkpoint support are affected.

`model.layer_offloading` moves supported layers between devices. This reduces resident accelerator memory by adding transfer work and host-memory pressure. Its percentage fields are stored as fractions from 0 to 1 even though the Simple UI displays percentages; preserve the correct representation when editing YAML.

`model.low_vram` selects architecture-specific loading or execution behavior. It is not one universal algorithm, and architecture changes can reset it. Measure load, train, sample, and save paths because the largest peak may occur outside the steady training step.

Lowering `train.batch_size` usually reduces micro-batch memory. `train.gradient_accumulation` increases the number of micro-batches contributing to a visible optimizer step, changing effective batch and wall-clock time rather than making a large simultaneous batch free. Some fused-backward optimizers conflict with ordinary accumulation or clipping; check the optimizer reference before combining them.

Use the ordered experiments in the [low-VRAM recipe](../recipes/low-vram.md). Preserve dataset resolution until measurement shows it is the remaining blocker, because reducing resolution changes the learning problem rather than merely relocating work.

## Treat quantization and compilation as compatibility choices

Model and text-encoder quantization can reduce weight memory, but supported qtypes, exclusions, trainable modules, save behavior, numerical effects, and speed are architecture- and backend-specific. Start from the selected model guide. A configuration parser accepting a quantization name is not proof that the model can train and save correctly with it.

`model.compile` enables an experimental `torch.compile` path. `compile_dynamic`, `compile_fullgraph`, and `compile_mode` alter tracing and optimization behavior. Unsupported architectures or devices can fail or use more resources, and quantized compilation is explicitly experimental.

Compilation can add startup work and shape-dependent behavior. Benchmark enough repeated steps to distinguish warm-up from steady state, then include that warm-up in total-job cost. Verify sampling and saving too; a faster compiled training loop is not useful if another required path fails.

Do not introduce compilation, quantization, offloading, and checkpointing in one test. Their interactions make a failure or quality change difficult to attribute.

## Benchmark one variable at a time

Clone a passing diagnostic configuration and use this matrix for each candidate change:

| Evidence | Record |
|---|---|
| Workload | architecture/revision, dataset hash, largest bucket, frames, `batch_size`, `gradient_accumulation` |
| Memory | peak VRAM, host RAM, disk before/after, cache sizes |
| Time | load, cache build, warm-up, steady throughput, sample, save |
| Correctness | adapter count, finite loss, save/reload, cache provenance |
| Quality | identical prompts, fixed seed, sampler, dimensions, checkpoint, LoRA strength |

Run the uncached or less optimized baseline first. Change one variable, repeat enough times to identify noise, and keep raw logs. If a disk cache is reused, report both cold-cache and warm-cache timing. If a configuration no longer fits, record the failing phase and peak rather than only “out of memory.”

Performance results do not transfer cleanly between GPUs, drivers, storage, precision backends, model revisions, or video dimensions. Publish conditions with any recommendation and avoid universal card-capacity claims.

## Further reading

- [Dataset settings reference](../reference/dataset.md)
- [Training settings reference](../reference/training.md)
- [Job and model reference](../reference/job-and-model.md)
- [Optimizer and scheduler reference](../reference/optimizers-and-schedulers.md)
- [Low-VRAM recipe](../recipes/low-vram.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Saving and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
