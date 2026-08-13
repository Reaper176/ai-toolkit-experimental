'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, NumberInput, SelectInput } from '@/components/formInputs';
import useDatasetPresets, {
  createLatestDatasetPresetRequestGate,
  type DatasetPresetDetail,
  type DatasetPresetVersionDetail,
} from '@/hooks/useDatasetPresets';
import { LOADER_CONFIG_KEYS } from '@/helpers/datasetPresetValidation';
import type { DatasetConfig } from '@/types';

export interface DatasetSourceControlProps {
  dataset: DatasetConfig;
  liveOptions: Array<{ value: string; label: string }>;
  onChange(next: DatasetConfig): void;
  instanceToken?: string | number;
}

function applyPresetVersion(
  dataset: DatasetConfig,
  preset: DatasetPresetDetail,
  version: DatasetPresetVersionDetail,
): DatasetConfig {
  const next = { ...dataset };
  delete next.resolved_mask_available;
  const target = next as unknown as Record<string, unknown>;
  const loader = version.loader_config as unknown as Record<string, unknown>;
  for (const key of LOADER_CONFIG_KEYS) {
    const value = loader[key];
    target[key] = Array.isArray(value) ? [...value] : value;
  }
  next.dataset_preset = {
    version_id: version.id,
    preset_id: preset.id,
    preset_name: preset.name,
    version: version.version,
    manifest_sha256: version.manifest_sha256,
    ...(Array.isArray(version.manifest?.files)
      ? { has_masks: version.manifest.files.some(file => file.mask_missing === false) }
      : {}),
  };
  return next;
}

function datasetSourceSignature(dataset: DatasetConfig): string {
  const preset = dataset.dataset_preset;
  return preset
    ? `preset:${preset.preset_id}:${preset.version_id}`
    : `live:${typeof dataset.folder_path === 'string' ? dataset.folder_path : ''}`;
}

export default function DatasetSourceControl({ dataset, liveOptions, onChange, instanceToken }: DatasetSourceControlProps) {
  const { presets, status, error, refresh, loadPreset, loadVersion } = useDatasetPresets();
  const [mode, setMode] = useState<'live' | 'preset'>(() => (dataset.dataset_preset ? 'preset' : 'live'));
  const [selectedPresetId, setSelectedPresetId] = useState(dataset.dataset_preset?.preset_id ?? '');
  const [detail, setDetail] = useState<DatasetPresetDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const presetRequests = useRef(createLatestDatasetPresetRequestGate());
  const versionRequests = useRef(createLatestDatasetPresetRequestGate());
  const maskStatusRequests = useRef(createLatestDatasetPresetRequestGate());
  const latestDatasetRef = useRef(dataset);
  latestDatasetRef.current = dataset;
  const sourceSignature = datasetSourceSignature(dataset);
  const previousSourceSignatureRef = useRef(sourceSignature);
  const emittedSourceSignatureRef = useRef<string | null>(null);
  const previousInstanceTokenRef = useRef(instanceToken);

  const emitChange = (next: DatasetConfig) => {
    emittedSourceSignatureRef.current = datasetSourceSignature(next);
    onChange(next);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (dataset.dataset_preset || !dataset.folder_path.trim() || dataset.mask_path) return;
    const request = maskStatusRequests.current.begin();
    void fetch(`/api/datasets/mask-status?folder_path=${encodeURIComponent(dataset.folder_path)}`, {
      signal: request.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Unable to resolve live dataset masks');
      const body = await response.json() as { has_masks?: unknown };
      if (typeof body.has_masks !== 'boolean') throw new Error('Invalid live dataset mask status');
      if (!request.isCurrent()) return;
      const latest = latestDatasetRef.current;
      if (latest.dataset_preset || latest.folder_path !== dataset.folder_path) return;
      if (latest.resolved_mask_available !== body.has_masks) {
        emitChange({ ...latest, resolved_mask_available: body.has_masks });
      }
    }).catch(() => undefined);
    return () => request.cancel();
  }, [dataset.dataset_preset, dataset.folder_path, dataset.mask_path]);

  useEffect(
    () => () => {
      presetRequests.current.cancelCurrent();
      versionRequests.current.cancelCurrent();
      maskStatusRequests.current.cancelCurrent();
    },
    [],
  );

  useLayoutEffect(() => {
    if (instanceToken === previousInstanceTokenRef.current) return;
    previousInstanceTokenRef.current = instanceToken;
    previousSourceSignatureRef.current = sourceSignature;
    emittedSourceSignatureRef.current = null;
    presetRequests.current.cancelCurrent();
    versionRequests.current.cancelCurrent();
    maskStatusRequests.current.cancelCurrent();
    setLoadingDetail(false);
    setLoadingVersion(false);
    setDetail(null);
    setLocalError(null);
    if (dataset.dataset_preset) {
      setMode('preset');
      setSelectedPresetId(dataset.dataset_preset.preset_id);
    } else {
      setMode('live');
      setSelectedPresetId('');
    }
  }, [dataset.dataset_preset, instanceToken, sourceSignature]);

  useLayoutEffect(() => {
    if (sourceSignature === previousSourceSignatureRef.current) return;
    previousSourceSignatureRef.current = sourceSignature;
    if (emittedSourceSignatureRef.current === sourceSignature) {
      emittedSourceSignatureRef.current = null;
      return;
    }
    emittedSourceSignatureRef.current = null;
    presetRequests.current.cancelCurrent();
    versionRequests.current.cancelCurrent();
    maskStatusRequests.current.cancelCurrent();
    setLoadingDetail(false);
    setLoadingVersion(false);
    setDetail(null);
    setLocalError(null);
    if (dataset.dataset_preset) {
      setMode('preset');
      setSelectedPresetId(dataset.dataset_preset.preset_id);
    } else {
      setMode('live');
      setSelectedPresetId('');
    }
  }, [dataset.dataset_preset, sourceSignature]);

  useEffect(() => {
    const metadata = dataset.dataset_preset;
    if (mode !== 'preset' || !metadata || detail?.id === metadata.preset_id) return;
    const request = presetRequests.current.begin();
    setLoadingDetail(true);
    setLocalError(null);
    void loadPreset(metadata.preset_id)
      .then(result => {
        if (!request.isCurrent()) return;
        setDetail(result);
      })
      .catch(cause => {
        if (!request.isCurrent()) return;
        setLocalError(cause instanceof Error ? cause.message : 'Unable to load dataset preset');
      })
      .finally(() => {
        if (request.isCurrent()) setLoadingDetail(false);
      });
  }, [dataset.dataset_preset, detail?.id, loadPreset, mode]);

  const presetOptions = useMemo(
    () => presets.map(preset => ({ value: preset.id, label: preset.name })),
    [presets],
  );
  const versionOptions = useMemo(
    () =>
      [...(detail?.versions ?? [])]
        .sort((a, b) => b.version - a.version)
        .map(version => ({ value: version.id, label: `Version ${version.version}` })),
    [detail],
  );
  const historicalArchived =
    detail !== null && detail.archived_at !== null && detail.id === dataset.dataset_preset?.preset_id;

  const choosePreset = async (presetId: string) => {
    if (selectedPresetId === presetId && detail?.id === presetId) return;
    const presetChanged = selectedPresetId !== presetId;
    setSelectedPresetId(presetId);
    setDetail(null);
    setLocalError(null);
    versionRequests.current.cancelCurrent();
    const latestDataset = latestDatasetRef.current;
    if (presetChanged && (latestDataset.dataset_preset || latestDataset.folder_path !== '')) {
      const { dataset_preset: _removed, ...pendingDataset } = latestDataset;
      emitChange({ ...pendingDataset, folder_path: '', resolved_mask_available: undefined });
    }
    const request = presetRequests.current.begin();
    setLoadingDetail(true);
    try {
      const result = await loadPreset(presetId);
      if (!request.isCurrent()) return;
      setDetail(result);
    } catch (cause) {
      if (!request.isCurrent()) return;
      setLocalError(cause instanceof Error ? cause.message : 'Unable to load dataset preset');
    } finally {
      if (request.isCurrent()) setLoadingDetail(false);
    }
  };

  const chooseVersion = async (versionId: string) => {
    if (!detail || detail.archived_at !== null) return;
    if (
      latestDatasetRef.current.dataset_preset?.preset_id === detail.id &&
      latestDatasetRef.current.dataset_preset.version_id === versionId
    ) return;
    const request = versionRequests.current.begin();
    setLoadingVersion(true);
    setLocalError(null);
    try {
      const version = await loadVersion(versionId);
      if (!request.isCurrent()) return;
      if (version.preset_id !== detail.id) throw new Error('Dataset preset version does not belong to this preset');
      emitChange(applyPresetVersion(latestDatasetRef.current, detail, version));
    } catch (cause) {
      if (!request.isCurrent()) return;
      setLocalError(cause instanceof Error ? cause.message : 'Unable to load dataset preset version');
    } finally {
      if (request.isCurrent()) setLoadingVersion(false);
    }
  };

  const switchToLive = () => {
    if (mode === 'live' && !dataset.dataset_preset) return;
    presetRequests.current.cancelCurrent();
    versionRequests.current.cancelCurrent();
    maskStatusRequests.current.cancelCurrent();
    setMode('live');
    setSelectedPresetId('');
    setDetail(null);
    setLocalError(null);
    const { dataset_preset: _removed, ...liveDataset } = dataset;
    emitChange({ ...liveDataset, folder_path: '', resolved_mask_available: undefined });
  };

  const switchToPreset = () => {
    if (mode === 'preset') return;
    presetRequests.current.cancelCurrent();
    versionRequests.current.cancelCurrent();
    maskStatusRequests.current.cancelCurrent();
    setMode('preset');
    setSelectedPresetId('');
    setDetail(null);
    setLocalError(null);
    const { dataset_preset: _removed, ...pendingDataset } = latestDatasetRef.current;
    emitChange({ ...pendingDataset, folder_path: '', resolved_mask_available: undefined });
  };

  return (
    <div className="space-y-2" aria-label="Dataset source">
      <div className="flex gap-2" role="group" aria-label="Dataset source type">
        <button
          type="button"
          aria-pressed={mode === 'live'}
          className="rounded px-2 py-1 text-xs bg-gray-700 aria-pressed:bg-blue-600"
          onClick={switchToLive}
        >
          Live folder
        </button>
        <button
          type="button"
          aria-pressed={mode === 'preset'}
          className="rounded px-2 py-1 text-xs bg-gray-700 aria-pressed:bg-blue-600"
          onClick={switchToPreset}
        >
          Saved preset
        </button>
      </div>

      {mode === 'live' ? (
        <SelectInput
          label="Target Dataset"
          value={dataset.folder_path}
          onChange={value => emitChange({ ...dataset, folder_path: value, resolved_mask_available: undefined })}
          options={liveOptions}
        />
      ) : (
        <>
          <SelectInput
            label="Dataset preset"
            value={selectedPresetId}
            onChange={choosePreset}
            options={presetOptions}
            disabled={historicalArchived || status === 'loading'}
          />
          {detail && (
            <SelectInput
              label="Preset version"
              value={dataset.dataset_preset?.preset_id === detail.id ? dataset.dataset_preset.version_id : ''}
              onChange={chooseVersion}
              options={versionOptions}
              disabled={historicalArchived || loadingVersion}
            />
          )}
          {historicalArchived && dataset.dataset_preset && (
            <p className="text-xs text-amber-400" role="status">
              {dataset.dataset_preset.preset_name} — Version {dataset.dataset_preset.version} is archived and is shown read-only.
            </p>
          )}
          {(loadingDetail || loadingVersion) && <p className="text-xs text-gray-400">Loading preset…</p>}
          {(localError || error) && <p className="text-xs text-red-400" role="alert">{localError ?? error}</p>}
        </>
      )}
      <div className="space-y-2 rounded border border-gray-700 p-2" aria-label="Dataset mask settings">
        <p className="text-xs text-gray-400">
          Mask path: {dataset.mask_path || (dataset.dataset_preset
            ? 'Resolved by server when saved'
            : dataset.resolved_mask_available
              ? 'Matching sibling masks found (path resolved by server when saved)'
              : 'No matching masks resolved')}
        </p>
        <NumberInput
          label="Mask minimum value"
          value={dataset.mask_min_value}
          min={0}
          max={1}
          onChange={value => value !== null && emitChange({ ...dataset, mask_min_value: value })}
        />
        <Checkbox
          label="Invert mask"
          checked={dataset.invert_mask ?? false}
          onChange={value => emitChange({ ...dataset, invert_mask: value })}
        />
      </div>
    </div>
  );
}
