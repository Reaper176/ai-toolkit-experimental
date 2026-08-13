import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import {
  assertUniqueMaskBasenames,
  assertDatasetMaskSourceUnambiguous,
  createDatasetMaskService,
  DatasetMaskError,
  maskDatasetName,
  maskFilename,
} from '../src/server/datasetMaskService';

function grayPng(width: number, height: number, value: number): Buffer {
  const image = new PNG({ width, height, colorType: 0 });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  return PNG.sync.write(image, { colorType: 0 });
}

function growingGrayPng(): { png: Buffer; normalizedBytes: number } {
  const image = new PNG({ width: 64, height: 64, colorType: 6 });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const value = (((offset / 4) * 10 * 13) ^ (offset * 7 + 10)) & 255;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  const png = PNG.sync.write(image, { colorType: 6, filterType: 2, deflateLevel: 6 });
  const normalized = PNG.sync.write(PNG.sync.read(png), { colorType: 0 });
  assert.ok(normalized.length > png.length, 'fixture must grow during grayscale normalization');
  return { png, normalizedBytes: normalized.length };
}

function hugeIhdrPng(): Buffer {
  const png = grayPng(1, 1, 0);
  const crafted = Buffer.from(png);
  crafted.writeUInt32BE(100_000, 16);
  crafted.writeUInt32BE(100_000, 20);
  return crafted;
}

async function main(): Promise<void> {
  const ownedRoot = mkdtempSync(join(tmpdir(), 'aitk-mask-service-test-'));
  try {
    const datasetsRoot = join(ownedRoot, 'datasets');
    const outside = join(ownedRoot, 'outside');
    mkdirSync(join(datasetsRoot, 'spade/sub'), { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(outside, 'escape.png'), grayPng(32, 24, 0));
    writeFileSync(join(datasetsRoot, 'spade/sub/portrait.jpg'), grayPng(32, 24, 20));
    const masks = createDatasetMaskService({ datasetsRoot, maxPngBytes: 16 * 1024 * 1024 });

    assert.equal(maskDatasetName('spade'), 'spade_masks');
    assert.equal(maskFilename('sub/portrait.jpg'), 'portrait.png');
    assert.doesNotThrow(() => assertUniqueMaskBasenames(['a/x.jpg', 'b/y.png']));
    assert.throws(() => assertUniqueMaskBasenames(['a/x.jpg', 'b/x.png']), /duplicate.*basename/i);

    await masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 128));
    const saved = await masks.read('spade', 'sub/portrait.jpg');
    assert.equal(saved.exists, true);
    assert.equal(saved.width, 32);
    assert.equal(saved.height, 24);
    assert.ok(saved.png);
    assert.equal(PNG.sync.read(saved.png!).colorType, 0);

    await masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 255));
    assert.equal((await masks.read('spade', 'sub/portrait.jpg')).exists, false);

    for (const [dataset, source] of [['../spade', 'sub/portrait.jpg'], ['spade', '../portrait.jpg'], ['spade', '/etc/passwd']]) {
      await assert.rejects(masks.read(dataset, source), /path|dataset/i);
      await assert.rejects(masks.save(dataset, source, grayPng(32, 24, 0)), /path|dataset/i);
    }

    await assert.rejects(masks.read('spade', 'missing.png'), /source.*not found/i);
    writeFileSync(join(datasetsRoot, 'spade/sub/nope.gif'), grayPng(4, 4, 0));
    await assert.rejects(masks.read('spade', 'sub/nope.gif'), /unsupported/i);
    await assert.rejects(masks.save('spade', 'sub/portrait.jpg', grayPng(31, 24, 0)), /dimension/i);
    await assert.rejects(masks.save('spade', 'sub/portrait.jpg', Buffer.from('not png')), /invalid.*png/i);
    const tinyLimit = createDatasetMaskService({ datasetsRoot, maxPngBytes: 8 });
    await assert.rejects(tinyLimit.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 0)), /large|bytes/i);
    mkdirSync(join(datasetsRoot, 'spade_masks'), { recursive: true });
    writeFileSync(join(datasetsRoot, 'spade_masks/portrait.png'), grayPng(32, 24, 0));
    await assert.rejects(tinyLimit.read('spade', 'sub/portrait.jpg'), /large|bytes/i);
    rmSync(join(datasetsRoot, 'spade_masks/portrait.png'));

    const sourceRaceOutside = join(outside, 'source-race.png');
    writeFileSync(sourceRaceOutside, grayPng(32, 24, 99));
    let sourceRaceTriggered = false;
    const sourceRace = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      beforeSourceFileOpen: () => {
        if (sourceRaceTriggered) return;
        sourceRaceTriggered = true;
        renameSync(join(datasetsRoot, 'spade/sub/portrait.jpg'), join(datasetsRoot, 'spade/sub/original.jpg'));
        symlinkSync(sourceRaceOutside, join(datasetsRoot, 'spade/sub/portrait.jpg'));
      },
    });
    await assert.rejects(sourceRace.read('spade', 'sub/portrait.jpg'), /symlink|open/i);
    rmSync(join(datasetsRoot, 'spade/sub/portrait.jpg'));
    renameSync(join(datasetsRoot, 'spade/sub/original.jpg'), join(datasetsRoot, 'spade/sub/portrait.jpg'));

    await masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 70));
    let maskRaceTriggered = false;
    const maskRace = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      beforeMaskFileOpen: () => {
        if (maskRaceTriggered) return;
        maskRaceTriggered = true;
        rmSync(join(datasetsRoot, 'spade_masks/portrait.png'));
        symlinkSync(join(outside, 'escape.png'), join(datasetsRoot, 'spade_masks/portrait.png'));
      },
    });
    await assert.rejects(maskRace.read('spade', 'sub/portrait.jpg'), /symlink|open/i);
    rmSync(join(datasetsRoot, 'spade_masks/portrait.png'));

    let directoryRaceTriggered = false;
    const directoryRace = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      beforeTemporaryOpen: () => {
        if (directoryRaceTriggered) return;
        directoryRaceTriggered = true;
        renameSync(join(datasetsRoot, 'spade_masks'), join(datasetsRoot, 'spade_masks-held'));
        symlinkSync(outside, join(datasetsRoot, 'spade_masks'));
      },
    });
    await directoryRace.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 71));
    assert.equal(existsSync(join(outside, 'portrait.png')), false);
    assert.equal(existsSync(join(datasetsRoot, 'spade_masks-held/portrait.png')), true);
    rmSync(join(datasetsRoot, 'spade_masks'));
    renameSync(join(datasetsRoot, 'spade_masks-held'), join(datasetsRoot, 'spade_masks'));

    rmSync(join(datasetsRoot, 'spade_masks'), { recursive: true });
    const concurrentA = createDatasetMaskService({ datasetsRoot, maxPngBytes: 16 * 1024 * 1024 });
    const concurrentB = createDatasetMaskService({ datasetsRoot, maxPngBytes: 16 * 1024 * 1024 });
    await Promise.all([
      concurrentA.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 80)),
      concurrentB.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 81)),
    ]);
    assert.equal((await masks.read('spade', 'sub/portrait.jpg')).exists, true);
    assert.deepEqual(readdirSync(join(datasetsRoot, 'spade_masks')), ['portrait.png']);
    assert.ok([80, 81].includes(PNG.sync.read(readFileSync(join(datasetsRoot, 'spade_masks/portrait.png'))).data[0]));

    mkdirSync(join(datasetsRoot, 'portable/sub'), { recursive: true });
    writeFileSync(join(datasetsRoot, 'portable/sub/portrait.png'), grayPng(32, 24, 20));
    const portable = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      filesystemStrategy: 'portable',
    });
    await portable.save('portable', 'sub/portrait.png', grayPng(32, 24, 90));
    assert.equal((await portable.read('portable', 'sub/portrait.png')).exists, true);
    await portable.save('portable', 'sub/portrait.png', grayPng(32, 24, 255));
    assert.equal((await portable.read('portable', 'sub/portrait.png')).exists, false);
    symlinkSync(join(outside, 'escape.png'), join(datasetsRoot, 'portable/sub/linked.png'));
    await assert.rejects(portable.read('portable', 'sub/linked.png'), /symlink|escape|changed/i);
    let portableRaceTriggered = false;
    const portableRace = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      filesystemStrategy: 'portable',
      beforeTemporaryOpen: () => {
        if (portableRaceTriggered) return;
        portableRaceTriggered = true;
        renameSync(join(datasetsRoot, 'portable_masks'), join(datasetsRoot, 'portable_masks-held'));
        symlinkSync(outside, join(datasetsRoot, 'portable_masks'));
      },
    });
    await assert.rejects(portableRace.save('portable', 'sub/portrait.png', grayPng(32, 24, 91)), /symlink|changed|escape/i);
    assert.equal(existsSync(join(outside, 'portrait.png')), false);
    rmSync(join(datasetsRoot, 'portable_masks'));
    renameSync(join(datasetsRoot, 'portable_masks-held'), join(datasetsRoot, 'portable_masks'));

    const growth = growingGrayPng();
    mkdirSync(join(datasetsRoot, 'growth'), { recursive: true });
    writeFileSync(join(datasetsRoot, 'growth/source.png'), grayPng(64, 64, 20));
    assert.ok(growth.png.length < growth.normalizedBytes);
    const growthLimited = createDatasetMaskService({ datasetsRoot, maxPngBytes: growth.normalizedBytes - 1 });
    await assert.rejects(growthLimited.save('growth', 'source.png', growth.png), /encoded.*bytes/i);
    assert.equal(existsSync(join(datasetsRoot, 'growth_masks/source.png')), false);

    let decodeCalls = 0;
    const bombSafe = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 1024 * 1024,
      maxMaskWidth: 4096,
      maxMaskHeight: 4096,
      maxMaskPixels: 16_000_000,
      decodePng: bytes => { decodeCalls += 1; return PNG.sync.read(bytes); },
    });
    await assert.rejects(bombSafe.save('spade', 'sub/portrait.jpg', hugeIhdrPng()), /dimension|pixels/i);
    assert.equal(decodeCalls, 0, 'oversized IHDR must be rejected before decoding');

    mkdirSync(join(datasetsRoot, 'limits'), { recursive: true });
    writeFileSync(join(datasetsRoot, 'limits/large.png'), Buffer.alloc(1025));
    const sourceLimited = createDatasetMaskService({ datasetsRoot, maxPngBytes: 1024, maxSourceBytes: 1024 });
    await assert.rejects(sourceLimited.read('limits', 'large.png'), /source.*bytes/i);
    writeFileSync(join(datasetsRoot, 'limits/wide.png'), grayPng(64, 2, 0));
    const dimensionLimited = createDatasetMaskService({ datasetsRoot, maxPngBytes: 1024, maxSourceWidth: 32 });
    await assert.rejects(dimensionLimited.read('limits', 'wide.png'), /source.*dimension/i);

    for (const filesystemStrategy of ['descriptor', 'portable'] as const) {
      writeFileSync(join(datasetsRoot, 'limits/growing.png'), grayPng(2, 2, 0));
      const sourceGrowth = createDatasetMaskService({
        datasetsRoot,
        filesystemStrategy,
        maxPngBytes: 1024,
        maxSourceBytes: 256,
        afterSourceStat: () => appendFileSync(join(datasetsRoot, 'limits/growing.png'), Buffer.alloc(512)),
      });
      await assert.rejects(sourceGrowth.read('limits', 'growing.png'), error => {
        assert.ok(error instanceof DatasetMaskError);
        assert.equal(error.code, 'SOURCE_BYTES');
        return true;
      });

      writeFileSync(join(datasetsRoot, 'limits/growing.png'), grayPng(2, 2, 0));
      const maskGrowth = createDatasetMaskService({
        datasetsRoot,
        filesystemStrategy,
        maxPngBytes: 256,
        maxSourceBytes: 1024,
        afterMaskStat: () => appendFileSync(join(datasetsRoot, 'limits_masks/growing.png'), Buffer.alloc(512)),
      });
      await createDatasetMaskService({ datasetsRoot, filesystemStrategy, maxPngBytes: 1024 }).save(
        'limits', 'growing.png', grayPng(2, 2, 0),
      );
      await assert.rejects(maskGrowth.read('limits', 'growing.png'), error => {
        assert.ok(error instanceof DatasetMaskError);
        assert.equal(error.code, 'MASK_BYTES');
        return true;
      });
    }

    mkdirSync(join(datasetsRoot, 'walk/a/b/c'), { recursive: true });
    writeFileSync(join(datasetsRoot, 'walk/a/b/c/deep.jpg'), grayPng(1, 1, 0));
    await assert.rejects(
      assertDatasetMaskSourceUnambiguous(datasetsRoot, 'walk', 'a/b/c/deep.jpg', { maxDepth: 2 }),
      /depth|nesting/i,
    );
    for (let index = 0; index < 12; index += 1) writeFileSync(join(datasetsRoot, `walk/nonimage-${index}.txt`), 'x');
    let streamedEntries = 0;
    await assert.rejects(
      assertDatasetMaskSourceUnambiguous(datasetsRoot, 'walk', 'a/b/c/deep.jpg', {
        maxEntries: 10,
        onEntry: () => { streamedEntries += 1; },
      }),
      /entry limit/i,
    );
    assert.equal(streamedEntries, 11, 'streaming traversal stops at maxEntries + 1');
    symlinkSync(outside, join(datasetsRoot, 'walk/linked'));
    await assert.rejects(
      assertDatasetMaskSourceUnambiguous(datasetsRoot, 'walk', 'a/b/c/deep.jpg'),
      /symlink/i,
    );
    rmSync(join(datasetsRoot, 'walk/linked'));
    await assertDatasetMaskSourceUnambiguous(
      datasetsRoot,
      'walk',
      'a/b/c/deep.jpg',
      { filesystemStrategy: 'portable', maxEntries: 100 },
    );
    writeFileSync(join(datasetsRoot, 'walk/duplicate.png'), grayPng(1, 1, 0));
    writeFileSync(join(datasetsRoot, 'walk/a/duplicate.jpg'), grayPng(1, 1, 0));
    await assert.rejects(
      assertDatasetMaskSourceUnambiguous(datasetsRoot, 'walk', 'duplicate.png'),
      /duplicate/i,
    );

    symlinkSync(join(outside, 'escape.png'), join(datasetsRoot, 'spade/sub/escape.png'));
    await assert.rejects(masks.read('spade', 'sub/escape.png'), /symlink|escape/i);
    symlinkSync(outside, join(datasetsRoot, 'linked'));
    await assert.rejects(masks.read('linked', 'escape.png'), /symlink|escape/i);
    rmSync(join(datasetsRoot, 'spade_masks/portrait.png'));
    symlinkSync(join(outside, 'escape.png'), join(datasetsRoot, 'spade_masks/portrait.png'));
    await assert.rejects(masks.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 255)), /symlink|escape/i);
    assert.equal(existsSync(join(outside, 'escape.png')), true);
    rmSync(join(datasetsRoot, 'spade_masks/portrait.png'));

    const failing = createDatasetMaskService({
      datasetsRoot,
      maxPngBytes: 16 * 1024 * 1024,
      rename: async () => { throw new Error('injected rename failure'); },
    });
    await assert.rejects(failing.save('spade', 'sub/portrait.jpg', grayPng(32, 24, 64)), /injected rename failure/);
    const maskDirectory = join(datasetsRoot, 'spade_masks');
    assert.equal(existsSync(join(maskDirectory, 'portrait.png')), false);
    assert.deepEqual(existsSync(maskDirectory) ? readdirSync(maskDirectory) : [], []);

    // Keep the real rename import type-checked as the injectable contract.
    assert.equal(typeof rename, 'function');
  } finally {
    rmSync(ownedRoot, { recursive: true, force: true });
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
