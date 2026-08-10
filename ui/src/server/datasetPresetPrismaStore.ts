import defaultPrisma from './prisma';
import {
  DatasetPresetStoreError,
  type DatasetPresetCreateData,
  type DatasetPresetRow,
  type DatasetPresetStore,
  type DatasetPresetStoreErrorCode,
  type DatasetPresetVersionCreateData,
  type DatasetPresetVersionRow,
} from './datasetPresetService';

interface PrismaModel {
  findMany(args: any): Promise<any>;
  findUnique(args: any): Promise<any>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  deleteMany?(args: any): Promise<any>;
  count?(args: any): Promise<number>;
}

export interface DatasetPresetPrismaClient {
  datasetPreset: PrismaModel;
  datasetPresetVersion: PrismaModel;
  jobDatasetPresetUsage: PrismaModel;
}

const presetSelect = {
  id: true,
  name: true,
  name_key: true,
  archived_at: true,
  created_at: true,
  updated_at: true,
} as const;

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
} as const;

function prismaCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : undefined;
}

function mapped(
  error: unknown,
  conflict: Extract<DatasetPresetStoreErrorCode, 'name_conflict' | 'version_conflict'>,
): never {
  const code = prismaCode(error);
  if (code === 'P2002') throw new DatasetPresetStoreError(conflict, error);
  if (code === 'P2025') throw new DatasetPresetStoreError('not_found', error);
  if (code === 'P2003') throw new DatasetPresetStoreError('referenced', error);
  throw error;
}

function presetRow(value: unknown): DatasetPresetRow {
  return value as DatasetPresetRow;
}

function versionRow(value: unknown): DatasetPresetVersionRow {
  return value as DatasetPresetVersionRow;
}

export function createDatasetPresetPrismaStore(
  prisma: DatasetPresetPrismaClient = defaultPrisma as unknown as DatasetPresetPrismaClient,
): DatasetPresetStore {
  return {
    async listActive(): Promise<DatasetPresetRow[]> {
      return (
        (await prisma.datasetPreset.findMany({
          where: { archived_at: null },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: presetSelect,
        })) as unknown[]
      ).map(presetRow);
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
      if (!prisma.datasetPreset.deleteMany) throw new Error('Prisma datasetPreset.deleteMany is unavailable');
      await prisma.datasetPreset.deleteMany({ where: { id, versions: { none: {} } } });
    },

    async listVersions(presetId: string): Promise<DatasetPresetVersionRow[]> {
      return (
        (await prisma.datasetPresetVersion.findMany({
          where: { preset_id: presetId },
          orderBy: [{ version: 'asc' }, { id: 'asc' }],
          select: versionSelect,
        })) as unknown[]
      ).map(versionRow);
    },

    async getLatestVersion(presetId: string): Promise<DatasetPresetVersionRow | null> {
      const rows = (await prisma.datasetPresetVersion.findMany({
        where: { preset_id: presetId },
        orderBy: [{ version: 'desc' }, { id: 'asc' }],
        take: 1,
        select: versionSelect,
      })) as unknown[];
      return rows.length === 0 ? null : versionRow(rows[0]);
    },

    async insertVersion(data: DatasetPresetVersionCreateData): Promise<DatasetPresetVersionRow> {
      try {
        return versionRow(await prisma.datasetPresetVersion.create({ data, select: versionSelect }));
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
      if (!prisma.jobDatasetPresetUsage.count) throw new Error('Prisma jobDatasetPresetUsage.count is unavailable');
      return prisma.jobDatasetPresetUsage.count({ where: { preset_version_id: id } });
    },

    async deleteVersion(id: string): Promise<void> {
      try {
        await prisma.datasetPresetVersion.delete({ where: { id }, select: { id: true } });
      } catch (error) {
        return mapped(error, 'version_conflict');
      }
    },
  };
}
