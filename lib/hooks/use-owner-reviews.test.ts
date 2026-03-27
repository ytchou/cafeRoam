import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMutate = vi.fn();

const mockReviews = [
  {
    id: 'checkin-1',
    checkin_id: 'checkin-1',
    display_name: '林小明',
    stars: 4,
    review_text: '咖啡很棒！',
    reviewed_at: '2026-03-20T10:00:00Z',
    owner_response: null,
    owner_responded_at: null,
  },
];

vi.mock('swr', () => ({
  default: vi.fn((key: string | null) => {
    if (!key) return { data: undefined, isLoading: true, mutate: mockMutate };
    return {
      data: { reviews: mockReviews, total: 1, page: 1 },
      isLoading: false,
      mutate: mockMutate,
    };
  }),
}));

vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({}),
}));

import { useOwnerReviews } from './use-owner-reviews';
import { fetchWithAuth } from '@/lib/api/fetch';

const mockFetchWithAuth = vi.mocked(fetchWithAuth);

describe('useOwnerReviews', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns reviews and total from SWR', () => {
    const { result } = renderHook(() => useOwnerReviews('shop-abc'));
    expect(result.current.reviews).toEqual(mockReviews);
    expect(result.current.total).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty array when shopId is empty', () => {
    const { result } = renderHook(() => useOwnerReviews(''));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('owner posting a response sends POST request with response body', async () => {
    const { result } = renderHook(() => useOwnerReviews('shop-abc'));
    await act(async () => {
      await result.current.postResponse('checkin-1', '感謝您的評論！');
    });
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/owner/shop-abc/reviews/checkin-1/response',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: '感謝您的評論！' }),
      })
    );
    expect(mockMutate).toHaveBeenCalled();
  });

});
