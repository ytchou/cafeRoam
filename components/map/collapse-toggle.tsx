'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapseToggleProps {
  collapsed: boolean;
  onClick: () => void;
}

export function CollapseToggle({ collapsed, onClick }: CollapseToggleProps) {
  return (
    <button
      type="button"
      aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
      onClick={onClick}
      className="flex h-12 w-5 items-center justify-center rounded-r-lg border border-[var(--border)] bg-[#F0EDE8] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
    >
      {collapsed ? (
        <ChevronRight className="h-3 w-3" />
      ) : (
        <ChevronLeft className="h-3 w-3" />
      )}
    </button>
  );
}
