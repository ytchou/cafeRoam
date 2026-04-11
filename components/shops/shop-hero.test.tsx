import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ShopHero } from './shop-hero';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });
});

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
    expect(
      screen.getByRole('img', { name: /The Brew House/i })
    ).toBeInTheDocument();
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
});

describe('ShopHero multi-photo carousel', () => {
  const photos = [
    'https://cdn.example.com/photo-1.jpg',
    'https://cdn.example.com/photo-2.jpg',
    'https://cdn.example.com/photo-3.jpg',
  ];

  it('renders all photo slides in the DOM when a shop has multiple photos', () => {
    render(<ShopHero photoUrls={photos} shopName="Fika Taipei" />);
    const images = screen.getAllByAltText(/Fika Taipei/i);
    expect(images).toHaveLength(3);
  });

  it('shows a slide indicator with current / total format', () => {
    render(<ShopHero photoUrls={photos} shopName="Fika Taipei" />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('does not render prev/next buttons when there is only one photo', () => {
    render(<ShopHero photoUrls={[photos[0]]} shopName="Fika Taipei" />);
    expect(screen.queryByRole('button', { name: /previous slide/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next slide/i })).not.toBeInTheDocument();
  });

  it('does not render the slide indicator when there is only one photo', () => {
    render(<ShopHero photoUrls={[photos[0]]} shopName="Fika Taipei" />);
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument();
  });

  it('falls back to initials when photoUrls is empty', () => {
    render(<ShopHero photoUrls={[]} shopName="Fika Taipei" />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('calls onBack when the back button is tapped', async () => {
    const onBack = vi.fn();
    render(<ShopHero photoUrls={photos} shopName="Fika Taipei" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
