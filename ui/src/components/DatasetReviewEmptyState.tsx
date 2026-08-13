import { LuImageOff } from 'react-icons/lu';

interface DatasetReviewEmptyStateProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  liveCount: number;
  missingCount: number;
  selectionMode: boolean;
  showOnlySelected: boolean;
  visibleLiveCount: number;
  visibleMissingCount: number;
}

export default function DatasetReviewEmptyState({
  status,
  liveCount,
  missingCount,
  selectionMode,
  showOnlySelected,
  visibleLiveCount,
  visibleMissingCount,
}: DatasetReviewEmptyStateProps) {
  if (status !== 'success') return null;

  if (liveCount + missingCount === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center py-16 px-8 rounded-xl border-2 border-gray-700 border-dashed bg-gray-800/50 text-gray-100 mx-auto max-w-md text-center">
        <div className="text-gray-400 mb-4">
          <LuImageOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Images Found</h3>
        <p className="text-sm opacity-75 leading-relaxed">
          This dataset is empty. Click &quot;Add Images&quot; to get started.
        </p>
      </div>
    );
  }

  if (selectionMode && showOnlySelected && visibleLiveCount === 0 && visibleMissingCount === 0) {
    return (
      <p role="status" className="py-10 text-center text-sm text-gray-400">
        No selected images to show.
      </p>
    );
  }

  return null;
}
