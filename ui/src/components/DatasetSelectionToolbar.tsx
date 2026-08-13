import type { SelectionAction } from '@/helpers/datasetSelection';

export interface DatasetSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  dirty: boolean;
  saving: boolean;
  readOnly?: boolean;
  showOnlySelected: boolean;
  onShowOnlySelectedChange(showOnlySelected: boolean): void;
  onAction(action: SelectionAction): void;
  onSave?: () => void;
  onCancel(): void;
}

export function DatasetSelectionToolbar({
  selectedCount,
  totalCount,
  dirty,
  saving,
  readOnly = false,
  showOnlySelected,
  onShowOnlySelectedChange,
  onAction,
  onSave,
  onCancel,
}: DatasetSelectionToolbarProps) {
  const mutationsDisabled = saving || readOnly;
  const saveDisabled = !onSave || selectedCount === 0 || saving || readOnly;
  const buttonClass = 'rounded-md bg-gray-700 px-2.5 py-1.5 text-sm text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="border-b border-gray-700 bg-gray-900 px-3 py-2 sm:px-4" aria-label="Dataset selection controls">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-2">
        <p role="status" aria-live="polite" className="mr-1 text-sm text-gray-200">
          {selectedCount} of {totalCount} enabled{dirty ? ' — unsaved selection changes' : ''}
        </p>
        <label className="mr-1 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            aria-label="Show only selected"
            checked={showOnlySelected}
            onChange={event => onShowOnlySelectedChange(event.currentTarget.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span>Show only selected</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={mutationsDisabled} onClick={() => onAction('all')}>
            Select all
          </button>
          <button type="button" className={buttonClass} disabled={mutationsDisabled} onClick={() => onAction('none')}>
            Select none
          </button>
          <button type="button" className={buttonClass} disabled={mutationsDisabled} onClick={() => onAction('invert')}>
            Invert selection
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="rounded-md bg-blue-700 px-2.5 py-1.5 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={saveDisabled} onClick={onSave}>
            Save preset
          </button>
          <button type="button" className={buttonClass} disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

export default DatasetSelectionToolbar;
