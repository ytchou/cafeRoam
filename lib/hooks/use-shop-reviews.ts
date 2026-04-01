'use client';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

export interface ShopReview {
  id: string;
  displayName: string | null;
  stars: number;
  reviewText: string | null;
  reviewedAt: string;
}

interface ReviewsData {
  reviews: ShopReview[];
  totalCount: number;
  averageRating: number;
}

export function useShopReviews(shopId: string, enabled: boolean) {
  const { data, isLoading, error } = useSWR<ReviewsData>(
    enabled ? `/api/shops/${shopId}/reviews` : null,
    fetchWithAuth,
    {
      revalidateOnFocus: false,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (
          err.message.includes('401') ||
          err.message.includes('Not authenticated')
        )
          return;
        if (retryCount >= 2) return;
        revalidate({ retryCount });
      },
    }
  );

  return {
    reviews: data?.reviews ?? [],
    totalCount: data?.totalCount ?? 0,
    averageRating: data?.averageRating ?? 0,
    isLoading,
    isAuthError:
      error != null &&
      (error.message.includes('Not authenticated') ||
        error.message.includes('401')),
  };
}
