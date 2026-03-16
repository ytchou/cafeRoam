'use client';
import { useAnalytics } from '@/lib/posthog/use-analytics';

const QUICK_FILTERS = [
  { key: 'distance', label: '距離' },
  { key: 'open_now', label: '現正營業' },
  { key: 'outlet', label: '有插座' },
  { key: 'rating', label: '評分' },
] as const;

interface FilterPillsProps {
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onOpenSheet: () => void;
  onNearMe?: () => void;
}

export function FilterPills({
  activeFilters,
  onToggle,
  onOpenSheet,
  onNearMe,
}: FilterPillsProps) {
  const { capture } = useAnalytics();

  function handleToggle(key: string) {
    capture('filter_applied', { filter_type: 'quick', filter_value: key });
    onToggle(key);
  }

  function handleNearMe() {
    capture('filter_applied', { filter_type: 'quick', filter_value: 'distance' });
    onNearMe?.();
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        type="button"
        onClick={onOpenSheet}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
          <circle cx="5" cy="4" r="1.5" fill="white" />
          <circle cx="10" cy="8" r="1.5" fill="white" />
          <circle cx="6" cy="12" r="1.5" fill="white" />
        </svg>
        篩選
      </button>
      <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
        {QUICK_FILTERS.map(({ key, label }) => {
          if (key === 'distance' && onNearMe) {
            return (
              <button
                key={key}
                type="button"
                onClick={handleNearMe}
                className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50"
              >
                {label}
              </button>
            );
          }
          const isActive = activeFilters.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleToggle(key)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#E06B3F] bg-[#E06B3F] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
