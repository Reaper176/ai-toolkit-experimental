import type { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from './prisma';
import {
  DatasetPresetStoreError,
  type DatasetPresetCreateData,
  type DatasetPresetRow,
  type DatasetPresetStore,
  type DatasetPresetStoreErrorCode,
  type DatasetPresetVersionCreateData,
  type DatasetPresetVersionRow,
  type DatasetPresetWithVersionsRow,
} from './datasetPresetService';

export type DatasetPresetPrismaClient = Pick<
  PrismaClient,
  'datasetPreset' | 'datasetPresetVersion' | 'jobDatasetPresetUsage' | '$transaction'
>;

const presetSelect = {
  id: true,
  name: true,
  name_key: true,
  next_version: true,
  archived_at: true,
  created_at: true,
  updated_at: true,
} as const satisfies Prisma.DatasetPresetSelect;

const versionSelect = {
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
} as const satisfies Prisma.DatasetPresetVersionSelect;

const presetWithVersionsSelect = {
  ...presetSelect,
  versions: {
    orderBy: [{ version: 'asc' }, { id: 'asc' }],
    select: versionSelect,
  },
} as const satisfies Prisma.DatasetPresetSelect;

type PresetPayload = Prisma.DatasetPresetGetPayload<{ select: typeof presetSelect }>;
type VersionPayload = Prisma.DatasetPresetVersionGetPayload<{ select: typeof versionSelect }>;
type PresetWithVersionsPayload = Prisma.DatasetPresetGetPayload<{ select: typeof presetWithVersionsSelect }>;

function prismaCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : undefined;
}

function mapped(
  error: unknown,
  conflict: Extract<DatasetPresetStoreErrorCode, 'name_conflict' | 'version_conflict'>,
): never {
  if (error instanceof DatasetPresetStoreError) throw error;
  const code = prismaCode(error);
  if (code === 'P2002') throw new DatasetPresetStoreError(conflict, error);
  if (code === 'P2025') throw new DatasetPresetStoreError('not_found', error);
  if (code === 'P2003') throw new DatasetPresetStoreError('referenced', error);
  throw error;
}

function presetRow(value: PresetPayload): DatasetPresetRow {
  return {
    id: value.id,
    name: value.name,
    name_key: value.name_key,
    next_version: value.next_version,
    archived_at: value.archived_at,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function versionRow(value: VersionPayload): DatasetPresetVersionRow {
  return {
    id: value.id,
    preset_id: value.preset_id,
    version: value.version,
    source_dataset: value.source_dataset,
    manifest_path: value.manifest_path,
    manifest_sha256: value.manifest_sha256,
    loader_config: value.loader_config,
    note: value.note,
    media_count: value.media_count,
    total_bytes: value.total_bytes,
    created_at: value.created_at,
  };
}

function presetWithVersionsRow(value: PresetWithVersionsPayload): DatasetPresetWithVersionsRow {
  return { ...presetRow(value), versions: value.versions.map(versionRow) };
}

async function requireActivePreset(transaction: Prisma.TransactionClient, presetId: string): Promise<void> {
  const preset = await transaction.datasetPreset.findUnique({
    where: { id: presetId },
    select: { archived_at: true },
  });
  if (!preset) throw new DatasetPresetStoreError('not_found');
  if (preset.archived_at !== null) throw new DatasetPresetStoreError('archived');
}

export function createDatasetPresetPrismaStore(prisma: DatasetPresetPrismaClient = defaultPrisma): DatasetPresetStore {
  return {
    async listActiveWithVersions(): Promise<DatasetPresetWithVersionsRow[]> {
      return (
        await prisma.datasetPreset.findMany({
          where: { archived_at: null },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: presetWithVersionsSelect,
        })
      ).map(presetWithVersionsRow);
    },

    async getPreset(id: string): Promise<DatasetPresetRow | null> {
      const row = await prisma.datasetPreset.findUnique({ where: { id }, select: presetSelect });
      return row === null ? null : presetRow(row);
    },

    async findPresetByNameKey(nameKey: string): Promise<DatasetPresetRow | null> {
      const row = await prisma.datasetPreset.findUnique({ where: { name_key: nameKey }, select: presetSelect });
      return row === null ? null : presetRow(row);
    },

    async createPreset(data: DatasetPresetCreateData): Promise<DatasetPresetRow> {
      try {
        return presetRow(await prisma.datasetPreset.create({ data, select: presetSelect }));
      } catch (error) {
        return mapped(error, 'name_conflict');
      }
    },

    async deleteEmptyPreset(id: string): Promise<void> {
      await prisma.datasetPreset.deleteMany({ where: { id, versions: { none: {} } } });
    },

    async listVersions(presetId: string): Promise<DatasetPresetVersionRow[]> {
      return (
        await prisma.datasetPresetVersion.findMany({
          where: { preset_id: presetId },
          orderBy: [{ version: 'asc' }, { id: 'asc' }],
          select: versionSelect,
        })
      ).map(versionRow);
    },

    async reserveNextVersion(presetId: string): Promise<number> {
      try {
        return await prisma.$transaction(async transaction => {
          const activeWrite = await transaction.datasetPreset.updateMany({
            where: { id: presetId, archived_at: null },
            data: { next_version: { increment: 1 } },
          });
          if (activeWrite.count === 0) await requireActivePreset(transaction, presetId);
          const updated = await transaction.datasetPreset.findUniqueOrThrow({
            where: { id: presetId },
            select: { next_version: true },
          });
          const latest = await transaction.datasetPresetVersion.aggregate({
            where: { preset_id: presetId },
            _max: { version: true },
          });
          const reserved = Math.max(updated.next_version - 1, (latest._max.version ?? 0) + 1);
          if (!Number.isSafeInteger(reserved) || reserved <= 0) {
            throw new Error('Dataset preset next_version is invalid');
          }
          if (reserved !== updated.next_version - 1) {
            await transaction.datasetPreset.update({
              where: { id: presetId },
              data: { next_version: reserved + 1 },
            });
          }
          return reserved;
        });
      } catch (error) {
        return mapped(error, 'version_conflict');
      }
    },

    async insertReservedVersionIfActive(data: DatasetPresetVersionCreateData): Promise<DatasetPresetVersionRow> {
      try {
        return await prisma.$transaction(async transaction => {
          const activeWrite = await transaction.datasetPreset.updateMany({
            where: { id: data.preset_id, archived_at: null },
            data: { next_version: { increment: 0 } },
          });
          if (activeWrite.count === 0) await requireActivePreset(transaction, data.preset_id);
          return versionRow(await transaction.datasetPresetVersion.create({ data, select: versionSelect }));
        });
      } catch (error) {
        return mapped(error, 'version_conflict');
      }
    },

    async updateName(id: string, name: string, nameKey: string): Promise<DatasetPresetRow> {
      try {
        return presetRow(
          await prisma.datasetPreset.update({
            where: { id },
            data: { name, name_key: nameKey },
            select: presetSelect,
          }),
        );
      } catch (error) {
        return mapped(error, 'name_conflict');
      }
    },

    async setArchived(id: string, archivedAt: Date | null): Promise<DatasetPresetRow> {
      try {
        return presetRow(
          await prisma.datasetPreset.update({
            where: { id },
            data: { archived_at: archivedAt },
            select: presetSelect,
          }),
        );
      } catch (error) {
        return mapped(error, 'name_conflict');
      }
    },

    async getVersion(id: string): Promise<DatasetPresetVersionRow | null> {
      const row = await prisma.datasetPresetVersion.findUnique({ where: { id }, select: versionSelect });
      return row === null ? null : versionRow(row);
    },

    async countVersionUsages(id: string): Promise<number> {
      return prisma.jobDatasetPresetUsage.count({ where: { preset_version_id: id } });
    },

    async countVersions(presetId: string): Promise<number> {
      return prisma.datasetPresetVersion.count({ where: { preset_id: presetId } });
    },

    async deleteVersionIfNotLast(id: string, presetId: string): Promise<void> {
      try {
        await prisma.$transaction(async transaction => {
          await transaction.datasetPreset.update({
            where: { id: presetId },
            data: { next_version: { increment: 0 } },
            select: { id: true },
          });
          const versionCount = await transaction.datasetPresetVersion.count({ where: { preset_id: presetId } });
          if (versionCount <= 1) throw new DatasetPresetStoreError('last_version');
          await transaction.datasetPresetVersion.delete({ where: { id }, select: { id: true } });
        });
      } catch (error) {
        return mapped(error, 'version_conflict');
      }
    },
  };
}
