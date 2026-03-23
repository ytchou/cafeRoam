'use client';
import { useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { useAnalytics } from '@/lib/posthog/use-analytics';

interface Tag {
  id: string;
  label: string;
}

interface TabCategory {
  key: string;
  label: string;
  tags: Tag[];
}

// Tag IDs must stay in sync with the backend taxonomy dimension values.
// Full set is ~105 tags; this list is a curated subset for launch.
// Future: drive from /api/taxonomy to avoid drift.
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

const ALL_TAGS: Tag[] = FILTER_TABS.flatMap((tab) => tab.tags);

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (selectedIds: string[]) => void;
  initialFilters: string[];
}

export function FilterSheet({
  open,
  onClose,
  onApply,
  initialFilters,
}: FilterSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialFilters)
  );
  const [activeTab, setActiveTab] = useState<string>('functionality');
  const [searchQuery, setSearchQuery] = useState('');
  const { capture } = useAnalytics();

  const isSearching = searchQuery.trim().length > 0;

  const filteredTags = useMemo(() => {
    if (!isSearching) return null;
    const query = searchQuery.trim().toLowerCase();
    return ALL_TAGS.filter(
      (tag) =>
        tag.label.toLowerCase().includes(query) ||
        tag.id.toLowerCase().includes(query)
    );
  }, [searchQuery, isSearching]);

  const activeTabData = useMemo(
    () => FILTER_TABS.find((tab) => tab.key === activeTab),
    [activeTab]
  );

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
    setSearchQuery('');
  };

  const handleApply = () => {
    const selectedIds = Array.from(selected);
    capture('filter_applied', {
      filter_type: 'sheet',
      filter_value: selectedIds,
    });
    onApply(selectedIds);
    onClose();
  };

  const tagsToShow = isSearching
    ? (filteredTags ?? [])
    : (activeTabData?.tags ?? []);

  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 flex max-h-[85vh] flex-col rounded-t-[10px] bg-white">
          <Drawer.Handle />
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <Drawer.Title className="text-lg font-semibold">
              Filters
            </Drawer.Title>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <span className="bg-espresso flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white">
                  {selected.size}
                </span>
              )}
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear all"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filters..."
              className="border-border-warm bg-surface-section focus:border-espresso w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {!isSearching && (
            <div
              className="flex gap-2 overflow-x-auto px-4 pb-3"
              role="tablist"
            >
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-espresso text-white'
                      : 'bg-surface-section text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {tagsToShow.map((tag) => {
                const isSelected = selected.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(tag.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'border-espresso bg-espresso text-white'
                        : 'border-border-warm bg-white text-gray-700'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <button
              type="button"
              onClick={handleApply}
              className="bg-espresso w-full rounded-full py-2.5 text-sm font-medium text-white"
            >
              Show places
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
