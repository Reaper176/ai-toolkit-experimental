import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/datasets/[datasetName]/page.tsx'), 'utf8');
const cardSource = readFileSync(resolve(process.cwd(), 'src/components/DatasetImageCard.tsx'), 'utf8');
const runnerSource = readFileSync(resolve(process.cwd(), 'testing/runDatasetPresetTests.mjs'), 'utf8');
const page = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

assert.match(runnerSource, /datasetPresetSelection\.test\.js/, 'selection test must be required by the runner');
assert.match(
  runnerSource,
  /datasetPresetPageIntegration\.test\.js/,
  'page integration test must be required by the runner',
);
assert.match(runnerSource, /datasetPresetDialog\.test\.js/, 'dialog test must be required by the runner');
assert.match(pageSource, /relative_path:\s*string/, 'entries retain a normalized relative path');
assert.match(pageSource, /normalizeRelativeMediaPath\(subPath\)/, 'server response paths are normalized before use');
assert.match(
  pageSource,
  /catch\s*\([^)]*\)\s*\{[\s\S]{0,500}console\.error/,
  'invalid server response paths are skipped and logged',
);
assert.match(pageSource, /useState<Set<string>>/, 'selection remains owned by the page, not virtualized cards');
assert.match(pageSource, /baseSelection/, 'page keeps a base selection for dirty checks');
assert.match(
  pageSource,
  /applySelectionAction\(selectedPaths,\s*\[\.\.\.imgList\.map\(img\s*=>\s*img\.relative_path\),\s*\.\.\.sourceMissingPaths\],\s*action\)/,
);
assert.match(pageSource, /selected=\{selectedPaths\.has\(img\.relative_path\)\}/);
assert.match(pageSource, /onSelectionChange=\{selected\s*=>/, 'cards update page selection by relative path');
assert.match(
  pageSource,
  /computeItemKey=\{index\s*=>\s*imgList\[index\]\?\.relative_path/,
  'virtualized keys use stable relative paths',
);
assert.match(pageSource, /beforeunload/, 'dirty selections warn before browser unload');
assert.match(pageSource, /openConfirm\(/, 'dirty cancellation uses the accessible confirmation pattern');
assert.match(
  pageSource,
  /leaveGuardRef\.current\?\.requestLeave\(\)/,
  'topbar Back uses the native guarded history path',
);
assert.match(pageSource, /onCancel:\s*\(\)\s*=>\s*leaveGuardRef\.current\?\.cancelLeaveAttempt\(\)/);
assert.match(pageSource, /DatasetSelectionToolbar/, 'selection mode renders the dedicated toolbar');
assert.match(
  pageSource,
  /<MainContent[^>]*>[\s\S]*DatasetSelectionToolbar/,
  'selection toolbar stays inside the scrollable page content',
);
assert.match(pageSource, /sticky top-12 z-20/, 'selection toolbar sticks below the absolute top bar');
assert.match(
  pageSource,
  /getInterceptableInternalNavigationHref/,
  'dirty selection intercepts internal client navigation',
);
assert.match(pageSource, /consumeSentinelBeforeNavigation/, 'approved internal navigation removes the sentinel first');
assert.match(
  pageSource,
  /onCancel:\s*\(\)\s*=>\s*\{[\s\S]{0,120}internalNavigationPendingRef\.current = false/,
  'cancelled internal navigation keeps the draft',
);
assert.match(
  pageSource,
  /seenRelativePaths\.has\(relative_path\)/,
  'normalized duplicate paths are ignored before keying selection',
);
assert.doesNotMatch(
  cardSource,
  /useState\s*<\s*boolean\s*>\s*\(\s*selected/,
  'selection state must not live in each card',
);
assert.doesNotMatch(
  cardSource,
  /button[\s\S]{0,300}data-selection-media/,
  'media selection target is not a second focusable button',
);
assert.match(pageSource, /useDatasetPresets\(/, 'page loads active dataset presets');
assert.match(pageSource, /loadVersion\(/, 'page can load an immutable preset version');
assert.match(pageSource, /source-missing/, 'missing source entries are visibly labeled');
assert.match(
  pageSource,
  /manifest\.files\.map\(file\s*=>\s*file\.source_path\)/,
  'version selection includes every manifest path',
);
assert.match(
  pageSource,
  /selectedPaths\.has\(path\)\s*&&\s*!liveRelativePaths\.has\(path\)/,
  'retained paths are selected base files missing from the source',
);
assert.match(pageSource, /await refreshPresets\(\)/, 'publication refreshes the preset list');
assert.match(pageSource, /setBaseSelection\(/, 'publication establishes a clean immutable base selection');
assert.match(pageSource, /DatasetPresetDialog/, 'page opens the save/version dialog');
assert.match(pageSource, /onSave=/, 'selection toolbar can save a nonempty selection');
assert.match(pageSource, /activeVersion/, 'toolbar displays the active immutable version');
assert.match(pageSource, /confirmSelectionReplacement/, 'loading another preset cannot silently discard a dirty selection');

const jsx = page.statements.find(ts.isFunctionDeclaration);
assert.ok(jsx || pageSource.includes('selectionMode'), 'selection state stays in the page component');

console.log('dataset preset page integration contracts passed');
