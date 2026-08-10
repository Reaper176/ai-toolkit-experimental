'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Checkbox, CreatableSelectInput, NumberInput, TextAreaInput, TextInput } from '@/components/formInputs';
import {
  DATASET_PRESET_NOTE_MAX,
  normalizePresetName,
  validateLoaderConfig,
  type DatasetPresetLoaderConfig,
} from '@/helpers/datasetPresetValidation';
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
  captionDropoutRate: number | null;
  shuffleTokens: boolean;
  numRepeats: number | null;
  resolution: string;
  isReg: boolean;
  networkWeight: number | null;
  cacheLatentsToDisk: boolean;
  flipX: boolean;
  flipY: boolean;
  numFrames: number | null;
  shrinkVideoToFrames: boolean;
  fps: number | null;
  autoFrameCount: boolean;
  doI2v: boolean;
  doAudio: boolean;
  audioNormalize: boolean;
  audioPreservePitch: boolean;
  controls: string;
};

type NumericField = 'captionDropoutRate' | 'numRepeats' | 'networkWeight' | 'numFrames' | 'fps';

function initialForm(values: DatasetPresetDialogInitialValues): FormState {
  const loader = values.loaderConfig;
  return {
    name: values.name,
    note: values.note,
    captionExt: values.captionExt,
    defaultCaption: loader.default_caption,
    captionDropoutRate: loader.caption_dropout_rate,
    shuffleTokens: loader.shuffle_tokens,
    numRepeats: loader.num_repeats,
    resolution: loader.resolution.join(', '),
    isReg: loader.is_reg,
    networkWeight: loader.network_weight,
    cacheLatentsToDisk: loader.cache_latents_to_disk,
    flipX: loader.flip_x,
    flipY: loader.flip_y,
    numFrames: loader.num_frames,
    shrinkVideoToFrames: loader.shrink_video_to_frames,
    fps: loader.fps,
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

function validateForm(
  form: FormState,
  requireName: boolean,
  emptyNumericFields: ReadonlySet<NumericField>,
): { errors: Record<string, string>; name?: string; loader?: DatasetPresetLoaderConfig } {
  const errors: Record<string, string> = {};
  let name: string | undefined;
  if (requireName) {
    try {
      name = normalizePresetName(form.name).name;
    } catch (cause) {
      errors.name = cause instanceof Error ? cause.message : 'Preset name is invalid';
    }
  }
  if (form.note.length > DATASET_PRESET_NOTE_MAX) {
    errors.note = `Version note must be at most ${DATASET_PRESET_NOTE_MAX} characters`;
  }
  const resolution = form.resolution
    .split(',')
    .map(item => Number(item.trim()))
    .filter((_, index, values) => !(values.length === 1 && form.resolution.trim() === ''));
  const untrustedLoader = {
    caption_ext: form.captionExt,
    default_caption: form.defaultCaption,
    caption_dropout_rate: emptyNumericFields.has('captionDropoutRate') ? null : form.captionDropoutRate,
    shuffle_tokens: form.shuffleTokens,
    num_repeats: emptyNumericFields.has('numRepeats') ? null : form.numRepeats,
    resolution,
    is_reg: form.isReg,
    network_weight: emptyNumericFields.has('networkWeight') ? null : form.networkWeight,
    cache_latents_to_disk: form.cacheLatentsToDisk,
    flip_x: form.flipX,
    flip_y: form.flipY,
    num_frames: emptyNumericFields.has('numFrames') ? null : form.numFrames,
    shrink_video_to_frames: form.shrinkVideoToFrames,
    fps: emptyNumericFields.has('fps') ? null : form.fps,
    auto_frame_count: form.autoFrameCount,
    do_i2v: form.doI2v,
    do_audio: form.doAudio,
    audio_normalize: form.audioNormalize,
    audio_preserve_pitch: form.audioPreservePitch,
    controls: form.controls
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
  };
  let loader: DatasetPresetLoaderConfig | undefined;
  try {
    loader = validateLoaderConfig(untrustedLoader);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Loader configuration is invalid';
    const fieldMap: Array<[string, keyof FormState]> = [
      ['caption_ext', 'captionExt'],
      ['default_caption', 'defaultCaption'],
      ['caption_dropout_rate', 'captionDropoutRate'],
      ['shuffle_tokens', 'shuffleTokens'],
      ['num_repeats', 'numRepeats'],
      ['resolution', 'resolution'],
      ['is_reg', 'isReg'],
      ['network_weight', 'networkWeight'],
      ['cache_latents_to_disk', 'cacheLatentsToDisk'],
      ['flip_x', 'flipX'],
      ['flip_y', 'flipY'],
      ['num_frames', 'numFrames'],
      ['shrink_video_to_frames', 'shrinkVideoToFrames'],
      ['fps', 'fps'],
      ['auto_frame_count', 'autoFrameCount'],
      ['do_i2v', 'doI2v'],
      ['do_audio', 'doAudio'],
      ['audio_normalize', 'audioNormalize'],
      ['audio_preserve_pitch', 'audioPreservePitch'],
      ['controls', 'controls'],
    ];
    const matched = fieldMap.find(([canonical]) => message.includes(canonical));
    errors[matched?.[1] ?? 'loaderConfig'] = message;
  }
  return Object.keys(errors).length ? { errors } : { errors, name, loader };
}

export default function DatasetPresetDialog(props: DatasetPresetDialogProps) {
  const [form, setForm] = useState(() => initialForm(props.initialValues));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [responseError, setResponseError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState<SavedDatasetPresetVersion | null>(null);
  const [emptyNumericFields, setEmptyNumericFields] = useState<Set<NumericField>>(() => new Set());
  const pendingRef = useRef(false);

  useEffect(() => {
    if (props.isOpen) {
      setForm(initialForm(props.initialValues));
      setFieldErrors({});
      setResponseError(null);
      setPending(false);
      setPublished(null);
      setEmptyNumericFields(new Set());
      pendingRef.current = false;
    }
  }, [props.isOpen, props.initialValues]);

  const retainedPaths = useMemo(() => normalizedUnique(props.retainedPaths), [props.retainedPaths]);
  const retainedKeys = useMemo(() => new Set(retainedPaths.map(path => path.toLowerCase())), [retainedPaths]);
  const selectedPaths = useMemo(
    () => normalizedUnique(props.selectedPaths).filter(path => !retainedKeys.has(path.toLowerCase())),
    [props.selectedPaths, retainedKeys],
  );
  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm(current => ({ ...current, [key]: value }));
  const setNumericPresence = (key: NumericField, hasValue: boolean) =>
    setEmptyNumericFields(current => {
      const next = new Set(current);
      if (hasValue) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pendingRef.current || (!published && selectedPaths.length + retainedPaths.length === 0)) return;
    pendingRef.current = true;
    setPending(true);
    props.onPendingChange?.(true);
    setResponseError(null);
    const finalize = async (saved: SavedDatasetPresetVersion) => {
      try {
        await props.onSaved(saved);
        props.onClose();
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Unable to refresh the published preset';
        setResponseError(`Preset was published successfully, but finalization failed: ${detail}`);
      }
    };
    if (published) {
      try {
        await finalize(published);
      } finally {
        pendingRef.current = false;
        setPending(false);
        props.onPendingChange?.(false);
      }
      return;
    }
    const validation = validateForm(form, props.mode === 'create', emptyNumericFields);
    const captionExtensionChangedWithRetainedFiles =
      props.mode === 'version' &&
      retainedPaths.length > 0 &&
      form.captionExt.replace(/^\./, '') !== props.initialValues.loaderConfig.caption_ext.replace(/^\./, '');
    const nextFieldErrors = captionExtensionChangedWithRetainedFiles
      ? {
          ...validation.errors,
          captionExt: 'Caption extension cannot change while files are retained from the base version.',
        }
      : validation.errors;
    setFieldErrors(nextFieldErrors);
    if (!validation.loader || captionExtensionChangedWithRetainedFiles) {
      pendingRef.current = false;
      setPending(false);
      props.onPendingChange?.(false);
      return;
    }
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
          body: JSON.stringify({ name: validation.name, ...common }),
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
      setPublished(saved);
      await finalize(saved);
    } catch (cause) {
      setResponseError(cause instanceof Error ? cause.message : 'Unable to save dataset preset');
    } finally {
      pendingRef.current = false;
      setPending(false);
      props.onPendingChange?.(false);
    }
  };
  const formDisabled = pending || published !== null;
  const recoveryLocked = published !== null;

  const errorProps = (key: keyof FormState) => ({
    id: `dataset-preset-${String(key)}`,
    ariaInvalid: Boolean(fieldErrors[String(key)]),
    ariaDescribedBy: fieldErrors[String(key)] ? `dataset-preset-${String(key)}-error` : undefined,
  });
  const FieldError = ({ field }: { field: keyof FormState }) =>
    fieldErrors[String(field)] ? (
      <p id={`dataset-preset-${String(field)}-error`} role="alert" className="text-xs text-red-400">
        {fieldErrors[String(field)]}
      </p>
    ) : null;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={pending || recoveryLocked ? () => undefined : props.onClose}
      title={props.mode === 'create' ? 'Save dataset preset' : `Save new version of ${props.presetName}`}
      size="xl"
      showCloseButton={!recoveryLocked}
      closeOnOverlayClick={!pending && !recoveryLocked}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-400">
          {selectedPaths.length + retainedPaths.length} images will be frozen from {props.sourceDataset}.
        </p>
        {props.mode === 'create' && (
          <div>
            <TextInput
              label="Preset name"
              value={form.name}
              onChange={value => setField('name', value)}
              disabled={formDisabled}
              {...errorProps('name')}
            />
            <FieldError field="name" />
          </div>
        )}
        <div>
          <TextAreaInput
            label="Version note"
            value={form.note}
            onChange={value => setField('note', value)}
            disabled={formDisabled}
            {...errorProps('note')}
          />
          <FieldError field="note" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <CreatableSelectInput
              label="Caption extension"
              value={form.captionExt}
              onChange={value => setField('captionExt', value)}
              disabled={formDisabled}
              options={[
                { value: 'txt', label: 'txt' },
                { value: 'json', label: 'json' },
                { value: 'caption', label: 'caption' },
              ]}
              {...errorProps('captionExt')}
            />
            <FieldError field="captionExt" />
          </div>
          <div>
            <TextInput
              label="Default caption"
              value={form.defaultCaption}
              onChange={value => setField('defaultCaption', value)}
              disabled={formDisabled}
              {...errorProps('defaultCaption')}
            />
            <FieldError field="defaultCaption" />
          </div>
          <div>
            <NumberInput
              label="Caption dropout rate"
              value={form.captionDropoutRate}
              onChange={value => setField('captionDropoutRate', value)}
              onValuePresenceChange={hasValue => setNumericPresence('captionDropoutRate', hasValue)}
              disabled={formDisabled}
              {...errorProps('captionDropoutRate')}
            />
            <FieldError field="captionDropoutRate" />
          </div>
          <div>
            <NumberInput
              label="Number of repeats"
              value={form.numRepeats}
              onChange={value => setField('numRepeats', value)}
              onValuePresenceChange={hasValue => setNumericPresence('numRepeats', hasValue)}
              disabled={formDisabled}
              {...errorProps('numRepeats')}
            />
            <FieldError field="numRepeats" />
          </div>
          <div>
            <TextInput
              label="Resolution"
              value={form.resolution}
              onChange={value => setField('resolution', value)}
              disabled={formDisabled}
              {...errorProps('resolution')}
            />
            <FieldError field="resolution" />
          </div>
          <div>
            <NumberInput
              label="Network weight"
              value={form.networkWeight}
              onChange={value => setField('networkWeight', value)}
              onValuePresenceChange={hasValue => setNumericPresence('networkWeight', hasValue)}
              disabled={formDisabled}
              {...errorProps('networkWeight')}
            />
            <FieldError field="networkWeight" />
          </div>
          <div>
            <NumberInput
              label="Number of frames"
              value={form.numFrames}
              onChange={value => setField('numFrames', value)}
              onValuePresenceChange={hasValue => setNumericPresence('numFrames', hasValue)}
              disabled={formDisabled}
              {...errorProps('numFrames')}
            />
            <FieldError field="numFrames" />
          </div>
          <div>
            <NumberInput
              label="Frames per second"
              value={form.fps}
              onChange={value => setField('fps', value)}
              onValuePresenceChange={hasValue => setNumericPresence('fps', hasValue)}
              disabled={formDisabled}
              {...errorProps('fps')}
            />
            <FieldError field="fps" />
          </div>
          <div>
            <TextInput
              label="Controls"
              value={form.controls}
              onChange={value => setField('controls', value)}
              disabled={formDisabled}
              {...errorProps('controls')}
            />
            <FieldError field="controls" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Checkbox
            label="Shuffle tokens"
            checked={form.shuffleTokens}
            onChange={value => setField('shuffleTokens', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Regularization dataset"
            checked={form.isReg}
            onChange={value => setField('isReg', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Cache latents to disk"
            checked={form.cacheLatentsToDisk}
            onChange={value => setField('cacheLatentsToDisk', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Flip horizontally"
            checked={form.flipX}
            onChange={value => setField('flipX', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Flip vertically"
            checked={form.flipY}
            onChange={value => setField('flipY', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Shrink video to frames"
            checked={form.shrinkVideoToFrames}
            onChange={value => setField('shrinkVideoToFrames', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Automatic frame count"
            checked={form.autoFrameCount}
            onChange={value => setField('autoFrameCount', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Image to video"
            checked={form.doI2v}
            onChange={value => setField('doI2v', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Process audio"
            checked={form.doAudio}
            onChange={value => setField('doAudio', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Normalize audio"
            checked={form.audioNormalize}
            onChange={value => setField('audioNormalize', value)}
            disabled={formDisabled}
          />
          <Checkbox
            label="Preserve audio pitch"
            checked={form.audioPreservePitch}
            onChange={value => setField('audioPreservePitch', value)}
            disabled={formDisabled}
          />
        </div>
        {responseError && (
          <p role="alert" className="text-sm text-red-400">
            {responseError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={recoveryLocked ? undefined : props.onClose}
            disabled={pending || recoveryLocked}
            className="rounded bg-gray-700 px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={(!published && selectedPaths.length === 0 && retainedPaths.length === 0) || pending}
            className="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          >
            {pending
              ? published
                ? 'Retrying…'
                : 'Saving…'
              : published
                ? 'Retry refresh'
                : props.mode === 'create'
                  ? 'Save preset'
                  : 'Save version'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
