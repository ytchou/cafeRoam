'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SearchBar } from '@/components/discovery/search-bar';
import { SuggestionChips } from '@/components/discovery/suggestion-chips';
import { ModeChips } from '@/components/discovery/mode-chips';
import { FilterPills } from '@/components/discovery/filter-pills';
import { FilterSheet } from '@/components/discovery/filter-sheet';
import { ShopCard } from '@/components/shops/shop-card';
import { useShops } from '@/lib/hooks/use-shops';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import type { SearchMode } from '@/lib/hooks/use-search-state';
import type { Shop } from '@/lib/types';

type SortKey = 'default' | 'rating';

function applySort(shops: Shop[], mode: SearchMode, activeFilters: string[], sortBy: SortKey): Shop[] {
  const sorted = [...shops];

  switch (mode) {
    case 'work':
      return sorted.sort((a, b) => (b.modeWork ?? 0) - (a.modeWork ?? 0));
    case 'rest':
      return sorted.sort((a, b) => (b.modeRest ?? 0) - (a.modeRest ?? 0));
    case 'social':
      return sorted.sort((a, b) => (b.modeSocial ?? 0) - (a.modeSocial ?? 0));
    default:
      break;
  }

  if (sortBy === 'rating' || activeFilters.includes('rating')) {
    return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return sorted;
}

export default function HomePage() {
  const router = useRouter();
  const { shops } = useShops({ featured: true, limit: 50 });
  const { requestLocation } = useGeolocation();
  const [mode, setMode] = useState<SearchMode>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const displayedShops = useMemo(
    () => applySort(shops, mode, activeFilters, sortBy).slice(0, 12),
    [shops, mode, activeFilters, sortBy]
  );

  function handleSearch(query: string) {
    const params = new URLSearchParams({ q: query });
    if (mode) params.set('mode', mode);
    if (activeFilters.length) params.set('filters', activeFilters.join(','));
    router.push(`/map?${params.toString()}`);
  }

  async function handleNearMe() {
    const coords = await requestLocation();
    if (coords) {
      const params = new URLSearchParams({
        lat: String(coords.latitude),
        lng: String(coords.longitude),
        radius: '5',
      });
      if (mode) params.set('mode', mode);
      router.push(`/map?${params.toString()}`);
    } else {
      toast('無法取得位置，改用文字搜尋');
      handleSearch('我附近');
    }
  }

  function handleModeChange(newMode: SearchMode) {
    setMode(newMode);
    setSortBy('default');
  }

  function handleToggleFilter(filter: string) {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((x) => x !== filter) : [...prev, filter]
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <section className="bg-[#E06B3F] px-4 pt-8 pb-4">
        <SearchBar onSubmit={handleSearch} autoFocus={false} />
        <div className="mt-3">
          <SuggestionChips onSelect={handleSearch} onNearMe={handleNearMe} />
        </div>
      </section>

      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3 md:flex md:items-center md:gap-4">
        <ModeChips activeMode={mode} onModeChange={handleModeChange} />
        <FilterPills
          activeFilters={activeFilters}
          onToggle={handleToggleFilter}
          onOpenSheet={() => setFilterSheetOpen(true)}
          onNearMe={handleNearMe}
        />
      </div>

      <section className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">精選咖啡廳</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E06B3F]"
          >
            <option value="default">預設</option>
            <option value="rating">評分</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {displayedShops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </section>

      <FilterSheet
        key={filterSheetOpen ? 'open' : 'closed'}
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        onApply={setActiveFilters}
        initialFilters={activeFilters}
      />
    </div>
  );
}
