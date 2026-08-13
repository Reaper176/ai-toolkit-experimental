import { join, resolve, sep } from 'node:path';
import { lstat, readFile, realpath } from 'node:fs/promises';

export async function readFrozenPresetMask(dataRoot: string, manifestPath: string, requestedPath: string): Promise<Buffer> {
  if (!/^[^/\\]+\/v\d+\/manifest\.json$/.test(manifestPath)) throw new Error('Invalid manifest path');
  const versionRoot = resolve(dataRoot, 'dataset_presets', manifestPath, '..');
  const manifest = JSON.parse(await readFile(resolve(versionRoot, 'manifest.json'), 'utf8')) as { files?: Array<Record<string, unknown>> };
  const declared = (manifest.files ?? []).some(file => file.managed_path === requestedPath || (file.mask_missing !== true && file.mask_path === requestedPath));
  if (!declared || !/^(?:media\/.+|masks\/[^/\\]+\.png)$/i.test(requestedPath)) throw new Error('Invalid frozen mask path');
  const target = resolve(versionRoot, ...requestedPath.split('/'));
  if (!target.startsWith(`${versionRoot}${sep}`)) throw new Error('Invalid frozen mask path');
  const canonicalRoot = await realpath(versionRoot);
  const canonicalParent = await realpath(resolve(target, '..'));
  if (!canonicalParent.startsWith(`${canonicalRoot}${sep}`)) throw new Error('Frozen mask escaped version');
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid frozen mask file');
  return readFile(target);
}
