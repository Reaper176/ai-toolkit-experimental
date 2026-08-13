import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFrozenPresetMask } from '../src/server/datasetPresetFileService';
import { buildDatasetPresetManifest, manifestSha256 } from '../src/helpers/datasetPresets';
import { DEFAULT_DATASET_PRESET_LOADER_CONFIG } from '../src/components/DatasetPresetDialog';
import { serveFrozenVersionFile } from '../src/app/api/dataset-preset-versions/[versionId]/files/route';

async function run() {
  const root = await mkdtemp(join(tmpdir(), 'preset-mask-file-'));
  try {
    const version = join(root, 'dataset_presets', 'preset', 'v1'); await mkdir(join(version, 'masks'), { recursive: true });
    await mkdir(join(version, 'media'), { recursive: true });
    const sha = (value: string) => createHash('sha256').update(value).digest('hex');
    const manifest = buildDatasetPresetManifest({ preset_id: 'preset', version: 1, preset_name: 'Preset', source_dataset: 'source', created_at: '2026-01-01T00:00:00.000Z', note: null, loader_config: DEFAULT_DATASET_PRESET_LOADER_CONFIG, files: [{ source_path: 'a.png', managed_path: 'media/a.png', media_bytes: 5, media_sha256: sha('media'), caption_ext: 'txt', caption_text: null, caption_bytes: null, caption_sha256: null, caption_missing: true, mask_path: 'masks/a.png', mask_bytes: 3, mask_sha256: sha('png'), mask_missing: false }] });
    await writeFile(join(version, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(join(version, 'masks', 'a.png'), Buffer.from('png'));
    await writeFile(join(version, 'media', 'a.png'), Buffer.from('media'));
    assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/a.png')).toString(), 'png');
    assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/a.png')).toString(), 'media');
    const canonicalSha = manifestSha256(manifest as any);
    assert.equal((await readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/a.png', canonicalSha)).toString(), 'media');
    await writeFile(join(version, 'manifest.json'), JSON.stringify({ ...manifest, files: [{ ...manifest.files[0], media_sha256: sha('other') }] }));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/a.png', canonicalSha), /integrity/i, 'schema-shaped manifest substitution fails DB checksum before serving');
    await writeFile(join(version, 'manifest.json'), JSON.stringify(manifest));
    let passedSha = '';
    const response = await serveFrozenVersionFile(new Request('http://test/files?path=media%2Fa.png'), 'version', {
      findVersion: async () => ({ manifest_path: 'preset/v1/manifest.json', manifest_sha256: canonicalSha }), dataRoot: async () => root,
      read: async (_root, _path, _asset, expected) => { passedSha = expected ?? ''; throw new Error('Snapshot integrity mismatch'); },
    });
    assert.equal(passedSha, canonicalSha); assert.equal(response.status, 409); assert.doesNotMatch(await response.text(), new RegExp(root));
    await writeFile(join(version, 'media', 'undeclared.png'), Buffer.from('bad'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/undeclared.png'), /invalid/i);
    await writeFile(join(version, 'media', 'a.png'), Buffer.from('tampr'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'media/a.png'), /integrity/i, 'same-size media tamper fails SHA');
    await writeFile(join(version, 'masks', 'a.png'), Buffer.from('longer'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/a.png'), /integrity/i, 'mask size tamper fails');
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', '../secret.png'), /invalid/i);
    await symlink(join(version, 'masks', 'a.png'), join(version, 'masks', 'link.png'));
    await assert.rejects(readFrozenPresetMask(root, 'preset/v1/manifest.json', 'masks/link.png'), /invalid/i);
  } finally { await rm(root, { recursive: true, force: true }); }
  console.log('dataset preset frozen mask file tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
