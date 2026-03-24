'use client';

import useSWR from 'swr';

import { fetchWithAuth } from '@/lib/api/fetch';
import type { CommunityFeedResponse } from '@/types/community';

interface CommunityFeedOptions {
  cursor: string | null;
  mrt?: string | null;
  vibeTag?: string | null;
}

export function useCommunityFeed({
  cursor,
  mrt,
  vibeTag,
}: CommunityFeedOptions) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (mrt) params.set('mrt', mrt);
  if (vibeTag) params.set('vibe_tag', vibeTag);
  const query = params.toString();
  const url = `/api/explore/community${query ? `?${query}` : ''}`;

  const { data, isLoading, error, mutate } = useSWR<CommunityFeedResponse>(
    url,
    fetchWithAuth,
    { revalidateOnFocus: false }
  );

  return {
    notes: data?.notes ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    mutate,
  };
}
