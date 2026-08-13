import assert from 'node:assert/strict';
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

  const order: string[] = [];
  const imageMasks = new FakeMasks();
  imageMasks.deleteByAbsoluteSource = async source => {
    order.push(`mask:${source}`);
  };
  const deleteImage = createImageDeleteHandler({
    masks: imageMasks,
    resolveRoots: async () => ({ datasetsRoot: '/datasets', trainingRoot: '/training' }),
    exists: async path => path !== '/datasets/photos/missing.jpg',
    unlink: async path => {
      order.push(`unlink:${path}`);
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
    exists: async () => true,
    unlink: async path => { order.push(`unlink:${path}`); throw new Error('unlink failed'); },
  });
  response = await failedDelete(new Request('http://localhost/api/img/delete', {
    method: 'POST', body: JSON.stringify({ imgPath: '/datasets/photos/portrait.jpg' }),
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(order, ['unlink:/datasets/photos/portrait.jpg']);

  console.log('dataset mask route handler tests passed');
}

void main();
