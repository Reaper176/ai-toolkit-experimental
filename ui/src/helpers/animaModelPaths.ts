type ModelWithAnimaPaths = {
  te_name_or_path?: string;
  vae_path?: string;
};

export function clearUnsupportedAnimaPaths<T extends ModelWithAnimaPaths>(model: T, supported: boolean): T {
  if (supported) return model;
  const cleaned = { ...model };
  delete cleaned.te_name_or_path;
  delete cleaned.vae_path;
  return cleaned;
}
