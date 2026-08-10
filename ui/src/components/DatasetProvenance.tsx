'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobDatasetPresetUsageView } from '@/types';
import { requestDatasetPresetJson, type DatasetPresetVersionDetail } from '@/hooks/useDatasetPresets';

interface DatasetProvenanceProps {
  usages: JobDatasetPresetUsageView[];
}

type DetailState =
  | { status: 'pending' }
  | { status: 'success'; detail: DatasetPresetVersionDetail }
  | { status: 'error'; message: string };

const MAX_ERROR_LENGTH = 240;

export function formatDatasetPresetBytes(value: string): string {
  if (!/^\d+$/.test(value)) return 'Unknown size';
  try {
    return `${BigInt(value).toLocaleString('en-US')} bytes`;
  } catch {
    return 'Unknown size';
  }
}

function boundedError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unable to load version details';
  return message.length <= MAX_ERROR_LENGTH ? message : `${message.slice(0, MAX_ERROR_LENGTH - 1)}…`;
}

function checksumLabel(checksum: string): string {
  return checksum.length > 21 ? `${checksum.slice(0, 12)}…${checksum.slice(-8)}` : checksum;
}

function settingValue(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null) return 'null';
  if (typeof value === 'string') return value === '' ? '(empty)' : value;
  return String(value);
}

function createdLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date);
}

export default function DatasetProvenance({ usages }: DatasetProvenanceProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const mounted = useRef(true);
  const pending = useRef(new Map<string, Promise<DatasetPresetVersionDetail>>());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadDetail = (versionId: string) => {
    const current = details[versionId];
    if (current?.status === 'success' || current?.status === 'pending') return;
    setDetails(previous => ({ ...previous, [versionId]: { status: 'pending' } }));
    let request = pending.current.get(versionId);
    if (!request) {
      request = requestDatasetPresetJson<DatasetPresetVersionDetail>(
        `/api/dataset-preset-versions/${encodeURIComponent(versionId)}`,
      );
      pending.current.set(versionId, request);
    }
    void request.then(
      detail => {
        pending.current.delete(versionId);
        if (mounted.current) setDetails(previous => ({ ...previous, [versionId]: { status: 'success', detail } }));
      },
      error => {
        pending.current.delete(versionId);
        if (mounted.current) {
          setDetails(previous => ({ ...previous, [versionId]: { status: 'error', message: boundedError(error) } }));
        }
      },
    );
  };

  if (usages.length === 0) {
    return <p className="text-sm text-gray-400">No saved dataset preset provenance for this job.</p>;
  }

  const ordered = [...usages].sort((left, right) => left.dataset_index - right.dataset_index);
  return (
    <section aria-labelledby="dataset-provenance-title" className="space-y-2">
      <h3 id="dataset-provenance-title" className="text-sm font-medium text-gray-200">
        Dataset provenance
      </h3>
      {ordered.map(usage => {
        const cardKey = `${usage.dataset_index}:${usage.preset_version_id}`;
        const isExpanded = expanded.has(cardKey);
        const state = details[usage.preset_version_id];
        const detailId = `dataset-provenance-${usage.dataset_index}-${usage.preset_version_id}`;
        const authoritative = state?.status === 'success' ? state.detail : null;
        const checksumMatches = authoritative?.manifest_sha256 === usage.manifest_sha256;
        return (
          <article
            key={cardKey}
            data-dataset-index={usage.dataset_index}
            className="rounded-lg border border-gray-700 bg-gray-950/50 px-3 py-2"
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={detailId}
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => {
                setExpanded(previous => {
                  const next = new Set(previous);
                  if (next.has(cardKey)) next.delete(cardKey);
                  else next.add(cardKey);
                  return next;
                });
                if (!isExpanded) loadDetail(usage.preset_version_id);
              }}
            >
              <span>
                <span className="text-xs text-gray-400">Dataset {usage.dataset_index + 1}</span>{' '}
                <span className="text-sm font-medium text-gray-100">{usage.preset_name}</span>{' '}
                <span className="text-xs text-gray-400">Version {usage.preset_version}</span>
              </span>
              <span className="text-xs text-gray-400">
                Integrity:{' '}
                {authoritative
                  ? checksumMatches
                    ? 'Manifest loaded; full verification not run'
                    : 'Recorded checksum mismatch'
                  : 'Not verified'}
              </span>
            </button>
            {isExpanded && (
              <div id={detailId} className="mt-3 border-t border-gray-800 pt-3 text-xs text-gray-300">
                {(!state || state.status === 'pending') && <p aria-live="polite">Loading version details…</p>}
                {state?.status === 'error' && (
                  <p role="alert" className="text-red-400">
                    {state.message}
                  </p>
                )}
                {authoritative && (
                  <>
                    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-gray-500">Source dataset</dt>
                        <dd>{authoritative.source_dataset}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Media</dt>
                        <dd>{authoritative.media_count}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Storage</dt>
                        <dd>{formatDatasetPresetBytes(authoritative.total_bytes)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Created</dt>
                        <dd title={authoritative.created_at}>{createdLabel(authoritative.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Manifest checksum</dt>
                        <dd title={authoritative.manifest_sha256}>{checksumLabel(authoritative.manifest_sha256)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Note</dt>
                        <dd>{authoritative.note || 'None'}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <h4 className="text-gray-400">Resolved loader settings</h4>
                      <dl className="mt-1 grid gap-x-4 sm:grid-cols-2">
                        {Object.entries(usage.resolved_loader_config)
                          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2 border-b border-gray-800 py-1">
                              <dt>{key}</dt>
                              <dd className="text-right text-gray-100">{settingValue(value)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
