import type { JobConfig } from '../types';
import {
  MAX_PRESET_SNAPSHOT_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  compareTrainingPresetRecords,
  normalizePresetName,
  sanitizeTrainingPreset,
  validateTrainingPresetSnapshot,
  type TrainingPresetRecord,
  type TrainingPresetSnapshotV1,
} from '../helpers/trainingPresets';

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

export class TrainingPresetValidationError extends TrainingPresetServiceError {}
export class TrainingPresetPayloadTooLargeError extends TrainingPresetServiceError {
  constructor() {
    super('Preset request must not exceed 1 MiB');
  }
}
export class TrainingPresetConflictError extends TrainingPresetServiceError {}
export class TrainingPresetNotFoundError extends TrainingPresetServiceError {}
export class TrainingPresetCorruptError extends TrainingPresetServiceError {}

export interface TrainingPresetErrorResponse {
  status: 400 | 404 | 409 | 413 | 500;
  error: string;
  shouldLog: boolean;
}

export function mapTrainingPresetError(error: unknown): TrainingPresetErrorResponse {
  if (error instanceof TrainingPresetPayloadTooLargeError) {
    return { status: 413, error: error.message, shouldLog: false };
  }
  if (error instanceof TrainingPresetValidationError) {
    return { status: 400, error: error.message, shouldLog: false };
  }
  if (error instanceof TrainingPresetConflictError) {
    return { status: 409, error: error.message, shouldLog: false };
  }
  if (error instanceof TrainingPresetNotFoundError) {
    return { status: 404, error: error.message, shouldLog: false };
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

function deserializeRow(row: TrainingPresetRow): TrainingPresetRecord {
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

export function parsePresetRequestText(text: string): { name: unknown; job_config: JobConfig } {
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
  create(nameInput: unknown, currentJobConfig: JobConfig): Promise<TrainingPresetRecord>;
  update(idInput: unknown, currentJobConfig: JobConfig): Promise<TrainingPresetRecord>;
  remove(idInput: unknown): Promise<void>;
}

export function createTrainingPresetService(store: TrainingPresetStore): TrainingPresetService {
  return {
    async list(): Promise<TrainingPresetRecord[]> {
      const records = (await store.findMany()).map(deserializeRow);
      return records.sort(compareTrainingPresetRecords);
    },

    async create(nameInput: unknown, currentJobConfig: JobConfig): Promise<TrainingPresetRecord> {
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

    async update(idInput: unknown, currentJobConfig: JobConfig): Promise<TrainingPresetRecord> {
      const id = validateId(idInput);
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
