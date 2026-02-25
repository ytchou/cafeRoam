import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-jwt' } },
      }),
      refreshSession: vi.fn().mockResolvedValue({}),
    },
  }),
}));

import RecoverPage from '../recover/page';

describe('RecoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
