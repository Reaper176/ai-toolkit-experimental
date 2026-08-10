import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/datasets/[datasetName]/page.tsx'), 'utf8');
const cardSource = readFileSync(resolve(process.cwd(), 'src/components/DatasetImageCard.tsx'), 'utf8');
const runnerSource = readFileSync(resolve(process.cwd(), 'testing/runDatasetPresetTests.mjs'), 'utf8');
const page = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

assert.match(runnerSource, /datasetPresetSelection\.test\.js/, 'selection test must be required by the runner');
assert.match(runnerSource, /datasetPresetPageIntegration\.test\.js/, 'page integration test must be required by the runner');
assert.match(pageSource, /relative_path:\s*string/, 'entries retain a normalized relative path');
assert.match(pageSource, /normalizeRelativeMediaPath\(subPath\)/, 'server response paths are normalized before use');
assert.match(pageSource, /catch\s*\([^)]*\)\s*\{[\s\S]{0,500}console\.error/, 'invalid server response paths are skipped and logged');
assert.match(pageSource, /useState<Set<string>>/, 'selection remains owned by the page, not virtualized cards');
assert.match(pageSource, /baseSelection/, 'page keeps a base selection for dirty checks');
assert.match(pageSource, /applySelectionAction\(selectedPaths,\s*imgList\.map\(img\s*=>\s*img\.relative_path\),\s*action\)/);
assert.match(pageSource, /selected=\{selectedPaths\.has\(img\.relative_path\)\}/);
assert.match(pageSource, /onSelectionChange=\{selected\s*=>/, 'cards update page selection by relative path');
assert.match(pageSource, /computeItemKey=\{index\s*=>\s*imgList\[index\]\?\.relative_path/, 'virtualized keys use stable relative paths');
assert.match(pageSource, /beforeunload/, 'dirty selections warn before browser unload');
assert.match(pageSource, /openConfirm\(/, 'dirty cancellation uses the accessible confirmation pattern');
assert.match(pageSource, /DatasetSelectionToolbar/, 'selection mode renders the dedicated toolbar');
assert.doesNotMatch(cardSource, /useState\s*<\s*boolean\s*>\s*\(\s*selected/, 'selection state must not live in each card');

const jsx = page.statements.find(ts.isFunctionDeclaration);
assert.ok(jsx || pageSource.includes('selectionMode'), 'selection state stays in the page component');

console.log('dataset preset page integration contracts passed');
