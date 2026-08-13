import assert from 'node:assert/strict';
import { createDatasetMaskStatusHandler } from '../src/server/datasetMaskStatus';
import { probeLiveMaskAvailability } from '../src/server/datasetMaskService';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
        maxDirectories: options?.maxDirectories, maxMaskBytes: options?.maxMaskBytes,
      }, { maxDepth: 8, maxFiles: 1_000, maxEntries: 2_000, maxDirectories: 500, maxMaskBytes: 1024 * 1024 });
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

  let clock = 0;
  const keys: string[] = [];
  const bounded = createDatasetMaskStatusHandler({
    datasetsRoot: async () => '/datasets', canonicalize: async path => path, now: () => clock,
    ttlMs: 10, maxCacheEntries: 2,
    resolveMasks: async path => { keys.push(path); return null; },
  });
  const probe = (key: string) => bounded(new Request(`http://localhost/status?folder_path=${encodeURIComponent(key)}`));
  await probe('/datasets/a'); await probe('/datasets/b'); await probe('/datasets/c');
  await probe('/datasets/a');
  assert.deepEqual(keys, ['/datasets/a', '/datasets/b', '/datasets/c', '/datasets/a'], 'cache evicts its oldest key');
  clock = 11;
  await probe('/datasets/c');
  assert.equal(keys.filter(key => key === '/datasets/c').length, 2, 'expired entries are removed and reprobed');

  let active = 0;
  let maximumActive = 0;
  let releaseAll!: () => void;
  const gate = new Promise<void>(resolve => { releaseAll = resolve; });
  const limited = createDatasetMaskStatusHandler({
    datasetsRoot: async () => '/datasets', canonicalize: async path => path, maxConcurrent: 2, maxQueue: 1,
    resolveMasks: async () => {
      active += 1; maximumActive = Math.max(maximumActive, active);
      await gate;
      active -= 1; return null;
    },
  });
  const distinct = ['/datasets/1', '/datasets/2', '/datasets/3', '/datasets/4'].map(path =>
    limited(new Request(`http://localhost/status?folder_path=${encodeURIComponent(path)}`)));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(maximumActive, 2, 'global probe concurrency is bounded');
  assert.equal((await distinct[3]).status, 429, 'requests beyond the bounded queue are rejected');
  releaseAll();
  await Promise.all(distinct.slice(0, 3));

  const root = await mkdtemp(join(tmpdir(), 'mask-status-lightweight-'));
  try {
    const source = join(root, 'images');
    const masks = join(root, 'images_masks');
    await mkdir(source); await mkdir(masks);
    await writeFile(join(source, 'one.jpg'), Buffer.alloc(0));
    const header = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
    header.writeUInt32BE(13, 8); header.write('IHDR', 12, 'ascii'); header.writeUInt32BE(32, 16); header.writeUInt32BE(32, 20);
    await writeFile(join(masks, 'one.png'), header);
    assert.equal(await probeLiveMaskAvailability(source, { datasetsRoot: root, maxMaskBytes: 32 }), masks,
      'status accepts a bounded PNG header without decoding or reading source bytes');
    await assert.rejects(probeLiveMaskAvailability(source, { datasetsRoot: root, maxMaskBytes: 23 }), /limits/i,
      'status enforces a hard mask stat-size budget before reading');
  } finally { await rm(root, { recursive: true, force: true }); }
  console.log('dataset mask status tests passed');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
