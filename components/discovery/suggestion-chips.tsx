'use client';

const TEXT_SUGGESTIONS = ['巴斯克蛋糕', '適合工作', '安靜一點'] as const;
const NEAR_ME = '我附近' as const;

interface SuggestionChipsProps {
  onSelect: (query: string) => void;
  onNearMe?: () => void;
}

export function SuggestionChips({ onSelect, onNearMe }: SuggestionChipsProps) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto py-1">
      {TEXT_SUGGESTIONS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="flex-shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm whitespace-nowrap text-white hover:bg-white/30"
        >
          {chip}
        </button>
      ))}
      <button
        type="button"
        onClick={() => (onNearMe ? onNearMe() : onSelect(NEAR_ME))}
        className="flex-shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm whitespace-nowrap text-white hover:bg-white/30"
      >
        {NEAR_ME}
      </button>
    </div>
  );
}
