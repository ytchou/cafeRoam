import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ShopHero } from './shop-hero';

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe('ShopHero', () => {
  const baseProps = {
    photoUrls: ['https://example.com/photo.jpg'],
    shopName: 'The Brew House',
  };

  it('renders the hero image', () => {
    render(<ShopHero {...baseProps} />);
    expect(screen.getByRole('img', { name: /The Brew House/i })).toBeInTheDocument();
  });

  it('calls onBack when back button is tapped', () => {
    const onBack = vi.fn();
    render(<ShopHero {...baseProps} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onSave when bookmark button is tapped', () => {
    const onSave = vi.fn();
    render(<ShopHero {...baseProps} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onShare when share button is tapped', () => {
    const onShare = vi.fn();
    render(<ShopHero {...baseProps} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: /Share/i }));
    expect(onShare).toHaveBeenCalled();
  });

  it('renders photo count badge when multiple photos', () => {
    render(<ShopHero {...baseProps} photoUrls={['a.jpg', 'b.jpg', 'c.jpg']} />);
    expect(screen.getByText(/3 photos/i)).toBeInTheDocument();
  });
});
