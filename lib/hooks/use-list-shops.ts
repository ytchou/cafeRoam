'use client';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

export interface ListShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  review_count: number;
  photo_urls: string[];
  taxonomy_tags: { label_zh?: string; labelZh?: string }[];
  is_open?: boolean | null;
}

export function useListShops(listId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ListShop[]>(
    listId ? `/api/lists/${listId}/shops` : null,
    fetchWithAuth
  );
  return { shops: data ?? [], error, isLoading, mutate };
}
