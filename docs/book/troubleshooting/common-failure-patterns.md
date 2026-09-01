# Common LoRA training failure patterns

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Use this page as an index after applying the [diagnosis loop](diagnosis-guide.md). Each pattern lists likely boundaries, evidence to collect, and one first experiment. A matching symptom does not prove the listed cause.

## Job will not queue or run

**Likely boundaries:** unsaved or invalid job state, duplicate/stale status, queue admission, stopped worker, unavailable GPU, database/server error, or launch failure.

**Evidence to collect:** saved job revision, the response to **Add to queue**, whether a queue entry appears, status transitions and timestamps, queue enabled state, selected device, server/worker logs, and whether another minimal job can queue.

**First experiment:** submit one known-good diagnostic job to the same queue and GPU. If neither produces a queue entry, keep training settings unchanged and investigate shared queue/server state. If both queue but only one reaches running, compare job-specific preflight and launch logs.

Repeated clicking is not a fix; it can create duplicate requests and obscure the original transition. Follow [queue and GPU behavior](../workflow/queue-and-multiple-gpus.md).

## Model will not load

**Likely boundaries:** wrong architecture selector, incompatible checkpoint/component revision, missing access approval or token, absent files, unsupported precision/quantization, exhausted device/host memory, or optional dependency mismatch.

**Evidence to collect:** exact architecture and model path/revision, gate/access response, first causal traceback, component name, dtype/qtype, load device, peak memory, and the selected model guide's catalog facts.

**First experiment:** clone the job and use the architecture's catalog-selected base path with its default loading/quantization settings. If that loads, compare one derivative component at a time. If it does not, preserve the access or first component error rather than changing learning settings.

Do not load a checkpoint under a similarly named but different selector. Suffixes, T2V/I2V roles, and base families are not interchangeable.

## Dataset scan or caching fails

**Likely boundaries:** missing/unreadable media, caption stem/extension mismatch, invalid mask/control pairing, decoder failure, unsupported dimensions/frames, permissions/disk exhaustion, or stale cache identity.

**Evidence to collect:** first offending item and paired files, decoded shape/frame count, caption source, crop/bucket assignment, cache root and cold/warm state, free disk and host RAM, and the exact preprocessing configuration.

**First experiment:** create a tiny dataset containing the offending item plus one known-good item and run a cold-cache preflight. If only the suspect item fails, repair or exclude it. If cold succeeds and warm fails, inspect and rebuild the stale cache.

Replacing source, control, or first-frame media in place may not change every cache key. See [performance and caching](../advanced/performance-and-caching.md).

## Run is out of memory or unexpectedly slow

**Likely boundaries:** model load, quantization, cache build, forward/backward, optimizer state, sampling, saving, largest bucket/frame shape, concurrent device use, offloading transfers, or excessive logging/I/O.

**Evidence to collect:** exact failing phase, peak VRAM and host RAM, model/precision, largest input shape, `batch_size`, accumulation, optimizer, checkpointing/offloading, cold/warm cache timing, sampling/save cadence, and GPU processes.

**First experiment:** reproduce the same largest bucket in a short run and change one memory axis from the [low-VRAM recipe](../recipes/low-vram.md). Measure the whole pipeline. A lower step-time peak that moves failure into sampling or host memory is not a complete improvement.

For slowness without failure, separate startup/cache/compile warm-up from steady throughput and include sample/save time.

## Loss spikes or becomes non-finite

**Likely boundaries:** a difficult or corrupt batch, incompatible dtype/quantization, excessive learning rate, optimizer parameter error, unstable custom loss, gradient overflow, or invalid target/control values.

**Evidence to collect:** first non-finite step, same batch and timestep where reproducible, raw loss before smoothing, input paths/shapes, dtype, optimizer and parameters, learning rate/scheduler, gradient clipping, model revision, and recent configuration changes.

**First experiment:** rerun the same batch in a cloned diagnostic configuration while changing one suspected numerical axis. If removing the item fixes the failure, inspect its data path. If a lower learning rate fixes it, repeat to distinguish a stable threshold from a random batch difference.

Ordinary isolated peaks are not automatically defects, and the lowest loss is not automatically the best checkpoint. Use [loss and checkpoints](../workflow/loss-and-checkpoints.md).

## LoRA appears not to learn

**Likely boundaries:** trigger absent/mismatched, captions not loaded, wrong dataset or checkpoint, adapter not attached or loaded for sampling, network weight/strength zero, too little duration/capacity, overly low update scale, or evaluation prompts that do not activate the concept.

**Evidence to collect:** dataset/caption preview, resolved trigger, adapter module count, rank/alpha, optimizer steps and learning rate, checkpoint hash/step, sample LoRA strength, and matched step-zero/periodic fixed-seed samples.

**First experiment:** use one easy trigger-on prompt and the same fixed seed to compare step zero with several periodic checkpoints. If no checkpoint changes, verify the adapter and data pipeline before increasing rank, rate, or steps. If easy prompts improve but held-out prompts do not, improve dataset/caption coverage.

Changing inference strength or base model during the comparison can imitate weak training.

## LoRA overfits or loses prompt control

**Likely boundaries:** duplicates/near-duplicates, narrow coverage, uncaptioned correlations, excessive repeats/duration/rate/capacity, or evaluation at excessive LoRA strength.

**Evidence to collect:** dataset coverage table, duplicate review, captions for clothing/background/action, checkpoint progression, trigger-on/off fixed-seed grid, inference strength, and the earliest checkpoint where flexibility declines.

**First experiment:** compare an earlier checkpoint with identical sample settings. If it restores prompt control, duration is implicated; then test a shorter schedule while holding data and learning rate fixed. If every checkpoint bakes in the same correlation, change dataset/captions rather than only shortening training.

Overfitting evidence includes copied compositions, frozen attributes, exaggerated activation, and worsening held-out prompts—not simply low loss.

## Checkpoint save or resume fails

**Likely boundaries:** unwritable/full storage, interrupted file, incompatible save format, changed architecture/network shape, wrong checkpoint role, missing or incompatible optimizer state, changed job/output identity, or multistage file mismatch.

**Evidence to collect:** source checkpoint path/hash/size/step, matching configuration, architecture and network rank/type, save format/dtype, optimizer and scheduler, optimizer-state files, available disk, first save/load traceback, and whether the LoRA alone loads.

**First experiment:** copy the source job configuration, resume only the LoRA from the last verified checkpoint, and leave optimizer restoration off. If that succeeds, separately test the exact compatible optimizer state. If the LoRA fails, inspect model/network compatibility before optimizer details.

Restarting from weights and restoring optimizer state are different guarantees. Read [saving, resuming, and optimizer state](../workflow/saving-resuming-and-optimizer-state.md).

## Samples fail or comparisons disagree

**Likely boundaries:** sampling-only OOM, invalid control/reference, incompatible sampler/model, wrong checkpoint, changing prompt/seed/dimensions/guidance/steps, walk-seed behavior, decoding failure, or subjective selection from too few seeds.

**Evidence to collect:** exact checkpoint/hash, base model, LoRA strength, prompt/negative prompt, fixed seed and walk-seed state, sampler, guidance, inference steps, dimensions/frames/FPS, controls, and sample traceback.

**First experiment:** reproduce one sample with a known checkpoint and fully fixed settings. If sampling fails while training succeeds, diagnose the sampling memory/control/decode path. If comparisons disagree, regenerate both candidates in the same grid before drawing a training conclusion.

Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md); do not compare files whose settings are unknown.

## Stop changing settings when evidence is incomplete

Pause when the failing phase is unknown, the baseline cannot be reproduced, several variables changed together, logs/configurations are missing, the dataset changed in place, caches have unknown provenance, or samples lack fixed settings.

Restore a known baseline, preserve current artifacts, and collect the missing evidence. One variable per experiment is slower than random toggling for a minute and much faster than explaining an accidental workaround later.

For an unlisted symptom, return to the [diagnosis guide](diagnosis-guide.md) and classify the phase before editing.

## Further reading

- [Evidence-driven diagnosis](diagnosis-guide.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Queue and multiple GPUs](../workflow/queue-and-multiple-gpus.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Saving and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)
- [Performance and caching](../advanced/performance-and-caching.md)
- [Extending and debugging](../advanced/extending-and-debugging.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
