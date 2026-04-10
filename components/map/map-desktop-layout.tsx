'use client';
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from 'react';

const PANEL_EXPAND_DELAY_MS = 200;
import { FilterTag } from '@/components/filters/filter-tag';
import { QUICK_FILTERS } from '@/components/filters/quick-filters';
import { CountHeader } from '@/components/discovery/count-header';
import { ShopCardCompact } from '@/components/shops/shop-card-compact';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { HeaderNav } from '@/components/navigation/header-nav';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import { ShopPreviewCard } from '@/components/shops/shop-preview-card';
import type { MappableLayoutShop } from '@/lib/types';
import type { MapBounds } from '@/components/map/map-view';

interface MapDesktopLayoutProps {
  shops: MappableLayoutShop[];
  count: number;
  selectedShopId: string | null;
  onShopClick: (id: string | null) => void;
  onCardClick?: (id: string) => void;
  activeFilters: string[];
  onFilterToggle: (id: string) => void;
  view: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  filterSheetOpen: boolean;
  onFilterClose: () => void;
  onFilterApply: (filters: string[]) => void;
  onFilterClick?: () => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

export function MapDesktopLayout({
  shops,
  count,
  selectedShopId,
  onShopClick,
  onCardClick,
  activeFilters,
  onFilterToggle,
  view,
  onViewChange,
  filterSheetOpen,
  onFilterClose,
  onFilterApply,
  onFilterClick,
  onBoundsChange,
}: MapDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const activeFilterSet = useMemo(
    () => new Set(activeFilters),
    [activeFilters]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  const handlePreviewClose = useCallback(
    () => onShopClick(null),
    [onShopClick]
  );

  const handlePreviewNavigate = useCallback(() => {
    if (selectedShopId) (onCardClick ?? onShopClick)(selectedShopId);
  }, [selectedShopId, onCardClick, onShopClick]);

  useEffect(() => {
    if (!selectedShopId) return;
    const scroll = () =>
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-shop-id="${selectedShopId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setPanelCollapsed((prev) => {
      if (prev) {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(scroll, PANEL_EXPAND_DELAY_MS);
        return false;
      }
      scroll();
      return false;
    });

    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [selectedShopId]);

  useEffect(() => {
    if (!selectedShopId) return;
    selectedCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [selectedShopId]);

  return (
    <div className="flex h-screen w-full flex-col">
      <HeaderNav activeTab="find" />

      <div className="flex flex-1 overflow-hidden pt-16">
        {!panelCollapsed && (
          <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white">
            <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CountHeader
                  count={count}
                  view={view}
                  onViewChange={onViewChange}
                />
                <button
                  type="button"
                  onClick={onFilterClick}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--muted)]"
                >
                  ≡ 篩選
                </button>
              </div>
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
            </div>

            <div
              ref={scrollRef}
              className="flex-1 divide-y divide-[var(--border)] overflow-y-auto"
            >
              {shops.map((shop) =>
                shop.id === selectedShopId ? (
                  <div key={shop.id} ref={selectedCardRef} className="w-full">
                    <ShopPreviewCard
                      shop={shop}
                      onClose={handlePreviewClose}
                      onNavigate={handlePreviewNavigate}
                    />
                  </div>
                ) : (
                  <div key={shop.id} data-shop-id={shop.id}>
                    <ShopCardCompact
                      shop={shop}
                      onClick={() => onShopClick(shop.id)}
                      selected={false}
                    />
                  </div>
                )
              )}
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
              onPinClick={(id) => onShopClick(id)}
              selectedShopId={selectedShopId}
              onBoundsChange={onBoundsChange}
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
