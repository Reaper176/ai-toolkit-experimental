'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { JobConfig } from '../types';
import { normalizePresetName, type TrainingPresetRecord } from '../helpers/trainingPresets';
import { apiClient } from '../utils/api';
import { openConfirm } from './ConfirmModal';
import {
  TrainingPresetSelect,
  createTrainingPreset,
  deleteTrainingPreset,
  extractTrainingPresetApiError,
  preparePresetApplication,
  reconcileSelectedPresetId,
  restorePresetUndo,
  sortTrainingPresetRecords,
  updateTrainingPreset,
  validateTrainingPresetListResponse,
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
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const confirmationOpenRef = useRef(false);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const jobConfigRef = useRef(jobConfig);
  const changeRef = useRef(onJobConfigChange);
  const migrateRef = useRef(migrateJobConfig);
  jobConfigRef.current = jobConfig;
  changeRef.current = onJobConfigChange;
  migrateRef.current = migrateJobConfig;

  const fetchPresets = useCallback(async () => {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    if (mountedRef.current) {
      setLoading(true);
      setFetchFailed(false);
      setError(null);
    }
    try {
      const response = await apiClient.get('/api/training-presets', { signal: controller.signal });
      const nextPresets = validateTrainingPresetListResponse(response.data);
      if (!mountedRef.current || controller.signal.aborted) return;
      setPresets(nextPresets);
      setSelectedPresetId(current => reconcileSelectedPresetId(current, nextPresets));
    } catch (requestError) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setFetchFailed(true);
      setError(extractTrainingPresetApiError(requestError, 'Unable to load training presets.'));
    } finally {
      if (mountedRef.current && fetchControllerRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchPresets();
    return () => {
      mountedRef.current = false;
      fetchControllerRef.current?.abort();
    };
  }, [fetchPresets]);

  const beginPending = (): boolean => {
    if (!mountedRef.current || pendingRef.current) return false;
    pendingRef.current = true;
    if (mountedRef.current) setPending(true);
    return true;
  };

  const endPending = () => {
    pendingRef.current = false;
    if (mountedRef.current) setPending(false);
  };

  const beginConfirmation = (): boolean => {
    if (!mountedRef.current || confirmationOpenRef.current) return false;
    confirmationOpenRef.current = true;
    setConfirming(true);
    return true;
  };

  const endConfirmation = () => {
    confirmationOpenRef.current = false;
    if (mountedRef.current) setConfirming(false);
  };

  const mergePreset = (nextPreset: TrainingPresetRecord, replacedId?: string) => {
    setPresets(current =>
      sortTrainingPresetRecords([
        ...current.filter(preset => preset.id !== nextPreset.id && preset.id !== replacedId),
        nextPreset,
      ]),
    );
  };

  const handleSelection = (selection: TrainingPresetSelection) => {
    if (pendingRef.current || confirmationOpenRef.current || loading) return;

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
      if (!beginConfirmation()) return;
      openConfirm({
        title: 'Save training preset',
        message: 'Save the current training settings as a reusable preset.',
        confirmText: 'Save preset',
        type: 'info',
        inputTitle: 'Preset name',
        onCancel: endConfirmation,
        onConfirm: async value => {
          endConfirmation();
          if (value === undefined) return;
          let name: string;
          try {
            name = normalizePresetName(value).name;
          } catch (nameError) {
            if (mountedRef.current) setError(localError('Could not save training preset', nameError));
            return;
          }
          if (!beginPending()) return;
          try {
            const created = await createTrainingPreset(apiClient, name, jobConfigRef.current);
            if (!mountedRef.current) return;
            mergePreset(created);
            setSelectedPresetId(created.id);
            setError(null);
          } catch (requestError) {
            if (mountedRef.current) {
              setError(extractTrainingPresetApiError(requestError, 'Unable to save training preset.'));
            }
          } finally {
            endPending();
          }
        },
      });
      return;
    }

    const selected =
      selectedPresetId === null ? undefined : presets.find(candidate => candidate.id === selectedPresetId);
    if (!selected) return;

    if (selection.type === 'update') {
      if (!beginConfirmation()) return;
      openConfirm({
        title: `Update “${selected.name}”`,
        message: 'Replace this preset with the current training settings?',
        confirmText: 'Update preset',
        type: 'warning',
        onCancel: endConfirmation,
        onConfirm: async () => {
          endConfirmation();
          if (!beginPending()) return;
          try {
            const updated = await updateTrainingPreset(apiClient, selected.id, jobConfigRef.current);
            if (!mountedRef.current) return;
            mergePreset(updated, selected.id);
            setSelectedPresetId(updated.id);
            setError(null);
          } catch (requestError) {
            if (mountedRef.current) {
              setError(extractTrainingPresetApiError(requestError, 'Unable to update training preset.'));
            }
          } finally {
            endPending();
          }
        },
      });
      return;
    }

    if (selection.type === 'delete') {
      if (!beginConfirmation()) return;
      openConfirm({
        title: `Delete “${selected.name}”`,
        message: 'This training preset will be permanently deleted.',
        confirmText: 'Delete preset',
        type: 'danger',
        onCancel: endConfirmation,
        onConfirm: async () => {
          endConfirmation();
          if (!beginPending()) return;
          try {
            await deleteTrainingPreset(apiClient, selected.id);
            if (!mountedRef.current) return;
            setPresets(current => current.filter(preset => preset.id !== selected.id));
            setSelectedPresetId(null);
            setError(null);
          } catch (requestError) {
            if (mountedRef.current) {
              setError(extractTrainingPresetApiError(requestError, 'Unable to delete training preset.'));
            }
          } finally {
            endPending();
          }
        },
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TrainingPresetSelect
        presets={presets}
        selectedPresetId={selectedPresetId}
        canUndo={undoConfig !== null}
        disabled={loading || pending || confirming}
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
    </div>
  );
}

export default TrainingPresetControl;
