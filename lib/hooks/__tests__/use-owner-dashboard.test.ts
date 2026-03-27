import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOwnerDashboard } from '../use-owner-dashboard';

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

const SHOP_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('useOwnerDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stats when data is available', () => {
    mockUseSWR.mockReturnValue(
      swrReturning({
        checkin_count_30d: 15,
        follower_count: 47,
        saves_count_30d: 8,
        page_views_30d: 230,
      })
    );

    const { result } = renderHook(() => useOwnerDashboard(SHOP_ID));
    expect(result.current.stats?.checkin_count_30d).toBe(15);
    expect(result.current.stats?.follower_count).toBe(47);
    expect(result.current.stats?.saves_count_30d).toBe(8);
    expect(result.current.stats?.page_views_30d).toBe(230);
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes isLoading while fetching', () => {
    mockUseSWR.mockReturnValue(
      swrReturning(undefined, { isLoading: true })
    );

    const { result } = renderHook(() => useOwnerDashboard(SHOP_ID));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeUndefined();
  });

  it('passes null key to SWR when shopId is empty, preventing any fetch', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));

    renderHook(() => useOwnerDashboard(''));
    const [key] = mockUseSWR.mock.calls[0];
    expect(key).toBeNull();
  });

  it('passes the dashboard URL as key when shopId is provided', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));

    renderHook(() => useOwnerDashboard(SHOP_ID));
    const [key] = mockUseSWR.mock.calls[0];
    expect(key).toBe(`/api/owner/${SHOP_ID}/dashboard`);
  });

  it('exposes error when fetch fails', () => {
    const fetchError = new Error('Request failed: 403');
    mockUseSWR.mockReturnValue(
      swrReturning(undefined, { error: fetchError })
    );

    const { result } = renderHook(() => useOwnerDashboard(SHOP_ID));
    expect(result.current.error).toBe(fetchError);
    expect(result.current.stats).toBeUndefined();
  });
});
