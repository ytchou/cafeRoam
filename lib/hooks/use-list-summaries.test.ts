import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';

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

import { useListSummaries } from './use-list-summaries';

const SUMMARIES = [
  {
    id: 'list-1',
    name: '適合工作的咖啡店',
    shop_count: 3,
    preview_photos: ['https://example.com/photo1.jpg'],
  },
  {
    id: 'list-2',
    name: '約會好去處',
    shop_count: 1,
    preview_photos: [],
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children
  );
}

describe('useListSummaries', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => SUMMARIES,
    });
  });

  it('fetches list summaries from /api/lists/summaries', async () => {
    const { result } = renderHook(() => useListSummaries(), { wrapper });
    await waitFor(() => expect(result.current.lists).toHaveLength(2));
    expect(result.current.lists[0].name).toBe('適合工作的咖啡店');
    expect(result.current.lists[0].shop_count).toBe(3);
  });

  it('returns empty array while loading', () => {
    const { result } = renderHook(() => useListSummaries(), { wrapper });
    expect(result.current.lists).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty array when user has no lists', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useListSummaries(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lists).toEqual([]);
  });
});
