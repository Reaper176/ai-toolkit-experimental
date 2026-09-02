'use client';

interface TrainingGuideErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TrainingGuideError({ reset }: TrainingGuideErrorProps) {
  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">Training Guide unavailable</h1>
      <p className="mt-3 leading-7 text-gray-300">
        The offline training guide files could not be loaded. Check that they are available locally, then retry.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500"
      >
        Retry
      </button>
    </section>
  );
}
