import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import { useListShops } from './use-list-shops';
import type { ReactNode } from 'react';

vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from '@/lib/api/fetch';
const mockFetch = fetchWithAuth as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

describe('useListShops', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a user viewing a list sees shop data for that list', async () => {
    const shops = [
      { id: 'shop-1', name: '山小孩咖啡', address: '台北市大安區', latitude: 25.02, longitude: 121.53, rating: 4.6, review_count: 100, photo_urls: [], taxonomy_tags: [] },
    ];
    mockFetch.mockResolvedValueOnce(shops);
    const { result } = renderHook(() => useListShops('list-1'), { wrapper });
    await waitFor(() => expect(result.current.shops).toHaveLength(1));
    expect(result.current.shops[0].name).toBe('山小孩咖啡');
  });

  it('returns null when listId is null', () => {
    const { result } = renderHook(() => useListShops(null), { wrapper });
    expect(result.current.shops).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
