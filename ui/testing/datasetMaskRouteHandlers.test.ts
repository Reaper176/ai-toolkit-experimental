import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAX_MASK_PNG_BYTES,
  createDatasetMaskRouteHandlers,
  createImageDeleteHandler,
  type DatasetMaskRouteService,
} from '../src/server/datasetMaskRouteHandlers';

class FakeMasks implements DatasetMaskRouteService {
  calls: Array<{ method: string; args: unknown[] }> = [];
  readResult = { exists: false, width: 2, height: 2, png: null as Buffer | null };
  failure: Error | undefined;
  async read(dataset: string, source: string) {
    this.calls.push({ method: 'read', args: [dataset, source] });
    if (this.failure) throw this.failure;
    return this.readResult;
  }
  async save(dataset: string, source: string, png: Buffer) {
    this.calls.push({ method: 'save', args: [dataset, source, png] });
    if (this.failure) throw this.failure;
  }
  async delete(dataset: string, source: string) {
    this.calls.push({ method: 'delete', args: [dataset, source] });
    if (this.failure) throw this.failure;
  }
  async deleteByAbsoluteSource(source: string) {
    this.calls.push({ method: 'deleteByAbsoluteSource', args: [source] });
    if (this.failure) throw this.failure;
  }
}

function request(method: string, source = 'sub/portrait.jpg', body?: BodyInit, contentType?: string): Request {
  return new Request(`http://localhost/api/datasets/photos/masks?source=${encodeURIComponent(source)}`, {
    method,
    body,
    headers: contentType ? { 'content-type': contentType } : undefined,
  });
}

async function main(): Promise<void> {
  const masks = new FakeMasks();
  const handlers = createDatasetMaskRouteHandlers({
    masks,
    listSources: async () => ['sub/portrait.jpg'],
  });

  let response = await handlers.get('photos', request('GET'));
  assert.equal(response.status, 204);

  const png = Buffer.from([137, 80, 78, 71]);
  masks.readResult = { exists: true, width: 2, height: 2, png };
  response = await handlers.get('photos', request('GET'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);

  response = await handlers.put('photos', request('PUT', undefined, png, 'application/octet-stream'));
  assert.equal(response.status, 415);
  response = await handlers.put('photos', request('PUT', undefined, png, 'image/png'));
  assert.equal(response.status, 204);
  assert.equal(masks.calls.at(-1)?.method, 'save');

  const tooLarge = new Uint8Array(MAX_MASK_PNG_BYTES + 1);
  response = await handlers.put('photos', request('PUT', undefined, tooLarge, 'image/png'));
  assert.equal(response.status, 413);

  response = await handlers.delete('photos', request('DELETE'));
  assert.equal(response.status, 204);
  response = await handlers.delete('photos', request('DELETE'));
  assert.equal(response.status, 204);

  response = await handlers.get('photos', request('GET', '../portrait.jpg'));
  assert.equal(response.status, 400);
  response = await handlers.get('../photos', request('GET'));
  assert.equal(response.status, 400);

  const duplicates = createDatasetMaskRouteHandlers({
    masks,
    listSources: async () => ['sub/portrait.jpg', 'other/portrait.png'],
  });
  response = await duplicates.get('photos', request('GET'));
  assert.equal(response.status, 409);

  for (const [message, status, body] of [
    ['Source exceeds maximum bytes', 413, { error: 'Source image is too large' }],
    ['Source pixel limit exceeded', 413, { error: 'Source image has too many pixels' }],
    ['Source dimension limit exceeded', 422, { error: 'Source image dimensions are unsupported' }],
  ] as const) {
    masks.failure = new Error(message);
    response = await handlers.get('photos', request('GET'));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), body);
  }
  masks.failure = undefined;

  const order: string[] = [];
  const imageMasks = new FakeMasks();
  imageMasks.deleteByAbsoluteSource = async source => {
    order.push(`mask:${source}`);
  };
  const deleteImage = createImageDeleteHandler({
    masks: imageMasks,
    resolveRoots: async () => ({ datasetsRoot: '/datasets', trainingRoot: '/training' }),
    deleteFile: async (_root, path) => {
      if (path === '/datasets/photos/missing.jpg') return false;
      order.push(`unlink:${path}`);
      return true;
    },
  });
  response = await deleteImage(new Request('http://localhost/api/img/delete', {
    method: 'POST', body: JSON.stringify({ imgPath: '/datasets/photos/portrait.jpg' }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(order, [
    'unlink:/datasets/photos/portrait.jpg',
    'mask:/datasets/photos/portrait.jpg',
    'unlink:/datasets/photos/portrait.txt',
  ]);

  order.length = 0;
  const failedDelete = createImageDeleteHandler({
    masks: imageMasks,
    resolveRoots: async () => ({ datasetsRoot: '/datasets', trainingRoot: '/training' }),
    deleteFile: async (_root, path) => { order.push(`unlink:${path}`); throw new Error('unlink failed'); },
  });
  response = await failedDelete(new Request('http://localhost/api/img/delete', {
    method: 'POST', body: JSON.stringify({ imgPath: '/datasets/photos/portrait.jpg' }),
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to delete image' });
  assert.deepEqual(order, ['unlink:/datasets/photos/portrait.jpg']);

  order.length = 0;
  const failingMasks = new FakeMasks();
  failingMasks.deleteByAbsoluteSource = async source => {
    order.push(`mask:${source}`);
    throw new Error('mask cleanup failed');
  };
  const failedMaskCleanup = createImageDeleteHandler({
    masks: failingMasks,
    resolveRoots: async () => ({ datasetsRoot: '/datasets', trainingRoot: '/training' }),
    deleteFile: async (_root, path) => { order.push(`unlink:${path}`); return true; },
  });
  response = await failedMaskCleanup(new Request('http://localhost/api/img/delete', {
    method: 'POST', body: JSON.stringify({ imgPath: '/datasets/photos/portrait.jpg' }),
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(order, [
    'unlink:/datasets/photos/portrait.jpg',
    'mask:/datasets/photos/portrait.jpg',
    'unlink:/datasets/photos/portrait.txt',
  ]);

  response = await deleteImage(new Request('http://localhost/api/img/delete', {
    method: 'POST', body: '{bad json',
  }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid request body' });

  const tempRoot = await mkdtemp(join(tmpdir(), 'mask-delete-confinement-'));
  try {
    const datasetsRoot = join(tempRoot, 'datasets');
    const trainingRoot = join(tempRoot, 'training');
    const outsideRoot = join(tempRoot, 'outside');
    await Promise.all([mkdir(join(datasetsRoot, 'photos'), { recursive: true }), mkdir(trainingRoot), mkdir(outsideRoot)]);
    const outsideImage = join(outsideRoot, 'outside.jpg');
    const outsideCaption = join(outsideRoot, 'outside.txt');
    await Promise.all([writeFile(outsideImage, 'image'), writeFile(outsideCaption, 'caption')]);
    try {
      await symlink(outsideRoot, join(datasetsRoot, 'photos', 'linked-dir'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      console.log('dataset mask symlink regression skipped: symlinks unavailable');
      return;
    }
    const confinedDelete = createImageDeleteHandler({
      masks: new FakeMasks(),
      resolveRoots: async () => ({ datasetsRoot, trainingRoot }),
    });
    response = await confinedDelete(new Request('http://localhost/api/img/delete', {
      method: 'POST',
      body: JSON.stringify({ imgPath: join(datasetsRoot, 'photos', 'linked-dir', 'outside.jpg') }),
    }));
    assert.equal(response.status, 400);
    assert.equal(await readFile(outsideImage, 'utf8'), 'image');
    assert.equal(await readFile(outsideCaption, 'utf8'), 'caption');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  console.log('dataset mask route handler tests passed');
}

void main();
