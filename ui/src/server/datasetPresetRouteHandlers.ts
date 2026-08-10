import type { DatasetPresetLoaderConfig } from '../helpers/datasetPresets';
import { createDatasetPresetPrismaStore } from './datasetPresetPrismaStore';
import { createDatasetPresetSnapshotStore } from './datasetPresetSnapshotService';
import {
  createDatasetPresetService,
  DatasetPresetConflictError,
  DatasetPresetNotFoundError,
  DatasetPresetReferencedError,
  DatasetPresetValidationError,
  DatasetPresetVerificationError,
  type DatasetPresetService,
  type PublishPresetInput,
  type PublishVersionInput,
} from './datasetPresetService';
import prisma from './prisma';
import { getDataRoot, getDatasetsRoot } from './settings';

export const MAX_JSON_BODY_BYTES = 1024 * 1024;
const MAX_PATHS = 50_000;

export interface RouteResult {
  status: number;
  body: unknown;
}

export interface DatasetPresetRouteHandlers {
  list(): Promise<RouteResult>;
  create(request: Request): Promise<RouteResult>;
  detail(presetId: string): Promise<RouteResult>;
  update(presetId: string, request: Request): Promise<RouteResult>;
  versions(presetId: string): Promise<RouteResult>;
  publish(presetId: string, request: Request): Promise<RouteResult>;
  version(versionId: string): Promise<RouteResult>;
  removeVersion(versionId: string): Promise<RouteResult>;
  verify(versionId: string): Promise<RouteResult>;
}

export type DatasetPresetRouteLogger = (operation: string, error: unknown) => void;
export interface DatasetPresetRouteRoots {
  dataRoot: string;
  datasetsRoot: string;
}
export interface DatasetPresetRouteCompositionDependencies {
  resolveRoots(): Promise<DatasetPresetRouteRoots>;
  buildService(roots: DatasetPresetRouteRoots): Promise<DatasetPresetService> | DatasetPresetService;
}
export interface DatasetPresetRouteComposition {
  createDefaultHandlers(): Promise<DatasetPresetRouteHandlers>;
  executeDefaultRoute(
    invoke: (handlers: DatasetPresetRouteHandlers) => Promise<RouteResult>,
    logger?: DatasetPresetRouteLogger,
  ): Promise<RouteResult>;
}

class RequestBodyError extends Error {}
class PayloadTooLargeError extends Error {}

const defaultLogger: DatasetPresetRouteLogger = (operation, error) => {
  console.error(`Dataset preset ${operation} failed:`, error);
};

function plainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new RequestBodyError('Request body has missing or unknown fields');
  }
}

function boundedId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 200) {
    throw new RequestBodyError(`${label} must be a nonempty string of at most 200 characters`);
  }
  return value.trim();
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new RequestBodyError(`${label} must be a string`);
  return value;
}

function requirePaths(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new RequestBodyError(`${label} must be an array of strings`);
  }
  if (value.length > MAX_PATHS) throw new RequestBodyError(`${label} must not contain more than ${MAX_PATHS} paths`);
  return value;
}

function requireLoaderConfig(value: unknown): DatasetPresetLoaderConfig {
  if (!plainObject(value)) throw new RequestBodyError('loader_config must be a plain object');
  return value as unknown as DatasetPresetLoaderConfig;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared) && BigInt(declared) > BigInt(MAX_JSON_BODY_BYTES)) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) throw new RequestBodyError('Request body must contain JSON');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError();
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0) throw new RequestBodyError('Request body must contain JSON');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(
      chunks.length === 1 ? chunks[0] : Buffer.concat(chunks.map(chunk => Buffer.from(chunk))),
    );
  } catch {
    throw new RequestBodyError('Request body must be valid UTF-8 JSON');
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestBodyError('Request body must be valid JSON');
  }
  if (!plainObject(body)) throw new RequestBodyError('Request body must be a JSON object');
  return body;
}

async function parseCreate(request: Request): Promise<PublishPresetInput> {
  const body = await readJson(request);
  exactKeys(body, ['name', 'source_dataset', 'selected_paths', 'caption_ext', 'loader_config', 'note']);
  if (body.note !== null && typeof body.note !== 'string') throw new RequestBodyError('note must be a string or null');
  return {
    name: requireString(body.name, 'name'),
    source_dataset: requireString(body.source_dataset, 'source_dataset'),
    selected_paths: requirePaths(body.selected_paths, 'selected_paths'),
    caption_ext: requireString(body.caption_ext, 'caption_ext'),
    loader_config: requireLoaderConfig(body.loader_config),
    note: body.note,
  };
}

async function parsePublish(request: Request): Promise<PublishVersionInput> {
  const body = await readJson(request);
  exactKeys(body, [
    'source_dataset',
    'selected_paths',
    'retained_paths',
    'base_version_id',
    'caption_ext',
    'loader_config',
    'note',
  ]);
  if (body.note !== null && typeof body.note !== 'string') throw new RequestBodyError('note must be a string or null');
  const selectedPaths = requirePaths(body.selected_paths, 'selected_paths');
  const retainedPaths = requirePaths(body.retained_paths, 'retained_paths');
  if (selectedPaths.length + retainedPaths.length > MAX_PATHS) {
    throw new RequestBodyError(
      `selected_paths and retained_paths must not contain more than ${MAX_PATHS} paths in total`,
    );
  }
  return {
    source_dataset: requireString(body.source_dataset, 'source_dataset'),
    selected_paths: selectedPaths,
    retained_paths: retainedPaths,
    base_version_id: boundedId(body.base_version_id, 'base_version_id'),
    caption_ext: requireString(body.caption_ext, 'caption_ext'),
    loader_config: requireLoaderConfig(body.loader_config),
    note: body.note,
  };
}

async function parseUpdate(request: Request): Promise<{ name: string } | { archived: boolean }> {
  const body = await readJson(request);
  const keys = Object.keys(body);
  if (keys.length !== 1 || (keys[0] !== 'name' && keys[0] !== 'archived')) {
    throw new RequestBodyError('Request body must contain exactly one of name or archived');
  }
  return keys[0] === 'name'
    ? { name: requireString(body.name, 'name') }
    : typeof body.archived === 'boolean'
      ? { archived: body.archived }
      : (() => {
          throw new RequestBodyError('archived must be a boolean');
        })();
}

function mapError(error: unknown, operation: string, logger: DatasetPresetRouteLogger): RouteResult {
  if (error instanceof PayloadTooLargeError)
    return { status: 413, body: { error: 'Request body must not exceed 1 MiB' } };
  if (error instanceof RequestBodyError) return { status: 400, body: { error: error.message } };
  if (error instanceof DatasetPresetValidationError) return { status: 400, body: { error: error.message } };
  if (error instanceof DatasetPresetNotFoundError) return { status: 404, body: { error: error.message } };
  if (error instanceof DatasetPresetVerificationError) {
    return {
      status: 422,
      body: {
        error: error.message,
        preset_id: error.preset_id,
        version_id: error.version_id,
        version: error.version,
        mismatches: error.mismatches,
      },
    };
  }
  if (error instanceof DatasetPresetConflictError || error instanceof DatasetPresetReferencedError) {
    return { status: 409, body: { error: error.message } };
  }
  logger(operation, error);
  return { status: 500, body: { error: 'Dataset preset operation failed' } };
}

export function createDatasetPresetRouteHandlers(
  service: DatasetPresetService,
  logger: DatasetPresetRouteLogger = defaultLogger,
): DatasetPresetRouteHandlers {
  async function run(operation: string, action: () => Promise<RouteResult>): Promise<RouteResult> {
    try {
      return await action();
    } catch (error) {
      return mapError(error, operation, logger);
    }
  }
  return {
    list: () => run('list', async () => ({ status: 200, body: { presets: await service.listActive() } })),
    create: request =>
      run('create', async () => ({ status: 201, body: await service.createPreset(await parseCreate(request)) })),
    detail: presetId =>
      run('detail', async () => ({ status: 200, body: await service.getPreset(boundedId(presetId, 'presetId')) })),
    update: (presetId, request) =>
      run('update', async () => {
        const id = boundedId(presetId, 'presetId');
        const update = await parseUpdate(request);
        return {
          status: 200,
          body:
            'name' in update ? await service.rename(id, update.name) : await service.setArchived(id, update.archived),
        };
      }),
    versions: presetId =>
      run('versions', async () => ({
        status: 200,
        body: (await service.getPreset(boundedId(presetId, 'presetId'))).versions,
      })),
    publish: (presetId, request) =>
      run('publish', async () => ({
        status: 201,
        body: await service.publishVersion(boundedId(presetId, 'presetId'), await parsePublish(request)),
      })),
    version: versionId =>
      run('version', async () => ({ status: 200, body: await service.getVersion(boundedId(versionId, 'versionId')) })),
    removeVersion: versionId =>
      run('remove version', async () => {
        await service.deleteVersion(boundedId(versionId, 'versionId'));
        return { status: 200, body: { success: true } };
      }),
    verify: versionId =>
      run('verify', async () => {
        const id = boundedId(versionId, 'versionId');
        const version = await service.verifyVersionDetail(id, true);
        return { status: 200, body: { valid: true, version } };
      }),
  };
}

export function createDatasetPresetRouteComposition(
  dependencies: DatasetPresetRouteCompositionDependencies,
): DatasetPresetRouteComposition {
  const services = new Map<string, Promise<DatasetPresetService>>();

  async function serviceForCurrentRoots(): Promise<DatasetPresetService> {
    const roots = await dependencies.resolveRoots();
    const key = `${roots.dataRoot}\u0000${roots.datasetsRoot}`;
    let pending = services.get(key);
    if (!pending) {
      pending = Promise.resolve().then(() => dependencies.buildService(roots));
      services.set(key, pending);
      void pending.catch(() => {
        if (services.get(key) === pending) services.delete(key);
      });
    }
    return pending;
  }

  async function createDefaultHandlers(): Promise<DatasetPresetRouteHandlers> {
    return createDatasetPresetRouteHandlers(await serviceForCurrentRoots());
  }

  async function executeDefaultRoute(
    invoke: (handlers: DatasetPresetRouteHandlers) => Promise<RouteResult>,
    logger: DatasetPresetRouteLogger = defaultLogger,
  ): Promise<RouteResult> {
    try {
      return await invoke(await createDefaultHandlers());
    } catch (error) {
      logger('initialize dataset preset route', error);
      return { status: 500, body: { error: 'Dataset preset operation failed' } };
    }
  }

  return { createDefaultHandlers, executeDefaultRoute };
}

const defaultRouteComposition = createDatasetPresetRouteComposition({
  resolveRoots: async () => {
    const [dataRoot, datasetsRoot] = await Promise.all([getDataRoot(), getDatasetsRoot()]);
    return { dataRoot, datasetsRoot };
  },
  buildService: ({ dataRoot, datasetsRoot }) =>
    createDatasetPresetService({
      store: createDatasetPresetPrismaStore(prisma),
      snapshots: createDatasetPresetSnapshotStore(dataRoot),
      datasetsRoot,
    }),
});

export function createDefaultDatasetPresetRouteHandlers(): Promise<DatasetPresetRouteHandlers> {
  return defaultRouteComposition.createDefaultHandlers();
}

export function executeDefaultDatasetPresetRoute(
  invoke: (handlers: DatasetPresetRouteHandlers) => Promise<RouteResult>,
  logger?: DatasetPresetRouteLogger,
): Promise<RouteResult> {
  return defaultRouteComposition.executeDefaultRoute(invoke, logger);
}
