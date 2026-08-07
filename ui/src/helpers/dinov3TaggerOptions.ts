export const DINOV3_CATEGORIES = [
  ['unassigned', 'Unassigned'],
  ['general', 'General'],
  ['artist', 'Artist'],
  ['contributor', 'Contributor'],
  ['copyright', 'Copyright'],
  ['character', 'Character'],
  ['species_meta', 'Species / Meta'],
  ['disambiguation', 'Disambiguation'],
  ['meta', 'Meta'],
  ['lore', 'Lore'],
] as const;

export const DEFAULT_DINOV3_INCLUDED_CATEGORIES = ['general', 'character', 'species_meta'] as const;

export function normalizeThreshold(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('Confidence threshold must be between 0 and 1');
  }
  return parsed;
}

export function normalizeTopK(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Top count must be a positive integer');
  }
  return parsed;
}

export function normalizeOptionalVocabPath(value: string | null | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

export function toggleCategory(categories: readonly string[], category: string, enabled: boolean): string[] {
  if (enabled) {
    return categories.includes(category) ? [...categories] : [...categories, category];
  }
  return categories.filter(value => value !== category);
}
