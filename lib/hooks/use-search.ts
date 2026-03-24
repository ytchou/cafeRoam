'use client';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';
import type { Shop } from '@/lib/types';
import type { SearchMode } from './use-search-state';

interface SearchResponse {
  results: Shop[];
  query_type: string;
  result_count: number;
}

export function useSearch(query: string | null, mode: SearchMode) {
  const key = query
    ? `/api/search?text=${encodeURIComponent(query)}${mode ? `&mode=${mode}` : ''}`
    : null;

  const { data, isLoading, error } = useSWR<SearchResponse>(
    key,
    fetchWithAuth,
    { revalidateOnFocus: false }
  );

  return {
    results: data?.results ?? [],
    queryType: data?.query_type ?? null,
    resultCount: data?.result_count ?? 0,
    isLoading,
    error,
  };
}
