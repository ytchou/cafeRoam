'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Locate } from 'lucide-react';
import { SearchBar } from '@/components/filters/search-bar';
import { FilterTag } from '@/components/filters/filter-tag';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCarousel } from '@/components/map/shop-carousel';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { BottomNavNew } from '@/components/navigation/bottom-nav-new';

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
  review_count?: number;
  reviewCount?: number;
  photo_urls?: string[];
  photoUrls?: string[];
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
  distance_m?: number | null;
  is_open?: boolean | null;
  latitude: number | null;
  longitude: number | null;
}

interface MapMobileLayoutProps {
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
  onLocationRequest?: () => void;
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
}: MapMobileLayoutProps) {
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

      {onLocationRequest && (
        <button
          type="button"
          aria-label="My location"
          onClick={onLocationRequest}
          className="absolute right-4 bottom-[200px] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-[var(--map-pin)]"
        >
          <Locate className="h-5 w-5" />
        </button>
      )}

      <div className="absolute right-0 bottom-0 left-0 z-20 flex flex-col gap-3 bg-gradient-to-t from-black/20 to-transparent pt-8 pb-2">
        <ShopCarousel
          shops={shops}
          onShopClick={onShopClick}
          selectedShopId={selectedShopId}
        />
        <BottomNavNew />
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
