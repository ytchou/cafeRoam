import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodSection } from './payment-method-section';

// Mock useUser to control auth state
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: { id: 'user-a1b2c3' }, isLoading: false }),
}));

// Mock useIsDesktop
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
}));

describe('PaymentMethodSection', () => {
  const defaultMethods = [
    { method: 'cash', accepted: true, confirmationCount: 3, userVote: null },
    { method: 'card', accepted: false, confirmationCount: 1, userVote: null },
    { method: 'line_pay', accepted: true, confirmationCount: 0, userVote: null },
  ];

  it('renders accepted payment methods as positive chips', () => {
    render(<PaymentMethodSection shopId="shop-1" methods={defaultMethods} />);
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('LINE Pay')).toBeInTheDocument();
  });

  it('renders not-accepted methods as muted chips', () => {
    render(<PaymentMethodSection shopId="shop-1" methods={defaultMethods} />);
    const cardChip = screen.getByText('Card');
    expect(cardChip.closest('[data-accepted="false"]')).toBeTruthy();
  });

  it('shows confirmation count when > 0', () => {
    render(<PaymentMethodSection shopId="shop-1" methods={defaultMethods} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows "reported" label when confirmation count is 0', () => {
    render(<PaymentMethodSection shopId="shop-1" methods={defaultMethods} />);
    expect(screen.getByText('reported')).toBeInTheDocument();
  });

  it('renders nothing when methods list is empty', () => {
    const { container } = render(<PaymentMethodSection shopId="shop-1" methods={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows suggest edit button for authenticated users', () => {
    render(<PaymentMethodSection shopId="shop-1" methods={defaultMethods} />);
    expect(screen.getByText(/suggest/i)).toBeInTheDocument();
  });
});
