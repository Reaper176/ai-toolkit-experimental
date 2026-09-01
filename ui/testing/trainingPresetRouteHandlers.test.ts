import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import type { UserTrainingPresetRecord } from '../src/helpers/trainingPresets';
import {
  MAX_PRESET_REQUEST_BYTES,
  TrainingPresetPayloadTooLargeError,
  createTrainingPresetService,
  mapTrainingPresetError,
  type TrainingPresetCreateData,
  type TrainingPresetRow,
  type TrainingPresetStore,
  type TrainingPresetUpdateData,
} from '../src/server/trainingPresetService';
import {
  createTrainingPresetCollectionHandlers,
  createTrainingPresetDetailHandlers,
  type TrainingPresetServiceApi,
} from '../src/server/trainingPresetRouteHandlers';

function jobFixture(): JobConfig {
  return {
    job: 'extension',
    config: {
      process: [
        {
          type: 'diffusion_trainer',
          model: { arch: 'flux', name_or_path: 'test/model' },
          train: {},
          save: {},
          sample: {},
        },
      ],
    },
  } as unknown as JobConfig;
}

const recordFixture = {
  id: 'preset-id',
  name: 'Preset',
  source: 'user',
  read_only: false,
  schema_version: 1,
  snapshot: {
    schema_version: 1,
    job: 'extension',
    config: { process: [jobFixture().config.process[0] as unknown as Record<string, unknown>] },
  },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
} as UserTrainingPresetRecord;

class FakeService implements TrainingPresetServiceApi {
  createCalls = 0;
  updateCalls = 0;

  async list(): Promise<UserTrainingPresetRecord[]> {
    return [];
  }

  async create(): Promise<UserTrainingPresetRecord> {
    this.createCalls += 1;
    return structuredClone(recordFixture);
  }

  async update(): Promise<UserTrainingPresetRecord> {
    this.updateCalls += 1;
    return structuredClone(recordFixture);
  }

  async remove(): Promise<void> {}
}

class RecordingStore implements TrainingPresetStore {
  createCalls = 0;
  updateCalls = 0;
  rows: TrainingPresetRow[] = [];

  async findMany(): Promise<TrainingPresetRow[]> {
    return structuredClone(this.rows);
  }

  async findUnique(args: { where: { id?: string; name_key?: string } }): Promise<TrainingPresetRow | null> {
    const found = this.rows.find(row =>
      args.where.id !== undefined ? row.id === args.where.id : row.name_key === args.where.name_key,
    );
    return found === undefined ? null : structuredClone(found);
  }

  async create(args: { data: TrainingPresetCreateData }): Promise<TrainingPresetRow> {
    this.createCalls += 1;
    const now = new Date('2026-01-01T00:00:00.000Z');
    const created = { id: 'created', ...args.data, created_at: now, updated_at: now };
    this.rows.push(created);
    return structuredClone(created);
  }

  async update(args: { where: { id: string }; data: TrainingPresetUpdateData }): Promise<TrainingPresetRow> {
    this.updateCalls += 1;
    const existing = this.rows.find(row => row.id === args.where.id);
    assert(existing);
    Object.assign(existing, args.data);
    return structuredClone(existing);
  }

  async delete(): Promise<TrainingPresetRow> {
    throw new Error('not used');
  }
}

interface TrackedBody {
  stream: ReadableStream<Uint8Array>;
  pulls(): number;
  canceled(): boolean;
}

function trackedBody(chunks: Uint8Array[]): TrackedBody {
  let index = 0;
  let pullCount = 0;
  let wasCanceled = false;
  return {
    stream: new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pullCount += 1;
          const chunk = chunks[index];
          index += 1;
          if (chunk === undefined) controller.close();
          else controller.enqueue(chunk);
        },
        cancel() {
          wasCanceled = true;
        },
      },
      { highWaterMark: 0 },
    ),
    pulls: () => pullCount,
    canceled: () => wasCanceled,
  };
}

function streamRequest(body: TrackedBody, headers?: HeadersInit): Request {
  return new Request('http://localhost/api/training-presets', {
    method: 'POST',
    body: body.stream,
    headers,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

function exactLimitBody(): Uint8Array {
  const encoder = new TextEncoder();
  const base = JSON.stringify({ name: 'Exact', job_config: jobFixture(), padding: '' });
  const available = MAX_PRESET_REQUEST_BYTES - encoder.encode(base).byteLength;
  assert(available > 0);
  const padding = `${'😀'.repeat(Math.floor(available / 4))}${'x'.repeat(available % 4)}`;
  const encoded = encoder.encode(JSON.stringify({ name: 'Exact', job_config: jobFixture(), padding }));
  assert.equal(encoded.byteLength, MAX_PRESET_REQUEST_BYTES);
  return encoded;
}

async function main(): Promise<void> {
  assert.deepEqual(mapTrainingPresetError(new TrainingPresetPayloadTooLargeError()), {
    status: 413,
    error: 'Preset request must not exceed 1 MiB',
    shouldLog: false,
  });

  const chunk = new Uint8Array(256 * 1024);
  const postBody = trackedBody([chunk, chunk, chunk, chunk, chunk, chunk]);
  const postService = new FakeService();
  const post = createTrainingPresetCollectionHandlers(postService, () => undefined);
  const postResponse = await post.POST(streamRequest(postBody));
  assert.equal(postResponse.status, 413);
  assert.equal(postService.createCalls, 0);
  assert.equal(postBody.canceled(), true);
  assert.equal(postBody.pulls(), 5);

  const putBody = trackedBody([chunk, chunk, chunk, chunk, chunk, chunk]);
  const putService = new FakeService();
  const detail = createTrainingPresetDetailHandlers(putService, () => undefined);
  const putResponse = await detail.PUT(streamRequest(putBody), {
    params: Promise.resolve({ presetId: 'preset-id' }),
  });
  assert.equal(putResponse.status, 413);
  assert.equal(putService.updateCalls, 0);
  assert.equal(putBody.canceled(), true);
  assert.equal(putBody.pulls(), 5);

  const declaredBody = trackedBody([new TextEncoder().encode('{}')]);
  const declaredService = new FakeService();
  const declaredResponse = await createTrainingPresetCollectionHandlers(declaredService, () => undefined).POST(
    streamRequest(declaredBody, { 'content-length': String(MAX_PRESET_REQUEST_BYTES + 1) }),
  );
  assert.equal(declaredResponse.status, 413);
  assert.equal(declaredBody.pulls(), 0);
  assert.equal(declaredService.createCalls, 0);

  const underreportedBody = trackedBody([chunk, chunk, chunk, chunk, chunk]);
  const underreportedService = new FakeService();
  const underreportedResponse = await createTrainingPresetDetailHandlers(underreportedService, () => undefined).PUT(
    streamRequest(underreportedBody, { 'content-length': '1' }),
    {
      params: Promise.resolve({ presetId: 'preset-id' }),
    },
  );
  assert.equal(underreportedResponse.status, 413);
  assert.equal(underreportedService.updateCalls, 0);
  assert.equal(underreportedBody.canceled(), true);

  const exactBody = exactLimitBody();
  const exactTracked = trackedBody([
    exactBody.subarray(0, 17),
    exactBody.subarray(17, MAX_PRESET_REQUEST_BYTES - 3),
    exactBody.subarray(MAX_PRESET_REQUEST_BYTES - 3),
  ]);
  const exactService = new FakeService();
  const exactResponse = await createTrainingPresetCollectionHandlers(exactService, () => undefined).POST(
    streamRequest(exactTracked),
  );
  assert.equal(exactResponse.status, 201);
  assert.equal(exactService.createCalls, 1);
  assert.equal(exactTracked.canceled(), false);

  const invalidUtf8Body = trackedBody([new Uint8Array([0x7b, 0xff, 0x7d])]);
  const invalidUtf8Service = new FakeService();
  const invalidUtf8Response = await createTrainingPresetDetailHandlers(invalidUtf8Service, () => undefined).PUT(
    streamRequest(invalidUtf8Body),
    { params: Promise.resolve({ presetId: 'preset-id' }) },
  );
  assert.equal(invalidUtf8Response.status, 400);
  assert.equal(invalidUtf8Service.updateCalls, 0);

  const craftedJob = { ...jobFixture(), job: 'caption' } as unknown as JobConfig;
  const invalidCreateStore = new RecordingStore();
  const invalidCreateResponse = await createTrainingPresetCollectionHandlers(
    createTrainingPresetService(invalidCreateStore),
    () => undefined,
  ).POST(
    new Request('http://localhost/api/training-presets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Crafted', job_config: craftedJob }),
    }),
  );
  assert.equal(invalidCreateResponse.status, 400);
  assert.match(String(((await invalidCreateResponse.json()) as { error: string }).error), /job.*extension/i);
  assert.equal(invalidCreateStore.createCalls, 0);
  assert.equal(invalidCreateStore.rows.length, 0);

  console.log('Training preset route handler tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
