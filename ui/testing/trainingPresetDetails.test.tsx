import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TrainingPresetDetails } from '../src/components/TrainingPresetDetails';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../src/helpers/builtInTrainingPresetDefinitions';

const preset = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[1]);
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
let renderer!: TestRenderer.ReactTestRenderer;
act(() => {
  renderer = TestRenderer.create(<TrainingPresetDetails preset={preset} />);
});
const root = renderer.root;

assert.equal(root.findByType('h3').children.join(''), preset.name);
assert.equal(root.findByProps({ 'data-preset-summary': true }).children.join(''), preset.summary);
assert.equal(root.findByProps({ 'data-preset-evidence': true }).children.join(''), 'Configuration validated');
assert.deepEqual(
  root.findByProps({ 'data-preset-prerequisites': true }).findAllByType('li').map(item => item.children.join('')),
  preset.prerequisites,
);
assert.deepEqual(
  root.findByProps({ 'data-preset-warnings': true }).findAllByType('li').map(item => item.children.join('')),
  preset.warnings,
);
const anchor = root.findByType('a');
assert.equal(anchor.props.href,
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/recipes/focused-refinement.md');
assert.equal(anchor.props.target, '_blank');
assert.equal(anchor.props.rel, 'noopener noreferrer');

act(() => renderer.unmount());
delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
console.log('training preset details tests passed');
