import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  manifestSha256,
  isSupportedDatasetMediaPath,
  normalizePresetName,
  normalizeRelativeMediaPath,
  validateLoaderConfig,
  validateManifest,
  type DatasetPresetLoaderConfig,
  type DatasetPresetManifestV1,
} from '../helpers/datasetPresets';
import {
  DatasetPresetSnapshotConflictError,
  DatasetPresetSnapshotVerificationError,
  type DatasetPresetVerificationMismatch,
  type DatasetPresetSnapshotStore,
  type StagedPublication,
} from './datasetPresetSnapshotService';
import type { DatasetMaskService } from './datasetMaskService';

export interface DatasetPresetSummary {
  id: string;
  name: string;
  archived_at: string | null;
  latest_version: number;
  version_count: number;
  media_count: number;
  total_bytes: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetPresetVersionRecord {
  id: string;
  preset_id: string;
  version: number;
  source_dataset: string;
  manifest_path: string;
  manifest_sha256: string;
  loader_config: DatasetPresetLoaderConfig;
  note: string | null;
  media_count: number;
  total_bytes: string;
  created_at: string;
}

export interface DatasetPresetVersionDetail extends DatasetPresetVersionRecord {
  reference_count: number;
  manifest: DatasetPresetManifestV1;
}

type VerifiedDatasetPresetVersion = DatasetPresetVersionRecord & { manifest: DatasetPresetManifestV1 };

export interface DatasetPresetDetail extends DatasetPresetSummary {
  versions: DatasetPresetVersionRecord[];
}

export interface PublishPresetInput {
  name: string;
  source_dataset: string;
  selected_paths: string[];
  caption_ext: string;
  loader_config: DatasetPresetLoaderConfig;
  note: string | null;
}

export interface PublishVersionInput extends Omit<PublishPresetInput, 'name'> {
  base_version_id: string;
  retained_paths: string[];
}

class DatasetPresetServiceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
  }
}

export class DatasetPresetValidationError extends DatasetPresetServiceError {}
export class DatasetPresetConflictError extends DatasetPresetServiceError {}
export class DatasetPresetNotFoundError extends DatasetPresetServiceError {}
export class DatasetPresetReferencedError extends DatasetPresetServiceError {}
export class DatasetPresetStorageError extends DatasetPresetServiceError {}
export class DatasetPresetVerificationError extends DatasetPresetServiceError {
  readonly preset_id: string;
  readonly version_id: string;
  readonly version: number;
  readonly mismatches: DatasetPresetVerificationMismatch[];

  constructor(input: {
    preset_id: string;
    version_id: string;
    version: number;
    mismatches: DatasetPresetVerificationMismatch[];
    cause?: unknown;
  }) {
    super('Dataset preset verification failed', input.cause);
    this.preset_id = input.preset_id;
    this.version_id = input.version_id;
    this.version = input.version;
    this.mismatches = input.mismatches.slice(0, 5).map(mismatch => ({ ...mismatch }));
  }
}

export type DatasetPresetStoreErrorCode =
  | 'name_conflict'
  | 'version_conflict'
  | 'not_found'
  | 'referenced'
  | 'archived';

export class DatasetPresetStoreError extends Error {
  constructor(
    readonly code: DatasetPresetStoreErrorCode,
    cause?: unknown,
  ) {
    super(code);
    this.name = 'DatasetPresetStoreError';
    this.cause = cause;
  }
}

export interface DatasetPresetRow {
  id: string;
  name: string;
  name_key: string;
  next_version: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DatasetPresetVersionRow {
  id: string;
  preset_id: string;
  version: number;
  source_dataset: string;
  manifest_path: string;
  manifest_sha256: string;
  loader_config: string;
  note: string | null;
  media_count: number;
  total_bytes: bigint;
  created_at: Date;
}

export interface DatasetPresetCreateData {
  name: string;
  name_key: string;
}

export interface DatasetPresetVersionCreateData {
  preset_id: string;
  version: number;
  source_dataset: string;
  manifest_path: string;
  manifest_sha256: string;
  loader_config: string;
  note: string | null;
  media_count: number;
  total_bytes: bigint;
}

export interface DatasetPresetWithVersionsRow extends DatasetPresetRow {
  versions: DatasetPresetVersionRow[];
}

export interface DatasetPresetStore {
  listManifestPaths(): Promise<string[]>;
  listActiveWithVersions(): Promise<DatasetPresetWithVersionsRow[]>;
  getPreset(id: string): Promise<DatasetPresetRow | null>;
  findPresetByNameKey(nameKey: string): Promise<DatasetPresetRow | null>;
  createPreset(data: DatasetPresetCreateData): Promise<DatasetPresetRow>;
  deleteEmptyPreset(id: string): Promise<void>;
  listVersions(presetId: string): Promise<DatasetPresetVersionRow[]>;
  reserveNextVersion(presetId: string): Promise<number>;
  insertReservedVersionIfActive(data: DatasetPresetVersionCreateData): Promise<DatasetPresetVersionRow>;
  updateName(id: string, name: string, nameKey: string): Promise<DatasetPresetRow>;
  setArchived(id: string, archivedAt: Date | null): Promise<DatasetPresetRow>;
  getVersion(id: string): Promise<DatasetPresetVersionRow | null>;
  countVersionUsages(id: string): Promise<number>;
  deleteVersion(id: string): Promise<void>;
}

export interface DatasetPresetService {
  listActive(): Promise<DatasetPresetSummary[]>;
  getPreset(id: string): Promise<DatasetPresetDetail>;
  createPreset(input: PublishPresetInput): Promise<DatasetPresetDetail>;
  publishVersion(presetId: string, input: PublishVersionInput): Promise<DatasetPresetVersionRecord>;
  rename(presetId: string, name: string): Promise<DatasetPresetDetail>;
  setArchived(presetId: string, archived: boolean): Promise<DatasetPresetDetail>;
  getVersion(versionId: string): Promise<DatasetPresetVersionDetail>;
  verifyVersionDetail(versionId: string, full: boolean): Promise<DatasetPresetVersionDetail>;
  deleteVersion(versionId: string): Promise<void>;
  verifyVersion(versionId: string, full: boolean): Promise<DatasetPresetManifestV1>;
}

interface ValidPublishInput {
  sourceDataset: string;
  selectedPaths: string[];
  captionExt: string;
  loaderConfig: DatasetPresetLoaderConfig;
  note: string | null;
}

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function storeCode(error: unknown): DatasetPresetStoreErrorCode | undefined {
  if (error === null || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return code === 'name_conflict' ||
    code === 'version_conflict' ||
    code === 'not_found' ||
    code === 'referenced' ||
    code === 'archived'
    ? code
    : undefined;
}

function validateId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DatasetPresetValidationError(`${label} must be a nonblank string`);
  }
  return value.trim();
}

function validatePublishInput(input: Omit<PublishPresetInput, 'name'>): ValidPublishInput {
  try {
    const sourceDataset = normalizeRelativeMediaPath(input.source_dataset);
    if (sourceDataset.includes('/')) throw new Error('Source dataset must be one portable directory component');
    if (!Array.isArray(input.selected_paths)) throw new Error('Selected paths must be an array');
    const selectedPaths = input.selected_paths.map(normalizeRelativeMediaPath);
    const unsupportedPath = selectedPaths.find(path => !isSupportedDatasetMediaPath(path));
    if (unsupportedPath !== undefined) throw new Error(`Selected path must use a supported media extension: ${unsupportedPath}`);
    const selectedKeys = new Set(selectedPaths.map(path => path.toLowerCase()));
    if (selectedKeys.size !== selectedPaths.length) throw new Error('Selected paths must be unique');
    const loaderConfig = validateLoaderConfig(input.loader_config);
    const captionExt = validateLoaderConfig({ ...loaderConfig, caption_ext: input.caption_ext }).caption_ext;
    if (captionExt.replace(/^\./, '') !== loaderConfig.caption_ext.replace(/^\./, '')) {
      throw new Error('Caption extension must match loader config.caption_ext');
    }
    if (input.note !== null && typeof input.note !== 'string') throw new Error('Note must be a string or null');
    if (typeof input.note === 'string' && input.note.length > 500)
      throw new Error('Note must be at most 500 characters');
    return { sourceDataset, selectedPaths, captionExt, loaderConfig, note: input.note };
  } catch (error) {
    if (error instanceof DatasetPresetValidationError) throw error;
    throw new DatasetPresetValidationError(`Invalid dataset preset input: ${detail(error)}`, error);
  }
}

function parseLoaderConfig(row: DatasetPresetVersionRow): DatasetPresetLoaderConfig {
  try {
    return validateLoaderConfig(JSON.parse(row.loader_config));
  } catch (error) {
    throw new DatasetPresetStorageError('Stored dataset preset metadata is invalid', error);
  }
}

function versionDto(row: DatasetPresetVersionRow): DatasetPresetVersionRecord {
  try {
    if (!Number.isSafeInteger(row.version) || row.version <= 0) throw new Error('Invalid stored version');
    if (!Number.isSafeInteger(row.media_count) || row.media_count <= 0) throw new Error('Invalid stored media count');
    if (typeof row.total_bytes !== 'bigint' || row.total_bytes < BigInt(0)) {
      throw new Error('Invalid stored total bytes');
    }
    if (!/^[a-f0-9]{64}$/.test(row.manifest_sha256)) throw new Error('Invalid stored manifest checksum');
    if (row.note !== null && (typeof row.note !== 'string' || row.note.length > 500))
      throw new Error('Invalid stored note');
    const sourceDataset = normalizeRelativeMediaPath(row.source_dataset);
    if (sourceDataset.includes('/')) throw new Error('Invalid stored source dataset');
    normalizeRelativeMediaPath(row.manifest_path);
    return {
      id: validateId(row.id, 'Stored version id'),
      preset_id: validateId(row.preset_id, 'Stored preset id'),
      version: row.version,
      source_dataset: sourceDataset,
      manifest_path: row.manifest_path,
      manifest_sha256: row.manifest_sha256,
      loader_config: parseLoaderConfig(row),
      note: row.note,
      media_count: row.media_count,
      total_bytes: row.total_bytes.toString(),
      created_at: row.created_at.toISOString(),
    };
  } catch (error) {
    if (error instanceof DatasetPresetStorageError) throw error;
    throw new DatasetPresetStorageError('Stored dataset preset metadata is invalid', error);
  }
}

function presetDto(row: DatasetPresetRow, versionsInput: DatasetPresetVersionRow[]): DatasetPresetDetail {
  const versions = [...versionsInput].sort((left, right) => left.version - right.version);
  const latest = versions.length === 0 ? undefined : versions[versions.length - 1];
  return {
    id: row.id,
    name: row.name,
    archived_at: row.archived_at?.toISOString() ?? null,
    latest_version: latest?.version ?? 0,
    version_count: versions.length,
    media_count: latest?.media_count ?? 0,
    total_bytes: latest?.total_bytes.toString() ?? '0',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    versions: versions.map(versionDto),
  };
}

function storageError(message: string, cause: unknown): DatasetPresetStorageError {
  return cause instanceof DatasetPresetStorageError ? cause : new DatasetPresetStorageError(message, cause);
}

function combined(primary: unknown, cleanupErrors: unknown[]): unknown {
  return cleanupErrors.length === 0 ? primary : new AggregateError([primary, ...cleanupErrors], detail(primary));
}

function publicationConflict(error: unknown): boolean {
  return (
    (error instanceof DatasetPresetStoreError && error.code === 'version_conflict') ||
    error instanceof DatasetPresetSnapshotConflictError
  );
}

class ManifestAgreementError extends Error {
  constructor(readonly mismatch: DatasetPresetVerificationMismatch) {
    super(`Stored manifest disagrees on ${mismatch.path}`);
    this.name = 'ManifestAgreementError';
  }
}

function canonicalDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function boundedAgreementString(value: string): string {
  return value.length <= 80 ? value : canonicalDigest(value);
}

function manifestAgreementMismatch(
  row: DatasetPresetVersionRow,
  manifest: DatasetPresetManifestV1,
): DatasetPresetVerificationMismatch | null {
  const mismatch = (
    path: string,
    expected: string | number | null,
    actual: string | number | null,
  ): DatasetPresetVerificationMismatch => ({ kind: 'manifest', asset: 'manifest', path, expected, actual });
  const expectedIdentity = `${row.preset_id}:v${row.version}`;
  const actualIdentity = `${manifest.preset_id}:v${manifest.version}`;
  if (expectedIdentity !== actualIdentity) return mismatch('identity', expectedIdentity, actualIdentity);
  const expectedPath = `${manifest.preset_id}/v${manifest.version}/manifest.json`;
  if (row.manifest_path !== expectedPath) {
    return mismatch('path', expectedPath, boundedAgreementString(row.manifest_path));
  }
  if (row.source_dataset !== manifest.source_dataset) {
    return mismatch(
      'source_dataset',
      boundedAgreementString(row.source_dataset),
      boundedAgreementString(manifest.source_dataset),
    );
  }
  const loader = parseLoaderConfig(row);
  if (JSON.stringify(loader) !== JSON.stringify(manifest.loader_config)) {
    return mismatch('loader_config', canonicalDigest(loader), canonicalDigest(manifest.loader_config));
  }
  if (row.note !== manifest.note) {
    return mismatch(
      'note',
      row.note === null ? null : boundedAgreementString(row.note),
      manifest.note === null ? null : boundedAgreementString(manifest.note),
    );
  }
  if (row.media_count !== manifest.media_count) return mismatch('media_count', row.media_count, manifest.media_count);
  if (row.total_bytes !== BigInt(manifest.total_bytes)) {
    return mismatch('total_bytes', row.total_bytes.toString(), manifest.total_bytes);
  }
  const actualChecksum = manifestSha256(manifest);
  if (row.manifest_sha256 !== actualChecksum) return mismatch('checksum', row.manifest_sha256, actualChecksum);
  return null;
}

function assertManifestAgreement(row: DatasetPresetVersionRow, manifestInput: unknown): DatasetPresetManifestV1 {
  let manifest: DatasetPresetManifestV1;
  try {
    manifest = validateManifest(manifestInput);
    const mismatch = manifestAgreementMismatch(row, manifest);
    if (mismatch !== null) throw new ManifestAgreementError(mismatch);
    return validateManifest(manifest);
  } catch (error) {
    if (error instanceof DatasetPresetStorageError) throw error;
    throw new DatasetPresetStorageError('Stored dataset preset snapshot is inconsistent', error);
  }
}

export function createDatasetPresetService(dependencies: {
  store: DatasetPresetStore;
  snapshots: DatasetPresetSnapshotStore;
  datasetsRoot: string;
  masks?: DatasetMaskService;
}): DatasetPresetService {
  const { store, snapshots, datasetsRoot, masks } = dependencies;
  const publishQueues = new Map<string, Promise<void>>();

  async function getPresetRow(idInput: unknown): Promise<DatasetPresetRow> {
    const id = validateId(idInput, 'Preset id');
    let row: DatasetPresetRow | null;
    try {
      row = await store.getPreset(id);
    } catch (error) {
      throw storageError('Dataset preset storage is unavailable', error);
    }
    if (!row) throw new DatasetPresetNotFoundError(`Dataset preset "${id}" was not found`);
    return row;
  }

  async function getDetail(row: DatasetPresetRow): Promise<DatasetPresetDetail> {
    try {
      return presetDto(row, await store.listVersions(row.id));
    } catch (error) {
      throw storageError('Dataset preset storage is unavailable', error);
    }
  }

  async function getVersionRow(versionId: string): Promise<DatasetPresetVersionRow> {
    let row: DatasetPresetVersionRow | null;
    try {
      row = await store.getVersion(versionId);
    } catch (error) {
      throw storageError('Dataset preset storage is unavailable', error);
    }
    if (!row) throw new DatasetPresetNotFoundError(`Dataset preset version "${versionId}" was not found`);
    return row;
  }

  async function getVerifiedVersion(
    row: DatasetPresetVersionRow,
    verification: 'read' | 'fast' | 'full',
  ): Promise<VerifiedDatasetPresetVersion> {
    let manifest: DatasetPresetManifestV1;
    try {
      manifest = await (verification === 'full'
        ? snapshots.verifyFull(row.manifest_path)
        : verification === 'fast'
          ? snapshots.verifyFast(row.manifest_path)
          : snapshots.readManifest(row.manifest_path));
    } catch (error) {
      if (error instanceof DatasetPresetSnapshotVerificationError) {
        throw new DatasetPresetVerificationError({
          preset_id: row.preset_id,
          version_id: row.id,
          version: row.version,
          mismatches: error.mismatches,
          cause: error,
        });
      }
      throw storageError('Dataset preset snapshot is unavailable', error);
    }
    try {
      return { ...versionDto(row), manifest: assertManifestAgreement(row, manifest) };
    } catch (error) {
      if (verification === 'full') {
        const disagreement =
          error instanceof DatasetPresetStorageError && error.cause instanceof ManifestAgreementError
            ? error.cause.mismatch
            : null;
        throw new DatasetPresetVerificationError({
          preset_id: row.preset_id,
          version_id: row.id,
          version: row.version,
          mismatches: disagreement === null
            ? [
                {
                  kind: 'manifest',
                  asset: 'manifest',
                  path: 'manifest.json',
                  expected: 'valid database agreement',
                  actual: 'invalid',
                },
              ]
            : [disagreement],
          cause: error,
        });
      }
      throw error;
    }
  }

  async function getVersionDetail(
    row: DatasetPresetVersionRow,
    verification: 'read' | 'fast' | 'full',
  ): Promise<DatasetPresetVersionDetail> {
    const verified = await getVerifiedVersion(row, verification);
    let referenceCount: number;
    try {
      referenceCount = await store.countVersionUsages(row.id);
    } catch (error) {
      throw storageError('Dataset preset storage is unavailable', error);
    }
    return { ...verified, reference_count: referenceCount };
  }

  async function rollbackAndCleanup(
    primary: unknown,
    publication: StagedPublication | undefined,
    emptyPresetId?: string,
  ): Promise<never> {
    const cleanupErrors: unknown[] = [];
    if (publication) {
      try {
        await publication.rollback();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (emptyPresetId) {
      try {
        await store.deleteEmptyPreset(emptyPresetId);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    const failure = combined(primary, cleanupErrors);
    if (storeCode(primary) === 'archived') {
      throw new DatasetPresetConflictError('Dataset preset was archived before publication committed', failure);
    }
    if (publicationConflict(primary)) {
      throw new DatasetPresetConflictError('A dataset preset version conflict could not be resolved', failure);
    }
    if (storeCode(primary) === 'not_found') {
      throw new DatasetPresetNotFoundError('Dataset preset was removed before publication committed', failure);
    }
    throw storageError('Dataset preset snapshot could not be published', failure);
  }

  async function rollbackPublication(publication: StagedPublication | undefined): Promise<unknown[]> {
    if (!publication) return [];
    try {
      await publication.rollback();
      return [];
    } catch (error) {
      return [error];
    }
  }

  async function createVersionData(
    preset: DatasetPresetRow,
    version: number,
    input: ValidPublishInput,
    retainedPaths: string[] = [],
    priorManifestPath?: string,
  ): Promise<{ publication: StagedPublication; data: DatasetPresetVersionCreateData }> {
    const publication = await snapshots.stageVersion({
      presetId: preset.id,
      version,
      presetName: preset.name,
      sourceDataset: input.sourceDataset,
      datasetsRoot,
      sourceRoot: join(datasetsRoot, input.sourceDataset),
      selectedPaths: input.selectedPaths,
      retainedPaths,
      priorManifestPath,
      captionExt: input.captionExt,
      loaderConfig: input.loaderConfig,
      note: input.note,
      maskService: masks,
    });
    const manifest = publication.manifest;
    return {
      publication,
      data: {
        preset_id: preset.id,
        version,
        source_dataset: manifest.source_dataset,
        manifest_path: publication.manifestPath,
        manifest_sha256: publication.manifestSha256,
        loader_config: JSON.stringify(manifest.loader_config),
        note: manifest.note,
        media_count: manifest.media_count,
        total_bytes: BigInt(manifest.total_bytes),
      },
    };
  }

  async function serializePublish<T>(presetId: string, operation: () => Promise<T>): Promise<T> {
    const previous = publishQueues.get(presetId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => gate);
    publishQueues.set(presetId, queued);
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (publishQueues.get(presetId) === queued) publishQueues.delete(presetId);
    }
  }

  const service: DatasetPresetService = {
    async listActive(): Promise<DatasetPresetSummary[]> {
      try {
        const details = (await store.listActiveWithVersions()).map(({ versions, ...row }) => presetDto(row, versions));
        return details
          .map(({ versions: _versions, ...summary }) => summary)
          .sort(
            (left, right) =>
              left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) || left.id.localeCompare(right.id),
          );
      } catch (error) {
        throw storageError('Dataset preset storage is unavailable', error);
      }
    },

    async getPreset(id: string): Promise<DatasetPresetDetail> {
      return getDetail(await getPresetRow(id));
    },

    async createPreset(input: PublishPresetInput): Promise<DatasetPresetDetail> {
      let normalized: { name: string; nameKey: string };
      try {
        normalized = normalizePresetName(input.name);
      } catch (error) {
        throw new DatasetPresetValidationError(`Invalid dataset preset name: ${detail(error)}`, error);
      }
      const valid = validatePublishInput(input);
      if (valid.selectedPaths.length === 0) {
        throw new DatasetPresetValidationError('A new dataset preset must contain at least one selected file');
      }
      try {
        if (await store.findPresetByNameKey(normalized.nameKey)) {
          throw new DatasetPresetConflictError(`A dataset preset named "${normalized.name}" already exists`);
        }
      } catch (error) {
        if (error instanceof DatasetPresetConflictError) throw error;
        throw storageError('Dataset preset storage is unavailable', error);
      }

      let preset: DatasetPresetRow;
      try {
        preset = await store.createPreset({ name: normalized.name, name_key: normalized.nameKey });
      } catch (error) {
        if (storeCode(error) === 'name_conflict') {
          throw new DatasetPresetConflictError(`A dataset preset named "${normalized.name}" already exists`, error);
        }
        throw storageError('Dataset preset storage is unavailable', error);
      }

      let publication: StagedPublication | undefined;
      try {
        const reservedVersion = await store.reserveNextVersion(preset.id);
        const staged = await createVersionData(preset, reservedVersion, valid);
        publication = staged.publication;
        await publication.publish();
        await store.insertReservedVersionIfActive(staged.data);
      } catch (error) {
        return rollbackAndCleanup(error, publication, preset.id);
      }
      return getDetail(await getPresetRow(preset.id));
    },

    async publishVersion(presetIdInput: string, input: PublishVersionInput): Promise<DatasetPresetVersionRecord> {
      const presetId = validateId(presetIdInput, 'Preset id');
      const baseVersionId = validateId(input.base_version_id, 'Base version id');
      const valid = validatePublishInput(input);
      let retainedPaths: string[];
      try {
        if (!Array.isArray(input.retained_paths)) throw new Error('Retained paths must be an array');
        retainedPaths = input.retained_paths.map(normalizeRelativeMediaPath);
        const retainedKeys = new Set(retainedPaths.map(path => path.toLowerCase()));
        if (retainedKeys.size !== retainedPaths.length) throw new Error('Retained paths must be unique');
        if (valid.selectedPaths.some(path => retainedKeys.has(path.toLowerCase()))) {
          throw new Error('A path cannot be both selected and retained');
        }
        if (valid.selectedPaths.length + retainedPaths.length === 0)
          throw new Error('A snapshot must contain at least one file');
      } catch (error) {
        throw new DatasetPresetValidationError(`Invalid dataset preset input: ${detail(error)}`, error);
      }

      return serializePublish(presetId, async () => {
        const preset = await getPresetRow(presetId);
        if (preset.archived_at !== null)
          throw new DatasetPresetValidationError('Archived dataset presets cannot publish new versions');
        const base = await getVersionRow(baseVersionId);
        if (base.preset_id !== presetId)
          throw new DatasetPresetValidationError('Base version must belong to the same dataset preset');
        const verifiedBase = await getVerifiedVersion(base, 'fast');
        const basePathKeys = new Set(verifiedBase.manifest.files.map(file => file.source_path.toLowerCase()));
        const selectedFromBase = valid.selectedPaths.find(path => basePathKeys.has(path.toLowerCase()));
        if (selectedFromBase !== undefined) {
          throw new DatasetPresetValidationError(
            `Selected path must be newly enabled and absent from the base manifest: ${selectedFromBase}`,
          );
        }
        const invalidRetained = retainedPaths.find(path => !basePathKeys.has(path.toLowerCase()));
        if (invalidRetained !== undefined) {
          throw new DatasetPresetValidationError(`Retained path is missing from the base manifest: ${invalidRetained}`);
        }
        if (
          retainedPaths.length > 0 &&
          valid.captionExt.replace(/^\./, '') !== verifiedBase.manifest.loader_config.caption_ext.replace(/^\./, '')
        ) {
          throw new DatasetPresetValidationError(
            'Caption extension cannot change while files are retained from the base manifest',
          );
        }

        for (let attempt = 0; attempt < 2; attempt += 1) {
          let publication: StagedPublication | undefined;
          try {
            const reservedVersion = await store.reserveNextVersion(presetId);
            const staged = await createVersionData(preset, reservedVersion, valid, retainedPaths, base.manifest_path);
            publication = staged.publication;
            await publication.publish();
            return versionDto(await store.insertReservedVersionIfActive(staged.data));
          } catch (error) {
            const cleanupErrors = await rollbackPublication(publication);
            if (attempt === 0 && publicationConflict(error) && cleanupErrors.length === 0) continue;
            return rollbackAndCleanup(combined(error, cleanupErrors), undefined);
          }
        }
        throw new DatasetPresetConflictError('A dataset preset version conflict could not be resolved');
      });
    },

    async rename(presetId: string, name: string): Promise<DatasetPresetDetail> {
      const id = validateId(presetId, 'Preset id');
      let normalized: { name: string; nameKey: string };
      try {
        normalized = normalizePresetName(name);
      } catch (error) {
        throw new DatasetPresetValidationError(`Invalid dataset preset name: ${detail(error)}`, error);
      }
      await getPresetRow(id);
      try {
        const existing = await store.findPresetByNameKey(normalized.nameKey);
        if (existing && existing.id !== id)
          throw new DatasetPresetConflictError(`A dataset preset named "${normalized.name}" already exists`);
        return getDetail(await store.updateName(id, normalized.name, normalized.nameKey));
      } catch (error) {
        if (error instanceof DatasetPresetConflictError) throw error;
        if (storeCode(error) === 'name_conflict')
          throw new DatasetPresetConflictError(`A dataset preset named "${normalized.name}" already exists`, error);
        if (storeCode(error) === 'not_found')
          throw new DatasetPresetNotFoundError(`Dataset preset "${id}" was not found`, error);
        throw storageError('Dataset preset storage is unavailable', error);
      }
    },

    async setArchived(presetId: string, archived: boolean): Promise<DatasetPresetDetail> {
      const id = validateId(presetId, 'Preset id');
      if (typeof archived !== 'boolean') throw new DatasetPresetValidationError('Archived must be a boolean');
      await getPresetRow(id);
      try {
        return getDetail(await store.setArchived(id, archived ? new Date() : null));
      } catch (error) {
        if (storeCode(error) === 'not_found')
          throw new DatasetPresetNotFoundError(`Dataset preset "${id}" was not found`, error);
        throw storageError('Dataset preset storage is unavailable', error);
      }
    },

    async getVersion(versionIdInput: string): Promise<DatasetPresetVersionDetail> {
      const versionId = validateId(versionIdInput, 'Version id');
      return getVersionDetail(await getVersionRow(versionId), 'read');
    },

    async verifyVersion(versionIdInput: string, full: boolean): Promise<DatasetPresetManifestV1> {
      return (await service.verifyVersionDetail(versionIdInput, full)).manifest;
    },

    async verifyVersionDetail(versionIdInput: string, full: boolean): Promise<DatasetPresetVersionDetail> {
      const versionId = validateId(versionIdInput, 'Version id');
      if (typeof full !== 'boolean') throw new DatasetPresetValidationError('Full verification flag must be a boolean');
      return getVersionDetail(await getVersionRow(versionId), full ? 'full' : 'fast');
    },

    async deleteVersion(versionIdInput: string): Promise<void> {
      const versionId = validateId(versionIdInput, 'Version id');
      const row = await getVersionRow(versionId);
      let usageCount: number;
      try {
        usageCount = await store.countVersionUsages(versionId);
      } catch (error) {
        throw storageError('Dataset preset storage is unavailable', error);
      }
      if (usageCount > 0)
        throw new DatasetPresetReferencedError('Dataset preset version is referenced by one or more jobs');
      await getVerifiedVersion(row, 'read');

      let quarantine;
      try {
        quarantine = await snapshots.quarantineVersion(row.manifest_path);
      } catch (error) {
        throw storageError('Dataset preset snapshot could not be quarantined', error);
      }
      try {
        await store.deleteVersion(versionId);
      } catch (primary) {
        const cleanupErrors: unknown[] = [];
        try {
          await quarantine.restore();
        } catch (error) {
          cleanupErrors.push(error);
        }
        if (storeCode(primary) === 'referenced')
          throw new DatasetPresetReferencedError(
            'Dataset preset version is referenced by one or more jobs',
            combined(primary, cleanupErrors),
          );
        if (storeCode(primary) === 'not_found')
          throw new DatasetPresetNotFoundError(
            `Dataset preset version "${versionId}" was not found`,
            combined(primary, cleanupErrors),
          );
        throw storageError('Dataset preset version could not be deleted', combined(primary, cleanupErrors));
      }
      try {
        await quarantine.remove();
      } catch (error) {
        throw new DatasetPresetStorageError('Dataset preset snapshot cleanup requires maintenance', error);
      }
    },
  };

  return service;
}
