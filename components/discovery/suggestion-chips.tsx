'use client';

const TEXT_SUGGESTIONS = [
  '想找安靜可以工作的地方',
  '有黑膠唱片的咖啡廳',
  '適合約會的氣氛',
  '有插座可以久坐',
  '巴斯克蛋糕',
  '可以帶狗',
  '下午茶推薦',
  '好拍照的咖啡廳',
] as const;
const NEAR_ME = '附近的咖啡廳' as const;
const CHIP_CLASS =
  'flex-shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm whitespace-nowrap text-white hover:bg-white/30';

interface SuggestionChipsProps {
  onSelect: (query: string) => void;
  onNearMe?: () => void;
}

export function SuggestionChips({ onSelect, onNearMe }: SuggestionChipsProps) {
  function handleNearMe() {
    if (onNearMe) {
      onNearMe();
    } else {
      onSelect(NEAR_ME);
    }
  }

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto py-1">
      {TEXT_SUGGESTIONS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className={CHIP_CLASS}
        >
          {chip}
        </button>
      ))}
      <button
        type="button"
        onClick={handleNearMe}
        className={CHIP_CLASS}
      >
        {NEAR_ME}
      </button>
    </div>
  );
}
