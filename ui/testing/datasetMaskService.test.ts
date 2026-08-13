import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import {
  assertUniqueMaskBasenames,
  createDatasetMaskService,
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
