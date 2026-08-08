'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { JobConfig } from '../types';
import { normalizePresetName, type TrainingPresetRecord } from '../helpers/trainingPresets';
import { apiClient } from '../utils/api';
import {
  CLOSED_TRAINING_PRESET_DIALOG,
  TrainingPresetDialogView,
  trainingPresetDialogReducer,
} from './TrainingPresetDialog';
import {
  TRAINING_PRESET_REQUEST_TIMEOUT_MS,
  TrainingPresetSelect,
  commitTrainingPresetMutationResult,
  createTrainingPresetActionLock,
  createTrainingPresetAndRefresh,
  deleteTrainingPresetAndRefresh,
  extractTrainingPresetApiError,
  isTrainingPresetCancellation,
  preparePresetApplication,
  reconcileSelectedPresetId,
  restorePresetUndo,
  updateTrainingPresetAndRefresh,
  validateTrainingPresetListResponse,
  type TrainingPresetMutationResult,
  type TrainingPresetSelection,
} from './TrainingPresetSelect';

export interface TrainingPresetControlProps {
  jobConfig: JobConfig;
  onJobConfigChange: (jobConfig: JobConfig) => void;
  migrateJobConfig: (jobConfig: JobConfig) => JobConfig;
}

function localError(prefix: string, error: unknown): string {
  return error instanceof Error && error.message.trim() !== '' ? `${prefix}: ${error.message}` : prefix;
}

export function TrainingPresetControl({ jobConfig, onJobConfigChange, migrateJobConfig }: TrainingPresetControlProps) {
  const [presets, setPresets] = useState<TrainingPresetRecord[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [undoConfig, setUndoConfig] = useState<JobConfig | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [dialog, dispatchDialog] = useReducer(trainingPresetDialogReducer, CLOSED_TRAINING_PRESET_DIALOG);
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const actionLockRef = useRef(createTrainingPresetActionLock());
  const jobConfigRef = useRef(jobConfig);
  const changeRef = useRef(onJobConfigChange);
  const migrateRef = useRef(migrateJobConfig);
  jobConfigRef.current = jobConfig;
  changeRef.current = onJobConfigChange;
  migrateRef.current = migrateJobConfig;

  const startRequest = useCallback(() => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    return controller;
  }, []);

  const fetchPresets = useCallback(async () => {
    const controller = startRequest();
    if (mountedRef.current) {
      setLoading(true);
      setFetchFailed(false);
      setError(null);
    }
    try {
      const response = await apiClient.get('/api/training-presets', {
        signal: controller.signal,
        timeout: TRAINING_PRESET_REQUEST_TIMEOUT_MS,
      });
      const nextPresets = validateTrainingPresetListResponse(response.data);
      if (!mountedRef.current || controller.signal.aborted) return;
      setPresets(nextPresets);
      setSelectedPresetId(current => reconcileSelectedPresetId(current, nextPresets));
    } catch (requestError) {
      if (!mountedRef.current || isTrainingPresetCancellation(requestError, controller.signal)) return;
      setFetchFailed(true);
      setError(extractTrainingPresetApiError(requestError, 'Unable to load training presets.'));
    } finally {
      if (mountedRef.current && requestControllerRef.current === controller) setLoading(false);
    }
  }, [startRequest]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchPresets();
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, [fetchPresets]);

  const beginPending = (): boolean => {
    if (!mountedRef.current || pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    return true;
  };

  const endPending = (controller: AbortController) => {
    if (requestControllerRef.current !== controller) return;
    pendingRef.current = false;
    if (mountedRef.current) setPending(false);
  };

  const applyMutationResult = (result: TrainingPresetMutationResult): boolean => {
    return commitTrainingPresetMutationResult(result, {
      onState: state => {
        setPresets(state.presets);
        setSelectedPresetId(state.selectedPresetId);
      },
      onSuccess: () => {
        setFetchFailed(false);
        setError(null);
      },
      onListError: listError => {
        setFetchFailed(true);
        setError(listError);
      },
    });
  };

  const handleSelection = (selection: TrainingPresetSelection) => {
    if (pendingRef.current || dialog.kind !== 'closed' || loading) return;

    if (selection.type === 'preset') {
      const preset = presets.find(candidate => candidate.id === selection.id);
      if (!preset) return;
      try {
        const transaction = preparePresetApplication(jobConfigRef.current, preset.snapshot, migrateRef.current);
        changeRef.current(transaction.jobConfig);
        setUndoConfig(transaction.undoConfig);
        setSelectedPresetId(preset.id);
        setError(null);
      } catch (applyError) {
        setError(localError('Could not apply training preset', applyError));
      }
      return;
    }

    if (selection.type === 'undo') {
      if (undoConfig === null) return;
      try {
        restorePresetUndo(undoConfig, changeRef.current);
        setUndoConfig(null);
        setError(null);
      } catch (undoError) {
        setError(localError('Could not undo training preset', undoError));
      }
      return;
    }

    if (selection.type === 'save') {
      dispatchDialog({ type: 'open-save' });
      return;
    }

    const selected =
      selectedPresetId === null ? undefined : presets.find(candidate => candidate.id === selectedPresetId);
    if (!selected) return;
    if (selection.type === 'update') {
      dispatchDialog({ type: 'open-update', presetId: selected.id, presetName: selected.name });
    } else if (selection.type === 'delete') {
      dispatchDialog({ type: 'open-delete', presetId: selected.id, presetName: selected.name });
    }
  };

  const confirmDialog = async () => {
    if (dialog.kind === 'closed' || pendingRef.current) return;
    let normalizedName: string | undefined;
    if (dialog.kind === 'save') {
      try {
        normalizedName = normalizePresetName(dialog.name).name;
      } catch {
        dispatchDialog({ type: 'validate-save' });
        return;
      }
    }
    if (!beginPending()) return;
    const controller = startRequest();
    const state = { presets, selectedPresetId, jobConfig: jobConfigRef.current, undoConfig };
    try {
      const result =
        dialog.kind === 'save'
          ? await createTrainingPresetAndRefresh(
              apiClient,
              actionLockRef.current,
              normalizedName!,
              state,
              controller.signal,
            )
          : dialog.kind === 'update'
            ? await updateTrainingPresetAndRefresh(
                apiClient,
                actionLockRef.current,
                dialog.presetId,
                state,
                controller.signal,
              )
            : await deleteTrainingPresetAndRefresh(
                apiClient,
                actionLockRef.current,
                dialog.presetId,
                state,
                controller.signal,
              );
      if (!mountedRef.current || controller.signal.aborted || !applyMutationResult(result)) return;
      dispatchDialog({ type: 'success' });
    } catch (requestError) {
      if (!mountedRef.current || isTrainingPresetCancellation(requestError, controller.signal)) return;
      const fallback =
        dialog.kind === 'save'
          ? 'Unable to save training preset.'
          : dialog.kind === 'update'
            ? 'Unable to update training preset.'
            : 'Unable to delete training preset.';
      const message = extractTrainingPresetApiError(requestError, fallback);
      setError(message);
      dispatchDialog({ type: 'set-error', error: message });
    } finally {
      endPending(controller);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TrainingPresetSelect
        presets={presets}
        selectedPresetId={selectedPresetId}
        canUndo={undoConfig !== null}
        disabled={loading || pending || dialog.kind !== 'closed'}
        onSelect={handleSelection}
      />
      {(loading || pending) && (
        <span role="status" className="text-xs text-gray-400">
          {loading ? 'Loading presets…' : 'Updating presets…'}
        </span>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2 text-xs text-red-400">
          <span>{error}</span>
          {fetchFailed && (
            <button
              type="button"
              className="underline disabled:opacity-50"
              disabled={loading || pending}
              onClick={() => void fetchPresets()}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <TrainingPresetDialogView
        state={dialog}
        pending={pending}
        onClose={() => dispatchDialog({ type: 'close' })}
        onNameChange={value => dispatchDialog({ type: 'set-name', value })}
        onConfirm={() => void confirmDialog()}
      />
    </div>
  );
}

export default TrainingPresetControl;
