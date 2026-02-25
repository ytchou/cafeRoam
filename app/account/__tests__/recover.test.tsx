import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  }),
}));

import RecoverPage from '../recover/page';

describe('RecoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
    });
    mockRefreshSession.mockResolvedValue({});
  });

  it('renders recovery message', () => {
    render(<RecoverPage />);
    expect(screen.getByText(/scheduled for deletion|即將刪除/i)).toBeInTheDocument();
  });

  it('has a cancel deletion button', () => {
    render(<RecoverPage />);
    expect(screen.getByRole('button', { name: /cancel|取消刪除/i })).toBeInTheDocument();
  });

  it('calls cancel-deletion API on click', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<RecoverPage />);
    await userEvent.click(screen.getByRole('button', { name: /cancel|取消刪除/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/cancel-deletion',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('redirects to /login when session is null without calling API', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<RecoverPage />);
    await userEvent.click(screen.getByRole('button', { name: /cancel|取消刪除/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
