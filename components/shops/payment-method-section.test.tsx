import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentMethodSection } from './payment-method-section';

describe('a user viewing payment methods on a shop page', () => {
  const defaultMethods = [
    { method: 'cash', accepted: true, confirmationCount: 3, userVote: null },
    { method: 'card', accepted: false, confirmationCount: 1, userVote: null },
    {
      method: 'line_pay',
      accepted: true,
      confirmationCount: 0,
      userVote: null,
    },
  ];

  it('renders accepted payment methods as positive chips', () => {
    render(<PaymentMethodSection methods={defaultMethods} />);
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('LINE Pay')).toBeInTheDocument();
  });

  it('renders not-accepted methods as muted chips', () => {
    render(<PaymentMethodSection methods={defaultMethods} />);
    const cardChip = screen.getByText('Card');
    expect(cardChip.closest('[data-accepted="false"]')).toBeTruthy();
  });

  it('shows confirmation count when > 0', () => {
    render(<PaymentMethodSection methods={defaultMethods} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows "reported" label when confirmation count is 0', () => {
    render(<PaymentMethodSection methods={defaultMethods} />);
    expect(screen.getByText('reported')).toBeInTheDocument();
  });

  it('renders nothing when methods list is empty', () => {
    const { container } = render(<PaymentMethodSection methods={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
