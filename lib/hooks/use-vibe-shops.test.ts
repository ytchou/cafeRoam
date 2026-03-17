import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVibeShops } from './use-vibe-shops';

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

describe('useVibeShops', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null response while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useVibeShops('study-cave'));
    expect(result.current.response).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns shop results on success', () => {
    const mockResponse = {
      vibe: { slug: 'study-cave' },
      shops: [{ shopId: 'shop-a' }],
      totalCount: 1,
    };
    mockUseSWR.mockReturnValue(swrReturning(mockResponse));
    const { result } = renderHook(() => useVibeShops('study-cave'));
    expect(result.current.response?.shops).toHaveLength(1);
  });

  it('includes lat/lng in the SWR key when geo is provided', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));
    renderHook(() => useVibeShops('study-cave', 25.033, 121.543));
    const key = mockUseSWR.mock.calls[0][0] as string;
    expect(key).toContain('lat=25.033');
    expect(key).toContain('lng=121.543');
  });

  it('omits lat/lng from key when geo is unavailable', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));
    renderHook(() => useVibeShops('study-cave', null, null));
    const key = mockUseSWR.mock.calls[0][0] as string;
    expect(key).not.toContain('lat=');
    expect(key).not.toContain('lng=');
  });

  it('surfaces an error when the fetch fails', () => {
    const fetchError = new Error('500');
    mockUseSWR.mockReturnValue(swrReturning(undefined, { error: fetchError }));
    const { result } = renderHook(() => useVibeShops('study-cave'));
    expect(result.current.error).toBe(fetchError);
  });
});
