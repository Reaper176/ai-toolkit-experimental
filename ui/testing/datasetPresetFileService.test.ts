import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFrozenPresetMask } from '../src/server/datasetPresetFileService';

async function run() {
  const root = await mkdtemp(join(tmpdir(), 'preset-mask-file-'));
  try {
    const version = join(root, 'dataset_presets', 'preset', 'v1'); await mkdir(join(version, 'masks'), { recursive: true });
    await mkdir(join(version, 'media'), { recursive: true });
    await writeFile(join(version, 'manifest.json'), JSON.stringify({ files: [{ managed_path: 'media/a.png', mask_path: 'masks/a.png', mask_missing: false }] }));
    await writeFile(join(version, 'masks', 'a.png'), Buffer.from('png'));
    await writeFile(join(version, 'media', 'a.png'), Buffer.from('media'));
    assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/a.png')).toString(), 'png');
    assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/a.png')).toString(), 'media');
    await writeFile(join(version, 'media', 'undeclared.png'), Buffer.from('bad'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/undeclared.png'), /invalid/i);
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', '../secret.png'), /invalid/i);
    await symlink(join(version, 'masks', 'a.png'), join(version, 'masks', 'link.png'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/link.png'), /invalid/i);
  } finally { await rm(root, { recursive: true, force: true }); }
  console.log('dataset preset frozen mask file tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
