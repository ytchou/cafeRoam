'use client';

import { useSearchSuggestions } from '@/lib/hooks/use-search-suggestions';

const DEFAULT_PHRASES = [
  '安靜可以工作',
  '適合約會',
  '好拍照',
  '有黑膠唱片',
  '可以帶狗',
  '下午茶推薦',
  '有插座',
  '不限時',
] as const;

interface SuggestTag {
  id: string;
  label: string;
}

interface SearchSuggestionPanelProps {
  query: string;
  onPhraseSelect: (phrase: string) => void;
  onTagSelect: (tag: SuggestTag) => void;
  onNearMe?: () => void;
}

export function SearchSuggestionPanel({
  query,
  onPhraseSelect,
  onTagSelect,
  onNearMe,
}: SearchSuggestionPanelProps) {
  const { completions, tags } = useSearchSuggestions(query);

  if (!query) {
    return (
      <div className="flex flex-wrap gap-2 py-1">
        {DEFAULT_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => onPhraseSelect(phrase)}
            className="flex-shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
          >
            {phrase}
          </button>
        ))}
        {onNearMe && (
          <button
            type="button"
            onClick={onNearMe}
            className="flex-shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
          >
            附近的咖啡廳
          </button>
        )}
      </div>
    );
  }

  if (completions.length === 0 && tags.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl border border-gray-100 bg-white shadow-lg">
      {completions.length > 0 && (
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-medium text-gray-400">建議搜尋</p>
          {completions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPhraseSelect(c)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-400">🔍</span>
              {c}
            </button>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="border-t border-gray-100 p-2">
          <p className="px-2 py-1 text-xs font-medium text-gray-400">相關標籤</p>
          <div className="flex flex-wrap gap-1 px-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => onTagSelect(tag)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
