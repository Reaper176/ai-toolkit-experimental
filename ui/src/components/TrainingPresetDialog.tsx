'use client';

import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { normalizePresetName } from '../helpers/trainingPresets';

export type TrainingPresetDialogState =
  | { kind: 'closed' }
  | { kind: 'save'; name: string; error: string | null }
  | { kind: 'update' | 'delete'; presetId: string; presetName: string; error: string | null };

export type TrainingPresetDialogAction =
  | { type: 'open-save' }
  | { type: 'open-update' | 'open-delete'; presetId: string; presetName: string }
  | { type: 'set-name'; value: string }
  | { type: 'set-error'; error: string }
  | { type: 'validate-save' }
  | { type: 'success' }
  | { type: 'close' };

export const CLOSED_TRAINING_PRESET_DIALOG: TrainingPresetDialogState = { kind: 'closed' };

export function trainingPresetDialogReducer(
  state: TrainingPresetDialogState,
  action: TrainingPresetDialogAction,
): TrainingPresetDialogState {
  switch (action.type) {
    case 'open-save':
      return { kind: 'save', name: '', error: null };
    case 'open-update':
      return { kind: 'update', presetId: action.presetId, presetName: action.presetName, error: null };
    case 'open-delete':
      return { kind: 'delete', presetId: action.presetId, presetName: action.presetName, error: null };
    case 'set-name':
      return state.kind === 'save' ? { ...state, name: action.value, error: null } : state;
    case 'set-error':
      return state.kind === 'closed' ? state : { ...state, error: action.error };
    case 'validate-save':
      if (state.kind !== 'save') return state;
      try {
        normalizePresetName(state.name);
        return { ...state, error: null };
      } catch (error) {
        return { ...state, error: error instanceof Error ? error.message : 'Preset name is invalid' };
      }
    case 'success':
    case 'close':
      return CLOSED_TRAINING_PRESET_DIALOG;
  }
}

export interface TrainingPresetDialogViewProps {
  state: TrainingPresetDialogState;
  pending: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onConfirm: () => void;
}

interface TrainingPresetDialogContentProps extends TrainingPresetDialogViewProps {
  renderTitle?: (title: string) => React.ReactNode;
}

export function TrainingPresetDialogContent({
  state,
  pending,
  onClose,
  onNameChange,
  onConfirm,
  renderTitle,
}: TrainingPresetDialogContentProps) {
  const title =
    state.kind === 'save'
      ? 'Save training preset'
      : state.kind === 'update'
        ? `Update “${state.presetName}”`
        : state.kind === 'delete'
          ? `Delete “${state.presetName}”`
          : '';
  const confirmText =
    state.kind === 'save' ? 'Save preset' : state.kind === 'update' ? 'Update preset' : 'Delete preset';

  return (
    <div>
      {renderTitle ? (
        renderTitle(title)
      ) : (
        <h2 id="training-preset-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
      )}
      {state.kind === 'save' ? (
        <form
          className="mt-4"
          onSubmit={event => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <label className="block text-sm">
            <span>Preset name</span>
            <input
              autoFocus
              aria-label="Preset name"
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? 'training-preset-name-error' : undefined}
              className="mt-1 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2"
              value={state.name}
              disabled={pending}
              onChange={event => onNameChange(event.currentTarget.value)}
            />
          </label>
          {state.error && (
            <p id="training-preset-name-error" role="alert" className="mt-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <>
          <p className="mt-3 text-sm text-gray-300">
            {state.kind === 'update'
              ? 'Replace this preset with the current training settings?'
              : 'This training preset will be permanently deleted.'}
          </p>
          {state.kind !== 'closed' && state.error && (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
        </>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="rounded px-3 py-2 text-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? 'Working…' : confirmText}
        </button>
      </div>
    </div>
  );
}

export function TrainingPresetDialogView(props: TrainingPresetDialogViewProps) {
  return (
    <Dialog open={props.state.kind !== 'closed'} onClose={props.onClose} className="relative z-20">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/75" />
      <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-gray-800 p-5 text-gray-100 shadow-xl">
          <TrainingPresetDialogContent
            {...props}
            renderTitle={title => (
              <DialogTitle id="training-preset-dialog-title" className="text-base font-semibold">
                {title}
              </DialogTitle>
            )}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
}
