import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { BUILT_IN_ARCHITECTURE_BINDINGS, BUILT_IN_ARCHITECTURE_ORDER, BUILT_IN_RECIPE_PATHS } from '../helpers/builtInTrainingPresetBindings';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../helpers/builtInTrainingPresetDefinitions';
import { EXPECTED_BUILT_IN_PRESET_RELEASE } from '../helpers/builtInTrainingPresetGolden';
import { canonicalizePresetJson } from '../helpers/builtInTrainingPresets';
import type { BuiltInTrainingPresetRecord } from '../helpers/trainingPresets';

export interface TrainingPresetBackendMappingReport {
  schema_version: 1;
  bindings: Array<{
    ui_architecture: string;
    normalized_architecture: string;
    model_class: string;
    source_path: string;
    symbol: string;
  }>;
}

export interface TrainingPresetUiMappingReport {
  schema_version: 1;
  architectures: Array<{
    name: string;
    model_path: string;
    gate_url: string | null;
    controls: string[];
  }>;
}

interface PresetEvidenceAttestation {
  schema_version: 1;
  preset_id: string;
  catalog_revision: number;
  snapshot_sha256: string;
  repository_commit: string;
  tested_at: string;
  hardware_model: string;
  model_identifier: string;
  test_scope: 'launch-tested' | 'training-tested';
  result: 'passed';
  reviewer: string;
}

const RECIPE_MODEL_PAGES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'docs/book/recipes/character-identity.md': ['docs/book/models/anima.md', 'docs/book/models/flux-and-flex.md', 'docs/book/models/sdxl-and-sd15.md', 'docs/book/models/wan.md'],
  'docs/book/recipes/style.md': ['docs/book/models/flux-and-flex.md', 'docs/book/models/sdxl-and-sd15.md'],
  'docs/book/recipes/object-concept.md': ['docs/book/models/flux-and-flex.md', 'docs/book/models/qwen-image-and-edit.md'],
  'docs/book/recipes/focused-refinement.md': ['docs/book/models/anima.md', 'docs/book/models/qwen-image-and-edit.md'],
  'docs/book/recipes/low-vram.md': ['docs/book/models/anima.md'],
  'docs/book/recipes/diagnostic-run.md': ['docs/book/models/anima.md', 'docs/book/models/wan.md'],
});
const BACKEND_SOURCE_PATHS: Readonly<Record<string, string>> = Object.freeze({
  anima: 'extensions_built_in/diffusion_models/anima/anima.py', flux: 'toolkit/stable_diffusion_model.py', flex1: 'toolkit/stable_diffusion_model.py',
  qwen_image: 'extensions_built_in/diffusion_models/qwen_image/qwen_image.py', qwen_image_edit_plus: 'extensions_built_in/diffusion_models/qwen_image/qwen_image_edit_plus.py',
  sdxl: 'toolkit/stable_diffusion_model.py', sd15: 'toolkit/stable_diffusion_model.py', 'wan21:1b': 'toolkit/models/wan21/wan21.py',
  'wan22_14b:t2v': 'extensions_built_in/diffusion_models/wan22/wan22_14b_model.py',
});
const START = '<!-- built-in-presets:start -->';
const END = '<!-- built-in-presets:end -->';
const GOLDEN_BINDINGS = (() => {
  const seen = new Set<string>();
  return EXPECTED_BUILT_IN_PRESET_RELEASE.flatMap(row => {
    if (seen.has(row.binding.ui_arch)) return [];
    seen.add(row.binding.ui_arch);
    return [{ ...row.binding }];
  });
})();
const GOLDEN_RECIPE_PATHS = [
  'docs/book/recipes/character-identity.md',
  'docs/book/recipes/style.md',
  'docs/book/recipes/object-concept.md',
  'docs/book/recipes/focused-refinement.md',
  'docs/book/recipes/low-vram.md',
  'docs/book/recipes/diagnostic-run.md',
] as const;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && canonical(Object.keys(value as object).sort()) === canonical([...keys].sort());
}

function expectedRecord(index: number): unknown {
  const { binding: _binding, ...record } = EXPECTED_BUILT_IN_PRESET_RELEASE[index];
  return record;
}

function confinedFile(root: string, relativePath: string): string {
  if (isAbsolute(relativePath) || relativePath.includes('\\')) throw new Error(`unsafe recipe path ${relativePath}`);
  const resolvedRoot = realpathSync(root);
  const candidate = resolve(root, relativePath);
  if (!existsSync(candidate)) throw new Error(`missing recipe path ${relativePath}`);
  const resolved = realpathSync(candidate);
  const child = relative(resolvedRoot, resolved);
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error(`recipe path escapes repository: ${relativePath}`);
  if (lstatSync(candidate).isSymbolicLink()) throw new Error(`symbolic recipe path ${relativePath}`);
  return resolved;
}

function markerRows(records: readonly BuiltInTrainingPresetRecord[], recipe: string): string {
  return records.filter(record => record.recipe_path === recipe).map(record => `- \`${record.id}\` — ${record.name}`).join('\n');
}

function validateMarkers(document: string, records: readonly BuiltInTrainingPresetRecord[], recipe: string): void {
  if (document.split(START).length !== 2 || document.split(END).length !== 2 || document.indexOf(START) > document.indexOf(END)) throw new Error(`${recipe}: invalid built-in preset markers`);
  const interior = document.slice(document.indexOf(START) + START.length, document.indexOf(END)).trim();
  if (interior !== markerRows(records, recipe)) throw new Error(`${recipe}: wrong reverse link marker membership or order`);
  for (const record of records) {
    const occurrences = document.split(`\`${record.id}\``).length - 1;
    if (occurrences !== (record.recipe_path === recipe ? 1 : 0)) throw new Error(`${recipe}: bidirectional preset link drift for ${record.id}`);
  }
}

function modelLinks(document: string, recipe: string): string[] {
  const outsideMarkers = document.slice(0, document.indexOf(START)) + document.slice(document.indexOf(END) + END.length);
  const heading = '## Model-specific deviations';
  const start = outsideMarkers.indexOf(heading);
  if (start < 0) throw new Error(`${recipe}: missing Model-specific deviations section`);
  const bodyStart = start + heading.length;
  const next = outsideMarkers.indexOf('\n## ', bodyStart);
  const section = outsideMarkers.slice(bodyStart, next < 0 ? undefined : next);
  return [...section.matchAll(/\[[^\]]+\]\((\.\.\/models\/[^)#]+\.md)\)/gu)].map(item => posix.normalize(`docs/book/recipes/${item[1]}`));
}

function modelArchitectures(root: string, path: string): string[] {
  const document = readFileSync(confinedFile(root, path), 'utf8');
  const start = '<!-- model-facts:start -->';
  const end = '<!-- model-facts:end -->';
  if (document.split(start).length !== 2 || document.split(end).length !== 2) throw new Error(`${path}: invalid model-facts markers`);
  const block = document.slice(document.indexOf(start) + start.length, document.indexOf(end));
  const json = block.match(/```json\s*([\s\S]*?)```/u);
  if (!json) throw new Error(`${path}: missing generated model-facts JSON`);
  const parsed = JSON.parse(json[1]);
  if (!exactKeys(parsed, ['schema_version', 'architectures', 'deferred_settings']) || parsed.schema_version !== 1 || !Array.isArray(parsed.architectures)) throw new Error(`${path}: malformed generated model-facts`);
  return parsed.architectures.map((row: unknown) => {
    if (!exactKeys(row, ['id', 'facts']) || typeof (row as { id?: unknown }).id !== 'string') throw new Error(`${path}: malformed architecture membership`);
    return (row as { id: string }).id;
  });
}

function validateEvidence(root: string, records: readonly BuiltInTrainingPresetRecord[]): void {
  const directory = resolve(root, 'docs/book/preset-evidence');
  const stronger = records.filter(record => record.evidence !== 'configuration-validated');
  if (stronger.length === 0) {
    if (existsSync(directory)) throw new Error('configuration-validated revision must not contain preset evidence');
    return;
  }
  if (!existsSync(directory)) throw new Error('missing preset evidence directory');
  const expectedFiles = new Set(stronger.map(record => `${createHash('sha256').update(record.id).digest('hex')}.json`));
  const actualFiles = readdirSync(directory).sort();
  if (canonical(actualFiles) !== canonical([...expectedFiles].sort())) throw new Error('missing or extra preset evidence files');
  for (const record of stronger) {
    const filename = `${createHash('sha256').update(record.id).digest('hex')}.json`;
    const attestation = JSON.parse(readFileSync(resolve(directory, filename), 'utf8')) as PresetEvidenceAttestation;
    const keys = ['schema_version','preset_id','catalog_revision','snapshot_sha256','repository_commit','tested_at','hardware_model','model_identifier','test_scope','result','reviewer'];
    if (!exactKeys(attestation, keys)) throw new Error(`${record.id}: evidence has missing or extra fields`);
    if (attestation.schema_version !== 1 || attestation.preset_id !== record.id || attestation.catalog_revision !== record.catalog_revision) throw new Error(`${record.id}: evidence identity/revision mismatch`);
    const digest = createHash('sha256').update(canonicalizePresetJson(record.snapshot)).digest('hex');
    if (attestation.snapshot_sha256 !== digest) throw new Error(`${record.id}: stale snapshot evidence`);
    if (!/^[0-9a-f]{40}$/u.test(attestation.repository_commit)) throw new Error(`${record.id}: malformed repository commit`);
    const known = spawnSync('git', ['cat-file', '-e', `${attestation.repository_commit}^{commit}`], { cwd: root, stdio: 'ignore' });
    if (known.status !== 0) throw new Error(`${record.id}: unknown evidence commit`);
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', attestation.repository_commit, 'HEAD'], { cwd: root, stdio: 'ignore' });
    if (ancestor.status !== 0) throw new Error(`${record.id}: evidence commit is not an ancestor`);
    if (!isStrictUtcRfc3339(attestation.tested_at)) throw new Error(`${record.id}: tested_at must be UTC RFC 3339 with a valid calendar date`);
    for (const key of ['hardware_model','model_identifier','reviewer'] as const) if (typeof attestation[key] !== 'string' || !attestation[key].trim()) throw new Error(`${record.id}: ${key} must be nonblank`);
    if (attestation.result !== 'passed' || attestation.test_scope !== record.evidence) throw new Error(`${record.id}: unsuccessful or scope/label mismatch evidence`);
  }
}

function isStrictUtcRfc3339(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/u);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) return false;
  const roundTrip = new Date(0);
  roundTrip.setUTCFullYear(year, month - 1, day);
  roundTrip.setUTCHours(hour, minute, second, 0);
  return roundTrip.getUTCFullYear() === year
    && roundTrip.getUTCMonth() === month - 1
    && roundTrip.getUTCDate() === day
    && roundTrip.getUTCHours() === hour
    && roundTrip.getUTCMinutes() === minute
    && roundTrip.getUTCSeconds() === second;
}

export function validateBuiltInTrainingPresetRelease(options: {
  repositoryRoot: string;
  records?: readonly BuiltInTrainingPresetRecord[];
  backendReport: TrainingPresetBackendMappingReport;
  uiFacts: TrainingPresetUiMappingReport;
}): void {
  const errors: string[] = [];
  let records: readonly BuiltInTrainingPresetRecord[];
  if (options.records === undefined) {
    const materialized: BuiltInTrainingPresetRecord[] = [];
    BUILT_IN_PRESET_ROWS.forEach((row, index) => {
      try { materialized.push(materializeBuiltInTrainingPresetRow(row)); }
      catch (error) { errors.push(`raw row ${index} materialization failed: ${error instanceof Error ? error.message : String(error)}`); }
    });
    records = materialized;
  } else records = options.records;

  if (records.length !== EXPECTED_BUILT_IN_PRESET_RELEASE.length) errors.push(`release length ${records.length} does not match golden ${EXPECTED_BUILT_IN_PRESET_RELEASE.length}`);
  const ids = records.map(record => record.id);
  if (new Set(ids).size !== ids.length) errors.push('release contains duplicate IDs');
  records.forEach((record, index) => {
    if (index >= EXPECTED_BUILT_IN_PRESET_RELEASE.length) return;
    const expected = expectedRecord(index) as BuiltInTrainingPresetRecord;
    if (record.id !== expected.id || record.model_arch !== expected.model_arch || record.intent_slug !== expected.intent_slug || record.catalog_revision !== expected.catalog_revision) errors.push(`ID/field identity drift at row ${index}: ${record.id}`);
    if (record.evidence !== expected.evidence) errors.push(`unsupported stronger evidence label at row ${index}: ${record.evidence}`);
    if (canonical(record) !== canonical(expected)) errors.push(`release order/content drift at row ${index}: ${record.id}`);
  });
  if (new Set(records.map(record => record.catalog_revision)).size !== 1) errors.push('mixed catalog revision');
  const expectedCategories = EXPECTED_BUILT_IN_PRESET_RELEASE.map(record => record.category).sort();
  const actualCategories = records.map(record => record.category).sort();
  if (canonical(actualCategories) !== canonical(expectedCategories)) errors.push('category coverage drift');
  const expectedRecipes = EXPECTED_BUILT_IN_PRESET_RELEASE.map(record => record.recipe_path).sort();
  const actualRecipes = records.map(record => record.recipe_path).sort();
  if (canonical(actualRecipes) !== canonical(expectedRecipes)) errors.push('recipe coverage drift');
  if (canonical(BUILT_IN_ARCHITECTURE_BINDINGS) !== canonical(GOLDEN_BINDINGS)) errors.push('production architecture binding drift from golden release');
  if (canonical(BUILT_IN_ARCHITECTURE_ORDER) !== canonical(GOLDEN_BINDINGS.map(binding => binding.ui_arch))) errors.push('production architecture order drift from golden release');
  if (canonical(BUILT_IN_RECIPE_PATHS) !== canonical(GOLDEN_RECIPE_PATHS)) errors.push('production recipe path coverage/order drift from golden release');

  try {
    const manifest = JSON.parse(readFileSync(confinedFile(options.repositoryRoot, 'docs/book/book-manifest.json'), 'utf8'));
    if (canonical(manifest.preset_architectures) !== canonical(GOLDEN_BINDINGS.map(binding => binding.ui_arch))) throw new Error('manifest preset architecture order drift');
    const manifestPages = new Set((manifest.pages as Array<{ path?: string }>).map(row => `docs/book/${row.path}`));
    for (const recipe of BUILT_IN_RECIPE_PATHS) if (!manifestPages.has(recipe)) throw new Error(`manifest omits ${recipe}`);
  } catch (error) { errors.push(`manifest: ${error instanceof Error ? error.message : String(error)}`); }

  for (const recipe of BUILT_IN_RECIPE_PATHS) {
    try {
      const document = readFileSync(confinedFile(options.repositoryRoot, recipe), 'utf8');
      validateMarkers(document, records, recipe);
      const links = modelLinks(document, recipe);
      const expectedLinks = RECIPE_MODEL_PAGES[recipe];
      if (canonical(links) !== canonical(expectedLinks)) {
        const missing = expectedLinks.filter(link => !links.includes(link));
        const extra = links.filter(link => !expectedLinks.includes(link));
        const kind = missing.length > 0 && extra.length > 0 ? 'wrong' : missing.length > 0 ? 'missing' : 'extra';
        throw new Error(`${recipe}: ${kind} model-family deviation link`);
      }
      const memberships = links.map(path => ({ path, architectures: modelArchitectures(options.repositoryRoot, path) }));
      const recipeArchitectures = new Set(records.filter(record => record.recipe_path === recipe).map(record => record.model_arch));
      for (const architecture of recipeArchitectures) if (!memberships.some(item => item.architectures.includes(architecture))) throw new Error(`${recipe}: model links do not contain generated membership for ${architecture}`);
      for (const item of memberships) if (!item.architectures.some(architecture => recipeArchitectures.has(architecture))) throw new Error(`${recipe}: linked model block ${item.path} maps no preset architecture`);
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }

  const expectedBackend = { schema_version: 1, bindings: GOLDEN_BINDINGS.map(binding => ({
    ui_architecture: binding.ui_arch, normalized_architecture: binding.engine_arch, model_class: binding.model_class,
    source_path: BACKEND_SOURCE_PATHS[binding.ui_arch], symbol: binding.model_class,
  })) };
  if (options.backendReport.bindings.some((binding, index) => binding.model_class !== expectedBackend.bindings[index]?.model_class)) errors.push('backend class drift');
  if (canonical(options.backendReport) !== canonical(expectedBackend)) errors.push('backend mapping report drift');
  const expectedUi = { schema_version: 1, architectures: GOLDEN_BINDINGS.map(binding => ({
    name: binding.ui_arch, model_path: binding.model_path,
    gate_url: binding.ui_arch === 'flux' ? 'https://huggingface.co/black-forest-labs/FLUX.1-dev' : null, controls: [],
  })) };
  if (canonical(options.uiFacts) !== canonical(expectedUi)) errors.push('UI architecture/model_path/gate_url/controls report drift');
  try { validateEvidence(options.repositoryRoot, records); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (errors.length) throw new Error(`Built-in training preset release validation failed:\n- ${errors.join('\n- ')}`);
}

export function renderBuiltInTrainingPresetRecipeBlock(records: readonly BuiltInTrainingPresetRecord[], recipe: string): string {
  return `${START}\n${markerRows(records, recipe)}\n${END}`;
}
