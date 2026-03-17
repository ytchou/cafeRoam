import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVibes } from './use-vibes';

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

describe('useVibes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useVibes());
    expect(result.current.vibes).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns vibes from a successful fetch', () => {
    const mockVibes = [{ slug: 'study-cave', name: 'Study Cave' }];
    mockUseSWR.mockReturnValue(swrReturning(mockVibes));
    const { result } = renderHook(() => useVibes());
    expect(result.current.vibes).toEqual(mockVibes);
  });

  it('surfaces an error when the fetch fails', () => {
    const fetchError = new Error('Network error');
    mockUseSWR.mockReturnValue(swrReturning(undefined, { error: fetchError }));
    const { result } = renderHook(() => useVibes());
    expect(result.current.error).toBe(fetchError);
  });
});
