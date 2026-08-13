import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { DatasetMaskReadResult, DatasetMaskService } from './datasetMaskService';

export const MAX_MASK_PNG_BYTES = 16 * 1024 * 1024;

export interface DatasetMaskRouteService {
  read(dataset: string, source: string): Promise<DatasetMaskReadResult>;
  save(dataset: string, source: string, png: Buffer): Promise<void>;
  delete(dataset: string, source: string): Promise<void>;
  deleteByAbsoluteSource(source: string): Promise<void>;
}

interface MaskHandlerDependencies {
  masks: DatasetMaskRouteService;
  listSources(dataset: string): Promise<string[]>;
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

function json(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function mapped(error: unknown, operation: string, logger: (operation: string, error: unknown) => void): Response {
  const message = error instanceof Error ? error.message : '';
  if (message === 'bad request' || /^(Invalid|Unsupported)/.test(message)) return json(400, 'Invalid dataset or source path');
  if (message === 'conflict' || message.startsWith('Duplicate mask basename')) return json(409, 'Source basename is ambiguous');
  if (message === 'too large' || /maximum bytes/.test(message)) return json(413, 'PNG body is too large');
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
    assertNoDuplicate(source, await deps.listSources(dataset));
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
      await deps.masks.save(target.dataset, target.source, await boundedBody(request, maximum));
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
  exists(path: string): Promise<boolean>;
  unlink(path: string): Promise<void>;
}

function within(root: string, path: string): boolean {
  const child = relative(resolve(root), resolve(path));
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

export function createImageDeleteHandler(deps: ImageDeleteDependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      const { imgPath } = await request.json() as { imgPath?: unknown };
      const roots = await deps.resolveRoots();
      if (typeof imgPath !== 'string' || (!within(roots.datasetsRoot, imgPath) && !within(roots.trainingRoot, imgPath))) {
        return json(400, 'Invalid image path');
      }
      if (!/\.(jpg|jpeg|png|bmp|gif|tiff|webp|mp4|mp3|wav|flac|ogg)$/i.test(imgPath)) return json(400, 'Not an image');
      if (!(await deps.exists(imgPath))) return Response.json({ success: true });
      await deps.unlink(imgPath);
      if (within(roots.datasetsRoot, imgPath)) await deps.masks.deleteByAbsoluteSource(imgPath);
      const captionPath = imgPath.replace(/\.[^/.]+$/, '') + '.txt';
      if (await deps.exists(captionPath)) await deps.unlink(captionPath);
      return Response.json({ success: true });
    } catch {
      return json(500, 'Failed to create dataset');
    }
  };
}
