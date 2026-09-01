import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  validateBuiltInTrainingPresetRelease,
  type TrainingPresetBackendMappingReport,
  type TrainingPresetUiMappingReport,
} from '../src/server/trainingPresetCatalogBuildValidation';
import { BUILT_IN_ARCHITECTURE_BINDINGS } from '../src/helpers/builtInTrainingPresetBindings';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../src/helpers/builtInTrainingPresetDefinitions';
import { canonicalizePresetJson } from '../src/helpers/builtInTrainingPresets';
import type { BuiltInTrainingPresetRecord } from '../src/helpers/trainingPresets';

const repositoryRoot = resolve(process.env.TRAINING_PRESET_REPOSITORY_ROOT ?? resolve(__dirname, '..', '..'));
const records = BUILT_IN_PRESET_ROWS.map(materializeBuiltInTrainingPresetRow);
const sourcePaths: Record<string, string> = {
  anima: 'extensions_built_in/diffusion_models/anima/anima.py', flux: 'toolkit/stable_diffusion_model.py', flex1: 'toolkit/stable_diffusion_model.py',
  qwen_image: 'extensions_built_in/diffusion_models/qwen_image/qwen_image.py',
  qwen_image_edit_plus: 'extensions_built_in/diffusion_models/qwen_image/qwen_image_edit_plus.py',
  sdxl: 'toolkit/stable_diffusion_model.py', sd15: 'toolkit/stable_diffusion_model.py',
  'wan21:1b': 'toolkit/models/wan21/wan21.py',
  'wan22_14b:t2v': 'extensions_built_in/diffusion_models/wan22/wan22_14b_model.py',
};
const backendReport: TrainingPresetBackendMappingReport = { schema_version: 1, bindings: BUILT_IN_ARCHITECTURE_BINDINGS.map(binding => ({
  ui_architecture: binding.ui_arch, normalized_architecture: binding.engine_arch, model_class: binding.model_class,
  source_path: sourcePaths[binding.ui_arch], symbol: binding.model_class,
})) };
const uiFacts: TrainingPresetUiMappingReport = { schema_version: 1, architectures: BUILT_IN_ARCHITECTURE_BINDINGS.map(binding => ({
  name: binding.ui_arch, model_path: binding.model_path,
  gate_url: binding.ui_arch === 'flux' ? 'https://huggingface.co/black-forest-labs/FLUX.1-dev' : null, controls: [],
})) };

function validate(root = repositoryRoot, release = records): void {
  validateBuiltInTrainingPresetRelease({ repositoryRoot: root, records: release, backendReport, uiFacts });
}

function copiedBook(): string {
  const root = mkdtempSync(join(tmpdir(), 'training-preset-release-test-'));
  cpSync(join(repositoryRoot, 'docs'), join(root, 'docs'), { recursive: true });
  return root;
}

test('accepts the exact complete release without runtime filesystem coupling', () => {
  validate();
  const runtime = readFileSync(join(repositoryRoot, 'ui/src/server/trainingPresetCatalogRuntime.ts'), 'utf8');
  assert.doesNotMatch(runtime, /trainingPresetCatalogBuildValidation|node:fs/);
});

function errorFrom(callback: () => void): string {
  try { callback(); } catch (error) { return error instanceof Error ? error.message : String(error); }
  assert.fail('expected validation to fail');
}

function mutateRecord(index: number, changes: Partial<BuiltInTrainingPresetRecord>): BuiltInTrainingPresetRecord[] {
  return records.map((record, row) => row === index ? { ...record, ...changes } as BuiltInTrainingPresetRecord : record);
}

function mutateBook(relativePath: string, update: (document: string) => string): string {
  const root = copiedBook();
  const path = join(root, relativePath);
  writeFileSync(path, update(readFileSync(path, 'utf8')));
  return root;
}

test('rejects an omitted catalog row independently', () => assert.throws(() => validate(repositoryRoot, records.slice(1)), /release length.*golden/i));
test('rejects an extra unique catalog row independently', () => {
  const extra = { ...records[0], id: 'builtin:anima:extra@1', intent_slug: 'extra' } as BuiltInTrainingPresetRecord;
  assert.throws(() => validate(repositoryRoot, [...records, extra]), /extra|release length/i);
});
test('rejects a duplicate catalog row independently', () => assert.throws(() => validate(repositoryRoot, [...records, records[0]]), /duplicate IDs/i));
test('rejects mixed catalog revisions independently', () => assert.throws(() => validate(repositoryRoot, mutateRecord(0, { catalog_revision: 2 })), /mixed catalog revision/i));
test('rejects ID and field identity drift independently', () => assert.throws(() => validate(repositoryRoot, mutateRecord(0, { intent_slug: 'drift' })), /ID.*field|identity/i));
test('rejects category coverage drift independently', () => assert.throws(() => validate(repositoryRoot, mutateRecord(0, { category: 'style' })), /category coverage/i));
test('rejects recipe coverage drift independently', () => assert.throws(() => validate(repositoryRoot, mutateRecord(0, { recipe_path: records[1].recipe_path })), /recipe coverage/i));
test('rejects canonical ordering ambiguity independently', () => assert.throws(() => validate(repositoryRoot, [records[1], records[0], ...records.slice(2)]), /order/i));

test('rejects manifest preset architecture drift independently', () => {
  const root = mutateBook('docs/book/book-manifest.json', document => {
    const manifest = JSON.parse(document); manifest.preset_architectures.pop(); return JSON.stringify(manifest);
  });
  try { assert.throws(() => validate(root), /manifest preset architecture order drift/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects a missing recipe independently', () => {
  const root = copiedBook();
  try { rmSync(join(root, 'docs/book/recipes/low-vram.md')); assert.throws(() => validate(root), /missing.*low-vram/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects an escaping recipe symlink independently', () => {
  const root = copiedBook();
  const recipe = join(root, 'docs/book/recipes/low-vram.md');
  const outside = `${root}-outside.md`;
  try {
    writeFileSync(outside, readFileSync(recipe)); rmSync(recipe); symlinkSync(outside, recipe);
    assert.throws(() => validate(root), /recipe path escapes/i);
  } finally { rmSync(root, { recursive: true }); rmSync(outside, { force: true }); }
});
test('rejects a wrong reverse recipe link independently', () => {
  const root = mutateBook('docs/book/recipes/style.md', document => document.replace('builtin:flux:style-aesthetic@1', 'builtin:flux:wrong@1'));
  try { assert.throws(() => validate(root), /wrong reverse link/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects a missing model-family deviation link independently', () => {
  const root = mutateBook('docs/book/recipes/style.md', document => document.replace(/^- \[Stable Diffusion training guide\].*\n/mu, ''));
  try { assert.throws(() => validate(root), /missing model-family deviation link/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects a wrong model-family deviation link independently', () => {
  const root = mutateBook('docs/book/recipes/style.md', document => document.replace('../models/sdxl-and-sd15.md', '../models/anima.md'));
  try { assert.throws(() => validate(root), /wrong model-family deviation link/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects an extra model-family deviation link independently', () => {
  const root = mutateBook('docs/book/recipes/low-vram.md', document => document.replace('## Model-specific deviations', '## Model-specific deviations\n\n- [Qwen](../models/qwen-image-and-edit.md)'));
  try { assert.throws(() => validate(root), /extra model-family deviation link/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects generated model architecture membership drift independently', () => {
  const root = mutateBook('docs/book/models/anima.md', document => document.replace('"id": "anima"', '"id": "anima-drift"'));
  try { assert.throws(() => validate(root), /generated membership.*anima/i); } finally { rmSync(root, { recursive: true }); }
});
test('rejects live UI model path drift independently', () => assert.throws(() => validateBuiltInTrainingPresetRelease({ repositoryRoot, records, backendReport, uiFacts: { ...uiFacts, architectures: uiFacts.architectures.map((row, index) => index === 0 ? { ...row, model_path: 'drift' } : row) } }), /UI.*model_path/i));
test('rejects backend class drift independently', () => assert.throws(() => validateBuiltInTrainingPresetRelease({ repositoryRoot, records, backendReport: { ...backendReport, bindings: backendReport.bindings.map((row, index) => index === 0 ? { ...row, model_class: 'Drift' } : row) }, uiFacts }), /backend.*class/i));

function git(root: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

type Evidence = Record<string, unknown> & {
  preset_id: string;
  repository_commit: string;
  tested_at: string;
  test_scope: string;
  result: string;
  reviewer?: string;
  hardware_model?: string;
  model_identifier?: string;
};
function evidenceFixture(): { root: string; release: BuiltInTrainingPresetRecord[]; evidence: Evidence; path: string; nonancestor: string } {
  const root = copiedBook();
  git(root, ['init', '-q']); git(root, ['config', 'user.email', 'preset-test@example.invalid']); git(root, ['config', 'user.name', 'Preset Test']);
  git(root, ['add', 'docs']); git(root, ['commit', '-qm', 'fixture']);
  const head = git(root, ['rev-parse', 'HEAD']);
  const nonancestor = git(root, ['commit-tree', 'HEAD^{tree}', '-m', 'unrelated']);
  const release = mutateRecord(0, { evidence: 'launch-tested' });
  const record = release[0];
  const directory = join(root, 'docs/book/preset-evidence'); mkdirSync(directory);
  const path = join(directory, `${createHash('sha256').update(record.id).digest('hex')}.json`);
  const evidence: Evidence = {
    schema_version: 1, preset_id: record.id, catalog_revision: record.catalog_revision,
    snapshot_sha256: createHash('sha256').update(canonicalizePresetJson(record.snapshot)).digest('hex'),
    repository_commit: head, tested_at: '2026-08-14T12:34:56Z', hardware_model: 'Test GPU',
    model_identifier: 'test/model', test_scope: 'launch-tested', result: 'passed', reviewer: 'Reviewer',
  };
  writeFileSync(path, JSON.stringify(evidence));
  return { root, release, evidence, path, nonancestor };
}
function evidenceError(mutate: (fixture: ReturnType<typeof evidenceFixture>) => void): string {
  const fixture = evidenceFixture();
  try {
    mutate(fixture);
    if (existsSync(fixture.path)) writeFileSync(fixture.path, JSON.stringify(fixture.evidence));
    return errorFrom(() => validate(fixture.root, fixture.release));
  } finally { rmSync(fixture.root, { recursive: true }); }
}

test('rejects unsupported stronger evidence independently', () => assert.match(evidenceError(() => {}), /unsupported stronger evidence/i));
test('rejects an evidence attestation with a missing field', () => assert.match(evidenceError(({ evidence }) => { delete evidence.hardware_model; }), /missing or extra fields/i));
test('rejects an evidence attestation with an extra field', () => assert.match(evidenceError(({ evidence }) => { evidence.extra = true; }), /missing or extra fields/i));
test('rejects a malformed evidence filename digest', () => assert.match(evidenceError(({ path }) => { renameSync(path, join(resolve(path, '..'), `${'0'.repeat(64)}.json`)); }), /missing or extra preset evidence files|filename/i));
test('rejects the wrong evidence preset ID', () => assert.match(evidenceError(({ evidence }) => { evidence.preset_id = 'wrong'; }), /identity.*mismatch/i));
test('rejects the wrong evidence catalog revision', () => assert.match(evidenceError(({ evidence }) => { evidence.catalog_revision = 2; }), /revision.*mismatch/i));
test('rejects a stale evidence snapshot digest', () => assert.match(evidenceError(({ evidence }) => { evidence.snapshot_sha256 = '0'.repeat(64); }), /stale snapshot/i));
test('rejects an unknown evidence commit', () => assert.match(evidenceError(({ evidence }) => { evidence.repository_commit = 'f'.repeat(40); }), /unknown.*commit/i));
test('rejects a known nonancestor evidence commit', () => assert.match(evidenceError(({ evidence, nonancestor }) => { evidence.repository_commit = nonancestor; }), /not an ancestor/i));
test('rejects a non-Z evidence date', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-08-14T12:34:56+00:00'; }), /UTC RFC 3339/i));
test('rejects an impossible evidence calendar date', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-02-30T12:34:56Z'; }), /UTC RFC 3339/i));
test('rejects an impossible evidence month', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-13-01T12:34:56Z'; }), /UTC RFC 3339/i));
test('rejects a non-leap-year February 29', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2025-02-29T12:34:56Z'; }), /UTC RFC 3339/i));
test('rejects an impossible evidence hour', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-08-14T24:00:00Z'; }), /UTC RFC 3339/i));
test('rejects an impossible evidence minute', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-08-14T12:60:00Z'; }), /UTC RFC 3339/i));
test('rejects an impossible evidence second', () => assert.match(evidenceError(({ evidence }) => { evidence.tested_at = '2026-08-14T12:34:60Z'; }), /UTC RFC 3339/i));
test('accepts a valid leap-day timestamp before rejecting only the unsupported stronger label', () => assert.doesNotMatch(evidenceError(({ evidence }) => { evidence.tested_at = '2024-02-29T23:59:59Z'; }), /UTC RFC 3339/i));
test('rejects an unsuccessful evidence result', () => assert.match(evidenceError(({ evidence }) => { evidence.result = 'failed'; }), /unsuccessful/i));
test('rejects evidence label and scope mismatch', () => assert.match(evidenceError(({ evidence }) => { evidence.test_scope = 'training-tested'; }), /scope\/label mismatch/i));
test('rejects a missing evidence reviewer', () => assert.match(evidenceError(({ evidence }) => { delete evidence.reviewer; }), /missing or extra fields/i));
test('rejects a blank evidence reviewer', () => assert.match(evidenceError(({ evidence }) => { evidence.reviewer = '  '; }), /reviewer must be nonblank/i));
test('rejects a blank evidence hardware model', () => assert.match(evidenceError(({ evidence }) => { evidence.hardware_model = ''; }), /hardware_model must be nonblank/i));
test('rejects a blank evidence model identifier', () => assert.match(evidenceError(({ evidence }) => { evidence.model_identifier = '\t'; }), /model_identifier must be nonblank/i));

test('configuration-only release forbids an evidence directory', () => {
  const root = copiedBook(); try { mkdirSync(join(root, 'docs/book/preset-evidence')); assert.throws(() => validate(root), /must not contain preset evidence/i); } finally { rmSync(root, { recursive: true }); }
});
test('omitted records materialize every raw row without the fail-soft runtime getter', () => {
  validateBuiltInTrainingPresetRelease({ repositoryRoot, backendReport, uiFacts });
  const validator = readFileSync(join(repositoryRoot, 'ui/src/server/trainingPresetCatalogBuildValidation.ts'), 'utf8');
  assert.match(validator, /BUILT_IN_PRESET_ROWS\.forEach/);
  assert.doesNotMatch(validator, /getBuiltInTrainingPresetCatalog/);
});
