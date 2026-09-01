# Extending and debugging ai-toolkit training

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Debugging should reduce uncertainty, not create a second uncontrolled experiment. Preserve the failing inputs, identify the earliest causal boundary, and enable heavier diagnostics only when ordinary logs do not answer the question.

## Keep user settings and developer APIs separate

The book's user-setting contract covers discovered YAML, CLI, environment, UI, optimizer-dispatch, and first-party model-specific fields owned by the catalog. Internal model methods, trainer hooks, Python constructor parameters, and arbitrary third-party optimizer signatures are outside the user-setting contract.

That boundary matters even when Python accepts `**kwargs`. A key is not supported merely because it reaches a constructor without an immediate error. Use the generated references for user configuration and the source/tests for developer integration APIs.

Extensions change executable Python behavior and require code review, dependency review, and tests. Advanced YAML changes data supplied to existing behavior. Do not use an undocumented YAML key as a substitute for implementing and verifying an extension.

## Reproduce before instrumenting

Create a minimal reproduction from a clone of the failing job:

1. preserve the exact configuration, log, software and git revision, environment, and failing output;
2. reduce the run to a diagnostic duration without changing the suspected setting;
3. keep the smallest dataset subset that still reproduces the failure, including the offending item when known;
4. disable unrelated publishing and concurrent jobs;
5. run from a fresh process and record the first failing phase.

Do not delete caches until you have recorded their paths and provenance if cache behavior is under investigation. Do not upgrade dependencies, switch models, lower resolution, and alter precision simultaneously; any of those may hide rather than explain the defect.

The [diagnostic-run recipe](../recipes/diagnostic-run.md) provides a bounded load/cache/train/sample/save sequence.

## Read the first causal error

Start at the first causal exception in the traceback, not the last cleanup warning. Later errors may result from a job object that never finished initializing, a distributed worker reacting to another worker, or cleanup attempting to release a missing resource.

Classify the earliest evidence:

- parser/schema errors point to file shape, types, missing keys, or unsupported presence;
- file-not-found and permission errors point to path resolution, mounts, credentials, or storage;
- dataset errors point to a specific media/caption/control item or preprocessing rule;
- shape, dtype, and missing-module errors point to architecture/checkpoint/component compatibility;
- non-finite gradients point to data, precision, loss, optimizer, or numerical behavior;
- out-of-memory errors must be tied to the exact load, cache, train, sample, or save phase.

Preserve several lines above and below the first causal frame. Searching only the final exception text can conflate unrelated failures.

## Increase observability carefully

Use cataloged logging first. `process.performance_log_every` records periodic timing when set above zero; frequent logging adds noise and measurement overhead. The `logging` settings control UI or external experiment reporting and should never contain credentials in a shared file.

For invalid-gradient diagnosis, run the minimal reproduction with:

```bash
DEBUG_TOOLKIT=1 python run.py config/diagnostic.yaml --log output/diagnostic.log
```

Only the exact string `1` enables Torch autograd anomaly detection. Anomaly detection can add stack information for invalid backward operations, but it substantially slows training and should be disabled for ordinary benchmarking or long runs.

Increase verbosity or add temporary instrumentation at the narrowest suspected boundary. Avoid printing full embeddings, model weights, tokens, credentials, or private dataset content. Remove temporary probes after a regression test captures the defect.

## Isolate configuration, data, model, and resource failures

Use one-variable substitutions to locate ownership:

- validate the same configuration without starting a model when a parser or catalog rule fails;
- test the suspect media/caption pair through preprocessing when a dataset item fails;
- use the selected model's documented default path when a derivative checkpoint fails;
- turn off only the suspected cache and rebuild when stale artifacts are plausible;
- reproduce sampling separately when training succeeds but evaluation fails;
- reduce only the largest memory dimension when proving an allocation boundary.

A workaround is evidence, not yet a cause. If removing quantization makes a job run, the cause could be an unsupported module, backend version, device path, save path, or interaction with compilation. Record both configurations and narrow further.

Follow the symptom-to-evidence workflow in the [diagnosis guide](../troubleshooting/diagnosis-guide.md) instead of applying a list of unrelated settings.

## Extend toolkit code safely

Local extension packages are discovered beneath `extensions` and `extensions_built_in`. An extension subclasses `Extension`, declares a unique UID in `uid` plus a human-readable name, and returns its process class from `get_process`. The package exposes registered classes through `AI_TOOLKIT_EXTENSIONS`.

Keep the process import inside `get_process` as a lazy import so unrelated startup does not import heavy model code or optional dependencies. A minimal registration shape is:

```python
from toolkit.extension import Extension

class MyTrainer(Extension):
    uid = "my_trainer"
    name = "My Trainer"

    @classmethod
    def get_process(cls):
        from .process import MyTrainerProcess
        return MyTrainerProcess

AI_TOOLKIT_EXTENSIONS = [MyTrainer]
```

This is a developer API example, not a new supported training setting. Add tests for registration, duplicate identity, configuration reads, failure cleanup, and the smallest CPU-safe behavior before exposing a process to users. New user-configurable reads must also be added to the catalog/source ownership boundary and documented with defaults, constraints, applicability, and interactions.

Avoid importing model modules merely to validate configuration; imports can initialize optional libraries or device-dependent code. Keep validation pure where possible and defer heavyweight construction until the process actually runs.

## Keep optimizer constructor surfaces bounded

`train.optimizer_params` forwards parameters to the selected optimizer dispatch. The catalog documents known first-party combinations and interactions, but an arbitrary third-party optimizer constructor is not a finite promise made by this book.

Do not copy every keyword from an upstream library signature into YAML. Confirm the exact dispatched optimizer, installed version, injected arguments, supported catalog entries, and whether the optimizer changes accumulation or clipping behavior. Unknown parameters and duplicate values injected by the dispatcher can raise constructor errors.

When adding an optimizer in code, define an explicit dispatch target and a closed, tested parameter boundary. Test missing optional dependencies, defaults, duplicate arguments, accumulation, gradient clipping, state save/resume, and error messages. Then extend source discovery and the [optimizer reference](../reference/optimizers-and-schedulers.md); do not document an unverified upstream signature as toolkit support.

## Write a useful bug report

Include:

- toolkit branch, exact git revision, operating system, Python, accelerator, driver, and relevant library versions;
- sanitized minimal configuration and the exact launch command;
- architecture and exact model/component revisions;
- dataset modality, item count, largest bucket/frame shape, and a synthetic reproducer when private data is involved;
- cache state and whether the failure occurs cold and warm;
- the first causal traceback plus surrounding log context;
- expected behavior, observed behavior, frequency, and the smallest one-variable experiment already tried.

Redact access tokens, usernames, private paths, personal images/captions, Hub credentials, W&B keys, and signed URLs. Replace secrets consistently so relationships remain understandable. Never upload a full environment dump without reviewing it.

State whether the job ever loaded, cached, trained, sampled, or saved. “Training failed” is much less actionable than “the first sample after step 0 fails while training and checkpoint saving succeed.”

## Further reading

- [Advanced-only settings reference](../reference/advanced-only-settings.md)
- [Optimizer and scheduler reference](../reference/optimizers-and-schedulers.md)
- [Advanced YAML and CLI](yaml-and-cli.md)
- [Performance and caching](performance-and-caching.md)
- [Diagnostic-run recipe](../recipes/diagnostic-run.md)
- [Diagnosis guide](../troubleshooting/diagnosis-guide.md)
- [Common failure patterns](../troubleshooting/common-failure-patterns.md)
- [Queue and GPU behavior](../workflow/queue-and-multiple-gpus.md)

<!-- book-verification:start -->
<!-- book-verification:end -->
