import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Confirm action?',
    description: 'This will do something.',
    onConfirm: vi.fn(),
  };

  it('shows dialog content to the user when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Confirm action?')).toBeInTheDocument();
    expect(screen.getByText('This will do something.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows custom confirm label when provided', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Approve" />);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('disables confirm button when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('shows destructive styling on the confirm button for dangerous actions', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const btn = screen.getByRole('button', { name: /confirm/i });
    expect(btn.className).toMatch(/destructive/);
  });
});
