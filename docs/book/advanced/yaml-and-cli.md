# Advanced YAML and command-line training

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](../reference/advanced-only-settings.md) · [Next →](layer-targeting.md)
<!-- book-navigation:end -->

The Advanced editor and `run.py` expose the same training configuration with fewer guardrails than the Simple editor. Use them when a documented field is unavailable in the form, when a reviewed configuration must be reproduced exactly, or when several independent jobs need to run sequentially.

This chapter explains structure, value presence, file loading, and the four training entry-point arguments. It does not turn every Python constructor argument or third-party optimizer option into a supported user setting; use the generated reference to identify the owned configuration boundary.

## Understand configuration ownership

A training file has a top-level `job` discriminator and a `config` mapping. A normal extension training job contains one or more entries in `config.process`, and each process has its own discriminator such as `type: diffusion_trainer`. Dataset rows are another repeated list beneath a process.

```yaml
job: extension
config:
  name: my-job
  process:
    - type: diffusion_trainer
      training_folder: output
      device: cuda:0
      network:
        type: lora
        linear: 16
        linear_alpha: 16
      train:
        steps: 250
        lr: 0.0001
```

Indentation determines ownership. Moving `lr` beside `train`, or `linear` beside `network`, does not create an equivalent spelling. Look up the canonical path and applicability in the [job and model reference](../reference/job-and-model.md), then follow its links to the network, training, dataset, saving, sampling, and advanced-only sections.

The Advanced editor serializes a job that the UI owns. The command line loads a file directly. Neither route makes an unknown key valid, and the CLI does not override arbitrary YAML settings. If a field has no supported CLI argument, change it in a reviewed configuration or in the appropriate Simple control.

Use `.yaml` or `.yml` for YAML and `.json` or `.jsonc` for the corresponding JSON loader path. An accepted extension is not a schema guarantee: the parsed document must still have the required job structure, supported discriminators, types, paths, and architecture-specific combinations.

## Preserve YAML types and presence

Configuration behavior depends on both value and presence. These states are not interchangeable:

| YAML state | Meaning to verify |
|---|---|
| key absent | The UI, engine, or selected architecture may supply an engine fallback. |
| `key: null` | The key is present with a null value; each setting separately accepts, normalizes, or rejects it. |
| `key: false` | Boolean false is an explicit value, not omission. |
| `key: 0` | Numeric zero is an explicit value and may be valid or outside the supported range. |
| `key: ""` | An empty string is present and can differ from both null and an absent path. |

Do not add `null` merely to make a field visible, and do not remove a falsey value assuming that the fallback is the same. The exhaustive reference records parser type, supported type, null behavior, defaults, normalizations, and applicability. A common engine read such as `mapping.get("key", default)` uses the default only when the key is absent; a present null reaches later logic as a value unless that logic normalizes it.

Keep numbers, booleans, strings, and lists typed as documented. Quoting `0.0001` turns it into a string. Writing `"false"` does not produce the Boolean `false`. YAML indentation and list dashes are structural data, so review the parsed shape rather than trusting visual alignment alone.

The Simple and Advanced views are projections of one saved configuration, but architecture selection can add, remove, or reset UI-owned values. Export or copy the configuration before changing a discriminator. See [Simple and Advanced job editing](../workflow/simple-ui.md) for the safe UI workflow.

## Run one or more config files

<a id="cli-config-file-list"></a>

From the repository environment, pass one or more positional configuration names or paths:

```bash
python run.py config/my-job.yaml
```

The loader recognizes `.yaml`, `.yml`, `.json`, and `.jsonc`. A bare name can resolve beneath the repository `config` directory using a recognized extension; an explicit existing path can be used directly. Prefer an explicit reviewed path in run records so another person can identify the same input.

Multiple positional files run sequentially in command-line order:

```bash
python run.py config/first.yaml config/second.yaml
```

This is a sequence, not concurrent multi-GPU scheduling. Each file creates a separate job lifecycle. Without recovery mode, a failure stops the loop; with recovery mode, later files can be attempted. Review every job's output and logs even if the overall shell command reaches the end.

## Understand CLI precedence

The training entry point has four owned arguments. Their scope is narrow:

<a id="cli-recover"></a>

### `--recover` / `-r`

This flag defaults to `false`. When present, it lets the sequential file loop continue to later configurations after one job raises an error. It does not repair, retry, resume, or mark the failed job successful. Partial failure still requires log and output inspection.

```bash
python run.py config/first.yaml config/second.yaml --recover
```

<a id="cli-name"></a>

### `--name NAME` / `-n NAME`

`--name` supplies the value used for `[name]` substitution during configuration preprocessing. When the option is absent, `config.name` supplies that substitution value and is required. Therefore the CLI value has precedence as the token source.

```yaml
job: extension
config:
  name: "[name]"
  process:
    - type: diffusion_trainer
      training_folder: "output/[name]"
```

```bash
python run.py config/template.yaml --name character-v2
```

The implementation performs a global textual replacement of every literal `[name]` occurrence after parsing and serializing the configuration, including occurrences in keys or values. Inspect a template before using the option. This is not a general `--set` facility: a literal field that contains no `[name]` token is not an arbitrary YAML override.

<a id="cli-log"></a>

### `--log PATH` / `-l PATH`

`--log` selects a file for command-line output. Omission leaves that file-logging path disabled. Choose a writable destination on persistent storage and keep it with the exact configuration, samples, and checkpoints.

```bash
python run.py config/my-job.yaml --log output/logs/my-job.log
```

The positional file list selects jobs, `--recover` changes batch failure handling, `--name` supplies token substitution, and `--log` selects logging. None of them changes rank, learning rate, steps, dataset paths, model architecture, optimizer, or sampling fields unless a documented `[name]` token is present where substitution applies.

## Use templates and environment substitution

Before YAML or JSON parsing, `${VARIABLE}` placeholders are replaced with process-environment values. A missing environment variable raises an error instead of silently becoming an empty string. For example:

```yaml
datasets:
  - folder_path: "${DATASET_DIR}"
```

Set the variable in the launching environment, then keep secrets out of committed configuration files:

```bash
DATASET_DIR=/datasets/character python run.py config/my-job.yaml
```

Environment substitution and `[name]` substitution occur at different stages. Environment placeholders are expanded in raw file text before parsing; `[name]` is replaced during configuration preprocessing after parsing. Do not nest one placeholder inside the other or rely on undocumented expansion order.

The validated [example configurations](../examples/README.md) use declared typed replacement tokens for documentation validation. Those book tokens are an example-distribution contract, not additional `run.py` syntax. Replace every documented token as directed before training.

## Validate before a long run

Use this review sequence for a hand-edited file:

1. Start from a validated example or a configuration exported from the current UI.
2. Confirm `job`, `config`, `config.name`, process type, model architecture, and base path.
3. Check every edited key in the generated reference, including type, null behavior, applicability, fallback, and interactions.
4. Search for unresolved `${...}` and `[name]` tokens, then inspect all paths and publishing destinations.
5. Compare the Advanced and Simple views only when the UI says the job is representable; do not allow a view switch to discard advanced fields.
6. Run one short diagnostic that loads the largest bucket, trains, samples, and saves.
7. Preserve the exact input file and log before increasing steps or batching several configs.

Use `--recover` only when later jobs are genuinely independent and partial completion is acceptable. For experiments that share a GPU, output directory, dataset cache, or mutable files, resolve the failure first rather than continuing into an ambiguous state.

The [advanced-only settings reference](../reference/advanced-only-settings.md) is exhaustive, not a suggestion to enable every option. Add a field only when its documented benefit addresses an observed bottleneck or experiment question.

## Further reading

- [Simple and Advanced job editing](../workflow/simple-ui.md)
- [Validated examples](../examples/README.md)
- [Job and model reference](../reference/job-and-model.md)
- [Training reference](../reference/training.md)
- [Advanced-only settings reference](../reference/advanced-only-settings.md)
- [Queue and multiple GPUs](../workflow/queue-and-multiple-gpus.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Saving, resuming, and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
