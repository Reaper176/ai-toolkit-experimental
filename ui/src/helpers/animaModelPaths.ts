type ModelWithAnimaPaths = {
  te_name_or_path?: string;
  vae_path?: string;
};

const TEXT_ENCODER_PATH_SECTION = 'model.te_name_or_path';
const VAE_PATH_SECTION = 'model.vae_path';

export function clearUnsupportedAnimaPaths<T extends ModelWithAnimaPaths>(
  model: T,
  additionalSections: readonly string[] | undefined,
): T {
  const supportsTextEncoderPath = additionalSections?.includes(TEXT_ENCODER_PATH_SECTION) === true;
  const supportsVaePath = additionalSections?.includes(VAE_PATH_SECTION) === true;
  if (supportsTextEncoderPath && supportsVaePath) return model;

  const cleaned = { ...model };
  if (!supportsTextEncoderPath) delete cleaned.te_name_or_path;
  if (!supportsVaePath) delete cleaned.vae_path;
  return cleaned;
}

export function normalizeOptionalModelPath(value: string | null | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}
