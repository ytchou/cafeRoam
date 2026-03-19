'use client';
import { useMemo, useState, Suspense, useCallback } from 'react';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useShops } from '@/lib/hooks/use-shops';
import { useSearch } from '@/lib/hooks/use-search';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { MapMobileLayout } from '@/components/map/map-mobile-layout';
import { ListMobileLayout } from '@/components/map/list-mobile-layout';
import { MapDesktopLayout } from '@/components/map/map-desktop-layout';
import { ListDesktopLayout } from '@/components/map/list-desktop-layout';

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

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      setSelectedShopId(null);
    },
    [setQuery]
  );

  const handleViewChange = useCallback(
    (newView: 'map' | 'list') => {
      if (newView === view) return;
      capture('view_toggled', { to_view: newView });
      setView(newView);
    },
    [view, capture, setView]
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
      <ListDesktopLayout {...layoutProps} />
    ) : (
      <MapDesktopLayout {...layoutProps} />
    );
  }

  return view === 'list' ? (
    <ListMobileLayout {...layoutProps} />
  ) : (
    <MapMobileLayout {...layoutProps} />
  );
}

export default function FindPage() {
  return (
    <Suspense>
      <FindPageContent />
    </Suspense>
  );
}
