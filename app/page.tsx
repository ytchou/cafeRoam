'use client';
import { useMemo, useState, Suspense, useCallback } from 'react';
import { toast } from 'sonner';
import { WebsiteJsonLd } from '@/components/seo/WebsiteJsonLd';
import { useRouter } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useShops } from '@/lib/hooks/use-shops';
import { useSearch } from '@/lib/hooks/use-search';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useUser } from '@/lib/hooks/use-user';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { trackSearch, trackSignupCtaClick } from '@/lib/analytics/ga4-events';
import { haversineKm } from '@/lib/utils';
import { filterByBounds, type MapBounds } from '@/lib/utils/filter-by-bounds';
import {
  FILTER_TO_TAG_IDS,
  type TagFilterId,
} from '@/components/filters/filter-map';
import { MapWithFallback } from '@/components/map/map-with-fallback';

function FindPageContent() {
  const router = useRouter();
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
  const { user } = useUser();

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const { shops: featuredShops } = useShops({ featured: true, limit: 200 });
  const { results: searchResults, isLoading: searchLoading } = useSearch(
    query || null,
    mode
  );
  const isDesktop = useIsDesktop();
  const { latitude, longitude, requestLocation } = useGeolocation();

  const handleLocationRequest = useCallback(async () => {
    const coords = await requestLocation();
    if (!coords) {
      toast.error('無法取得位置，請確認定位權限');
    }
  }, [requestLocation]);

  const shops = useMemo(() => {
    const base = query
      ? searchLoading
        ? []
        : searchResults.length > 0
          ? searchResults
          : featuredShops
      : featuredShops;

    // Derive tag-based filters: only filters present in the mapping (excludes special filters)
    const activeFiltersSet = new Set(filters);
    const tagFilters = filters
      .filter((f): f is TagFilterId => f in FILTER_TO_TAG_IDS)
      .map((f) => FILTER_TO_TAG_IDS[f]);

    let filtered = base;
    if (tagFilters.length > 0) {
      // Pre-compute tag ID sets per shop to avoid Set construction inside the filter loop
      const shopTagSets = new Map(
        filtered.map((shop) => [
          shop.id,
          new Set((shop.taxonomyTags ?? []).map((t) => t.id)),
        ])
      );
      filtered = filtered.filter((shop) =>
        tagFilters.every(
          (tagId) => shopTagSets.get(shop.id)?.has(tagId) ?? false
        )
      );
    }

    // Apply open_now filter
    if (activeFiltersSet.has('open_now')) {
      filtered = filtered.filter((shop) => shop.isOpen === true);
    }

    // Attach distance_m (metres) to each shop when geolocation is available
    const hasGeo = latitude != null && longitude != null;
    const attachDistance = <T extends (typeof filtered)[number]>(
      shops: T[]
    ): (T & { distance_m: number | null })[] =>
      shops.map((shop) => {
        const km =
          hasGeo && shop.latitude != null && shop.longitude != null
            ? haversineKm(latitude!, longitude!, shop.latitude, shop.longitude)
            : null;
        return {
          ...shop,
          distance_m: km != null ? Math.round(km * 1000) : null,
        };
      });

    // Apply rating sort
    if (activeFiltersSet.has('rating')) {
      const sorted = [...filtered].sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
      );
      const result = attachDistance(sorted);
      return view === 'map' ? filterByBounds(result, mapBounds) : result;
    }

    // Apply geo-sort if location available
    if (hasGeo) {
      const withDistance = attachDistance(filtered);
      const sorted = withDistance.sort(
        (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)
      );
      return view === 'map' ? filterByBounds(sorted, mapBounds) : sorted;
    }

    return view === 'map' ? filterByBounds(filtered, mapBounds) : filtered;
  }, [
    query,
    searchLoading,
    searchResults,
    featuredShops,
    filters,
    latitude,
    longitude,
    view,
    mapBounds,
  ]);

  const handleSearch = useCallback(
    (q: string) => {
      if (q && !user) {
        trackSignupCtaClick('banner');
        router.push('/login');
        return;
      }
      setQuery(q);
      setSelectedShopId(null);
      if (q) trackSearch(q);
    },
    [setQuery, user, router]
  );

  const handleViewChange = useCallback(
    (newView: 'map' | 'list') => {
      if (newView === view) return;
      capture('view_toggled', { to_view: newView });
      setView(newView);
      setSelectedShopId(null);
    },
    [view, capture, setView]
  );

  const handleShopNavigate = useCallback(
    (id: string) => router.push(`/shops/${id}`),
    [router]
  );

  const handleFilterApply = useCallback(
    (selectedIds: string[]) => {
      setFilters(selectedIds);
    },
    [setFilters]
  );

  const handleFilterOpen = useCallback(() => setFilterSheetOpen(true), []);
  const handleFilterClose = useCallback(() => setFilterSheetOpen(false), []);
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => setMapBounds(bounds),
    []
  );

  const layoutProps = {
    shops,
    count: shops.length,
    selectedShopId,
    onShopClick: setSelectedShopId,
    query,
    activeFilters: filters,
    onFilterToggle: toggleFilter,
    view,
    onViewChange: handleViewChange,
    onSearch: handleSearch,
    filterSheetOpen,
    onFilterOpen: handleFilterOpen,
    onFilterClose: handleFilterClose,
    onFilterApply: handleFilterApply,
    onLocationRequest: handleLocationRequest,
    onBoundsChange: handleBoundsChange,
  };

  return (
    <MapWithFallback
      {...layoutProps}
      onShopClick={setSelectedShopId}
      view={view}
      onCardClick={handleShopNavigate}
      isDesktop={isDesktop}
    />
  );
}

export default function FindPage() {
  return (
    <>
      <WebsiteJsonLd />
      <Suspense>
        <FindPageContent />
      </Suspense>
    </>
  );
}
