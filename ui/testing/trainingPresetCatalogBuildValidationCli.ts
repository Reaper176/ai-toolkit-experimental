import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { BUILT_IN_ARCHITECTURE_BINDINGS, BUILT_IN_RECIPE_PATHS } from '../src/helpers/builtInTrainingPresetBindings';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../src/helpers/builtInTrainingPresetDefinitions';
import {
  renderBuiltInTrainingPresetRecipeBlock,
  validateBuiltInTrainingPresetRelease,
  type TrainingPresetBackendMappingReport,
  type TrainingPresetUiMappingReport,
} from '../src/server/trainingPresetCatalogBuildValidation';

function parseJson(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }
function ownOutput(path: string): string {
  const target = resolve(path);
  if (existsSync(target) || !existsSync(dirname(target))) throw new Error(`output must be a nonexistent path in an existing owned directory: ${path}`);
  return target;
}
function presenceString(value: unknown, label: string): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a presence fact`);
  const fact = value as { present?: unknown; value?: { kind?: unknown; value?: unknown } };
  if (fact.present === false && !Object.prototype.hasOwnProperty.call(fact, 'value')) return null;
  if (fact.present !== true || fact.value?.kind !== 'string' || typeof fact.value.value !== 'string') throw new Error(`${label} must be an exact string presence fact`);
  return fact.value.value;
}
function projectUiFacts(raw: unknown): TrainingPresetUiMappingReport {
  if (raw === null || typeof raw !== 'object' || !Array.isArray((raw as { model_architectures?: unknown }).model_architectures)) throw new Error('book UI collector report is malformed');
  const rows = (raw as { model_architectures: Array<Record<string, unknown>> }).model_architectures;
  return {
    schema_version: 1,
    architectures: BUILT_IN_ARCHITECTURE_BINDINGS.map(binding => {
      const matches = rows.filter(row => row.name === binding.ui_arch);
      if (matches.length !== 1) throw new Error(`book UI collector must contain exactly one ${binding.ui_arch} architecture`);
      const row = matches[0];
      if (!Array.isArray(row.controls) || row.controls.some(item => typeof item !== 'string')) throw new Error(`${binding.ui_arch}.controls must be a string array`);
      return { name: binding.ui_arch, model_path: presenceString(row.model_path, `${binding.ui_arch}.model_path`)!, gate_url: presenceString(row.gate_url, `${binding.ui_arch}.gate_url`), controls: [...row.controls] as string[] };
    }),
  };
}
function replaceBlock(document: string, rendered: string, path: string): string {
  const start = '<!-- built-in-presets:start -->';
  const end = '<!-- built-in-presets:end -->';
  if (document.split(start).length !== 2 || document.split(end).length !== 2 || document.indexOf(start) > document.indexOf(end)) throw new Error(`${path}: invalid built-in preset markers`);
  return document.slice(0, document.indexOf(start)) + rendered + document.slice(document.indexOf(end) + end.length);
}

const args = process.argv.slice(2);
const operation = args[0];
const repositoryIndex = args.indexOf('--repository-root');
const backendIndex = args.indexOf('--backend-report');
const uiIndex = args.indexOf('--ui-facts');
const repositoryRoot = repositoryIndex >= 0 ? resolve(args[repositoryIndex + 1]) : resolve(__dirname, '..', '..');
const records = BUILT_IN_PRESET_ROWS.map(materializeBuiltInTrainingPresetRow);

if (operation === '--emit-book-facts') {
  if (args.length !== 8 || repositoryIndex !== 2 || backendIndex < 0 || uiIndex < 0) throw new Error('usage: --emit-book-facts <owned-path> --repository-root <root> --backend-report <json> --ui-facts <json>');
  const target = ownOutput(args[1]);
  validateBuiltInTrainingPresetRelease({
    repositoryRoot,
    records,
    backendReport: parseJson(args[backendIndex + 1]) as TrainingPresetBackendMappingReport,
    uiFacts: projectUiFacts(parseJson(args[uiIndex + 1])),
  });
  writeFileSync(target, JSON.stringify({ schema_version: 1, presets: records.map(record => ({ id: record.id, name: record.name, model_arch: record.model_arch, recipe_path: record.recipe_path })) }, null, 2) + '\n');
} else if (operation === '--write-recipes' || operation === '--check') {
  if (repositoryIndex < 0 || backendIndex < 0 || uiIndex < 0 || args.length !== 7) throw new Error(`usage: ${operation} --repository-root <root> --backend-report <json> --ui-facts <json>`);
  if (operation === '--write-recipes') {
    for (const recipe of BUILT_IN_RECIPE_PATHS) {
      const path = resolve(repositoryRoot, recipe);
      writeFileSync(path, replaceBlock(readFileSync(path, 'utf8'), renderBuiltInTrainingPresetRecipeBlock(records, recipe), recipe));
    }
  }
  validateBuiltInTrainingPresetRelease({
    repositoryRoot,
    records,
    backendReport: parseJson(args[backendIndex + 1]) as TrainingPresetBackendMappingReport,
    uiFacts: projectUiFacts(parseJson(args[uiIndex + 1])),
  });
} else {
  throw new Error('expected exactly one of --write-recipes, --check, or --emit-book-facts <owned-path>');
}
