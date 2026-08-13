export type DatasetMaskState = 'mask' | 'missing' | 'read-only';

export default function DatasetMaskBadge({ state }: { state: DatasetMaskState }) {
  const label = state === 'mask' ? 'Mask available' : state === 'read-only' ? 'Mask editing unavailable — archived preset' : 'No mask';
  return <span aria-label={label} title={label} className="rounded bg-gray-950/80 px-2 py-1 text-xs text-white">{label}</span>;
}
