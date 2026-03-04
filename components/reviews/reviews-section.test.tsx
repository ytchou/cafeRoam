import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

const mockFetchWithAuth = vi.fn();
vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

import { ReviewsSection } from './reviews-section';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

describe('ReviewsSection', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
  });

  it('renders average rating and review count', async () => {
    mockFetchWithAuth.mockResolvedValue({
      reviews: [
        {
          id: 'ci-1',
          userId: 'u-1',
          displayName: 'Alice',
          stars: 4,
          reviewText: 'Great latte!',
          confirmedTags: ['quiet'],
          reviewedAt: '2026-03-04T10:00:00Z',
        },
      ],
      total_count: 1,
      average_rating: 4.5,
    });

    render(
      <Wrapper>
        <ReviewsSection shopId="shop-1" isAuthenticated={true} />
      </Wrapper>
    );
    expect(await screen.findByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/1 review/i)).toBeInTheDocument();
    expect(screen.getByText(/Great latte!/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('does not render when not authenticated', () => {
    render(
      <Wrapper>
        <ReviewsSection shopId="shop-1" isAuthenticated={false} />
      </Wrapper>
    );
    expect(screen.queryByText(/User Reviews/)).not.toBeInTheDocument();
  });

  it('does not render when there are no reviews', async () => {
    mockFetchWithAuth.mockResolvedValue({
      reviews: [],
      total_count: 0,
      average_rating: 0,
    });

    render(
      <Wrapper>
        <ReviewsSection shopId="shop-2" isAuthenticated={true} />
      </Wrapper>
    );
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalled();
    });
    expect(screen.queryByText(/User Reviews/)).not.toBeInTheDocument();
  });
});
