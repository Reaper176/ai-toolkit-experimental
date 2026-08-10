import { Prisma, type PrismaClient } from '@prisma/client';
import { validateLoaderConfig } from '../helpers/datasetPresets';
import type { DatasetPresetVersionRecord } from './datasetPresetService';
import {
  JobDatasetPresetError,
  type JobDatasetVersionStore,
  type JobWriteStore,
  type JobWriteTransaction,
} from './jobDatasetPresetService';

export type JobDatasetPresetPrismaClient = Pick<
  PrismaClient,
  'datasetPresetVersion' | 'jobDatasetPresetUsage' | 'job' | '$transaction'
>;

const versionForResolutionSelect = {
  id: true,
  preset_id: true,
  version: true,
  source_dataset: true,
  manifest_path: true,
  manifest_sha256: true,
  loader_config: true,
  note: true,
  media_count: true,
  total_bytes: true,
  created_at: true,
  preset: { select: { id: true, name: true, archived_at: true } },
} as const satisfies Prisma.DatasetPresetVersionSelect;

export const jobDatasetPresetUsageSelect = {
  dataset_index: true,
  preset_version_id: true,
  preset_name: true,
  preset_version: true,
  manifest_sha256: true,
  resolved_loader_config: true,
  preset_version_record: {
    select: {
      source_dataset: true,
      media_count: true,
      total_bytes: true,
      created_at: true,
      note: true,
    },
  },
} as const satisfies Prisma.JobDatasetPresetUsageSelect;

export const jobWithDatasetPresetUsagesInclude = {
  dataset_preset_usages: {
    orderBy: { dataset_index: 'asc' as const },
    select: jobDatasetPresetUsageSelect,
  },
} as const satisfies Prisma.JobInclude;

function versionRecord(
  value: Prisma.DatasetPresetVersionGetPayload<{ select: typeof versionForResolutionSelect }>,
): DatasetPresetVersionRecord {
  return {
    id: value.id,
    preset_id: value.preset_id,
    version: value.version,
    source_dataset: value.source_dataset,
    manifest_path: value.manifest_path,
    manifest_sha256: value.manifest_sha256,
    loader_config: validateLoaderConfig(JSON.parse(value.loader_config)),
    note: value.note,
    media_count: value.media_count,
    total_bytes: value.total_bytes.toString(),
    created_at: value.created_at.toISOString(),
  };
}

export function createJobDatasetVersionPrismaStore(
  prisma: JobDatasetPresetPrismaClient,
): JobDatasetVersionStore {
  return {
    async getVersionForResolution(versionId) {
      const value = await prisma.datasetPresetVersion.findUnique({
        where: { id: versionId },
        select: versionForResolutionSelect,
      });
      return value === null ? null : { preset: value.preset, version: versionRecord(value) };
    },
    async existingUsage(jobId, datasetIndex) {
      return prisma.jobDatasetPresetUsage.findUnique({
        where: { job_id_dataset_index: { job_id: jobId, dataset_index: datasetIndex } },
        select: { preset_version_id: true },
      });
    },
  };
}

function prismaCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : undefined;
}

function transactionAdapter(transaction: Prisma.TransactionClient): JobWriteTransaction {
  return {
    async createOrUpdateJob(input) {
      const optional = {
        ...(input.job_ref === undefined ? {} : { job_ref: input.job_ref }),
        ...(input.job_type === undefined ? {} : { job_type: input.job_type }),
      };
      if (input.id !== null && !input.clone) {
        return transaction.job.update({
          where: { id: input.id },
          data: {
            name: input.name,
            gpu_ids: input.gpu_ids,
            job_config: JSON.stringify(input.job_config),
            ...optional,
          },
        });
      }
      const highest = await transaction.job.aggregate({ _max: { queue_position: true } });
      return transaction.job.create({
        data: {
          name: input.name,
          gpu_ids: input.gpu_ids,
          job_config: JSON.stringify(input.job_config),
          queue_position: (highest._max.queue_position ?? 0) + 1000,
          ...optional,
        },
      });
    },

    async assertDatasetPresetEligibility(input) {
      if (input.usages.length === 0) return;
      const versionIds = [...new Set(input.usages.map(usage => usage.preset_version_id))];
      const versions = await transaction.datasetPresetVersion.findMany({
        where: { id: { in: versionIds } },
        select: {
          id: true,
          version: true,
          manifest_sha256: true,
          preset: { select: { archived_at: true } },
        },
      });
      if (versions.length !== versionIds.length) {
        throw new JobDatasetPresetError('Dataset preset version is unavailable');
      }
      const byId = new Map(versions.map(version => [version.id, version]));
      const archivedUsages = input.usages.filter(usage => {
        const version = byId.get(usage.preset_version_id);
        if (
          !version ||
          version.version !== usage.preset_version ||
          version.manifest_sha256 !== usage.manifest_sha256
        ) {
          throw new JobDatasetPresetError('Dataset preset version changed during save');
        }
        return version.preset.archived_at !== null;
      });
      if (archivedUsages.length === 0) return;
      if (input.clone || input.prior_job_id === null || input.prior_job_id !== input.job_id) {
        throw new JobDatasetPresetError('An active dataset preset version is required');
      }
      const existing = await transaction.jobDatasetPresetUsage.findMany({
        where: {
          job_id: input.prior_job_id,
          dataset_index: { in: archivedUsages.map(usage => usage.dataset_index) },
        },
        select: { dataset_index: true, preset_version_id: true },
      });
      const existingByIndex = new Map(existing.map(usage => [usage.dataset_index, usage.preset_version_id]));
      if (archivedUsages.some(usage => existingByIndex.get(usage.dataset_index) !== usage.preset_version_id)) {
        throw new JobDatasetPresetError('An active dataset preset version is required');
      }
    },

    async deleteUsages(jobId) {
      await transaction.jobDatasetPresetUsage.deleteMany({ where: { job_id: jobId } });
    },

    async createUsages(jobId, usages) {
      if (usages.length === 0) return;
      await transaction.jobDatasetPresetUsage.createMany({
        data: usages.map(usage => ({
          job_id: jobId,
          preset_version_id: usage.preset_version_id,
          dataset_index: usage.dataset_index,
          preset_name: usage.preset_name,
          preset_version: usage.preset_version,
          manifest_sha256: usage.manifest_sha256,
          resolved_loader_config: JSON.stringify(usage.resolved_loader_config),
        })),
      });
    },
  };
}

export function createJobWritePrismaStore(prisma: JobDatasetPresetPrismaClient): JobWriteStore {
  return {
    async transaction(operation) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await prisma.$transaction(
            transaction => operation(transactionAdapter(transaction)),
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
        } catch (error) {
          if (prismaCode(error) !== 'P2034' || attempt >= 2) throw error;
        }
      }
    },
  };
}

export type JobWithDatasetPresetUsages = Prisma.JobGetPayload<{
  include: typeof jobWithDatasetPresetUsagesInclude;
}>;

export function jobWithDatasetPresetUsagesResponse(job: JobWithDatasetPresetUsages | null) {
  if (job === null) return null;
  return {
    ...job,
    dataset_preset_usages: job.dataset_preset_usages.map(usage => ({
      dataset_index: usage.dataset_index,
      preset_version_id: usage.preset_version_id,
      preset_name: usage.preset_name,
      preset_version: usage.preset_version,
      manifest_sha256: usage.manifest_sha256,
      resolved_loader_config: validateLoaderConfig(JSON.parse(usage.resolved_loader_config)),
      source_dataset: usage.preset_version_record.source_dataset,
      media_count: usage.preset_version_record.media_count,
      total_bytes: usage.preset_version_record.total_bytes.toString(),
      version_created_at: usage.preset_version_record.created_at.toISOString(),
      note: usage.preset_version_record.note,
    })),
  };
}
