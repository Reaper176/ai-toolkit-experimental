'use client';

import { useEffect, useRef, useState } from 'react';
import { openConfirm, type ConfirmState } from '@/components/ConfirmModal';
import { formatDatasetPresetBytes } from '@/components/DatasetProvenance';
import { normalizePresetName } from '@/helpers/datasetPresetValidation';
import { normalizeRelativeMediaPath } from '@/helpers/datasetSelection';
import {
  DatasetPresetRequestError,
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
  selectionDirty?: boolean;
  onPendingChange?(pending: boolean): void;
  onChanged(change: LifecycleChange, applyToActiveIdentity: boolean): Promise<void> | void;
}

const MAX_RESULT_LENGTH = 240;

function boundedResult(message: string): string {
  return message.length <= MAX_RESULT_LENGTH ? message : `${message.slice(0, MAX_RESULT_LENGTH - 1)}…`;
}

function boundedMessage(error: unknown): string {
  if (error instanceof DatasetPresetRequestError) {
    const detail = verificationFailureMessage(error.body);
    if (detail) return boundedResult(detail);
  }
  const message = error instanceof Error ? error.message : 'Dataset preset operation failed';
  return boundedResult(message);
}

function boundedValue(value: unknown): string | undefined {
  if (value === null) return 'null';
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value !== 'string' || value.length > 80) return undefined;
  return value;
}

function unexpectedPathLabel(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240) return null;
  if (
    value.startsWith('/') ||
    value.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.includes('\\') ||
    value.split('/').some(segment => segment === '' || segment === '.' || segment === '..')
  ) {
    return '[unsafe relative path omitted]';
  }
  return Array.from(value, character =>
    /^[A-Za-z0-9._/-]$/.test(character) ? character : `\\u{${character.codePointAt(0)!.toString(16)}}`,
  ).join('');
}

function verificationFailureMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('mismatches' in body) || !Array.isArray(body.mismatches)) return null;
  const lines: string[] = [];
  for (const untrusted of body.mismatches.slice(0, 5)) {
    if (!untrusted || typeof untrusted !== 'object') continue;
    const mismatch = untrusted as Record<string, unknown>;
    if (!['missing', 'size', 'hash', 'caption', 'manifest', 'unexpected'].includes(String(mismatch.kind))) continue;
    if (!['media', 'caption', 'manifest'].includes(String(mismatch.asset))) continue;
    let path: string;
    try {
      path =
        mismatch.kind === 'unexpected'
          ? unexpectedPathLabel(mismatch.path) ?? '[unsafe relative path omitted]'
          : mismatch.asset === 'manifest' && mismatch.path === 'manifest.json'
          ? 'manifest.json'
          : normalizeRelativeMediaPath(mismatch.path);
    } catch {
      continue;
    }
    const expected = boundedValue(mismatch.expected);
    const actual = boundedValue(mismatch.actual);
    lines.push(
      `${mismatch.asset} ${mismatch.kind}: ${path}${expected === undefined ? '' : `; expected ${expected}`}${actual === undefined ? '' : `; actual ${actual}`}`,
    );
  }
  return lines.length === 0 ? null : lines.join(' | ');
}

export default function DatasetPresetLifecycleControls({
  preset,
  version,
  confirm = openConfirm,
  selectionDirty = false,
  onPendingChange = () => undefined,
  onChanged,
}: DatasetPresetLifecycleControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const activeOperation = useRef<symbol | null>(null);
  const mounted = useRef(true);
  const identity = useRef(`${preset.id}:${version.id}`);
  identity.current = `${preset.id}:${version.id}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onPendingChange(false);
    };
  }, []);

  useEffect(() => {
    activeOperation.current = null;
    setPending(null);
    onPendingChange(false);
    setRenaming(false);
    setMenuOpen(false);
    setResult(null);
  }, [preset.id, version.id]);

  useEffect(() => {
    setName(preset.name);
  }, [preset.name]);

  const mutate = async <T,>(
    label: string,
    action: () => Promise<T>,
    succeeded: (value: T, applyToActiveIdentity: boolean) => Promise<void> | void,
  ) => {
    if (activeOperation.current !== null) return;
    const operation = Symbol(label);
    const requestIdentity = identity.current;
    activeOperation.current = operation;
    setPending(label);
    onPendingChange(true);
    setResult(null);
    try {
      const value = await action();
      if (!mounted.current) return;
      const applyToActiveIdentity = identity.current === requestIdentity && activeOperation.current === operation;
      await succeeded(value, applyToActiveIdentity);
      if (mounted.current && identity.current === requestIdentity && activeOperation.current === operation) {
        setResult({ kind: 'success', message: label === 'verify' ? 'Full integrity verification passed.' : 'Saved.' });
        setMenuOpen(false);
        setRenaming(false);
      }
    } catch (error) {
      if (mounted.current && identity.current === requestIdentity && activeOperation.current === operation) {
        setResult({ kind: 'error', message: boundedMessage(error) });
      }
    } finally {
      if (activeOperation.current === operation) {
        activeOperation.current = null;
        if (mounted.current) setPending(null);
        onPendingChange(false);
      }
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
          (nextPreset, apply) => onChanged({ preset: nextPreset, version }, apply),
        ),
    });
  };

  const deleteVersion = () => {
    if (version.reference_count !== 0 || selectionDirty) return;
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
          (_response, apply) => onChanged({ deletedVersionId: version.id }, apply),
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
        <div id="dataset-preset-management-menu" role="group" aria-label="Preset management actions" className="flex gap-2">
          <button type="button" onClick={() => setRenaming(true)}>
            Rename preset
          </button>
          <button type="button" onClick={() => updateArchived(preset.archived_at === null)}>
            {preset.archived_at === null ? 'Archive preset' : 'Restore preset'}
          </button>
          <button
            type="button"
            onClick={() =>
              void mutate(
                'verify',
                () =>
                  requestDatasetPresetJson<{ valid: true; version: DatasetPresetVersionDetail }>(
                    `/api/dataset-preset-versions/${encodeURIComponent(version.id)}/verify`,
                    { method: 'POST' },
                  ),
                (verified, apply) => onChanged({ version: verified.version, preset }, apply),
              )
            }
          >
            Verify active version
          </button>
          {version.reference_count === 0 && !selectionDirty && (
            <button type="button" onClick={deleteVersion}>
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
              (nextPreset, apply) => onChanged({ preset: nextPreset, version }, apply),
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
