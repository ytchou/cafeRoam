'use client';
import { useMemo, useState, Suspense, useCallback } from 'react';
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
import { MapMobileLayout } from '@/components/map/map-mobile-layout';
import { ListMobileLayout } from '@/components/map/list-mobile-layout';
import { MapDesktopLayout } from '@/components/map/map-desktop-layout';
import { ListDesktopLayout } from '@/components/map/list-desktop-layout';

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
    onLocationRequest: requestLocation,
  };

  if (isDesktop) {
    return view === 'list' ? (
      <ListDesktopLayout {...layoutProps} onShopClick={handleShopNavigate} />
    ) : (
      <MapDesktopLayout {...layoutProps} />
    );
  }

  return view === 'list' ? (
    <ListMobileLayout {...layoutProps} onShopClick={handleShopNavigate} />
  ) : (
    <MapMobileLayout {...layoutProps} />
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
