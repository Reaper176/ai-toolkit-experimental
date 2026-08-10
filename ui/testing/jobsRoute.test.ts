import assert from 'node:assert/strict';
import { POST } from '../src/app/api/jobs/route';

async function main(): Promise<void> {
  const malformed = await POST(new Request('http://localhost/api/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"clone":',
  }));
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Job dataset preset configuration is invalid' });

  const invalidClone = await POST(new Request('http://localhost/api/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: null, clone: 'true', name: 'copy', gpu_ids: '0', job_config: {} }),
  }));
  assert.equal(invalidClone.status, 400, 'clone signal must be an explicit boolean');
  assert.deepEqual(await invalidClone.json(), { error: 'Invalid job request' });
  console.log('jobs route request boundary tests passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
