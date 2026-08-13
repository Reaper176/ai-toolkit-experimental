import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { constants } from 'node:fs';
import { lstat, open, realpath, unlink } from 'node:fs/promises';
import { DatasetMaskError, type DatasetMaskReadResult, type DatasetMaskService } from './datasetMaskService';

export const MAX_MASK_PNG_BYTES = 16 * 1024 * 1024;

export interface DatasetMaskRouteService {
  read(dataset: string, source: string): Promise<DatasetMaskReadResult>;
  save(dataset: string, source: string, png: Buffer): Promise<void>;
  delete(dataset: string, source: string): Promise<void>;
  deleteByAbsoluteSource(source: string): Promise<void>;
}

interface MaskHandlerDependencies {
  masks: DatasetMaskRouteService;
  listSources?: (dataset: string) => Promise<string[]>;
  assertSourceUnambiguous?: (dataset: string, source: string) => Promise<void>;
  maxPngBytes?: number;
  logger?: (operation: string, error: unknown) => void;
}

function invalidSegment(value: string): boolean {
  return !value || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || isAbsolute(value);
}

function validateSource(source: string | null): string {
  if (!source || isAbsolute(source) || source.includes('\\') || source.includes('\0')) throw new Error('bad request');
  const segments = source.split('/');
  if (segments.some(part => !part || part === '.' || part === '..')) throw new Error('bad request');
  return source;
}

function maskKey(source: string): string {
  const name = basename(source);
  return `${basename(name, extname(name))}.png`.toLocaleLowerCase('en-US');
}

function assertNoDuplicate(source: string, sources: readonly string[]): void {
  const wanted = maskKey(source);
  if (sources.filter(candidate => maskKey(candidate) === wanted).length > 1) throw new Error('conflict');
}

async function boundedBody(request: Request, maximum: number): Promise<Buffer> {
  const declared = request.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(maximum)) throw new Error('too large');
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maximum) {
        await reader.cancel().catch(() => undefined);
        throw new Error('too large');
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map(part => Buffer.from(part)), length);
}

class DatasetMaskUploadError extends Error {}

function json(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function mapped(error: unknown, operation: string, logger: (operation: string, error: unknown) => void): Response {
  const message = error instanceof Error ? error.message : '';
  if (error instanceof DatasetMaskUploadError) return json(413, 'PNG upload body is too large');
  if (error instanceof DatasetMaskError) {
    switch (error.code) {
      case 'INVALID_PATH': return json(400, 'Invalid dataset or source path');
      case 'SOURCE_NOT_FOUND': return json(404, 'Source image not found');
      case 'SOURCE_BYTES': return json(413, 'Source image is too large');
      case 'SOURCE_PIXELS': return json(413, 'Source image has too many pixels');
      case 'SOURCE_DIMENSIONS': return json(422, 'Source image dimensions are unsupported');
      case 'MASK_BYTES': return json(413, 'Mask PNG is too large');
      case 'MASK_DIMENSIONS': case 'MASK_PIXELS': case 'INVALID_MASK_PNG': return json(422, 'Invalid mask PNG');
      case 'DUPLICATE_BASENAME': return json(409, 'Source basename is ambiguous');
      case 'TRAVERSAL_LIMIT': return json(413, 'Dataset traversal limit exceeded');
      case 'SECURITY': return json(400, 'Unsafe dataset path');
    }
  }
  if (message === 'bad request') return json(400, 'Invalid dataset or source path');
  if (message === 'conflict') return json(409, 'Source basename is ambiguous');
  if (message === 'too large') return json(413, 'PNG upload body is too large');
  if (message === 'Source not found') return json(404, 'Source image not found');
  if (message === 'Invalid PNG' || message === 'Mask dimensions mismatch') return json(422, 'Invalid mask PNG');
  logger(operation, error);
  return json(500, 'Dataset mask operation failed');
}

export function createDatasetMaskRouteHandlers(deps: MaskHandlerDependencies) {
  const maximum = deps.maxPngBytes ?? MAX_MASK_PNG_BYTES;
  const logger = deps.logger ?? ((operation, error) => console.error(`Dataset mask ${operation} failed:`, error));
  async function context(dataset: string, request: Request): Promise<{ dataset: string; source: string }> {
    if (invalidSegment(dataset)) throw new Error('bad request');
    const source = validateSource(new URL(request.url).searchParams.get('source'));
    if (deps.assertSourceUnambiguous) await deps.assertSourceUnambiguous(dataset, source);
    else if (deps.listSources) assertNoDuplicate(source, await deps.listSources(dataset));
    else throw new Error('Dataset source traversal is not configured');
    return { dataset, source };
  }
  async function run(operation: string, action: () => Promise<Response>): Promise<Response> {
    try { return await action(); } catch (error) { return mapped(error, operation, logger); }
  }
  return {
    get: (dataset: string, request: Request) => run('read', async () => {
      const target = await context(dataset, request);
      const result = await deps.masks.read(target.dataset, target.source);
      return result.exists && result.png
        ? new Response(result.png, { status: 200, headers: { 'content-type': 'image/png' } })
        : new Response(null, { status: 204 });
    }),
    put: (dataset: string, request: Request) => run('save', async () => {
      if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'image/png') {
        return json(415, 'Content-Type must be image/png');
      }
      const target = await context(dataset, request);
      let body: Buffer;
      try { body = await boundedBody(request, maximum); }
      catch (error) { if ((error as Error).message === 'too large') throw new DatasetMaskUploadError(); throw error; }
      await deps.masks.save(target.dataset, target.source, body);
      return new Response(null, { status: 204 });
    }),
    delete: (dataset: string, request: Request) => run('delete', async () => {
      const target = await context(dataset, request);
      await deps.masks.delete(target.dataset, target.source);
      return new Response(null, { status: 204 });
    }),
  };
}

interface ImageDeleteDependencies {
  masks: Pick<DatasetMaskService, 'deleteByAbsoluteSource'>;
  resolveRoots(): Promise<{ datasetsRoot: string; trainingRoot: string }>;
  deleteFile?: (root: string, path: string) => Promise<boolean>;
}

class InvalidDeletePathError extends Error {}

function within(root: string, path: string): boolean {
  const child = relative(resolve(root), resolve(path));
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

type Identity = { dev: number; ino: number; mode: number };
const identity = (stat: Identity): Identity => ({ dev: stat.dev, ino: stat.ino, mode: stat.mode });
const sameIdentity = (left: Identity, right: Identity) =>
  left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;

async function deleteConfinedFile(configuredRoot: string, requestedPath: string): Promise<boolean> {
  const configured = resolve(configuredRoot);
  const child = relative(configured, resolve(requestedPath));
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new InvalidDeletePathError();
  }
  const root = await realpath(configured);
  const parts = child.split(sep);
  const parents: Array<{ path: string; identity: Identity }> = [];
  let directory = root;
  for (const part of parts.slice(0, -1)) {
    directory = resolve(directory, part);
    let stat;
    try { stat = await lstat(directory); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new InvalidDeletePathError();
    if (!within(root, await realpath(directory))) throw new InvalidDeletePathError();
    parents.push({ path: directory, identity: identity(stat) });
  }
  const target = resolve(root, ...parts);
  let before;
  try { before = await lstat(target); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  if (before.isSymbolicLink() || !before.isFile()) throw new InvalidDeletePathError();
  if (!within(root, await realpath(target))) throw new InvalidDeletePathError();
  const expected = identity(before);
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!sameIdentity(expected, identity(await handle.stat()))) throw new InvalidDeletePathError();
  } finally {
    await handle.close();
  }
  for (const parent of parents) {
    if (!sameIdentity(parent.identity, identity(await lstat(parent.path)))) throw new InvalidDeletePathError();
  }
  if (!sameIdentity(expected, identity(await lstat(target)))) throw new InvalidDeletePathError();
  await unlink(target);
  return true;
}

export function createImageDeleteHandler(deps: ImageDeleteDependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      let body: unknown;
      try { body = await request.json(); } catch { return json(400, 'Invalid request body'); }
      const { imgPath } = (body && typeof body === 'object' ? body : {}) as { imgPath?: unknown };
      const roots = await deps.resolveRoots();
      if (typeof imgPath !== 'string' || (!within(roots.datasetsRoot, imgPath) && !within(roots.trainingRoot, imgPath))) {
        return json(400, 'Invalid image path');
      }
      if (!/\.(jpg|jpeg|png|bmp|gif|tiff|webp|mp4|mp3|wav|flac|ogg)$/i.test(imgPath)) return json(400, 'Not an image');
      const root = within(roots.datasetsRoot, imgPath) ? roots.datasetsRoot : roots.trainingRoot;
      const deleteFile = deps.deleteFile ?? deleteConfinedFile;
      if (!(await deleteFile(root, imgPath))) return Response.json({ success: true });
      let maskCleanupError: unknown;
      if (within(roots.datasetsRoot, imgPath)) {
        try {
          await deps.masks.deleteByAbsoluteSource(imgPath);
        } catch (error) {
          maskCleanupError = error;
        }
      }
      const captionPath = imgPath.replace(/\.[^/.]+$/, '') + '.txt';
      await deleteFile(root, captionPath);
      if (maskCleanupError !== undefined) throw maskCleanupError;
      return Response.json({ success: true });
    } catch (error) {
      if (error instanceof InvalidDeletePathError) return json(400, 'Invalid image path');
      return json(500, 'Failed to delete image');
    }
  };
}
