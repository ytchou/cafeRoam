import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOwnerAnalytics } from '../use-owner-analytics';

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

const SHOP_ID = '550e8400-e29b-41d4-a716-446655440001';

const REALISTIC_ANALYTICS = {
  search_insights: [
    { query: '安靜咖啡廳', impressions: 142 },
    { query: '大安區工作咖啡', impressions: 87 },
    { query: '插座wifi咖啡', impressions: 63 },
  ],
  community_pulse: [
    { tag: '安靜', count: 34 },
    { tag: '適合工作', count: 28 },
    { tag: '插座多', count: 19 },
  ],
  district_rankings: [
    { attribute: '安靜程度', rank: 3, total_in_district: 47 },
    { attribute: '工作友善', rank: 5, total_in_district: 47 },
  ],
};

describe('useOwnerAnalytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns analytics data when shopId is provided and data loads', () => {
    mockUseSWR.mockReturnValue(swrReturning(REALISTIC_ANALYTICS));

    const { result } = renderHook(() => useOwnerAnalytics(SHOP_ID));

    expect(result.current.data?.search_insights).toHaveLength(3);
    expect(result.current.data?.search_insights[0].query).toBe('安靜咖啡廳');
    expect(result.current.data?.search_insights[0].impressions).toBe(142);
    expect(result.current.data?.community_pulse[0].tag).toBe('安靜');
    expect(result.current.data?.district_rankings[0].rank).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined data while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));

    const { result } = renderHook(() => useOwnerAnalytics(SHOP_ID));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns undefined data when shopId is empty', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined));

    const { result } = renderHook(() => useOwnerAnalytics(''));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes error when fetch fails', () => {
    const fetchError = new Error('Request failed: 403');
    mockUseSWR.mockReturnValue(swrReturning(undefined, { error: fetchError }));

    const { result } = renderHook(() => useOwnerAnalytics(SHOP_ID));

    expect(result.current.error).toBe(fetchError);
    expect(result.current.data).toBeUndefined();
  });
});
