import assert from 'node:assert/strict';
import { shouldRetryGpuInfo } from '../src/helpers/gpu';

assert.equal(shouldRetryGpuInfo({ backend: null }), true);
assert.equal(shouldRetryGpuInfo({ backend: 'nvidia' }), false);
assert.equal(shouldRetryGpuInfo({ backend: 'rocm' }), false);
assert.equal(shouldRetryGpuInfo({ backend: 'mps' }), false);

console.log('GPU response retry tests passed');
