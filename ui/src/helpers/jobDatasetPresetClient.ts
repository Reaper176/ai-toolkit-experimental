import type { JobConfig } from '@/types';

export interface ClonePresetAvailability {
  id: string;
  archived_at: string | null;
}

export interface TrainingJobSaveRequestInput {
  runId: string | null;
  cloneId: string | null;
  name: string;
  gpuIds: string | null;
  jobConfig: JobConfig;
}

export function buildTrainingJobSaveRequest(input: TrainingJobSaveRequestInput) {
  const clone = Boolean(input.cloneId);
  return {
    id: clone ? null : input.runId,
    clone,
    name: input.name,
    gpu_ids: input.gpuIds,
    job_config: input.jobConfig,
  };
}

export async function removeArchivedPresetSourcesFromClone(
  jobConfig: JobConfig,
  loadPreset: (presetId: string) => Promise<ClonePresetAvailability>,
): Promise<JobConfig> {
  const datasets = jobConfig.config.process[0].datasets;
  const presetIds = [...new Set(datasets.flatMap(dataset => dataset.dataset_preset?.preset_id ?? []))];
  if (presetIds.length === 0) return jobConfig;
  const details = await Promise.all(presetIds.map(loadPreset));
  const archivedIds = new Set(details.filter(detail => detail.archived_at !== null).map(detail => detail.id));
  if (archivedIds.size === 0) return jobConfig;
  const nextDatasets = datasets.map(dataset => {
    if (!dataset.dataset_preset || !archivedIds.has(dataset.dataset_preset.preset_id)) return dataset;
    const { dataset_preset: _archivedPreset, ...liveDataset } = dataset;
    return { ...liveDataset, folder_path: '' };
  });
  const processes = jobConfig.config.process.map((process, index) =>
    index === 0 ? { ...process, datasets: nextDatasets } : process,
  );
  return { ...jobConfig, config: { ...jobConfig.config, process: processes } };
}

export function hasMissingDatasetSource(jobConfig: JobConfig): boolean {
  return jobConfig.config.process[0].datasets.some(
    dataset => !dataset.dataset_preset && (typeof dataset.folder_path !== 'string' || dataset.folder_path.trim() === ''),
  );
}

export function canSaveTrainingJob(presetReady: boolean, jobConfig: JobConfig): boolean {
  return presetReady && !hasMissingDatasetSource(jobConfig);
}
