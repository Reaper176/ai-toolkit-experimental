# Understand loss and checkpoints

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Loss describes the optimization problem seen by each training batch. Checkpoints and samples describe what the adapter can actually do. Use the graph to decide where to inspect, not to replace controlled evaluation.

## Read raw loss as a noisy measurement

Raw loss is the value reported for an individual batch or logging interval. Consecutive values can differ because the trainer sees different images, captions, resolution buckets, timesteps, noise, masks, controls, and dropout decisions. A harder batch can produce a larger value even when the overall run is improving.

This means normal motion in the graph is not automatically instability. A single downward point may be an easy batch. A single upward point may be a difficult batch. Compare the value with its neighborhood and with recent history before acting.

Raw loss is most useful for immediate failures:

- `NaN`, infinity, or a missing value signals a numerical or logging problem;
- a sudden persistent scale change can coincide with a configuration, data, or resume event;
- repeated extreme spikes can justify checking corrupt examples, masks, captions, precision, or an excessive learning rate;
- a completely absent graph can indicate that the job or UI logger is not reporting what you think it is.

Do not compare the absolute loss of unrelated architectures, objectives, datasets, batch constructions, or software versions as if they shared one quality scale. Even two runs of the same concept can have different raw distributions when the data sampling changes.

## Use smoothed loss to see direction

Smoothed loss averages or filters recent raw values so the broader direction is easier to see. Smoothing changes the display, not the gradients or optimizer. A longer smoothing window suppresses more batch noise but reacts later; a shorter window follows changes sooner but looks rougher.

Use both views together. Raw loss shows spikes and local failures that smoothing can hide. Smoothed loss helps answer whether the recent central tendency is falling, flat, rising, or changing regime.

A downward smoothed trend often shows that the optimizer is reducing its training objective. It does not prove that prompt response, identity, style, preservation, motion, or visual quality is improving. A flattening trend can mean useful convergence, inadequate learning, a capacity limit, or simply that the current objective has reached a steady region. Samples and data context distinguish those cases.

When comparing experiments, keep the smoothing method and window constant. Otherwise a smoother curve can look “better” merely because more variation was hidden.

## Treat valleys and peaks as inspection points

A **valley** is a local low region, not a certificate of a superior checkpoint. It may reflect an easier sequence of batches or timesteps. A **peak** may reflect difficult data, rare conditions, or ordinary stochastic variation rather than damage to the adapter.

It is worthwhile to inspect checkpoints around visible valleys and peaks when the save cadence provides them. Use three neighboring points when possible: before the region, near it, and after it. Generate the same prompt suite with the same fixed seed and inference settings for each checkpoint. The comparison asks whether the loss feature corresponds to a repeatable behavior change.

The lowest loss is not necessarily the best checkpoint. The training objective does not directly score flexibility, prompt adherence, avoidance of memorization, or aesthetic preference. Conversely, a checkpoint near a raw-loss peak is not automatically bad if its controlled samples are stronger and the following loss returns to its prior range.

Do not hunt every tiny valley. Select regions that are large relative to normal raw variation, persistent in the smoothed view, associated with a known event, or close to an evaluation milestone. Record that the region motivated inspection; do not rewrite the conclusion as though loss alone selected the winner.

## Align checkpoint and sample cadence

`save_every` controls regular checkpoint spacing and `sample_every` controls regular sample spacing, both in optimizer steps. Align them during diagnostic and baseline runs so each scheduled sample can be associated with saved weights. `sample_start_step` can provide a step-zero base reference before learning.

Cadence is a tradeoff:

- saving too frequently consumes storage and may interrupt training more often;
- sampling too frequently consumes time and can add a separate peak-memory event;
- saving too sparsely can skip the useful transition between underfit and overfit;
- aggressive retention can delete a checkpoint before its samples are reviewed.

Choose an interval that yields several checkpoints across the expected learning curve. Keep enough retained saves to compare early, middle, and late behavior. Copy a candidate out of a pruned rolling set only after its write has completed.

For a running job, **Save Next Step** and **Sample Next Step** request an additional artifact at the next supported boundary. Use them before a planned stop or when a meaningful graph change begins. They cannot recreate weights from an earlier unsaved valley or peak. Verify the emitted step numbers rather than pairing files by visual proximity in a directory listing.

## Select checkpoints by evidence

Use a checkpoint table rather than one graph cursor:

| Evidence | Question |
|---|---|
| Step and configuration | Which exact training state produced this file? |
| Raw and smoothed loss context | Was the checkpoint in a normal, valley, peak, or transition region? |
| Fixed-seed sample suite | Did concept fidelity improve without losing prompt control? |
| Additional fixed seeds | Is the result repeatable rather than one favorable noise draw? |
| LoRA strength sweep | Is there a practical inference range? |
| Data comparison | Does output generalize or copy training compositions? |

Select the checkpoint that best satisfies the intended use across the suite. The latest checkpoint may win, but it receives no preference merely for being latest. Keep the configuration, sample settings, selected file, and decision note together.

When the graph suggests an interesting unsaved interval, the correct response is usually a follow-up run with closer save/sample cadence around the relevant step range. It is not possible to recover an exact historical optimizer state from a loss point alone.

## Diagnose patterns before changing settings

Use this sequence before adjusting the learning rate or extending training:

1. confirm the job, dataset revision, architecture, and resume state shown by the log;
2. inspect raw examples near unusual spikes for corrupt or mismatched data;
3. compare raw and smoothed views with a consistent window;
4. inspect aligned fixed-seed samples and checkpoints;
5. decide whether the evidence indicates underfitting, overfitting, numerical instability, or ordinary noise;
6. clone the job and change one major variable.

If loss is non-finite, stop and diagnose rather than waiting for a sample. If loss is noisy but finite and samples improve, the run may be healthy. If smoothed loss falls while samples become rigid or copied, training-objective improvement is accompanying visual overfitting. If both loss and samples are unchanged, verify that the intended parameters are trainable and that data/captions are reaching the model before simply adding steps.

See [sampling and evaluation](sampling-and-evaluation.md) for the fixed comparison suite, [training settings](../reference/training.md) for loss and optimizer controls, and [saving settings](../reference/saving-and-sampling.md) for exact cadence and retention fields.

<!-- book-verification:start -->
<!-- book-verification:end -->
