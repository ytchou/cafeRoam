'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/discovery/search-bar';
import { FilterPills } from '@/components/discovery/filter-pills';
import { MapMiniCard } from '@/components/map/map-mini-card';
import { MapDesktopCard } from '@/components/map/map-desktop-card';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useShops } from '@/lib/hooks/use-shops';
import { useSearch } from '@/lib/hooks/use-search';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import type { SearchMode } from '@/lib/hooks/use-search-state';

const MapView = dynamic(
  () =>
    import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  { ssr: false }
);

function FindPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q');
  const urlMode = searchParams.get('mode') as SearchMode;

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const { shops: featuredShops } = useShops({ featured: true, limit: 200 });
  const { results: searchResults, isLoading: searchLoading } = useSearch(
    urlQuery,
    urlMode
  );
  const isDesktop = useIsDesktop();
  const { requestLocation } = useGeolocation();

  const shops = useMemo(() => {
    const base = urlQuery
      ? searchLoading
        ? []
        : searchResults.length > 0
          ? searchResults
          : featuredShops
      : featuredShops;
    if (activeFilters.includes('rating')) {
      return [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return base;
  }, [urlQuery, searchLoading, searchResults, featuredShops, activeFilters]);

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);
  const selectedShop = selectedShopId
    ? (shopById.get(selectedShopId) ?? null)
    : null;

  function handleSearch(query: string) {
    const params = new URLSearchParams({ q: query });
    if (urlMode) params.set('mode', urlMode);
    router.push(`/?${params.toString()}`);
    setSelectedShopId(null);
  }

  function handleToggleFilter(filter: string) {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((x) => x !== filter)
        : [...prev, filter]
    );
  }

  function getSearchStatusText(): string {
    if (searchLoading) return '搜尋中…';
    if (searchResults.length > 0)
      return `找到 ${searchResults.length} 間咖啡廳`;
    return '找不到符合的咖啡廳，顯示精選';
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
              地圖載入中…
            </div>
          }
        >
          <MapView shops={shops} onPinClick={setSelectedShopId} />
        </Suspense>
      </div>

      <div className="absolute top-4 right-4 left-4 z-20">
        <div className="space-y-2 rounded-2xl bg-white/90 p-3 shadow backdrop-blur-md supports-[not(backdrop-filter)]:bg-white">
          <div className="flex-1">
            <SearchBar onSubmit={handleSearch} defaultQuery={urlQuery ?? ''} />
          </div>
          {urlQuery && (
            <p className="text-xs text-gray-500">{getSearchStatusText()}</p>
          )}
          <FilterPills
            activeFilters={activeFilters}
            onToggle={handleToggleFilter}
            onNearMe={requestLocation}
          />
        </div>
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
