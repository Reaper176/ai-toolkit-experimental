import {
  BUILT_IN_PRESET_ROWS,
  materializeBuiltInTrainingPresetRow,
  type BuiltInTrainingPresetRow,
} from '../helpers/builtInTrainingPresetDefinitions';
import { copyBuiltInPreset, deepFreezePreset } from '../helpers/builtInTrainingPresets';
import type { BuiltInTrainingPresetRecord } from '../helpers/trainingPresets';
import { trainingPresetCatalogIdLogDigest } from './trainingPresetCatalogDigest';

export type TrainingPresetCatalogEntryEvent = {
  code: 'BUILTIN_PRESET_INVALID' | 'BUILTIN_PRESET_ID_COLLISION';
  id_digest: string;
};

export type TrainingPresetCatalogProviderEvent = {
  code: 'BUILTIN_PRESET_PROVIDER_FAILED';
};

type RawCatalogIdentity = {
  id: string | undefined;
  digestInput: string;
};

function rawCatalogIdentity(row: unknown, index: number): RawCatalogIdentity {
  try {
    if (row !== null && typeof row === 'object') {
      const descriptor = Object.getOwnPropertyDescriptor(row, 'id');
      if (descriptor !== undefined && 'value' in descriptor && typeof descriptor.value === 'string') {
        return { id: descriptor.value, digestInput: descriptor.value };
      }
    }
  } catch {
    // A hostile row is handled like any other entry without exposing its details.
  }
  return { id: undefined, digestInput: `invalid-entry:${index}` };
}

export function loadBuiltInTrainingPresetCatalog(
  rows: readonly unknown[],
  logger: (event: TrainingPresetCatalogEntryEvent) => void,
): BuiltInTrainingPresetRecord[] {
  const identities = Array.from(
    { length: rows.length },
    (_, index) => rawCatalogIdentity(rows[index], index),
  );
  const counts = new Map<string, number>();
  for (const identity of identities) {
    if (identity.id !== undefined) counts.set(identity.id, (counts.get(identity.id) ?? 0) + 1);
  }

  const accepted: BuiltInTrainingPresetRecord[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const identity = identities[index];
    const idDigest = trainingPresetCatalogIdLogDigest(identity.digestInput);
    if (identity.id !== undefined && (counts.get(identity.id) ?? 0) > 1) {
      logger({ code: 'BUILTIN_PRESET_ID_COLLISION', id_digest: idDigest });
      continue;
    }

    try {
      const preset = materializeBuiltInTrainingPresetRow(rows[index] as BuiltInTrainingPresetRow);
      accepted.push(deepFreezePreset(preset));
    } catch {
      logger({ code: 'BUILTIN_PRESET_INVALID', id_digest: idDigest });
    }
  }

  Object.freeze(accepted);
  return accepted.map(preset => copyBuiltInPreset(preset));
}

export function getBuiltInTrainingPresetCatalog(
  logger: (event: TrainingPresetCatalogEntryEvent) => void,
): BuiltInTrainingPresetRecord[] {
  return loadBuiltInTrainingPresetCatalog(BUILT_IN_PRESET_ROWS, logger);
}
