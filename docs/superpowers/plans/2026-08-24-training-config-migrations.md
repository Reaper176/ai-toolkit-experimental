# Training Config Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Structurally discover, own, and document every reachable configuration mutation in `migrateJobConfig` and `handleModelArchChange` without changing runtime code.

**Architecture:** Extend atomic source claims with an optional tagged behavior contract, then add exact lexical AST recognizers for the two approved top-level functions and the imported Anima cleanup helper. Each recognized mutation emits one source claim whose identity includes its semantic guard role, operation, canonical path, and payload. Existing ownership validation remains the enforcement boundary: changed facts become stale/unowned, unsupported reachable mutations fail closed, and catalog teaching must match the emitted semantics.

**Tech Stack:** TypeScript compiler API, Node assertion tests, Python/Pydantic catalog validation, JSON settings catalog, unittest, npm canonical runner.

---

## File map

- `ui/testing/trainingBookFacts.ts`: tagged behavior contract, exact AST recognizers, production fact emission.
- `ui/testing/trainingBookUiFacts.test.ts`: schema, lexical binding, mutation, order, dead-code, and fail-closed collector tests.
- `scripts/training_book/catalog.py`: strict Python model for tagged behavior contracts and atomic projected identities.
- `testing/training_book_validation_test.py`: interchange validation, production ownership, mutation, and catalog-teaching tests.
- `docs/book/reference/settings-catalog.json`: exact owners and migration/transition teaching.
- `docs/book/reference/settings-catalog.schema.json`: regenerated only if the setting model changes for the new process-device setting.
- `docs/book/reference/settings-exclusions.json`: stale exact rows may be removed if replaced by owners; no new Group4 exclusions.

### Task 1: Add a tagged atomic behavior contract

- [ ] **Step 1: Write failing TypeScript and Python contract tests**

Add a source claim with this shape and assert strict round-trip identity:

```json
{
  "source_path": "ui/src/app/jobs/new/jobConfig.ts",
  "symbol": "migrateJobConfig::logging::absent::write",
  "path": "config.process[*].logging",
  "kind": "setting",
  "ui_label": {"present": false},
  "value_contract": {
    "ui_type": "object",
    "widget_kind": null,
    "optional": true,
    "nullable": true
  },
  "behavior_contract": {
    "guard": "property-absent",
    "operation": "write",
    "sources": [],
    "payload": {
      "kind": "literal",
      "value": {
        "kind": "object",
        "entries": [
          {"key": "log_every", "value": {"kind": "number", "value": 1}},
          {"key": "use_ui_logger", "value": {"kind": "boolean", "value": true}}
        ]
      }
    }
  }
}
```

Reject unknown operations, noncanonical source paths, untagged payloads, delete operations with a non-undefined payload, and copy/map payloads without exact source paths.

- [ ] **Step 2: Run the contract tests and record RED**

Run the focused TypeScript fact test and the Python UI fact contract class. Expect failures because `behavior_contract` is currently forbidden.

- [ ] **Step 3: Implement the minimal strict union**

Add matching TypeScript/Pydantic models:

```ts
type UiBehaviorPayload =
  | { kind: 'literal'; value: TrainingBookValueFact }
  | { kind: 'undefined' }
  | { kind: 'copy'; source_path: string; fallback?: TrainingBookValueFact }
  | { kind: 'map-prompt-objects'; source_path: string; item_key: 'prompt' }
  | { kind: 'architecture-field'; field: 'controls' }
  | { kind: 'architecture-default'; phase: 'revert' | 'apply'; value_index: 1 | 0 };

type UiBehaviorContract = {
  guard:
    | 'prompts-nonempty-array' | 'after-prompts-write'
    | 'type-is-ui-trainer' | 'property-present' | 'property-absent'
    | 'platform-mac' | 'cleaned-model-changed'
    | 'section-unsupported' | 'section-supported-property-absent'
    | 'architecture-change' | 'multi-control' | 'single-control'
    | 'no-control' | 'source-nonempty-target-empty' | 'source-nonempty'
    | 'frame-count-unsupported' | 'auto-frame-count-unsupported'
    | 'sample-control-unsupported' | 'revert-current-defaults'
    | 'apply-next-defaults';
  operation: 'write' | 'delete';
  sources: string[];
  payload: UiBehaviorPayload;
};
```

Validate canonical paths, unique ordered sources, operation/payload compatibility, and behavior presence as part of the source-claim identity.

- [ ] **Step 4: Run focused tests to GREEN**

Run TypeScript facts-only and the Python UI fact contract class.

### Task 2: Discover `migrateJobConfig` mutations

- [ ] **Step 1: Write positive expected-fact tests**

Export a focused source collector and assert seven exact claims:

```text
migrateJobConfig::prompts-to-samples::nonempty-array::write
migrateJobConfig::prompts-to-samples::after-write::delete
migrateJobConfig::type::ui_trainer::write
migrateJobConfig::auto_memory::present::write
migrateJobConfig::auto_memory::after-write::delete
migrateJobConfig::logging::absent::write
migrateJobConfig::device::mac::write
```

The contracts must encode ordered prompt mapping, `ui_trainer` to
`diffusion_trainer`, falsey fallback to false, exact logging object, `mps`, and
the required write-before-delete ordering.

- [ ] **Step 2: Write mutation and lexical RED tests**

Mutate each guard, source path, target path, literal, delete, and significant
order. Shadow or rebind the exact exported function/imports. Add an unknown
reachable assignment. Each case must either emit a changed fact or throw a
focused unsupported-mutation error. Comments, strings, dead branches, and
sibling functions emit nothing.

- [ ] **Step 3: Run focused tests and record RED**

Expect the seven-fact positive fixture to emit zero and mutation controls to
demonstrate the missing enforcement.

- [ ] **Step 4: Implement exact AST recognition**

Resolve the exported top-level `migrateJobConfig` binding and its parameter,
canonicalize `jobConfig.config.process[0]` to `config.process[*]`, and prove the
complete guards and operations. Traverse every reachable mutation in the
function; reject any mutation not consumed by one approved behavior. Use AST
reachability rather than comments or source text.

- [ ] **Step 5: Run focused tests to GREEN**

Verify all seven identities and every mutation control.

### Task 3: Discover `handleModelArchChange` transitions

- [ ] **Step 1: Write positive tests for the full transition inventory**

Assert exact atomic claims for:

- two Anima path deletions;
- low-VRAM false reset;
- three unsupported layer-offload deletions and three supported initialization writes;
- architecture-name write;
- dataset controls write;
- multi-control initialization/copy/delete effects;
- single-control initialization/copy/delete effects;
- no-control deletions;
- frame-count reset and auto-frame-count deletion;
- sample `ctrl_img` deletion;
- previous-default revert and new-default apply.

The expected live count is exactly 30 transition claims and 37 behavior claims
across both functions.

- [ ] **Step 2: Write guard/source/target/value/order RED mutations**

Mutate additional-section names, `includes` polarity, membership guards,
literal values, copy sources, delete targets, final aggregate setters, old/new
default value indexes, and revert/apply order. Add a new reachable setter or
delete. Include exact import/helper binding, shadow, sibling, and dead-code
controls.

- [ ] **Step 3: Run focused tests and record RED**

Expect zero behavior claims from the current collector.

- [ ] **Step 4: Implement exact AST recognition**

Prove the exported function binding, parameters, exact `modelArchs.find`
bindings, exact `clearUnsupportedAnimaPaths` import, helper deletion semantics,
dataset/sample map callback binding, aggregate setter commits, and old-before-new
default loops. Normalize callback item paths to `datasets[*]` and
`sample.samples[*]`. Consume every reachable setting mutation or fail closed.

- [ ] **Step 5: Run focused tests to GREEN**

Confirm stable semantic identities survive whitespace, harmless local renames,
and sibling reordering while behavioral mutations fail.

### Task 4: Integrate production facts and ownership RED

- [ ] **Step 1: Emit canonical production facts**

Run the facts-only collector and record exact counts by function, guard, and
operation. Expect 7 migration claims and 30 architecture claims.

- [ ] **Step 2: Add production mutation tests**

Load canonical production facts/catalog/exclusions, verify the new claims are
unowned, then synthesize one additional auth-independent migration behavior and
prove it remains unowned. Remove/change one emitted behavior and prove the old
owner becomes stale after ledger population.

- [ ] **Step 3: Run ownership validation and capture RED**

Run `scripts/validate_training_book.py --check-discovery --ui-facts <facts>` and
record exact unowned/stale counts before changing JSON ledgers.

### Task 5: Populate semantic owners and teaching

- [ ] **Step 1: Write catalog-teaching RED tests**

Assert every behavior fact is owned by its semantic setting and that aliases,
defaults, normalizations, or interactions state the exact emitted guard and
effect. Explicitly assert:

- legacy prompts are an alias for samples with `alias-wins` precedence;
- auto-memory is an alias/input for layer offloading and falsey values become false;
- missing logging gets exactly the emitted object while present null is retained;
- process device is a new `config.process[*].device` runtime-forced setting and is
  distinct from root `job.device` at `config.device` and from the old imported
  process-device exclusion;
- low-VRAM/layer flags, dataset control modes, frame resets, sample cleanup, and
  architecture defaults match every emitted contract.

- [ ] **Step 2: Run focused Python tests and record RED**

Expect missing owners and teaching mismatches.

- [ ] **Step 3: Apply exact ledger/catalog updates**

Add exact owners for every emitted behavior claim. Add the process-device setting
without reusing root `job.device`. Correct the prompts precedence and add only
source-derived aliases, normalizations, defaults, and interactions. Remove an
old exact exclusion only if its identical fact is replaced by an owner; do not
add exclusions or broad claims.

- [ ] **Step 4: Run focused ownership and teaching tests to GREEN**

Require zero stale, unowned, overlap, or double-owned facts.

### Task 6: Verify and commit Group4

- [ ] **Step 1: Run proportional gates**

Run TypeScript compilation/facts-only, focused Python scopes, discovery validator
with canonical facts, and `git diff --check`.

- [ ] **Step 2: Run full gates**

Run `python testing/training_book_validation_test.py` and canonical sequential
`npm run test:training-book`.

- [ ] **Step 3: Review the final inventory**

Report exact behavior counts, owner/exclusion totals, and zero stale/unowned/
overlap. Confirm no runtime/training source files changed.

- [ ] **Step 4: Create the focused implementation commit**

Stage collector, validator, tests, and exact catalog ledgers, then commit with:

```text
docs: catalog training config migrations
```
