import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock at the HTTP boundary — fetchWithAuth is the auth-gated fetch wrapper
vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn(),
  fetchPublic: vi.fn(),
}));

import { fetchWithAuth } from '@/lib/api/fetch';
import { useLikeStatus } from './use-like-status';

const mockFetch = vi.mocked(fetchWithAuth);

describe('useLikeStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty set and not loading when no checkin IDs given', () => {
    const { result } = renderHook(() => useLikeStatus([]));
    expect(result.current.likedIds).toEqual(new Set());
    expect(result.current.isLoading).toBe(false);
  });

  it('hydrates liked set from server on mount', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('ci-1')) return Promise.resolve({ liked: true });
      if (url.includes('ci-2')) return Promise.resolve({ liked: false });
      return Promise.resolve({ liked: false });
    });

    const { result } = renderHook(() => useLikeStatus(['ci-1', 'ci-2']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.likedIds).toEqual(new Set(['ci-1']));
    expect(mockFetch).toHaveBeenCalledWith('/api/explore/community/ci-1/like');
    expect(mockFetch).toHaveBeenCalledWith('/api/explore/community/ci-2/like');
  });

  it('treats unauthenticated errors as unliked without throwing', async () => {
    mockFetch.mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useLikeStatus(['ci-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.likedIds).toEqual(new Set());
  });
});
