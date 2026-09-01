# Advanced LoRA layer targeting

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Layer targeting decides where adapter parameters are attached. It is an advanced experiment axis: a syntactically valid filter can leave too little capacity, adapt an unintended component, or make a checkpoint architecture-specific in ways its filename does not reveal.

## Start from architecture-owned targets

Each supported model implementation identifies its normal adapter boundary through architecture code such as `target_lora_modules`. That boundary reflects the model's transformer classes and any family-specific exclusions. Begin with the selected architecture's defaults and a validated recipe; do not guess module class names from another family.

`network.type` also changes the active implementation. `lora`, `lorm`, `lokr`, `dora`, and `fullrank` use the LoRA-family dispatch, while `locon` and `lycoris` use the LyCORIS dispatch. An advanced `network_kwargs` key supported by one dispatch may be ignored or invalid in another. The [network reference](../reference/network.md) records applicability for each field.

Treat a base-model revision change like a targeting change. Module names and shapes can move even when the public architecture label looks familiar. Never assume that a target list copied from a different checkpoint attaches the same number of adapters.

## Understand rank and alpha

`network.linear` is the low-rank dimension for eligible linear modules. Higher rank adds representational capacity, trainable parameters, memory use, compute, and checkpoint size. It does not guarantee better learning: data coverage, captions, learning rate, duration, and the target set may be the real constraint.

On non-PEFT adapter paths, `network.linear_alpha` can control update scaling separately from rank: the module runtime scale is based on `alpha / rank`. Explicit null or zero alpha is normalized to the effective module rank, producing a scale of one; omission first inherits `network.alpha`.

Transformer-family LoRA networks normally force `peft_format` unless the legacy LoKr format is active. PEFT format forces alpha to rank, so a configured `linear_alpha` does not independently change scaling on that resolved path. Record the requested rank/alpha and verify the resolved format and creation log; otherwise an apparent alpha experiment may have been normalized to scale one.

For an interpretable first rank comparison, hold the dataset, seed, learning rate, optimizer, steps, and targets constant. Change one variable at a time within the chosen resolved path. On a resolved non-PEFT path, keep alpha equal to rank when isolating capacity; rank 16/alpha 16 versus rank 64/alpha 16 changes both capacity and scale. On a transformer PEFT path that forces alpha to rank, compare ranks as capacity changes and do not claim an independent alpha result.

Legacy `network.rank` can take precedence over `network.linear` when non-null. Prefer `linear` in new configurations and remove ambiguous duplicate spelling after checking the [network reference](../reference/network.md).

## Filter module names safely

For the LoRA-family dispatch, `network.network_kwargs.ignore_if_contains` skips candidate modules whose names contain any listed substring. `only_if_contains` keeps candidates only when a module name contains a listed substring.

```yaml
network:
  type: lora
  linear: 32
  linear_alpha: 32
  network_kwargs:
    ignore_if_contains:
      - unwanted_submodule
```

These are substring filters, not regular expressions and not semantic layer categories. A short token may match many unrelated paths. Broad filters can silently exclude most trainable layers; an overly narrow allow-list can leave few or no trainable modules.

Architecture selection may populate exclusions for known model components. Preserve those architecture-owned values unless source inspection and a controlled experiment justify changing them. Do not clear an unfamiliar exclusion merely to increase the adapter count.

Before a long run, capture the resolved architecture, network type, filters, and adapter-creation log. Compare the count and representative names against the unfiltered baseline. A job reaching its first optimizer step does not prove that the intended layers were selected.

## Choose linear and convolution capacity

`network.linear` and `network.linear_alpha` govern eligible linear and 1×1-convolution adapter paths. `network.conv` and `network.conv_alpha` govern supported 3×3 convolution adaptation. Convolution support depends on network type and architecture; some model selectors hide `conv` because it is not an appropriate Simple-UI control.

Do not enable convolution capacity by habit. It increases parameters and can emphasize local features or textures, but may add no useful target for a transformer-only family. When convolution adaptation is enabled, validate both the rank and alpha semantics for the selected implementation. In particular, null handling differs between LoRA-family and LyCORIS construction paths.

`network.transformer_only` defaults to true and restricts attachment to transformer-side modules where supported. Architecture overrides can change it. Text-encoder training is a separate decision controlled by the training/model path; a layer-name filter is not a safe substitute for understanding which component is trainable.

## Use per-block capacity only with a map

LoRA-family advanced fields such as `block_dims` and `block_alphas` assign ranks and alpha values by block. Their relationship is positional: each alpha corresponds to the dimension at the same location. `conv_block_dims` and `conv_block_alphas` provide the analogous 3×3-convolution mapping.

Only use these lists with a verified block order for the exact architecture and implementation. A list copied from a model with a different number or order of blocks can fail construction or allocate capacity to the wrong region. Keep the source model revision and the map-generation method with the configuration.

Per-block tuning is justified when an ordinary uniform-rank run supplies evidence that particular depth regions need more or less capacity. It is not a default optimization. First establish a uniform baseline whose samples, logs, and checkpoint size are understood.

## Verify the resulting network

Use a short [diagnostic run](../recipes/diagnostic-run.md) for every targeting change:

1. clone a known-good configuration;
2. change only one targeting or capacity axis;
3. preserve the architecture, base revision, data, optimizer, learning rate, and schedule;
4. inspect adapter-creation output for module count, representative names, rank, and alpha;
5. complete a backward step, save, reload, and sample;
6. compare against the baseline with the same prompts and fixed seed;
7. record throughput, peak memory, checkpoint size, and visual behavior.

Test the saved artifact in the intended inference host. A training-time module name can serialize into a format that another loader interprets differently, especially across model revisions or network types.

## Common failure modes

**No or almost no trainable adapters:** inspect `only_if_contains`, architecture target classes, and network type. Remove the custom filter in a clone and compare the creation log.

**Unexpectedly large checkpoint or out-of-memory error:** verify rank, convolution rank, block maps, and the number of attached modules. Higher rank multiplies capacity across every matched target.

**Weak learning after a targeting change:** confirm that useful blocks were not excluded before raising learning rate or duration. Restore the baseline target set as a one-variable experiment.

**Artifacts after adding convolution targets:** compare the same checkpoint cadence and fixed seed against linear-only training. Disable convolution capacity if the architecture does not expose a supported benefit.

**Checkpoint will not load elsewhere:** confirm base architecture, revision, network type, stage identity for multistage models, target names, and save format. Do not rename the file as a substitute for compatibility.

**Two rank tests are incomparable:** check alpha, target filters, block maps, training steps, and inference strength. Rank alone does not describe effective scale or attachment scope.

## Further reading

- [Network settings reference](../reference/network.md)
- [A mental model of LoRA training](../getting-started/training-mental-model.md)
- [Character identity recipe](../recipes/character-identity.md)
- [Style recipe](../recipes/style.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)
- [Saving and optimizer state](../workflow/saving-resuming-and-optimizer-state.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
