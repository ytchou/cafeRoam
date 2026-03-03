import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase auth
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      }),
    },
  }),
}));

import { useUserLists } from './use-user-lists';

const LISTS_RESPONSE = [
  {
    id: 'l1',
    user_id: 'user-1',
    name: 'Work spots',
    items: [
      { shop_id: 's1', added_at: '2026-01-15T10:00:00Z' },
      { shop_id: 's2', added_at: '2026-01-15T11:00:00Z' },
    ],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'l2',
    user_id: 'user-1',
    name: 'Date night',
    items: [{ shop_id: 's3', added_at: '2026-01-16T10:00:00Z' }],
    created_at: '2026-01-16T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
  },
];

describe('useUserLists', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => LISTS_RESPONSE,
    });
  });

  it('isSaved returns true for a shop in any list', async () => {
    const { result } = renderHook(() => useUserLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(2));
    expect(result.current.isSaved('s1')).toBe(true);
    expect(result.current.isSaved('s3')).toBe(true);
    expect(result.current.isSaved('not-saved')).toBe(false);
  });

  it('isInList returns correct per-list membership', async () => {
    const { result } = renderHook(() => useUserLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(2));
    expect(result.current.isInList('l1', 's1')).toBe(true);
    expect(result.current.isInList('l1', 's3')).toBe(false);
    expect(result.current.isInList('l2', 's3')).toBe(true);
  });

  it('createList calls POST /api/lists and revalidates', async () => {
    const { result } = renderHook(() => useUserLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(2));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'l3', name: 'New' }),
    });

    await act(async () => {
      await result.current.createList('New');
    });

    const postCall = mockFetch.mock.calls.find(
      (c) => c[1]?.method === 'POST' && c[0] === '/api/lists'
    );
    expect(postCall).toBeDefined();
  });

  it('saveShop calls POST /api/lists/{listId}/shops', async () => {
    const { result } = renderHook(() => useUserLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(2));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ list_id: 'l1', shop_id: 's4' }),
    });

    await act(async () => {
      await result.current.saveShop('l1', 's4');
    });

    const postCall = mockFetch.mock.calls.find(
      (c) => c[1]?.method === 'POST' && c[0] === '/api/lists/l1/shops'
    );
    expect(postCall).toBeDefined();
  });

  it('removeShop calls DELETE /api/lists/{listId}/shops/{shopId}', async () => {
    const { result } = renderHook(() => useUserLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(2));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await act(async () => {
      await result.current.removeShop('l1', 's1');
    });

    const deleteCall = mockFetch.mock.calls.find(
      (c) => c[1]?.method === 'DELETE' && c[0] === '/api/lists/l1/shops/s1'
    );
    expect(deleteCall).toBeDefined();
  });
});
