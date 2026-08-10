'use client';

export interface DatasetSourceMissingListProps {
  paths: readonly string[];
  selectedPaths: ReadonlySet<string>;
  selectionMode: boolean;
  saving: boolean;
  onSelectionChange(path: string, selected: boolean): void;
}

export default function DatasetSourceMissingList({
  paths,
  selectedPaths,
  selectionMode,
  saving,
  onSelectionChange,
}: DatasetSourceMissingListProps) {
  if (paths.length === 0) return null;
  return (
    <section
      aria-label="Source-missing preset images"
      className="mt-4 rounded border border-amber-700 bg-amber-950/30 p-3"
    >
      <h2 className="text-sm font-semibold text-amber-200">Source-missing retained images</h2>
      <ul className="mt-2 space-y-1">
        {paths.map(path => (
          <li key={path} className="flex items-center gap-2 text-sm text-amber-100">
            {selectionMode ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPaths.has(path)}
                  onChange={event => onSelectionChange(path, event.target.checked)}
                  disabled={saving}
                />
                <span className="rounded bg-amber-900 px-1.5 py-0.5 text-xs">source-missing</span>
                {path}
              </label>
            ) : (
              <span className="flex items-center gap-2">
                <span className="rounded bg-amber-900 px-1.5 py-0.5 text-xs">source-missing</span>
                {path}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
