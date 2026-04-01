import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShopReviews } from './shop-reviews';
import type { ShopReview } from '@/lib/hooks/use-shop-reviews';

const SAMPLE_REVIEW: ShopReview = {
  id: 'rev-1',
  displayName: '王小明',
  stars: 4,
  reviewText: '環境很安靜，很適合讀書',
  reviewedAt: '2026-03-01T10:00:00Z',
};

function renderReviews(
  overrides: Partial<Parameters<typeof ShopReviews>[0]> = {}
) {
  return render(
    <ShopReviews
      reviews={[]}
      totalCount={0}
      averageRating={0}
      isLoading={false}
      isAuthError={false}
      shopId="shop-123"
      {...overrides}
    />
  );
}

describe('ShopReviews', () => {
  describe('when the user is not authenticated', () => {
    it('shows a login prompt instead of reviews', () => {
      renderReviews({ isAuthError: true });
      expect(screen.getByText('登入')).toBeInTheDocument();
      expect(screen.getByText(/後可查看其他人的評價/)).toBeInTheDocument();
    });

    it('links the login prompt to the login page', () => {
      renderReviews({ isAuthError: true });
      expect(screen.getByRole('link', { name: '登入' })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });

  describe('while reviews are loading', () => {
    it('shows a loading skeleton', () => {
      renderReviews({ isLoading: true });
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('does not show any review content', () => {
      renderReviews({ isLoading: true });
      expect(screen.queryByText('打卡評價')).not.toBeInTheDocument();
    });
  });

  describe('when there are no reviews', () => {
    it('renders nothing', () => {
      const { container } = renderReviews({ reviews: [] });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when reviews are available', () => {
    it('shows the section heading', () => {
      renderReviews({ reviews: [SAMPLE_REVIEW], totalCount: 1 });
      expect(screen.getByText('打卡評價')).toBeInTheDocument();
    });

    it('shows the reviewer display name', () => {
      renderReviews({ reviews: [SAMPLE_REVIEW], totalCount: 1 });
      expect(screen.getByText('王小明')).toBeInTheDocument();
    });

    it('shows the review text', () => {
      renderReviews({ reviews: [SAMPLE_REVIEW], totalCount: 1 });
      expect(screen.getByText('環境很安靜，很適合讀書')).toBeInTheDocument();
    });

    it('shows the review count', () => {
      renderReviews({ reviews: [SAMPLE_REVIEW], totalCount: 1 });
      expect(screen.getByText('1 則')).toBeInTheDocument();
    });

    it('shows the average rating when above 0', () => {
      renderReviews({
        reviews: [SAMPLE_REVIEW],
        totalCount: 1,
        averageRating: 4.2,
      });
      expect(screen.getByText('★ 4.2')).toBeInTheDocument();
    });

    it('falls back to 匿名 when display name is null', () => {
      const anonymous = { ...SAMPLE_REVIEW, displayName: null };
      renderReviews({ reviews: [anonymous], totalCount: 1 });
      expect(screen.getByText('匿名')).toBeInTheDocument();
    });

    it('does not show review text when reviewText is null', () => {
      const noText = { ...SAMPLE_REVIEW, reviewText: null };
      renderReviews({ reviews: [noText], totalCount: 1 });
      expect(
        screen.queryByText('環境很安靜，很適合讀書')
      ).not.toBeInTheDocument();
    });

    it('shows a "See all" link when there are more reviews than displayed', () => {
      const manyReviews = Array.from({ length: 4 }, (_, i) => ({
        id: `r${i}`,
        stars: 4,
        reviewText: `Review ${i}`,
        reviewedAt: '2026-01-01T00:00:00Z',
        displayName: `User ${i}`,
      }));
      renderReviews({
        reviews: manyReviews,
        totalCount: 12,
        averageRating: 4.2,
        shopId: 'shop-123',
      });
      expect(
        screen.getByRole('link', { name: /See all/i })
      ).toBeInTheDocument();
    });
  });
});
