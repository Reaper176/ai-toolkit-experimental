# Recipe: 250-step diagnostic run

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](low-vram.md) · [Next →](../models/anima.md)
<!-- book-navigation:end -->

Use this short run before committing hours to a new model, dataset, cache, or configuration. It tests the pipeline rather than LoRA quality: successful completion proves that major stages connect, not that 250 steps are enough to learn the concept.

<!-- built-in-presets:start -->
<!-- built-in-presets:end -->

## Objective

Exercise job creation, queue submission, model loading, dataset discovery, bucketing, captions, cache preparation, forward/backward passes, optimizer updates, sampling, checkpoint saving, and artifact reload with the smallest run that still reaches each stage.

The endpoint is exactly 250 optimizer steps. Use one current 250-step save/sample interval so the run produces an endpoint sample and one retained periodic checkpoint. A separate step-zero sample provides the comparison baseline.

## Suitable models

Use the exact model family and checkpoint intended for the longer run. This recipe includes Anima image training and Wan video training under model-specific deviations; their data shapes and memory paths are not interchangeable.

A smaller substitute model can test the installation generally but cannot validate architecture-specific loading, memory, caching, sampling, or checkpoint compatibility for the intended model.

## Dataset design

Use a small but representative subset, not merely the first few files in directory order. Include:

- the largest bucket expected in the full dataset;
- the smallest or most unusual aspect ratio;
- at least one ordinary caption and the longest realistic caption;
- masks, control inputs, video frames, or audio only when the full run will use them;
- enough examples to form more than one batch without duplicating files artificially.

Keep filenames and sidecars in their real directory layout so discovery is tested. Validate rights and remove corrupt media before queueing. The diagnostic subset tests plumbing; the full curated dataset still determines learning quality.

## Caption pattern

Use the intended trigger and real caption format. Include at least one caption whose variable attributes can be checked in the endpoint sample:

```text
[trigger], three-quarter view, standing outdoors, red jacket, overcast light
```

Do not replace captions with placeholders just to start the job. If `cache_text_embeddings` will be used, enable the intended compatible caption/dropout policy now so cache construction and selection paths are exercised.

## Starting settings and ranges

Start from the selected family or concept baseline and override only diagnostic duration and retention:

| Setting | Diagnostic value | Why |
|---|---:|---|
| optimizer steps | 250 | reaches real updates without implying a finished run |
| save/sample interval | 250 | exercises both paths once at the current endpoint |
| retained periodic checkpoints | 1 | proves retention while limiting diagnostic artifacts |
| batch size | intended value, or 1 if establishing fit | tests realistic memory behavior |
| resolution and buckets | intended values | includes the largest bucket peak |
| cache settings | intended values | verifies build, reuse, and storage paths |
| fixed seed | one recorded value | permits step-zero versus step-250 comparison |

Do not shorten the run by changing rank, learning rate, optimizer, quantization, or scheduler unless the diagnostic is specifically comparing that variable. Record the resolved configuration and software revision with the result.

Before submission, perform a preflight: verify base-model and dataset paths, output permissions, free disk and host memory, selected GPU IDs, port/process state, unique job name, sample prompt, trigger, and absence of stale running state. Save the job, reload it, and confirm the values persisted.

## Sampling plan

Create a step-zero sample with the same model, prompt, sampler, dimensions, inference steps, LoRA strength convention, and fixed seed used at step 250. The trigger-on prompt should be simple and representative; add one trigger-off prompt when the workflow permits it.

At the endpoint, verify that sampling completes without exhausting VRAM and that artifacts are written to the expected job directory. Differences from step zero may be subtle or poor; the purpose is to establish that the trained adapter is loaded and affects the path.

Use [sampling and evaluation](../workflow/sampling-and-evaluation.md) for longer-run checkpoint selection. Do not choose production settings from this single diagnostic pair.

## Expected learning signals

A successful diagnostic has observable evidence at every boundary:

- the UI or API accepts the job into the intended queue;
- the worker transitions from queued to running rather than silently returning;
- media, captions, masks, controls, and caches report expected counts;
- loss is finite and optimizer steps advance to 250;
- an endpoint sample and checkpoint are created;
- retention leaves one retained periodic checkpoint as configured;
- the checkpoint can be loaded for a sample or a controlled resume check.

The trigger may begin to influence samples, but likeness, style strength, or temporal consistency is not a pass criterion. This diagnostic tests the pipeline rather than LoRA quality.

## Common failure modes

**Play/add-to-queue appears inactive:** save the current editor state, confirm the job has a valid unique name and GPU ID key, inspect validation feedback, check worker/API logs, and rule out a stale job record. Follow [queues and multiple GPUs](../workflow/queue-and-multiple-gpus.md).

**Job queues but never runs:** verify the matching queue worker, exact GPU ID grouping, concurrency limits, and stale process state. Do not repeatedly click submit without checking whether duplicate requests were created.

**Failure occurs during caching:** inspect the first offending file, captions, disk capacity, host RAM, cache permissions, and model-specific encoder/VAE configuration. Rebuild invalid cache artifacts after inputs change.

**Out of memory occurs late:** ensure the diagnostic included the largest bucket and actual sample pass. Training, saving, and sampling have different peaks.

**Checkpoint exists but cannot resume:** distinguish weight-only loading from full training-state resume. Verify optimizer-state configuration and exact base architecture using [saving and resuming](../workflow/saving-resuming-and-optimizer-state.md).

**Loss or samples look bad:** do not tune from one short run unless the output proves a pipeline error such as wrong captions, blank masks, or failed adapter loading. Dataset quality and learning settings require a longer controlled experiment.

## Settings deliberately not changed

Keep the base checkpoint, architecture, dataset resolution, captions, trigger, rank, alpha, learning rate, optimizer, scheduler, timestep strategy, precision, quantization, caches, gradient checkpointing, offloading, masks, controls, and sample configuration at the intended longer-run values.

Only total duration, the current save/sample interval, and checkpoint retention are diagnostic overrides. If memory forces another change, document it and run a second diagnostic after restoring the intended setting.

## Model-specific deviations

- [Anima training guide](../models/anima.md): retain its image dimensions, precision, quantization, caching, and sampler path; include the largest image bucket.
- [Wan training guide](../models/wan.md): include the intended frame count, dimensions, and control/audio inputs; a single-image substitute does not exercise video memory or temporal data loading.

Family-specific compatibility and built-in preset values override generic assumptions in this recipe.

## Further reading

- [Edit training jobs in the UI](../workflow/simple-ui.md)
- [Queues and multiple GPUs](../workflow/queue-and-multiple-gpus.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Saving and resuming](../workflow/saving-resuming-and-optimizer-state.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Choose a model](../getting-started/choose-a-model.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
