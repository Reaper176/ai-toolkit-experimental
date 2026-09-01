# Recipe: low-VRAM LoRA baseline

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](focused-refinement.md) · [Next →](diagnostic-run.md)
<!-- book-navigation:end -->

Use this recipe to establish whether a representative LoRA training step and sample pass fit within limited accelerator memory. It prioritizes a measurable, reproducible baseline over maximum throughput.

<!-- built-in-presets:start -->
- `builtin:anima:low-vram-starting-point@1` — Anima — Low-VRAM Starting Point
<!-- built-in-presets:end -->

## Objective

Reduce peak VRAM while preserving the model family, training signal, and intended dataset resolution as long as possible. The goal is a stable configuration with enough headroom for the largest bucket and sampling—not a promise that any named GPU can train any model.

There is no universal card-capacity guarantee. Peak use depends on model and text encoders, checkpoint precision, quantization, optimizer state, resolution, batch shape, gradient checkpointing, offloading, caches, sampling, drivers, and library versions.

## Suitable models

Begin with a model family that has a documented low-memory path. This recipe links to the supported Anima path under model-specific deviations; use another architecture only with its own validated configuration.

Choose the smallest base model that meets the actual output goal. LoRA rank is rarely the dominant allocation compared with a large transformer, activations, text encoders, VAE work, optimizer state, or sampling.

## Dataset design

Curate the dataset for the concept first. Memory limits do not justify duplicates, inaccurate captions, or missing coverage. Keep an intentionally small diagnostic subset that includes the largest expected resolution bucket and the longest relevant caption.

Preserve dataset resolution during the first memory interventions so the experiment still tests the intended visual signal. Lower resolution only after measuring that activation memory remains the bottleneck, and treat that change as a quality trade-off rather than a free optimization.

Use buckets to group compatible aspect ratios, but verify the largest bucket independently. A run that starts on small images can still fail later with an out of memory error. Follow [dataset curation](../datasets/curation.md) and [resolution and bucketing](../datasets/resolution-and-bucketing.md).

## Caption pattern

Use the same accurate trigger and caption pattern planned for the full run. Shortening captions solely to save memory can change what the model learns and may not address the dominant allocation.

```text
[trigger], three-quarter portrait, seated beside a window, blue jacket, daylight
```

When `cache_text_embeddings` is enabled, text-encoder work can be reused instead of recomputed every step. Token dropout is skipped or frozen by cached token embeddings, while caption dropout can still select a cached normal versus blank or trigger-only embedding. Decide caption policy before building the cache and rebuild when cache-dependent inputs change.

## Starting settings and ranges

Start from the family baseline, measure a representative batch, and apply compatible interventions one at a time:

| Priority | Setting | Starting choice | Trade-off to verify |
|---:|---|---|---|
| 1 | batch size | 1 | lower throughput; accumulation changes effective update behavior and must remain controlled |
| 2 | `cache_text_embeddings` | enabled when compatible | restricts dynamic token-level caption behavior and uses host memory or storage |
| 3 | `cache_latents` | enabled when compatible | freezes cache-dependent image encoding/augmentation behavior and uses host memory or storage |
| 4 | gradient checkpointing | enabled | recomputes activations, reducing VRAM at the cost of throughput |
| 5 | model/text-encoder quantization | family-supported type | can trade speed, numerical fidelity, or compatibility for memory |
| 6 | low-VRAM/offloading path | enabled when supported | transfers or stages modules, often reducing throughput and increasing host-memory pressure |
| 7 | sampling frequency/size | diagnostic minimum | reduces sampling peaks but must still test the real output path |

Keep rank and alpha at the concept recipe's conservative starting point. Reducing rank may help adapter and optimizer memory somewhat, but do not expect it to solve a base-model-sized allocation.

Caches can be reused when the implementation recognizes them and every value that determines the cached artifact remains compatible. Latents depend on the source media, crop/bucket/preprocessing behavior, VAE, and relevant augmentation policy; text embeddings depend on captions, tokenization, text encoders, and dropout/caption variants. When uncertain, invalidate and rebuild rather than trusting stale cache files.

## Sampling plan

The memory test must include sampling because training can fit while inference fails. Use one representative prompt, fixed seed, intended dimensions, normal inference steps, and the planned LoRA loading path.

At minimum, record:

- peak allocation during model loading;
- peak allocation for the largest training bucket;
- host RAM and swap behavior during caching or offloading;
- step time after warm-up;
- sampling peak and completion time;
- software versions and exact memory-related settings.

Once stable, use the concept recipe's full evaluation suite and [sampling and evaluation](../workflow/sampling-and-evaluation.md). Leave practical headroom instead of tuning to a one-run peak with no margin.

## Expected learning signals

A healthy low-memory baseline completes cache preparation, several optimizer steps, a checkpoint save, and an actual sample without device mismatch or allocation failure. Step time should stabilize after compilation, cache creation, and warm-up.

Samples should show the same early directional signal as the corresponding standard-memory baseline. Quantization or offloading should not silently disable trainable modules. Verify that LoRA weights change, loss remains finite, checkpoints reload, and the trigger affects controlled samples.

Slower training is expected when checkpointing recomputes work or offloading moves data. Compare quality at equivalent optimizer steps, not equal wall-clock time.

## Common failure modes

**Out of memory appears after many steps:** a larger bucket, save, validation, or sample path has a higher peak. Reproduce each phase independently and retain headroom.

**Caching consumes excessive RAM or disk:** reduce diagnostic dataset size, inspect cache placement, and verify invalidation behavior. Caches move or avoid work; they do not eliminate every resource cost.

**Stale cache produces confusing results:** rebuild after changing images, crops, captions, text encoders, VAE, or cache-dependent augmentation and dropout policy.

**Training becomes extremely slow:** measure gradient checkpointing, quantization, and offloading separately. The lowest VRAM configuration may have unacceptable throughput.

**Quality changes after quantization:** use only family-supported types, confirm modules intended to train remain trainable, and compare fixed-seed samples with a less aggressive configuration.

**Training fits but sampling fails:** reduce only the diagnostic sample dimensions or offload according to the family guide, then separately verify the intended final sampling workflow.

## Settings deliberately not changed

Keep dataset membership, captions, trigger, target model family, optimizer objective, timestep strategy, loss type, and evaluation prompts unchanged. Preserve dataset resolution through caching, checkpointing, supported quantization, and offloading experiments unless measurement shows resolution is the remaining blocker.

Do not simultaneously reduce resolution, rank, batch behavior, duration, and sampling quality. That may fit, but it no longer identifies which intervention mattered or whether the original learning goal survived.

## Model-specific deviations

- [Anima training guide](../models/anima.md): use its validated precision, quantization, caching, gradient-checkpointing, and low-memory/offloading path; incompatible generic settings here must be ignored.

Hardware, backend, and library support can change. Treat the family guide and a current representative measurement as authoritative for the selected environment.

## Further reading

- [Choose a model](../getting-started/choose-a-model.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Saving and resuming](../workflow/saving-resuming-and-optimizer-state.md)
- [Training settings reference](../reference/training.md)
- [Job and model settings reference](../reference/job-and-model.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
