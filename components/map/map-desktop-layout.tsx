'use client';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { SearchBar } from '@/components/filters/search-bar';
import { FilterTag } from '@/components/filters/filter-tag';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCardCompact } from '@/components/shops/shop-card-compact';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { HeaderNavNew } from '@/components/navigation/header-nav-new';

const MapView = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  { ssr: false }
);

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
  latitude: number | null;
  longitude: number | null;
}

interface MapDesktopLayoutProps {
  shops: LayoutShop[];
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
}

export function MapDesktopLayout({
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
}: MapDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col">
      <HeaderNavNew activeTab="find" />

      <div className="flex flex-1 overflow-hidden pt-16">
        {!panelCollapsed && (
          <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white">
            <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
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
              <CountHeader count={count} view={view} onViewChange={onViewChange} />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {shops.map((shop) => (
                <ShopCardCompact
                  key={shop.id}
                  shop={shop}
                  onClick={() => onShopClick(shop.id)}
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
