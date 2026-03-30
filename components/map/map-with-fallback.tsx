'use client';
import { useState, useCallback } from 'react';
import { useDeviceCapability } from '@/lib/hooks/use-device-capability';
import { MapMobileLayout } from '@/components/map/map-mobile-layout';
import { ListMobileLayout } from '@/components/map/list-mobile-layout';
import { MapDesktopLayout } from '@/components/map/map-desktop-layout';
import { ListDesktopLayout } from '@/components/map/list-desktop-layout';
import type { MappableLayoutShop } from '@/lib/types';

interface MapWithFallbackProps {
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
  isDesktop: boolean;
}

export function MapWithFallback({
  isDesktop,
  view,
  onCardClick,
  ...layoutProps
}: MapWithFallbackProps) {
  const { isLowEnd } = useDeviceCapability();
  const [forceMap, setForceMap] = useState(false);

  const handleForceLoad = useCallback(() => {
    setForceMap(true);
  }, []);

  // Determine effective view: low-end devices default to list unless user forced map
  const showMap = view === 'map' && (!isLowEnd || forceMap);
  const showLoadMapButton = isLowEnd && view === 'map' && !forceMap;

  if (isDesktop) {
    return (
      <div className="relative h-full w-full">
        {showMap ? (
          <MapDesktopLayout
            {...layoutProps}
            view={view}
            onCardClick={onCardClick}
          />
        ) : (
          <ListDesktopLayout
            {...layoutProps}
            view={view}
            onShopClick={onCardClick ?? layoutProps.onShopClick}
          />
        )}
        {showLoadMapButton && (
          <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2">
            <button
              type="button"
              aria-label="載入地圖"
              onClick={handleForceLoad}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-lg transition-opacity hover:opacity-90"
            >
              載入地圖
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {showMap ? (
        <MapMobileLayout
          {...layoutProps}
          view={view}
          onCardClick={onCardClick}
        />
      ) : (
        <ListMobileLayout
          {...layoutProps}
          view={view}
          onShopClick={onCardClick ?? layoutProps.onShopClick}
        />
      )}
      {showLoadMapButton && (
        <div className="absolute top-20 left-1/2 z-30 -translate-x-1/2">
          <button
            type="button"
            aria-label="載入地圖"
            onClick={handleForceLoad}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-lg transition-opacity hover:opacity-90"
          >
            載入地圖
          </button>
        </div>
      )}
    </div>
  );
}
