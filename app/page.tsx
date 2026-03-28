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
    if (filters.includes('rating')) {
      return [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (latitude != null && longitude != null) {
      return [...base].sort((a, b) => {
        const dA =
          a.latitude != null && a.longitude != null
            ? haversineKm(latitude, longitude, a.latitude, a.longitude)
            : Infinity;
        const dB =
          b.latitude != null && b.longitude != null
            ? haversineKm(latitude, longitude, b.latitude, b.longitude)
            : Infinity;
        return dA - dB;
      });
    }
    return base;
  }, [
    query,
    searchLoading,
    searchResults,
    featuredShops,
    filters,
    latitude,
    longitude,
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
  };

  if (isDesktop) {
    return view === 'list' ? (
      <ListDesktopLayout {...layoutProps} onShopClick={handleShopNavigate} />
    ) : (
      <MapDesktopLayout {...layoutProps} onCardClick={handleShopNavigate} />
    );
  }

  return view === 'list' ? (
    <ListMobileLayout {...layoutProps} onShopClick={handleShopNavigate} />
  ) : (
    <MapMobileLayout {...layoutProps} onCardClick={handleShopNavigate} />
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
