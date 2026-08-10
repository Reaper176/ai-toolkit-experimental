'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SelectInput } from '@/components/formInputs';
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
}

function applyPresetVersion(
  dataset: DatasetConfig,
  preset: DatasetPresetDetail,
  version: DatasetPresetVersionDetail,
): DatasetConfig {
  const next = { ...dataset };
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
  };
  return next;
}

function datasetSourceSignature(dataset: DatasetConfig): string {
  const preset = dataset.dataset_preset;
  return preset
    ? `preset:${preset.preset_id}:${preset.version_id}`
    : `live:${typeof dataset.folder_path === 'string' ? dataset.folder_path : ''}`;
}

export default function DatasetSourceControl({ dataset, liveOptions, onChange }: DatasetSourceControlProps) {
  const { presets, status, error, refresh, loadPreset, loadVersion } = useDatasetPresets();
  const [mode, setMode] = useState<'live' | 'preset'>(() => (dataset.dataset_preset ? 'preset' : 'live'));
  const [selectedPresetId, setSelectedPresetId] = useState(dataset.dataset_preset?.preset_id ?? '');
  const [detail, setDetail] = useState<DatasetPresetDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const presetRequests = useRef(createLatestDatasetPresetRequestGate());
  const versionRequests = useRef(createLatestDatasetPresetRequestGate());
  const latestDatasetRef = useRef(dataset);
  latestDatasetRef.current = dataset;
  const sourceSignature = datasetSourceSignature(dataset);
  const previousSourceSignatureRef = useRef(sourceSignature);
  const emittedSourceSignatureRef = useRef<string | null>(null);

  const emitChange = (next: DatasetConfig) => {
    emittedSourceSignatureRef.current = datasetSourceSignature(next);
    onChange(next);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(
    () => () => {
      presetRequests.current.cancelCurrent();
      versionRequests.current.cancelCurrent();
    },
    [],
  );

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
    setSelectedPresetId(presetId);
    setDetail(null);
    setLocalError(null);
    versionRequests.current.cancelCurrent();
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
    setMode('live');
    setSelectedPresetId('');
    setDetail(null);
    setLocalError(null);
    const { dataset_preset: _removed, ...liveDataset } = dataset;
    emitChange({ ...liveDataset, folder_path: '' });
  };

  const switchToPreset = () => {
    if (mode === 'preset') return;
    presetRequests.current.cancelCurrent();
    versionRequests.current.cancelCurrent();
    setMode('preset');
    setSelectedPresetId('');
    setDetail(null);
    setLocalError(null);
    const { dataset_preset: _removed, ...pendingDataset } = latestDatasetRef.current;
    emitChange({ ...pendingDataset, folder_path: '' });
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
        <SelectInput label="Target Dataset" value={dataset.folder_path} onChange={value => emitChange({ ...dataset, folder_path: value })} options={liveOptions} />
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
    </div>
  );
}
