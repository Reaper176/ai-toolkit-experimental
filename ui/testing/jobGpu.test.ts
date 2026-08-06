import assert from 'node:assert/strict';
import { resolveGpuIds } from '../src/server/jobGpu';

assert.equal(resolveGpuIds(null, true), 'mps');
assert.equal(resolveGpuIds(undefined, true), 'mps');
assert.equal(resolveGpuIds(' 0 ', false), '0');
assert.equal(resolveGpuIds('0,1', false), '0,1');
assert.equal(resolveGpuIds(null, false), null);
assert.equal(resolveGpuIds(undefined, false), null);
assert.equal(resolveGpuIds('', false), null);
assert.equal(resolveGpuIds('   ', false), null);
console.log('Job GPU validation tests passed');
