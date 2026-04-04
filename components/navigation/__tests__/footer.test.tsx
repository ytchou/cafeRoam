import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../footer';

vi.mock('@/components/buy-me-a-coffee-button', () => ({
  BuyMeACoffeeButton: () => <div data-testid="bmc-button" />,
}));

describe('Footer', () => {
  it('renders navigation links to About, FAQ, and Privacy', () => {
    render(<Footer />);
    const aboutLink = screen.getByRole('link', { name: /關於啡遊/i });
    const faqLink = screen.getByRole('link', { name: /常見問題/i });
    const privacyLink = screen.getByRole('link', { name: /隱私權政策/i });
    expect(aboutLink).toHaveAttribute('href', '/about');
    expect(faqLink).toHaveAttribute('href', '/faq');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('renders the BuyMeACoffee button', () => {
    render(<Footer />);
    expect(screen.getByTestId('bmc-button')).toBeInTheDocument();
  });
});
