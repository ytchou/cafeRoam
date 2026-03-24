import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';

import { useCommunityFeed } from './use-community-feed';

vi.mock('swr', () => ({
  default: vi.fn(),
}));

import swr from 'swr';

const swrMock = vi.mocked(swr);

function swrReturning(data: unknown, isLoading = false) {
  return {
    data,
    isLoading,
    error: null,
    mutate: vi.fn(),
    isValidating: false,
  } as ReturnType<typeof swr>;
}

describe('useCommunityFeed', () => {
  it('returns feed notes and cursor when loaded', () => {
    const feed = {
      notes: [makeCommunityNote()],
      nextCursor: '2026-03-14T10:00:00',
    };
    swrMock.mockReturnValue(swrReturning(feed));

    const { result } = renderHook(() => useCommunityFeed({ cursor: null }));

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.nextCursor).toBe('2026-03-14T10:00:00');
  });

  it('returns empty notes while loading', () => {
    swrMock.mockReturnValue(swrReturning(undefined, true));

    const { result } = renderHook(() => useCommunityFeed({ cursor: null }));

    expect(result.current.notes).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('includes cursor in fetch URL when provided', () => {
    swrMock.mockReturnValue(swrReturning({ notes: [], nextCursor: null }));

    renderHook(() => useCommunityFeed({ cursor: '2026-03-14T10:00:00' }));

    expect(swrMock).toHaveBeenCalledWith(
      '/api/explore/community?cursor=2026-03-14T10%3A00%3A00',
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('includes mrt filter in fetch URL when provided', () => {
    swrMock.mockReturnValue(swrReturning({ notes: [], nextCursor: null }));

    renderHook(() => useCommunityFeed({ cursor: null, mrt: '中山' }));

    expect(swrMock).toHaveBeenCalledWith(
      '/api/explore/community?mrt=%E4%B8%AD%E5%B1%B1',
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('includes vibe_tag filter in fetch URL when provided', () => {
    swrMock.mockReturnValue(swrReturning({ notes: [], nextCursor: null }));

    renderHook(() =>
      useCommunityFeed({ cursor: null, vibeTag: 'quiet_reading' })
    );

    expect(swrMock).toHaveBeenCalledWith(
      '/api/explore/community?vibe_tag=quiet_reading',
      expect.any(Function),
      expect.any(Object)
    );
  });
});
