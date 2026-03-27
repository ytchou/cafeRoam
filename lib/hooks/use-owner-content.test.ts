import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMutate = vi.fn();
const mockMutateTags = vi.fn();

vi.mock('swr', () => ({
  default: vi.fn((key: string | null) => {
    if (key?.includes('/story')) {
      return {
        data: {
          id: 'story-1',
          body: '原始故事',
          is_published: false,
        },
        isLoading: false,
        mutate: mockMutate,
      };
    }
    if (key?.includes('/tags')) {
      return {
        data: { tags: ['安靜', '有插座'] },
        isLoading: false,
        mutate: mockMutateTags,
      };
    }
    return { data: undefined, isLoading: true, mutate: vi.fn() };
  }),
}));

vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({}),
}));

import { useOwnerContent } from './use-owner-content';
import { fetchWithAuth } from '@/lib/api/fetch';

const mockFetchWithAuth = vi.mocked(fetchWithAuth);

describe('useOwnerContent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns story body and tags from SWR', () => {
    const { result } = renderHook(() => useOwnerContent('shop-abc'));
    expect(result.current.story?.body).toBe('原始故事');
    expect(result.current.tags).toEqual(['安靜', '有插座']);
  });

  it('owner saving story sends PUT request with updated body', async () => {
    const { result } = renderHook(() => useOwnerContent('shop-abc'));
    await act(async () => {
      await result.current.saveStory({ body: '新的故事', is_published: true });
    });
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/owner/shop-abc/story',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ body: '新的故事', is_published: true }),
      })
    );
    expect(mockMutate).toHaveBeenCalled();
  });

  it('owner saving story rolls back optimistic update on error', async () => {
    mockFetchWithAuth.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useOwnerContent('shop-abc'));
    await expect(
      act(async () => {
        await result.current.saveStory({ body: '失敗的更新' });
      })
    ).rejects.toThrow('network error');
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it('owner saving tags sends PUT request with tag list', async () => {
    const { result } = renderHook(() => useOwnerContent('shop-abc'));
    await act(async () => {
      await result.current.saveTags(['安靜', '插座充足', '有甜點']);
    });
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/owner/shop-abc/tags',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ tags: ['安靜', '插座充足', '有甜點'] }),
      })
    );
    expect(mockMutateTags).toHaveBeenCalled();
  });

  it('returns null story and empty tags when shopId is empty', () => {
    const { result } = renderHook(() => useOwnerContent(''));
    expect(result.current.story).toBeNull();
    expect(result.current.tags).toEqual([]);
  });
});
