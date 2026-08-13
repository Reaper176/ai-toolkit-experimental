export interface MaskTrainingValidationInput {
  enabled?: boolean;
  multiplier?: number;
  trainTurbo?: boolean;
  datasets: ReadonlyArray<{ mask_path?: string | null }>;
}

export function validateMaskTrainingScalarSettings(input: Omit<MaskTrainingValidationInput, 'datasets'>): void {
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    throw new Error('Inverted mask prior enabled flag must be a boolean');
  }
  if (input.trainTurbo !== undefined && typeof input.trainTurbo !== 'boolean') {
    throw new Error('Turbo training flag must be a boolean');
  }
  if (input.multiplier !== undefined && typeof input.multiplier !== 'number') {
    throw new Error('Inverted mask prior multiplier must be a finite nonnegative number');
  }
  const multiplier = input.multiplier ?? 0.5;
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error('Inverted mask prior multiplier must be a finite nonnegative number');
  }
}

export function validateMaskTraining(input: MaskTrainingValidationInput): void {
  validateMaskTrainingScalarSettings(input);
  if (!input.enabled) return;
  if (!input.datasets.some(dataset => typeof dataset.mask_path === 'string' && dataset.mask_path.trim() !== '')) {
    throw new Error('Inverted mask prior requires at least one dataset with resolved masks');
  }
  if (input.trainTurbo) throw new Error('Inverted mask prior is incompatible with turbo training');
}
