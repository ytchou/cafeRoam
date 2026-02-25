import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getSession: mockGetSession,
    },
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch for DELETE /api/auth/account
const mockFetch = vi.fn();
global.fetch = mockFetch;

import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    mockSignOut.mockResolvedValue({});
  });

  it('renders logout button and danger zone', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('logout calls signOut and redirects to /', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockSignOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('shows confirmation dialog when delete account is clicked', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByPlaceholderText(/type delete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeDisabled();
  });

  it('confirm delete button remains disabled until "DELETE" is typed', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));

    const input = screen.getByPlaceholderText(/type delete/i);
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });

    await userEvent.type(input, 'DELET');
    expect(confirmBtn).toBeDisabled();

    await userEvent.type(input, 'E');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('successful account deletion calls API, signs out, and redirects', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<SettingsPage />);

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/account', expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }));
      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message when API call fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });
    render(<SettingsPage />);

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('cancel button closes dialog without deleting', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByPlaceholderText(/type delete/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByPlaceholderText(/type delete/i)).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('redirects to /login when session is null without calling API', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
