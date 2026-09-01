import {
  closeSync,
  chmodSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { BUILT_IN_ARCHITECTURE_BINDINGS, BUILT_IN_RECIPE_PATHS } from '../src/helpers/builtInTrainingPresetBindings';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../src/helpers/builtInTrainingPresetDefinitions';
import {
  renderBuiltInTrainingPresetRecipeBlock,
  validateBuiltInTrainingPresetRelease,
  type TrainingPresetBackendMappingReport,
  type TrainingPresetUiMappingReport,
} from '../src/server/trainingPresetCatalogBuildValidation';

export interface TrainingPresetRecipeFileOperations {
  rename(source: string, target: string): void;
}

export interface ExclusiveJsonFileOperations {
  link(source: string, target: string): void;
}

const recipeFileOperations: TrainingPresetRecipeFileOperations = { rename: renameSync };
const jsonFileOperations: ExclusiveJsonFileOperations = { link: linkSync };

function parseJson(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')); }

function isChild(parent: string, child: string): boolean {
  const fromParent = relative(parent, child);
  return fromParent !== '' && fromParent !== '..' && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent);
}

function assertNoSymlinkComponents(root: string, target: string, label: string): void {
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes its owned root`);
  let cursor = root;
  for (const component of rel.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, component);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${label} contains a symlink`);
  }
}

function confinedRecipeFile(repositoryRoot: string, relativePath: string): string {
  if (isAbsolute(relativePath) || relativePath.includes('\\')) throw new Error(`unsafe recipe path ${relativePath}`);
  const realRoot = realpathSync(repositoryRoot);
  const book = resolve(repositoryRoot, 'docs/book');
  assertNoSymlinkComponents(repositoryRoot, book, 'book path');
  const realBook = realpathSync(book);
  if (!isChild(realRoot, realBook)) throw new Error('book path escapes repository');
  const target = resolve(repositoryRoot, relativePath);
  if (!isChild(realBook, target) && target !== realBook) throw new Error(`recipe path escapes book: ${relativePath}`);
  assertNoSymlinkComponents(realBook, target, `recipe path ${relativePath}`);
  const realTarget = realpathSync(target);
  if (!isChild(realBook, realTarget) || !lstatSync(realTarget).isFile()) throw new Error(`recipe path escapes book or is not a file: ${relativePath}`);
  return realTarget;
}

function temporaryPath(destination: string): string {
  const directory = dirname(destination);
  const base = destination.slice(directory.length + 1);
  for (let index = 0; index < 1000; index += 1) {
    const candidate = resolve(directory, `.${base}.preset-${process.pid}-${index}.tmp`);
    try {
      const descriptor = openSync(candidate, 'wx', 0o600);
      closeSync(descriptor);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`could not allocate an exclusive temporary file beside ${destination}`);
}

function writeAndSync(path: string, contents: string): void {
  const descriptor = openSync(path, 'w');
  try {
    writeFileSync(descriptor, contents, 'utf8');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function syncDirectory(path: string): void {
  const descriptor = openSync(path, 'r');
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function replaceBlock(document: string, rendered: string, path: string): string {
  const start = '<!-- built-in-presets:start -->';
  const end = '<!-- built-in-presets:end -->';
  if (document.split(start).length !== 2 || document.split(end).length !== 2 || document.indexOf(start) > document.indexOf(end)) throw new Error(`${path}: invalid built-in preset markers`);
  return document.slice(0, document.indexOf(start)) + rendered + document.slice(document.indexOf(end) + end.length);
}

export function writeTrainingPresetRecipesAtomically(
  repositoryRoot: string,
  records: ReturnType<typeof materializeBuiltInTrainingPresetRow>[],
  operations: TrainingPresetRecipeFileOperations = recipeFileOperations,
): void {
  const plans = BUILT_IN_RECIPE_PATHS.map(recipe => {
    const path = confinedRecipeFile(repositoryRoot, recipe);
    const original = readFileSync(path, 'utf8');
    const replacement = replaceBlock(original, renderBuiltInTrainingPresetRecipeBlock(records, recipe), recipe);
    return { path, original, replacement, mode: statSync(path).mode & 0o777, temporary: '' };
  });
  const published: typeof plans = [];
  try {
    for (const plan of plans) {
      plan.temporary = temporaryPath(plan.path);
      chmodSync(plan.temporary, plan.mode);
      writeAndSync(plan.temporary, plan.replacement);
    }
    for (const plan of plans) {
      operations.rename(plan.temporary, plan.path);
      plan.temporary = '';
      published.push(plan);
      syncDirectory(dirname(plan.path));
    }
  } catch (error) {
    let rollbackError: unknown;
    for (const plan of [...published].reverse()) {
      try {
        const rollback = temporaryPath(plan.path);
        try {
          chmodSync(rollback, plan.mode);
          writeAndSync(rollback, plan.original);
          operations.rename(rollback, plan.path);
          syncDirectory(dirname(plan.path));
        } finally {
          if (existsSync(rollback)) rmSync(rollback);
        }
      } catch (candidate) { rollbackError ??= candidate; }
    }
    if (rollbackError) throw new Error(`recipe publication failed and rollback failed: ${String(error)}; ${String(rollbackError)}`);
    throw error;
  } finally {
    for (const plan of plans) if (plan.temporary && existsSync(plan.temporary)) rmSync(plan.temporary);
  }
}

export function writeJsonExclusive(
  targetPath: string,
  value: unknown,
  operations: ExclusiveJsonFileOperations = jsonFileOperations,
): void {
  const target = resolve(targetPath);
  const parent = dirname(target);
  if (!existsSync(parent) || lstatSync(parent).isSymbolicLink() || !lstatSync(parent).isDirectory()) throw new Error(`output parent must be an existing owned directory: ${targetPath}`);
  const temporary = temporaryPath(target);
  try {
    writeAndSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    operations.link(temporary, target);
    syncDirectory(parent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`exclusive output already exists: ${targetPath}`);
    throw error;
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
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

export function main(args = process.argv.slice(2)): void {
  const operation = args[0];
  const repositoryIndex = args.indexOf('--repository-root');
  const backendIndex = args.indexOf('--backend-report');
  const uiIndex = args.indexOf('--ui-facts');
  const repositoryRoot = repositoryIndex >= 0 ? resolve(args[repositoryIndex + 1]) : resolve(__dirname, '..', '..');
  const records = BUILT_IN_PRESET_ROWS.map(materializeBuiltInTrainingPresetRow);

  if (operation === '--emit-book-facts') {
    if (args.length !== 8 || repositoryIndex !== 2 || backendIndex < 0 || uiIndex < 0) throw new Error('usage: --emit-book-facts <owned-path> --repository-root <root> --backend-report <json> --ui-facts <json>');
    const report = {
      backendReport: parseJson(args[backendIndex + 1]) as TrainingPresetBackendMappingReport,
      uiFacts: projectUiFacts(parseJson(args[uiIndex + 1])),
    };
    validateBuiltInTrainingPresetRelease({ repositoryRoot, records, ...report });
    writeJsonExclusive(args[1], { schema_version: 1, presets: records.map(record => ({ id: record.id, name: record.name, model_arch: record.model_arch, recipe_path: record.recipe_path })) });
  } else if (operation === '--write-recipes' || operation === '--check') {
    if (repositoryIndex < 0 || backendIndex < 0 || uiIndex < 0 || args.length !== 7) throw new Error(`usage: ${operation} --repository-root <root> --backend-report <json> --ui-facts <json>`);
    if (operation === '--write-recipes') writeTrainingPresetRecipesAtomically(repositoryRoot, records);
    validateBuiltInTrainingPresetRelease({
      repositoryRoot,
      records,
      backendReport: parseJson(args[backendIndex + 1]) as TrainingPresetBackendMappingReport,
      uiFacts: projectUiFacts(parseJson(args[uiIndex + 1])),
    });
  } else {
    throw new Error('expected exactly one of --write-recipes, --check, or --emit-book-facts <owned-path>');
  }
}

if (require.main === module) main();
