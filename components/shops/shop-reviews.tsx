'use client';
import Link from 'next/link';
import type { ShopReview } from '@/lib/hooks/use-shop-reviews';

interface ShopReviewsProps {
  reviews: ShopReview[];
  total: number;
  averageRating: number;
  isLoading: boolean;
  isAuthError: boolean;
  shopId: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= stars ? 'text-brand' : 'text-gray-200'}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-avatar text-sm font-semibold text-brand">
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
  shopId,
}: ShopReviewsProps) {
  if (isAuthError) {
    return (
      <div className="px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">打卡評價</h2>
        <p className="text-sm text-text-secondary">
          <Link
            href="/login"
            className="text-brand underline underline-offset-2"
          >
            登入
          </Link>{' '}
          後可查看其他人的評價
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-text-primary">打卡評價</h2>
        <span className="text-xs text-text-meta">{total} 則</span>
        {averageRating > 0 && (
          <span className="ml-auto text-sm font-semibold text-brand">
            ★ {averageRating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="divide-y divide-surface-card">
        {reviews.map((review) => (
          <div key={review.id} className="py-3">
            <div className="flex items-start gap-3">
              <Avatar name={review.displayName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {review.displayName ?? '匿名'}
                  </span>
                  <span className="text-xs text-text-meta">
                    {formatDate(review.reviewedAt)}
                  </span>
                </div>
                <StarRating stars={review.stars} />
                {review.reviewText && (
                  <p className="mt-1.5 text-sm leading-relaxed text-text-body">
                    {review.reviewText}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {total > reviews.length && (
        <Link
          href={`/shops/${shopId}/reviews`}
          className="mt-3 block text-sm font-medium text-status-open-text"
        >
          See all {total} reviews →
        </Link>
      )}
    </section>
  );
}
