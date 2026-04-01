'use client';
import Link from 'next/link';
import type { ShopReview } from '@/lib/hooks/use-shop-reviews';

interface ShopReviewsProps {
  reviews: ShopReview[];
  totalCount: number;
  averageRating: number;
  isLoading: boolean;
  isAuthError: boolean;
  shopId: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= stars ? 'text-brand' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div className="bg-surface-avatar text-brand flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold">
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
  totalCount,
  averageRating,
  isLoading,
  isAuthError,
  shopId,
}: ShopReviewsProps) {
  if (isAuthError) {
    return (
      <div className="px-5 py-4">
        <h2 className="text-text-primary mb-2 text-sm font-semibold">
          打卡評價
        </h2>
        <p className="text-text-secondary text-sm">
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
        <h2 className="text-text-primary text-sm font-semibold">打卡評價</h2>
        <span className="text-text-meta text-xs">{totalCount} 則</span>
        {averageRating > 0 && (
          <span className="text-brand ml-auto text-sm font-semibold">
            ★ {averageRating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="divide-surface-card divide-y">
        {reviews.map((review) => (
          <div key={review.id} className="py-3">
            <div className="flex items-start gap-3">
              <Avatar name={review.displayName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary text-sm font-medium">
                    {review.displayName ?? '匿名'}
                  </span>
                  <span className="text-text-meta text-xs">
                    {formatDate(review.reviewedAt)}
                  </span>
                </div>
                <StarRating stars={review.stars} />
                {review.reviewText && (
                  <p className="text-text-body mt-1.5 text-sm leading-relaxed">
                    {review.reviewText}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalCount > reviews.length && (
        <Link
          href={`/shops/${shopId}/reviews`}
          className="text-link-green mt-3 block text-sm font-medium"
        >
          See all {totalCount} reviews →
        </Link>
      )}
    </section>
  );
}
