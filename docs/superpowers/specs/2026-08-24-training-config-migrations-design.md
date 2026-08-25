# Training Config Migrations and Architecture Transitions Design

## Goal

Make the training-book fact pipeline structurally discover every reachable
configuration mutation performed by `migrateJobConfig` and
`handleModelArchChange`, then require exact catalog ownership and teaching for
those behaviors.

## Scope

The implementation covers the live functions in:

- `ui/src/app/jobs/new/jobConfig.ts::migrateJobConfig`
- `ui/src/app/jobs/new/utils.ts::handleModelArchChange`

It does not change runtime or training behavior. It does not add exclusions for
documentable configuration behavior.

## Fact representation

Each reachable mutation emits one atomic source claim. Its stable identity is
derived from the exact top-level function binding, semantic guard role,
operation, canonical source and target paths, and tagged written or deleted
payload. Identity never depends on line numbers, whitespace, local variable
spelling, or a raw source snapshot.

Dedicated AST recognizers prove the complete source-to-target relationship,
guard, operation, payload, and behaviorally significant order. A changed guard,
source, target, value, deletion, or ordering relationship changes or invalidates
the emitted fact. An unsupported reachable setting mutation fails closed rather
than disappearing.

## Required behaviors

`migrateJobConfig` facts cover:

- nonempty legacy prompt arrays mapped in source order to sample objects,
  followed by deletion of the legacy key;
- `ui_trainer` replaced by `diffusion_trainer`;
- present `auto_memory` normalized through `value || false`, written to
  `layer_offloading`, then deleted;
- an absent logging object initialized to `log_every: 1` and
  `use_ui_logger: true`, while a present value including null is retained;
- macOS forcing the process device to `mps`.

`handleModelArchChange` facts cover:

- the missing-current-architecture and unchanged-architecture no-op guard;
- unsupported Anima model-path cleanup;
- unsupported low-VRAM reset;
- unsupported layer-offloading flag and percentage deletion;
- supported-but-absent layer-offloading initialization to false, 1.0, and 1.0;
- selected architecture assignment;
- architecture control assignment;
- single-control, multi-control, and no-control path initialization, copy, and
  deletion behavior;
- unsupported frame-count reset and auto-frame-count deletion;
- unsupported sample control-image deletion;
- previous-architecture default reversion before new-architecture default
  application.

## Ownership and documentation

Facts are owned by their semantic settings rather than merely matching a path
and type. Existing settings own sample, process type/logging, model, dataset,
and sample-item transitions. A process-device setting is added for the
Mac-forced process field.

Catalog teaching mirrors the emitted contracts:

- `sample.prompts` is a legacy alias of `sample.samples` and wins when both are
  present because the live migration overwrites `samples`;
- `model.auto_memory` is a deprecated alias/input for
  `model.layer_offloading`, with falsey fallback and source deletion explained;
- default, normalization, and interaction text describes the exact guards,
  values, copies, resets, and deletions for each owned transition.

## Validation and tests

Collector tests first establish RED mutations for every behavior family:
guard, source, target, payload, order, and an added reachable mutation. Positive
fixtures prove lexical binding, stable identities, and the exact emitted fact
count. Sibling functions, shadows, dead branches, and text-only occurrences do
not satisfy the recognizers.

Python contract tests use canonical emitted facts to verify exact ownership and
catalog alias/normalization/default/interaction parity. Removing or changing a
known behavior produces stale/unowned facts, and adding a new behavior becomes
unowned or fails closed. The facts-only suite, affected Python scope, full
Python validator, and canonical sequential runner must all pass before commit.
