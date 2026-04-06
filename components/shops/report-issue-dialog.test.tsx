import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import { toast } from 'sonner';

import { ReportIssueDialog } from './report-issue-dialog';

const defaultProps = {
  shopId: 'shop-123',
  open: true,
  onOpenChange: vi.fn(),
};

describe('ReportIssueDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders the dialog when open', () => {
    render(<ReportIssueDialog {...defaultProps} />);
    expect(screen.getByText('回報錯誤')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/請描述/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ReportIssueDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('回報錯誤')).not.toBeInTheDocument();
  });

  it('submits report with description only', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Report submitted' }),
    });

    render(<ReportIssueDialog {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/請描述/),
      'The opening hours are wrong on weekends'
    );
    await user.click(screen.getByRole('button', { name: /送出/ }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/shops/shop-123/report',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
    expect(toast.success).toHaveBeenCalled();
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows error toast on submission failure', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Rate limit exceeded' }),
    });

    render(<ReportIssueDialog {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/請描述/),
      'Hours are incorrect for this shop'
    );
    await user.click(screen.getByRole('button', { name: /送出/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('disables submit button when description is too short', () => {
    render(<ReportIssueDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /送出/ });
    expect(submitButton).toBeDisabled();
  });
});
