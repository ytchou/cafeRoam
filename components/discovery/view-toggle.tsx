'use client';
import { Map, List } from 'lucide-react';

interface ViewToggleProps {
  view: 'map' | 'list';
  onChange: (view: 'map' | 'list') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-[14px] bg-[var(--toggle-bg)] p-[3px]">
      <button
        type="button"
        aria-label="Map view"
        data-active={view === 'map' || undefined}
        onClick={() => view !== 'map' && onChange('map')}
        className={`flex h-6 w-7 items-center justify-center rounded-[11px] transition-colors ${
          view === 'map'
            ? 'bg-[var(--active-dark)] text-white'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        <Map className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="List view"
        data-active={view === 'list' || undefined}
        onClick={() => view !== 'list' && onChange('list')}
        className={`flex h-6 w-7 items-center justify-center rounded-[11px] transition-colors ${
          view === 'list'
            ? 'bg-[var(--active-dark)] text-white'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
