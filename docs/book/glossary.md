# LoRA training glossary

[Table of contents](README.md)

<!-- book-navigation:start -->
[← Previous](examples/README.md)
<!-- book-navigation:end -->

These definitions describe how terms are used in this training book and ai-toolkit configuration. Model papers and other applications may use the same words more broadly.

## A–C

### Alpha

The scaling parameter paired with LoRA rank. On non-PEFT adapter paths, module scale is based on `alpha / rank`, so alpha equal to rank gives scale one. Transformer-family PEFT format normally forces alpha to rank (except the active legacy LoKr-format case), so configured alpha may not independently change scaling. Verify the resolved format before interpreting an alpha experiment; see [network settings](reference/network.md).

### Architecture

The selected model-family implementation, such as `flux`, `sdxl`, or `wan22_14b:t2v`. Architecture determines compatible checkpoints, components, schedulers, controls, targets, defaults, and memory features. Similar names and suffix variants are not interchangeable.

### Batch size

The number of dataset items processed together in one micro-batch. Effective batch combines micro-batch size with gradient accumulation and, where applicable, distributed workers. Increasing it changes memory use and gradient statistics.

### Bucket

A group of items prepared at a compatible resolution, aspect ratio, or temporal shape. Bucketing reduces destructive resizing while allowing batchable tensor shapes. The largest bucket often determines peak training memory.

### Cache

A stored result reused to avoid repeated work. Latent caches depend on source media, preprocessing, crop/bucket geometry, VAE/encoding space, and related inputs; text caches depend on effective captions and the conditioning stack. Persistence is not proof that a cache remains valid.

### Caption dropout

The probability of replacing an item's caption with a blank caption during eligible training paths. It is not the same as token dropout, which changes tokens inside a caption. Cached text embeddings constrain which dynamic variants remain possible.

### Checkpoint

A saved model or adapter state at a known training step. A LoRA checkpoint may not include optimizer state, scheduler state, or every counter required for an exact continuation. Keep its step, configuration, and sample evidence together.

### Conditioning

Information that guides denoising, such as text embeddings, control images, reference frames, masks, or audio features. Different architecture roles can require different conditioning layouts even when they share a base family name.

### Control

An auxiliary input paired with a training item or sample, such as an edit image, depth map, pose image, or first frame. Controls must preserve the intended item-to-conditioning relationship and use architecture-compatible fields.

## D–L

### Epoch

One traversal of the effective dataset as constructed by repeats, sampling, and batching. Epoch counts are not directly comparable when dataset size or repeat policy differs; this book generally records optimizer steps for cross-run timing.

### Gradient accumulation

Processing several micro-batches before one visible optimizer step to increase effective batch without holding all items simultaneously. It adds computation and is not identical to a larger physical batch for every optimizer or fused-backward path.

### Gradient checkpointing

A memory technique that discards supported forward activations and recomputes them during backward. It can reduce VRAM at the cost of extra compute and only affects components that implement checkpoint support.

### Latent

A compressed model-space representation produced from source media, usually through a VAE or related encoder. Training commonly adds noise and predicts targets in latent space rather than directly manipulating source pixels.

### Learning rate

The scale applied to optimizer updates. Too high can cause instability, artifacts, or rapid overfitting; too low can produce weak progress within the available steps. Its useful range depends on optimizer, model, target set, batch behavior, and objective.

### LoRA

Low-Rank Adaptation: trainable low-rank update matrices attached to selected base-model modules while most base weights remain frozen. The resulting file is smaller than a full model but remains tied to compatible architecture and target names.

### Loss

The numerical training objective for a sampled batch and timestep. It confirms what the optimizer is minimizing but does not directly rank visual quality, identity, prompt flexibility, or temporal consistency. The lowest loss checkpoint is not automatically the best LoRA.

## M–R

### Mask

A grayscale spatial weight used to focus or preserve regions during supported training. In the book's convention, white contributes full normal masked loss and black contributes the configured minimum; an all-white mask behaves like no spatial mask.

### Noise scheduler

The training-time rule that maps timesteps/noise levels and related values for the denoising objective. It is architecture-specific and is not the same as a learning-rate scheduler.

### Optimizer

The algorithm that converts gradients into parameter updates and owns state such as moments or adaptive estimates. Optimizer choice affects memory, update behavior, supported parameters, and whether optimizer state can resume compatibly.

### Overfitting

Learning the training set's narrow examples or correlations at the expense of useful generalization and prompt control. Signs include copied compositions, frozen backgrounds/clothing, rigid activation, or held-out samples worsening after an earlier checkpoint.

### Quantization

Representing eligible model weights with a lower-precision or compressed format to reduce memory. Support is architecture-, module-, backend-, and save-path-specific; quantization can change speed, compatibility, and numerical behavior.

### Rank

The low-rank dimension of an adapter. Higher rank can add capacity, memory use, computation, and checkpoint size. It does not fix poor data or targeting, and comparisons must also record alpha.

### Resume

Starting a new training process from saved artifacts. Loading LoRA weights continues from learned parameters; restoring compatible optimizer state additionally restores update history. These are related but different operations.

## S–Z

### Sampler

The inference-time denoising procedure used to generate evaluation outputs. Sampler choice, steps, guidance, seed, dimensions, and model must remain fixed when comparing checkpoints.

### Seed

An initial value for pseudorandom generation. A fixed seed helps keep latent noise comparable, but full determinism can still depend on hardware, kernels, software, and other random data operations.

### Step

In this book, normally one visible optimizer-step counter increment. Gradient accumulation can require several backward micro-batches per visible step, so step count alone does not express total examples or wall-clock work.

### Text encoder

The component that converts captions/prompts into conditioning embeddings. Training it adds parameters and memory; caching embeddings assumes its weights remain fixed and is incompatible with text-encoder training.

### Timestep

A position or noise level in the diffusion/flow training process. Different timesteps can have different difficulty and loss magnitude, which is one reason raw loss curves are noisy.

### Trigger

A deliberate token or phrase used consistently in captions and prompts to activate a learned concept. It labels the concept; it does not compensate for incorrect captions or inadequate dataset coverage.

### VAE

Variational autoencoder, used by many architectures to encode source media into latents and decode latents into images or frames. Changing the VAE or its preprocessing can invalidate latent caches and alter output behavior.

### VRAM

Accelerator memory used by weights, activations, gradients, optimizer state, temporary kernels, caches, and sampling. Peak VRAM depends on the exact phase and is not a universal property of a model name.

## Further reading

- [Training mental model](getting-started/training-mental-model.md)
- [Network settings](reference/network.md)
- [Training settings](reference/training.md)
- [Dataset settings](reference/dataset.md)
- [Optimizer and scheduler settings](reference/optimizers-and-schedulers.md)
- [Sampling and evaluation](workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](workflow/loss-and-checkpoints.md)
- [Evidence-driven diagnosis](troubleshooting/diagnosis-guide.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
