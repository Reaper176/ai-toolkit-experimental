import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetPresetLoaderConfig } from '../src/helpers/datasetPresets';
import {
  DatasetPresetConflictError,
  DatasetPresetNotFoundError,
  DatasetPresetReferencedError,
  DatasetPresetStorageError,
  DatasetPresetValidationError,
  type DatasetPresetDetail,
  type DatasetPresetService,
  type DatasetPresetVersionDetail,
} from '../src/server/datasetPresetService';
import {
  MAX_JSON_BODY_BYTES,
  createDatasetPresetRouteComposition,
  createDatasetPresetRouteHandlers,
  type DatasetPresetRouteLogger,
} from '../src/server/datasetPresetRouteHandlers';

const loader: DatasetPresetLoaderConfig = {
  caption_ext: 'txt',
  default_caption: '',
  caption_dropout_rate: 0,
  shuffle_tokens: false,
  num_repeats: 1,
  resolution: [1024],
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  flip_x: false,
  flip_y: false,
  num_frames: 1,
  shrink_video_to_frames: false,
  fps: 1,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: [],
};
const manifest = {
  schema_version: 1 as const,
  preset_id: 'preset-1',
  preset_name: 'Example',
  version: 1,
  source_dataset: 'images',
  created_at: '2025-01-01T00:00:00.000Z',
  loader_config: loader,
  note: null,
  media_count: 1,
  total_bytes: 12,
  files: [],
};
const version = {
  id: 'version-1',
  preset_id: 'preset-1',
  version: 1,
  source_dataset: 'images',
  manifest_path: 'dataset_presets/preset-1/v1/manifest.json',
  manifest_sha256: 'a'.repeat(64),
  loader_config: loader,
  note: null,
  media_count: 1,
  total_bytes: '12',
  created_at: '2025-01-01T00:00:00.000Z',
};
const detail: DatasetPresetDetail = {
  id: 'preset-1',
  name: 'Example',
  archived_at: null,
  latest_version: 1,
  version_count: 1,
  media_count: 1,
  total_bytes: '12',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  versions: [version],
};
const versionDetail: DatasetPresetVersionDetail = { ...version, manifest };

class FakeService implements DatasetPresetService {
  calls: Array<{ method: string; args: unknown[] }> = [];
  failure: Error | undefined;
  listResult = [{ ...detail, versions: undefined }];
  detailResult = structuredClone(detail);
  versionResult = structuredClone(versionDetail);
  private result<T>(method: string, ...args: unknown[]): T {
    this.calls.push({ method, args });
    if (this.failure) throw this.failure;
    if (method === 'listActive') return this.listResult as T;
    if (method === 'getPreset' || method === 'createPreset' || method === 'rename' || method === 'setArchived')
      return structuredClone(this.detailResult) as T;
    if (method === 'publishVersion') return structuredClone(version) as T;
    if (method === 'getVersion') return structuredClone(this.versionResult) as T;
    if (method === 'verifyVersion') return structuredClone(manifest) as T;
    if (method === 'verifyVersionDetail') return structuredClone(this.versionResult) as T;
    return undefined as T;
  }
  async listActive() {
    return this.result<typeof this.listResult>('listActive');
  }
  async getPreset(id: string) {
    return this.result<DatasetPresetDetail>('getPreset', id);
  }
  async createPreset(input: Parameters<DatasetPresetService['createPreset']>[0]) {
    return this.result<DatasetPresetDetail>('createPreset', input);
  }
  async publishVersion(id: string, input: Parameters<DatasetPresetService['publishVersion']>[1]) {
    return this.result<typeof version>('publishVersion', id, input);
  }
  async rename(id: string, name: string) {
    return this.result<DatasetPresetDetail>('rename', id, name);
  }
  async setArchived(id: string, archived: boolean) {
    return this.result<DatasetPresetDetail>('setArchived', id, archived);
  }
  async getVersion(id: string) {
    return this.result<DatasetPresetVersionDetail>('getVersion', id);
  }
  async verifyVersion(id: string, full: boolean) {
    return this.result<typeof manifest>('verifyVersion', id, full);
  }
  async verifyVersionDetail(id: string, full: boolean) {
    return this.result<DatasetPresetVersionDetail>('verifyVersionDetail', id, full);
  }
  async deleteVersion(id: string) {
    this.result<void>('deleteVersion', id);
  }
}

class SerializedPublishService extends FakeService {
  activePublishes = 0;
  maxActivePublishes = 0;
  startedPublishes = 0;
  private queue = Promise.resolve();
  private firstPublishStartedResolve!: () => void;
  private releaseFirstPublish!: () => void;
  readonly firstPublishStarted: Promise<void>;
  private readonly firstPublishGate: Promise<void>;

  constructor() {
    super();
    this.firstPublishStarted = new Promise(resolve => {
      this.firstPublishStartedResolve = resolve;
    });
    this.firstPublishGate = new Promise(resolve => {
      this.releaseFirstPublish = resolve;
    });
  }

  releaseFirst(): void {
    this.releaseFirstPublish();
  }

  override async publishVersion(id: string, input: Parameters<DatasetPresetService['publishVersion']>[1]) {
    const prior = this.queue;
    let release!: () => void;
    this.queue = new Promise(resolve => {
      release = resolve;
    });
    await prior;
    this.calls.push({ method: 'publishVersion', args: [id, input] });
    this.startedPublishes += 1;
    this.activePublishes += 1;
    this.maxActivePublishes = Math.max(this.maxActivePublishes, this.activePublishes);
    if (this.startedPublishes === 1) {
      this.firstPublishStartedResolve();
      await this.firstPublishGate;
    }
    this.activePublishes -= 1;
    release();
    return structuredClone(version);
  }
}

function validCreate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Example',
    source_dataset: 'images',
    selected_paths: ['one.png'],
    caption_ext: 'txt',
    loader_config: loader,
    note: null,
    ...overrides,
  };
}
function validPublish(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source_dataset: 'images',
    selected_paths: ['two.png'],
    retained_paths: ['one.png'],
    base_version_id: 'version-1',
    caption_ext: 'txt',
    loader_config: loader,
    note: null,
    ...overrides,
  };
}
function request(body?: unknown, headers?: HeadersInit): Request {
  return new Request('http://localhost/api/dataset-presets', {
    method: 'POST',
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  });
}
function oversizedStream(): Request {
  const chunk = new Uint8Array(512 * 1024);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunk);
      controller.enqueue(chunk);
      controller.enqueue(new Uint8Array(1));
    },
  });
  return new Request('http://localhost/api/dataset-presets', { method: 'POST', body, duplex: 'half' } as RequestInit & {
    duplex: 'half';
  });
}
function cancellationRejectingOversizedStream(): Request {
  const chunk = new Uint8Array(512 * 1024);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunk);
      controller.enqueue(chunk);
      controller.enqueue(new Uint8Array(1));
    },
    cancel() {
      return Promise.reject(new Error('stream cancellation failed'));
    },
  });
  return new Request('http://localhost/api/dataset-presets', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}
function exactLimitJson(): string {
  const encoder = new TextEncoder();
  const base = JSON.stringify({ padding: '' });
  return JSON.stringify({ padding: 'x'.repeat(MAX_JSON_BODY_BYTES - encoder.encode(base).byteLength) });
}
async function assertStatus(
  result: Promise<{ status: number; body: unknown }>,
  status: number,
  body?: unknown,
): Promise<void> {
  const response = await result;
  assert.equal(response.status, status);
  if (body !== undefined) assert.deepEqual(response.body, body);
}

async function main(): Promise<void> {
  assert.equal(MAX_JSON_BODY_BYTES, 1024 * 1024);
  const service = new FakeService();
  const handlers = createDatasetPresetRouteHandlers(service, () => undefined);
  await assertStatus(handlers.list(), 200, { presets: service.listResult });
  await assertStatus(handlers.detail('preset-1'), 200, detail);
  await assertStatus(handlers.versions('preset-1'), 200, detail.versions);
  assert.deepEqual(service.calls.slice(0, 3), [
    { method: 'listActive', args: [] },
    { method: 'getPreset', args: ['preset-1'] },
    { method: 'getPreset', args: ['preset-1'] },
  ]);
  await assertStatus(handlers.create(request(validCreate())), 201, detail);
  assert.deepEqual(service.calls.at(-1), { method: 'createPreset', args: [validCreate()] });
  await assertStatus(handlers.create(request(validCreate({ selected_paths: [] }))), 201, detail);
  assert.deepEqual(service.calls.at(-1), { method: 'createPreset', args: [validCreate({ selected_paths: [] })] });
  await assertStatus(handlers.publish('preset-1', request(validPublish())), 201, version);
  assert.deepEqual(service.calls.at(-1), { method: 'publishVersion', args: ['preset-1', validPublish()] });
  await assertStatus(
    handlers.publish('preset-1', request(validPublish({ selected_paths: [], retained_paths: [] }))),
    201,
    version,
  );
  assert.deepEqual(service.calls.at(-1), {
    method: 'publishVersion',
    args: ['preset-1', validPublish({ selected_paths: [], retained_paths: [] })],
  });
  await assertStatus(handlers.update('preset-1', request({ name: 'Renamed' })), 200, detail);
  assert.deepEqual(service.calls.at(-1), { method: 'rename', args: ['preset-1', 'Renamed'] });
  await assertStatus(handlers.update('preset-1', request({ archived: true })), 200, detail);
  assert.deepEqual(service.calls.at(-1), { method: 'setArchived', args: ['preset-1', true] });
  await assertStatus(handlers.removeVersion('version-1'), 200, { success: true });
  assert.deepEqual(service.calls.at(-1), { method: 'deleteVersion', args: ['version-1'] });
  const versionCallStart = service.calls.length;
  await assertStatus(handlers.version('version-1'), 200, versionDetail);
  assert.deepEqual(service.calls.slice(versionCallStart), [{ method: 'getVersion', args: ['version-1'] }]);
  await assertStatus(handlers.verify('version-1'), 200, { valid: true, version: versionDetail });
  assert.deepEqual(service.calls.at(-1), { method: 'verifyVersionDetail', args: ['version-1', true] });

  for (const body of [undefined, '', 'not-json', '[]', 'null'])
    await assertStatus(createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(request(body)), 400);
  const invalidUtf8 = new Request('http://localhost/api/dataset-presets', {
    method: 'POST',
    body: new Uint8Array([0x7b, 0xff, 0x7d]),
  });
  await assertStatus(createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(invalidUtf8), 400);
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(request(validCreate({ extra: true }))),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(request({ name: 'Only' })),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
      request(validCreate({ selected_paths: 'one.png' })),
    ),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
      request(validCreate({ loader_config: [] })),
    ),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
      request(validCreate({ selected_paths: Array(50_001).fill('x.png') })),
    ),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).publish(
      'preset-1',
      request(validPublish({ retained_paths: 'one.png' })),
    ),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).publish(
      'preset-1',
      request(
        validPublish({ selected_paths: Array(25_001).fill('a.png'), retained_paths: Array(25_000).fill('b.png') }),
      ),
    ),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).publish(
      'preset-1',
      request(validPublish({ extra: true })),
    ),
    400,
  );
  for (const body of [{}, { name: 'a', archived: false }, { archived: 'true' }, { name: 'a', extra: true }])
    await assertStatus(
      createDatasetPresetRouteHandlers(new FakeService(), () => undefined).update('preset-1', request(body)),
      400,
    );
  for (const id of ['', ' '.repeat(3), 'x'.repeat(201)]) {
    await assertStatus(createDatasetPresetRouteHandlers(new FakeService(), () => undefined).detail(id), 400);
    await assertStatus(createDatasetPresetRouteHandlers(new FakeService(), () => undefined).version(id), 400);
  }
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).detail(undefined as unknown as string),
    400,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
      request(validCreate(), { 'content-length': String(MAX_JSON_BODY_BYTES + 1) }),
    ),
    413,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(oversizedStream()),
    413,
  );
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(cancellationRejectingOversizedStream()),
    413,
  );
  const exactLimitResponse = await createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
    request(exactLimitJson()),
  );
  assert.notEqual(exactLimitResponse.status, 413);
  await assertStatus(
    createDatasetPresetRouteHandlers(new FakeService(), () => undefined).create(
      request(validCreate(), { 'content-length': 'not-a-number' }),
    ),
    201,
  );

  let buildCalls = 0;
  const sharedService = new FakeService();
  const composition = createDatasetPresetRouteComposition({
    resolveRoots: async () => ({ dataRoot: '/managed-a', datasetsRoot: '/datasets-a' }),
    buildService: async () => {
      buildCalls += 1;
      return sharedService;
    },
  });
  const [firstHandlers, secondHandlers] = await Promise.all([
    composition.createDefaultHandlers(),
    composition.createDefaultHandlers(),
  ]);
  assert.equal(buildCalls, 1);
  await firstHandlers.publish('preset-1', request(validPublish()));
  await secondHandlers.publish('preset-1', request(validPublish()));
  assert.equal(sharedService.calls.filter(call => call.method === 'publishVersion').length, 2);

  const serializedServices: SerializedPublishService[] = [];
  const serialComposition = createDatasetPresetRouteComposition({
    resolveRoots: async () => ({ dataRoot: '/managed-serial', datasetsRoot: '/datasets-serial' }),
    buildService: async () => {
      const service = new SerializedPublishService();
      serializedServices.push(service);
      return service;
    },
  });
  const [serialFirstHandlers, serialSecondHandlers] = await Promise.all([
    serialComposition.createDefaultHandlers(),
    serialComposition.createDefaultHandlers(),
  ]);
  assert.equal(serializedServices.length, 1);
  const serialFirst = serialFirstHandlers.publish('preset-1', request(validPublish()));
  await serializedServices[0].firstPublishStarted;
  const serialSecond = serialSecondHandlers.publish('preset-1', request(validPublish()));
  await Promise.resolve();
  assert.equal(serializedServices[0].maxActivePublishes, 1);
  assert.equal(serializedServices[0].startedPublishes, 1);
  serializedServices[0].releaseFirst();
  await Promise.all([serialFirst, serialSecond]);
  assert.equal(serializedServices[0].maxActivePublishes, 1);
  assert.equal(serializedServices[0].startedPublishes, 2);

  let activeRoots = { dataRoot: '/managed-first', datasetsRoot: '/datasets-first' };
  let rootScopedBuilds = 0;
  const rootScopedComposition = createDatasetPresetRouteComposition({
    resolveRoots: async () => activeRoots,
    buildService: async () => {
      rootScopedBuilds += 1;
      return new FakeService();
    },
  });
  await rootScopedComposition.createDefaultHandlers();
  activeRoots = { dataRoot: '/managed-second', datasetsRoot: '/datasets-second' };
  await rootScopedComposition.createDefaultHandlers();
  assert.equal(rootScopedBuilds, 2);

  let retryBuilds = 0;
  const retryComposition = createDatasetPresetRouteComposition({
    resolveRoots: async () => ({ dataRoot: '/managed-retry', datasetsRoot: '/datasets-retry' }),
    buildService: async () => {
      retryBuilds += 1;
      if (retryBuilds === 1) throw new Error('first construction failed');
      return new FakeService();
    },
  });
  await assert.rejects(retryComposition.createDefaultHandlers());
  await retryComposition.createDefaultHandlers();
  assert.equal(retryBuilds, 2);

  const setupError = new Error('/secret/root unavailable');
  const setupLogs: Array<[string, unknown]> = [];
  const failingComposition = createDatasetPresetRouteComposition({
    resolveRoots: async () => {
      throw setupError;
    },
    buildService: async () => new FakeService(),
  });
  const setupResult = await failingComposition.executeDefaultRoute(
    async handlers => handlers.list(),
    (operation, error) => setupLogs.push([operation, error]),
  );
  assert.deepEqual(setupResult, { status: 500, body: { error: 'Dataset preset operation failed' } });
  assert.equal(setupLogs[0]?.[1], setupError);

  const errors: Array<[Error, number]> = [
    [new DatasetPresetValidationError('safe validation'), 400],
    [new DatasetPresetNotFoundError('safe missing'), 404],
    [new DatasetPresetConflictError('safe conflict'), 409],
    [new DatasetPresetReferencedError('safe referenced'), 409],
  ];
  for (const [failure, status] of errors) {
    const failing = new FakeService();
    failing.failure = failure;
    await assertStatus(createDatasetPresetRouteHandlers(failing, () => undefined).detail('preset-1'), status, {
      error: failure.message,
    });
  }
  for (const failure of [
    new DatasetPresetStorageError('storage /secret/data', new Error('cause')),
    new Error('unexpected /secret/data'),
  ]) {
    const failing = new FakeService();
    failing.failure = failure;
    const logged: Array<[string, unknown]> = [];
    const logger: DatasetPresetRouteLogger = (operation: string, error: unknown) => logged.push([operation, error]);
    const response = await createDatasetPresetRouteHandlers(failing, logger).detail('preset-1');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Dataset preset operation failed' });
    assert.equal(logged[0]?.[1], failure);
    assert.doesNotMatch(JSON.stringify(response.body), /secret|cause|storage/i);
  }
  const routeFiles = [
    [
      'src/app/api/dataset-presets/route.ts',
      [
        'export async function GET',
        'export async function POST',
        'executeDefaultDatasetPresetRoute',
        'handlers.list()',
        'handlers.create(request)',
      ],
    ],
    [
      'src/app/api/dataset-presets/[presetId]/route.ts',
      [
        'export async function GET',
        'export async function PATCH',
        'params: Promise<',
        'executeDefaultDatasetPresetRoute',
        'handlers.detail',
        'handlers.update',
      ],
    ],
    [
      'src/app/api/dataset-presets/[presetId]/versions/route.ts',
      [
        'export async function GET',
        'export async function POST',
        'params: Promise<',
        'executeDefaultDatasetPresetRoute',
        'handlers.versions',
        'handlers.publish',
      ],
    ],
    [
      'src/app/api/dataset-preset-versions/[versionId]/route.ts',
      [
        'export async function GET',
        'export async function DELETE',
        'params: Promise<',
        'executeDefaultDatasetPresetRoute',
        'handlers.version',
        'handlers.removeVersion',
      ],
    ],
    [
      'src/app/api/dataset-preset-versions/[versionId]/verify/route.ts',
      ['export async function POST', 'params: Promise<', 'executeDefaultDatasetPresetRoute', 'handlers.verify'],
    ],
  ] as const;
  for (const [file, expected] of routeFiles) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    for (const token of expected) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(source, /createDefaultDatasetPresetRouteHandlers/);
  }
  console.log('Dataset preset route handler tests passed');
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
