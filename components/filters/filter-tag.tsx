'use client';
import type { LucideIcon } from 'lucide-react';

interface FilterTagProps {
  label: string;
  icon?: LucideIcon;
  dot?: string;
  active?: boolean;
  onClick: () => void;
}

export function FilterTag({
  label,
  icon: Icon,
  dot,
  active = false,
  onClick,
}: FilterTagProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-active={active || undefined}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-4 font-[family-name:var(--font-body)] text-[13px] font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-[var(--tag-active-bg)] text-[var(--tag-active-text)]'
          : 'border border-[var(--tag-inactive-border)] bg-white text-[var(--tag-inactive-text)]'
      }`}
    >
      {dot && (
        <span
          data-testid="filter-tag-dot"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
