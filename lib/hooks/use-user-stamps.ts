'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

export interface StampData {
  id: string;
  user_id: string;
  shop_id: string;
  check_in_id: string;
  design_url: string;
  earned_at: string;
  shop_name: string | null; // from JOIN; null if shop was deleted
  photo_url: string | null;
  district: string | null;
  diary_note: string | null;
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useUserStamps() {
  const { data, error, isLoading, mutate } = useSWR<StampData[]>(
    '/api/stamps',
    fetcher
  );

  return {
    stamps: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
