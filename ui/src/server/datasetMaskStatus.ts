import { probeLiveMaskAvailability } from './datasetMaskService';
import { realpath } from 'node:fs/promises';

interface DatasetMaskStatusDependencies {
  datasetsRoot(): Promise<string>;
  resolveMasks?: (path: string, options?: Parameters<typeof probeLiveMaskAvailability>[1]) => Promise<string | null>;
  now?: () => number;
  ttlMs?: number;
  canonicalize?: (path: string) => Promise<string>;
  maxCacheEntries?: number;
  maxConcurrent?: number;
  maxQueue?: number;
}

export function createDatasetMaskStatusHandler(deps: DatasetMaskStatusDependencies) {
  const cache = new Map<string, { expires: number; value?: boolean; pending?: Promise<boolean> }>();
  const now = deps.now ?? Date.now;
  const ttlMs = deps.ttlMs ?? 5_000;
  const maxCacheEntries = deps.maxCacheEntries ?? 128;
  const maxConcurrent = deps.maxConcurrent ?? 2;
  const maxQueue = deps.maxQueue ?? 16;
  let active = 0;
  const queue: Array<{ resolve(): void; reject(error: Error): void }> = [];
  async function acquire(): Promise<void> {
    if (active < maxConcurrent) { active += 1; return; }
    if (queue.length >= maxQueue) throw new Error('Mask status queue is full');
    await new Promise<void>((resolve, reject) => queue.push({ resolve, reject }));
  }
  function release(): void {
    const next = queue.shift();
    if (next) next.resolve();
    else active -= 1;
  }
  function prune(): void {
    for (const [key, entry] of cache) {
      if (!entry.pending && entry.expires <= now()) cache.delete(key);
    }
    while (cache.size >= maxCacheEntries) {
      const oldest = [...cache].find(([, entry]) => !entry.pending)?.[0];
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
    if (cache.size >= maxCacheEntries) throw new Error('Mask status queue is full');
  }
  async function status(folderPath: string): Promise<boolean> {
    const cacheKey = await (deps.canonicalize ?? realpath)(folderPath);
    const existing = cache.get(cacheKey);
    if (existing?.pending) return existing.pending;
    if (existing && existing.value !== undefined && existing.expires > now()) return existing.value;
    if (existing) cache.delete(cacheKey);
    prune();
    const pending = (async () => {
      await acquire();
      try {
        return (await (deps.resolveMasks ?? probeLiveMaskAvailability)(folderPath, {
          datasetsRoot: await deps.datasetsRoot(), maxDepth: 8, maxFiles: 1_000, maxEntries: 2_000,
          maxDirectories: 500, maxMaskBytes: 1024 * 1024, maxDimension: 16_384,
        })) !== null;
      } finally { release(); }
    })();
    cache.set(cacheKey, { expires: 0, pending });
    try {
      const value = await pending;
      cache.set(cacheKey, { value, expires: now() + ttlMs });
      return value;
    } catch (error) {
      cache.delete(cacheKey);
      throw error;
    }
  }
  return async function getMaskStatus(request: Request): Promise<Response> {
    const folderPath = new URL(request.url).searchParams.get('folder_path');
    if (!folderPath) return Response.json({ error: 'A live dataset path is required' }, { status: 400 });
    try {
      return Response.json({ has_masks: await status(folderPath) });
    } catch (error) {
      if (error instanceof Error && error.message === 'Mask status queue is full') {
        return Response.json({ error: 'Too many mask status requests' }, { status: 429 });
      }
      return Response.json({ error: 'Invalid live dataset path' }, { status: 400 });
    }
  };
}
