import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseAuth, createMockRouter } from '@/lib/test-utils/mocks';

const mockAuth = createMockSupabaseAuth();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

const mockRouter = createMockRouter();
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}));

import LoginPage from '../login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Google and LINE login buttons', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /line/i })).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@email.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(
      screen.getByRole('button', { name: /登入|sign in/i })
    );
    expect(await screen.findByText(/invalid/i)).toBeInTheDocument();
  });

  it('has a link to signup', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /sign up|註冊/i })).toHaveAttribute(
      'href',
      '/signup'
    );
  });

  it('successful login redirects to home', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'lin.mei@gmail.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await userEvent.click(
      screen.getByRole('button', { name: /登入|sign in/i })
    );
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/'));
  });

  it('Google button calls signInWithOAuth with google provider', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /google/i }));
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    );
  });

  it('LINE button calls signInWithOAuth with line_oidc provider', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /line/i }));
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'line_oidc',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    );
  });
});
