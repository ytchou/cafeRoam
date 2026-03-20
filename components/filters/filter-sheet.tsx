'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { FilterTag } from './filter-tag';

interface Tag {
  id: string;
  label: string;
}

interface TabCategory {
  key: string;
  label: string;
  tags: Tag[];
}

const FILTER_TABS: TabCategory[] = [
  {
    key: 'functionality',
    label: 'Functionality',
    tags: [
      { id: 'wifi', label: 'WiFi' },
      { id: 'outlet', label: 'Outlet' },
      { id: 'seating', label: 'Seating' },
      { id: 'work_friendly', label: 'Work Friendly' },
      { id: 'pet_friendly', label: 'Pet Friendly' },
      { id: 'accessible', label: 'Accessible' },
      { id: 'parking', label: 'Parking' },
      { id: 'takeaway', label: 'Takeaway' },
      { id: 'reservable', label: 'Reservable' },
      { id: 'no_laptop', label: 'No Laptop' },
      { id: 'cash_only', label: 'Cash Only' },
      { id: 'brings_own_cup', label: 'Brings Own Cup' },
    ],
  },
  {
    key: 'time',
    label: 'Time',
    tags: [
      { id: 'open_now', label: 'Open Now' },
      { id: 'no_time_limit', label: 'No Time Limit' },
      { id: 'open_late', label: 'Open Late' },
      { id: 'early_bird', label: 'Early Bird' },
      { id: 'open_weekend', label: 'Open Weekend' },
      { id: 'open_24hr', label: 'Open 24hr' },
    ],
  },
  {
    key: 'ambience',
    label: 'Ambience',
    tags: [
      { id: 'quiet', label: 'Quiet' },
      { id: 'cozy', label: 'Cozy' },
      { id: 'lively', label: 'Lively' },
      { id: 'chit_chat', label: 'Chit Chat' },
      { id: 'romantic', label: 'Romantic' },
      { id: 'minimalist', label: 'Minimalist' },
      { id: 'industrial', label: 'Industrial' },
      { id: 'vintage', label: 'Vintage' },
    ],
  },
  {
    key: 'mode',
    label: 'Mode',
    tags: [
      { id: 'work', label: 'Work' },
      { id: 'rest', label: 'Rest' },
      { id: 'social', label: 'Social' },
      { id: 'specialty', label: 'Specialty' },
    ],
  },
  {
    key: 'food',
    label: 'Food',
    tags: [
      { id: 'espresso', label: 'Espresso' },
      { id: 'pour_over', label: 'Pour Over' },
      { id: 'matcha', label: 'Matcha' },
      { id: 'pastries', label: 'Pastries' },
      { id: 'brunch', label: 'Brunch' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'dessert', label: 'Dessert' },
      { id: 'sandwich', label: 'Sandwich' },
    ],
  },
];

const FILTER_TABS_MAP = new Map(FILTER_TABS.map((tab) => [tab.key, tab]));

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: string[]) => void;
  initialFilters: string[];
}

// FilterContent owns its own selection state. It is mounted fresh each time the
// sheet opens (desktop: parent returns null when closed; mobile: Drawer.Portal
// unmounts on close), so the lazy useState initializer re-runs on every open —
// no useEffect sync needed.
function FilterContent({
  initialFilters,
  onApply,
  onClose,
}: {
  initialFilters: string[];
  onApply: (filters: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialFilters)
  );
  const [activeTab, setActiveTab] = useState('functionality');

  const activeTabData = FILTER_TABS_MAP.get(activeTab);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClear = () => {
    setSelected(new Set());
  };

  const handleApply = () => {
    onApply(Array.from(selected));
    onClose();
  };

  const tagsToShow = activeTabData?.tags ?? [];

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold">
            Filters
          </h2>
          {selected.size > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tag-active-bg)] px-1.5 text-xs font-medium text-white">
              {selected.size}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear all"
          className="font-[family-name:var(--font-body)] text-sm text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3" role="tablist">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 font-[family-name:var(--font-body)] text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--tag-active-bg)] text-white'
                : 'bg-[#F5F4F1] text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {tagsToShow.map((tag) => (
            <FilterTag
              key={tag.id}
              label={tag.label}
              active={selected.has(tag.id)}
              onClick={() => toggle(tag.id)}
            />
          ))}
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <button
          type="button"
          onClick={handleApply}
          className="w-full rounded-full bg-[var(--primary,#3D8A5A)] py-2.5 font-[family-name:var(--font-body)] text-sm font-medium text-white"
        >
          {selected.size > 0 ? `Show ${selected.size} places` : 'Show places'}
        </button>
      </div>
    </>
  );
}

export function FilterSheet({
  open,
  onClose,
  onApply,
  initialFilters,
}: FilterSheetProps) {
  const isDesktop = useIsDesktop();

  if (!open) return null;

  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/40"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          role="button"
          tabIndex={0}
          aria-label="Close filters"
        />
        <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
          <FilterContent
            initialFilters={initialFilters}
            onApply={onApply}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 flex max-h-[85vh] flex-col rounded-t-[10px] bg-white">
          <Drawer.Handle />
          <Drawer.Title className="sr-only">Filters</Drawer.Title>
          <FilterContent
            initialFilters={initialFilters}
            onApply={onApply}
            onClose={onClose}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
