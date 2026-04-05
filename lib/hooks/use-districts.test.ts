import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDistricts } from './use-districts';

// SWR is a framework data-fetching boundary — mock at this layer
vi.mock('swr', () => ({
  default: vi.fn(),
}));

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

describe('useDistricts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useDistricts());
    expect(result.current.districts).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns districts when data loads successfully', () => {
    const mockDistricts = [
      { id: 'da-an', name: '大安區' },
      { id: 'zhongzheng', name: '中正區' },
    ];
    mockUseSWR.mockReturnValue(swrReturning(mockDistricts));
    const { result } = renderHook(() => useDistricts());
    expect(result.current.districts).toEqual(mockDistricts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('surfaces an error when the districts request fails', () => {
    const fetchError = new Error('Network error');
    mockUseSWR.mockReturnValue(swrReturning(undefined, { error: fetchError }));
    const { result } = renderHook(() => useDistricts());
    expect(result.current.error).toBe(fetchError);
    expect(result.current.districts).toEqual([]);
  });

  it('fetches from the correct endpoint', () => {
    mockUseSWR.mockReturnValue(swrReturning([]));
    renderHook(() => useDistricts());
    const key = mockUseSWR.mock.calls[0][0];
    expect(key).toBe('/api/explore/districts');
  });
});
