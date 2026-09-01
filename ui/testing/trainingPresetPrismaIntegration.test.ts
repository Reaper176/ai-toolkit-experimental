import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { JobConfig } from '../src/types';
import { getBuiltInTrainingPresetCatalog } from '../src/server/trainingPresetCatalogRuntime';
import {
  TrainingPresetConflictError,
  TrainingPresetNotFoundError,
  createTrainingPresetService,
  type TrainingPresetRow,
  type TrainingPresetStore,
} from '../src/server/trainingPresetService';

const TEMP_PREFIX = 'ai-toolkit-training-preset-db-';

function assertSafe(directory: string): void {
  const realTemp = realpathSync(tmpdir());
  const realDirectory = realpathSync(directory);
  const child = relative(realTemp, realDirectory);
  if (
    realpathSync(dirname(realDirectory)) !== realTemp ||
    child === '' ||
    child === '..' ||
    child.startsWith(`..${sep}`) ||
    isAbsolute(child) ||
    !basename(realDirectory).startsWith(TEMP_PREFIX)
  ) {
    throw new Error(`Refusing unsafe integration test directory: ${realDirectory}`);
  }
}

function jobFixture(model: string): JobConfig {
  return {
    job: 'extension',
    config: {
      process: [
        {
          type: 'diffusion_trainer',
          model: { arch: 'flux', name_or_path: model },
          train: { steps: 10 },
          save: {},
          sample: {},
        },
      ],
    },
  } as unknown as JobConfig;
}

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  let prisma: PrismaClient | undefined;
  try {
    assertSafe(directory);
    const databasePath = join(directory, 'presets.sqlite');
    const client = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
    prisma = client;
    await client.$executeRawUnsafe(`
      CREATE TABLE "TrainingPreset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "name_key" TEXT NOT NULL,
        "preset_config" TEXT NOT NULL,
        "schema_version" INTEGER NOT NULL DEFAULT 1,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      )
    `);
    await client.$executeRawUnsafe('CREATE UNIQUE INDEX "TrainingPreset_name_key_key" ON "TrainingPreset"("name_key")');
    await client.$executeRawUnsafe('CREATE INDEX "TrainingPreset_name_idx" ON "TrainingPreset"("name")');

    const injectedCatalogService = createTrainingPresetService(client.trainingPreset, {
      listBuiltIns: getBuiltInTrainingPresetCatalog,
    });
    assert.equal((await injectedCatalogService.list()).length, 14);
    assert.equal(await client.trainingPreset.count(), 0, 'listing built-ins must not create database rows');

    const service = createTrainingPresetService(client.trainingPreset);
    const created = await service.create('  Portrait  ', jobFixture('first/model'));
    assert.match(created.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(created.name, 'Portrait');
    assert.equal(Number.isNaN(Date.parse(created.created_at)), false);
    assert.deepEqual(
      (await service.list()).map(item => item.id),
      [created.id],
    );

    const updated = await service.update(created.id, jobFixture('second/model'));
    assert.equal((updated.snapshot.config.process[0] as any).model.name_or_path, 'second/model');
    await service.remove(created.id);
    assert.deepEqual(await service.list(), []);

    const raceSeed = await service.create('Race', jobFixture('race/model'));
    const raceStore: TrainingPresetStore = {
      findMany: args => client.trainingPreset.findMany(args),
      findUnique: async args =>
        args.where.name_key === 'race'
          ? null
          : client.trainingPreset.findUnique({ where: args.where as { id: string } }),
      create: args => client.trainingPreset.create(args),
      update: args => client.trainingPreset.update(args),
      delete: args => client.trainingPreset.delete(args),
    };
    await assert.rejects(
      createTrainingPresetService(raceStore).create('RACE', jobFixture('duplicate/model')),
      error => {
        assert(error instanceof TrainingPresetConflictError);
        return true;
      },
    );

    await client.trainingPreset.delete({ where: { id: raceSeed.id } });
    const staleRow: TrainingPresetRow = {
      id: raceSeed.id,
      name: raceSeed.name,
      name_key: 'race',
      preset_config: JSON.stringify(raceSeed.snapshot),
      schema_version: raceSeed.schema_version,
      created_at: new Date(raceSeed.created_at),
      updated_at: new Date(raceSeed.updated_at),
    };
    const staleStore: TrainingPresetStore = {
      findMany: args => client.trainingPreset.findMany(args),
      findUnique: async () => structuredClone(staleRow),
      create: args => client.trainingPreset.create(args),
      update: args => client.trainingPreset.update(args),
      delete: args => client.trainingPreset.delete(args),
    };
    const staleService = createTrainingPresetService(staleStore);
    await assert.rejects(staleService.update(staleRow.id, jobFixture('missing/model')), TrainingPresetNotFoundError);
    await assert.rejects(staleService.remove(staleRow.id), TrainingPresetNotFoundError);

    console.log('Training preset Prisma integration tests passed');
  } finally {
    try {
      await prisma?.$disconnect();
    } finally {
      if (existsSync(directory)) {
        assertSafe(directory);
        rmSync(directory, { recursive: true });
      }
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
