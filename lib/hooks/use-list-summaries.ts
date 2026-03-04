'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

export interface ListSummaryData {
  id: string;
  name: string;
  shop_count: number;
  preview_photos: string[];
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useListSummaries() {
  const { data, error, isLoading } = useSWR<ListSummaryData[]>(
    '/api/lists/summaries',
    fetcher
  );

  return {
    lists: data ?? [],
    isLoading,
    error,
  };
}
