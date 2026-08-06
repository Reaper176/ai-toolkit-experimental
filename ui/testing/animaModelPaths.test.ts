import assert from 'node:assert/strict';
import { clearUnsupportedAnimaPaths, normalizeOptionalModelPath } from '../src/helpers/animaModelPaths';

const configured = {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
  quantize: true,
};

const animaSections = ['model.te_name_or_path', 'model.vae_path'];
assert.equal(clearUnsupportedAnimaPaths(configured, animaSections), configured);

const cleaned = clearUnsupportedAnimaPaths(configured, []);
assert.deepEqual(cleaned, {
  name_or_path: '/models/anima.safetensors',
  quantize: true,
});
assert.notEqual(cleaned, configured);
assert.deepEqual(configured, {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  vae_path: '/models/vae.safetensors',
  quantize: true,
});

assert.deepEqual(clearUnsupportedAnimaPaths(configured, ['model.te_name_or_path']), {
  name_or_path: '/models/anima.safetensors',
  te_name_or_path: '/models/qwen.safetensors',
  quantize: true,
});
assert.deepEqual(clearUnsupportedAnimaPaths(configured, ['model.vae_path']), {
  name_or_path: '/models/anima.safetensors',
  vae_path: '/models/vae.safetensors',
  quantize: true,
});

const pathWithSpaces = '  /models/Anima Components/qwen encoder.safetensors  ';
assert.equal(normalizeOptionalModelPath(pathWithSpaces), pathWithSpaces);
assert.equal(normalizeOptionalModelPath('   '), undefined);
assert.equal(normalizeOptionalModelPath(undefined), undefined);

console.log('Anima model path tests passed');
