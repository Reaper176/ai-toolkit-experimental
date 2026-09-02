'use client';

import React, { useCallback, useEffect, useId, useReducer, useRef, useState, type ComponentType } from 'react';
import type { JobConfig } from '../types';
import { normalizePresetName, type TrainingPresetRecord } from '../helpers/trainingPresets';
import { apiClient } from '../utils/api';
import { TrainingPresetDetails } from './TrainingPresetDetails';
import {
  CLOSED_TRAINING_PRESET_DIALOG,
  TrainingPresetDialogView,
  trainingPresetDialogReducer,
  type TrainingPresetDialogViewProps,
  type TrainingPresetDialogState,
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
  type TrainingPresetApi,
  type TrainingPresetSelection,
} from './TrainingPresetSelect';

export interface TrainingPresetControlProps {
  disabled?: boolean;
  jobConfig: JobConfig;
  onJobConfigChange: (jobConfig: JobConfig) => void;
  migrateJobConfig: (jobConfig: JobConfig) => JobConfig;
  dependencies?: Partial<TrainingPresetControlDependencies>;
}

export interface TrainingPresetControlDependencies {
  api: TrainingPresetApi;
  Dialog: ComponentType<TrainingPresetDialogViewProps>;
}

function localError(prefix: string, error: unknown): string {
  return error instanceof Error && error.message.trim() !== '' ? `${prefix}: ${error.message}` : prefix;
}

export function TrainingPresetControl({
  disabled = false,
  jobConfig,
  onJobConfigChange,
  migrateJobConfig,
  dependencies,
}: TrainingPresetControlProps) {
  const api = dependencies?.api ?? apiClient;
  const Dialog = dependencies?.Dialog ?? TrainingPresetDialogView;
  const [presets, setPresets] = useState<TrainingPresetRecord[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [undoConfig, setUndoConfig] = useState<JobConfig | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialog, dispatchDialog] = useReducer(trainingPresetDialogReducer, CLOSED_TRAINING_PRESET_DIALOG);
  const detailsId = useId();
  const dialogRef = useRef(dialog);
  const controlRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const actionLockRef = useRef(createTrainingPresetActionLock());
  const jobConfigRef = useRef(jobConfig);
  const changeRef = useRef(onJobConfigChange);
  const migrateRef = useRef(migrateJobConfig);
  const disabledRef = useRef(disabled);
  jobConfigRef.current = jobConfig;
  changeRef.current = onJobConfigChange;
  migrateRef.current = migrateJobConfig;
  disabledRef.current = disabled;
  dialogRef.current = dialog;

  const selectedBuiltIn = selectedPresetId === null
    ? undefined
    : presets.find(preset => preset.id === selectedPresetId && preset.source === 'builtin');
  const interactionDisabled = disabled || loading || pending || dialog.kind !== 'closed';

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
      const response = await api.get('/api/training-presets', {
        signal: controller.signal,
        timeout: TRAINING_PRESET_REQUEST_TIMEOUT_MS,
      });
      const nextPresets = validateTrainingPresetListResponse(response.data);
      if (!mountedRef.current || controller.signal.aborted) return;
      setPresets(nextPresets);
      setSelectedPresetId(current =>
        reconcileSelectedPresetId(current, nextPresets, jobConfigRef.current.config.process[0].model.arch),
      );
    } catch (requestError) {
      if (!mountedRef.current || isTrainingPresetCancellation(requestError, controller.signal)) return;
      setFetchFailed(true);
      setError(extractTrainingPresetApiError(requestError, 'Unable to load training presets.'));
    } finally {
      if (mountedRef.current && requestControllerRef.current === controller) setLoading(false);
    }
  }, [api, startRequest]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchPresets();
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, [fetchPresets]);

  useEffect(() => {
    setSelectedPresetId(current => reconcileSelectedPresetId(current, presets, jobConfig.config.process[0].model.arch));
  }, [jobConfig.config.process, presets]);

  useEffect(() => {
    if (selectedBuiltIn === undefined) setDetailsOpen(false);
  }, [selectedBuiltIn]);

  useEffect(() => {
    if (!detailsOpen || typeof document === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target !== null && !controlRef.current?.contains(event.target as Node)) {
        setDetailsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailsOpen]);

  const beginPending = (): boolean => {
    if (!mountedRef.current || pendingRef.current || disabledRef.current) return false;
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
    if (!mountedRef.current || disabledRef.current || pendingRef.current || dialog.kind !== 'closed' || loading) return;

    if (selection.type === 'preset') {
      const preset = presets.find(candidate => candidate.id === selection.id);
      if (!preset) return;
      if (preset.source === 'builtin' && preset.model_arch !== jobConfigRef.current.config.process[0].model.arch) {
        setSelectedPresetId(null);
        setDetailsOpen(false);
        return;
      }
      try {
        const transaction = preparePresetApplication(jobConfigRef.current, preset, migrateRef.current);
        changeRef.current(transaction.jobConfig);
        setUndoConfig(transaction.undoConfig);
        setSelectedPresetId(preset.id);
        if (preset.source === 'user') setDetailsOpen(false);
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
    if (!selected || selected.source !== 'user' || selected.read_only) return;
    if (selection.type === 'update') {
      dispatchDialog({ type: 'open-update', presetId: selected.id, presetName: selected.name });
    } else if (selection.type === 'delete') {
      dispatchDialog({ type: 'open-delete', presetId: selected.id, presetName: selected.name });
    }
  };

  const confirmDialog = async (expectedDialog: TrainingPresetDialogState) => {
    if (
      !mountedRef.current ||
      disabledRef.current ||
      dialogRef.current !== expectedDialog ||
      expectedDialog.kind === 'closed' ||
      pendingRef.current
    )
      return;
    const activeDialog = expectedDialog;
    if (activeDialog.kind === 'update' || activeDialog.kind === 'delete') {
      const target = presets.find(preset => preset.id === activeDialog.presetId);
      if (!target || target.source !== 'user' || target.read_only) return;
    }
    let normalizedName: string | undefined;
    if (activeDialog.kind === 'save') {
      try {
        normalizedName = normalizePresetName(activeDialog.name).name;
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
        activeDialog.kind === 'save'
          ? await createTrainingPresetAndRefresh(api, actionLockRef.current, normalizedName!, state, controller.signal)
          : activeDialog.kind === 'update'
            ? await updateTrainingPresetAndRefresh(
                api,
                actionLockRef.current,
                activeDialog.presetId,
                state,
                controller.signal,
              )
            : await deleteTrainingPresetAndRefresh(
                api,
                actionLockRef.current,
                activeDialog.presetId,
                state,
                controller.signal,
              );
      if (!mountedRef.current || controller.signal.aborted || !applyMutationResult(result)) return;
      dispatchDialog({ type: 'success' });
    } catch (requestError) {
      if (!mountedRef.current || isTrainingPresetCancellation(requestError, controller.signal)) return;
      const fallback =
        activeDialog.kind === 'save'
          ? 'Unable to save training preset.'
          : activeDialog.kind === 'update'
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
    <div ref={controlRef} data-training-preset-control className="relative flex flex-wrap items-center gap-2">
      <TrainingPresetSelect
        presets={presets}
        selectedPresetId={selectedPresetId}
        currentModelArch={jobConfig.config.process[0].model.arch}
        canUndo={undoConfig !== null}
        disabled={interactionDisabled}
        onSelect={handleSelection}
      />
      {selectedBuiltIn?.source === 'builtin' && (
        <button
          type="button"
          aria-label="Show preset details"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          disabled={interactionDisabled}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 disabled:opacity-50"
          onClick={() => setDetailsOpen(open => !open)}
        >
          Details
        </button>
      )}
      {selectedBuiltIn?.source === 'builtin' && detailsOpen && (
        <div
          id={detailsId}
          role="region"
          aria-label="Selected preset details"
          data-preset-details-region
          className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded shadow-xl"
        >
          <TrainingPresetDetails preset={selectedBuiltIn} />
        </div>
      )}
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
      <Dialog
        state={dialog}
        pending={pending}
        onClose={() => dispatchDialog({ type: 'close' })}
        onNameChange={value => dispatchDialog({ type: 'set-name', value })}
        onConfirm={() => void confirmDialog(dialog)}
      />
    </div>
  );
}

export default TrainingPresetControl;
