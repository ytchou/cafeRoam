'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch';

interface OwnerReview {
  id: string;
  checkin_id: string;
  display_name: string;
  stars: number;
  review_text: string | null;
  reviewed_at: string;
  owner_response: string | null;
  owner_responded_at: string | null;
}

interface ReviewsResponse {
  reviews: OwnerReview[];
  total: number;
  page: number;
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useOwnerReviews(shopId: string, page = 1) {
  const { data, isLoading, mutate } = useSWR<ReviewsResponse>(
    shopId ? `/api/owner/${shopId}/reviews?page=${page}` : null,
    fetcher
  );

  const postResponse = useCallback(
    async (checkinId: string, body: string) => {
      await fetchWithAuth(
        `/api/owner/${shopId}/reviews/${checkinId}/response`,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        }
      );
      mutate();
    },
    [shopId, mutate]
  );

  return {
    reviews: data?.reviews ?? [],
    total: data?.total ?? 0,
    isLoading,
    postResponse,
  };
}
