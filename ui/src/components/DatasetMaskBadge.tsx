export type DatasetMaskState = 'mask' | 'missing' | 'read-only';

export interface DatasetMaskBadgeProps {
  state: DatasetMaskState;
  mode: 'edit' | 'preview';
  imagePath: string;
  onActivate(path: string): void;
}

export default function DatasetMaskBadge({ state, mode, imagePath, onActivate }: DatasetMaskBadgeProps) {
  const label = state === 'mask' ? 'Mask available' : state === 'read-only' ? 'Mask editing unavailable — archived preset' : 'No mask';
  const accessibleLabel = mode === 'preview' ? `Preview frozen mask for ${imagePath}` : `Edit mask for ${imagePath}`;
  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="rounded bg-gray-950/80 px-2 py-1 text-xs text-white"
      onClick={event => {
        event.stopPropagation();
        onActivate(imagePath);
      }}
    >
      {label}
    </button>
  );
}
