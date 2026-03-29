'use client';
import { useMemo, Suspense } from 'react';
import { Locate } from 'lucide-react';
import { SearchBar } from '@/components/filters/search-bar';
import { FilterTag } from '@/components/filters/filter-tag';
import { QUICK_FILTERS } from '@/components/filters/quick-filters';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCarousel } from '@/components/map/shop-carousel';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import type { MappableLayoutShop } from '@/lib/types';

interface MapMobileLayoutProps {
  shops: MappableLayoutShop[];
  count: number;
  selectedShopId: string | null;
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
  onLocationRequest?: () => void;
  onCardClick?: (id: string) => void;
}

export function MapMobileLayout({
  shops,
  count,
  selectedShopId,
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
  onLocationRequest,
  onCardClick,
}: MapMobileLayoutProps) {
  const activeFilterSet = useMemo(
    () => new Set(activeFilters),
    [activeFilters]
  );

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
              地圖載入中...
            </div>
          }
        >
          <MapView
            shops={shops}
            onPinClick={onShopClick}
            selectedShopId={selectedShopId}
          />
        </Suspense>
      </div>

      <div className="absolute top-4 right-4 left-4 z-20 flex flex-col gap-2">
        <SearchBar
          onSearch={onSearch}
          onFilterClick={onFilterOpen}
          defaultQuery={query}
        />
        <div className="scrollbar-none flex gap-2 overflow-x-auto pl-1">
          {QUICK_FILTERS.map((f) => (
            <FilterTag
              key={f.id}
              label={f.label}
              dot={f.dot}
              active={activeFilterSet.has(f.id)}
              onClick={() => onFilterToggle(f.id)}
            />
          ))}
        </div>
        <CountHeader count={count} view={view} onViewChange={onViewChange} />
      </div>

      {onLocationRequest && (
        <button
          type="button"
          aria-label="My location"
          onClick={onLocationRequest}
          className="absolute right-4 bottom-[200px] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--map-pin)] shadow-lg"
        >
          <Locate className="h-5 w-5" />
        </button>
      )}

      <div
        className="absolute right-0 bottom-0 left-0 z-20 flex flex-col gap-3 bg-gradient-to-t from-black/20 to-transparent pt-8 pb-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <ShopCarousel
          shops={shops}
          onShopClick={onShopClick}
          onCardClick={onCardClick}
          selectedShopId={selectedShopId}
        />
        <BottomNav embedded />
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
