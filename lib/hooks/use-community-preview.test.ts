import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';

import { useCommunityPreview } from './use-community-preview';

vi.mock('swr', () => ({
  default: vi.fn(),
}));

import swr from 'swr';

const swrMock = vi.mocked(swr);

function swrReturning(data: unknown, isLoading = false, error: Error | null = null) {
  return { data, isLoading, error, mutate: vi.fn(), isValidating: false } as ReturnType<typeof swr>;
}

describe('useCommunityPreview', () => {
  it('returns preview cards when data is loaded', () => {
    const cards = [makeCommunityNote(), makeCommunityNote({ checkinId: 'ci-2' })];
    swrMock.mockReturnValue(swrReturning(cards));

    const { result } = renderHook(() => useCommunityPreview());

    expect(result.current.notes).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty array while loading', () => {
    swrMock.mockReturnValue(swrReturning(undefined, true));

    const { result } = renderHook(() => useCommunityPreview());

    expect(result.current.notes).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches from /api/explore/community/preview', () => {
    swrMock.mockReturnValue(swrReturning([]));

    renderHook(() => useCommunityPreview());

    expect(swrMock).toHaveBeenCalledWith(
      '/api/explore/community/preview',
      expect.any(Function),
      expect.any(Object),
    );
  });
});
