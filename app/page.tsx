'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ModeChips } from '@/components/discovery/mode-chips';
import { SearchBar } from '@/components/discovery/search-bar';
import { StickySearchBar } from '@/components/discovery/sticky-search-bar';
import { SuggestionChips } from '@/components/discovery/suggestion-chips';
import {
  FILTER_TO_TAG_IDS,
  type TagFilterId,
} from '@/components/filters/filter-map';
import { MapWithFallback } from '@/components/map/map-with-fallback';
import { PreferenceOnboardingModal } from '@/components/onboarding/preference-modal';
import { WebsiteJsonLd } from '@/components/seo/WebsiteJsonLd';
import { trackSearch, trackSignupCtaClick } from '@/lib/analytics/ga4-events';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useSearch } from '@/lib/hooks/use-search';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useShops } from '@/lib/hooks/use-shops';
import { useUser } from '@/lib/hooks/use-user';
import { haversineKm } from '@/lib/utils';
import { filterByBounds, type MapBounds } from '@/lib/utils/filter-by-bounds';

const FREE_SEARCH_KEY = 'caferoam_free_search_used';

function HomePageContent() {
  const router = useRouter();
  const {
    query,
    mode,
    filters,
    view,
    setQuery,
    setMode,
    toggleFilter,
    setFilters,
    setView,
  } = useSearchState();
  const { user } = useUser();

  const currentQuery = query ?? '';
  const isDesktop = useIsDesktop();
  const { shops: featuredShops } = useShops({ featured: true, limit: 200 });
  const {
    results: searchResults,
    isLoading: searchLoading,
    queryType,
  } = useSearch(currentQuery || null, mode);
  const { latitude, longitude, requestLocation } = useGeolocation();

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const lastHandledQueryRef = useRef<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      lastHandledQueryRef.current = null;
      return;
    }
    if (!currentQuery) {
      lastHandledQueryRef.current = null;
      return;
    }
    if (queryType === null) return;
    if (lastHandledQueryRef.current === currentQuery) return;

    if (queryType !== 'semantic') {
      lastHandledQueryRef.current = currentQuery;
      return;
    }

    const hasUsedFreeSearch =
      window.localStorage.getItem(FREE_SEARCH_KEY) === 'true';

    if (hasUsedFreeSearch) {
      trackSignupCtaClick('homepage_free_search_gate');
      router.push('/login?returnTo=/');
      lastHandledQueryRef.current = currentQuery;
      return;
    }

    window.localStorage.setItem(FREE_SEARCH_KEY, 'true');
    trackSearch(currentQuery);
    lastHandledQueryRef.current = currentQuery;
  }, [currentQuery, user, router, queryType]);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(!!entry?.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleLocationRequest = useCallback(async () => {
    const coords = await requestLocation();
    if (!coords) {
      toast.error('無法取得位置，請確認定位權限');
    }
  }, [requestLocation]);

  const shops = useMemo(() => {
    const base = currentQuery
      ? searchLoading
        ? []
        : searchResults.length > 0
          ? searchResults
          : featuredShops
      : featuredShops;

    const activeFiltersSet = new Set(filters);
    const tagFilters = filters
      .filter((filter): filter is TagFilterId => filter in FILTER_TO_TAG_IDS)
      .map((filter) => FILTER_TO_TAG_IDS[filter]);

    let filtered = base;
    if (tagFilters.length > 0) {
      const shopTagSets = new Map(
        filtered.map((shop) => [
          shop.id,
          new Set((shop.taxonomyTags ?? []).map((tag) => tag.id)),
        ])
      );
      filtered = filtered.filter((shop) =>
        tagFilters.every(
          (tagId) => shopTagSets.get(shop.id)?.has(tagId) ?? false
        )
      );
    }

    if (activeFiltersSet.has('open_now')) {
      filtered = filtered.filter((shop) => shop.isOpen === true);
    }

    const hasGeo = latitude != null && longitude != null;
    const attachDistance = <T extends (typeof filtered)[number]>(
      source: T[]
    ): (T & { distance_m: number | null })[] =>
      source.map((shop) => {
        const km =
          hasGeo && shop.latitude != null && shop.longitude != null
            ? haversineKm(latitude!, longitude!, shop.latitude, shop.longitude)
            : null;

        return {
          ...shop,
          distance_m: km != null ? Math.round(km * 1000) : null,
        };
      });

    if (activeFiltersSet.has('rating')) {
      const sorted = [...filtered].sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
      );
      const result = attachDistance(sorted);
      return view === 'map' ? filterByBounds(result, mapBounds) : result;
    }

    if (hasGeo) {
      const withDistance = attachDistance(filtered);
      const sorted = withDistance.sort(
        (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)
      );
      return view === 'map' ? filterByBounds(sorted, mapBounds) : sorted;
    }

    return view === 'map' ? filterByBounds(filtered, mapBounds) : filtered;
  }, [
    currentQuery,
    featuredShops,
    filters,
    latitude,
    longitude,
    mapBounds,
    searchLoading,
    searchResults,
    view,
  ]);

  const handleSearchSubmit = useCallback(
    (nextQuery: string) => {
      const trimmedQuery = nextQuery.trim();
      if (!trimmedQuery) return;
      setQuery(trimmedQuery);
      setSelectedShopId(null);
    },
    [setQuery]
  );

  const handleSuggestionSelect = useCallback(
    (nextQuery: string) => {
      handleSearchSubmit(nextQuery);
    },
    [handleSearchSubmit]
  );

  const handleNearMe = useCallback(async () => {
    await handleLocationRequest();
    handleSearchSubmit('附近的咖啡廳');
  }, [handleLocationRequest, handleSearchSubmit]);

  const handleViewChange = useCallback(
    (nextView: 'map' | 'list') => {
      if (nextView === view) return;
      setView(nextView);
      setSelectedShopId(null);
    },
    [setView, view]
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

  return (
    <div className="min-h-screen bg-white">
      <WebsiteJsonLd />

      <div
        data-testid="sticky-search-bar-wrapper"
        className={heroVisible ? 'invisible h-0 overflow-hidden' : ''}
      >
        <StickySearchBar
          defaultQuery={currentQuery}
          onSubmit={handleSearchSubmit}
          onFilterClick={handleFilterOpen}
        />
      </div>

      <section ref={heroRef} className="bg-[#3d2314] px-5 pt-8 pb-8 text-white">
        <div className="mx-auto max-w-5xl">
          <span className="text-brand text-sm font-semibold tracking-[0.2em]">
            啡遊
          </span>
          <h1 className="mt-4 flex flex-col text-4xl font-bold tracking-tight sm:text-5xl">
            <span>找到你的</span>
            <span className="text-white/80">理想咖啡廳</span>
          </h1>
          <div className="mt-6">
            <SearchBar
              onSubmit={handleSearchSubmit}
              defaultQuery={currentQuery}
            />
          </div>
          <div className="mt-4">
            <ModeChips activeMode={mode} onModeChange={setMode} />
          </div>
          <div className="mt-4">
            <SuggestionChips
              onSelect={handleSuggestionSelect}
              onNearMe={handleNearMe}
            />
          </div>
        </div>
      </section>

      <section className="h-[calc(100vh-240px)] min-h-[420px] bg-white">
        <MapWithFallback
          shops={shops}
          count={shops.length}
          selectedShopId={selectedShopId}
          onShopClick={setSelectedShopId}
          query={currentQuery}
          activeFilters={filters}
          onFilterToggle={toggleFilter}
          view={view}
          onViewChange={handleViewChange}
          onSearch={handleSearchSubmit}
          filterSheetOpen={filterSheetOpen}
          onFilterOpen={handleFilterOpen}
          onFilterClose={handleFilterClose}
          onFilterApply={handleFilterApply}
          onLocationRequest={handleLocationRequest}
          onBoundsChange={handleBoundsChange}
          onCardClick={handleShopNavigate}
          isDesktop={isDesktop}
        />
      </section>
      {user && <PreferenceOnboardingModal />}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}
