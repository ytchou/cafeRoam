'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchWithAuth, fetchPublic } from '@/lib/api/fetch';
import type { FollowerCountResponse, FollowResponse } from '@/lib/types';

const fetcher = (url: string) => fetchPublic<FollowerCountResponse>(url);
const authFetcher = (url: string) => fetchWithAuth(url);

export function useShopFollow(shopId: string, isAuthenticated: boolean) {
  const { data, error, isLoading, mutate } = useSWR<FollowerCountResponse>(
    `/api/shops/${shopId}/followers/count`,
    isAuthenticated ? authFetcher : fetcher,
    { revalidateOnFocus: false }
  );

  const isFollowing = data?.isFollowing ?? false;
  const followerCount = data?.count ?? 0;
  const showCount = data?.visible ?? false;

  const toggleFollow = useCallback(async () => {
    const wasFollowing = isFollowing;
    const prevData = data;

    // Optimistic update
    mutate(
      {
        count: followerCount + (wasFollowing ? -1 : 1),
        visible: (followerCount + (wasFollowing ? -1 : 1)) >= 10,
        isFollowing: !wasFollowing,
      },
      false
    );

    try {
      const method = wasFollowing ? 'DELETE' : 'POST';
      const result: FollowResponse = await fetchWithAuth(
        `/api/shops/${shopId}/follow`,
        { method }
      );

      // Update with server response
      mutate(
        {
          count: result.followerCount,
          visible: result.followerCount >= 10,
          isFollowing: result.following,
        },
        false
      );
    } catch {
      // Rollback on error
      mutate(prevData, false);
    }
  }, [shopId, isFollowing, followerCount, data, mutate]);

  return {
    isFollowing,
    followerCount,
    showCount,
    isLoading,
    error,
    toggleFollow,
  };
}
