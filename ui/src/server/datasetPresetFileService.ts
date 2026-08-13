import { join, resolve, sep } from 'node:path';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { manifestSha256 } from '../helpers/datasetPresets';

export async function readFrozenPresetMask(dataRoot: string, manifestPath: string, requestedPath: string, expectedManifestSha256?: string): Promise<Buffer> {
  if (!/^[^/\\]+\/v\d+\/manifest\.json$/.test(manifestPath)) throw new Error('Invalid manifest path');
  const versionRoot = resolve(dataRoot, 'dataset_presets', manifestPath, '..');
  const manifest = JSON.parse(await readFile(resolve(versionRoot, 'manifest.json'), 'utf8')) as any;
  if (expectedManifestSha256 && manifestSha256(manifest) !== expectedManifestSha256) throw new Error('Snapshot integrity mismatch');
  const declared = (manifest.files ?? []).find((file: Record<string, unknown>) => file.managed_path === requestedPath || (file.mask_missing !== true && file.mask_path === requestedPath));
  if (!declared || !/^(?:media\/.+|masks\/[^/\\]+\.png)$/i.test(requestedPath)) throw new Error('Invalid frozen mask path');
  const target = resolve(versionRoot, ...requestedPath.split('/'));
  if (!target.startsWith(`${versionRoot}${sep}`)) throw new Error('Invalid frozen mask path');
  const canonicalRoot = await realpath(versionRoot);
  const canonicalParent = await realpath(resolve(target, '..'));
  if (!canonicalParent.startsWith(`${canonicalRoot}${sep}`)) throw new Error('Frozen mask escaped version');
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid frozen mask file');
  const bytes = await readFile(target);
  const isMask = declared.mask_path === requestedPath;
  const expectedBytes = isMask ? declared.mask_bytes : declared.media_bytes;
  const expectedSha = isMask ? declared.mask_sha256 : declared.media_sha256;
  if (bytes.length !== expectedBytes || typeof expectedSha !== 'string' || createHash('sha256').update(bytes).digest('hex') !== expectedSha) throw new Error('Snapshot integrity mismatch');
  return bytes;
}
