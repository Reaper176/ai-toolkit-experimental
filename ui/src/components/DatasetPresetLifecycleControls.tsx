'use client';

import { useEffect, useRef, useState } from 'react';
import { openConfirm, type ConfirmState } from '@/components/ConfirmModal';
import { formatDatasetPresetBytes } from '@/components/DatasetProvenance';
import { normalizePresetName } from '@/helpers/datasetPresetValidation';
import {
  requestDatasetPresetJson,
  type DatasetPresetDetail,
  type DatasetPresetVersionDetail,
} from '@/hooks/useDatasetPresets';

export interface LifecycleChange {
  preset?: DatasetPresetDetail;
  version?: DatasetPresetVersionDetail;
  deletedVersionId?: string;
}

interface DatasetPresetLifecycleControlsProps {
  preset: DatasetPresetDetail;
  version: DatasetPresetVersionDetail;
  confirm?: (state: ConfirmState) => void;
  onChanged(change: LifecycleChange): Promise<void> | void;
}

const MAX_RESULT_LENGTH = 240;

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Dataset preset operation failed';
  return message.length <= MAX_RESULT_LENGTH ? message : `${message.slice(0, MAX_RESULT_LENGTH - 1)}…`;
}

export default function DatasetPresetLifecycleControls({
  preset,
  version,
  confirm = openConfirm,
  onChanged,
}: DatasetPresetLifecycleControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  const identity = useRef(`${preset.id}:${version.id}`);
  identity.current = `${preset.id}:${version.id}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setName(preset.name);
    setRenaming(false);
    setMenuOpen(false);
    setResult(null);
  }, [preset.id, preset.name, version.id]);

  const mutate = async <T,>(label: string, action: () => Promise<T>, succeeded: (value: T) => Promise<void> | void) => {
    if (pendingRef.current) return;
    const requestIdentity = identity.current;
    pendingRef.current = true;
    setPending(label);
    setResult(null);
    try {
      const value = await action();
      if (!mounted.current || identity.current !== requestIdentity) return;
      await succeeded(value);
      if (!mounted.current || identity.current !== requestIdentity) return;
      setResult({ kind: 'success', message: label === 'verify' ? 'Full integrity verification passed.' : 'Saved.' });
      setMenuOpen(false);
      setRenaming(false);
    } catch (error) {
      if (mounted.current && identity.current === requestIdentity) {
        setResult({ kind: 'error', message: boundedMessage(error) });
      }
    } finally {
      pendingRef.current = false;
      if (mounted.current && identity.current === requestIdentity) setPending(null);
    }
  };

  const updateArchived = (archived: boolean) => {
    confirm({
      title: archived ? 'Archive dataset preset?' : 'Restore dataset preset?',
      message: archived
        ? `Archive “${preset.name}”? Existing jobs and this version remain readable.`
        : `Restore “${preset.name}” to the active preset list?`,
      type: archived ? 'warning' : 'info',
      confirmText: archived ? 'Archive preset' : 'Restore preset',
      onConfirm: () =>
        mutate(
          archived ? 'archive' : 'restore',
          () =>
            requestDatasetPresetJson<DatasetPresetDetail>(`/api/dataset-presets/${encodeURIComponent(preset.id)}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ archived }),
            }),
          nextPreset => onChanged({ preset: nextPreset, version }),
        ),
    });
  };

  const deleteVersion = () => {
    if (version.reference_count !== 0) return;
    confirm({
      title: 'Permanently delete dataset preset version?',
      message: `Permanently delete “${preset.name}” version ${version.version}, ${version.media_count} media, ${formatDatasetPresetBytes(version.total_bytes)}? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete version permanently',
      onConfirm: () =>
        mutate(
          'delete',
          () =>
            requestDatasetPresetJson<{ success: true }>(
              `/api/dataset-preset-versions/${encodeURIComponent(version.id)}`,
              { method: 'DELETE' },
            ),
          () => onChanged({ deletedVersionId: version.id }),
        ),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span title={version.total_bytes}>{formatDatasetPresetBytes(version.total_bytes)}</span>
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls="dataset-preset-management-menu"
        className="rounded border border-gray-600 px-2 py-1"
        disabled={pending !== null}
        onClick={() => setMenuOpen(open => !open)}
      >
        Manage preset
      </button>
      {menuOpen && (
        <div id="dataset-preset-management-menu" role="menu" aria-label="Preset management" className="flex gap-2">
          <button type="button" role="menuitem" onClick={() => setRenaming(true)}>
            Rename preset
          </button>
          <button type="button" role="menuitem" onClick={() => updateArchived(preset.archived_at === null)}>
            {preset.archived_at === null ? 'Archive preset' : 'Restore preset'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              void mutate(
                'verify',
                () =>
                  requestDatasetPresetJson<{ valid: true; version: DatasetPresetVersionDetail }>(
                    `/api/dataset-preset-versions/${encodeURIComponent(version.id)}/verify`,
                    { method: 'POST' },
                  ),
                verified => onChanged({ version: verified.version, preset }),
              )
            }
          >
            Verify active version
          </button>
          {version.reference_count === 0 && (
            <button type="button" role="menuitem" onClick={deleteVersion}>
              Delete version permanently
            </button>
          )}
        </div>
      )}
      {renaming && (
        <form
          aria-label="Rename dataset preset"
          onSubmit={event => {
            event.preventDefault();
            let normalized: string;
            try {
              normalized = normalizePresetName(name).name;
            } catch (error) {
              setResult({ kind: 'error', message: boundedMessage(error) });
              return;
            }
            void mutate(
              'rename',
              () =>
                requestDatasetPresetJson<DatasetPresetDetail>(`/api/dataset-presets/${encodeURIComponent(preset.id)}`, {
                  method: 'PATCH',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ name: normalized }),
                }),
              nextPreset => onChanged({ preset: nextPreset, version }),
            );
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="dataset-preset-rename">Preset name</label>
          <input
            id="dataset-preset-rename"
            value={name}
            onChange={event => setName(event.target.value)}
            disabled={pending !== null}
          />
          <button type="submit" disabled={pending !== null}>
            Save name
          </button>
          <button type="button" disabled={pending !== null} onClick={() => setRenaming(false)}>
            Cancel rename
          </button>
        </form>
      )}
      {pending && <span aria-live="polite">Working…</span>}
      {result && (
        <span
          role={result.kind === 'error' ? 'alert' : 'status'}
          className={result.kind === 'error' ? 'text-red-400' : 'text-green-400'}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
