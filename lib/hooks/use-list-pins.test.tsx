import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import { useListPins } from './use-list-pins';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

describe('useListPins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a user loading their favorites sees pin data from all lists', async () => {
    const pins = [
      { listId: 'list-1', shopId: 'shop-1', lat: 25.033, lng: 121.565 },
      { listId: 'list-2', shopId: 'shop-2', lat: 25.040, lng: 121.570 },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => pins });
    const { result } = renderHook(() => useListPins(), { wrapper });
    await waitFor(() => expect(result.current.pins).toHaveLength(2));
    expect(result.current.pins[0].shopId).toBe('shop-1');
  });

  it('returns empty array while loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useListPins(), { wrapper });
    expect(result.current.pins).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
