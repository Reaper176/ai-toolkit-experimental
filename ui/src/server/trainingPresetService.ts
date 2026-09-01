import type { JobConfig } from '../types';
import {
  MAX_PRESET_SNAPSHOT_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  compareTrainingPresetRecords,
  normalizePresetName,
  sanitizeTrainingPreset,
  validateTrainingPresetSnapshot,
  type TrainingPresetSnapshotV1,
  type BuiltInTrainingPresetRecord,
  type TrainingPresetRecord,
  type UserTrainingPresetRecord,
} from '../helpers/trainingPresets';
import { copyBuiltInPreset } from '../helpers/builtInTrainingPresets';
import { trainingPresetCatalogIdLogDigest } from './trainingPresetCatalogDigest';
import type {
  TrainingPresetCatalogEntryEvent,
  TrainingPresetCatalogProviderEvent,
} from './trainingPresetCatalogRuntime';

export const MAX_PRESET_REQUEST_BYTES = 1024 * 1024;

export interface TrainingPresetRow {
  id: string;
  name: string;
  name_key: string;
  preset_config: string;
  schema_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingPresetCreateData {
  name: string;
  name_key: string;
  preset_config: string;
  schema_version: number;
}

export interface TrainingPresetUpdateData {
  preset_config: string;
  schema_version: number;
}

export interface TrainingPresetStore {
  findMany(args?: Record<string, never>): Promise<TrainingPresetRow[]>;
  findUnique(args: { where: { id?: string; name_key?: string } }): Promise<TrainingPresetRow | null>;
  create(args: { data: TrainingPresetCreateData }): Promise<TrainingPresetRow>;
  update(args: { where: { id: string }; data: TrainingPresetUpdateData }): Promise<TrainingPresetRow>;
  delete(args: { where: { id: string } }): Promise<TrainingPresetRow>;
}

class TrainingPresetServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

const trainingPresetValidationErrors = new WeakSet<object>();
const trainingPresetPayloadTooLargeErrors = new WeakSet<object>();
const trainingPresetConflictErrors = new WeakSet<object>();
const trainingPresetNotFoundErrors = new WeakSet<object>();
const trainingPresetReadOnlyErrors = new WeakSet<object>();
const trainingPresetProvenanceErrors = new WeakSet<object>();

export class TrainingPresetValidationError extends TrainingPresetServiceError {
  constructor(message: string) {
    super(message);
    trainingPresetValidationErrors.add(this);
  }
}
export class TrainingPresetPayloadTooLargeError extends TrainingPresetServiceError {
  constructor() {
    super('Preset request must not exceed 1 MiB');
    trainingPresetPayloadTooLargeErrors.add(this);
  }
}
export class TrainingPresetConflictError extends TrainingPresetServiceError {
  constructor(message: string) {
    super(message);
    trainingPresetConflictErrors.add(this);
  }
}
export class TrainingPresetNotFoundError extends TrainingPresetServiceError {
  constructor(message: string) {
    super(message);
    trainingPresetNotFoundErrors.add(this);
  }
}
export class TrainingPresetCorruptError extends TrainingPresetServiceError {}
export class TrainingPresetReadOnlyError extends TrainingPresetServiceError {
  constructor() {
    super('Built-in training presets are read-only');
    trainingPresetReadOnlyErrors.add(this);
  }
}
export class TrainingPresetProvenanceError extends TrainingPresetServiceError {
  constructor() {
    super('Preset catalog provenance is server-owned');
    trainingPresetProvenanceErrors.add(this);
  }
}

export interface TrainingPresetErrorResponse {
  status: 400 | 404 | 409 | 413 | 500;
  error: string;
  code?: 'BUILTIN_PRESET_READ_ONLY' | 'PRESET_PROVENANCE_NOT_ALLOWED';
  shouldLog: boolean;
}

export function mapTrainingPresetError(error: unknown): TrainingPresetErrorResponse {
  try {
    if (trainingPresetPayloadTooLargeErrors.has(error as object)) {
      return { status: 413, error: (error as Error).message, shouldLog: false };
    }
    if (trainingPresetProvenanceErrors.has(error as object)) {
      return {
        status: 400,
        error: 'Preset catalog provenance is server-owned',
        code: 'PRESET_PROVENANCE_NOT_ALLOWED',
        shouldLog: false,
      };
    }
    if (trainingPresetReadOnlyErrors.has(error as object)) {
      return {
        status: 409,
        error: 'Built-in training presets are read-only',
        code: 'BUILTIN_PRESET_READ_ONLY',
        shouldLog: false,
      };
    }
    if (trainingPresetValidationErrors.has(error as object)) {
      return { status: 400, error: (error as Error).message, shouldLog: false };
    }
    if (trainingPresetConflictErrors.has(error as object)) {
      return { status: 409, error: (error as Error).message, shouldLog: false };
    }
    if (trainingPresetNotFoundErrors.has(error as object)) {
      return { status: 404, error: (error as Error).message, shouldLog: false };
    }
  } catch {
    // Error classification and message access must fail closed for arbitrary thrown values.
  }
  return { status: 500, error: 'Training preset storage is unavailable', shouldLog: true };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function databaseErrorCode(error: unknown): unknown {
  if (error === null || typeof error !== 'object' || !('code' in error)) return undefined;
  return (error as { code?: unknown }).code;
}

function validateId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TrainingPresetValidationError('Preset id must be a nonblank string');
  }
  return id.trim();
}

function rejectBuiltInPresetId(id: string): void {
  if (id.toLowerCase().startsWith('builtin:')) {
    throw new TrainingPresetReadOnlyError();
  }
}

function sanitizeJobConfig(jobConfig: JobConfig): TrainingPresetSnapshotV1 {
  try {
    return sanitizeTrainingPreset(jobConfig);
  } catch (error) {
    throw new TrainingPresetValidationError(`job_config: ${errorDetail(error)}`);
  }
}

function serializeSnapshot(snapshot: TrainingPresetSnapshotV1): string {
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PRESET_SNAPSHOT_BYTES) {
    throw new TrainingPresetValidationError('job_config produces a training preset larger than 512 KiB');
  }
  return serialized;
}

function deserializeRow(row: TrainingPresetRow): UserTrainingPresetRecord {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.preset_config);
    } catch (error) {
      throw new Error(`preset_config must be valid JSON: ${errorDetail(error)}`);
    }
    if (!isPlainObject(parsed)) throw new Error('preset_config must contain an object');
    if (row.schema_version !== parsed.schema_version) {
      throw new Error('database and embedded schema versions do not match');
    }
    const snapshot = validateTrainingPresetSnapshot(parsed);
    const createdAt = row.created_at.toISOString();
    const updatedAt = row.updated_at.toISOString();
    return {
      id: row.id,
      name: row.name,
      source: 'user',
      read_only: false,
      schema_version: SNAPSHOT_SCHEMA_VERSION,
      snapshot,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  } catch (error) {
    if (error instanceof TrainingPresetCorruptError) throw error;
    throw new TrainingPresetCorruptError(`Training preset ${row.id} is corrupt: ${errorDetail(error)}`);
  }
}

export function parsePresetRequestText(
  text: string,
  rejectCatalogProvenance = false,
): { name: unknown; job_config: JobConfig } {
  if (new TextEncoder().encode(text).byteLength > MAX_PRESET_REQUEST_BYTES) {
    throw new TrainingPresetPayloadTooLargeError();
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new TrainingPresetValidationError('Preset request must be valid JSON');
  }

  if (!isPlainObject(body)) {
    throw new TrainingPresetValidationError('Preset request body must be a plain object');
  }
  if (rejectCatalogProvenance) {
    for (const field of [
      'source',
      'read_only',
      'category',
      'intent_slug',
      'model_arch',
      'catalog_revision',
      'recipe_path',
      'evidence',
    ]) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        throw new TrainingPresetProvenanceError();
      }
    }
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'job_config')) {
    throw new TrainingPresetValidationError('Preset request body must contain job_config');
  }
  return { name: body.name, job_config: body.job_config as JobConfig };
}

export async function readPresetRequestText(request: Pick<Request, 'body' | 'headers'>): Promise<string> {
  const declaredLength = request.headers.get('content-length');
  if (/^\d+$/.test(declaredLength ?? '') && Number(declaredLength) > MAX_PRESET_REQUEST_BYTES) {
    throw new TrainingPresetPayloadTooLargeError();
  }

  if (request.body === null) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PRESET_REQUEST_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Rejection is already determined by the byte limit; cancellation is best-effort.
        }
        throw new TrainingPresetPayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new TrainingPresetValidationError('Preset request body must contain valid UTF-8');
  }
}

export interface TrainingPresetService {
  list(): Promise<TrainingPresetRecord[]>;
  create(nameInput: unknown, currentJobConfig: JobConfig): Promise<UserTrainingPresetRecord>;
  update(idInput: unknown, currentJobConfig: JobConfig): Promise<UserTrainingPresetRecord>;
  remove(idInput: unknown): Promise<void>;
}

export interface TrainingPresetServiceDependencies {
  listBuiltIns: (logger: (event: TrainingPresetCatalogEntryEvent) => void) => BuiltInTrainingPresetRecord[];
  logCatalogEvent: (event: TrainingPresetCatalogEntryEvent) => void;
  logCatalogProviderFailure: (event: TrainingPresetCatalogProviderEvent) => void;
  logCorruptUserPreset: (idDigest: string) => void;
}

const defaultTrainingPresetServiceDependencies: TrainingPresetServiceDependencies = {
  listBuiltIns: _logger => [],
  logCatalogEvent: () => undefined,
  logCatalogProviderFailure: () => undefined,
  logCorruptUserPreset: () => undefined,
};

function logBestEffort<T>(logger: (entry: T) => void, entry: T): void {
  try {
    logger(entry);
  } catch {
    // Observability callbacks must not change preset availability.
  }
}

export function createTrainingPresetService(
  store: TrainingPresetStore,
  dependencies?: Partial<TrainingPresetServiceDependencies>,
): TrainingPresetService {
  const resolvedDependencies = { ...defaultTrainingPresetServiceDependencies, ...dependencies };
  return {
    async list(): Promise<TrainingPresetRecord[]> {
      let builtIns: BuiltInTrainingPresetRecord[] = [];
      try {
        builtIns = resolvedDependencies
          .listBuiltIns(event => logBestEffort(resolvedDependencies.logCatalogEvent, event))
          .map(copyBuiltInPreset);
      } catch {
        logBestEffort(resolvedDependencies.logCatalogProviderFailure, {
          code: 'BUILTIN_PRESET_PROVIDER_FAILED',
        });
      }

      const userRows = (await store.findMany()).filter(row => {
        if (!row.id.toLowerCase().startsWith('builtin:')) return true;
        logBestEffort(resolvedDependencies.logCorruptUserPreset, trainingPresetCatalogIdLogDigest(row.id));
        return false;
      });
      const users = userRows.map(deserializeRow).sort(compareTrainingPresetRecords);
      return [...builtIns, ...users];
    },

    async create(nameInput: unknown, currentJobConfig: JobConfig): Promise<UserTrainingPresetRecord> {
      let normalized: { name: string; nameKey: string };
      try {
        normalized = normalizePresetName(nameInput);
      } catch (error) {
        throw new TrainingPresetValidationError(`name: ${errorDetail(error)}`);
      }

      if (await store.findUnique({ where: { name_key: normalized.nameKey } })) {
        throw new TrainingPresetConflictError(`A training preset named "${normalized.name}" already exists`);
      }
      const snapshot = sanitizeJobConfig(currentJobConfig);
      const presetConfig = serializeSnapshot(snapshot);
      try {
        const created = await store.create({
          data: {
            name: normalized.name,
            name_key: normalized.nameKey,
            preset_config: presetConfig,
            schema_version: SNAPSHOT_SCHEMA_VERSION,
          },
        });
        return deserializeRow(created);
      } catch (error) {
        if (databaseErrorCode(error) === 'P2002') {
          throw new TrainingPresetConflictError(`A training preset named "${normalized.name}" already exists`);
        }
        throw error;
      }
    },

    async update(idInput: unknown, currentJobConfig: JobConfig): Promise<UserTrainingPresetRecord> {
      const id = validateId(idInput);
      rejectBuiltInPresetId(id);
      if (!(await store.findUnique({ where: { id } }))) {
        throw new TrainingPresetNotFoundError(`Training preset "${id}" was not found`);
      }
      const snapshot = sanitizeJobConfig(currentJobConfig);
      const presetConfig = serializeSnapshot(snapshot);
      try {
        return deserializeRow(
          await store.update({
            where: { id },
            data: { preset_config: presetConfig, schema_version: SNAPSHOT_SCHEMA_VERSION },
          }),
        );
      } catch (error) {
        if (databaseErrorCode(error) === 'P2025') {
          throw new TrainingPresetNotFoundError(`Training preset "${id}" was not found`);
        }
        throw error;
      }
    },

    async remove(idInput: unknown): Promise<void> {
      const id = validateId(idInput);
      rejectBuiltInPresetId(id);
      if (!(await store.findUnique({ where: { id } }))) {
        throw new TrainingPresetNotFoundError(`Training preset "${id}" was not found`);
      }
      try {
        await store.delete({ where: { id } });
      } catch (error) {
        if (databaseErrorCode(error) === 'P2025') {
          throw new TrainingPresetNotFoundError(`Training preset "${id}" was not found`);
        }
        throw error;
      }
    },
  };
}
