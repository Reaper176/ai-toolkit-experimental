# Save and resume training safely

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](queue-and-multiple-gpus.md) · [Next →](../recipes/character-identity.md)
<!-- book-navigation:end -->

A resumable run has several related artifacts, not one magic file. Safe recovery requires a compatible LoRA checkpoint, an intentional step, the correct job/output identity, and—when available—a compatible optimizer state. Preserve and verify each role separately.

## Separate LoRA checkpoints from optimizer state

A LoRA checkpoint contains the learned adapter weights and associated metadata or configuration, depending on save format. It is the artifact loaded for inference and the weight starting point for continued LoRA training.

`optimizer.pt` is different. It stores optimizer state such as parameter-group state and accumulated moments. It does not contain LoRA weights. It cannot replace the adapter checkpoint, and an adapter checkpoint can be valid even when optimizer restoration is unavailable.

The UI trainer writes `optimizer.pt` at the resolved job save root:

```text
training_folder / name / optimizer.pt
```

Here `training_folder / name` describes the runtime path derived from the process training folder and configured job identity; it is not literal configuration syntax. The optimizer filename is reused, so a later save replaces the state for an earlier save. Do not assume one optimizer file is historically paired with every retained checkpoint.

Samples, loss logs, generated metadata, and the saved job configuration are additional evidence. Keep them with the selected checkpoint, but do not describe them as adapter weights or optimizer state.

## Save and prune without losing the recovery point

Regular `save_every` checkpoints expose the learning curve and create recovery points. `max_step_saves_to_keep` prunes older step saves by format after a successful save cycle. The effective retention can have model-specific behavior, so observe the actual output directory during a short run.

Set retention high enough to keep early, middle, and recent candidates until evaluation. Before an important candidate would leave the rolling window:

1. wait for its write and any companion metadata to complete;
2. load or inspect it with a non-destructive check;
3. copy the complete checkpoint and configuration to a versioned archive;
4. preserve its fixed-seed samples and evaluation note;
5. record whether the current `optimizer.pt` was written at the same save event.

Copying a checkpoint does not copy optimizer state automatically. Conversely, copying only `optimizer.pt` creates no usable LoRA. If exact optimizer continuation matters, archive the compatible adapter and optimizer state together immediately; the live optimizer filename will be overwritten by later saves.

Do not prune the only verified recovery point while a job is running. Storage cleanup is safest after a clean stop, when partial writes can be distinguished from complete files.

## Select the newest complete compatible checkpoint

Within a job save root, ai-toolkit searches names matching the job identity and supported checkpoint formats, filters known auxiliary suffixes, and chooses the newest matching path by filesystem creation time. Only when no matching local save is found can a configured pretrained LoRA path serve as the fallback for the network.

“Newest” therefore means the implementation's creation-time selection, not necessarily the largest step number in a filename. Copying an older checkpoint into the live save root can change its filesystem time and make it the apparent newest candidate. Mixed experiments sharing a job name and output root make discovery ambiguous.

Before resuming, inventory every matching file or directory and verify:

- the job name and output root are the intended ones;
- the candidate is complete, readable, and not a temporary or partial write;
- its architecture, base checkpoint, network type, rank, and targeted layers match;
- its metadata step agrees with the recorded sample/checkpoint milestone;
- no copied or unrelated artifact can win newest-path discovery unexpectedly.

Move rejected, partial, or corrupt candidates out of the matching save root rather than renaming them to another still-matching pattern. Keep one unambiguous recovery candidate and a separate backup.

## Wire an explicit resume

The validated [`resume-from-checkpoint.yaml`](../examples/resume-from-checkpoint.yaml) demonstrates the explicit fields:

```yaml
network:
  pretrained_lora_path: /path/to/checkpoint.safetensors
train:
  start_step: 250
  steps: 3000
```

`network.pretrained_lora_path` supplies an existing adapter weight path when no matching local save is selected. `train.start_step` sets the optimizer-step counter from which the loop continues; `train.steps` remains the total target step, not “3,000 additional steps.” A start of 250 with a target of 3,000 continues toward 3,000.

Keep architecture, base model, LoRA type, rank, alpha, target modules, and other shape-defining network fields compatible with the checkpoint. The example keeps the same `${JOB_NAME}` and `${OUTPUT_DIR}` identity so the expected optimizer path remains `${OUTPUT_DIR}/training-book-example/optimizer.pt`.

Do not point `network.pretrained_lora_path` at `optimizer.pt`. Do not set `train.start_step` merely because a filename contains a number; confirm the checkpoint metadata or experiment record. Loading pretrained adapter weights and restoring the historical training step are distinct actions.

If the live save root already contains a matching local checkpoint, newest local discovery can take precedence over the explicit pretrained path. Use a clean, intentional output root or verify every matching local artifact before launch.

## Restore compatible optimizer state without changing LR

After constructing the optimizer from the current configuration, the trainer looks for exactly `optimizer.pt` at `training_folder / name`. It captures the newly configured parameter-group learning rates, attempts a weights-only state load, and then writes the captured values back to each group's `lr` and `initial_lr`.

The configured learning rate therefore remains authoritative over a learning rate serialized in compatible optimizer state. This makes an intentional LR change possible without accepting the old serialized LR. It does not make every other optimizer or network change compatible.

Optimizer restoration requires parameter groups and stored tensors that the newly constructed optimizer can accept. The trainer skips loading when network weight setup reports a shape-changing condition, and a load exception is reported. Always inspect the log for the “Loading optimizer state,” failure, and LR-update messages; the presence of the file alone does not prove restoration.

Because the live optimizer file represents the latest write, combining it with an older retained adapter can produce a historically mismatched pair even if loading succeeds. For exact continuation, use the pair archived at the same milestone. Without a verified compatible optimizer file, continue from adapter weights with fresh optimizer state and record that the trajectory is not an exact continuation.

## Decide which changes are compatible

Use these categories as a conservative review, not an automatic guarantee:

| Change | Resume guidance |
|---|---|
| Sample prompts, seed suite, or sample cadence | Normally does not change trainable weight or optimizer shape; preserve evaluation comparability |
| Save cadence, retention, or local logging | Normally operationally compatible; verify output ownership and storage |
| Total target steps | Can be increased when `start_step` remains below the new target |
| Configured learning rate | Deliberate change is applied after compatible optimizer load; record it as a new training phase |
| Dataset membership, captions, masks, or controls | Technically may run, but changes the objective; clone and document the boundary |
| Optimizer or scheduler family/parameters | Treat old state as incompatible unless the implementation explicitly supports the transition |
| LoRA rank, target modules, network type, or parameter layout | Incompatible with prior weight/optimizer shapes unless a documented conversion exists |
| Architecture, base checkpoint, VAE, or text-encoder family | Treat as incompatible |
| Job name or training folder | Changes automatic local checkpoint/optimizer discovery; do not change accidentally |

When uncertainty remains, clone the configuration, use a new output identity, load only the verified adapter when supported, omit questionable optimizer state, and run a short diagnostic. Never “test” compatibility against the only copy of a good recovery point.

## Recover from interruption or corruption

After an interruption, stop automatic restart long enough to inspect state:

1. confirm that no old training process is still alive;
2. copy the log, database state, configuration, and output listing;
3. identify the latest complete checkpoint rather than the latest filename alone;
4. quarantine a zero-length, truncated, partial, or corrupt checkpoint;
5. validate the preceding checkpoint and its metadata;
6. inspect `optimizer.pt` separately and decide whether it belongs to that checkpoint;
7. restore the original job/output identity or configure an explicit clean resume;
8. start a short run and verify weight load, step, optimizer message, configured LR, one train step, sample, and save.

If optimizer loading fails, do not repeatedly overwrite the evidence. Move the corrupt optimizer file aside, preserve it for diagnosis, and decide whether fresh optimizer state is acceptable. If the adapter checkpoint fails to load, fall back to the newest earlier verified checkpoint; optimizer state alone cannot recover it.

A resumed counter is not proof that the numerical trajectory was restored. Record whether the run loaded adapter weights, step metadata or explicit `train.start_step`, and compatible optimizer state. Task-level GPU verification later in this book is the place to prove observed continued progress; the validated example itself makes no claim that a real optimizer was restored.

See [loss and checkpoints](loss-and-checkpoints.md) for selecting the recovery point and the [saving settings reference](../reference/saving-and-sampling.md) for exact cadence, format, and retention controls.

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
