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
      className="flex items-center justify-center w-5 h-12 rounded-r-lg bg-[#F0EDE8] border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
    >
      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
    </button>
  );
}
