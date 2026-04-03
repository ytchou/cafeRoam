import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('@/lib/api/fetch', () => ({ fetchWithAuth: vi.fn() }));

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';
import { useOwnerAnalyticsTerms } from '../use-owner-analytics-terms';

const mockUseSWR = vi.mocked(useSWR);
const mockFetchWithAuth = vi.mocked(fetchWithAuth);

const SHOP_ID = '550e8400-e29b-41d4-a716-446655440001';

function swrReturning(data: unknown, extra?: object) {
  return {
    data,
    error: undefined,
    isLoading: false,
    mutate: vi.fn().mockResolvedValue(undefined),
    ...extra,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('useOwnerAnalyticsTerms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns accepted=false when owner has not yet accepted terms', () => {
    mockUseSWR.mockReturnValue(swrReturning({ accepted: false }));
    const { result } = renderHook(() => useOwnerAnalyticsTerms(SHOP_ID));
    expect(result.current.accepted).toBe(false);
  });

  it('returns accepted=true when owner has already accepted terms', () => {
    mockUseSWR.mockReturnValue(swrReturning({ accepted: true }));
    const { result } = renderHook(() => useOwnerAnalyticsTerms(SHOP_ID));
    expect(result.current.accepted).toBe(true);
  });

  it('returns accepted=false and isLoading=true during the initial fetch', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useOwnerAnalyticsTerms(SHOP_ID));
    expect(result.current.accepted).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('owner accepting terms calls the POST endpoint then revalidates SWR cache', async () => {
    const mutateFn = vi.fn().mockResolvedValue(undefined);
    mockUseSWR.mockReturnValue(
      swrReturning({ accepted: false }, { mutate: mutateFn })
    );
    mockFetchWithAuth.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useOwnerAnalyticsTerms(SHOP_ID));
    await act(() => result.current.acceptTerms());

    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      `/api/owner/${SHOP_ID}/analytics-terms`,
      { method: 'POST' }
    );
    expect(mutateFn).toHaveBeenCalledWith(
      { accepted: true },
      { revalidate: true }
    );
  });

  it('clears accepting state after the POST completes', async () => {
    mockUseSWR.mockReturnValue(swrReturning({ accepted: false }));
    mockFetchWithAuth.mockResolvedValue({} as Response);

    const { result } = renderHook(() => useOwnerAnalyticsTerms(SHOP_ID));
    await act(() => result.current.acceptTerms());

    expect(result.current.accepting).toBe(false);
  });
});
