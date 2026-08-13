import { resolveLiveMaskDirectory } from './datasetMaskService';
import { realpath } from 'node:fs/promises';

interface DatasetMaskStatusDependencies {
  datasetsRoot(): Promise<string>;
  resolveMasks?: typeof resolveLiveMaskDirectory;
  now?: () => number;
  ttlMs?: number;
  canonicalize?: (path: string) => Promise<string>;
}

export function createDatasetMaskStatusHandler(deps: DatasetMaskStatusDependencies) {
  const cache = new Map<string, { expires: number; value?: boolean; pending?: Promise<boolean> }>();
  const now = deps.now ?? Date.now;
  const ttlMs = deps.ttlMs ?? 5_000;
  async function status(folderPath: string): Promise<boolean> {
    const cacheKey = await (deps.canonicalize ?? realpath)(folderPath);
    const existing = cache.get(cacheKey);
    if (existing?.pending) return existing.pending;
    if (existing && existing.value !== undefined && existing.expires > now()) return existing.value;
    const pending = (async () => (await (deps.resolveMasks ?? resolveLiveMaskDirectory)(folderPath, {
      datasetsRoot: await deps.datasetsRoot(), maxDepth: 8, maxFiles: 1_000, maxEntries: 2_000,
      maxDirectories: 500, maxPngBytes: 1024 * 1024,
    })) !== null)();
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
    } catch {
      return Response.json({ error: 'Invalid live dataset path' }, { status: 400 });
    }
  };
}
