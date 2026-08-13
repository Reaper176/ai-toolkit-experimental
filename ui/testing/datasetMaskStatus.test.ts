import assert from 'node:assert/strict';
import { createDatasetMaskStatusHandler } from '../src/server/datasetMaskStatus';

const calls: string[] = [];
const handler = createDatasetMaskStatusHandler({
  datasetsRoot: async () => '/datasets',
  resolveMasks: async (folderPath, options) => {
    calls.push(`${folderPath}:${options?.datasetsRoot}`);
    return folderPath.endsWith('/masked') ? '/datasets/masked_masks' : null;
  },
});
async function main() {
  assert.deepEqual(await (await handler(new Request('http://localhost/status?folder_path=%2Fdatasets%2Fmasked'))).json(), { has_masks: true });
  assert.deepEqual(await (await handler(new Request('http://localhost/status?folder_path=%2Fdatasets%2Fplain'))).json(), { has_masks: false });
  assert.deepEqual(calls, ['/datasets/masked:/datasets', '/datasets/plain:/datasets']);
  assert.equal((await handler(new Request('http://localhost/status'))).status, 400);
  const rejected = createDatasetMaskStatusHandler({
    datasetsRoot: async () => '/datasets', resolveMasks: async () => { throw new Error('escapes configured datasets root'); },
  });
  const response = await rejected(new Request('http://localhost/status?folder_path=%2Foutside'));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid live dataset path' });
  console.log('dataset mask status tests passed');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
