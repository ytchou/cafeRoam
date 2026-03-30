'use client';
import { useState, useMemo, Suspense } from 'react';
import { SearchBar } from '@/components/filters/search-bar';
import { FilterTag } from '@/components/filters/filter-tag';
import { QUICK_FILTERS } from '@/components/filters/quick-filters';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCardCompact } from '@/components/shops/shop-card-compact';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { HeaderNav } from '@/components/navigation/header-nav';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import type { MappableLayoutShop } from '@/lib/types';

interface MapDesktopLayoutProps {
  shops: MappableLayoutShop[];
  count: number;
  selectedShopId: string | null;
  onShopClick: (id: string | null) => void;
  onCardClick?: (id: string) => void;
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
}

export function MapDesktopLayout({
  shops,
  count,
  selectedShopId,
  onShopClick,
  onCardClick,
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
}: MapDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const activeFilterSet = useMemo(
    () => new Set(activeFilters),
    [activeFilters]
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <HeaderNav activeTab="find" />

      <div className="flex flex-1 overflow-hidden pt-16">
        {!panelCollapsed && (
          <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white">
            <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
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
              <CountHeader
                count={count}
                view={view}
                onViewChange={onViewChange}
              />
            </div>

            <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
              {shops.map((shop) => (
                <ShopCardCompact
                  key={shop.id}
                  shop={shop}
                  onClick={() => (onCardClick ?? onShopClick)(shop.id)}
                  selected={shop.id === selectedShopId}
                />
              ))}
            </div>
          </div>
        )}

        <CollapseToggle
          collapsed={panelCollapsed}
          onClick={() => setPanelCollapsed((c) => !c)}
        />

        <div className="relative flex-1">
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
