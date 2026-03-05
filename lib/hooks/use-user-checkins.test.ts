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

import { useUserCheckins } from './use-user-checkins';

const CHECKINS = [
  {
    id: 'ci-1',
    user_id: 'user-a1b2c3',
    shop_id: 'shop-d4e5f6',
    shop_name: '山小孩咖啡',
    shop_mrt: '台電大樓',
    photo_urls: ['https://example.com/photo1.jpg'],
    stars: 4,
    review_text: '很棒的工作環境',
    created_at: '2026-03-01T10:00:00Z',
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children
  );
}

describe('useUserCheckins', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => CHECKINS,
    });
  });

  it('fetches check-ins from /api/checkins', async () => {
    const { result } = renderHook(() => useUserCheckins(), { wrapper });
    await waitFor(() => expect(result.current.checkins).toHaveLength(1));
    expect(result.current.checkins[0].shop_name).toBe('山小孩咖啡');
  });

  it('returns empty array while loading', () => {
    const { result } = renderHook(() => useUserCheckins(), { wrapper });
    expect(result.current.checkins).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty array when no check-ins exist', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useUserCheckins(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.checkins).toEqual([]);
  });
});
