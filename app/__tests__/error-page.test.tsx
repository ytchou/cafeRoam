import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import ErrorPage from '../error';

describe('ErrorPage', () => {
  const mockReset = vi.fn();
  const testError = new Error('Something broke in production');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the error to Sentry so on-call engineers are notified', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(testError);
  });

  it('shows a retry button so the user can recover without a full reload', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('calls reset when the user clicks "Try again"', async () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledOnce();
  });
});
