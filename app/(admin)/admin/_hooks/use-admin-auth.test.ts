import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminAuth } from './use-admin-auth';

// Mock at system boundary — Supabase client
const mockGetSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns access token from active session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token-123' } },
    });

    const { result } = renderHook(() => useAdminAuth());

    const token = await act(async () => result.current.getToken());
    expect(token).toBe('valid-token-123');
  });

  it('returns null when session is expired or missing', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useAdminAuth());

    const token = await act(async () => result.current.getToken());
    expect(token).toBeNull();
  });

  it('returns null when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdminAuth());

    const token = await act(async () => result.current.getToken());
    expect(token).toBeNull();
  });
});
