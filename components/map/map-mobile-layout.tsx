'use client';
import { Suspense } from 'react';
import { Locate, SlidersHorizontal } from 'lucide-react';
import { ShopCarousel } from '@/components/map/shop-carousel';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import type { MappableLayoutShop } from '@/lib/types';
import type { MapBounds } from '@/components/map/map-view';

interface MapMobileLayoutProps {
  shops: MappableLayoutShop[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  activeFilters: string[];
  filterSheetOpen: boolean;
  onFilterClose: () => void;
  onFilterApply: (filters: string[]) => void;
  onLocationRequest?: () => void;
  onCardClick?: (id: string) => void;
  onFilterClick?: () => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

export function MapMobileLayout({
  shops,
  selectedShopId,
  onShopClick,
  activeFilters,
  filterSheetOpen,
  onFilterClose,
  onFilterApply,
  onLocationRequest,
  onCardClick,
  onFilterClick,
  onBoundsChange,
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
            onBoundsChange={onBoundsChange}
          />
        </Suspense>
      </div>

      <button
        type="button"
        aria-label="篩選"
        onClick={onFilterClick}
        className="absolute top-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--text-secondary)] shadow-lg"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

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
