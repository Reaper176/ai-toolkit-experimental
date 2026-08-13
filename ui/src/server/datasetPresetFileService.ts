import { join, resolve, sep } from 'node:path';
import { lstat, readFile, realpath } from 'node:fs/promises';

export async function readFrozenPresetMask(dataRoot: string, manifestPath: string, requestedPath: string): Promise<Buffer> {
  if (!/^[^/\\]+\/v\d+\/manifest\.json$/.test(manifestPath)) throw new Error('Invalid manifest path');
  if (!/^masks\/[^/\\]+\.png$/i.test(requestedPath)) throw new Error('Invalid frozen mask path');
  const versionRoot = resolve(dataRoot, 'dataset_presets', manifestPath, '..');
  const target = resolve(versionRoot, ...requestedPath.split('/'));
  if (!target.startsWith(`${versionRoot}${sep}`)) throw new Error('Invalid frozen mask path');
  const canonicalRoot = await realpath(versionRoot);
  const canonicalParent = await realpath(resolve(target, '..'));
  if (!canonicalParent.startsWith(`${canonicalRoot}${sep}`)) throw new Error('Frozen mask escaped version');
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid frozen mask file');
  return readFile(target);
}
