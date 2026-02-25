import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch for the consent API call
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-jwt' } },
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'refreshed-jwt' } },
      }),
    },
  }),
}));

import ConsentPage from '../consent/page';

describe('ConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the consent disclosure text', () => {
    render(<ConsentPage />);
    expect(screen.getByText(/帳號資訊/)).toBeInTheDocument();
    expect(screen.getByText(/打卡記錄與照片/)).toBeInTheDocument();
  });

  it('disables confirm button until checkbox is checked', () => {
    render(<ConsentPage />);
    const button = screen.getByRole('button', { name: /確認並繼續|confirm/i });
    expect(button).toBeDisabled();
  });

  it('enables confirm button after checkbox is checked', async () => {
    render(<ConsentPage />);
    await userEvent.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: /確認並繼續|confirm/i });
    expect(button).toBeEnabled();
  });

  it('calls consent API and redirects on confirm', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<ConsentPage />);
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(
      screen.getByRole('button', { name: /確認並繼續|confirm/i })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/consent',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
