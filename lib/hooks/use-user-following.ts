'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';
import type { FollowingListResponse } from '@/lib/types';

const fetcher = (url: string) => fetchWithAuth(url);

export function useUserFollowing(page: number = 1) {
  const { data, error, isLoading, mutate } = useSWR<FollowingListResponse>(
    `/api/me/following?page=${page}&limit=20`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    shops: data?.shops ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    isLoading,
    error,
    mutate,
  };
}
