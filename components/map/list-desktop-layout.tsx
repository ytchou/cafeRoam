'use client';
import { SearchBar } from '@/components/filters/search-bar';
import { FilterTag } from '@/components/filters/filter-tag';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCardGrid } from '@/components/shops/shop-card-grid';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { HeaderNavNew } from '@/components/navigation/header-nav-new';

const QUICK_FILTERS = [
  { id: 'open_now', label: 'Open Now', dot: '#3D8A5A' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'outlet', label: 'Outlet' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'rating', label: 'Top Rated' },
];

interface LayoutShop {
  id: string;
  name: string;
  rating: number | null;
  photo_urls?: string[];
  photoUrls?: string[];
  distance_m?: number | null;
  is_open?: boolean | null;
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
}

interface ListDesktopLayoutProps {
  shops: LayoutShop[];
  count: number;
  onShopClick: (id: string) => void;
  query: string;
  activeFilters: string[];
  onFilterToggle: (id: string) => void;
  view: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  onSearch: (q: string) => void;
  filterSheetOpen: boolean;
  onFilterOpen: () => void;
  onFilterClose: () => void;
  onFilterApply: (filters: string[]) => void;
  onSort?: () => void;
}

export function ListDesktopLayout({
  shops,
  count,
  onShopClick,
  query,
  activeFilters,
  onFilterToggle,
  view,
  onViewChange,
  onSearch,
  filterSheetOpen,
  onFilterOpen,
  onFilterClose,
  onFilterApply,
  onSort,
}: ListDesktopLayoutProps) {
  return (
    <div className="flex h-screen w-full flex-col bg-[var(--background)]">
      <HeaderNavNew activeTab="find" />

      <div className="flex flex-col gap-2 bg-white px-8 pt-20 pb-3 shadow-sm">
        <SearchBar onSearch={onSearch} onFilterClick={onFilterOpen} defaultQuery={query} />
        <div className="flex gap-2 overflow-x-auto scrollbar-none pl-1">
          {QUICK_FILTERS.map((f) => (
            <FilterTag
              key={f.id}
              label={f.label}
              dot={f.dot}
              active={activeFilters.includes(f.id)}
              onClick={() => onFilterToggle(f.id)}
            />
          ))}
        </div>
        <CountHeader count={count} view={view} onViewChange={onViewChange} onSort={onSort} />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-3 gap-5">
          {shops.map((shop) => (
            <ShopCardGrid
              key={shop.id}
              shop={shop}
              onClick={() => onShopClick(shop.id)}
            />
          ))}
        </div>
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onClose={onFilterClose}
        onApply={onFilterApply}
        initialFilters={activeFilters}
      />
    </div>
  );
}
