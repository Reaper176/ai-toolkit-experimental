# Edit training jobs in the UI

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](../datasets/rights-privacy-and-safety.md) · [Next →](sampling-and-evaluation.md)
<!-- book-navigation:end -->

The job editor presents one configuration through two views. The Simple editor covers the common training path; the advanced view exposes the serialized YAML structure. Saving, importing, and cloning all affect the same job configuration, so treat a view switch as an editing choice rather than a different trainer.

## Start in the Simple editor

Use the Simple editor for a new LoRA whenever it can represent the required architecture and workflow. It groups settings by purpose, supplies architecture-aware defaults, and hides fields that do not apply to the current selection. This makes dependencies such as video frames, edit controls, and model quantization easier to see.

Work from top to bottom:

1. choose the training job type, architecture, base model, and GPU;
2. give the job a unique name and persistent output location;
3. select datasets and verify caption, mask, control, resolution, and frame settings;
4. configure LoRA rank and training controls;
5. configure checkpoint and fixed-sample cadence;
6. review logging and publishing destinations;
7. select **Create Job** only after every path and sample prompt is correct.

Architecture selection can change form defaults. Make that choice before fine-tuning downstream values, then inspect the entire form again. The [exhaustive settings reference](../reference/job-and-model.md) distinguishes a value authored by the UI from an engine fallback used when a key is absent.

## Know when a job is advanced

Select **Show Advanced** to inspect or edit the serialized configuration. Select **Show Simple** to return when the configuration remains representable by the form. The advanced view is appropriate when a documented setting has no Simple control, when reproducing a reviewed configuration exactly, or when debugging the shape sent to the trainer.

Do not switch merely because the serialized form looks more authoritative. The form and YAML are projections of the same job. The advanced view offers more freedom and therefore less protection from misspelled keys, incompatible combinations, wrong types, and settings that the selected model ignores.

An imported or hand-edited job can contain a structure that the Simple editor cannot safely render. In that case the UI reports an advanced job rather than silently discarding fields. Continue in the advanced view or simplify a clone; do not toggle views and assume every unseen value survived unchanged.

Before hand-editing, look up the exact field in the relevant [reference chapter](../reference/advanced-only-settings.md). Preserve the top-level schema, extension job, process list, `diffusion_trainer` type, and model-specific discriminators. YAML indentation is data structure, not cosmetic spacing.

## Create, save, and update

On a new configuration, **Create Job** persists a job record. It does not prove that the model can load, the dataset is valid, or the GPU can complete a step. Review the saved job, then queue a diagnostic run.

When editing an existing stopped job, **Update Job** saves changes to that source job. Record the old values before updating. Changing model family, network shape, dataset meaning, or output identity can make earlier checkpoints or optimizer state incompatible even if the form accepts the edit.

The editor replaces configured state; it is not a version-control system. Keep important YAML or JSON exports, dataset notes, sample prompts, and experiment results in a separate versioned location. Use a clear job name that identifies the concept and experiment, but do not put secrets or personal paths into a configuration intended for sharing.

Do not edit a running job as a way to steer it mid-step. Stop it cleanly, wait for the status transition, preserve the current checkpoint/sample pair, then edit or clone. Runtime controls such as **Save Next Step** and **Sample Next Step** are described in the sampling and checkpoint chapters.

## Import a configuration

The **Import Config** control is available from the advanced view and accepts `.yaml`, `.yml`, `.json`, and `.jsonc` files. Import parses the selected file, migrates it to the current UI shape, and replaces environment-owned fields such as the training folder and device with local UI values. Review the resulting form; import is not evidence that every value is supported.

Use this import checklist:

- obtain the file from a trusted source and inspect it as text first;
- compare its model architecture and checkpoint with the intended family;
- replace dataset, mask, control, checkpoint, and output paths;
- remove remote publishing destinations and credentials;
- confirm job name, GPU, rank, learning rate, steps, save cadence, and samples;
- switch to **Show Simple** only if the UI can represent the complete job;
- save under a new job name before running an imported experiment.

The validated [example directory](../examples/README.md) provides compact configurations with declared replacement tokens. Those examples are safer starting points than an unexplained file copied from a post, but they still require local paths and a deliberate architecture choice.

## Clone before experimenting

From a training job's action menu, **Clone Job** loads its configuration into a new-job editor and proposes a copied name. A clone is the preferred boundary for comparing rank, learning rate, optimizer, dataset policy, or sampling changes because the source job remains available for reference.

A clone copies configuration, not experimental meaning. Give it a new job name, verify its training output, and make sure it will not overwrite or ambiguously mix files with the source job. Check dataset paths and publishing fields even when they are intentionally shared. Archived or unavailable preset sources may be removed during clone loading, so review the resulting settings instead of assuming byte-for-byte identity.

Change one major variable per clone when possible. Keep fixed prompts, seeds, checkpoint cadence, and evaluation procedure stable. Record the source job and the reason for the change. This turns a collection of jobs into an interpretable experiment rather than a list of unrelated outputs.

## A safe editing routine

For each experiment:

1. preserve the source job's configuration and latest good outputs;
2. clone it and assign a new job name and unambiguous output identity;
3. make one planned change in the simplest view that fully represents it;
4. inspect paths, model family, dataset, samples, saving, and publishing;
5. create the job and run a short load/train/sample/save diagnostic;
6. compare against the source job with the same prompts and seeds;
7. keep, revise, or delete the experiment based on recorded evidence.

Continue with [sampling and evaluation](sampling-and-evaluation.md) before judging the result, and read [saving and optimizer state](saving-resuming-and-optimizer-state.md) before reusing files from the source job in a clone.

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
