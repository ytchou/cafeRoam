'use client';
import Link from 'next/link';
import type { ShopReview } from '@/lib/hooks/use-shop-reviews';

interface ShopReviewsProps {
  reviews: ShopReview[];
  total: number;
  averageRating: number;
  isLoading: boolean;
  isAuthError: boolean;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= stars ? 'text-[#E06B3F]' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FAF0E8] text-sm font-semibold text-[#E06B3F]">
      {initial}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ShopReviews({
  reviews,
  total,
  averageRating,
  isLoading,
  isAuthError,
}: ShopReviewsProps) {
  if (isAuthError) {
    return (
      <div className="px-4 py-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">打卡評價</h2>
        <p className="text-sm text-gray-500">
          <Link href="/login" className="text-[#E06B3F] underline underline-offset-2">
            登入
          </Link>{' '}
          後可查看其他人的評價
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="px-4 py-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-gray-900">打卡評價</h2>
        <span className="text-xs text-gray-400">{total} 則</span>
        {averageRating > 0 && (
          <span className="ml-auto text-sm font-semibold text-[#E06B3F]">
            ★ {averageRating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {reviews.map((review) => (
          <div key={review.id} className="py-3">
            <div className="flex items-start gap-3">
              <Avatar name={review.displayName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {review.displayName ?? '匿名'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(review.reviewedAt)}</span>
                </div>
                <StarRating stars={review.stars} />
                {review.reviewText && (
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {review.reviewText}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
