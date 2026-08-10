import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/datasets/[datasetName]/page.tsx'), 'utf8');
const cardSource = readFileSync(resolve(process.cwd(), 'src/components/DatasetImageCard.tsx'), 'utf8');
const runnerSource = readFileSync(resolve(process.cwd(), 'testing/runDatasetPresetTests.mjs'), 'utf8');
const simpleJobSource = readFileSync(resolve(process.cwd(), 'src/app/jobs/new/SimpleJob.tsx'), 'utf8');
const jobPageSource = readFileSync(resolve(process.cwd(), 'src/app/jobs/new/page.tsx'), 'utf8');
const lifecycleSource = readFileSync(
  resolve(process.cwd(), 'src/components/DatasetPresetLifecycleControls.tsx'),
  'utf8',
);
assert.doesNotMatch(lifecycleSource, /role=["']menu(?:item)?["']/, 'management disclosure does not claim unsupported menu keyboard behavior');
const page = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

assert.match(runnerSource, /datasetPresetSelection\.test\.js/, 'selection test must be required by the runner');
assert.match(
  runnerSource,
  /datasetPresetPageIntegration\.test\.js/,
  'page integration test must be required by the runner',
);
assert.match(runnerSource, /datasetPresetDialog\.test\.js/, 'dialog test must be required by the runner');
assert.match(
  runnerSource,
  /datasetSourceControl\.test\.js/,
  'training source-control test must be required by the runner',
);
assert.match(simpleJobSource, /<DatasetSourceControl\b/, 'dataset blocks render the shared source control');
assert.match(simpleJobSource, /key=\{datasetBlockIds\[i\]\}/, 'dataset source controls use stable UI-only block keys');
assert.match(
  simpleJobSource,
  /instanceToken=\{datasetBlockIds\[i\]\}/,
  'dataset source controls receive their stable instance token',
);
assert.doesNotMatch(
  simpleJobSource,
  /dataset_preset_ui_id/,
  'UI block identities are never persisted in DatasetConfig',
);
assert.doesNotMatch(
  simpleJobSource,
  /<SelectInput\s+label=["']Target Dataset["']/,
  'the old target selector is replaced instead of duplicated',
);
assert.match(
  simpleJobSource,
  /onChange=\{next\s*=>\s*setJobConfig\(next,\s*`config\.process\[0\]\.datasets\[\$\{i\}\]`\)\}/,
  'source changes replace the same dataset object edited by all loader controls',
);
assert.match(
  jobPageSource,
  /removeArchivedPresetSourcesFromClone/,
  'clone hydration checks stored preset availability',
);
assert.match(
  jobPageSource,
  /buildTrainingJobSaveRequest\(\{[\s\S]{0,200}runId,[\s\S]{0,100}cloneId,/,
  'job saves derive the explicit clone flag from the actual clone query mode',
);
assert.match(
  jobPageSource,
  /canSaveTrainingJob\(presetReady,\s*jobConfig\)/,
  'job saving validates readiness and every dataset source',
);
assert.match(jobPageSource, /if\s*\(!presetReady\)\s*return/, 'all save entry points are blocked before hydration');
assert.match(
  jobPageSource,
  /<Button[\s\S]{0,300}onClick=\{\(\)\s*=>\s*saveJob\(\)\}[\s\S]{0,300}disabled=\{!presetReady/,
  'topbar save control is disabled before hydration',
);
assert.match(jobPageSource, /isLoading=\{[^}]*!presetReady[^}]*\}/, 'simple form is noninteractive before hydration');
assert.match(
  simpleJobSource,
  /inert=\{isLoading\s*\?\s*true\s*:\s*undefined\}/,
  'blocked simple form is removed from keyboard interaction',
);
assert.match(simpleJobSource, /aria-busy=\{isLoading\}/, 'blocked simple form exposes semantic busy state');
assert.match(
  jobPageSource,
  /inert=\{!presetReady\s*\?\s*true\s*:\s*undefined\}/,
  'advanced editor is inert during hydration',
);
assert.ok(
  jobPageSource.indexOf('loadedJobConfig = await removeArchivedPresetSourcesFromClone') <
    jobPageSource.indexOf("dispatchPresetPage({ type: 'external-load-succeeded'"),
  'clone availability completes before the page becomes ready',
);
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
  /activeVersion\.manifest\.files[\s\S]{0,220}selectedPaths\.has\(path\)/,
  'every still-selected base-version path is retained from immutable snapshot storage',
);
assert.match(
  pageSource,
  /selectedPaths[\s\S]{0,220}!activeManifestPaths[^\n]*has\(path\)/,
  'only paths absent from the base manifest are sent as newly selected live files',
);
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
assert.match(pageSource, /DatasetSourceMissingList/, 'missing source entries use the selection-gated list');
assert.match(
  pageSource,
  /manifest\.files\.map\(file\s*=>\s*file\.source_path\)/,
  'version selection includes every manifest path',
);
assert.match(pageSource, /await refreshPresets\(\)/, 'publication refreshes the preset list');
assert.match(pageSource, /setBaseSelection\(/, 'publication establishes a clean immutable base selection');
assert.match(pageSource, /DatasetPresetDialog/, 'page opens the save/version dialog');
assert.match(pageSource, /onSave=/, 'selection toolbar can save a nonempty selection');
assert.match(pageSource, /activeVersion/, 'toolbar displays the active immutable version');
assert.match(
  pageSource,
  /confirmSelectionReplacement/,
  'loading another preset cannot silently discard a dirty selection',
);
assert.match(
  pageSource,
  /createLatestDatasetPresetRequestGate/,
  'preset and version loads use latest-request identity',
);
assert.match(pageSource, /if \(!request\.isCurrent\(\)\) return/, 'stale preset results and errors are ignored');
assert.match(pageSource, /if \(!latest\) return/, 'empty presets remain cleared instead of retaining an old version');
assert.match(pageSource, /presetLoadError/, 'current preset load failures are recoverable in the toolbar');
assert.match(pageSource, /DatasetPresetLifecycleControls/, 'active versions expose lifecycle management');
assert.match(pageSource, /handleLifecycleChanged/, 'successful lifecycle actions refresh authoritative page state');
assert.match(
  lifecycleSource,
  /reference_count\s*===\s*0/,
  'permanent delete visibility is driven by authoritative version detail',
);
assert.match(pageSource, /archived_at\s*!==\s*null/, 'an active archived preset remains readable and can be restored');
assert.match(pageSource, /lifecyclePending/, 'page owns lifecycle pending state');
assert.match(
  pageSource,
  /disabled=\{selectionSaving\s*\|\|\s*lifecyclePending\}/,
  'normal preset and version selection is disabled while a lifecycle mutation is pending',
);
assert.match(pageSource, /onPendingChange=\{setLifecyclePending\}/, 'lifecycle controls coordinate page busy state');
assert.match(pageSource, /selectionDirty=\{selectionDirty\}/, 'delete eligibility receives current draft state');
assert.match(pageSource, /selectionDisabled=\{selectionInteractionLocked\}/, 'mounted cards lock selection during lifecycle work');
assert.match(pageSource, /saving=\{selectionSaving\s*\|\|\s*lifecyclePending\}/, 'toolbar and source-missing controls lock during lifecycle work');
assert.match(pageSource, /if \(selectionDirtyRef\.current\) return/, 'delete success never replaces a newly dirty draft');
assert.match(pageSource, /readOnly=\{archivedReadOnly\}/, 'archived preset selection is read-only');
assert.match(pageSource, /Archived presets are read-only/, 'archived publication restriction has a clear reason');

const jsx = page.statements.find(ts.isFunctionDeclaration);
assert.ok(jsx || pageSource.includes('selectionMode'), 'selection state stays in the page component');

console.log('dataset preset page integration contracts passed');
