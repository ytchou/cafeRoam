import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShopReviews } from './use-shop-reviews';

vi.mock('swr', () => ({ default: vi.fn() }));
import useSWR from 'swr';
const mockUseSWR = vi.mocked(useSWR);

function swrReturning(data: unknown, extra?: object) {
  return {
    data,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
    ...extra,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const SHOP_ID = 'shop-abc-123';

describe('useShopReviews', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty defaults while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useShopReviews(SHOP_ID));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.averageRating).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns reviews and stats from a successful fetch', () => {
    const mockData = {
      reviews: [
        {
          id: 'r1',
          displayName: '王小明',
          stars: 4,
          reviewText: '很棒的咖啡廳',
          reviewedAt: '2026-03-01T10:00:00Z',
        },
      ],
      totalCount: 1,
      averageRating: 4.0,
    };
    mockUseSWR.mockReturnValue(swrReturning(mockData));
    const { result } = renderHook(() => useShopReviews(SHOP_ID));
    expect(result.current.reviews).toEqual(mockData.reviews);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.averageRating).toBe(4.0);
  });

  it('always passes the shop reviews URL as key to SWR', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));
    renderHook(() => useShopReviews(SHOP_ID));
    const [key] = mockUseSWR.mock.calls[0];
    expect(key).toBe(`/api/shops/${SHOP_ID}/reviews`);
  });

  it('returns empty reviews when fetch returns no data', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));
    const { result } = renderHook(() => useShopReviews(SHOP_ID));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.averageRating).toBe(0);
  });
});
