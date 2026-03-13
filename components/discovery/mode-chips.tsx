"use client";

type Mode = "work" | "rest" | "social" | "specialty" | null;

const MODES: { key: Exclude<Mode, null>; label: string }[] = [
  { key: "work", label: "工作" },
  { key: "rest", label: "放鬆" },
  { key: "social", label: "社交" },
  { key: "specialty", label: "精品" },
];

interface ModeChipsProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function ModeChips({ activeMode, onModeChange }: ModeChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {MODES.map(({ key, label }) => {
        const isActive = activeMode === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onModeChange(isActive ? null : key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition-colors flex-shrink-0 ${
              isActive
                ? "bg-[#E06B3F] text-white border border-[#E06B3F]"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
