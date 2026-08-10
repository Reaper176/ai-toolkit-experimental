import type { Job } from '@prisma/client';
import { isAbsolute } from 'node:path';
import {
  LOADER_CONFIG_KEYS,
  manifestSha256,
  validateLoaderConfig,
  validateManifest,
  type DatasetPresetLoaderConfig,
} from '../helpers/datasetPresets';
import type { DatasetPresetVersionRecord } from './datasetPresetService';
import type { DatasetPresetSnapshotStore } from './datasetPresetSnapshotService';
import type { DatasetConfig, JobConfig } from '../types';

export interface ResolvedJobDatasets {
  jobConfig: JobConfig;
  usages: Array<{
    dataset_index: number;
    preset_version_id: string;
    preset_name: string;
    preset_version: number;
    manifest_sha256: string;
    resolved_loader_config: DatasetPresetLoaderConfig;
  }>;
}

export interface JobDatasetVersionStore {
  getVersionForResolution(versionId: string): Promise<{
    preset: { id: string; name: string; archived_at: Date | null };
    version: DatasetPresetVersionRecord;
  } | null>;
  existingUsage(jobId: string, datasetIndex: number): Promise<{ preset_version_id: string } | null>;
}

export interface SaveJobInput {
  id: string | null;
  clone: boolean;
  name: string;
  gpu_ids: string;
  job_config: JobConfig;
  job_ref?: string;
  job_type?: string;
  jobs: JobWriteStore;
  versions: JobDatasetVersionStore;
  snapshots: DatasetPresetSnapshotStore;
}

type TransactionSaveInput = Omit<SaveJobInput, 'jobs' | 'versions' | 'snapshots'> & { job_config: JobConfig };

export interface JobWriteTransaction {
  createOrUpdateJob(input: TransactionSaveInput): Promise<Job>;
  deleteUsages(jobId: string): Promise<void>;
  createUsages(jobId: string, usages: ResolvedJobDatasets['usages']): Promise<void>;
}

export interface JobWriteStore {
  transaction<T>(operation: (tx: JobWriteTransaction) => Promise<T>): Promise<T>;
}

export interface PreflightDeps {
  versions: Pick<JobDatasetVersionStore, 'getVersionForResolution'>;
  snapshots: DatasetPresetSnapshotStore;
}

export class JobDatasetPresetError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'JobDatasetPresetError';
  }
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function cloneJson(value: unknown, seen = new Set<object>()): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('numbers must be finite');
    return value;
  }
  if (typeof value !== 'object') throw new Error('values must be JSON-compatible');
  if (seen.has(value)) throw new Error('cyclic values are not allowed');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) {
    throw new Error('objects must be plain');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => cloneJson(item, seen));
    const result: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value)) result[key] = cloneJson(item, seen);
    return result;
  } finally {
    seen.delete(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneAndLocateDatasets(jobConfig: JobConfig): { jobConfig: JobConfig; datasets: DatasetConfig[] } {
  let copy: unknown;
  try {
    copy = cloneJson(jobConfig);
  } catch (error) {
    throw new JobDatasetPresetError('Job configuration is invalid', { cause: error });
  }
  if (!isPlainObject(copy) || !isPlainObject(copy.config) || !Array.isArray(copy.config.process) || copy.config.process.length === 0) {
    throw new JobDatasetPresetError('Job configuration is invalid');
  }
  for (const process of copy.config.process) {
    if (!isPlainObject(process)) throw new JobDatasetPresetError('Job configuration is invalid');
  }
  const first = copy.config.process[0];
  if (!Object.prototype.hasOwnProperty.call(first, 'datasets')) {
    return { jobConfig: copy as unknown as JobConfig, datasets: [] };
  }
  if (!Array.isArray(first.datasets)) throw new JobDatasetPresetError('Job configuration datasets are invalid');
  for (const dataset of first.datasets) {
    if (!isPlainObject(dataset)) throw new JobDatasetPresetError('Job configuration dataset entry is invalid');
  }
  for (const process of copy.config.process.slice(1)) {
    if (isPlainObject(process) && Array.isArray(process.datasets) && process.datasets.some(dataset => isPlainObject(dataset) && 'dataset_preset' in dataset)) {
      throw new JobDatasetPresetError('Dataset presets are only supported in the primary process');
    }
  }
  return { jobConfig: copy as unknown as JobConfig, datasets: first.datasets as unknown as DatasetConfig[] };
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function loaderSettings(dataset: DatasetConfig): DatasetPresetLoaderConfig {
  const candidate: Record<string, unknown> = {};
  for (const key of LOADER_CONFIG_KEYS) candidate[key] = dataset[key as keyof DatasetConfig];
  try {
    return validateLoaderConfig(candidate);
  } catch (error) {
    throw new JobDatasetPresetError('Dataset preset loader settings are invalid', { cause: error });
  }
}

function canonicalVersionAgreement(
  authoritative: NonNullable<Awaited<ReturnType<JobDatasetVersionStore['getVersionForResolution']>>>,
  manifestInput: unknown,
): void {
  try {
    const { preset, version } = authoritative;
    const manifest = validateManifest(manifestInput);
    const storedLoader = validateLoaderConfig(version.loader_config);
    if (!nonblank(preset.id) || !nonblank(preset.name) || version.preset_id !== preset.id) throw new Error('preset mismatch');
    if (!nonblank(version.id) || !Number.isSafeInteger(version.version) || version.version <= 0) throw new Error('version invalid');
    if (!/^[a-f0-9]{64}$/.test(version.manifest_sha256)) throw new Error('checksum invalid');
    if (
      manifest.preset_id !== version.preset_id ||
      manifest.version !== version.version ||
      manifest.source_dataset !== version.source_dataset ||
      manifestSha256(manifest) !== version.manifest_sha256 ||
      JSON.stringify(manifest.loader_config) !== JSON.stringify(storedLoader) ||
      manifest.note !== version.note ||
      manifest.media_count !== version.media_count ||
      String(manifest.total_bytes) !== version.total_bytes
    ) throw new Error('manifest mismatch');
  } catch (error) {
    throw new JobDatasetPresetError('Dataset preset version is unavailable or inconsistent', { cause: error });
  }
}

export async function resolveJobDatasetPresets(input: {
  jobId: string | null;
  clone: boolean;
  jobConfig: JobConfig;
  versions: JobDatasetVersionStore;
  snapshots: DatasetPresetSnapshotStore;
}): Promise<ResolvedJobDatasets> {
  const { jobConfig, datasets } = cloneAndLocateDatasets(input.jobConfig);
  if (input.jobId !== null && !nonblank(input.jobId)) throw new JobDatasetPresetError('Job identity is invalid');
  if (typeof input.clone !== 'boolean') throw new JobDatasetPresetError('Clone flag is invalid');
  const usages: ResolvedJobDatasets['usages'] = [];
  const verified = new Map<string, Promise<NonNullable<Awaited<ReturnType<JobDatasetVersionStore['getVersionForResolution']>>>>>();

  async function getVerified(versionId: string) {
    let pending = verified.get(versionId);
    if (!pending) {
      pending = (async () => {
        let authoritative;
        try {
          authoritative = await input.versions.getVersionForResolution(versionId);
        } catch (error) {
          throw new JobDatasetPresetError('Dataset preset version is unavailable', { cause: error });
        }
        if (!authoritative) throw new JobDatasetPresetError('Dataset preset version is unavailable');
        let manifest;
        try {
          manifest = await input.snapshots.verifyFast(authoritative.version.manifest_path);
        } catch (error) {
          throw new JobDatasetPresetError('Dataset preset snapshot is unavailable', { cause: error });
        }
        canonicalVersionAgreement(authoritative, manifest);
        return authoritative;
      })();
      verified.set(versionId, pending);
    }
    return pending;
  }

  for (let datasetIndex = 0; datasetIndex < datasets.length; datasetIndex += 1) {
    const dataset = datasets[datasetIndex];
    if (!Object.prototype.hasOwnProperty.call(dataset, 'dataset_preset')) continue;
    if (!isPlainObject(dataset.dataset_preset) || !nonblank(dataset.dataset_preset.version_id)) {
      throw new JobDatasetPresetError('Dataset preset reference is invalid');
    }
    const versionId = dataset.dataset_preset.version_id.trim();
    const authoritative = await getVerified(versionId);
    if (authoritative.preset.archived_at !== null) {
      let sameHistoricalUsage = false;
      if (!input.clone && input.jobId !== null) {
        try {
          sameHistoricalUsage =
            (await input.versions.existingUsage(input.jobId, datasetIndex))?.preset_version_id === versionId;
        } catch (error) {
          throw new JobDatasetPresetError('Dataset preset history is unavailable', { cause: error });
        }
      }
      if (!sameHistoricalUsage) throw new JobDatasetPresetError('An active dataset preset version is required');
    }
    const resolvedLoader = loaderSettings(dataset);
    let mediaRoot: string;
    try {
      mediaRoot = input.snapshots.resolveMediaRoot(authoritative.version.manifest_path);
    } catch (error) {
      throw new JobDatasetPresetError('Dataset preset snapshot is unavailable', { cause: error });
    }
    if (!nonblank(mediaRoot) || !isAbsolute(mediaRoot)) {
      throw new JobDatasetPresetError('Dataset preset snapshot is unavailable');
    }
    dataset.folder_path = mediaRoot;
    dataset.dataset_preset = {
      version_id: authoritative.version.id,
      preset_id: authoritative.preset.id,
      preset_name: authoritative.preset.name,
      version: authoritative.version.version,
      manifest_sha256: authoritative.version.manifest_sha256,
    };
    usages.push({
      dataset_index: datasetIndex,
      preset_version_id: authoritative.version.id,
      preset_name: authoritative.preset.name,
      preset_version: authoritative.version.version,
      manifest_sha256: authoritative.version.manifest_sha256,
      resolved_loader_config: structuredClone(resolvedLoader),
    });
  }
  return { jobConfig, usages };
}

export async function saveJobWithDatasetUsages(input: SaveJobInput): Promise<Job> {
  const resolved = await resolveJobDatasetPresets({
    jobId: input.id,
    clone: input.clone,
    jobConfig: input.job_config,
    versions: input.versions,
    snapshots: input.snapshots,
  });
  return input.jobs.transaction(async transaction => {
    const job = await transaction.createOrUpdateJob({
      id: input.id,
      clone: input.clone,
      name: input.name,
      gpu_ids: input.gpu_ids,
      job_config: resolved.jobConfig,
      ...(input.job_ref === undefined ? {} : { job_ref: input.job_ref }),
      ...(input.job_type === undefined ? {} : { job_type: input.job_type }),
    });
    if (!nonblank(job.id) || (!input.clone && input.id !== null && job.id !== input.id)) {
      throw new JobDatasetPresetError('Saved job identity is inconsistent');
    }
    await transaction.deleteUsages(job.id);
    await transaction.createUsages(job.id, resolved.usages);
    return job;
  });
}

export async function preflightJobDatasetPresets(jobConfig: JobConfig, deps: PreflightDeps): Promise<void> {
  await resolveJobDatasetPresets({
    jobId: null,
    clone: false,
    jobConfig,
    versions: {
      getVersionForResolution: deps.versions.getVersionForResolution.bind(deps.versions),
      async existingUsage() { return null; },
    },
    snapshots: deps.snapshots,
  });
}
