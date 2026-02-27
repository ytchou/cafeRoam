import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignUp = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

import SignupPage from '../signup/page';

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password, and PDPA consent checkbox', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('disables submit until PDPA checkbox is checked', () => {
    render(<SignupPage />);
    const submitBtn = screen.getByRole('button', { name: /註冊|sign up/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit after PDPA checkbox is checked', async () => {
    render(<SignupPage />);
    await userEvent.click(screen.getByRole('checkbox'));
    const submitBtn = screen.getByRole('button', { name: /註冊|sign up/i });
    expect(submitBtn).toBeEnabled();
  });

  it('has a link to privacy policy', () => {
    render(<SignupPage />);
    expect(
      screen.getByRole('link', { name: /隱私權政策|privacy/i })
    ).toHaveAttribute('href', '/privacy');
  });

  it('shows error message when signup fails', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
      data: {},
    });
    render(<SignupPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /註冊|sign up/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already registered/i);
    });
  });

  it('successful signup shows email confirmation message', async () => {
    mockSignUp.mockResolvedValue({ error: null, data: {} });
    render(<SignupPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'wang.xiaoming@gmail.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /註冊|sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText('wang.xiaoming@gmail.com')).toBeInTheDocument();
    });
  });
});
