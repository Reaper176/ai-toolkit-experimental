# LoRA Training Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a versioned, beginner-first and advanced-complete LoRA training book whose settings, model facts, examples, navigation, README link, and UI link are continuously verified against this repository.

**Architecture:** Put narrative documentation under `docs/book/`, but keep factual settings in a machine-readable catalog with fail-closed Python and TypeScript source discovery. A root Python validation package checks manifests, Markdown, examples, and Python configuration reads; a focused UI test runner checks live TypeScript defaults/model metadata and the semantic Training Guide link. Generated reference blocks are committed and checked for drift, while narrative chapters remain hand-authored.

**Tech Stack:** Markdown, JSON/JSON Schema, YAML, Python 3 AST and `unittest`, TypeScript compiler API, React 19 test renderer, Node.js test runners, existing AI Toolkit config loaders.

**Design source:** `docs/superpowers/specs/2026-08-14-lora-training-book-design.md`

---

## Implementation order and subsystem boundary

Complete Tasks 1–15 of this plan before the built-in preset catalog plan. The six recipe pages and `book-manifest.json` are the only hard inputs the catalog needs. Recipe pages initially contain empty generated reverse-reference markers; execute the preset plan next so it fills and verifies those blocks, then return here for Tasks 16–17 and the smoke/final gate.

Do not import model modules, instantiate trainers, download weights, or require a GPU in automated validation. The only GPU step is Task 16, after the complete edition has its own commit.

Before Task 1, confirm the isolated worktree baseline from `ui/` with `npm run test:training-presets` and `npm run test:dataset-presets`. Both commands passed when this plan was written; stop and investigate any new baseline failure before attributing it to book work.

## File structure

Create validation code with one responsibility per file:

- `scripts/training_book/manifest.py` — edition manifest, navigation, footer, and page-set validation.
- `scripts/training_book/discovery.py` — fail-closed Python setting-read discovery and ownership comparison.
- `scripts/training_book/catalog.py` — settings-catalog schema/semantic validation and generated rendering data.
- `scripts/training_book/examples.py` — example manifest, typed token substitution, YAML key ownership, and semantic config validation.
- `scripts/training_book/markdown.py` — internal link, anchor, generated-marker, and recipe reverse-link checks.
- `scripts/validate_training_book.py` — deterministic validation CLI used by tests.
- `scripts/generate_training_book_reference.py` — generated Markdown block writer and `--check` mode.
- `testing/training_book_validation_test.py` — Python unit and repository-integration tests.
- `ui/testing/trainingBookFacts.ts` — reusable TypeScript compiler/API fact collector and canonical JSON emitter.
- `ui/testing/trainingBookUiFacts.test.ts` — live UI defaults, docs keys, architecture metadata, and catalog agreement.
- `ui/testing/trainingGuideLink.test.tsx` — mounted semantic external-link behavior.
- `ui/testing/tsconfig.trainingBook.json` — focused TypeScript compilation boundary.
- `ui/testing/runTrainingBookTests.mjs` — mandatory Python/TypeScript orchestration.
- `ui/src/components/TrainingGuideLink.tsx` — isolated accessible sidebar link.

Create the exact documentation tree declared in the approved design at `docs/superpowers/specs/2026-08-14-lora-training-book-design.md`. Do not create an in-app Markdown renderer or a `/docs` route.

Every Markdown page created after Task 1 must include, from its first commit, one H1, a relative table-of-contents link to `docs/book/README.md`, and these empty generated boundaries:

```markdown
<!-- book-navigation:start -->
<!-- book-navigation:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
```

Generators may rewrite only the bytes inside marker pairs; they fail on missing/duplicate/unbalanced markers and never insert markers implicitly. Factual model summaries additionally use a `model-facts` generated block sourced from catalog entries already proven equal to emitted UI facts, while prose tests assert headings, links, and prohibited claims rather than brittle paragraph wording.

### Task 1: Establish the manifest validator and focused test runner

**Files:**
- Create: `scripts/training_book/__init__.py`
- Create: `scripts/training_book/manifest.py`
- Create: `scripts/validate_training_book.py`
- Create: `testing/training_book_validation_test.py`
- Create: `docs/book/README.md`
- Create: `docs/book/book-manifest.json`
- Create: `ui/testing/runTrainingBookTests.mjs`
- Modify: `ui/package.json`

- [ ] **Step 1: Write failing manifest-contract tests**

Add `ManifestContractTests` using `tempfile.TemporaryDirectory`. The valid fixture must contain `schema_version`, `book_revision`, `verified_date`, ordered `pages`, `preset_architectures`, `focused_architectures`, `full_architectures`, and `required_footer`. Add negative cases for duplicate pages, broken previous/next links, a page outside `docs/book`, duplicate architectures, missing footer fields, and an architecture-set mismatch.

```python
from scripts.training_book.manifest import load_book_manifest, validate_book_manifest

def test_valid_manifest_round_trips(self):
    manifest = load_book_manifest(self.write_manifest(self.valid_manifest()))
    validate_book_manifest(manifest, expected_full_architectures=("anima", "flux"))
    self.assertEqual(tuple(page.path for page in manifest.pages), ("README.md", "glossary.md"))
```

- [ ] **Step 2: Run the test and verify RED**

Run: `python testing/training_book_validation_test.py -k manifest`

Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.training_book'`.

- [ ] **Step 3: Implement immutable manifest types and validation**

Use these public signatures:

```python
@dataclass(frozen=True)
class BookPage:
    path: str
    previous: str | None
    next: str | None

@dataclass(frozen=True)
class BookManifest:
    schema_version: int
    book_revision: int
    verified_date: str
    pages: tuple[BookPage, ...]
    preset_architectures: tuple[str, ...]
    focused_architectures: tuple[str, ...]
    full_architectures: tuple[str, ...]
    required_footer: str

load_book_manifest(path: Path) -> BookManifest
validate_book_manifest(manifest: BookManifest, *, expected_full_architectures: Sequence[str]) -> None
```

Reject non-plain JSON shapes, booleans where integers are required, nonpositive revisions, non-ISO `YYYY-MM-DD` dates, absolute/backslash/traversal paths, duplicate pages, self-links, non-reciprocal navigation, and set/order drift. Error messages must name the field and offending value without leaking unrelated filesystem paths.

- [ ] **Step 4: Commit the canonical edition/navigation contract before any chapter facts**

Create the manifest with `schema_version: 1`, `book_revision: 1`, `verified_date: "2026-08-14"`, footer `Verified against ai-toolkit-experimental book revision 1 (2026-08-14).`, and these exact ordered sets:

```text
preset_architectures:
  anima, flux, flex1, qwen_image, qwen_image_edit_plus, sdxl, sd15, wan21:1b, wan22_14b:t2v

focused_architectures:
  anima, flux, flux_kontext, flex1, qwen_image, qwen_image:2512,
  qwen_image_edit, qwen_image_edit_plus, qwen_image_edit_plus:2511,
  sdxl, sd15, wan21:1b, wan22_14b:t2v

full_architectures:
  anima, flux, flux_kontext, flex1, flex2, chroma, zeta_chroma,
  wan21:1b, wan21_i2v:14b480p, wan21_i2v:14b, wan21:14b,
  wan22_14b:t2v, wan22_14b_i2v, wan22_5b, lumina2, qwen_image,
  qwen_image:2512, qwen_image_edit, qwen_image_edit_plus,
  qwen_image_edit_plus:2511, hidream, hidream_e1, sdxl, sd15,
  omnigen2, flux2, zimage:turbo, zimage, zimage:deturbo, minimax_h3,
  ltx2, ltx2.3, ltx2.5, flux2_klein_4b, ernie_image,
  flux2_klein_9b, ace_step_15_xl, ace_step_15, nucleus_image,
  hidream_o1, zimage_l2p, ideogram4, prx_pixel, krea2, krea2:turbo,
  krea2:o_edit, krea2:o_edit_turbo, mageflow, mageflow_edit,
  boogu_image, boogu_image_edit
```

The ordered `pages` array contains exactly these 44 relative paths, with reciprocal `previous`/`next` values derived from this order:

```text
README.md
getting-started/prerequisites.md
getting-started/choose-a-model.md
getting-started/first-lora.md
getting-started/training-mental-model.md
datasets/curation.md
datasets/captions-and-triggers.md
datasets/resolution-and-bucketing.md
datasets/masks.md
datasets/controls-video-audio.md
datasets/rights-privacy-and-safety.md
workflow/simple-ui.md
workflow/sampling-and-evaluation.md
workflow/loss-and-checkpoints.md
workflow/queue-and-multiple-gpus.md
workflow/saving-resuming-and-optimizer-state.md
recipes/character-identity.md
recipes/style.md
recipes/object-concept.md
recipes/focused-refinement.md
recipes/low-vram.md
recipes/diagnostic-run.md
models/anima.md
models/flux-and-flex.md
models/qwen-image-and-edit.md
models/sdxl-and-sd15.md
models/wan.md
reference/job-and-model.md
reference/network.md
reference/training.md
reference/dataset.md
reference/masks-and-preservation.md
reference/saving-and-sampling.md
reference/optimizers-and-schedulers.md
reference/advanced-only-settings.md
advanced/yaml-and-cli.md
advanced/layer-targeting.md
advanced/performance-and-caching.md
advanced/extending-and-debugging.md
troubleshooting/diagnosis-guide.md
troubleshooting/common-failure-patterns.md
verification/first-run-smoke.md
examples/README.md
glossary.md
```

Create a skeletal `docs/book/README.md` with its H1 and required marker pairs so all later TOC links resolve. The manifest contract validates now without requiring every declared page to exist; repository completeness is enabled in Task 14.

- [ ] **Step 5: Add the focused runner and package command**

`runTrainingBookTests.mjs` must spawn the Python unit file from the repository root, propagate nonzero status, and reject missing required test artifacts. Add:

```json
"test:training-book": "node testing/runTrainingBookTests.mjs"
```

Do not add documentation validation to application startup.

- [ ] **Step 6: Run the focused unit test and package runner**

Run: `python testing/training_book_validation_test.py -k manifest`

Expected: PASS.

Run: `cd ui && npm run test:training-book`

Expected: PASS with the manifest unit tests; repository integration is added in later tasks.

- [ ] **Step 7: Commit**

```bash
git add scripts/training_book scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/README.md docs/book/book-manifest.json ui/testing/runTrainingBookTests.mjs ui/package.json
git commit -m "test: add training book validation harness"
```

### Task 2: Implement fail-closed Python source discovery

**Files:**
- Create: `scripts/training_book/discovery.py`
- Create: `docs/book/reference/settings-sources.json`
- Create: `docs/book/reference/settings-exclusions.json`
- Modify: `testing/training_book_validation_test.py`
- Modify: `scripts/validate_training_book.py`

- [ ] **Step 1: Write failing AST-discovery tests**

Use temporary Python modules covering literal `kwargs.get`, `get_conf`, subscript reads, attribute-owned maps, `argparse.add_argument`, `os.getenv`, `os.environ.get`, `os.environ[...]`, the `model_config.model_kwargs` alias `mkw`, a resolvable literal loop, finite LTX/Minimax-style `f"{component}_path"` expansion, and an unresolved dynamic key. Add a finite `**network_kwargs` dispatch fixture with explicit call arguments, two statically selected target classes, constructor parameters, and one constructor forwarding `**kwargs` to a known mixin. Assert exact accepted, engine-supplied/reserved, forwarded, and unresolved keys; a dynamic call target or unconstrained forwarded sink fails rather than becoming an open-map wildcard. Assert exact symbol, source line, key, read kind, scope, and default expression. Assert that every discovered read must belong to exactly one catalog entry or exact-symbol exclusion.

```python
facts = discover_python_settings(fixture_root, globs=("**/*.py",))
self.assertIn(
    DiscoveredSetting("sample.py", "Config.__init__", 4, "steps", "kwargs.get", "core", "3000"),
    facts,
)
with self.assertRaisesRegex(DiscoveryError, "dynamic configuration read"):
    discover_python_settings(dynamic_fixture, globs=("**/*.py",))
```

- [ ] **Step 2: Run the discovery tests and verify RED**

Run: `python testing/training_book_validation_test.py -k discovery`

Expected: FAIL because `discover_python_settings` is absent.

- [ ] **Step 3: Implement deterministic AST discovery**

Expose:

```python
@dataclass(frozen=True, order=True)
class DiscoveredSetting:
    source: str
    symbol: str
    line: int
    key: str
    read_kind: str
    scope: str
    default_expression: str | None

@dataclass(frozen=True, order=True)
class SourceClaim:
    source: str
    symbol: str
    key: str
    read_kind: str

@dataclass(frozen=True, order=True)
class Exclusion:
    source: str
    symbol: str
    key: str
    read_kind: str
    reason: str

discover_python_settings(repository_root: Path, globs: Sequence[str]) -> tuple[DiscoveredSetting, ...]
validate_setting_ownership(
    discovered: Sequence[DiscoveredSetting],
    catalog_claims: Sequence[SourceClaim],
    exclusions: Sequence[Exclusion],
) -> None
```

Parse without importing source modules. Resolve literal tuple/list loops; fail on dynamic keys rather than ignoring them. Sort facts by portable source path, symbol, key, and read kind. Reject vanished declared sources, empty discovery globs, double ownership, blanket exclusions, and exclusions without exact symbol/reason.

Ownership identity is exactly `(source, symbol, key, read_kind)`. `line`, `scope`, and `default_expression` are drift metadata and must match source-derived expectations where cataloged, but do not create multiple owners for the same logical read.

- [ ] **Step 4: Declare the initial source union and exact exclusions**

`settings-sources.json` must include explicit roots/globs for:

```text
jobs/**/*.py
extensions_built_in/sd_trainer/**/*.py
extensions_built_in/diffusion_models/**/*.py
extensions_built_in/flex2/**/*.py
extensions_built_in/audio_models/**/*.py
toolkit/config.py
toolkit/config_modules.py
toolkit/data_loader.py
toolkit/dataloader_mixins.py
toolkit/data_transfer_object/**/*.py
toolkit/network_mixins.py
toolkit/lora_special.py
toolkit/lycoris_special.py
toolkit/kohya_lora.py
toolkit/optimizer.py
toolkit/optimizers/**/*.py
toolkit/scheduler.py
toolkit/samplers/**/*.py
toolkit/models/**/*.py
toolkit/paths.py
toolkit/memory_management/manager_modules.py
run.py
```

Record UI-owned globs (`ui/cron/**/*`, `ui/src/app/jobs/new/**/*`, `ui/src/app/settings/**/*`, `ui/src/app/layout.tsx`, `ui/src/components/**/*`, `ui/src/hooks/useSettings.tsx`, `ui/src/helpers/defaultSamples.ts`, `ui/src/paths.ts`, `ui/src/utils/**/*`, `ui/src/server/**/*.ts`, `ui/src/app/api/**/*.ts`, `ui/src/middleware.ts`, `ui/src/docs.tsx`, and `ui/src/types.ts`) with `owner: "typescript-test"`; the collector targets setter/default/docs/model/global-setting/server-state facts inside those globs rather than treating every implementation symbol as a setting. The layout collector owns the `AI_TOOLKIT_AUTH` authentication-state read and exact-classifies build/version metadata such as `NEXT_PUBLIC_APP_VERSION` rather than silently omitting it. Utility facts own/classify the matching token reads in `api.ts` and `callScript.ts`, localStorage removal, Bearer-header construction, and 401 logout behavior so UI auth transport cannot drift outside the catalog/exclusion ledger. Python validation rejects every individual emitted UI fact without exactly one catalog/exclusion owner, every catalog UI claim absent from emitted facts, and every declared TypeScript source group that unexpectedly emits nothing. `settings-exclusions.json` must name each excluded symbol individually and explain why it is slider-only, extraction-only, generation-only, reference-dataset-only, arbitrary third-party constructor surface, external extension, or model-developer API.

- [ ] **Step 5: Add deterministic inventory/report and closed slice modes**

Add `--inventory-json <path>` to emit the sorted discovered union plus ownership status without weakening validation, and `--check-discovery --scope discovery-fixtures` to validate the miniature fixture contract independently of the still-unpopulated production catalog. Add mutually exclusive focused selectors `--target-source <portable-source-path>` and `--target-symbol <portable-source-path>::<exact-symbol>` for commit-sized catalog work. A target must be in the declared source union and discover at least one fact; the selected source/symbol must have zero unowned, stale, or double-owned facts, while unrelated unfinished production groups are not evaluated. Unknown, empty, glob, prefix, or ambiguous targets fail. Aggregate `--scope` checks remain mandatory at each task's final step.

Run: `python testing/training_book_validation_test.py -k discovery`

Expected: PASS.

Run: `python scripts/validate_training_book.py --check-discovery --scope discovery-fixtures`

Expected: PASS.

Run: `python scripts/validate_training_book.py --inventory-json /tmp/ai-toolkit-training-book-inventory.json`

Expected: exit zero after writing a deterministic report whose unowned production rows form the explicit work queue for Tasks 3–6. Tests assert the current major groups are nonempty, including approximately 410 literal reads from `toolkit/config_modules.py`, 126 `TrainConfig` reads, 60 `ModelConfig` reads, 78 `DatasetConfig` reads, and 49 `AdapterConfig` reads; a zero or abruptly reduced group is a failure.

- [ ] **Step 6: Commit**

```bash
git add scripts/training_book/discovery.py scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/reference/settings-sources.json docs/book/reference/settings-exclusions.json
git commit -m "feat: discover training settings fail closed"
```

## Commit-sized catalog ownership protocol for Tasks 3–6

Never enable a production ownership assertion for a later catalog slice before its rows are being implemented. Shared schema/parser/discovery behavior uses temporary fixtures and is committed only after those fixture tests are GREEN. For each named production slice:

1. Add only that slice's focused repository assertion and run its exact `--scope`, `--target-source`, or `--target-symbol`; require RED listing only that selected slice's missing/stale ownership.
2. Add the catalog/exclusion rows and any narrowly required validator code for that slice.
3. Run the same focused assertion/selector to GREEN, then rerun every previously completed slice selector.
4. Stage the focused test, validator change if any, and only that slice's catalog/exclusion rows; commit with the exact task message.

Task-wide production assertions and aggregate scopes are added/enabled only after the final named slice, when they can immediately pass, and are staged in that final slice's commit. Do not leave broad failing tests unstaged across slice commits, do not leave a newly green aggregate assertion uncommitted, and do not defer already-green focused tests to an optional aggregate correction commit.

### Task 3: Define the catalog schema and document core process settings

**Files:**
- Create: `scripts/training_book/catalog.py`
- Create: `docs/book/reference/settings-catalog.schema.json`
- Create: `docs/book/reference/settings-catalog.json`
- Modify: `testing/training_book_validation_test.py`
- Modify: `scripts/validate_training_book.py`

- [ ] **Step 1: Write failing catalog-schema and ownership tests**

Using only temporary catalog/discovery fixtures, tests must reject missing stable IDs, unsupported locations/surfaces, overlapping location/applicability claims, blank teaching prose, a default labeled without authority, an alias without migration policy, a source claim not found by discovery, and a discovered source with no owner. Do not enable any production core-process/class ownership assertion in this step; add each one with its slice under the protocol above.

```python
entry = valid_catalog_entry()
entry["render"]["drawbacks"] = ""
with self.assertRaisesRegex(CatalogError, "render.drawbacks"):
    validate_settings_catalog({"schema_version": 1, "settings": [entry]}, discovered)
```

- [ ] **Step 2: Run the catalog tests and verify RED**

Run: `python testing/training_book_validation_test.py -k catalog`

Expected: FAIL because `scripts.training_book.catalog` does not exist.

- [ ] **Step 3: Implement the catalog contract**

Each setting must validate this shape from the approved design:

```json
{
  "id": "train.steps",
  "ui_label": "Steps",
  "scope": "process",
  "locations": [{"kind": "yaml", "path": "config.process[*].train.steps"}],
  "surfaces": ["simple-ui", "advanced-yaml"],
  "persistence": "config",
  "authority": "user",
  "lifecycle": "supported",
  "applicability": [{"process_type": "diffusion_trainer"}],
  "contract": {
    "parser_type": "integer",
    "supported_type": "positive-integer",
    "ui_type": "number",
    "example_type": "integer",
    "accepted_values": null,
    "range": {"minimum": 1, "maximum": null, "minimum_inclusive": true, "maximum_inclusive": true},
    "null": "rejected"
  },
  "defaults": [
    {"kind": "ui-created", "presence": "present", "value": 3000, "applicability": []},
    {"kind": "engine-fallback", "presence": "present", "value": 2000, "applicability": []}
  ],
  "normalizations": [],
  "interactions": [],
  "aliases": [],
  "section": "training",
  "source_claims": [{"source": "toolkit/config_modules.py", "symbol": "TrainConfig.__init__", "key": "steps", "read_kind": "kwargs.get"}],
  "render": {
    "page": "reference/training.md",
    "anchor": "train-steps",
    "description": "Sets the total target optimizer step count.",
    "benefits": "Controls training duration and checkpoint opportunities.",
    "drawbacks": "Excessive steps can overfit a small or repetitive dataset.",
    "example": "steps: 3000"
  }
}
```

Canonical paths use `[*]`. Known discriminator-owned parameters use scoped IDs; open-map wildcards cannot claim known first-party keys. Preserve omitted versus explicit-null semantics.

`ui_label` is required for visible controls and explicitly `null` for advanced/CLI-only entries; `scope` is one of `root`, `job`, `process`, `model`, `network`, `train`, `dataset`, `save`, `sample`, `logging`, `optimizer`, `scheduler`, `cli`, `environment`, or `ui-state`. Catalog `ui_type` is `null` or the same semantic enum used by emitted UI facts: `boolean`, `integer`, `number`, `string`, `path`, `boolean-list`, `integer-list`, `number-list`, `string-list`, `object`, or `object-list`; widget presentation is recorded only in UI facts and never substituted for semantic type. `accepted_values` and `range` are mutually exclusive unless the range further constrains numeric enum values. Every default carries explicit presence plus applicability predicates, including architecture-scoped on-select/on-leave values; `presence: "absent"` forbids a `value` property. UI/example types never implicitly inherit parser types.

Define strict Pydantic 2 contracts with `extra="forbid"` for the catalog and all nested records. Export `settings_catalog_schema()`, generate `settings-catalog.schema.json` from that executable contract, and compare the committed schema with canonical generated output before validating `settings-catalog.json`. Tests must prove that an unknown field, a boolean supplied for a numeric field, and committed-schema drift all fail.

Run `python testing/training_book_validation_test.py -k catalog_contract` and require the temporary-fixture schema tests to PASS with a valid empty production settings array. Commit this green shared contract before adding production rows:

```bash
git add scripts/training_book/catalog.py scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/reference/settings-catalog.schema.json docs/book/reference/settings-catalog.json
git commit -m "feat: define the training settings catalog"
```

- [ ] **Step 4: Close the root/job/process inventory group**

Filter the deterministic inventory report to `jobs/BaseJob.py`, `jobs/ExtensionJob.py`, `jobs/process/BaseProcess.py`, `BaseTrainProcess.py`, `BaseSDTrainProcess.py`, and `extensions_built_in/sd_trainer/DiffusionTrainer.py`. Add one catalog/exclusion owner for every exact row, including `DiffusionTrainer.sqlite_db_path`; after each source file, run `--check-discovery --target-source <that-exact-portable-path>` and require zero unowned/stale/double-owned claims in that file. Reserve `--scope core-process` for the final file, when the entire group can be green.

Commit each green source-file slice with `docs: catalog <source-symbol> settings`; do not wait for the whole core task.

- [ ] **Step 5: Close the save/log/sample/network inventory group**

Own every exact `SaveConfig`, `LoggingConfig`, `SampleConfig`, `SampleItem`, LoRM/module, and `NetworkConfig` read from `toolkit/config_modules.py` and `toolkit/network_mixins.py`. Resolve the active `BaseSDTrainProcess` `**network_kwargs` dispatch into `LoRASpecialNetwork.__init__`, `LycorisSpecialNetwork.__init__`, and their statically known forwarded mixin parameters. Separately own user-configurable keys such as only/ignore/full-if-contains, rank/module dropout, block dimensions/alphas, and `parameter_threshold`; exact-exclude parameters supplied/overwritten by the engine, duplicate-call-invalid parameters, and model-developer-only sinks. Prove `toolkit/kohya_lora.py::create_network` is not on the active dispatch path and exact-symbol exclude it rather than treating its arbitrary `**kwargs` as supported. Any new active target/signature parameter or unresolved forwarding edge fails discovery.

For each entry record its parser/supported type, omitted/null behavior, UI value if any, engine fallback, normalization, practical effect, benefit, drawback, interaction, concrete example, and exact source claim. After each class or active constructor, run `--check-discovery --target-symbol <portable-path>::<exact-discovered-symbol>` and require that symbol alone to be green. Never shorten a discovered `SampleConfig.__init__`-style identity to the class name. Run aggregate `--scope core-io-network` only after the final class/constructor.

Commit each class immediately after its green scope using `docs: catalog <class-name> settings`.

- [ ] **Step 6: Close the adapter/validation/embedding/decorator/EMA/guidance group**

Own all 49 `AdapterConfig` reads plus every validation, `EmbeddingConfig`, `DecoratorConfig`, `EMAConfig`, and `GuidanceConfig` read. Exact-symbol exclusions are permitted only for the out-of-bound categories declared in Task 2. Run `--check-discovery --target-symbol <portable-path>::<exact-discovered-symbol>` (for example `AdapterConfig.__init__`) after each named class; run aggregate `--scope core-modules` only after the last class.

Commit `AdapterConfig` separately, then one commit per remaining named class; each commit includes only that class's catalog rows and focused tests.

- [ ] **Step 7: Run the combined core validation**

Run: `python scripts/validate_training_book.py --check-discovery --scope core`

Expected: PASS with zero unowned keys in the core scope.

Run: `python testing/training_book_validation_test.py -k catalog`

Expected: PASS.

- [ ] **Step 8: Commit**

Commit only any final cross-class schema/validator integration left after the slice commits:

```bash
git add scripts/training_book/catalog.py scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/reference/settings-catalog.schema.json docs/book/reference/settings-catalog.json
git commit -m "test: validate combined core setting ownership"
```

### Task 4: Catalog training, optimizer, and scheduler settings

**Files:**
- Modify: `docs/book/reference/settings-catalog.json`
- Modify: `docs/book/reference/settings-exclusions.json`
- Modify: `scripts/training_book/discovery.py`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add failing temporary-fixture dispatch discovery tests**

Using temporary modules only, test optimizer/scheduler registry extraction, locally consumed/injected parameters, fused-backward compatibility facts, a newly registered choice, and exact exclusion of an arbitrary third-party constructor boundary. Do not enable production TrainConfig/optimizer/scheduler ownership assertions yet.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k training_dispatch_contract`

Expected: FAIL because deterministic registry/dispatch discovery is incomplete.

- [ ] **Step 3: Implement and commit green dispatch discovery**

Implement the fixture-proven registry and injected-parameter discovery without importing optimizer libraries. Run the same selector to GREEN and commit only this shared discovery capability:

```bash
git add scripts/training_book/discovery.py testing/training_book_validation_test.py
git commit -m "test: discover optimizer and scheduler dispatch"
```

- [ ] **Step 4: Close TrainConfig schedule, duration, and update mechanics**

Add only the `train-schedule` production assertion and require its scope RED. From the 126-row `TrainConfig` inventory, own steps/start step, batch size, gradient accumulation, global/per-component learning rates, scheduler/timestep/content-style weighting, boundary switching, and resume-sensitive values. Include literal learning-rate examples `1e-4`, `5e-5`, `2e-5`, `1e-5`, and `5e-6` with benefits, drawbacks, and representative uses. Run `--scope train-schedule` to zero after the slice.

Commit this slice as `docs: catalog training schedule settings`.

- [ ] **Step 5: Close TrainConfig precision, loss, gradient, and sampling mechanics**

Add only the `train-numerics` production assertion, require RED, then own dtype/precision, loss variants, clipping, checkpointing, fused-backward restrictions, sampling toggles, differential-output and blank-prompt preservation, EMA, and inverted-mask prior/multiplier/Turbo interaction. Run `--scope train-numerics` to zero.

Commit this slice as `docs: catalog training numeric settings`.

- [ ] **Step 6: Close TrainConfig text-encoder/cache/offload mechanics**

Add only the `train-components` production assertion, require RED, then own text-encoder training, unload/cache behavior, latent/text cache interactions, component training flags, quantization/offload-affecting train settings, and every remaining `TrainConfig` inventory row. Run `--scope train-components` and then the complete `TrainConfig` class scope; both must report zero unowned rows.

Commit this slice as `docs: catalog training component settings`.

- [ ] **Step 7: Close first-party optimizer dispatch and injected parameters**

Add only the production `optimizers` registry assertion, require RED, then inventory `toolkit/optimizer.py` plus `toolkit/optimizers/**/*.py`. Document every registered first-party optimizer choice, locally consumed/injected parameter, range/default, optional-library failure mode, and exact exclusion boundary for arbitrary third-party constructor parameters. Run `--scope optimizers` to zero and test that registering a new choice without ownership fails.

Commit this slice as `docs: catalog optimizer settings`.

- [ ] **Step 8: Close scheduler dispatch and parameters**

Add only the production `schedulers` registry assertion, require RED, then inventory `toolkit/scheduler.py` and locally implemented scheduler modules. Document every registered scheduler, scheduler-specific parameter, normalization, timestep interaction, and failure behavior. Run `--scope schedulers` to zero and test that a newly registered choice fails until owned.

Commit this slice as `docs: catalog scheduler settings`.

- [ ] **Step 9: Enable and run the aggregate training checks**

Run: `python scripts/validate_training_book.py --check-discovery --scope training`

Expected: PASS with every registered first-party optimizer and scheduler owned.

Run: `python testing/training_book_validation_test.py -k training`

Expected: PASS.

If combined validation required no correction, do not create an aggregate commit. Otherwise commit only the focused integration correction as `test: validate combined training setting ownership`.

### Task 5: Catalog datasets, masks, controls, saving, and sampling

**Files:**
- Modify: `docs/book/reference/settings-catalog.json`
- Modify: `docs/book/reference/settings-exclusions.json`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add only the first failing dataset-core assertion**

Add only the production `dataset-core` assertion for DatasetConfig identity/caption/weighting/resolution facts. Loader/mixin, mask/modality, cache, save/sample, and resume assertions are added only with their later named slices. The later mask assertion must prove `mask_path` is loader-managed rather than accepted as an untrusted UI override where current server behavior strips it.

- [ ] **Step 2: Run and verify RED**

Run: `python scripts/validate_training_book.py --check-discovery --scope dataset-core`

Expected: FAIL listing only unowned dataset-core keys.

- [ ] **Step 3: Close DatasetConfig identity, caption, and weighting rows**

From all 78 `DatasetConfig` reads, own folder/preset-version/provenance, caption extension/default/trigger/dropout/shuffle, repeats, weights, regularization, resolution/buckets, flips, and omitted/null semantics. Run the `dataset-core` class slice to zero, rerun prior completed selectors, and commit its focused test with these rows.

Commit this slice as `docs: catalog core dataset settings`.

- [ ] **Step 4: Close mask, control, video, and audio rows**

Add only the `dataset-modalities` production assertion and require RED. Own `mask_path`, `mask_min_value`, `invert_mask`, white/black/all-white behavior, controls/multi-controls/paired-name requirements, frame/FPS/I2V settings, audio normalization, and pitch preservation. Include server-managed/untrusted `mask_path` authority and inverted-mask-prior interaction. Run `dataset-modalities` to zero.

Commit this slice as `docs: catalog mask and modality settings`.

- [ ] **Step 5: Close loader/mixin and cache rows**

Add only the `data-loader-cache` production assertion and require RED. Inventory `toolkit/data_loader.py`, `toolkit/dataloader_mixins.py`, and related declared loader symbols. Own direct reads, latent/text-embedding cache settings, immutable snapshot/cache reuse behavior, size metadata, and source-missing provenance. Reject an unowned loader read even when `DatasetConfig` accepts it through `**kwargs`. Run `data-loader-cache` to zero.

Commit this slice as `docs: catalog loader and cache settings`.

- [ ] **Step 6: Close save, sample, validation, and optimizer-state rows**

Add only the `save-sample-validation` production assertion and require RED. Own sample prompt/negative/control item overrides, cadence, seeds, guidance, dimensions/frames/FPS, save cadence/retention/format/Hub behavior, validation settings, `optimizer.pt`, and compatible resume semantics. Run `save-sample-validation` to zero.

Commit this slice as `docs: catalog save sample and resume settings`.

- [ ] **Step 7: Enable and run the aggregate data checks**

Run: `python scripts/validate_training_book.py --check-discovery --scope data`

Expected: PASS.

Run: `python testing/training_book_validation_test.py -k data`

Expected: PASS.

If combined validation required no correction, do not create an aggregate commit. Otherwise commit only the integration correction as `test: validate combined data setting ownership`.

### Task 6: Catalog all current model architectures, UI state, and CLI controls

**Files:**
- Create: `ui/testing/trainingBookFacts.ts`
- Create: `ui/testing/trainingBookUiFacts.test.ts`
- Create: `ui/testing/tsconfig.trainingBook.json`
- Modify: `ui/testing/runTrainingBookTests.mjs`
- Modify: `docs/book/reference/settings-catalog.json`
- Modify: `docs/book/reference/settings-sources.json`
- Modify: `docs/book/reference/settings-exclusions.json`
- Modify: `testing/training_book_validation_test.py`
- Modify: `scripts/validate_training_book.py`

- [ ] **Step 1: Write failing collector/serialization tests without broad ownership assertions**

Specify `collectTrainingBookUiFacts(repositoryRoot)` in `trainingBookFacts.ts`; have both the test and runner use that one collector. In this RED step use temporary TypeScript fixtures only to cover collection/serialization/path/value behavior and presence semantics; do not add live-repository or catalog ownership assertions yet. The live `modelArchs`, defaults, docs, and form/page assertions are added and made green together with the collector in Step 3, before any partial catalog slice is committed.

Use this emitted contract, validated strictly on both sides:

```ts
export type TrainingBookValueFact =
  | { kind: 'undefined' }
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; items: TrainingBookValueFact[] }
  | { kind: 'object'; entries: Array<{ key: string; value: TrainingBookValueFact }> };

export interface PresenceFact {
  present: boolean;
  value?: TrainingBookValueFact;
}

export interface StaticJsxFact {
  present: boolean;
  text_literals?: string[];
  code_literals?: string[];
  link_hrefs?: string[];
}

export type ModelOptionPredicateFact =
  | { kind: 'always' }
  | { kind: 'truthy'; path: string }
  | { kind: 'nonblank-string'; path: string }
  | { kind: 'not'; operand: ModelOptionPredicateFact }
  | { kind: 'and' | 'or'; operands: [ModelOptionPredicateFact, ModelOptionPredicateFact] };

export interface CustomModelSelectOptionFact {
  label: string;
  options: Array<{ value: string; label: string }>;
  doc: StaticJsxFact;
  get_value_cases: Array<{
    condition: ModelOptionPredicateFact;
    return_value: TrainingBookValueFact;
  }>;
  writes: Array<{
    selected_value: string;
    path: string;
    value: TrainingBookValueFact;
    guard: ModelOptionPredicateFact;
  }>;
}

export interface CustomModelSelectOptionsFact {
  present: boolean;
  value?: CustomModelSelectOptionFact[];
}

export interface ArchitectureDefaultFact {
  declaration_path: string;
  path: string;
  selected: PresenceFact;
  unselected: PresenceFact;
}

export interface ArchitectureDefaultContainerFact {
  path: string;
  selected_present: boolean;
  unselected_present: boolean;
}

export interface ModelArchitectureFact {
  name: string;
  label: string;
  group: string;
  model_path: PresenceFact;
  gate_url: PresenceFact;
  is_video_model: PresenceFact;
  has_multiline_prompts: PresenceFact;
  accuracy_recovery_adapters: PresenceFact;
  sample_tags: PresenceFact;
  custom_model_select_options: CustomModelSelectOptionsFact;
  model_notes: StaticJsxFact;
  controls: string[];
  defaults: ArchitectureDefaultFact[];
  default_containers: ArchitectureDefaultContainerFact[];
  disable_sections: string[];
  additional_sections: string[];
}

export interface UiDefaultFact {
  path: string;
  value: PresenceFact;
  source_path: string;
  symbol: string;
}

export interface UiSourceClaim {
  source_path: string;
  symbol: string;
  path: string;
  kind: 'setter' | 'default' | 'doc' | 'setting' | 'server-state';
  ui_label: PresenceFact;
  value_contract: {
    ui_type: 'boolean' | 'integer' | 'number' | 'string' | 'path' |
      'boolean-list' | 'integer-list' | 'number-list' | 'string-list' |
      'object' | 'object-list' | null;
    widget_kind: 'checkbox' | 'number' | 'text' | 'multiline' | 'path' | 'select' | 'json' | 'read-only' | null;
    optional: boolean;
    nullable: boolean;
    accepted_values?: TrainingBookValueFact[];
    minimum?: number;
    maximum?: number;
  };
}

export interface ArchitectureTransitionFact {
  architecture: string;
  path: string;
  selected: PresenceFact;
  unselected: PresenceFact;
}

export interface TrainingBookUiFacts {
  schema_version: 1;
  model_architectures: ModelArchitectureFact[];
  defaults: UiDefaultFact[];
  config_claims: UiSourceClaim[];
  global_settings: UiSourceClaim[];
  architecture_transitions: ArchitectureTransitionFact[];
}

export function collectTrainingBookUiFacts(repositoryRoot: string): TrainingBookUiFacts;
export function writeTrainingBookUiFacts(
  repositoryRoot: string,
  destination: string,
): void;
```

The runner writes this JSON only below its owned temporary directory and passes it to Python as `--ui-facts <path>`. `validate_training_book.py` rejects extra/missing fields, duplicate claims, source groups declared as `typescript-test` with no emitted claim, any catalog UI claim absent from emitted facts, and any catalog `ui_label`/`ui_type`/accepted-values/range/nullability/optionality claim that differs from its emitted claim. Visible controls emit the resolved static label as a presence-aware string; dynamic/unresolvable labels fail unless the exact symbol is excluded, while non-control claims emit label absence. `ui_type` uses the same closed enum as `contract.ui_type` in the catalog and describes what the current UI actually accepts; `widget_kind` independently records the control presentation. Neither may be inferred from parser/support/example types or from the other. In the representative `train.steps` entry, parser type remains `integer`, supported type `positive-integer`, example type `integer`, but emitted/catalog `ui_type` is `number` because the current `NumberInput` uses `step="any"` and `Number(rawValue)` rather than enforcing integral input. Add a regression for that wider-UI/narrower-runtime distinction. Catalog entries with no UI surface use `ui_type: null`, and non-control/server facts use the factual semantic type when known plus `widget_kind: 'read-only'` or `null` as appropriate.

`TrainingBookValueFact` is the only emitted value representation: object entries are code-point sorted, numbers are finite, and functions/symbols/classes/React elements are rejected. This tagged form preserves explicit `undefined` recursively instead of relying on `JSON.stringify` to retain it. A strict validator rejects `{present: true}` without an own `value`, `{present: false, value: ...}`, the wrong tag fields, duplicate object-entry keys, or noncanonical entry order.

Normalize emitted config paths with one tokenizing function shared by tests and the collector. It rewrites the current single-process literal `config.process[0]` to canonical `config.process[*]` and the literal `datasets[x]` placeholder in `modelArchs.defaults` to `datasets[*]`. It also maps an interpolated index to `[*]` only when the TypeScript AST/dataflow proves that identifier is the index of a direct `.map`/indexed iteration over the exact repeatable array named by the path: `datasets`, `train.validation_config.validation_items`, or `sample.samples`. Follow the current finite local index-carrying adapter used by the sample-prompt modal (`{index: i}` from the mapped `sample.samples` row into its callback), but reject an unbound/same-named callback parameter. Finite template property keys such as a statically resolved options object or control-key array are expanded into separate literal paths before normalization. Reject any other numeric index, free/computed bracket expression, prefix/string-replacement approximation, unresolved dataflow, or unresolved template. Tests require both `config.process[0].datasets[x].fps` and a map-bound ``config.process[0].sample.samples[${i}].prompt`` to become their `[*]` forms, cover validation-item and modal-adapter indices, verify equality with catalog grammar, and mutation-test unknown indices/placeholders plus an unbound `i`.

Architecture defaults whose selected/unselected values are plain objects are not owned as one open-map parent. Recursively expand their union of own object leaves into `ArchitectureDefaultFact` rows with canonical leaf `path`, the original canonical `declaration_path`, and presence-aware selected/unselected values; arrays remain typed leaf values. Emit every traversed object container separately in `default_containers` so an empty or absent parent is still distinguishable. Container rows are structural drift metadata attached to their descendant declaration, not additional setting-owner identities: every nonempty container must have at least one separately owned descendant leaf with the same `declaration_path`, while an empty container requires an exact structural exclusion. Thus whole `model.model_kwargs` and `sample` declarations map to separately owned known leaf settings, while an added unknown leaf fails catalog/exclusion ownership without double-owning the parent. Sort leaves/containers by code point and mutation-test nested add/remove/value/presence drift.

`isVideoModel`, `hasMultiLinePrompts`, `accuracyRecoveryAdapters`, and `sampleTags` are emitted for every architecture as presence facts. Never serialize `customModelSelectOptions` functions or `modelNotes` React nodes. Parse their object/JSX/function ASTs into the JSON-safe projections above: exact labels/options/doc text and links; ordered, alias-resolved condition→return cases; and each option branch's setter path/literal-or-undefined value/exact guard predicate. Reduce only the closed predicate grammar above (including nonblank `.trim()` checks); reject unsupported calls, computed paths, mutation, or control flow rather than emitting a lossy summary. `model_notes` captures ordered static prose/code/link literals, including current model-path/download guidance, and fails if an unsupported dynamic expression would be silently dropped. Mutation tests change a getter read, return-to-branch binding, `&&`/`||` operator, setter path/value/guard, option, note path/text, or dynamic JSX expression and require a precise fact mismatch. Every current `ModelArch` field is either represented by this contract or named by an exact-symbol exclusion; no model-selection field may disappear silently.

- [ ] **Step 2: Compile/run and verify RED**

Run: `cd ui && npx tsc --project testing/tsconfig.trainingBook.json --noEmit`

Expected: FAIL until the new test and its catalog-facing helpers/types compile.

- [ ] **Step 3: Implement and commit the facts-only collector boundary**

Implement the collector, tagged serializer, AST projections, exact path normalization, and a closed `node testing/runTrainingBookTests.mjs --facts-only` mode. Add the live collector tests now: import `modelArchs`, `defaultJobConfig`, `defaultDatasetConfig`, sample defaults, and current types; parse `ui/src/docs.tsx` plus form/page sources; require exact ordered equality with the manifest's full/preset/focused architecture sets and validate the emitted live shape. Facts-only compiles/runs all temporary and live collector tests, writes facts only beneath an owned `mkdtemp`, validates the strict JSON shape/manifest architecture equality, and deliberately does not invoke incomplete catalog ownership. Reject unknown flags or combining facts-only with full runner modes.

Run: `cd ui && node testing/runTrainingBookTests.mjs --facts-only`

Expected: PASS. Commit this green collector infrastructure before cataloging its emitted facts:

```bash
git add ui/testing/trainingBookFacts.ts ui/testing/trainingBookUiFacts.test.ts ui/testing/tsconfig.trainingBook.json ui/testing/runTrainingBookTests.mjs
git commit -m "test: collect live training book UI facts"
```

- [ ] **Step 4: Close ModelConfig and root/CLI/environment inventory**

Add only the `model-config` production assertion, require RED, and own all 60 `ModelConfig` reads: paths/extras/TE/VAE, quantization/qtypes/ARA, low-VRAM/layer offloading, compile, stages, assistants/unconditional LoRAs, and normalization. Commit it green. Then add only `cli-environment`, require RED, and own `run.py` flags, root/job envelope expansion, user-relevant environment variables, and config environment/name expansion. Run each scope independently to zero.

Commit model config and CLI/environment as two separate commits: `docs: catalog model settings` and `docs: catalog CLI and environment settings`.

- [ ] **Step 5: Close first-party model-kwargs families**

Use the manifest's 51 architectures to map every applicable first-party consumer under `extensions_built_in/diffusion_models/**/*.py`, `extensions_built_in/flex2/**/*.py`, `extensions_built_in/audio_models/**/*.py`, and `toolkit/models/**/*.py`. Resolve the `mkw` alias and finite LTX/Minimax component-path templates; fail on any unresolved dynamic key. Work in manifest-order family slices (`anima/flux/flex/chroma`, Wan, Qwen/SD, remaining image/video/audio): add only that family's assertion, require RED, own it to zero, rerun prior slices, and commit before enabling the next. Overview-only architectures receive factual reference ownership without recipe claims.

Commit each of the four named family slices independently as `docs: catalog <family-slice> model kwargs`.

- [ ] **Step 6: Close UI defaults, transitions, docs, and visibility facts**

Add only the `ui-defaults-transitions` production assertion and require RED. Own every emitted default, setter path, migration/alias, architecture on-select/on-leave override, disabled/additional section, gate, control/modality, doc key, and UI-only state fact from `trainingBookFacts.ts`. Compare defaults with property-presence semantics and require no selected UI slice claim without catalog/exclusion ownership.

Commit this slice as `docs: catalog UI defaults and transitions`.

- [ ] **Step 7: Close server/global settings facts**

Add only the `ui-server-global` production assertion and require RED. Classify global settings, API/server-overwritten values, queue/UI transient state, auth token transport, cron/layout/middleware environment reads, and other declared server facts by user authority/persistence or exact exclusion. Run `ui-server-global` to zero; do not render server-owned/excluded values as user-configurable.

Commit this slice as `docs: catalog global and server settings`.

- [ ] **Step 8: Enable full ownership in the runner**

Extend the facts-only runner using the existing temporary TypeScript pattern: compile to a `mkdtemp` directory, create the `@` alias and required React/icon stubs, require every `trainingBook*.test.tsx?` artifact, emit canonical UI facts from `trainingBookFacts.ts` into that owned directory, invoke `validate_training_book.py --check-discovery --ui-facts <owned-path>`, and clean only the validated temp directory. Add source-contract assertions that optional/missing test artifacts cannot be skipped. Enable the aggregate production UI ownership assertion only now, after every named UI slice is green.

Commit the full runner/aggregate-ownership boundary as `test: verify live training book UI facts` before the complete-union check.

- [ ] **Step 9: Run complete discovery ownership**

Run: `cd ui && npm run test:training-book`

Expected: PASS for unit/discovery/UI-fact tests with zero unowned Python or UI facts, zero stale source claims, and zero unexplained exclusions; book-file integration is still added later.

- [ ] **Step 10: Commit a correction only if the complete-union check exposed one**

If the complete-union check needs no correction, do not create an aggregate commit. Otherwise commit only the focused integration correction as `test: close exhaustive training setting ownership`.

### Task 7: Generate committed reference pages from the catalog

**Files:**
- Create: `scripts/generate_training_book_reference.py`
- Create: `scripts/training_book/markdown.py`
- Create: `docs/book/reference/job-and-model.md`
- Create: `docs/book/reference/network.md`
- Create: `docs/book/reference/training.md`
- Create: `docs/book/reference/dataset.md`
- Create: `docs/book/reference/masks-and-preservation.md`
- Create: `docs/book/reference/saving-and-sampling.md`
- Create: `docs/book/reference/optimizers-and-schedulers.md`
- Create: `docs/book/reference/advanced-only-settings.md`
- Modify: `testing/training_book_validation_test.py`
- Modify: `scripts/validate_training_book.py`

- [ ] **Step 1: Write failing renderer/parity tests**

Test deterministic section ordering, stable anchors, escaping, duplicate-anchor rejection, hand-written text preservation outside markers, and `--check` failure after a generated line is altered.

```markdown
<!-- settings-catalog:start -->
<!-- generated; edit settings-catalog.json instead -->
<a id="train-steps"></a>
### `train.steps`

Sets the total target optimizer step count.

- YAML: `config.process[*].train.steps`
- UI-created value: `3000`
- Engine fallback: `2000`
- Example: `steps: 3000`
<!-- settings-catalog:end -->
```

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k generated`

Expected: FAIL because the renderer and reference pages are absent.

- [ ] **Step 3: Implement the generator and author introductions**

Each reference page gets a concise hand-written introduction explaining authority/default distinctions, followed by one generated block. Render label/path, surfaces, types/ranges/null behavior, UI default, engine fallback, architecture overrides, normalization, effect, benefits, drawbacks, interactions, example, and source symbols. Never label two differing values simply “default.”

- [ ] **Step 4: Generate, check, test, and commit**

Run: `python scripts/generate_training_book_reference.py`

Expected: all eight generated blocks updated.

Run: `python scripts/generate_training_book_reference.py --check`

Expected: PASS with no diff.

Run: `python testing/training_book_validation_test.py -k generated`

Expected: PASS.

```bash
git add scripts/generate_training_book_reference.py scripts/training_book/markdown.py scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/reference
git commit -m "docs: generate exhaustive LoRA settings reference"
```

### Task 8: Add typed, semantically validated example configurations

**Files:**
- Create: `scripts/training_book/examples.py`
- Create: `docs/book/examples/README.md`
- Create: `docs/book/examples/manifest.json`
- Create: `docs/book/examples/first-lora-flex1.yaml`
- Create: `docs/book/examples/character-anima.yaml`
- Create: `docs/book/examples/style-flux.yaml`
- Create: `docs/book/examples/flux-kontext-edit.yaml`
- Create: `docs/book/examples/object-qwen-image.yaml`
- Create: `docs/book/examples/focused-refinement-qwen-image-edit-2509.yaml`
- Create: `docs/book/examples/low-vram-anima.yaml`
- Create: `docs/book/examples/diagnostic-wan21-1b.yaml`
- Create: `docs/book/examples/character-sdxl.yaml`
- Create: `docs/book/examples/character-sd15.yaml`
- Create: `docs/book/examples/motion-wan22-14b-t2v.yaml`
- Create: `docs/book/examples/masked-refinement.yaml`
- Create: `docs/book/examples/resume-from-checkpoint.yaml`
- Modify: `testing/training_book_validation_test.py`
- Modify: `scripts/validate_training_book.py`

- [ ] **Step 1: Write failing example-manifest and semantic tests**

Assert exact YAML-file equality, exactly one README/manifest, no other files, typed token declaration/use, no undeclared or unused token, owned catalog keys only, current `diffusion_trainer`/LoRA shape, architecture/profile agreement, and rejection of invalid discriminators/incompatible controls. Include mutation tests for a typo silently accepted by `**kwargs`, path traversal, duplicate manifest row, and invalid mask/turbo combination.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k examples`

Expected: FAIL because `docs/book/examples/manifest.json` is missing.

- [ ] **Step 3: Implement typed substitution and semantic validation**

Expose:

```python
@dataclass(frozen=True)
class TokenDeclaration:
    name: str
    type: Literal["path", "string"]

@dataclass(frozen=True)
class ExampleEntry:
    path: str
    architecture: str
    roles: tuple[str, ...]
    chapters: tuple[str, ...]
    validation_profile: Literal[
        "image-lora", "image-edit-lora", "masked-image-lora", "video-lora", "resume-image-lora"
    ]
    tokens: tuple[TokenDeclaration, ...]

@dataclass(frozen=True)
class ExampleManifest:
    schema_version: Literal[1]
    book_revision: Literal[1]
    examples: tuple[ExampleEntry, ...]

load_example_manifest(path: Path) -> ExampleManifest
substitute_typed_tokens(
    value: JsonValue,
    declarations: Mapping[str, TokenDeclaration],
    fixture_root: Path,
) -> JsonValue
validate_example(repository_root: Path, entry: ExampleEntry, catalog: SettingsCatalog) -> None
```

Only `${DATASET_DIR}`, `${OUTPUT_DIR}`, `${CONTROL_DIR}`, `${CONTROL_IMAGE}`, `${MASK_DIR}`, `${CHECKPOINT_PATH}`, and `${JOB_NAME}` are allowed, with declared types and deterministic local fixture replacements derived by the validator rather than serialized in the manifest. The exact replacements are `fixture_root/dataset`, `fixture_root/output`, `fixture_root/controls`, `fixture_root/sample-control.png`, `fixture_root/masks`, `fixture_root/checkpoint.safetensors`, and scalar `training-book-example`, respectively; every path is canonically confined under the owned temporary root. Create a fixed RGB `dataset/example.png` plus `example.txt`, a same-dimension filename-matched `controls/example.png`, a same-dimension grayscale `masks/example.png`, a distinct valid RGB `sample-control.png` regular file, and a non-executable minimal safetensors checkpoint/metadata fixture. Tests prove directory fields receive directories, image fields receive regular decodable image files, control/mask basenames and dimensions match the dataset fixture, and source/control sample paths are distinct. Parse YAML first and substitute typed values structurally so a path token cannot change YAML shape or silently coerce a numeric field. Run `preprocess_config`, `preprocess_dataset_raw_config`, `NetworkConfig`, `TrainConfig`, `ModelConfig`, `SaveConfig`, `SampleConfig`, `LoggingConfig`, each resulting `DatasetConfig`, `validate_configs`, and the known pure pre-init compatibility rules. Never import or instantiate a trainer, model, or optimizer.

Strict manifest loading rejects extra/missing keys, duplicate paths/tokens/roles/chapters, nonportable paths, a chapter outside the book manifest, an architecture outside `full_architectures`, or an empty array/string. Substitution separately rejects any derived path replacement that is not canonically confined beneath the validator's temporary fixture root.

- [ ] **Step 4: Author the exact 13 YAML profiles and literal manifest rows**

Use this exact manifest matrix; token declarations are ordered and written as `{name, type}` records, with `path` meaning a fixture-confined local path and `string` meaning a scalar that cannot alter YAML structure:

| YAML | `architecture` | ordered `roles` | ordered `chapters` | `validation_profile` | ordered tokens |
|---|---|---|---|---|---|
| `first-lora-flex1.yaml` | `flex1` | `first-run`, `object` | `getting-started/first-lora.md`, `recipes/object-concept.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `character-anima.yaml` | `anima` | `character`, `identity` | `recipes/character-identity.md`, `models/anima.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `style-flux.yaml` | `flux` | `style` | `recipes/style.md`, `models/flux-and-flex.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `flux-kontext-edit.yaml` | `flux_kontext` | `edit`, `control` | `datasets/controls-video-audio.md`, `models/flux-and-flex.md` | `image-edit-lora` | `DATASET_DIR:path`, `CONTROL_DIR:path`, `CONTROL_IMAGE:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `object-qwen-image.yaml` | `qwen_image` | `object` | `recipes/object-concept.md`, `models/qwen-image-and-edit.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `focused-refinement-qwen-image-edit-2509.yaml` | `qwen_image_edit_plus` | `refinement`, `edit` | `recipes/focused-refinement.md`, `models/qwen-image-and-edit.md` | `image-edit-lora` | `DATASET_DIR:path`, `CONTROL_DIR:path`, `CONTROL_IMAGE:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `low-vram-anima.yaml` | `anima` | `low-vram`, `character` | `recipes/low-vram.md`, `models/anima.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `diagnostic-wan21-1b.yaml` | `wan21:1b` | `diagnostic`, `video` | `recipes/diagnostic-run.md`, `models/wan.md` | `video-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `character-sdxl.yaml` | `sdxl` | `character`, `identity` | `recipes/character-identity.md`, `models/sdxl-and-sd15.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `character-sd15.yaml` | `sd15` | `character`, `identity` | `recipes/character-identity.md`, `models/sdxl-and-sd15.md` | `image-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `motion-wan22-14b-t2v.yaml` | `wan22_14b:t2v` | `motion`, `video` | `models/wan.md`, `datasets/controls-video-audio.md` | `video-lora` | `DATASET_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `masked-refinement.yaml` | `anima` | `refinement`, `mask` | `recipes/focused-refinement.md`, `datasets/masks.md` | `masked-image-lora` | `DATASET_DIR:path`, `MASK_DIR:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |
| `resume-from-checkpoint.yaml` | `flex1` | `resume`, `object` | `workflow/saving-resuming-and-optimizer-state.md`, `getting-started/first-lora.md` | `resume-image-lora` | `DATASET_DIR:path`, `CHECKPOINT_PATH:path`, `OUTPUT_DIR:path`, `JOB_NAME:string` |

Every declared token appears at least once and no undeclared token appears. Use only current catalog keys, modality-appropriate dataset settings, fixed-seed samples, and local UI logging with Hub/W&B disabled.

Every YAML starts from this exact baseline: schema 1 extension job; name `${JOB_NAME}`; training folder `${OUTPUT_DIR}`; one `diffusion_trainer`; one `${DATASET_DIR}` dataset with `caption_ext: txt`, dropout `0.05`, shuffle false, latent-to-disk cache true, and the row resolution; LoRA network with row rank/alpha; batch/accumulation 1; UNet true, text encoder false, gradient checkpointing true; AdamW8bit, LR row value, constant LR scheduler, bf16/MSE; save bf16 diffusers every 250 with four retained (one for diagnostic); local UI logger true and W&B/Hub false; sample every 250 from step 0, seed 42, `walk_seed: false`, one concrete `[trigger]` prompt/item, and row dimensions/guidance/steps/frames/FPS. No example contains a personal path, remote repository destination, or unresolved placeholder.

Apply these exact overlays:

| YAML | model path | rank | LR | total steps | dataset resolution | memory/cache overlay | sample overlay | special fields |
|---|---|---:|---:|---:|---|---|---|---|
| `first-lora-flex1.yaml` | `ostris/Flex.1-alpha` | 16 | `1e-4` | 2000 | `[512,768,1024]` | model/TE `qfloat8`; TE cache false | `1024x1024`, g4, 25 | bypass guidance true; quantize exclude `*time_text_embed*`; content/sigmoid |
| `character-anima.yaml` | `circlestone-labs/Anima-Base-v1.0-Diffusers` | 32 | `1e-4` | 3000 | `[1024]` | quantization/TE cache false | `1024x1024`, g4, 30 | content/weighted |
| `style-flux.yaml` | `black-forest-labs/FLUX.1-dev` | 16 | `1e-4` | 2000 | `[512,768,1024]` | model/TE `qfloat8`; TE cache false | `1024x1024`, g4, 20 | style/sigmoid |
| `flux-kontext-edit.yaml` | `black-forest-labs/FLUX.1-Kontext-dev` | 16 | `1e-4` | 2000 | `[512,768]` | model/TE `qfloat8`; TE cache true | one `${CONTROL_IMAGE}` `ctrl_img`; `1024x1024`, g4, 20 | dataset `control_path: ${CONTROL_DIR}`; weighted |
| `object-qwen-image.yaml` | `Qwen/Qwen-Image` | 16 | `1e-4` | 2000 | `[512,768,1024]` | model/TE `qfloat8`; low-VRAM and TE cache true | `1024x1024`, g3, 25 | content/weighted |
| `focused-refinement-qwen-image-edit-2509.yaml` | `Qwen/Qwen-Image-Edit-2509` | 16 | `1e-4` | 3000 | `[512,768,1024]` | model/TE `qfloat8`; low-VRAM and TE cache true | one `${CONTROL_IMAGE}` `ctrl_img`; `1024x1024`, g3, 25 | dataset `control_path: ${CONTROL_DIR}`; `match_target_res:false`; style/weighted |
| `low-vram-anima.yaml` | `circlestone-labs/Anima-Base-v1.0-Diffusers` | 32 | `5e-5` | 3000 | `[512,768]` | low-VRAM and TE cache true; quantization false | `768x768`, g4, 30 | content/weighted; no VRAM guarantee |
| `diagnostic-wan21-1b.yaml` | `Wan-AI/Wan2.1-T2V-1.3B-Diffusers` | 32 | `1e-4` | 250 | `[632]` | model quantization false; TE `qfloat8`; TE cache true | `832x480`, g5, 30, 41 frames/16 FPS | dataset 41 frames/16 FPS; balanced/sigmoid; keep 1 |
| `character-sdxl.yaml` | `stabilityai/stable-diffusion-xl-base-1.0` | 32/conv16 | `1e-4` | 3000 | `[512,768,1024]` | quantization/TE cache false | `1024x1024`, g6, 30 | DDPM; content/sigmoid |
| `character-sd15.yaml` | `stable-diffusion-v1-5/stable-diffusion-v1-5` | 32/conv16 | `1e-4` | 3000 | `[512]` | quantization/TE cache false | `512x512`, g6, 30 | DDPM; content/sigmoid |
| `motion-wan22-14b-t2v.yaml` | `ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16` | 32 | `5e-5` | 2000 | `[512,768,1024]` | model/TE `qfloat8`; low-VRAM and TE cache true | `1024x1024`, g3.5, 25, 41 frames/16 FPS | high+low noise true; boundary 10; content/linear |
| `masked-refinement.yaml` | `circlestone-labs/Anima-Base-v1.0-Diffusers` | 32 | `2e-5` | 3000 | `[1024]` | quantization/TE cache false | `1024x1024`, g4, 30 | `${MASK_DIR}`; min `0.1`; invert false; inverted prior true/`0.5`; Turbo false |
| `resume-from-checkpoint.yaml` | `ostris/Flex.1-alpha` | 16 | `1e-4` | 3000 | `[512,768,1024]` | model/TE `qfloat8`; TE cache false | `1024x1024`, g4, 25 | pretrained LoRA `${CHECKPOINT_PATH}`; `start_step:250`; same name/output identity; bypass guidance true |

Rows using `qfloat8` set both quantization booleans and explicit qtypes. Image rows use one frame/FPS 1. Edit datasets use filename-matched files beneath the directory `${CONTROL_DIR}`, while sample `ctrl_img` points to the distinct regular PNG `${CONTROL_IMAGE}`; semantic tests assert the directory/file roles and reject supplying `CONTROL_DIR` to the image-opening sample field. The resume validator fixture puts compatible LoRA weights/metadata at `${CHECKPOINT_PATH}`, but places an inert optimizer-state fixture at the engine's expected save root `${OUTPUT_DIR}/training-book-example/optimizer.pt` (`training_folder / name`), not beneath the pretrained-LoRA path. Task 8 validates only the two exact configured/discovery paths, unchanged output/name identity, `start_step`, metadata compatibility, and a source/pure-helper contract proving configured LR overrides a restored optimizer LR; it never unpickles the fixture or claims an optimizer was restored. Actual optimizer loading, continued step progress, and observed LR preservation are reserved for Task 16's supported-GPU smoke.

- [ ] **Step 5: Run semantic validation and commit**

Run: `python scripts/validate_training_book.py --check-examples`

Expected: PASS for all 13 examples.

Run: `python testing/training_book_validation_test.py -k examples`

Expected: PASS.

```bash
git add scripts/training_book/examples.py scripts/validate_training_book.py testing/training_book_validation_test.py docs/book/examples
git commit -m "docs: add validated LoRA configuration examples"
```

## Commit-sized narrative page protocol for Tasks 9–13

For each row below, complete this entire cycle before starting the next row:

1. Add only that row's focused repository subtest—never tests for later rows—and run `python testing/training_book_validation_test.py -k <selector>`; require RED naming only the missing/invalid page. Shared parser/contract helpers are covered by already-green temporary-fixture tests, not by enabling all future page assertions at once.
2. Create only that Markdown page with its H1, TOC link, required content headings, source/catalog links, and empty navigation/verification markers (plus recipe markers where applicable). For a model page, add its `model-facts` markers and run the reference generator for that page before the focused GREEN check, so the block is populated in the same commit rather than deferred.
3. Run the same selector and require GREEN. Then run the task-level selector: because only completed-row repository tests exist at that point, it must also be GREEN. Run `python testing/training_book_validation_test.py -k staged_pages` to revalidate every Markdown page currently present.
4. Stage only that page plus its focused test and commit with the exact message below.

During this staged protocol, a relative link may target a not-yet-created page only when the normalized target is an exact path in `book-manifest.json` and the link has no fragment. Existing targets must resolve immediately and every fragment on an existing page must name a real anchor. Traversal, absolute paths, backslashes, undeclared targets, and fragments on absent targets always fail. Task 14 enables the final exact-page-set/link mode and requires every manifest target and anchor to exist. This narrowly allows early chapters to link forward without weakening the final link contract.

| page | selector | commit message |
|---|---|---|
| `getting-started/prerequisites.md` | `page_prerequisites` | `docs: add LoRA training prerequisites` |
| `getting-started/choose-a-model.md` | `page_choose_model` | `docs: add LoRA model selection guide` |
| `getting-started/first-lora.md` | `page_first_lora` | `docs: add first LoRA walkthrough` |
| `getting-started/training-mental-model.md` | `page_training_mental_model` | `docs: explain LoRA training fundamentals` |
| `workflow/simple-ui.md` | `page_simple_ui` | `docs: document Simple and Advanced job editing` |
| `workflow/sampling-and-evaluation.md` | `page_sampling_evaluation` | `docs: document LoRA sampling and evaluation` |
| `workflow/loss-and-checkpoints.md` | `page_loss_checkpoints` | `docs: explain LoRA loss and checkpoints` |
| `workflow/queue-and-multiple-gpus.md` | `page_queue_gpus` | `docs: document queue and GPU behavior` |
| `workflow/saving-resuming-and-optimizer-state.md` | `page_resume_optimizer` | `docs: document checkpoint and optimizer resume` |
| `datasets/curation.md` | `page_dataset_curation` | `docs: add dataset curation guide` |
| `datasets/captions-and-triggers.md` | `page_captions_triggers` | `docs: add caption and trigger guide` |
| `datasets/resolution-and-bucketing.md` | `page_resolution_bucketing` | `docs: add resolution and bucketing guide` |
| `datasets/masks.md` | `page_dataset_masks` | `docs: add mask training guide` |
| `datasets/controls-video-audio.md` | `page_dataset_modalities` | `docs: add control video and audio dataset guide` |
| `datasets/rights-privacy-and-safety.md` | `page_dataset_safety` | `docs: add dataset rights and safety guide` |
| `recipes/character-identity.md` | `page_recipe_character` | `docs: add character identity recipe` |
| `recipes/style.md` | `page_recipe_style` | `docs: add style recipe` |
| `recipes/object-concept.md` | `page_recipe_object` | `docs: add object concept recipe` |
| `recipes/focused-refinement.md` | `page_recipe_refinement` | `docs: add focused refinement recipe` |
| `recipes/low-vram.md` | `page_recipe_low_vram` | `docs: add low VRAM recipe` |
| `recipes/diagnostic-run.md` | `page_recipe_diagnostic` | `docs: add diagnostic run recipe` |
| `models/anima.md` | `page_model_anima` | `docs: add Anima training guide` |
| `models/flux-and-flex.md` | `page_model_flux_flex` | `docs: add FLUX and Flex training guide` |
| `models/qwen-image-and-edit.md` | `page_model_qwen` | `docs: add Qwen Image training guide` |
| `models/sdxl-and-sd15.md` | `page_model_sd` | `docs: add Stable Diffusion training guide` |
| `models/wan.md` | `page_model_wan` | `docs: add Wan training guide` |
| `advanced/yaml-and-cli.md` | `page_advanced_yaml_cli` | `docs: add Advanced YAML and CLI guide` |
| `advanced/layer-targeting.md` | `page_advanced_layers` | `docs: add LoRA layer targeting guide` |
| `advanced/performance-and-caching.md` | `page_advanced_performance` | `docs: add performance and caching guide` |
| `advanced/extending-and-debugging.md` | `page_advanced_debugging` | `docs: add extension and debugging guide` |
| `troubleshooting/diagnosis-guide.md` | `page_diagnosis` | `docs: add LoRA diagnosis guide` |
| `troubleshooting/common-failure-patterns.md` | `page_failures` | `docs: add LoRA failure patterns` |
| `glossary.md` | `page_glossary` | `docs: add LoRA training glossary` |

### Task 9: Write the beginner path and workflow chapters

**Files:**
- Create: `docs/book/getting-started/prerequisites.md`
- Create: `docs/book/getting-started/choose-a-model.md`
- Create: `docs/book/getting-started/first-lora.md`
- Create: `docs/book/getting-started/training-mental-model.md`
- Create: `docs/book/workflow/simple-ui.md`
- Create: `docs/book/workflow/sampling-and-evaluation.md`
- Create: `docs/book/workflow/loss-and-checkpoints.md`
- Create: `docs/book/workflow/queue-and-multiple-gpus.md`
- Create: `docs/book/workflow/saving-resuming-and-optimizer-state.md`
- Modify: `scripts/training_book/markdown.py`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add and commit green shared staged-page contracts**

Add temporary-fixture unit tests for one H1, unique explicit/derived anchors, table-of-contents/navigation/footer marker boundaries, staged forward-link rules, and prohibited claims. Add the `staged_pages` integration selector here: it validates only Markdown pages currently present, using the exact manifest-declared future-link exception in the global protocol, and must never require an absent page.

Run: `python testing/training_book_validation_test.py -k narrative_contract`

Run: `python testing/training_book_validation_test.py -k staged_pages`

Expected: both PASS before repository narrative pages are added. Commit this green shared infrastructure separately:

```bash
git add scripts/training_book/markdown.py testing/training_book_validation_test.py
git commit -m "test: add staged training book page contracts"
```

- [ ] **Step 2: Add only the first failing page test**

Add only `page_prerequisites`, requiring its page-specific sections and rejecting language that calls the lowest loss “best,” describes independent queue keys as distributed training, or says `optimizer.pt` contains LoRA weights. Each later page-specific assertion is added only in that row's protocol cycle.

Run: `python testing/training_book_validation_test.py -k beginner`

Expected: FAIL naming only the missing `getting-started/prerequisites.md`; no test for a later page is enabled yet.

- [ ] **Step 3: Deliver the four getting-started chapters one at a time**

Use these exact teaching responsibilities:

```text
prerequisites.md: install/start/authentication, storage, supported GPU, model access, dataset rights
choose-a-model.md: full 51-architecture factual overview, modality, access, memory uncertainty, focused-family links
first-lora.md: dataset creation, Simple editor, fixed samples, queue/start, checkpoints, comparison, stop/resume
training-mental-model.md: base model + captions + noise + gradient + LoRA, rank/LR/steps, over/underfitting
```

The first run uses `first-lora-flex1.yaml`, requires no Advanced YAML, and ends with a fixed-seed checkpoint comparison and the safe resume chapter.

Use the exact per-page RED/GREEN/commit protocol and selectors above; do not batch these four pages into one commit.

- [ ] **Step 4: Deliver the five workflow chapters one at a time**

Cover Simple/Advanced editing; save/import/clone; queue grouping by exact `gpu_ids`; independent single-process jobs on separate queue keys; start/stop/return-to-queue/hung recovery; Save Next Step/Sample Next Step; fixed seed and prompt diversity; raw versus smoothed loss; valleys versus peaks; checkpoint/sample cadence; newest-checkpoint discovery; `train.start_step`; `network.pretrained_lora_path`; compatible `optimizer.pt`; preserved LR; compatible/incompatible changes; pruning; interrupted/corrupt state recovery.

State explicitly that the UI does not provide distributed multi-GPU training or global exclusion across differently written queue keys.

Use the exact per-page RED/GREEN/commit protocol and selectors above; do not batch these five pages.

- [ ] **Step 5: Run combined narrative checks**

Run: `python testing/training_book_validation_test.py -k beginner`

Expected: PASS.

Expected: all nine already committed page slices remain green. Do not create an aggregate commit unless this combined check exposes a focused test-only correction.

### Task 10: Write dataset, caption, mask, modality, and safety chapters

**Files:**
- Create: `docs/book/datasets/curation.md`
- Create: `docs/book/datasets/captions-and-triggers.md`
- Create: `docs/book/datasets/resolution-and-bucketing.md`
- Create: `docs/book/datasets/masks.md`
- Create: `docs/book/datasets/controls-video-audio.md`
- Create: `docs/book/datasets/rights-privacy-and-safety.md`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add only the first failing dataset-page test**

Add only `page_dataset_curation`, requiring anchors for duplicates/outliers/variety and its source/catalog claims. Add the caption, buckets, mask, modality, preset/cache, and rights/consent/privacy assertions only with their corresponding page rows. The later mask-focused test requires both ordinary and inverted semantics without an ambiguous “white learns more” sentence.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k dataset_chapters`

Expected: FAIL naming only the missing `curation.md` page.

- [ ] **Step 3: Deliver all six chapters one at a time from loader/catalog facts**

Explain subject/style/object/edit/image/video goals; quality versus quantity; exact and near duplicates; outliers; pose/background/lighting balance; captions/extensions/defaults/dropout/shuffle; trigger placement; aspect buckets and no-detail-restoring upscale; repeats/weights/reg; dataset version provenance and source-missing retention; cache reuse boundaries; grayscale masks where ordinary white is fully included and black is reduced toward `mask_min_value`; `invert_mask`; all-white-as-no-mask storage; inverted-mask prior cost and Turbo incompatibility; matched controls; frame count/FPS/I2V; audio normalize/pitch; licenses, consent, privacy, and sensitive content.

Use the six exact dataset rows in the per-page protocol; each page gets its own failing selector and commit.

- [ ] **Step 4: Run combined dataset checks**

Run: `python testing/training_book_validation_test.py -k dataset_chapters`

Expected: PASS with every factual setting link resolving to a catalog anchor.

Expected: all six already committed dataset pages remain green. Do not create an aggregate commit unless link integration requires a focused test-only correction.

### Task 11: Write the six reusable recipe chapters

**Files:**
- Create: `docs/book/recipes/character-identity.md`
- Create: `docs/book/recipes/style.md`
- Create: `docs/book/recipes/object-concept.md`
- Create: `docs/book/recipes/focused-refinement.md`
- Create: `docs/book/recipes/low-vram.md`
- Create: `docs/book/recipes/diagnostic-run.md`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add and commit green shared recipe contracts**

Use temporary fixtures to make the shared recipe-section and marker parser green. Every completed recipe requires: Objective, Suitable models, Dataset design, Caption pattern, Starting settings and ranges, Sampling plan, Expected learning signals, Common failure modes, Settings deliberately not changed, Model-specific deviations, and Further reading. Require exactly one well-formed marker pair:

```markdown
<!-- built-in-presets:start -->
<!-- built-in-presets:end -->
```

The recipe test accepts an empty block only when invoked with the explicit pre-catalog fixture mode used in this task. Normal/final validation consumes emitted preset facts and requires exact bidirectional ID/name/path membership; it never retains a permanent “must be empty” assertion.

Require these exact relative model-chapter link sets under Model-specific deviations (no fragment while the future page is absent); missing, extra, duplicate, or wrong-family links fail:

| recipe | required model chapters |
|---|---|
| `character-identity.md` | `../models/anima.md`, `../models/flux-and-flex.md`, `../models/sdxl-and-sd15.md`, `../models/wan.md` |
| `style.md` | `../models/flux-and-flex.md`, `../models/sdxl-and-sd15.md` |
| `object-concept.md` | `../models/flux-and-flex.md`, `../models/qwen-image-and-edit.md` |
| `focused-refinement.md` | `../models/anima.md`, `../models/qwen-image-and-edit.md` |
| `low-vram.md` | `../models/anima.md` |
| `diagnostic-run.md` | `../models/anima.md`, `../models/wan.md` |

These links are content outside the generated built-in marker. Recipe-focused checks use the global staged-link mode while model pages are still absent, so exact manifest paths without fragments are valid. Task 12 later proves each target's generated model-facts block owns the expected architecture; final validation joins emitted preset architecture → recipe → linked model-page facts rather than trusting link text alone.

Run: `python testing/training_book_validation_test.py -k recipe_contract`

Expected: PASS. Commit only this green shared test infrastructure:

```bash
git add testing/training_book_validation_test.py
git commit -m "test: add training recipe page contracts"
```

- [ ] **Step 2: Add only the first failing recipe test and verify RED**

Add only `page_recipe_character`; add the remaining repository recipe tests one at a time with their pages.

Run: `python testing/training_book_validation_test.py -k recipes`

Expected: FAIL naming only the missing character recipe.

- [ ] **Step 3: Deliver character, style, object, and refinement recipes one at a time**

Give dataset/caption distinctions and bounded rank/LR/step starting ranges. Focused refinement must cover grayscale masks, `mask_min_value`, inversion, inverted-mask prior, when an all-white mask is equivalent to no mask, and why neither masks nor the prior are enabled automatically.

Use the four corresponding recipe rows in the per-page protocol; preserve the empty preset marker pair in each initial commit.

- [ ] **Step 4: Deliver low-VRAM and diagnostic recipes one at a time**

Low-VRAM explains quantization, text-embedding/latent caches, gradient checkpointing, offloading/throughput trade-offs, preserved dataset resolution, and why no card-capacity guarantee is possible. Diagnostic uses one current 250-step save/sample interval, fixed seed, one retained periodic checkpoint, queue/preflight checks, and states that it tests the pipeline rather than LoRA quality.

Use the two corresponding recipe rows in the per-page protocol and commit each independently.

- [ ] **Step 5: Run combined recipe checks**

Run: `python testing/training_book_validation_test.py -k recipes`

Expected: PASS with all six marker pairs empty and valid under the explicit pre-catalog fixture mode.

Expected: all six already committed recipes remain green with valid pre-catalog marker blocks. Do not create an aggregate content commit.

### Task 12: Write focused model-family chapters

**Files:**
- Create: `docs/book/models/anima.md`
- Create: `docs/book/models/flux-and-flex.md`
- Create: `docs/book/models/qwen-image-and-edit.md`
- Create: `docs/book/models/sdxl-and-sd15.md`
- Create: `docs/book/models/wan.md`
- Modify: `scripts/generate_training_book_reference.py`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add failing temporary-fixture model-fact generator tests**

Using only temporary pages/catalog fixtures, require exact focused identifiers, model paths, gate URLs, schedulers, modalities/controls, architecture UI fields, quantization/offloading notes, dataset expectations, sampling behavior, and incompatibilities. Each model page contains exactly one `<!-- model-facts:start -->` / `<!-- model-facts:end -->` block rendered deterministically from the catalog; Task 6 separately proves those catalog rows equal emitted live UI facts. Add a closed `--page <manifest-relative-model-path>` selector to `generate_training_book_reference.py`; reject missing, non-model, absolute, traversal, or unknown paths. Test that variants without a built-in never receive a preset/quality claim.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k model_fact_generator`

Expected: FAIL because per-page model-fact generation is not implemented.

- [ ] **Step 3: Implement and commit per-page model-fact generation**

Implement deterministic full and `--page` write/check modes. The selected page must already exist and have one balanced marker pair; only marker contents may change. Run the temporary-fixture selector to GREEN, then commit this shared infrastructure before adding any repository model page:

```bash
git add scripts/generate_training_book_reference.py testing/training_book_validation_test.py
git commit -m "test: verify generated model facts"
```

- [ ] **Step 4: Author the four image-family pages independently**

Cover `anima`; `flux`, `flux_kontext`, `flex1`; `qwen_image`, `qwen_image:2512`, `qwen_image_edit`, `qwen_image_edit_plus`, `qwen_image_edit_plus:2511`; and `sdxl`, `sd15`. Generate all default paths, gates, schedulers, controls, UI fields, and architecture overrides into the structured fact blocks from the catalog's UI-verified rows. Explain paired edit/control requirements and variant suffix noninterchangeability in prose.

For each of the first four model rows in the global protocol: add only that focused test, require RED, create the page, run `python scripts/generate_training_book_reference.py --page <row-path>`, require its focused selector plus `-k model_pages` plus `-k staged_pages` GREEN, and commit only the page and that test with the row's exact message. The generated block is therefore nonempty and verified in every page commit.

- [ ] **Step 5: Author the Wan page independently**

Focus recipe claims on `wan21:1b` and `wan22_14b:t2v`; explain frames/FPS, T2V versus I2V, multistage high/low noise, switch boundaries, sampling cost, and resource uncertainty. Mention other Wan entries only in the factual overview.

Use the `models/wan.md` row's focused RED/GREEN/generate/commit cycle exactly as above; do not batch it with the image pages.

- [ ] **Step 6: Run combined checks without an aggregate content commit**

Run: `python scripts/generate_training_book_reference.py --check`

Expected: PASS with all five model-fact blocks populated and no surrounding-prose change.

Run: `python testing/training_book_validation_test.py -k model_pages`

Expected: PASS.

Expected: all five page commits are already green. Do not create an aggregate model-content commit.

### Task 13: Write advanced, troubleshooting, and glossary material

**Files:**
- Create: `docs/book/advanced/yaml-and-cli.md`
- Create: `docs/book/advanced/layer-targeting.md`
- Create: `docs/book/advanced/performance-and-caching.md`
- Create: `docs/book/advanced/extending-and-debugging.md`
- Create: `docs/book/troubleshooting/diagnosis-guide.md`
- Create: `docs/book/troubleshooting/common-failure-patterns.md`
- Create: `docs/book/glossary.md`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add only the first failing advanced-page test**

Add only `page_advanced_yaml_cli`, requiring YAML/CLI precedence and presence semantics. Add module targeting/rank-alpha, performance/cache, extension/debug, diagnosis, failure-pattern, and glossary assertions only with their corresponding page rows.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k advanced`

Expected: FAIL naming only the missing `advanced/yaml-and-cli.md` page.

- [ ] **Step 3: Author the seven pages independently**

Keep model-developer integration APIs and arbitrary third-party optimizer signatures explicitly outside the user-setting contract. Give concrete commands and config excerpts only when the catalog/example validator owns their keys. The diagnosis guide must lead from symptom to evidence to one-variable experiment, not prescribe blind setting changes.

Use each of the seven corresponding rows in the global per-page protocol. Add only that page's focused test, require RED, create the page, require the focused selector plus `-k advanced` plus `-k staged_pages` GREEN, and commit the page/test with its exact row message before starting the next.

- [ ] **Step 4: Run combined checks without an aggregate content commit**

Run: `python testing/training_book_validation_test.py -k advanced`

Expected: PASS.

Expected: all seven page commits are already green. Do not create an aggregate advanced-content commit.

### Task 14: Add the edition manifest, landing page, navigation, and link validation

**Files:**
- Modify: `docs/book/README.md`
- Modify: `docs/book/book-manifest.json`
- Create: `scripts/generate_training_book_navigation.py`
- Modify: `scripts/training_book/manifest.py`
- Modify: `scripts/training_book/markdown.py`
- Modify: `scripts/validate_training_book.py`
- Modify: `testing/training_book_validation_test.py`
- Modify: `ui/testing/runTrainingBookTests.mjs`

- [ ] **Step 1: Add failing repository-level structure/navigation tests**

Require exact equality with all 44 Markdown pages in the approved tree, reciprocal ordered previous/next links, exactly one TOC link on every nonlanding page, one generated footer, unique anchors, valid local links, the exact 9 preset architectures, exact 13 focused architectures, and the 51-entry full architecture order. Allow `verification/first-run-smoke.md` to be absent only when the CLI is explicitly invoked with `--skip-smoke` during this intermediate task. Source-check that the focused runner invokes both generator `--check` commands and the repository validator with its emitted `--ui-facts` file plus `--skip-smoke`; this makes the pre-smoke package command exercise the complete edition rather than unit tests alone. Before `ui/testing/runTrainingPresetCatalogBuildValidation.mjs` exists, the runner passes explicit `--allow-empty-preset-links`; once that emitter exists, it must invoke `--emit-book-facts` and pass `--preset-facts`, with no fallback on partial artifacts or emitter failure. The earlier raw definitions file is not a handoff signal.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-book`

Expected: FAIL through the guarded runner because the skeletal landing page and as-yet ungenerated navigation/footer blocks do not satisfy repository completeness; the runner supplies its emitted UI facts and explicit pre-catalog flags.

- [ ] **Step 3: Finalize the canonical manifest and landing page**

Revalidate the Task 1 `schema_version: 1`, `book_revision: 1`, date `2026-08-14`, exact 44-page order/adjacency, three architecture sets, and footer text `Verified against ai-toolkit-experimental book revision 1 (2026-08-14).` Replace the skeletal landing prose with Beginner, Dataset, Recipes, Model families, Reference, Advanced, Troubleshooting, Examples, and Verification sections and explain starting-point/evidence limits.

- [ ] **Step 4: Implement marker-driven navigation generation**

Every page must contain:

```markdown
<!-- book-navigation:start -->
<!-- book-navigation:end -->

<!-- book-verification:start -->
<!-- book-verification:end -->
```

`generate_training_book_navigation.py` rewrites only those blocks and supports `--check`. It must never rewrite prose outside markers.

At this stage the guarded runner defaults to `--skip-smoke` but also accepts tested `--require-smoke`, which omits the bypass and fails if the record is absent/stale. Reject unknown arguments and the simultaneous presence of skip/require modes. Task 17 changes only the package/default path to require smoke permanently.

- [ ] **Step 5: Generate and validate the complete non-smoke edition**

Run: `python scripts/generate_training_book_navigation.py`

Expected: navigation/footer blocks updated on all existing book pages.

Run: `python scripts/generate_training_book_navigation.py --check`

Expected: PASS.

Run: `cd ui && npm run test:training-book`

Expected: PASS for structure, catalog, source ownership, examples, generated parity, Markdown, architecture sets, and empty recipe marker validity while executing through the guarded fact-emitting runner. Only the current-edition smoke requirement is explicitly deferred. At this pre-catalog point recipe blocks are accepted only through the explicit empty-link flag; after the preset emitter exists the same command automatically switches to emitted bidirectional facts.

- [ ] **Step 6: Commit**

```bash
git add docs/book/README.md docs/book/book-manifest.json docs/book scripts/generate_training_book_navigation.py scripts/training_book scripts/validate_training_book.py testing/training_book_validation_test.py ui/testing/runTrainingBookTests.mjs
git commit -m "docs: assemble versioned LoRA training book"
```

### Task 15: Link the canonical book from README and the UI sidebar

**Files:**
- Create: `ui/src/components/TrainingGuideLink.tsx`
- Create: `ui/testing/trainingGuideLink.test.tsx`
- Modify: `ui/src/components/Sidebar.tsx`
- Modify: `ui/testing/tsconfig.trainingBook.json`
- Modify: `ui/testing/runTrainingBookTests.mjs`
- Modify: `README.md`

- [ ] **Step 1: Write the failing mounted link test**

```tsx
const anchor = renderer.root.findByType('a');
assert.equal(anchor.props.href, TRAINING_GUIDE_URL);
assert.equal(anchor.props.target, '_blank');
assert.equal(anchor.props.rel, 'noopener noreferrer');
assert.equal(anchor.props['aria-label'], 'Open LoRA Training Guide');
```

Also source-check that `Sidebar` renders exactly one `TrainingGuideLink` and the root README has a prominent relative link to `docs/book/README.md` near introductory training material.

- [ ] **Step 2: Compile/run and verify RED**

Run: `cd ui && npm run test:training-book`

Expected: FAIL because `TrainingGuideLink` is missing.

- [ ] **Step 3: Implement the isolated semantic link**

```tsx
export const TRAINING_GUIDE_URL =
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/README.md';

export function TrainingGuideLink() {
  return (
    <a
      href={TRAINING_GUIDE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open LoRA Training Guide"
    >
      Training Guide
    </a>
  );
}
```

Use the existing sidebar icon/layout classes and a book/help icon from the installed icon set. Do not fetch the guide during render.

- [ ] **Step 4: Add the README link, run tests, and commit**

Run: `cd ui && npm run test:training-book`

Expected: PASS for unit/UI tests; full smoke validation is still deferred.

```bash
git add README.md ui/src/components/TrainingGuideLink.tsx ui/src/components/Sidebar.tsx ui/testing/trainingGuideLink.test.tsx ui/testing/tsconfig.trainingBook.json ui/testing/runTrainingBookTests.mjs
git commit -m "docs: link the LoRA training book"
```

At this point execute the built-in preset catalog plan. Its build CLI populates the six recipe reverse-reference blocks and emits canonical book facts containing only built-in ID, name, architecture, and recipe path. Return to Tasks 16–17 only after the catalog implementation and all book content are committed together; Task 17 removes pre-catalog mode and passes those emitted facts to the book validator for its independent bidirectional check.

### Task 16: Perform and record the current-edition supported-GPU smoke

**Files:**
- Create: `docs/book/verification/first-run-smoke.md`
- Modify: `scripts/training_book/manifest.py`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add failing smoke-record validation tests**

Use a temporary Git repository fixture to reject a missing record, non-`passed` status, malformed commit, nonancestor commit, mismatched `book_revision`, a tested commit that lacks the current edition, missing workflow result, and any book-content change after the tested commit other than the smoke record.

- [ ] **Step 2: Run and verify RED**

Run: `python testing/training_book_validation_test.py -k smoke`

Expected: FAIL because smoke validation and the record are absent.

- [ ] **Step 3: Implement and commit smoke-record validation before choosing the tested commit**

Add `validate_smoke_record(repository_root, manifest)` and parse exactly one marker-delimited JSON object:

````markdown
<!-- smoke-record:start -->
```json
{
  "schema_version": 1,
  "status": "passed",
  "book_revision": 1,
  "tested_commit": "40 lowercase hexadecimal characters",
  "tested_at": "UTC RFC 3339 timestamp ending in Z",
  "ui_architecture": "wan21:1b",
  "model_identifier": "repository-or-local-model identifier without credentials",
  "hardware": {
    "gpu_model": "observed model",
    "vram_gib": 24,
    "software": "OS, driver, Python, Node, and ai-toolkit revision summary"
  },
  "dataset": {
    "fixture_id": "non-sensitive stable description",
    "file_count": 12,
    "sha256": "64 lowercase hexadecimal characters"
  },
  "workflow": {
    "authentication": "passed",
    "job_creation": "passed",
    "queue": "passed",
    "start": "passed",
    "fixed_seed_sample": "passed",
    "checkpoint": "passed",
    "sample_comparison": "passed",
    "stop": "passed",
    "increase_steps": "passed",
    "resume": "passed",
    "optimizer_restoration": "passed",
    "continued_step_progress": "passed"
  },
  "observations": {
    "checkpoint_step": 250,
    "configured_learning_rate": 0.0001,
    "resumed_step": 251,
    "notes": "concise observed evidence"
  }
}
```
<!-- smoke-record:end -->
````

In implementation, use a four-backtick outer Markdown fence in tests so the inner JSON fence is literal. Strictly reject extra/missing keys, nonfinite/boolean numeric values, secrets/path leakage, non-UTC time, malformed hashes, and any workflow value other than `passed`. Use `git merge-base --is-ancestor`, read commit A's manifest, require the same revision, and allow no `docs/book` diff from A to HEAD except `verification/first-run-smoke.md`.

Run: `python testing/training_book_validation_test.py -k smoke`

Expected: PASS using temporary Git fixtures; the real repository continues to validate only with explicit `--skip-smoke` until the observed record exists.

```bash
git add scripts/training_book/manifest.py testing/training_book_validation_test.py
git commit -m "test: validate LoRA book smoke evidence"
```

- [ ] **Step 4: Freeze the complete combined edition before testing it**

Confirm every book and catalog change from this plan and the preset plan is already committed. Run the current four-command gate from `ui/`; at this stage `test:training-book` intentionally invokes the repository validator with `--skip-smoke`, while all other book checks are active:

```bash
npm run test:training-book
npm run test:training-presets
npm run test:dataset-presets
npm run build
```

Run `git status --short` and require no output. Then run `git rev-parse HEAD` and retain the exact 40-character output as tested commit A; do not create an empty commit and do not use the eventual smoke-record commit as its own tested commit.

- [ ] **Step 5: Execute the real diagnostic/resume workflow at that commit**

On a supported GPU, use the documented diagnostic recipe and a rights-cleared dataset. Verify UI authentication; create the diagnostic job; queue/start it; produce its fixed-seed sample and checkpoint; compare the sample; stop; increase total steps; resume from the checkpoint and compatible `optimizer.pt`; and observe continued step progression with the configured LR. Record model identifier/path, UI architecture, GPU model/VRAM, software versions, dataset file count and digest/fixture identity, timestamps, checkpoint step, and each observed result.

If hardware, model access, or a suitable dataset is unavailable, stop and report the acceptance blocker; never fabricate a passed smoke.

- [ ] **Step 6: Write the record using observed values**

Write the exact machine record from Step 3 using the 40-character commit printed in Step 4 and observed values only. Include one H1, the table-of-contents link, the smoke JSON block, and the standard navigation/verification marker pairs, then run `python scripts/generate_training_book_navigation.py` so the smoke page receives its manifest-derived previous/next link and verified footer. Do not include secrets, auth tokens, personal dataset paths, or managed-root paths.

- [ ] **Step 7: Validate and commit only the smoke record**

Run: `cd ui && node testing/runTrainingBookTests.mjs --require-smoke`

Expected: PASS with emitted UI/preset facts and confirm the tested commit is an ancestor containing revision 1 with no later book-content drift. `--require-smoke` overrides the package command's temporary Task-14 default without permitting empty preset links.

Run: `python scripts/generate_training_book_navigation.py --check`

Expected: PASS.

```bash
git add docs/book/verification/first-run-smoke.md
git commit -m "docs: record LoRA book GPU smoke"
```

### Task 17: Activate the full release gate and verify the edition

**Files:**
- Modify: `ui/testing/runTrainingBookTests.mjs`
- Modify: `ui/package.json`
- Modify: `testing/training_book_validation_test.py`

- [ ] **Step 1: Add a failing runner-contract test**

Assert the runner executes Python units, TypeScript facts/link tests, `generate_training_book_reference.py --check`, `generate_training_book_navigation.py --check`, the preset build CLI's `--emit-book-facts <owned-path>` mode, and `validate_training_book.py` with both emitted `--ui-facts` and `--preset-facts` paths and without `--skip-smoke`; every committed `trainingBook*.test.tsx?` artifact must be mandatory. The test must first observe the still-present `--skip-smoke` argument from Task 14, providing the intended RED.

- [ ] **Step 2: Run and verify RED**

Run: `cd ui && npm run test:training-book`

Expected: FAIL until the full validator is invoked by the runner.

- [ ] **Step 3: Wire the complete guarded runner**

Use an owned `mkdtemp` prefix, compile the focused TypeScript project, create only required module stubs, emit live UI facts and canonical preset book facts into separate files in the owned temp directory, run Python units/generator checks/full validation, run every compiled test, and validate the temp path before recursive cleanup. The Python validator independently checks exact bidirectional recipe membership from `--preset-facts`; pre-catalog empty-block mode is no longer permitted. No network, model import, trainer instantiation, or GPU is allowed.

- [ ] **Step 4: Run the exact automated acceptance gate**

Run from `ui/`, in this order:

```bash
npm run test:training-book
npm run test:training-presets
npm run test:dataset-presets
npm run build
```

Expected: all four commands PASS. The known Node/npm compatibility and React renderer deprecation warnings may remain; no test/build failure is acceptable.

- [ ] **Step 5: Confirm generated and Git cleanliness**

Run: `python scripts/generate_training_book_reference.py --check`

Expected: PASS.

Run: `python scripts/generate_training_book_navigation.py --check`

Expected: PASS.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add ui/testing/runTrainingBookTests.mjs ui/package.json testing/training_book_validation_test.py
git commit -m "test: enforce LoRA training book release gate"
```
