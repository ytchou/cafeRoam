import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
    mockSignInWithPassword.mockResolvedValue({
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
});
