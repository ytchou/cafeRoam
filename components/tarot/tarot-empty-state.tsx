'use client';

interface TarotEmptyStateProps {
  onExpandRadius?: () => void;
  onTryDifferentDistrict?: () => void;
}

export function TarotEmptyState({
  onExpandRadius,
  onTryDifferentDistrict,
}: TarotEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-white/60 px-6 py-10 text-center">
      <span className="text-tarot-gold text-3xl" aria-hidden="true">
        ✦
      </span>
      <p className="text-sm text-gray-600">
        No cafes open nearby right now. Try a larger radius or come back later.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onTryDifferentDistrict ? (
          <button
            type="button"
            onClick={onTryDifferentDistrict}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Try a different district
          </button>
        ) : null}
        {onExpandRadius ? (
          <button
            type="button"
            onClick={onExpandRadius}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Expand radius
          </button>
        ) : null}
      </div>
    </div>
  );
}
