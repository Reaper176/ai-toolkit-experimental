import type { Job } from '@prisma/client';
import { isAbsolute } from 'node:path';
import {
  LOADER_CONFIG_KEYS,
  manifestSha256,
  normalizeRelativeMediaPath,
  validateLoaderConfig,
  validateManifest,
  type DatasetPresetLoaderConfig,
} from '../helpers/datasetPresets';
import type { DatasetPresetVersionRecord } from './datasetPresetService';
import type { DatasetPresetSnapshotStore } from './datasetPresetSnapshotService';
import type { DatasetConfig, JobConfig } from '../types';
import { DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS } from '../helpers/datasetPresetValidation';

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
  assertDatasetPresetEligibility(input: {
    job_id: string;
    prior_job_id: string | null;
    clone: boolean;
    usages: ResolvedJobDatasets['usages'];
  }): Promise<void>;
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

export class JobDatasetPresetPreflightError extends JobDatasetPresetError {
  readonly preset: string;
  readonly version: number;
  readonly missing: string[];

  constructor(input: { preset: string; version: number; missing?: string[]; cause?: unknown }) {
    super(`Dataset preset "${input.preset}" version ${input.version} snapshot is unavailable or inconsistent`, {
      cause: input.cause,
    });
    this.name = 'JobDatasetPresetPreflightError';
    this.preset = input.preset;
    this.version = input.version;
    this.missing = (input.missing ?? []).slice(0, 5);
  }
}

function safePresetName(value: unknown): string {
  if (typeof value !== 'string') return 'Unknown preset';
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned.length === 0 ? 'Unknown preset' : cleaned.slice(0, 80);
}

function safeVersion(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function safeMissingPaths(error: unknown): string[] {
  if (error === null || typeof error !== 'object' || !('missingPaths' in error)) return [];
  const input = (error as { missingPaths?: unknown }).missingPaths;
  if (!Array.isArray(input)) return [];
  const result: string[] = [];
  for (const candidate of input) {
    if (typeof candidate !== 'string') continue;
    try {
      const path = normalizeRelativeMediaPath(candidate);
      if (!result.includes(path)) result.push(path);
    } catch {
      // An invalid path is untrusted error metadata and is never exposed.
    }
    if (result.length === 5) break;
  }
  return result;
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
  let datasets: DatasetConfig[] = [];
  for (let processIndex = 0; processIndex < copy.config.process.length; processIndex += 1) {
    const process = copy.config.process[processIndex];
    if (!Object.prototype.hasOwnProperty.call(process, 'datasets')) continue;
    if (!Array.isArray(process.datasets)) throw new JobDatasetPresetError('Job configuration datasets are invalid');
    for (const dataset of process.datasets) {
      if (!isPlainObject(dataset)) throw new JobDatasetPresetError('Job configuration dataset entry is invalid');
      if (processIndex > 0 && Object.prototype.hasOwnProperty.call(dataset, 'dataset_preset')) {
        throw new JobDatasetPresetError('Dataset presets are only supported in the primary process');
      }
    }
    if (processIndex === 0) datasets = process.datasets as unknown as DatasetConfig[];
  }
  return { jobConfig: copy as unknown as JobConfig, datasets };
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExternalAuxiliaryValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function hasExternalPathValue(key: string, value: unknown): boolean {
  if (key !== 'dataset_path') return hasExternalAuxiliaryValue(value);
  return value !== null && value !== undefined;
}

function rejectPresetExternalPaths(dataset: DatasetConfig): void {
  for (const key of DATASET_PRESET_REPRODUCIBILITY_BREAKING_PATH_KEYS) {
    if (hasExternalPathValue(key, dataset[key as keyof DatasetConfig])) {
      throw new JobDatasetPresetError(`Dataset preset cannot use external path field ${key}`);
    }
  }
}

function loaderSettings(dataset: DatasetConfig): DatasetPresetLoaderConfig {
  const candidate: Record<string, unknown> = {};
  for (const key of LOADER_CONFIG_KEYS) {
    const value = dataset[key as keyof DatasetConfig];
    if (value !== undefined) candidate[key] = value;
  }
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

async function resolveJobDatasetPresetsInternal(input: {
  jobId: string | null;
  clone: boolean;
  jobConfig: JobConfig;
  versions: JobDatasetVersionStore;
  snapshots: DatasetPresetSnapshotStore;
}, eligibility: 'save' | 'integrity-only'): Promise<ResolvedJobDatasets> {
  const { jobConfig, datasets } = cloneAndLocateDatasets(input.jobConfig);
  if (input.jobId !== null && !nonblank(input.jobId)) throw new JobDatasetPresetError('Job identity is invalid');
  if (typeof input.clone !== 'boolean') throw new JobDatasetPresetError('Clone flag is invalid');
  const usages: ResolvedJobDatasets['usages'] = [];
  const verified = new Map<string, Promise<NonNullable<Awaited<ReturnType<JobDatasetVersionStore['getVersionForResolution']>>>>>();

  async function getVerified(versionId: string, reference: Record<string, unknown>) {
    let pending = verified.get(versionId);
    if (!pending) {
      pending = (async () => {
        let authoritative;
        try {
          authoritative = await input.versions.getVersionForResolution(versionId);
        } catch (error) {
          if (eligibility === 'integrity-only') {
            throw new Error('Unable to read dataset preset version', { cause: error });
          }
          throw new JobDatasetPresetError('Dataset preset version is unavailable', { cause: error });
        }
        if (!authoritative) {
          if (eligibility === 'integrity-only') {
            throw new JobDatasetPresetPreflightError({
              preset: safePresetName(reference.preset_name),
              version: safeVersion(reference.version),
            });
          }
          throw new JobDatasetPresetError('Dataset preset version is unavailable');
        }
        let manifest;
        try {
          manifest = await input.snapshots.verifyFast(authoritative.version.manifest_path);
        } catch (error) {
          if (eligibility === 'integrity-only') {
            throw new JobDatasetPresetPreflightError({
              preset: safePresetName(authoritative.preset.name),
              version: safeVersion(authoritative.version.version),
              missing: safeMissingPaths(error),
              cause: error,
            });
          }
          throw new JobDatasetPresetError('Dataset preset snapshot is unavailable', { cause: error });
        }
        try {
          canonicalVersionAgreement(authoritative, manifest);
        } catch (error) {
          if (eligibility === 'integrity-only') {
            throw new JobDatasetPresetPreflightError({
              preset: safePresetName(authoritative.preset.name),
              version: safeVersion(authoritative.version.version),
              cause: error,
            });
          }
          throw error;
        }
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
    rejectPresetExternalPaths(dataset);
    const versionId = dataset.dataset_preset.version_id.trim();
    const authoritative = await getVerified(versionId, dataset.dataset_preset);
    if (eligibility === 'save' && authoritative.preset.archived_at !== null) {
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
      if (eligibility === 'integrity-only') {
        throw new JobDatasetPresetPreflightError({
          preset: safePresetName(authoritative.preset.name),
          version: safeVersion(authoritative.version.version),
          cause: error,
        });
      }
      throw new JobDatasetPresetError('Dataset preset snapshot is unavailable', { cause: error });
    }
    if (!nonblank(mediaRoot) || !isAbsolute(mediaRoot)) {
      if (eligibility === 'integrity-only') {
        throw new JobDatasetPresetPreflightError({
          preset: safePresetName(authoritative.preset.name),
          version: safeVersion(authoritative.version.version),
        });
      }
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

export async function resolveJobDatasetPresets(input: {
  jobId: string | null;
  clone: boolean;
  jobConfig: JobConfig;
  versions: JobDatasetVersionStore;
  snapshots: DatasetPresetSnapshotStore;
}): Promise<ResolvedJobDatasets> {
  return resolveJobDatasetPresetsInternal(input, 'save');
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
    await transaction.assertDatasetPresetEligibility({
      job_id: job.id,
      prior_job_id: input.id,
      clone: input.clone,
      usages: resolved.usages,
    });
    await transaction.deleteUsages(job.id);
    await transaction.createUsages(job.id, resolved.usages);
    return job;
  });
}

export async function preflightJobDatasetPresets(jobConfig: JobConfig, deps: PreflightDeps): Promise<void> {
  await prepareJobDatasetPresetsForTraining(jobConfig, deps);
}

export async function prepareJobDatasetPresetsForTraining(
  jobConfig: JobConfig,
  deps: PreflightDeps,
): Promise<JobConfig> {
  const resolved = await resolveJobDatasetPresetsInternal({
    jobId: null,
    clone: false,
    jobConfig,
    versions: {
      getVersionForResolution: deps.versions.getVersionForResolution.bind(deps.versions),
      async existingUsage() { return null; },
    },
    snapshots: deps.snapshots,
  }, 'integrity-only');
  return resolved.jobConfig;
}
