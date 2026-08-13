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
assert.match(
  pageSource,
  /const\s*\[showOnlySelected,\s*setShowOnlySelected\]\s*=\s*useState\(false\)/,
  'page owns the selected-only view filter',
);
assert.match(pageSource, /baseSelection/, 'page keeps a base selection for dirty checks');
const selectionDirtySource = pageSource.match(/const\s+selectionDirty\s*=\s*[^;]+;/)?.[0];
assert.ok(selectionDirtySource, 'selection dirty derivation is present');
assert.match(
  selectionDirtySource,
  /selectionMode\s*&&\s*!areSelectionsEqual\(selectedPaths,\s*baseSelection\)/,
  'dirty state compares the full selected paths with the base selection',
);
assert.doesNotMatch(selectionDirtySource, /visibleImages|visibleMissingPaths/, 'dirty state is independent of view filters');
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
  /const\s+retainedPaths\s*=\s*activeVersion\s*\?[\s\S]*?activeVersion\.manifest\.files[\s\S]*?\.filter\(path\s*=>\s*selectedPaths\.has\(path\)\)[\s\S]*?:\s*\[\];/,
  'retained paths derive from the full active manifest and selected-path set',
);
assert.match(
  pageSource,
  /const\s+newlySelectedPaths\s*=\s*\[\.\.\.selectedPaths\]\.filter\(path\s*=>\s*!activeManifestPaths\.has\(path\)\)/,
  'newly selected paths derive from the full selected-path set and active manifest',
);
assert.match(
  pageSource,
  /<DatasetPresetDialog[\s\S]{0,700}selectedPaths=\{newlySelectedPaths\}\s+retainedPaths=\{retainedPaths\}/,
  'preset saves receive the full newly selected and retained path derivations',
);
assert.match(
  pageSource,
  /applySelectionAction\(selectedPaths,\s*\[\.\.\.imgList\.map\(img\s*=>\s*img\.relative_path\),\s*\.\.\.sourceMissingPaths\],\s*action\)/,
  'bulk selection actions use every live and source-missing path',
);
const selectionActionSource = pageSource.match(
  /const\s+handleSelectionAction\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\};/,
)?.[0];
assert.ok(selectionActionSource, 'selection action handler is present');
assert.doesNotMatch(
  selectionActionSource,
  /visibleImages|visibleMissingPaths/,
  'bulk selection actions are independent of view filters',
);
assert.match(pageSource, /selected=\{selectedPaths\.has\(img\.relative_path\)\}/);
assert.match(pageSource, /onSelectionChange=\{selected\s*=>/, 'cards update page selection by relative path');
assert.match(
  pageSource,
  /const\s+visibleImages\s*=\s*useMemo\([\s\S]{0,160}filterDatasetImagesBySelection\(imgList,\s*selectedPaths,\s*showOnlySelected\)[\s\S]{0,120}\[imgList,\s*selectedPaths,\s*showOnlySelected\]/,
  'visible image derivation uses the full image list, selection, and controlled filter state',
);
assert.match(
  pageSource,
  /const\s+visibleMissingPaths\s*=\s*useMemo\([\s\S]{0,160}filterPathsBySelection\(sourceMissingPaths,\s*selectedPaths,\s*showOnlySelected\)[\s\S]{0,120}\[sourceMissingPaths,\s*selectedPaths,\s*showOnlySelected\]/,
  'visible missing-path derivation uses the full missing list, selection, and controlled filter state',
);
assert.match(
  pageSource,
  /<MainContent\s+ref=\{scrollParentCallback\}\s+className=\{selectionMode\s*\?\s*['"]!pt-12['"]\s*:\s*undefined\}/,
  'selection mode deterministically removes the layout gap with an important padding override',
);
assert.match(
  pageSource,
  /<DatasetSelectionToolbar[\s\S]{0,500}showOnlySelected=\{showOnlySelected\}[\s\S]{0,160}onShowOnlySelectedChange=\{setShowOnlySelected\}/,
  'selection toolbar receives the controlled selected-only state',
);
assert.match(
  pageSource,
  /<DatasetSelectionToolbar[\s\S]{0,240}totalCount=\{imgList\.length\s*\+\s*sourceMissingPaths\.length\}/,
  'selection toolbar total remains based on the full dataset',
);
assert.match(
  pageSource,
  /status\s*===\s*['"]success['"]\s*&&\s*visibleImages\.length\s*>\s*0\s*&&\s*scrollParent\s*&&\s*\(\s*<VirtuosoGrid/,
  'virtualized grid render gate uses the visible image list',
);
assert.match(
  pageSource,
  /<VirtuosoGrid[\s\S]{0,120}totalCount=\{visibleImages\.length\}/,
  'virtualized total uses visible images',
);
assert.match(
  pageSource,
  /itemContent=\{index\s*=>\s*\{\s*const\s+img\s*=\s*visibleImages\[index\]/,
  'virtualized item lookup uses visible images',
);
assert.match(
  pageSource,
  /computeItemKey=\{index\s*=>\s*visibleImages\[index\]\?\.relative_path/,
  'virtualized keys use visible stable relative paths',
);
assert.match(pageSource, /<DatasetSourceMissingList\s+paths=\{visibleMissingPaths\}/, 'missing list uses visible paths');
assert.match(
  pageSource,
  /selectionMode\s*&&\s*showOnlySelected\s*&&\s*status\s*===\s*['"]success['"]\s*&&\s*imgList\.length\s*>\s*0\s*&&\s*visibleImages\.length\s*===\s*0\s*&&\s*visibleMissingPaths\.length\s*===\s*0/,
  'selected-only empty state is limited to a nonempty successfully loaded dataset',
);
assert.match(
  pageSource,
  /visibleMissingPaths\.length\s*===\s*0\s*&&\s*\(\s*<p\s+role=["']status["'][^>]*>\s*No selected images to show\.\s*<\/p>/,
  'selected-only empty state is announced with the exact accessible status message',
);
assert.match(
  pageSource,
  /discardSelectionRef\.current\s*=\s*\(\)\s*=>\s*\{[\s\S]{0,180}setShowOnlySelected\(false\)[\s\S]{0,80}setSelectionMode\(false\)/,
  'closing selection mode resets the selected-only filter before leaving the mode',
);
const applyLoadedVersionSource = pageSource.match(
  /const\s+applyLoadedVersion\s*=\s*useCallback\([\s\S]*?\n\s*\},\s*\[\]\);/,
)?.[0];
assert.ok(applyLoadedVersionSource, 'loaded-version callback is present');
assert.doesNotMatch(
  applyLoadedVersionSource,
  /setShowOnlySelected/,
  'loading a preset version preserves the selected-only view filter',
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
