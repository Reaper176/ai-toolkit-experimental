import assert from 'node:assert/strict';
import { createDatasetMaskStatusHandler } from '../src/server/datasetMaskStatus';

const calls: string[] = [];
const handler = createDatasetMaskStatusHandler({
  datasetsRoot: async () => '/datasets',
  canonicalize: async path => path,
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
  datasetsRoot: async () => '/datasets', canonicalize: async path => path,
  resolveMasks: async () => { throw new Error('escapes configured datasets root'); },
  });
  const response = await rejected(new Request('http://localhost/status?folder_path=%2Foutside'));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid live dataset path' });

  let resolves = 0;
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const cached = createDatasetMaskStatusHandler({
    datasetsRoot: async () => '/datasets', ttlMs: 1_000,
    canonicalize: async path => path,
    resolveMasks: async (_path, options) => {
      resolves += 1;
      assert.deepEqual({
        maxDepth: options?.maxDepth, maxFiles: options?.maxFiles, maxEntries: options?.maxEntries,
        maxDirectories: options?.maxDirectories, maxPngBytes: options?.maxPngBytes,
      }, { maxDepth: 8, maxFiles: 1_000, maxEntries: 2_000, maxDirectories: 500, maxPngBytes: 1024 * 1024 });
      await blocked;
      return '/datasets/masked_masks';
    },
  });
  const request = new Request('http://localhost/status?folder_path=%2Fdatasets%2Fmasked');
  const concurrent = [cached(request), cached(request)];
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(resolves, 1, 'concurrent probes for one folder coalesce');
  release();
  await Promise.all(concurrent);
  await cached(request);
  assert.equal(resolves, 1, 'short TTL cache avoids repeated deep scans');
  console.log('dataset mask status tests passed');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
