'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';
import { StarRating } from '@/components/reviews/star-rating';
import { ReviewCard } from '@/components/reviews/review-card';
import type { ShopReviewsResponse } from '@/lib/types';

interface ReviewsSectionProps {
  shopId: string;
  isAuthenticated: boolean;
}

export function ReviewsSection({
  shopId,
  isAuthenticated,
}: ReviewsSectionProps) {
  const apiUrl = `/api/shops/${shopId}/reviews`;
  const fetcher = useCallback(() => fetchWithAuth(apiUrl), [apiUrl]);
  const { data } = useSWR<ShopReviewsResponse>(
    isAuthenticated ? apiUrl : null,
    fetcher
  );

  if (!isAuthenticated || !data || data.total_count === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-semibold">User Reviews</h3>
        <StarRating value={Math.round(data.average_rating)} size="sm" />
        <span className="text-sm text-gray-500">
          {data.average_rating} · {data.total_count}{' '}
          {data.total_count === 1 ? 'review' : 'reviews'}
        </span>
      </div>
      <div>
        {data.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
