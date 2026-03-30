'use client';
import { useState, useCallback, useEffect } from 'react';
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

const SESSION_KEY = 'mapWithFallback:forceMap';

export function MapWithFallback({
  isDesktop,
  view,
  onCardClick,
  ...layoutProps
}: MapWithFallbackProps) {
  const { isLowEnd } = useDeviceCapability();
  const [forceMap, setForceMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Restore forceMap from session on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setForceMap(true);
    }
  }, []);

  // Progressive loading: start background import for capable devices
  useEffect(() => {
    if (!isLowEnd && view === 'map') {
      import('@/components/map/map-view-dynamic')
        .then(() => setMapReady(true))
        .catch(() => setMapError(true));
    }
  }, [isLowEnd, view]);

  const handleForceLoad = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setForceMap(true);
  }, []);

  const handleRetry = useCallback(() => {
    setMapError(false);
    setMapReady(false);
    import('@/components/map/map-view-dynamic')
      .then(() => setMapReady(true))
      .catch(() => setMapError(true));
  }, []);

  if (mapError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-[var(--muted-foreground)]">地圖載入失敗</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-lg transition-opacity hover:opacity-90"
        >
          重試
        </button>
      </div>
    );
  }

  // Effective map visibility: capable devices wait for mapReady, low-end need explicit forceMap
  const showMap = view === 'map' && ((!isLowEnd && mapReady) || (isLowEnd && forceMap));
  const showLoadMapButton = isLowEnd && view === 'map' && !forceMap;

  if (isDesktop) {
    return (
      <div className="relative h-full w-full">
        {showMap ? (
          <div data-testid="map-container">
            <MapDesktopLayout
              {...layoutProps}
              view={view}
              onCardClick={onCardClick}
            />
          </div>
        ) : (
          <div data-testid="list-container">
            <ListDesktopLayout
              {...layoutProps}
              view={view}
            />
          </div>
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
        <div data-testid="map-container">
          <MapMobileLayout
            {...layoutProps}
            view={view}
            onCardClick={onCardClick}
          />
        </div>
      ) : (
        <div data-testid="list-container">
          <ListMobileLayout
            {...layoutProps}
            view={view}
          />
        </div>
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
