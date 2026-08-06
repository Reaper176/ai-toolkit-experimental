import assert from 'node:assert/strict';
import { clearUnsupportedAnimaPaths } from '../src/helpers/animaModelPaths';

const configured = {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
};

assert.deepEqual(clearUnsupportedAnimaPaths(configured, true), configured);
const cleaned = clearUnsupportedAnimaPaths(configured, false);
assert.deepEqual(cleaned, {
  name_or_path: '/models/anima.safetensors',
});
assert.notEqual(cleaned, configured);
assert.deepEqual(configured, {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
});

console.log('Anima model path tests passed');
