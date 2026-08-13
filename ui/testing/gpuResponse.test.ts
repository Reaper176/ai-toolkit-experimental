import assert from 'node:assert/strict';
import { formatGpuFan, shouldRetryGpuInfo } from '../src/helpers/gpu';

assert.equal(shouldRetryGpuInfo({ backend: null }), true);
assert.equal(shouldRetryGpuInfo({ backend: 'nvidia' }), false);
assert.equal(shouldRetryGpuInfo({ backend: 'rocm' }), false);
assert.equal(shouldRetryGpuInfo({ backend: 'mps' }), false);
assert.equal(formatGpuFan({ speed: 875, unit: 'RPM' }), '875 RPM');
assert.equal(formatGpuFan({ speed: 42 }), '42%');

console.log('GPU response tests passed');
