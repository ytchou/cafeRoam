import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerifiedBadge } from './verified-badge';

describe('VerifiedBadge', () => {
  it('renders verified label with accessible text', () => {
    render(<VerifiedBadge />);
    expect(screen.getByText('已認證')).toBeInTheDocument();
    const badge = screen.getByTitle('已認證店家');
    expect(badge).toBeInTheDocument();
  });
});
