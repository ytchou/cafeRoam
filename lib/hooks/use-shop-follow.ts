'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchWithAuth, fetchPublic } from '@/lib/api/fetch';
import type { FollowerCountResponse, FollowResponse } from '@/lib/types';

const fetcher = (url: string) => fetchPublic<FollowerCountResponse>(url);
const authFetcher = (url: string) => fetchWithAuth(url);

export function useShopFollow(shopId: string, isAuthenticated: boolean) {
  const swrKey = `/api/shops/${shopId}/followers/count${isAuthenticated ? '?auth=1' : ''}`;
  const { data, error, isLoading, mutate } = useSWR<FollowerCountResponse>(
    swrKey,
    isAuthenticated ? authFetcher : fetcher,
    { revalidateOnFocus: false }
  );

  const isFollowing = data?.isFollowing ?? false;
  const followerCount = data?.count ?? 0;
  const showCount = data?.visible ?? false;

  const toggleFollow = useCallback(async () => {
    const wasFollowing = isFollowing;
    const prevData = data;

    const optimisticCount = Math.max(0, followerCount + (wasFollowing ? -1 : 1));
    mutate(
      {
        count: optimisticCount,
        visible: optimisticCount >= 10,
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

      mutate(
        {
          count: result.followerCount,
          visible: result.visible,
          isFollowing: result.following,
        },
        false
      );
    } catch {
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
