import assert from 'node:assert/strict';
import { POST } from '../src/app/api/jobs/route';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultJobConfig } from '../src/app/jobs/new/jobConfig';
import type { JobConfig } from '../src/types';

async function main(): Promise<void> {
  const malformed = await POST(new Request('http://localhost/api/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"clone":',
  }));
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Job dataset preset configuration is invalid' });

  for (const [field, value] of [
    ['inverted_mask_prior', null],
    ['inverted_mask_prior_multiplier', null],
    ['train_turbo', null],
    ['inverted_mask_prior', 'true'],
  ] as const) {
    const handcrafted = structuredClone(defaultJobConfig) as JobConfig;
    (handcrafted.config.process[0].train as unknown as Record<string, unknown>)[field] = value;
    const response = await POST(new Request('http://localhost/api/jobs', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: null, clone: false, name: `invalid ${field}`, gpu_ids: '0', job_config: handcrafted }),
    }));
    assert.equal(response.status, 400);
    assert.match(String((await response.json()).error), /inverted mask prior|turbo/i);
  }

  const invalidClone = await POST(new Request('http://localhost/api/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: null, clone: 'true', name: 'copy', gpu_ids: '0', job_config: {} }),
  }));
  assert.equal(invalidClone.status, 400, 'clone signal must be an explicit boolean');
  assert.deepEqual(await invalidClone.json(), { error: 'Invalid job request' });
  const canonicalMaskPath = await mkdtemp(join(tmpdir(), 'browser-mask-override-'));
  try {
    const attacked = structuredClone(defaultJobConfig);
    attacked.config.process[0].datasets[0].folder_path = canonicalMaskPath;
    attacked.config.process[0].datasets[0].mask_path = canonicalMaskPath;
    const response = await POST(new Request('http://localhost/api/jobs', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: null, clone: false, name: 'mask attack', gpu_ids: '0', job_config: attacked }),
    }));
    assert.equal(response.status, 400, 'canonical browser mask paths are rejected before persistence');
    assert.deepEqual(await response.json(), { error: 'Job dataset preset configuration is invalid' });
  } finally {
    await rm(canonicalMaskPath, { recursive: true, force: true });
  }
  console.log('jobs route request boundary tests passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
