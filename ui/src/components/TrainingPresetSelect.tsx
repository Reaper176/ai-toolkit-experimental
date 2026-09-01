'use client';

import React, { type ChangeEvent } from 'react';
import type { JobConfig } from '../types';
import {
  SNAPSHOT_SCHEMA_VERSION,
  applyTrainingPreset,
  compareTrainingPresetRecords,
  normalizePresetName,
  type BuiltInTrainingPresetRecord,
  type TrainingPresetRecord,
  type UserTrainingPresetRecord,
  validateTrainingPresetSnapshot,
} from '../helpers/trainingPresets';
import {
  compareBuiltInTrainingPresetRecords,
  validateBuiltInTrainingPresetRecord,
} from '../helpers/builtInTrainingPresets';

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

export function sortTrainingPresetRecords(presets: readonly TrainingPresetRecord[]): TrainingPresetRecord[] {
  const builtins = presets
    .filter((preset): preset is BuiltInTrainingPresetRecord => preset.source === 'builtin')
    .sort((left, right) => {
      const fixedOrder = compareBuiltInTrainingPresetRecords(left, right);
      if (left.model_arch !== right.model_arch || left.category !== right.category) return fixedOrder;
      const caseInsensitive = left.name.localeCompare(right.name, 'en', { sensitivity: 'base' });
      const exactName = left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
      const exactId = left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      return caseInsensitive || exactName || exactId;
    });
  const users = presets
    .filter((preset): preset is UserTrainingPresetRecord => preset.source === 'user')
    .sort(compareTrainingPresetRecords);
  return [...builtins, ...users];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const CATALOG_ONLY_RECORD_KEYS = [
  'category',
  'intent_slug',
  'model_arch',
  'catalog_revision',
  'summary',
  'recipe_path',
  'prerequisites',
  'warnings',
  'evidence',
] as const;

function validateUserTrainingPresetRecord(value: unknown): UserTrainingPresetRecord {
  if (!isPlainObject(value)) throw new Error('Training preset record must be an object');
  if (value.source !== 'user') throw new Error('Training preset record source must be user');
  if (value.read_only !== false) throw new Error('Training preset record read_only must be false');
  for (const key of CATALOG_ONLY_RECORD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`Training preset user record must not contain catalog field ${key}`);
    }
  }
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
    source: 'user',
    read_only: false,
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    snapshot: validateTrainingPresetSnapshot(value.snapshot),
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

export type TrainingPresetDroppedRecordReason =
  | 'invalid-user-record'
  | 'invalid-builtin-record'
  | 'invalid-record-source';

export interface TrainingPresetDroppedRecordDiagnostic {
  source: 'user' | 'builtin' | 'unknown';
  index: number;
  reason: TrainingPresetDroppedRecordReason;
}

export type TrainingPresetDroppedRecordCallback = (diagnostic: TrainingPresetDroppedRecordDiagnostic) => void;

function droppedRecordSource(value: unknown): TrainingPresetDroppedRecordDiagnostic['source'] {
  if (value === null || typeof value !== 'object') return 'unknown';
  try {
    const source = Object.getOwnPropertyDescriptor(value, 'source');
    if (source === undefined || !source.enumerable || !('value' in source)) return 'unknown';
    return source.value === 'user' || source.value === 'builtin' ? source.value : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function validateTrainingPresetRecord(value: unknown): TrainingPresetRecord {
  const source = droppedRecordSource(value);
  if (source === 'user') return validateUserTrainingPresetRecord(value);
  if (source === 'builtin') return validateBuiltInTrainingPresetRecord(value);
  throw new Error('Training preset record source must be an own enumerable user or builtin data property');
}

export function validateTrainingPresetListResponse(
  response: unknown,
  onDroppedRecord?: TrainingPresetDroppedRecordCallback,
): TrainingPresetRecord[] {
  if (!isPlainObject(response) || !Array.isArray(response.presets)) {
    throw new Error('Training preset response must contain a presets array');
  }
  const validated: TrainingPresetRecord[] = [];
  response.presets.forEach((value, index) => {
    try {
      validated.push(validateTrainingPresetRecord(value));
    } catch {
      const source = droppedRecordSource(value);
      const reason =
        source === 'user'
          ? 'invalid-user-record'
          : source === 'builtin'
            ? 'invalid-builtin-record'
            : 'invalid-record-source';
      try {
        onDroppedRecord?.({ source, index, reason });
      } catch {
        // Diagnostics must not make one malformed record poison the usable list.
      }
    }
  });
  return sortTrainingPresetRecords(validated);
}

export function reconcileSelectedPresetId(
  selectedPresetId: string | null,
  presets: readonly TrainingPresetRecord[],
  currentModelArch?: string,
): string | null {
  if (selectedPresetId === null) return null;
  const selected = presets.find(preset => preset.id === selectedPresetId);
  if (selected === undefined) return null;
  return selected.source === 'builtin' && selected.model_arch !== currentModelArch ? null : selectedPresetId;
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
  get(url: string, options: TrainingPresetRequestOptions): Promise<{ data: unknown }>;
  post(url: string, body: unknown, options: TrainingPresetRequestOptions): Promise<{ data: unknown }>;
  put(url: string, body: unknown, options: TrainingPresetRequestOptions): Promise<{ data: unknown }>;
  delete(url: string, options: TrainingPresetRequestOptions): Promise<{ data: unknown }>;
}

export const TRAINING_PRESET_REQUEST_TIMEOUT_MS = 30_000;

export interface TrainingPresetRequestOptions {
  signal: AbortSignal;
  timeout: number;
}

function requestOptions(signal?: AbortSignal): TrainingPresetRequestOptions {
  return {
    signal: signal ?? new AbortController().signal,
    timeout: TRAINING_PRESET_REQUEST_TIMEOUT_MS,
  };
}

export function isTrainingPresetCancellation(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (!isPlainObject(error)) return false;
  return error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.name === 'AbortError';
}

export async function createTrainingPreset(
  api: Pick<TrainingPresetApi, 'post'>,
  nameInput: unknown,
  jobConfig: JobConfig,
  signal?: AbortSignal,
): Promise<UserTrainingPresetRecord> {
  const { name } = normalizePresetName(nameInput);
  const response = await api.post('/api/training-presets', { name, job_config: jobConfig }, requestOptions(signal));
  return validateUserTrainingPresetRecord(response.data);
}

export async function updateTrainingPreset(
  api: Pick<TrainingPresetApi, 'put'>,
  presetId: string,
  jobConfig: JobConfig,
  signal?: AbortSignal,
): Promise<UserTrainingPresetRecord> {
  const response = await api.put(
    `/api/training-presets/${encodeURIComponent(presetId)}`,
    { job_config: jobConfig },
    requestOptions(signal),
  );
  return validateUserTrainingPresetRecord(response.data);
}

export async function deleteTrainingPreset(
  api: Pick<TrainingPresetApi, 'delete'>,
  presetId: string,
  signal?: AbortSignal,
): Promise<void> {
  await api.delete(`/api/training-presets/${encodeURIComponent(presetId)}`, requestOptions(signal));
}

export interface TrainingPresetActionLock {
  active: boolean;
}

export function createTrainingPresetActionLock(): TrainingPresetActionLock {
  return { active: false };
}

export interface TrainingPresetControllerState {
  presets: readonly TrainingPresetRecord[];
  selectedPresetId: string | null;
  jobConfig: JobConfig;
  undoConfig: JobConfig | null;
}

export type TrainingPresetNextState = Omit<TrainingPresetControllerState, 'presets'> & {
  presets: TrainingPresetRecord[];
};

export type TrainingPresetMutationResult =
  | {
      status: 'refreshed';
      state: TrainingPresetNextState;
    }
  | {
      status: 'reconciliation-failed';
      state: TrainingPresetNextState;
      error: string;
      retryable: true;
    }
  | {
      status: 'refresh-failed';
      state: TrainingPresetNextState;
      error: string;
      retryable: true;
    }
  | { status: 'busy' }
  | { status: 'cancelled' };

export interface TrainingPresetMutationCallbacks {
  onState: (state: TrainingPresetNextState) => void;
  onSuccess: () => void;
  onListError: (error: string, retryable: true) => void;
}

export function commitTrainingPresetMutationResult(
  result: TrainingPresetMutationResult,
  callbacks: TrainingPresetMutationCallbacks,
): boolean {
  if (result.status === 'busy' || result.status === 'cancelled') return false;
  callbacks.onState(result.state);
  if (result.status === 'refreshed') callbacks.onSuccess();
  else callbacks.onListError(result.error, result.retryable);
  return true;
}

async function requestTrainingPresetCollection(
  api: Pick<TrainingPresetApi, 'get'>,
  signal: AbortSignal,
): Promise<TrainingPresetRecord[]> {
  const response = await api.get('/api/training-presets', requestOptions(signal));
  return validateTrainingPresetListResponse(response.data);
}

async function runTrainingPresetMutation(
  api: Pick<TrainingPresetApi, 'get'>,
  lock: TrainingPresetActionLock,
  signal: AbortSignal,
  currentState: TrainingPresetControllerState,
  mutate: () => Promise<UserTrainingPresetRecord | null>,
  fallback: (record: UserTrainingPresetRecord | null) => TrainingPresetRecord[],
  selectAfterRefresh: (presets: TrainingPresetRecord[], record: UserTrainingPresetRecord | null) => string | null,
  missingSelectionMessage?: string,
): Promise<TrainingPresetMutationResult> {
  if (lock.active) return { status: 'busy' };
  lock.active = true;
  try {
    if (signal.aborted) return { status: 'cancelled' };
    const record = await mutate();
    if (signal.aborted) return { status: 'cancelled' };
    try {
      const presets = await requestTrainingPresetCollection(api, signal);
      if (signal.aborted) return { status: 'cancelled' };
      const selectedPresetId = selectAfterRefresh(presets, record);
      const state = { ...currentState, presets, selectedPresetId };
      if (record !== null && selectedPresetId === null && missingSelectionMessage) {
        return { status: 'reconciliation-failed', state, error: missingSelectionMessage, retryable: true };
      }
      return { status: 'refreshed', state };
    } catch (refreshError) {
      if (isTrainingPresetCancellation(refreshError, signal)) return { status: 'cancelled' };
      const presets = sortTrainingPresetRecords(fallback(record));
      return {
        status: 'refresh-failed',
        state: { ...currentState, presets, selectedPresetId: record?.id ?? null },
        error: extractTrainingPresetApiError(refreshError, 'Unable to refresh training presets.'),
        retryable: true,
      };
    }
  } catch (mutationError) {
    if (isTrainingPresetCancellation(mutationError, signal)) return { status: 'cancelled' };
    throw mutationError;
  } finally {
    lock.active = false;
  }
}

export function createTrainingPresetAndRefresh(
  api: Pick<TrainingPresetApi, 'post' | 'get'>,
  lock: TrainingPresetActionLock,
  name: string,
  currentState: TrainingPresetControllerState,
  signal: AbortSignal,
): Promise<TrainingPresetMutationResult> {
  return runTrainingPresetMutation(
    api,
    lock,
    signal,
    currentState,
    () => createTrainingPreset(api, name, currentState.jobConfig, signal),
    record => [...currentState.presets.filter(preset => preset.id !== record?.id), ...(record ? [record] : [])],
    (presets, record) => (record && presets.some(preset => preset.id === record.id) ? record.id : null),
    'Created training preset was not present in the refreshed list.',
  );
}

export function updateTrainingPresetAndRefresh(
  api: Pick<TrainingPresetApi, 'put' | 'get'>,
  lock: TrainingPresetActionLock,
  presetId: string,
  currentState: TrainingPresetControllerState,
  signal: AbortSignal,
): Promise<TrainingPresetMutationResult> {
  if (currentState.presets.some(preset => preset.id === presetId && preset.source === 'builtin')) {
    return Promise.reject(new Error('Built-in training presets are read-only.'));
  }
  return runTrainingPresetMutation(
    api,
    lock,
    signal,
    currentState,
    () => updateTrainingPreset(api, presetId, currentState.jobConfig, signal),
    record => [
      ...currentState.presets.filter(preset => preset.id !== presetId && preset.id !== record?.id),
      ...(record ? [record] : []),
    ],
    (presets, record) => (record && presets.some(preset => preset.id === record.id) ? record.id : null),
    'Updated training preset was not present in the refreshed list.',
  );
}

export async function deleteTrainingPresetAndRefresh(
  api: Pick<TrainingPresetApi, 'delete' | 'get'>,
  lock: TrainingPresetActionLock,
  presetId: string,
  currentState: TrainingPresetControllerState,
  signal: AbortSignal = new AbortController().signal,
): Promise<TrainingPresetMutationResult> {
  if (currentState.presets.some(preset => preset.id === presetId && preset.source === 'builtin')) {
    return Promise.reject(new Error('Built-in training presets are read-only.'));
  }
  return runTrainingPresetMutation(
    api,
    lock,
    signal,
    currentState,
    async () => {
      await deleteTrainingPreset(api, presetId, signal);
      return null;
    },
    () => currentState.presets.filter(preset => preset.id !== presetId),
    presets =>
      currentState.selectedPresetId === presetId
        ? null
        : reconcileSelectedPresetId(currentState.selectedPresetId, presets),
  ).then(result => {
    if (result.status === 'refreshed' && result.state.presets.some(preset => preset.id === presetId)) {
      const presets = result.state.presets.filter(preset => preset.id !== presetId);
      const selectedPresetId = reconcileSelectedPresetId(currentState.selectedPresetId, presets);
      return {
        status: 'reconciliation-failed' as const,
        state: {
          ...result.state,
          presets,
          selectedPresetId,
        },
        error: 'Deleted training preset remained in the refreshed list.',
        retryable: true as const,
      };
    }
    if (result.status !== 'refresh-failed') return result;
    return {
      ...result,
      state: {
        ...result.state,
        selectedPresetId:
          currentState.selectedPresetId === presetId
            ? null
            : reconcileSelectedPresetId(currentState.selectedPresetId, result.state.presets),
      },
      error:
        result.error === 'Unable to refresh training presets.'
          ? 'Unable to refresh training presets after deletion.'
          : result.error,
    };
  });
}

export interface TrainingPresetSelectProps {
  presets: readonly TrainingPresetRecord[];
  selectedPresetId: string | null;
  currentModelArch: string;
  canUndo: boolean;
  disabled: boolean;
  onSelect: (selection: TrainingPresetSelection) => void;
}

export function TrainingPresetSelect({
  presets,
  selectedPresetId,
  currentModelArch,
  canUndo,
  disabled,
  onSelect,
}: TrainingPresetSelectProps) {
  const compatibleBuiltins = presets.filter(
    (preset): preset is BuiltInTrainingPresetRecord =>
      preset.source === 'builtin' && preset.model_arch === currentModelArch,
  );
  const userPresets = presets.filter((preset): preset is UserTrainingPresetRecord => preset.source === 'user');
  const selectedPreset = selectedPresetId === null ? undefined : presets.find(preset => preset.id === selectedPresetId);
  const selectedIsCompatible =
    selectedPreset?.source === 'user' ||
    (selectedPreset?.source === 'builtin' && selectedPreset.model_arch === currentModelArch);
  const selectedValue = selectedPresetId !== null && selectedIsCompatible ? presetValue(selectedPresetId) : '';
  const selectedIsBuiltin = selectedPreset?.source === 'builtin';

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
        <optgroup label="Built-in recipes">
          {compatibleBuiltins.map(preset => (
            <option key={preset.id} value={presetValue(preset.id)}>
              {preset.name} — {preset.intent_slug} ({preset.model_arch})
            </option>
          ))}
        </optgroup>
        <optgroup label="My presets">
          {userPresets.map(preset => (
            <option key={preset.id} value={presetValue(preset.id)}>
              {preset.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Actions">
          <option value={PRESET_ACTION_SAVE}>Save preset…</option>
          <option value={PRESET_ACTION_UPDATE} disabled={selectedValue === '' || selectedIsBuiltin}>
            Update preset…
          </option>
          <option value={PRESET_ACTION_DELETE} disabled={selectedValue === '' || selectedIsBuiltin}>
            Delete preset…
          </option>
          {canUndo && <option value={PRESET_ACTION_UNDO}>Undo preset</option>}
        </optgroup>
      </select>
    </label>
  );
}

export default TrainingPresetSelect;
