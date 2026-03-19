'use client';
import { ArrowUpDown } from 'lucide-react';
import { ViewToggle } from './view-toggle';

interface CountHeaderProps {
  count: number;
  view: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  onSort?: () => void;
}

export function CountHeader({ count, view, onViewChange, onSort }: CountHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-1">
      <span className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-[var(--foreground)]">
        {count} places nearby
      </span>
      <div className="flex items-center gap-2.5">
        <ViewToggle view={view} onChange={onViewChange} />
        {onSort && (
          <button
            type="button"
            aria-label="Sort"
            onClick={onSort}
            className="flex items-center gap-1 rounded-lg bg-[var(--background)] px-2.5 py-[5px] text-xs font-medium text-[var(--foreground)] border border-[var(--border)]"
          >
            <ArrowUpDown className="h-3 w-3 text-[var(--muted-foreground)]" />
            Sort
          </button>
        )}
      </div>
    </div>
  );
}
