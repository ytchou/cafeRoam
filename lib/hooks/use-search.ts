'use client';
import useSWR from 'swr';
import { fetchOptionalAuth } from '@/lib/api/fetch';
import type { Shop } from '@/lib/types';
import type { SearchMode } from './use-search-state';

interface SearchResult {
  shop: Shop;
  similarity_score: number;
  total_score: number;
}

interface SearchResponse {
  results: SearchResult[];
  query_type: string;
  result_count: number;
}

export function useSearch(query: string | null, mode: SearchMode) {
  const key = query
    ? `/api/search?text=${encodeURIComponent(query)}${mode ? `&mode=${mode}` : ''}`
    : null;

  const { data, isLoading, error } = useSWR<SearchResponse>(
    key,
    fetchOptionalAuth,
    { revalidateOnFocus: false }
  );

  return {
    results: data?.results.map((r) => r.shop) ?? [],
    queryType: data?.query_type ?? null,
    resultCount: data?.result_count ?? 0,
    isLoading,
    error,
  };
}
