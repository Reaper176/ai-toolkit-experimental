import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFrozenPresetMask } from '../src/server/datasetPresetFileService';

async function run() {
  const root = await mkdtemp(join(tmpdir(), 'preset-mask-file-'));
  const version = join(root, 'dataset_presets', 'preset', 'v1'); await mkdir(join(version, 'masks'), { recursive: true });
  await writeFile(join(version, 'masks', 'a.png'), Buffer.from('png'));
  assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/a.png')).toString(), 'png');
  await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', '../secret.png'), /invalid/i);
  await symlink(join(version, 'masks', 'a.png'), join(version, 'masks', 'link.png'));
  await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/link.png'), /invalid/i);
  console.log('dataset preset frozen mask file tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
