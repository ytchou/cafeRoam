import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTarotDraw } from './use-tarot-draw';
import { STORAGE_KEY } from '@/lib/tarot/recently-seen';

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

describe('useTarotDraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: false }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns no cards while coordinates are unavailable', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: false }));
    const { result } = renderHook(() => useTarotDraw(null, null));
    expect(result.current.cards).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    // SWR should receive null key so it does not fetch
    const key = mockUseSWR.mock.calls[0][0];
    expect(key).toBeNull();
  });

  it('returns no cards while loading', () => {
    mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: true }));
    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));
    expect(result.current.cards).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns cards from a successful draw', () => {
    const mockCards = [
      { shopId: 's1', tarotTitle: '山小孩咖啡館 — The Scholar' },
    ];
    mockUseSWR.mockReturnValue(swrReturning(mockCards));
    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));
    expect(result.current.cards).toEqual(mockCards);
  });

  it('surfaces an error when the draw request fails', () => {
    const fetchError = new Error('Network error');
    mockUseSWR.mockReturnValue(swrReturning(undefined, { error: fetchError }));
    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));
    expect(result.current.error).toBe(fetchError);
  });

  it('uses a 3km radius by default', () => {
    mockUseSWR.mockReturnValue(swrReturning([]));
    renderHook(() => useTarotDraw(25.033, 121.543));
    const key = mockUseSWR.mock.calls[0][0] as string;
    expect(key).toContain('radius_km=3');
  });

  it('fetches with an expanded radius after setRadiusKm is called', async () => {
    mockUseSWR.mockReturnValue(swrReturning([]));
    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));

    act(() => {
      result.current.setRadiusKm(10);
    });

    await waitFor(() => {
      const lastKey = mockUseSWR.mock.calls.at(-1)?.[0] as string;
      expect(lastKey).toContain('radius_km=10');
    });
  });

  it('excludes shops the user has already seen', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['shop-abc', 'shop-def']));
    mockUseSWR.mockReturnValue(swrReturning([]));
    renderHook(() => useTarotDraw(25.033, 121.543));
    const key = mockUseSWR.mock.calls[0][0] as string;
    expect(key).toContain('excluded_ids=shop-abc,shop-def');
  });

  it('picks up newly seen shops when redrawn', async () => {
    const afterRedrawCards = [{ shopId: 's2', tarotTitle: '探索者的居所' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSWR.mockImplementation((key: unknown): any => {
      if (typeof key === 'string' && key.includes('newly-seen-shop')) {
        return swrReturning(afterRedrawCards);
      }
      return swrReturning([{ shopId: 's1', tarotTitle: '山小孩咖啡館' }]);
    });

    const { result } = renderHook(() => useTarotDraw(25.033, 121.543));

    // Simulate TarotSpread writing a new seen ID to localStorage after a card tap
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['newly-seen-shop']));

    act(() => {
      result.current.redraw();
    });

    await waitFor(() => {
      const lastKey = mockUseSWR.mock.calls.at(-1)?.[0] as string;
      expect(lastKey).toContain('excluded_ids=newly-seen-shop');
    });
  });

  it('skips fetching when only lat is provided but lng is null', () => {
    renderHook(() => useTarotDraw(25.033, null));
    const key = mockUseSWR.mock.calls[0][0];
    expect(key).toBeNull();
  });

  it('skips fetching when only lng is provided but lat is null', () => {
    renderHook(() => useTarotDraw(null, 121.543));
    const key = mockUseSWR.mock.calls[0][0];
    expect(key).toBeNull();
  });

  it('does not clear seen list when the draw returns cards', async () => {
    const mockCards = [{ shopId: 's1', tarotTitle: '山小孩咖啡館' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['s1']));
    mockUseSWR.mockReturnValue(swrReturning(mockCards));
    renderHook(() => useTarotDraw(25.033, 121.543));
    // localStorage should remain intact — no auto-clear when cards are present
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('auto-clears seen shops and redraws when all nearby shops are exhausted', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['s1', 's2']));
    mockUseSWR.mockReturnValue(swrReturning([]));

    renderHook(() => useTarotDraw(25.033, 121.543));

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    // Key should be updated to drop excluded_ids after clear
    const lastKey = mockUseSWR.mock.calls.at(-1)?.[0] as string;
    expect(lastKey).not.toContain('s1');
    expect(lastKey).not.toContain('s2');
  });

  describe('useTarotDraw with districtIds', () => {
    it('fetches by district_ids when districtIds is provided and lat/lng are null', () => {
      mockUseSWR.mockReturnValue(swrReturning([], { isLoading: false }));
      renderHook(() => useTarotDraw(null, null, ['district-123']));
      const key = mockUseSWR.mock.calls[0][0] as string;
      expect(key).toContain('district_ids=district-123');
    });

    it('uses null key when both coords and districtIds are empty', () => {
      mockUseSWR.mockReturnValue(swrReturning(undefined, { isLoading: false }));
      const { result } = renderHook(() => useTarotDraw(null, null, []));
      const key = mockUseSWR.mock.calls[0][0];
      expect(key).toBeNull();
      expect(result.current.cards).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('prefers lat/lng over districtIds when both are provided', () => {
      mockUseSWR.mockReturnValue(swrReturning([], { isLoading: false }));
      renderHook(() => useTarotDraw(25.033, 121.565, ['district-123']));
      const key = mockUseSWR.mock.calls[0][0] as string;
      expect(key).toContain('lat=25.033');
      expect(key).not.toContain('district_ids=');
    });

    it('sorts district IDs in cache key for stability', () => {
      mockUseSWR.mockReturnValue(swrReturning([], { isLoading: false }));
      renderHook(() => useTarotDraw(null, null, ['z-district', 'a-district']));
      const key = mockUseSWR.mock.calls[0][0] as string;
      expect(key).toContain('district_ids=a-district,z-district');
    });
  });
});
