import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/jobs/new/page.tsx'), 'utf8');
const presetControlSource = readFileSync(resolve(process.cwd(), 'src/components/TrainingPresetControl.tsx'), 'utf8');
const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout.tsx'), 'utf8');
const sourceFile = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const advancedSource = readFileSync(resolve(process.cwd(), 'src/components/AdvancedConfigEditor.tsx'), 'utf8');
const advancedSourceFile = ts.createSourceFile(
  'AdvancedConfigEditor.tsx',
  advancedSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const runnerSource = readFileSync(resolve(process.cwd(), 'testing/runTrainingPresetTests.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
assert.equal(
  packageJson.scripts['validate:training-presets'],
  'node testing/runTrainingPresetTests.mjs --catalog-only',
  'the release catalog validation command must be stable',
);
assert.equal(
  packageJson.scripts.build,
  'npm run validate:training-presets && tsc -p tsconfig.worker.json && next build',
  'build must validate the built-in release before either compiler/build phase',
);
assert.doesNotMatch(runnerSource, /optionalTestFiles/, 'every committed preset test artifact must be mandatory');
assert.doesNotMatch(
  runnerSource,
  /if\s*\(existsSync\(compiledTest\)\)/,
  'the preset runner must fail when any compiled test artifact is missing',
);
for (const sourceTest of readdirSync(resolve(process.cwd(), 'testing')).filter(file =>
  /^trainingPreset.*\.test\.tsx?$/.test(file),
)) {
  const compiledTest = sourceTest.replace(/\.tsx?$/, '.js');
  assert.match(runnerSource, new RegExp(`['"]${compiledTest}['"]`), `${compiledTest} must be required by the runner`);
}
for (const requiredCatalogArtifact of [
  'trainingPresetCatalog.test.js',
  'trainingPresetCatalogRuntime.test.js',
  'trainingPresetCatalogBuildValidation.test.js',
]) {
  assert.match(runnerSource, new RegExp(`['"]${requiredCatalogArtifact}['"]`), `${requiredCatalogArtifact} must be catalog-gated`);
}
assert.match(runnerSource, /--catalog-only/, 'runner must expose the build-safe catalog-only mode');
assert.match(runnerSource, /trainingPresetBackendMapping\.test\.py/, 'catalog validation must run the Python mapping checks');
assert.match(runnerSource, /trainingPresetCatalogBuildValidationCli\.js[\s\S]*--check/, 'catalog validation must run the strict release check');
assert.match(runnerSource, /generate_training_book_reference\.py[\s\S]*--check/, 'catalog validation must check generated book references');
const catalogTestFilesSource = /const catalogTestFiles = \[([\s\S]*?)\];/.exec(runnerSource)?.[1];
const lifecycleTestFilesSource = /const lifecycleTestFiles = \[([\s\S]*?)\];/.exec(runnerSource)?.[1];
assert.ok(catalogTestFilesSource, 'runner must declare its catalog-only artifacts explicitly');
assert.ok(lifecycleTestFilesSource, 'runner must declare its normal-mode lifecycle artifacts explicitly');
for (const normalOnlyArtifact of [
  'trainingPresets.test.js',
  'trainingPresetApplicationIntegration.test.js',
]) {
  assert.doesNotMatch(
    catalogTestFilesSource,
    new RegExp(normalOnlyArtifact.replaceAll('.', '\\.')),
    `catalog-only validation must not compile or execute ${normalOnlyArtifact}`,
  );
  assert.match(
    lifecycleTestFilesSource,
    new RegExp(normalOnlyArtifact.replaceAll('.', '\\.')),
    `normal validation must retain ${normalOnlyArtifact}`,
  );
}

function visitDescendants(node: ts.Node, predicate: (candidate: ts.Node) => boolean): ts.Node[] {
  const matches: ts.Node[] = [];
  function visit(candidate: ts.Node): void {
    if (predicate(candidate)) matches.push(candidate);
    ts.forEachChild(candidate, visit);
  }
  visit(node);
  return matches;
}

function jsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  return ts.isJsxElement(node) ? node.openingElement.tagName.getText(sourceFile) : node.tagName.getText(sourceFile);
}

function isJsxTag(node: ts.Node, name: string): node is ts.JsxElement | ts.JsxSelfClosingElement {
  return (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && jsxTagName(node) === name;
}

function jsxAttributes(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttributes {
  return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
}

function getAttribute(node: ts.JsxElement | ts.JsxSelfClosingElement, name: string): ts.JsxAttribute | undefined {
  return jsxAttributes(node).properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name,
  );
}

function getAttributeExpression(node: ts.JsxElement | ts.JsxSelfClosingElement, name: string): ts.Expression {
  const attribute = getAttribute(node, name);
  assert.ok(attribute, `TrainingPresetControl must have a ${name} attribute`);
  assert.ok(attribute.initializer && ts.isJsxExpression(attribute.initializer), `${name} must use a JSX expression`);
  assert.ok(attribute.initializer.expression, `${name} expression must not be empty`);
  return attribute.initializer.expression;
}

function unwrapParentheses(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

const presetImports = sourceFile.statements.filter((statement): statement is ts.ImportDeclaration => {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false;
  return statement.moduleSpecifier.text === '@/components/TrainingPresetControl';
});
assert.equal(presetImports.length, 1, 'the training page must import TrainingPresetControl exactly once');
const presetImportClause = presetImports[0].importClause;
assert.ok(presetImportClause, 'TrainingPresetControl import must bind the component');
const importsPresetControl =
  presetImportClause.name?.text === 'TrainingPresetControl' ||
  (presetImportClause.namedBindings !== undefined &&
    ts.isNamedImports(presetImportClause.namedBindings) &&
    presetImportClause.namedBindings.elements.some(element => element.name.text === 'TrainingPresetControl'));
assert.equal(importsPresetControl, true, 'the preset import must bind TrainingPresetControl');

const trainingForms = sourceFile.statements.filter(
  (statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === 'TrainingForm' &&
    statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) === true,
);
assert.equal(trainingForms.length, 1, 'the page must have one default TrainingForm function');
const trainingForm = trainingForms[0];
assert.ok(trainingForm.body, 'TrainingForm must have a body');
const returns = trainingForm.body.statements.filter(ts.isReturnStatement);
assert.equal(returns.length, 1, 'TrainingForm must have one top-level return');
assert.ok(returns[0].expression, 'TrainingForm must return JSX');

const topBars = visitDescendants(returns[0].expression, node => isJsxTag(node, 'TopBar')) as ts.JsxElement[];
assert.equal(topBars.length, 1, 'TrainingForm must render one TopBar');
const topBar = topBars[0];
assert.ok(ts.isJsxElement(topBar), 'TopBar must contain child controls');

const presetControls = visitDescendants(returns[0].expression, node =>
  isJsxTag(node, 'TrainingPresetControl'),
) as Array<ts.JsxElement | ts.JsxSelfClosingElement>;
assert.equal(presetControls.length, 1, 'TrainingForm must render exactly one TrainingPresetControl');
const presetControl = presetControls[0];

assert.match(layoutSource, /overflow-x-auto/, 'TopBar must retain horizontal scrolling for narrow toolbars');
assert.match(
  presetControlSource,
  /data-preset-details-region[\s\S]*?className="[^"]*\bfixed\b[^"]*\btop-12\b[^"]*"/,
  'preset details must use viewport-fixed positioning below the clipping TopBar',
);
assert.match(
  presetControlSource,
  /data-preset-details-region[\s\S]*?className="[^"]*\bwhitespace-normal\b[^"]*"/,
  'preset details must restore text wrapping inherited from the non-wrapping TopBar',
);
assert.doesNotMatch(
  presetControlSource,
  /data-preset-details-region[\s\S]*?className="[^"]*\b(?:absolute|top-full)\b[^"]*"/,
  'preset details must not use positioning that is clipped by TopBar overflow',
);

let presetWrapper: ts.Node = presetControl;
while (presetWrapper.parent !== topBar && !ts.isSourceFile(presetWrapper)) presetWrapper = presetWrapper.parent;
assert.equal(presetWrapper.parent, topBar, 'TrainingPresetControl must be inside TopBar');
assert.ok(ts.isJsxElement(presetWrapper), 'TrainingPresetControl must be wrapped by a direct TopBar child');
assert.equal(jsxTagName(presetWrapper), 'div', 'TrainingPresetControl wrapper must be a div');
const wrapperChildren = presetWrapper.children.filter(child => !ts.isJsxText(child) || child.text.trim() !== '');
assert.equal(wrapperChildren.length, 1, 'preset wrapper must have one meaningful child');
assert.equal(wrapperChildren[0], presetControl, 'TrainingPresetControl must be the wrapper’s direct child');

const topBarChildren = topBar.children.filter(child => !ts.isJsxText(child) || child.text.trim() !== '');
const wrapperIndex = topBarChildren.indexOf(presetWrapper as ts.JsxChild);
assert.ok(wrapperIndex >= 0, 'preset wrapper must be a semantic TopBar child');

function logicalCondition(child: ts.JsxChild): ts.Expression | undefined {
  if (!ts.isJsxExpression(child) || !child.expression) return undefined;
  const expression = unwrapParentheses(child.expression);
  if (!ts.isBinaryExpression(expression) || expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
    return undefined;
  }
  return unwrapParentheses(expression.left);
}

const advancedIndex = topBarChildren.findIndex(child => {
  const condition = logicalCondition(child);
  return condition !== undefined && ts.isIdentifier(condition) && condition.text === 'showAdvancedView';
});
const simpleIndex = topBarChildren.findIndex(child => {
  const condition = logicalCondition(child);
  return (
    condition !== undefined &&
    ts.isPrefixUnaryExpression(condition) &&
    condition.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isIdentifier(condition.operand) &&
    condition.operand.text === 'showAdvancedView'
  );
});
assert.ok(advancedIndex >= 0, 'TopBar must retain the advanced-mode conditional');
assert.ok(simpleIndex >= 0, 'TopBar must retain the simple-mode conditional');
assert.ok(wrapperIndex > advancedIndex, 'preset wrapper must follow the advanced-mode conditional');
assert.ok(wrapperIndex > simpleIndex, 'preset wrapper must follow the simple-mode conditional');

function isViewToggleButton(node: ts.Node): boolean {
  if (!isJsxTag(node, 'Button')) return false;
  const onClick = getAttribute(node, 'onClick');
  if (!onClick?.initializer || !ts.isJsxExpression(onClick.initializer) || !onClick.initializer.expression)
    return false;
  return (
    visitDescendants(onClick.initializer.expression, candidate => {
      return (
        ts.isCallExpression(candidate) &&
        ts.isIdentifier(candidate.expression) &&
        candidate.expression.text === 'setShowAdvancedView'
      );
    }).length > 0
  );
}

const toggleButtons = visitDescendants(topBar, isViewToggleButton);
assert.equal(toggleButtons.length, 1, 'TopBar must have one view-toggle button');
let toggleWrapper = toggleButtons[0];
while (toggleWrapper.parent !== topBar) toggleWrapper = toggleWrapper.parent;
const toggleIndex = topBarChildren.indexOf(toggleWrapper as ts.JsxChild);
assert.ok(toggleIndex > wrapperIndex, 'preset wrapper must precede the view-toggle control');

const importButtons = visitDescendants(topBar, node => {
  return (
    isJsxTag(node, 'Button') &&
    visitDescendants(node, child => ts.isJsxText(child) && child.text.trim() === 'Import Config').length === 1
  );
}) as Array<ts.JsxElement | ts.JsxSelfClosingElement>;
assert.equal(importButtons.length, 1, 'TopBar must have one Import Config button');
const importDisabled = unwrapParentheses(getAttributeExpression(importButtons[0], 'disabled'));
assert.ok(
  ts.isPrefixUnaryExpression(importDisabled) &&
    importDisabled.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isIdentifier(importDisabled.operand) &&
    importDisabled.operand.text === 'presetReady',
  'Import Config must stay disabled until hydration is ready',
);

const jobConfigExpression = unwrapParentheses(getAttributeExpression(presetControl, 'jobConfig'));
assert.ok(ts.isIdentifier(jobConfigExpression) && jobConfigExpression.text === 'jobConfig');
const migrateExpression = unwrapParentheses(getAttributeExpression(presetControl, 'migrateJobConfig'));
assert.ok(ts.isIdentifier(migrateExpression) && migrateExpression.text === 'migrateJobConfig');
const keyExpression = unwrapParentheses(getAttributeExpression(presetControl, 'key'));
assert.ok(
  ts.isIdentifier(keyExpression) && keyExpression.text === 'presetSessionGeneration',
  'preset control key must use the external-replacement generation',
);
const disabledExpression = unwrapParentheses(getAttributeExpression(presetControl, 'disabled'));
assert.ok(
  ts.isPrefixUnaryExpression(disabledExpression) &&
    disabledExpression.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isIdentifier(disabledExpression.operand) &&
    disabledExpression.operand.text === 'presetReady',
  'preset control must be disabled until page hydration is ready',
);

const changeExpression = unwrapParentheses(getAttributeExpression(presetControl, 'onJobConfigChange'));
assert.ok(ts.isArrowFunction(changeExpression), 'onJobConfigChange must be an arrow function');
assert.equal(changeExpression.parameters.length, 1, 'onJobConfigChange must accept exactly one parameter');
const changeParameter = changeExpression.parameters[0].name;
assert.ok(ts.isIdentifier(changeParameter), 'onJobConfigChange parameter must be an identifier');
const setterCalls = visitDescendants(changeExpression.body, node => {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'setJobConfig') {
    return false;
  }
  return (
    node.arguments.length === 1 &&
    ts.isIdentifier(unwrapParentheses(node.arguments[0])) &&
    (unwrapParentheses(node.arguments[0]) as ts.Identifier).text === changeParameter.text
  );
});
assert.equal(setterCalls.length, 1, 'onJobConfigChange must pass its parameter to setJobConfig');
const datasetGenerationCalls = visitDescendants(changeExpression.body, node => {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'bumpDatasetSourceGeneration';
});
assert.equal(datasetGenerationCalls.length, 1, 'training preset apply and undo invalidate dataset-source instances');
assert.match(
  pageSource,
  /datasetInstanceToken=\{`\$\{presetSourceKey\}:\$\{presetSessionGeneration\}:\$\{datasetSourceGeneration\}`\}/,
  'SimpleJob source token includes whole-config replacement generation',
);

assert.equal(getAttribute(presetControl, 'gpuIDs'), undefined, 'TrainingPresetControl must not receive gpuIDs');
assert.equal(
  visitDescendants(presetControl, node => ts.isIdentifier(node) && node.text === 'gpuIDs').length,
  0,
  'TrainingPresetControl subtree must not reference gpuIDs',
);
for (const catalogField of ['source', 'read_only', 'category', 'intent_slug', 'catalog_revision', 'summary', 'warnings', 'prerequisites', 'evidence']) {
  assert.equal(getAttribute(presetControl, catalogField), undefined, `page must not pass catalog-only ${catalogField} into job state`);
}

const classAttribute = getAttribute(presetWrapper, 'className');
assert.ok(
  classAttribute?.initializer && ts.isStringLiteral(classAttribute.initializer),
  'preset wrapper needs static classes',
);
const classTokens = classAttribute.initializer.text.split(/\s+/).filter(Boolean);
assert.ok(classTokens.includes('flex-shrink-0'), 'preset wrapper must not shrink');
assert.ok(
  classTokens.some(token => token.startsWith('px-')),
  'preset wrapper must use compact horizontal padding',
);
assert.equal(classTokens.includes('hidden'), false, 'preset wrapper must not be hidden on mobile');

const abortControllers = visitDescendants(trainingForm, node => {
  return ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'AbortController';
});
assert.ok(abortControllers.length >= 1, 'edit/clone hydration must use an AbortController');

const syncHelpers = advancedSourceFile.statements.filter(
  (statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'syncAdvancedEditorConfig',
);
assert.equal(syncHelpers.length, 1, 'advanced editor must expose one synchronization helper');
const guardAssignments = visitDescendants(syncHelpers[0], node => {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(node.left) &&
    node.left.name.text === 'current' &&
    ts.isIdentifier(node.right) &&
    node.right.text === 'currentUpdate'
  );
});
const modelSetValueCalls = visitDescendants(syncHelpers[0], node => {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'setValue'
  );
});
assert.equal(guardAssignments.length, 1, 'advanced sync must assign the serialized config guard');
assert.equal(modelSetValueCalls.length, 1, 'advanced sync must update the Monaco model once');
assert.ok(
  guardAssignments[0].getStart(advancedSourceFile) < modelSetValueCalls[0].getStart(advancedSourceFile),
  'advanced sync guard must be assigned before Monaco setValue',
);

console.log('Training preset page integration tests passed');
