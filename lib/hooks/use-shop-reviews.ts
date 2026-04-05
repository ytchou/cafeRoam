'use client';
import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';

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

export function useShopReviews(shopId: string) {
  const { data, isLoading, error } = useSWR<ReviewsData>(
    `/api/shops/${shopId}/reviews`,
    fetchPublic,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    reviews: data?.reviews ?? [],
    totalCount: data?.totalCount ?? 0,
    averageRating: data?.averageRating ?? 0,
    isLoading,
    error,
  };
}
