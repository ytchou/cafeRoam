import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ShopCardCarousel } from './shop-card-carousel';
import { makeShop } from '@/lib/test-utils/factories';

const shop = {
  ...makeShop(),
  id: 'shop-brew',
  name: 'The Brew House',
  rating: 4.8,
  review_count: 324,
  photo_urls: ['https://example.com/brew.jpg'],
  taxonomyTags: [
    { id: 't1', dimension: 'functionality' as const, label: 'Latte Art', labelZh: '拉花' },
    { id: 't2', dimension: 'functionality' as const, label: 'WiFi', labelZh: 'WiFi' },
  ],
};

describe('ShopCardCarousel', () => {
  it('renders shop name', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('renders rating with star', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renders review count', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('(324)')).toBeInTheDocument();
  });

  it('renders taxonomy tags', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('Latte Art')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('renders shop photo', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    const img = screen.getByRole('img', { name: 'The Brew House' });
    expect(img).toHaveAttribute('src', expect.stringContaining('brew.jpg'));
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardCarousel shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
