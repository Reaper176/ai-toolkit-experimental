'use client';

import React, { type ChangeEvent } from 'react';
import type { JobConfig } from '../types';
import {
  SNAPSHOT_SCHEMA_VERSION,
  applyTrainingPreset,
  normalizePresetName,
  type TrainingPresetRecord,
  validateTrainingPresetSnapshot,
} from '../helpers/trainingPresets';

const PRESET_PREFIX = 'preset:';

export const PRESET_ACTION_SAVE = 'action:save';
export const PRESET_ACTION_UPDATE = 'action:update';
export const PRESET_ACTION_DELETE = 'action:delete';
export const PRESET_ACTION_UNDO = 'action:undo';

export type TrainingPresetSelection =
  | { type: 'preset'; id: string }
  | { type: 'save' }
  | { type: 'update' }
  | { type: 'delete' }
  | { type: 'undo' }
  | { type: 'none' };

export function presetValue(id: string): string {
  return `${PRESET_PREFIX}${id}`;
}

export function parseTrainingPresetSelection(value: string): TrainingPresetSelection {
  if (value.startsWith(PRESET_PREFIX) && value.length > PRESET_PREFIX.length) {
    return { type: 'preset', id: value.slice(PRESET_PREFIX.length) };
  }
  switch (value) {
    case PRESET_ACTION_SAVE:
      return { type: 'save' };
    case PRESET_ACTION_UPDATE:
      return { type: 'update' };
    case PRESET_ACTION_DELETE:
      return { type: 'delete' };
    case PRESET_ACTION_UNDO:
      return { type: 'undo' };
    default:
      return { type: 'none' };
  }
}

export function handleTrainingPresetSelection(
  target: { value: string },
  resetValue: string,
  onSelect: (selection: TrainingPresetSelection) => void,
): void {
  const selection = parseTrainingPresetSelection(target.value);
  target.value = resetValue;
  onSelect(selection);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortTrainingPresetRecords(presets: readonly TrainingPresetRecord[]): TrainingPresetRecord[] {
  return [...presets].sort((left, right) => {
    const folded = compareText(left.name.toLowerCase(), right.name.toLowerCase());
    return folded || compareText(left.name, right.name) || compareText(left.id, right.id);
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function validateTrainingPresetRecord(value: unknown): TrainingPresetRecord {
  if (!isPlainObject(value)) throw new Error('Training preset record must be an object');
  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('Training preset record id must be a nonblank string');
  }
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('Training preset record name must be a nonblank string');
  }
  if (value.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Training preset record schema_version must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  if (typeof value.created_at !== 'string' || typeof value.updated_at !== 'string') {
    throw new Error('Training preset record timestamps must be strings');
  }
  return {
    id: value.id,
    name: value.name,
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    snapshot: validateTrainingPresetSnapshot(value.snapshot),
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

export function validateTrainingPresetListResponse(response: unknown): TrainingPresetRecord[] {
  if (!isPlainObject(response) || !Array.isArray(response.presets)) {
    throw new Error('Training preset response must contain a presets array');
  }
  return sortTrainingPresetRecords(response.presets.map(validateTrainingPresetRecord));
}

export function reconcileSelectedPresetId(
  selectedPresetId: string | null,
  presets: readonly TrainingPresetRecord[],
): string | null {
  return selectedPresetId !== null && presets.some(preset => preset.id === selectedPresetId) ? selectedPresetId : null;
}

function copyJobConfig(jobConfig: JobConfig): JobConfig {
  try {
    return JSON.parse(JSON.stringify(jobConfig)) as JobConfig;
  } catch {
    throw new Error('Job config must be JSON serializable');
  }
}

export function preparePresetApplication(
  currentJobConfig: JobConfig,
  snapshot: unknown,
  migrateJobConfig: (jobConfig: JobConfig) => JobConfig,
): { jobConfig: JobConfig; undoConfig: JobConfig } {
  const jobConfig = applyTrainingPreset(currentJobConfig, snapshot, migrateJobConfig);
  return { jobConfig, undoConfig: copyJobConfig(currentJobConfig) };
}

export function restorePresetUndo(undoConfig: JobConfig, onJobConfigChange: (jobConfig: JobConfig) => void): null {
  onJobConfigChange(copyJobConfig(undoConfig));
  return null;
}

export function extractTrainingPresetApiError(error: unknown, fallback: string): string {
  if (!isPlainObject(error)) return fallback;
  const response = error.response;
  if (!isPlainObject(response) || !isPlainObject(response.data)) return fallback;
  const message = response.data.error;
  return typeof message === 'string' && message.trim() !== '' ? message.trim() : fallback;
}

export interface TrainingPresetApi {
  post(url: string, body: unknown): Promise<{ data: unknown }>;
  put(url: string, body: unknown): Promise<{ data: unknown }>;
  delete(url: string): Promise<{ data: unknown }>;
}

export async function createTrainingPreset(
  api: TrainingPresetApi,
  nameInput: unknown,
  jobConfig: JobConfig,
): Promise<TrainingPresetRecord> {
  const { name } = normalizePresetName(nameInput);
  const response = await api.post('/api/training-presets', { name, job_config: jobConfig });
  return validateTrainingPresetRecord(response.data);
}

export async function updateTrainingPreset(
  api: TrainingPresetApi,
  presetId: string,
  jobConfig: JobConfig,
): Promise<TrainingPresetRecord> {
  const response = await api.put(`/api/training-presets/${encodeURIComponent(presetId)}`, {
    job_config: jobConfig,
  });
  return validateTrainingPresetRecord(response.data);
}

export async function deleteTrainingPreset(api: TrainingPresetApi, presetId: string): Promise<void> {
  await api.delete(`/api/training-presets/${encodeURIComponent(presetId)}`);
}

export interface TrainingPresetSelectProps {
  presets: readonly Pick<TrainingPresetRecord, 'id' | 'name'>[];
  selectedPresetId: string | null;
  canUndo: boolean;
  disabled: boolean;
  onSelect: (selection: TrainingPresetSelection) => void;
}

export function TrainingPresetSelect({
  presets,
  selectedPresetId,
  canUndo,
  disabled,
  onSelect,
}: TrainingPresetSelectProps) {
  const sortedPresets = [...presets].sort((left, right) => {
    const folded = compareText(left.name.toLowerCase(), right.name.toLowerCase());
    return folded || compareText(left.name, right.name) || compareText(left.id, right.id);
  });
  const selectedValue =
    selectedPresetId !== null && sortedPresets.some(preset => preset.id === selectedPresetId)
      ? presetValue(selectedPresetId)
      : '';

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    handleTrainingPresetSelection(event.currentTarget, selectedValue, onSelect);
  };

  return (
    <label>
      <span className="sr-only">Training preset</span>
      <select
        aria-label="Training preset"
        className="w-32 sm:w-48 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
        disabled={disabled}
        value={selectedValue}
        onChange={handleChange}
      >
        <option value="">Preset</option>
        <optgroup label="Saved presets">
          {sortedPresets.map(preset => (
            <option key={preset.id} value={presetValue(preset.id)}>
              {preset.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Actions">
          <option value={PRESET_ACTION_SAVE}>Save preset…</option>
          <option value={PRESET_ACTION_UPDATE} disabled={selectedValue === ''}>
            Update preset…
          </option>
          <option value={PRESET_ACTION_DELETE} disabled={selectedValue === ''}>
            Delete preset…
          </option>
          {canUndo && <option value={PRESET_ACTION_UNDO}>Undo preset</option>}
        </optgroup>
      </select>
    </label>
  );
}

export default TrainingPresetSelect;
