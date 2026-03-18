'use client';

import useSWR from 'swr';

import { fetchPublic } from '@/lib/api/fetch';
import type { CommunityFeedResponse } from '@/types/community';

export function useCommunityFeed(cursor: string | null) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  const url = `/api/explore/community${query ? `?${query}` : ''}`;

  const { data, isLoading, error, mutate } = useSWR<CommunityFeedResponse>(
    url,
    fetchPublic,
    { revalidateOnFocus: false },
  );

  return {
    notes: data?.notes ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    mutate,
  };
}
