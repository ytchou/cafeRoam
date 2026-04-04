'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ModeChips } from '@/components/discovery/mode-chips';
import { SuggestionChips } from '@/components/discovery/suggestion-chips';
import { ShopCardCompact } from '@/components/shops/shop-card-compact';
import { trackSearch, trackSignupCtaClick } from '@/lib/analytics/ga4-events';
import { useSearch } from '@/lib/hooks/use-search';
import { useSearchState, type SearchMode } from '@/lib/hooks/use-search-state';
import { useShops } from '@/lib/hooks/use-shops';
import { useUser } from '@/lib/hooks/use-user';
import type { Shop } from '@/lib/types';

const FREE_SEARCH_KEY = 'caferoam_free_search_used';

function getShopHref(shop: Shop): string {
  return `/shops/${shop.id}`;
}

export function DiscoveryPage() {
  const router = useRouter();
  const { query, mode, setQuery, setMode } = useSearchState();
  const { user } = useUser();
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const lastHandledQueryRef = useRef<string | null>(null);

  const {
    results,
    isLoading: isSearchLoading,
    error: searchError,
    queryType,
  } = useSearch(isSearching ? trimmedQuery : null, mode as SearchMode);
  const {
    shops: featuredShops,
    isLoading: isFeaturedLoading,
    error: featuredError,
  } = useShops({ featured: true, limit: 8 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      lastHandledQueryRef.current = null;
      return;
    }
    if (!trimmedQuery) {
      lastHandledQueryRef.current = null;
      return;
    }
    // Wait for the server response to know the query type
    if (queryType === null) return;
    if (lastHandledQueryRef.current === trimmedQuery) return;

    // Name searches are always free per SPEC — only gate semantic/vibe searches
    if (queryType !== 'semantic') {
      lastHandledQueryRef.current = trimmedQuery;
      return;
    }

    const hasUsedFreeSearch =
      window.localStorage.getItem(FREE_SEARCH_KEY) === 'true';

    if (hasUsedFreeSearch) {
      trackSignupCtaClick('homepage_free_search_gate');
      router.push('/login?returnTo=/');
      lastHandledQueryRef.current = trimmedQuery;
      return;
    }

    window.localStorage.setItem(FREE_SEARCH_KEY, 'true');
    trackSearch(trimmedQuery);
    lastHandledQueryRef.current = trimmedQuery;
  }, [query, trimmedQuery, user, router, queryType]);

  const shopsToRender = isSearching ? results : featuredShops;
  const isLoading = isSearching ? isSearchLoading : isFeaturedLoading;
  const error = isSearching ? searchError : featuredError;
  const sectionTitle = isSearching ? '搜尋結果' : '精選咖啡廳';

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[#3d2314] px-5 pt-8 pb-8 text-white">
        <div className="mx-auto max-w-5xl">
          <span className="text-brand text-sm font-semibold tracking-[0.2em]">
            啡遊
          </span>
          <h1 className="mt-4 flex flex-col text-4xl font-bold tracking-tight sm:text-5xl">
            <span>找到你的</span>
            <span className="text-white/80">理想咖啡廳</span>
          </h1>
          <div className="mt-6">
            <label htmlFor="discovery-search" className="sr-only">
              搜尋咖啡廳
            </label>
            <input
              id="discovery-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="想找什麼樣的咖啡廳？"
              className="w-full rounded-full border border-white/10 bg-white px-5 py-4 text-base text-gray-900 ring-0 outline-none placeholder:text-gray-500"
            />
          </div>
          <div className="mt-4">
            <SuggestionChips onSelect={setQuery} />
          </div>
        </div>
      </section>

      <section className="border-b border-[#e5e7eb] bg-white px-5 py-4">
        <div className="mx-auto max-w-5xl">
          <ModeChips activeMode={mode} onModeChange={setMode} />
        </div>
      </section>

      <section className="bg-white px-5 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {sectionTitle}
            </h2>
            <Link
              href="/find"
              className="bg-brand inline-flex shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              地圖瀏覽
            </Link>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-600">載入中...</p>
          ) : error ? (
            <p className="text-sm text-red-600">暫時無法載入資料。</p>
          ) : shopsToRender.length === 0 ? (
            <p className="text-sm text-gray-600">
              {isSearching
                ? '目前沒有符合條件的咖啡廳。'
                : '暫時沒有精選咖啡廳。'}
            </p>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-sm">
              {shopsToRender.map((shop) => (
                <ShopCardCompact
                  key={shop.id}
                  shop={shop}
                  onClick={() => router.push(getShopHref(shop))}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
