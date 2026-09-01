import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TrainingPresetDetails } from '../src/components/TrainingPresetDetails';
import { EXPECTED_BUILT_IN_PRESET_RELEASE } from '../src/helpers/builtInTrainingPresetGolden';
import { validateBuiltInTrainingPresetRecord } from '../src/helpers/builtInTrainingPresets';

const { binding: _binding, ...focusedGolden } = EXPECTED_BUILT_IN_PRESET_RELEASE[1];
const preset = validateBuiltInTrainingPresetRecord(structuredClone(focusedGolden));
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
let renderer!: TestRenderer.ReactTestRenderer;
act(() => {
  renderer = TestRenderer.create(<TrainingPresetDetails preset={preset} />);
});
const root = renderer.root;

assert.equal(root.findByType('h3').children.join(''), 'Anima — Focused Refinement');
assert.equal(
  root.findByProps({ 'data-preset-summary': true }).children.join(''),
  'Anima starting point biased toward low-noise detail and focused refinement.',
);
assert.equal(root.findByProps({ 'data-preset-evidence': true }).children.join(''), 'Configuration validated');
assert.deepEqual(
  root.findByProps({ 'data-preset-prerequisites': true }).findAllByType('li').map(item => item.children.join('')),
  [
    'Select the exact model architecture shown by this preset.',
    'Review the linked recipe and provide a compatible dataset; dataset settings are not changed.',
  ],
);
assert.deepEqual(
  root.findByProps({ 'data-preset-warnings': true }).findAllByType('li').map(item => item.children.join('')),
  [
    'Configuration validation does not guarantee output quality or a specific VRAM requirement.',
    'Masks and inverted-mask prior are not enabled automatically.',
  ],
);
const anchor = root.findByType('a');
assert.equal(anchor.props.href,
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/recipes/focused-refinement.md');
assert.equal(anchor.props.target, '_blank');
assert.equal(anchor.props.rel, 'noopener noreferrer');

act(() => renderer.unmount());
delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
console.log('training preset details tests passed');
