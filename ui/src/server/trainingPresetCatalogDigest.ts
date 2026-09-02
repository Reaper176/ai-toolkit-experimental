import { createHash } from 'node:crypto';

export function trainingPresetCatalogIdDigest(id: string): string {
  return createHash('sha256').update(id, 'utf8').digest('hex');
}

export function trainingPresetCatalogIdLogDigest(id: string): string {
  return trainingPresetCatalogIdDigest(id).slice(0, 12);
}
