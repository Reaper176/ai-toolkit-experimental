# Evidence-driven LoRA diagnosis

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Troubleshooting is an experiment. The goal is not to make an error disappear by changing many settings; it is to identify which boundary failed and preserve enough evidence to explain why.

## Use the diagnosis loop

Repeat this loop:

1. state one observable symptom without guessing the cause;
2. collect evidence from the earliest failing phase;
3. propose one explanation that the evidence could distinguish;
4. make one one-variable experiment in a cloned configuration;
5. compare the result with the same inputs and record what changed;
6. keep narrowing or restore the baseline.

Avoid blind setting changes. Lowering resolution, disabling caching, changing the optimizer, and switching precision together may make a job run while destroying the evidence needed to find the cause.

Write the expected and observed transition. “The job is broken” is vague; “pressing **Add to queue** leaves status stopped and creates no queue record or preflight log” names an observable boundary.

## Identify the failing phase

Locate the last completed phase and the first causal error:

| Phase | Evidence to capture |
|---|---|
| Save/queue | persisted job revision, validation response, queue entry, selected GPU, queue state |
| Launch | exact command/process ID, environment, device assignment, first traceback |
| Model load | architecture/path/revision, access error, missing component, dtype/quantization message |
| Dataset scan | offending path, caption/control pairing, decoded shape, bucket assignment |
| Cache build | cache type/root, cold or reused state, disk/RAM use, first offending item |
| Train | first completed step, loss/dtype, optimizer, peak VRAM, non-finite warning |
| Sample | checkpoint, prompt, fixed seed, sampler, dimensions, controls, failure frame |
| Save/resume | file size/hash, step, optimizer state, source configuration, reload error |

Cleanup warnings after an exception are usually downstream symptoms. Start with the earliest causal frame, then confirm which phase had not completed.

## Diagnose jobs that do not queue or start

First separate editor persistence, queue admission, and worker launch:

- confirm the current job saves and reopens with the expected configuration;
- press **Add to queue** once and observe whether a queue entry appears;
- confirm the relevant queue is enabled and the configured GPU exists and is not assigned elsewhere;
- inspect the server/UI response and logs for validation or database errors;
- confirm the job is not already queued, running, stopping, or blocked by a stale status;
- run the smallest preflight only after admission succeeds.

If another job queues, compare only the queue-, device-, and job-specific fields. If neither queues, investigate shared queue/server state rather than editing LoRA learning settings. If the entry becomes queued but never running, focus on worker availability, queue state, and device assignment. See [queue and multiple GPUs](../workflow/queue-and-multiple-gpus.md).

Do not repeatedly click the control; duplicate requests can obscure whether the first admission succeeded. Preserve timestamps and request/job identifiers in the minimal reproduction.

## Diagnose dataset and cache failures

Identify the first offending media/caption/control item and reproduce preprocessing with the smallest dataset containing it. Check existence, permissions, decoding, caption stem/extension, controls, masks, frame count, resolution, and available disk space.

For a possible stale cache, record `_latent_cache` and `_t_e_cache` state before clearing them. Then run one cold-cache experiment. Rebuild after in-place source/control changes, model/VAE/encoder changes, or preprocessing changes; cache names do not digest every content input.

If uncached preprocessing works, compare the cache determinants rather than permanently disabling caching. If both fail on the same item, the cache is unlikely to be the primary cause. Review [performance and caching](../advanced/performance-and-caching.md).

## Diagnose out-of-memory and slow runs

Record the exact failing phase: model load, quantization, cache construction, forward, backward, optimizer step, sampling, or saving. “Out of memory” during sampling has a different remedy from optimizer-state allocation.

Capture peak VRAM, host RAM, bucket/frame shape, micro-batch, accumulation, precision, optimizer, checkpointing, offloading, quantization, and concurrent device users. Reproduce with the same largest bucket.

Change one memory axis in the order suggested by the [low-VRAM recipe](../recipes/low-vram.md). Measure total load/cache/train/sample/save time as well as step throughput. A change that moves the failure to host RAM or makes sampling unusable is not a complete fix.

For slow runs, compare cold and warm caches, first-step warm-up and steady state, logging/sample/save cadence, storage throughput, and transfer-heavy offloading. Do not benchmark a cache-building epoch against a warm cached epoch as if the workloads were equal.

## Diagnose loss and numerical failures

For `NaN`, infinity, or another non-finite value, preserve the first affected step and batch. Inspect the media/caption/control item, dtype, learning rate, loss settings, optimizer/parameters, gradient clipping, quantization, and any custom objective.

Reproduce on the same batch when possible. Lowering learning rate is one experiment, not proof that learning rate caused the failure. For backward-operation diagnosis, the advanced debugging chapter explains temporary `DEBUG_TOOLKIT=1` anomaly detection.

Ordinary noisy loss is not a numerical failure. Different timesteps, resolutions, captions, and batches legitimately change difficulty. Smooth only for visualization and retain raw points.

The lowest loss checkpoint is not automatically the best LoRA, and valleys are not automatically better than peaks. Pair checkpoints with fixed-seed samples and evaluate prompt response, flexibility, artifacts, and held-out content using [loss and checkpoints](../workflow/loss-and-checkpoints.md).

## Diagnose weak or overfit samples

First prove the comparison is controlled: same base model, checkpoint, LoRA strength, prompts, fixed seed, sampler, guidance, inference steps, dimensions/frames, and controls. Compare step zero and periodic checkpoints.

For weak learning, verify trigger/caption use, dataset loading, adapter attachment, network weight, checkpoint identity, and whether later samples improve. Only then test capacity, learning rate, or duration one at a time.

For overfitting, look for copied compositions, frozen clothing/backgrounds, reduced prompt response, exaggerated trigger behavior, or degradation after an earlier useful checkpoint. Inspect duplicates, correlations, repeats, captions, rank, learning rate, and duration. More steps usually strengthen the problem.

For sudden quality changes, first check evaluation drift and checkpoint mix-ups. A different seed or sampler can imitate training change. Follow [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Preserve evidence and escalate

Keep the failing and control configurations, exact git revision, dependency/device versions, sanitized logs, timestamps, cache state, checkpoint hashes, and experiment result. Make a minimal reproduction using synthetic or shareable data when the real dataset is private.

Before reporting a defect, reproduce from a fresh process and state whether it is deterministic. Redact secrets, access tokens, personal content, and private paths without removing the structure needed to understand relationships.

Escalate with the symptom, earliest causal traceback, last successful phase, expected behavior, one-variable experiments, and the smallest reproducer. Do not present a workaround as a confirmed root cause.

For symptom-specific reminders, continue to [common failure patterns](common-failure-patterns.md).

## Further reading

- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Queue and multiple GPUs](../workflow/queue-and-multiple-gpus.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Performance and caching](../advanced/performance-and-caching.md)
- [Extending and debugging](../advanced/extending-and-debugging.md)
- [Saving and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)
- [Common failure patterns](common-failure-patterns.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
