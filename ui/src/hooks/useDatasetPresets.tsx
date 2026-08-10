'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatasetPresetLoaderConfig, DatasetPresetManifestV1 } from '@/helpers/datasetPresets';

export interface DatasetPresetSummary {
  id: string;
  name: string;
  archived_at: string | null;
  latest_version: number;
  version_count: number;
  media_count: number;
  total_bytes: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetPresetVersionRecord {
  id: string;
  preset_id: string;
  version: number;
  source_dataset: string;
  manifest_path: string;
  manifest_sha256: string;
  loader_config: DatasetPresetLoaderConfig;
  note: string | null;
  media_count: number;
  total_bytes: string;
  created_at: string;
}

export interface DatasetPresetVersionDetail extends DatasetPresetVersionRecord {
  manifest: DatasetPresetManifestV1;
}

export interface DatasetPresetDetail extends DatasetPresetSummary {
  versions: DatasetPresetVersionRecord[];
}

export interface UseDatasetPresetsResult {
  presets: DatasetPresetSummary[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  refresh(): Promise<void>;
  loadPreset(id: string): Promise<DatasetPresetDetail>;
  loadVersion(id: string): Promise<DatasetPresetVersionDetail>;
}

export interface DatasetPresetRequestIdentity {
  readonly signal: AbortSignal;
  isCurrent(): boolean;
  cancel(): void;
}

export function createLatestDatasetPresetRequestGate() {
  let current: AbortController | null = null;
  return {
    begin(): DatasetPresetRequestIdentity {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      return {
        signal: controller.signal,
        isCurrent: () => current === controller && !controller.signal.aborted,
        cancel: () => {
          controller.abort();
          if (current === controller) current = null;
        },
      };
    },
    cancelCurrent(): void {
      current?.abort();
      current = null;
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(response.ok ? 'Dataset preset response was not valid JSON' : `Request failed (${response.status})`);
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  return `Dataset preset request failed (${status})`;
}

export async function requestDatasetPresetJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(body, response.status));
  return body as T;
}

export default function useDatasetPresets(): UseDatasetPresetsResult {
  const [presets, setPresets] = useState<DatasetPresetSummary[]>([]);
  const [status, setStatus] = useState<UseDatasetPresetsResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestSequence = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequence.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (mountedRef.current) {
      setStatus('loading');
      setError(null);
    }
    try {
      const body = await requestDatasetPresetJson<{ presets: DatasetPresetSummary[] }>('/api/dataset-presets');
      if (!body || !Array.isArray(body.presets)) throw new Error('Dataset preset list response is malformed');
      if (mountedRef.current && sequence === requestSequence.current) {
        setPresets(body.presets);
        setStatus('success');
      }
    } catch (cause) {
      if (mountedRef.current && sequence === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load dataset presets');
        setStatus('error');
      }
      throw cause;
    }
  }, []);

  const loadPreset = useCallback(
    (id: string) => requestDatasetPresetJson<DatasetPresetDetail>(`/api/dataset-presets/${encodeURIComponent(id)}`),
    [],
  );
  const loadVersion = useCallback(
    (id: string) =>
      requestDatasetPresetJson<DatasetPresetVersionDetail>(`/api/dataset-preset-versions/${encodeURIComponent(id)}`),
    [],
  );

  return { presets, status, error, refresh, loadPreset, loadVersion };
}
