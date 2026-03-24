'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useSearch } from '@/lib/hooks/use-search';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { ShopCard } from '@/components/shops/shop-card';
import { SuggestionChips } from '@/components/discovery/suggestion-chips';
import { SearchBar } from '@/components/discovery/search-bar';
import { useAnalytics } from '@/lib/posthog/use-analytics';

function SearchPageContent() {
  const { query, mode, setQuery } = useSearchState();
  const { results, isLoading, error, queryType, resultCount } = useSearch(
    query || null,
    mode
  );
  const { capture } = useAnalytics();
  const lastFiredQuery = useRef<string | null>(null);

  useEffect(() => {
    if (query && !isLoading && query !== lastFiredQuery.current) {
      capture('search_submitted', {
        query_text: query,
        query_type: queryType ?? 'unknown',
        mode_chip_active: mode ?? 'none',
        result_count: resultCount,
      });
      lastFiredQuery.current = query;
    }
  }, [query, isLoading, queryType, resultCount, mode, capture]);

  return (
    <div className="bg-surface-warm min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
        <SearchBar onSubmit={setQuery} defaultQuery={query} />
      </div>

      <div className="px-4 py-4">
        {isLoading && (
          <div className="py-12 text-center text-gray-400">搜尋中…</div>
        )}

        {!isLoading && error && (
          <div className="py-12 text-center">
            <p className="mb-4 text-gray-500">搜尋失敗，請稍後再試</p>
            <SuggestionChips onSelect={setQuery} />
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="mb-4 text-gray-500">
              {query ? `沒有找到結果「${query}」` : '輸入關鍵字開始搜尋'}
            </p>
            <SuggestionChips onSelect={setQuery} />
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop as Parameters<typeof ShopCard>[0]['shop']}
                searchQuery={query ?? undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-gray-400">搜尋中…</div>}
    >
      <SearchPageContent />
    </Suspense>
  );
}
