import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTarotDraw } from './use-tarot-draw';

// Mock SWR at the module level
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock recently-seen
vi.mock('@/lib/tarot/recently-seen', () => ({
  getRecentlySeenIds: vi.fn(() => []),
  addRecentlySeenIds: vi.fn(),
  clearRecentlySeen: vi.fn(),
}));

import useSWR from 'swr';
const mockUseSWR = vi.mocked(useSWR);

describe('useTarotDraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null SWR key when coordinates are null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: false, mutate: vi.fn() } as any);

    renderHook(() => useTarotDraw(null, null));

    expect(mockUseSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('constructs correct SWR key with coordinates', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSWR.mockReturnValue({ data: [], error: undefined, isLoading: false, mutate: vi.fn() } as any);

    renderHook(() => useTarotDraw(25.033, 121.543));

    const key = mockUseSWR.mock.calls[0][0];
    expect(key).toContain('/api/explore/tarot-draw');
    expect(key).toContain('lat=25.033');
    expect(key).toContain('lng=121.543');
  });

  it('returns empty cards array when data is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true, mutate: vi.fn() } as any);

    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));

    expect(result.current.cards).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns cards from SWR data', () => {
    const mockCards = [{ shopId: 's1', tarotTitle: 'The Crown' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSWR.mockReturnValue({ data: mockCards, error: undefined, isLoading: false, mutate: vi.fn() } as any);

    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));

    expect(result.current.cards).toEqual(mockCards);
  });
});
