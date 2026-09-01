# A mental model of LoRA training

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Training becomes easier to diagnose when the controls are connected to one simple loop: show the base model a captioned example, perturb the example, measure its prediction error, and make a small update to the LoRA. The loop repeats; samples reveal whether those updates produce useful behavior.

## What the LoRA changes

The base model already contains a broad image, video, or audio prior. A LoRA adds small trainable low-rank matrices to selected layers while the original model weights normally remain frozen. During inference, the LoRA's contribution is applied with the base model; the adapter is not a complete replacement checkpoint.

This arrangement has two consequences:

- The base model determines the available architecture, vocabulary, broad capabilities, and many biases. A LoRA can steer those capabilities but cannot freely turn one architecture into another.
- The adapter only has finite capacity. It must encode the recurring relationship among captions and examples without simply memorizing every training item.

What “the concept” means is therefore defined by the dataset. If every image pairs the subject with the same clothing and background, training has little evidence that those details should vary independently. Better settings cannot recover distinctions that the data never demonstrates.

## From caption and image to gradient

For a typical diffusion image step, ai-toolkit loads a target image and its caption, selects a resolution bucket, encodes the data, samples a timestep, and adds the amount of noise associated with that timestep. The model receives the noisy representation plus text conditioning and predicts the training target required by the configured scheduler and loss.

The loss is a numeric measure of prediction error for that batch. Backpropagation converts it into a gradient for each trainable LoRA parameter. The optimizer combines those gradients with its state and learning rate, then applies an update. That completed update is one optimizer step.

Gradient accumulation changes how many microbatches contribute before an optimizer update. With batch size 1 and accumulation 4, four microbatches contribute to one optimizer step; the target `steps` still counts optimizer updates, not individual files. Dataset repeats, buckets, sampling policy, and batch construction determine how often each example is seen. “2,000 steps” alone does not state the number of effective dataset passes.

Captions route learning. A trigger identifies a concept, while varying words help associate visible changes with language. Caption dropout sometimes removes text conditioning, and token shuffling changes order when enabled. These tools can reduce dependence on one caption pattern, but excessive dropout or careless shuffling can erase useful supervision.

Noise and timestep selection decide which denoising situations supply gradients. High-noise regions emphasize broad structure; lower-noise regions can emphasize finer reconstruction behavior, but the exact effect depends on the architecture and objective. Use the architecture's supported scheduler and timestep defaults before experimenting.

## Rank is capacity, not quality

LoRA rank controls the dimensional capacity of each low-rank update. A higher rank can represent more independent changes and also creates more trainable parameters, larger files, greater memory use, and more opportunity to fit dataset accidents. A lower rank is cheaper and can regularize a narrow concept, but may be unable to express a complex style, identity, motion pattern, or edit behavior.

Rank is not a universal quality dial. Rank 64 is not inherently twice as good as rank 32. The useful range depends on the model architecture, targeted layers, dataset diversity, and intended behavior. Start from a validated family recipe, then change rank only when comparisons suggest a capacity problem.

Alpha scales the low-rank contribution relative to rank for common LoRA implementations. Keeping rank and alpha equal is an understandable baseline used by the first-run example. Changing both rank and alpha changes the effective update scale as well as capacity, so it can confound an experiment intended to study rank alone. See the [network settings reference](../reference/network.md) for the exact supported fields and applicability.

## Learning rate and optimizer steps

The learning rate scales each optimizer update. Too high can move the adapter rapidly past useful solutions, amplify batch noise, or create artifacts. Too low can yield almost no visible learning within the available steps. The optimizer and scheduler alter how the nominal rate becomes an actual sequence of updates, so a number copied from another family is not automatically transferable.

Steps control update count. More steps provide more opportunities to learn and more opportunities to overfit. Their meaning changes with dataset size, batch size, accumulation, caption dropout, and sampling. For this reason, learning rate and steps should be evaluated together:

- A short diagnostic run checks that data, memory, loss, saving, and sampling work.
- A baseline run keeps the recipe's learning rate and saves often enough to expose the learning curve.
- A follow-up changes one major variable while keeping prompts, seeds, dataset, and checkpoint cadence fixed.

Do not pick a duration solely from the final loss. Compare checkpoints at a useful cadence. If improvement occurs early and later checkpoints become rigid, extending the run was not beneficial. If every checkpoint remains weak and flexible, the next experiment might need more steps, a different learning rate, greater rank, or better data; samples and dataset inspection help separate those causes.

The [training settings reference](../reference/training.md) distinguishes UI-created values from engine fallbacks and documents the exact step, rate, accumulation, loss, and scheduler controls.

## Underfitting, useful fit, and overfitting

**Underfitting** means the adapter has not captured the intended relationship strongly enough. Fixed prompts may show little resemblance or behavior change, the trigger may be ignored, and multiple checkpoints may remain close to the base-model sample. Causes include insufficient or inconsistent data, inadequate capacity, too few effective updates, or a learning rate that is too small.

A **useful fit** expresses the concept while retaining control from the prompt and diversity from the base model. The trigger works across views or contexts not copied directly from training images. Difficult fixed-seed samples improve along with easy ones, and the LoRA remains usable over a reasonable inference-strength range.

**Overfitting** appears when the adapter becomes too tied to the training set or pushes the concept too aggressively. Warning signs include repeated training compositions, loss of prompt responsiveness, baked-in backgrounds or clothing, worsening anatomy or texture, and acceptable results only at very low LoRA strength. More training is not the automatic remedy.

These states do not have a single loss threshold. Raw loss is noisy because batches, captions, resolutions, timesteps, and noise differ. A smoothed trend can reveal optimization direction, but fixed-seed samples and diverse evaluation prompts show what users will actually receive. A valley in the loss graph is a reason to inspect the corresponding checkpoint, not proof that it is best.

When diagnosing, change one axis at a time and keep an experiment log. Start with data and captions, then consider learning rate and duration, then capacity. The [loss and checkpoint chapter](../workflow/loss-and-checkpoints.md) develops the evaluation process, and [dataset curation](../datasets/curation.md) explains how the evidence presented to the model shapes every setting decision.

<!-- book-verification:start -->
<!-- book-verification:end -->
