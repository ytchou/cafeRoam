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

import { useUserProfile } from './use-user-profile';

const PROFILE = {
  display_name: 'Mei-Ling',
  avatar_url: null,
  stamp_count: 5,
  checkin_count: 12,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children
  );
}

describe('useUserProfile', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => PROFILE,
    });
  });

  it('fetches profile data from /api/profile', async () => {
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    await waitFor(() =>
      expect(result.current.profile?.display_name).toBe('Mei-Ling')
    );
    expect(result.current.profile?.stamp_count).toBe(5);
    expect(result.current.profile?.checkin_count).toBe(12);
  });

  it('returns null profile while loading', () => {
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    });
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
