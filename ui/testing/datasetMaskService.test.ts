import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    mkdirSync(join(datasetsRoot, 'spade/sub'), { recursive: true });
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

    const outside = join(ownedRoot, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'escape.png'), grayPng(32, 24, 0));
    symlinkSync(join(outside, 'escape.png'), join(datasetsRoot, 'spade/sub/escape.png'));
    await assert.rejects(masks.read('spade', 'sub/escape.png'), /symlink|escape/i);
    symlinkSync(outside, join(datasetsRoot, 'linked'));
    await assert.rejects(masks.read('linked', 'escape.png'), /symlink|escape/i);
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
