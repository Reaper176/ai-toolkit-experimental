import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts = require('typescript');

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/jobs/new/page.tsx'), 'utf8');
const normalizedSource = pageSource.replace(/\s+/g, ' ');

assert.equal(
  (pageSource.match(/import\s+(?:\{\s*)?TrainingPresetControl(?:\s*\})?\s+from\s+['"][^'"]+['"]/g) ?? []).length,
  1,
  'the training page must import TrainingPresetControl exactly once',
);

const sourceFile = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const presetNodes: ts.JsxSelfClosingElement[] = [];
function visit(node: ts.Node): void {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === 'TrainingPresetControl') {
    presetNodes.push(node);
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);
assert.equal(presetNodes.length, 1, 'TrainingPresetControl must be a single self-closing JSX element');
for (let ancestor = presetNodes[0].parent; !ts.isSourceFile(ancestor); ancestor = ancestor.parent) {
  assert.equal(ts.isConditionalExpression(ancestor), false, 'preset control must not be conditionally rendered');
  assert.equal(
    ts.isBinaryExpression(ancestor) && ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken,
    false,
    'preset control must not be inside a logical conditional',
  );
}
assert.equal(
  (pageSource.match(/<TrainingPresetControl\b/g) ?? []).length,
  1,
  'the training page must render exactly one TrainingPresetControl',
);

const advancedControlIndex = normalizedSource.indexOf('Import Config');
const simpleControlIndex = normalizedSource.indexOf('options={jobTypeOptions}');
const presetControlIndex = normalizedSource.indexOf('<TrainingPresetControl');
const viewToggleIndex = normalizedSource.indexOf("{showAdvancedView ? 'Show Simple' : 'Show Advanced'}");

assert.ok(advancedControlIndex >= 0, 'advanced mode controls must remain present');
assert.ok(simpleControlIndex >= 0, 'simple mode controls must remain present');
assert.ok(presetControlIndex > advancedControlIndex, 'preset control must follow the advanced mode controls');
assert.ok(presetControlIndex > simpleControlIndex, 'preset control must follow the simple mode controls');
assert.ok(viewToggleIndex > presetControlIndex, 'preset control must precede the view toggle');

const presetTagEnd = normalizedSource.indexOf('/>', presetControlIndex);
assert.ok(presetTagEnd > presetControlIndex, 'TrainingPresetControl must be self-closing');
const presetTag = normalizedSource.slice(presetControlIndex, presetTagEnd + 2);
assert.match(presetTag, /\bjobConfig=\{jobConfig\}/);
assert.match(presetTag, /\bonJobConfigChange=\{next\s*=>\s*setJobConfig\(next\)\}/);
assert.match(presetTag, /\bmigrateJobConfig=\{migrateJobConfig\}/);
assert.doesNotMatch(presetTag, /gpuIDs/);

const wrapperStart = normalizedSource.lastIndexOf('<div', presetControlIndex);
const wrapperOpeningTagEnd = normalizedSource.indexOf('>', wrapperStart);
assert.ok(wrapperStart >= 0 && wrapperOpeningTagEnd < presetControlIndex, 'preset control must have a wrapper');
const wrapperOpeningTag = normalizedSource.slice(wrapperStart, wrapperOpeningTagEnd + 1);
assert.match(wrapperOpeningTag, /flex-shrink-0/);
assert.match(wrapperOpeningTag, /\bpx-/);
assert.doesNotMatch(wrapperOpeningTag, /\bhidden\b/, 'preset wrapper must remain visible on mobile');

console.log('Training preset page integration tests passed');
