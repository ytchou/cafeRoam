import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '@/lib/hooks/use-user';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123', email: 'test@caferoam.tw' },
        },
      },
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@caferoam.tw' } },
    });
  });

  it('uses getSession (local) instead of getUser (network) for initial user state', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(result.current.user).toEqual({ id: 'user-123', email: 'test@caferoam.tw' });
  });

  it('returns null user when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });
});
