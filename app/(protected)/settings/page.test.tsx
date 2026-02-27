import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseAuth, createMockRouter } from '@/lib/test-utils/mocks';
import { makeSession } from '@/lib/test-utils/factories';

const mockAuth = createMockSupabaseAuth();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

const mockRouter = createMockRouter();
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const session = makeSession();
    mockAuth.getSession.mockResolvedValue({ data: { session } });
    mockAuth.signOut.mockResolvedValue({});
  });

  it('renders logout button and danger zone', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete account/i })
    ).toBeInTheDocument();
  });

  it('logout calls signOut and redirects to /', async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/'));
  });

  it('shows confirmation dialog when delete account is clicked', async () => {
    render(<SettingsPage />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );
    expect(screen.getByPlaceholderText(/type delete/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm delete/i })
    ).toBeDisabled();
  });

  it('confirm delete button remains disabled until "DELETE" is typed', async () => {
    render(<SettingsPage />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );

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

    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(
      screen.getByRole('button', { name: /confirm delete/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/account',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer '),
          }),
        })
      );
      expect(mockAuth.signOut).toHaveBeenCalledOnce();
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message when API call fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });
    render(<SettingsPage />);

    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(
      screen.getByRole('button', { name: /confirm delete/i })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('cancel button closes dialog without deleting', async () => {
    render(<SettingsPage />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );
    expect(screen.getByPlaceholderText(/type delete/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(
      screen.queryByPlaceholderText(/type delete/i)
    ).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('redirects to /login when session is null without calling API', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    render(<SettingsPage />);
    await userEvent.click(
      screen.getByRole('button', { name: /delete account/i })
    );
    await userEvent.type(screen.getByPlaceholderText(/type delete/i), 'DELETE');
    await userEvent.click(
      screen.getByRole('button', { name: /confirm delete/i })
    );
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/login'));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
