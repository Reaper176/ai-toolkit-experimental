import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('rejects omitted, extra, duplicate, reordered, mixed-revision, and identity-drifted records', () => {
  assert.throws(() => validate(repositoryRoot, records.slice(1)), /release|missing|catalog/i);
  assert.throws(() => validate(repositoryRoot, [...records, records[0]]), /duplicate|extra|release/i);
  assert.throws(() => validate(repositoryRoot, [...records].reverse()), /order/i);
  assert.throws(() => validate(repositoryRoot, records.map((record, index) => index === 0 ? { ...record, catalog_revision: 2 } : record)), /revision|release/i);
  assert.throws(() => validate(repositoryRoot, records.map((record, index) => index === 0 ? { ...record, intent_slug: 'drift' } : record)), /identity|release|intent/i);
});

test('rejects manifest, UI, and backend drift', () => {
  const root = copiedBook();
  try {
    const manifestPath = join(root, 'docs/book/book-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.preset_architectures.pop();
    writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => validate(root), /manifest|architecture/i);
  } finally { rmSync(root, { recursive: true }); }
  assert.throws(() => validateBuiltInTrainingPresetRelease({ repositoryRoot, records, backendReport: { ...backendReport, bindings: backendReport.bindings.slice(1) }, uiFacts }), /backend/i);
  assert.throws(() => validateBuiltInTrainingPresetRelease({ repositoryRoot, records, backendReport, uiFacts: { ...uiFacts, architectures: uiFacts.architectures.map((row, index) => index === 0 ? { ...row, model_path: 'drift' } : row) } }), /UI|model_path/i);
});

test('rejects recipe absence, reverse-link drift, model deviation drift, and generated membership drift', () => {
  for (const mutation of [
    (root: string) => rmSync(join(root, 'docs/book/recipes/low-vram.md')),
    (root: string) => {
      const path = join(root, 'docs/book/recipes/style.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('builtin:flux:style-aesthetic@1', 'builtin:flux:wrong@1'));
    },
    (root: string) => {
      const path = join(root, 'docs/book/recipes/low-vram.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('## Model-specific deviations', '## Model-specific deviations\n\n- [Qwen](../models/qwen-image-and-edit.md)'));
    },
    (root: string) => {
      const path = join(root, 'docs/book/models/anima.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('"id": "anima"', '"id": "anima-drift"'));
    },
  ]) {
    const root = copiedBook();
    try { mutation(root); assert.throws(() => validate(root), /recipe|reverse|model|membership|missing/i); }
    finally { rmSync(root, { recursive: true }); }
  }
});

test('rejects unsupported evidence artifacts and proves omitted records use every raw row', () => {
  const root = copiedBook();
  try {
    mkdirSync(join(root, 'docs/book/preset-evidence'));
    assert.throws(() => validate(root), /evidence/i);
  } finally { rmSync(root, { recursive: true }); }
  validateBuiltInTrainingPresetRelease({ repositoryRoot, backendReport, uiFacts });
  const validator = readFileSync(join(repositoryRoot, 'ui/src/server/trainingPresetCatalogBuildValidation.ts'), 'utf8');
  assert.match(validator, /BUILT_IN_PRESET_ROWS\.forEach/);
  assert.doesNotMatch(validator, /getBuiltInTrainingPresetCatalog/);
});
