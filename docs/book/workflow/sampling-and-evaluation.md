# Sample and evaluate a training run

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Training samples are an experiment instrument. They are useful only when the comparison controls are stable enough to attribute a visual change to the checkpoint rather than to a new seed, prompt, sampler, or image size.

## Build an evaluation suite before training

Write the evaluation prompts before the first optimizer update. That prevents later samples from being designed around whichever checkpoint already looks promising. Include the trigger exactly as it appears in captions and define what each prompt is meant to test.

A compact image-LoRA suite can include:

| Prompt role | What it tests |
|---|---|
| Base reference | The concept in a common, well-represented setting |
| Identity or style stress | A view, medium, or composition that is difficult but legitimate |
| Prompt responsiveness | Clothing, action, color, environment, or camera language that should remain controllable |
| Generalization | A setting not duplicated from the training images |
| Conflict check | A prompt detail that differs from a frequent dataset correlation |

For edit training, keep source/control images fixed alongside the prompts. For video, also keep frame count and FPS fixed. For audio, keep duration and structured prompt fields fixed. Store the suite with the job notes so a clone uses the same evaluation evidence.

Generate a step-zero sample when supported. This base-model result shows what the prompt and seed produced before LoRA learning. Without that baseline, a capability already present in the model can be mistaken for a training improvement.

## Hold seeds and inference settings fixed

Use the same seed for the same prompt at every checkpoint and turn **Walk Seed** off. In configuration terms, set `walk_seed: false`. The first-run example uses seed 42, but any recorded fixed seed works.

Hold these settings constant as well:

- prompt and negative prompt text;
- sampler and sampling-step count;
- guidance scale;
- width, height, frame count, and FPS;
- control images and their ordering;
- LoRA inference strength and any other adapters;
- base checkpoint, VAE, text encoders, and inference software version.

The same prompt with a different seed is a diversity test, not a direct checkpoint comparison. The same seed with a rewritten prompt is a prompt test, not a direct checkpoint comparison. Both are useful after the controlled sequence has been preserved.

One seed can be unusually favorable or unfavorable. Use several fixed seeds when a decision is close, but keep each prompt/seed pair stable across all candidate checkpoints. Label output files with job identity, optimizer step, prompt identifier, and seed.

## Use diverse prompts on purpose

Prompt diversity should probe the intended operating range rather than produce a gallery of similar successes. Change one semantic axis across prompts: view, pose, lighting, background, medium, composition, motion, or edit instruction. Include both easy and difficult cases.

For a character or object, test whether identity persists while clothing, setting, and viewpoint obey the prompt. For a style, test several subjects and compositions so content memorization is not mistaken for style learning. For an edit model, test preservation as well as the requested change. For motion, inspect temporal coherence rather than judging a single frame.

Keep evaluation prompts separate from training captions. Copying a full caption and composition can reward memorization. A useful LoRA should transfer the learned relationship to prompts that are not replicas of individual examples.

Do not continuously rewrite the core suite during one run. Add exploratory prompts in a separate group. The original group remains the comparison baseline; the exploratory group helps discover a new failure mode for the next experiment.

## Sample on a cadence and on demand

`sample_every` sets the regular optimizer-step interval and `sample_start_step` controls the first scheduled point. A cadence aligned with checkpoint saving makes it easier to pair an image with the exact weights that produced it. The first-run baseline samples and saves every 250 steps, including a sample from step 0.

Sampling consumes time and memory. An interval that is too short can dominate a diagnostic run, especially for large images, video, or audio. An interval that is too long can skip the useful part of the learning curve. Choose a coarse interval for a long run only after a shorter diagnostic shows where change occurs.

For a running job, **Sample Next Step** requests an extra sample at the next supported training boundary. **Save Next Step** requests an extra checkpoint. These controls are useful before a planned stop, after an interesting loss change, or when regular cadence is too sparse. They do not retroactively capture a completed step, and clicking a control is not proof that the artifact finished writing. Wait for the log and output file.

When requesting both, verify the recorded step for each artifact. Preserve the checkpoint, sample directory, and relevant log together rather than assuming that adjacent timestamps guarantee identity.

## Compare checkpoints systematically

Build a grid with prompts as rows and checkpoints as columns. Include step zero, early learning, at least one middle checkpoint, and the latest candidate. Inspect the grid at a consistent display size before zooming into artifacts.

Score each candidate against explicit criteria:

1. concept fidelity or requested edit behavior;
2. prompt responsiveness;
3. diversity and generalization;
4. preservation of unrelated content;
5. anatomy, texture, temporal, or audio artifacts;
6. usable range of LoRA strength.

Do not promote a checkpoint because one cell is exceptional. Look for improvement across the suite and for regressions hidden by the easiest prompt. The latest checkpoint is not automatically best, and the lowest loss is not necessarily the best visual checkpoint.

If two checkpoints differ only subtly, repeat the same prompts with additional fixed seeds. If results reverse randomly, the evidence is weak. If one candidate consistently preserves identity and prompt control across seeds, the decision is stronger.

## Record a decision, not just images

For every retained checkpoint, record:

- job and checkpoint step;
- dataset revision and base-model identifier;
- fixed prompt/seed suite and inference settings;
- observed strengths, failures, and preferred LoRA-strength range;
- whether the result is keep, reject, or investigate;
- the next experiment and the single major variable it changes.

An image folder without this context is difficult to interpret later. Keep the configuration and evaluation notes beside the selected checkpoint, and retain enough losing evidence to explain why it was rejected.

Continue with [loss and checkpoints](loss-and-checkpoints.md) to connect this visual process to raw and smoothed loss, checkpoint cadence, and valleys versus peaks. The [sampling settings reference](../reference/saving-and-sampling.md) documents exact field types and defaults.

<!-- book-verification:start -->
<!-- book-verification:end -->
