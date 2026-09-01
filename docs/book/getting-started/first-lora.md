# Train your first LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This walkthrough creates a small image LoRA through the Simple editor. It follows the validated [`first-lora-flex1.yaml`](../examples/first-lora-flex1.yaml) baseline, but every value described here can be entered through the form. Finish the [prerequisites](prerequisites.md) before starting.

## Build the training dataset

Create a dedicated folder containing the images for one clearly defined concept. Begin with a small, carefully reviewed set rather than every available picture. Remove duplicates, near-duplicates, watermarks, accidental crops, unrelated subjects, and images you do not have permission to train on.

For each image, create a UTF-8 text caption with the same filename stem and the `.txt` extension:

```text
dataset/
├── image-001.jpg
├── image-001.txt
├── image-002.png
└── image-002.txt
```

Choose a short trigger that is unlikely to appear accidentally in normal prompts. Replace `[trigger]` in each caption with that token, then describe what changes from image to image: pose, clothing, view, lighting, background, medium, or composition. Do not repeat fixed identity or style details unnecessarily in every caption; the [caption chapter](../datasets/captions-and-triggers.md) explains that tradeoff.

Open several image/caption pairs manually. A missing, mismatched, or misleading caption is a data error, not something more training steps will repair. Keep a backup of the curated dataset before using editing tools.

## Create the job in the Simple editor

Open **Jobs**, choose **New Job**, keep the **Simple** editor visible, and create a diffusion-training job. Enter a unique job name and select the intended GPU. Use these baseline values from the validated example:

| Area | First-run value |
|---|---|
| Architecture | Flex.1 |
| Base model | `ostris/Flex.1-alpha` |
| Dataset folder | the curated folder above |
| Caption extension | `txt` |
| Resolution buckets | 512, 768, and 1024 |
| Network | LoRA, linear rank 16, alpha 16 |
| Batch / accumulation | 1 / 1 |
| Optimizer | AdamW8bit |
| Learning rate | `0.0001` with constant scheduler |
| Target steps | 2000 |
| Checkpoint cadence | every 250 steps, retain four |

Keep UNet training enabled, text-encoder training disabled, gradient checkpointing enabled, and latent disk caching enabled. The example uses `qfloat8` model and text-encoder quantization, bf16 training, and MSE loss. These are a tested baseline, not proof that every GPU will fit; reduce the dataset resolution or choose a low-memory recipe if the short run cannot allocate safely.

Set the output folder to persistent storage with adequate space. Leave Hub and W&B publishing disabled for this first local run. Select **Create Job** and review the saved job summary before starting it.

## Configure fixed samples

Sampling is the practical record of what the LoRA is learning. Add a concrete prompt such as:

```text
A detailed portrait of [trigger] in natural light
```

Replace `[trigger]` with the exact dataset token. Set sample seed 42, turn **walk seed** off, use 1024 × 1024 output, guidance 4, and 25 sampling steps. Request a sample from step 0 and then every 250 steps, matching checkpoint cadence.

Add a few prompts that hold different things constant: a close portrait, a wider composition, a difficult angle, and a prompt outside the most common training background. Keep this prompt set unchanged during the run. If both prompt and seed change, two sample images cannot isolate checkpoint progress.

The initial step-zero sample is the base-model reference. It is expected not to reproduce the new concept yet. Save it with the later samples instead of discarding it.

## Queue and start the job

On the saved job, use the play control—described here as **Add to queue**—and confirm that the job changes to queued or running status. Start the matching queue if it is stopped. The queue page should show the GPU selection and live status.

Watch the first model load, dataset scan, cache pass, training step, sample, and checkpoint. A successful model load alone is not a complete first-run test. Stop and diagnose the job if paths are wrong, captions are not being found, loss becomes non-finite, samples fail, or disk space is disappearing unexpectedly.

Do not launch several experiments at once for the first run. One job makes GPU use, logs, samples, and failure causes easier to understand. Queue and multi-GPU behavior is covered in the [queue chapter](../workflow/queue-and-multiple-gpus.md).

## Compare samples and checkpoints

At each 250-step boundary, preserve the checkpoint, its sample set, and the step number together. Compare step 0, 250, 500, and later checkpoints with the same prompt and the same seed. Look for four different qualities:

1. resemblance to the intended concept;
2. response to prompt details not fixed by the dataset;
3. variety across poses, views, and backgrounds;
4. artifacts or signs that the training images are being copied too literally.

The lowest loss checkpoint is not necessarily the best checkpoint. Loss measures the training objective on sampled batches; it does not directly rank prompt adherence, flexibility, or visual quality. A visually useful checkpoint may appear before the final step, while later samples may become rigid or exaggerated.

Choose by a repeatable sample comparison, not by one lucky image. When two checkpoints are close, test them with more fixed prompts and seeds. Keep notes about the exact checkpoint rather than renaming files in a way that loses the step number.

## Stop and resume safely

Use the stop control and wait for the job to reach a stopped state before shutting down the host or moving output files. Confirm that the latest LoRA checkpoint opens and that the sample/checkpoint step pair is complete. A partially written or interrupted file should not become the only copy.

Restarting from a LoRA checkpoint and restoring optimizer state are related but different operations. Compatibility depends on the model, network shape, output/name identity, and resume settings. Read [saving, resuming, and optimizer state](../workflow/saving-resuming-and-optimizer-state.md) before changing the job or assuming that training will continue exactly where it stopped.

After the first run, continue to the [training mental model](training-mental-model.md) to understand what rank, learning rate, steps, captions, and noise are doing beneath the form.

<!-- book-verification:start -->
<!-- book-verification:end -->
