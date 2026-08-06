export function resolveGpuIds(value: unknown, mac: boolean): string | null {
  if (mac) return 'mps';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
