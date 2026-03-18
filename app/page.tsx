'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState, Suspense, useCallback } from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import { SearchBar } from '@/components/discovery/search-bar';
import { FilterPills } from '@/components/discovery/filter-pills';
import { FilterSheet } from '@/components/discovery/filter-sheet';
import { MapMiniCard } from '@/components/map/map-mini-card';
import { MapDesktopCard } from '@/components/map/map-desktop-card';
import { MapListView } from '@/components/map/map-list-view';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useShops } from '@/lib/hooks/use-shops';
import { useSearch } from '@/lib/hooks/use-search';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useAnalytics } from '@/lib/posthog/use-analytics';

const MapView = dynamic(
  () =>
    import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  { ssr: false }
);

function FindPageContent() {
  const {
    query,
    mode,
    filters,
    view,
    setQuery,
    toggleFilter,
    setFilters,
    setView,
  } = useSearchState();
  const { capture } = useAnalytics();

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { shops: featuredShops } = useShops({ featured: true, limit: 200 });
  const { results: searchResults, isLoading: searchLoading } = useSearch(
    query || null,
    mode
  );
  const isDesktop = useIsDesktop();
  const { requestLocation } = useGeolocation();

  const shops = useMemo(() => {
    const base = query
      ? searchLoading
        ? []
        : searchResults.length > 0
          ? searchResults
          : featuredShops
      : featuredShops;
    if (filters.includes('rating')) {
      return [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return base;
  }, [query, searchLoading, searchResults, featuredShops, filters]);

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);
  const selectedShop = selectedShopId
    ? (shopById.get(selectedShopId) ?? null)
    : null;

  const listShops = useMemo(
    () =>
      shops.map((s) => ({
        id: s.id,
        slug: s.slug ?? s.id,
        name: s.name,
        rating: s.rating,
        distance_m: null,
        is_open: null,
        photo_url: s.photoUrls.length > 0 ? s.photoUrls[0] : null,
      })),
    [shops]
  );

  function handleSearch(q: string) {
    setQuery(q);
    setSelectedShopId(null);
  }

  const handleViewToggle = useCallback((newView: 'map' | 'list') => {
    if (newView === view) return;
    capture('view_toggled', { to_view: newView });
    setView(newView);
  }, [view, capture, setView]);

  const handleFilterApply = useCallback(
    (selectedIds: string[]) => {
      setFilters(selectedIds);
    },
    [setFilters]
  );

  function getSearchStatusText(): string {
    if (searchLoading) return '搜尋中...';
    if (searchResults.length > 0)
      return `找到 ${searchResults.length} 間咖啡廳`;
    return '找不到符合的咖啡廳，顯示精選';
  }

  const viewToggleButtons = useMemo(() => (
    <div className="flex items-center gap-1 rounded-full bg-[#F5F4F1] p-0.5">
      <button
        type="button"
        aria-label="Map view"
        onClick={() => handleViewToggle('map')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'map'
            ? 'bg-[#2C1810] text-white'
            : 'text-gray-500'
        }`}
      >
        <MapIcon size={14} />
        Map
      </button>
      <button
        type="button"
        aria-label="List view"
        onClick={() => handleViewToggle('list')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-[#2C1810] text-white'
            : 'text-gray-500'
        }`}
      >
        <List size={14} />
        List
      </button>
    </div>
  ), [view, handleViewToggle]);

  if (view === 'list') {
    return (
      <div className="flex h-screen w-full flex-col bg-[#F5F4F1]">
        <div className="space-y-2 bg-white px-4 pt-4 pb-2 shadow-sm">
          <SearchBar onSubmit={handleSearch} defaultQuery={query} />
          {query && (
            <p className="text-xs text-gray-500">{getSearchStatusText()}</p>
          )}
          <FilterPills
            activeFilters={filters}
            onToggle={toggleFilter}
            onOpenSheet={() => setFilterSheetOpen(true)}
            onNearMe={requestLocation}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Nearby Coffee Shops
          </h2>
          {viewToggleButtons}
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <MapListView shops={listShops} />
        </div>

        <FilterSheet
          key={filterSheetOpen ? 'sheet-open' : 'sheet-closed'}
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          onApply={handleFilterApply}
          initialFilters={filters}
        />
      </div>
    );
  }

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
            onPinClick={setSelectedShopId}
            selectedShopId={selectedShopId}
          />
        </Suspense>
      </div>

      <div className="absolute top-4 right-4 left-4 z-20">
        <div className="space-y-2 rounded-2xl bg-white/90 p-3 shadow backdrop-blur-md supports-[not(backdrop-filter)]:bg-white">
          <div className="flex-1">
            <SearchBar onSubmit={handleSearch} defaultQuery={query} />
          </div>
          {query && (
            <p className="text-xs text-gray-500">{getSearchStatusText()}</p>
          )}
          <FilterPills
            activeFilters={filters}
            onToggle={toggleFilter}
            onOpenSheet={() => setFilterSheetOpen(true)}
            onNearMe={requestLocation}
          />
        </div>
      </div>

      {/* TODO: design specifies a persistent bottom card with horizontal MapMiniCard scroll here.
           Deferred to follow-up — toggle pill is a simplified substitute. */}
      <div className="absolute right-4 bottom-36 z-20">
        {viewToggleButtons}
      </div>

      {selectedShop &&
        (isDesktop ? (
          <MapDesktopCard shop={selectedShop} />
        ) : (
          <MapMiniCard
            shop={selectedShop}
            onDismiss={() => setSelectedShopId(null)}
          />
        ))}

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
      />
    </div>
  );
}

export default function FindPage() {
  return (
    <Suspense>
      <FindPageContent />
    </Suspense>
  );
}
