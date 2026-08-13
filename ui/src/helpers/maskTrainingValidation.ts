export interface MaskTrainingValidationInput {
  enabled?: boolean;
  multiplier?: number;
  trainTurbo?: boolean;
  datasets: ReadonlyArray<{ mask_path?: string | null }>;
}

export function validateMaskTraining(input: MaskTrainingValidationInput): void {
  const multiplier = input.multiplier ?? 0.5;
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error('Inverted mask prior multiplier must be a finite nonnegative number');
  }
  if (!input.enabled) return;
  if (!input.datasets.some(dataset => typeof dataset.mask_path === 'string' && dataset.mask_path.trim() !== '')) {
    throw new Error('Inverted mask prior requires at least one dataset with resolved masks');
  }
  if (input.trainTurbo) throw new Error('Inverted mask prior is incompatible with turbo training');
}
