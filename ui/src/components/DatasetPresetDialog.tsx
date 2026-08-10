'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import type { DatasetPresetLoaderConfig } from '@/helpers/datasetPresets';
import { normalizeRelativeMediaPath } from '@/helpers/datasetSelection';
import {
  requestDatasetPresetJson,
  type DatasetPresetDetail,
  type DatasetPresetVersionRecord,
} from '@/hooks/useDatasetPresets';

export const DEFAULT_DATASET_PRESET_LOADER_CONFIG: DatasetPresetLoaderConfig = {
  caption_ext: 'txt',
  default_caption: '',
  caption_dropout_rate: 0,
  shuffle_tokens: false,
  num_repeats: 1,
  resolution: [512],
  is_reg: false,
  network_weight: 1,
  cache_latents_to_disk: false,
  flip_x: false,
  flip_y: false,
  num_frames: 1,
  shrink_video_to_frames: false,
  fps: 1,
  auto_frame_count: false,
  do_i2v: false,
  do_audio: false,
  audio_normalize: false,
  audio_preserve_pitch: false,
  controls: [],
};

export interface DatasetPresetDialogInitialValues {
  name: string;
  note: string;
  captionExt: string;
  loaderConfig: DatasetPresetLoaderConfig;
}

export interface SavedDatasetPresetVersion {
  presetId: string;
  presetName: string;
  version: DatasetPresetVersionRecord;
}

interface CommonProps {
  isOpen: boolean;
  sourceDataset: string;
  selectedPaths: readonly string[];
  retainedPaths: readonly string[];
  initialValues: DatasetPresetDialogInitialValues;
  onClose(): void;
  onSaved(saved: SavedDatasetPresetVersion): Promise<void> | void;
  onPendingChange?(pending: boolean): void;
}

type DatasetPresetDialogProps = CommonProps &
  ({ mode: 'create' } | { mode: 'version'; presetId: string; presetName: string; baseVersionId: string });

type FormState = {
  name: string;
  note: string;
  captionExt: string;
  defaultCaption: string;
  captionDropoutRate: string;
  shuffleTokens: boolean;
  numRepeats: string;
  resolution: string;
  isReg: boolean;
  networkWeight: string;
  cacheLatentsToDisk: boolean;
  flipX: boolean;
  flipY: boolean;
  numFrames: string;
  shrinkVideoToFrames: boolean;
  fps: string;
  autoFrameCount: boolean;
  doI2v: boolean;
  doAudio: boolean;
  audioNormalize: boolean;
  audioPreservePitch: boolean;
  controls: string;
};

function initialForm(values: DatasetPresetDialogInitialValues): FormState {
  const loader = values.loaderConfig;
  return {
    name: values.name,
    note: values.note,
    captionExt: values.captionExt,
    defaultCaption: loader.default_caption,
    captionDropoutRate: String(loader.caption_dropout_rate),
    shuffleTokens: loader.shuffle_tokens,
    numRepeats: String(loader.num_repeats),
    resolution: loader.resolution.join(', '),
    isReg: loader.is_reg,
    networkWeight: String(loader.network_weight),
    cacheLatentsToDisk: loader.cache_latents_to_disk,
    flipX: loader.flip_x,
    flipY: loader.flip_y,
    numFrames: String(loader.num_frames),
    shrinkVideoToFrames: loader.shrink_video_to_frames,
    fps: String(loader.fps),
    autoFrameCount: loader.auto_frame_count,
    doI2v: loader.do_i2v,
    doAudio: loader.do_audio,
    audioNormalize: loader.audio_normalize,
    audioPreservePitch: loader.audio_preserve_pitch,
    controls: loader.controls.join(', '),
  };
}

function normalizedUnique(paths: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const normalized = normalizeRelativeMediaPath(path);
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function positiveInteger(value: string, label: string, errors: Record<string, string>, key: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) errors[key] = `${label} must be a positive integer`;
  return number;
}

function validateForm(
  form: FormState,
  requireName: boolean,
): { errors: Record<string, string>; loader?: DatasetPresetLoaderConfig } {
  const errors: Record<string, string> = {};
  if (requireName && !form.name.trim()) errors.name = 'Preset name is required';
  if (form.name.trim().length > 80) errors.name = 'Preset name must be at most 80 characters';
  if (form.note.length > 500) errors.note = 'Version note must be at most 500 characters';
  if (!/^\.?[A-Za-z0-9_-]{1,32}$/.test(form.captionExt)) errors.captionExt = 'Caption extension is invalid';
  const dropout = Number(form.captionDropoutRate);
  if (!Number.isFinite(dropout) || dropout < 0 || dropout > 1)
    errors.captionDropoutRate = 'Caption dropout rate must be between 0 and 1';
  const networkWeight = Number(form.networkWeight);
  if (!Number.isFinite(networkWeight)) errors.networkWeight = 'Network weight must be a number';
  const resolution = form.resolution
    .split(',')
    .map(item => Number(item.trim()))
    .filter((_, index, values) => !(values.length === 1 && form.resolution.trim() === ''));
  if (!resolution.length || resolution.some(value => !Number.isSafeInteger(value) || value <= 0))
    errors.resolution = 'Resolution must contain positive integers';
  const numRepeats = positiveInteger(form.numRepeats, 'Number of repeats', errors, 'numRepeats');
  const numFrames = positiveInteger(form.numFrames, 'Number of frames', errors, 'numFrames');
  const fps = positiveInteger(form.fps, 'Frames per second', errors, 'fps');
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    loader: {
      caption_ext: form.captionExt,
      default_caption: form.defaultCaption,
      caption_dropout_rate: dropout,
      shuffle_tokens: form.shuffleTokens,
      num_repeats: numRepeats,
      resolution,
      is_reg: form.isReg,
      network_weight: networkWeight,
      cache_latents_to_disk: form.cacheLatentsToDisk,
      flip_x: form.flipX,
      flip_y: form.flipY,
      num_frames: numFrames,
      shrink_video_to_frames: form.shrinkVideoToFrames,
      fps,
      auto_frame_count: form.autoFrameCount,
      do_i2v: form.doI2v,
      do_audio: form.doAudio,
      audio_normalize: form.audioNormalize,
      audio_preserve_pitch: form.audioPreservePitch,
      controls: form.controls
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    },
  };
}

export default function DatasetPresetDialog(props: DatasetPresetDialogProps) {
  const [form, setForm] = useState(() => initialForm(props.initialValues));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [responseError, setResponseError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (props.isOpen) {
      setForm(initialForm(props.initialValues));
      setFieldErrors({});
      setResponseError(null);
      setPending(false);
      pendingRef.current = false;
    }
  }, [props.isOpen, props.initialValues]);

  const retainedPaths = useMemo(() => normalizedUnique(props.retainedPaths), [props.retainedPaths]);
  const retainedKeys = useMemo(() => new Set(retainedPaths.map(path => path.toLowerCase())), [retainedPaths]);
  const selectedPaths = useMemo(
    () => normalizedUnique(props.selectedPaths).filter(path => !retainedKeys.has(path.toLowerCase())),
    [props.selectedPaths, retainedKeys],
  );
  const setText = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(current => ({ ...current, [key]: event.target.value }));
  const setBool = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm(current => ({ ...current, [key]: event.target.checked }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pendingRef.current || selectedPaths.length + retainedPaths.length === 0) return;
    const validation = validateForm(form, props.mode === 'create');
    setFieldErrors(validation.errors);
    if (!validation.loader) return;
    pendingRef.current = true;
    setPending(true);
    props.onPendingChange?.(true);
    setResponseError(null);
    try {
      const common = {
        source_dataset: props.sourceDataset,
        selected_paths: selectedPaths,
        caption_ext: form.captionExt,
        loader_config: validation.loader,
        note: form.note.trim() || null,
      };
      let saved: SavedDatasetPresetVersion;
      if (props.mode === 'create') {
        const detail = await requestDatasetPresetJson<DatasetPresetDetail>('/api/dataset-presets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), ...common }),
        });
        const version = detail.versions.reduce((latest, item) => (item.version > latest.version ? item : latest));
        saved = { presetId: detail.id, presetName: detail.name, version };
      } else {
        const version = await requestDatasetPresetJson<DatasetPresetVersionRecord>(
          `/api/dataset-presets/${encodeURIComponent(props.presetId)}/versions`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...common, retained_paths: retainedPaths, base_version_id: props.baseVersionId }),
          },
        );
        saved = { presetId: props.presetId, presetName: props.presetName, version };
      }
      await props.onSaved(saved);
      props.onClose();
    } catch (cause) {
      setResponseError(cause instanceof Error ? cause.message : 'Unable to save dataset preset');
    } finally {
      pendingRef.current = false;
      setPending(false);
      props.onPendingChange?.(false);
    }
  };

  const field = (label: string, key: keyof FormState, type: 'text' | 'number' = 'text') => (
    <label className="block text-sm text-gray-200">
      {label}
      <input
        aria-invalid={Boolean(fieldErrors[String(key)])}
        type={type}
        value={String(form[key])}
        onChange={setText(key)}
        disabled={pending}
        className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
      />
      {fieldErrors[String(key)] && (
        <span role="alert" className="block text-xs text-red-400">
          {fieldErrors[String(key)]}
        </span>
      )}
    </label>
  );
  const check = (label: string, key: keyof FormState) => (
    <label className="flex items-center gap-2 text-sm text-gray-200">
      <input type="checkbox" checked={Boolean(form[key])} onChange={setBool(key)} disabled={pending} />
      {label}
    </label>
  );

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={pending ? () => undefined : props.onClose}
      title={props.mode === 'create' ? 'Save dataset preset' : `Save new version of ${props.presetName}`}
      size="xl"
      closeOnOverlayClick={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-400">
          {selectedPaths.length + retainedPaths.length} images will be frozen from {props.sourceDataset}.
        </p>
        {props.mode === 'create' && field('Preset name', 'name')}
        <label className="block text-sm text-gray-200">
          Version note
          <textarea
            value={form.note}
            onChange={setText('note')}
            disabled={pending}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1"
          />
          {fieldErrors.note && (
            <span role="alert" className="block text-xs text-red-400">
              {fieldErrors.note}
            </span>
          )}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('Caption extension', 'captionExt')}
          {field('Default caption', 'defaultCaption')}
          {field('Caption dropout rate', 'captionDropoutRate', 'number')}
          {field('Number of repeats', 'numRepeats', 'number')}
          {field('Resolution', 'resolution')}
          {field('Network weight', 'networkWeight', 'number')}
          {field('Number of frames', 'numFrames', 'number')}
          {field('Frames per second', 'fps', 'number')}
          {field('Controls', 'controls')}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {check('Shuffle tokens', 'shuffleTokens')}
          {check('Regularization dataset', 'isReg')}
          {check('Cache latents to disk', 'cacheLatentsToDisk')}
          {check('Flip horizontally', 'flipX')}
          {check('Flip vertically', 'flipY')}
          {check('Shrink video to frames', 'shrinkVideoToFrames')}
          {check('Automatic frame count', 'autoFrameCount')}
          {check('Image to video', 'doI2v')}
          {check('Process audio', 'doAudio')}
          {check('Normalize audio', 'audioNormalize')}
          {check('Preserve audio pitch', 'audioPreservePitch')}
        </div>
        {responseError && (
          <p role="alert" className="text-sm text-red-400">
            {responseError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} disabled={pending} className="rounded bg-gray-700 px-3 py-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={(selectedPaths.length === 0 && retainedPaths.length === 0) || pending}
            className="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : props.mode === 'create' ? 'Save preset' : 'Save version'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
