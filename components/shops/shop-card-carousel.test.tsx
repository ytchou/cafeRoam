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

describe('a user interacting with the ShopCardCarousel', () => {
  it('a user swiping through the map carousel sees the shop name', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('a user sees the shop star rating in the carousel card', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('a user sees how many reviews the shop has received', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('(324)')).toBeInTheDocument();
  });

  it('a user sees taxonomy tags describing the shop character', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    expect(screen.getByText('Latte Art')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('a user sees a photo of the shop in the carousel card', () => {
    render(<ShopCardCarousel shop={shop} onClick={() => {}} />);
    const img = screen.getByRole('img', { name: 'The Brew House' });
    expect(img).toHaveAttribute('src', expect.stringContaining('brew.jpg'));
  });

  it('a user tapping a carousel card triggers navigation to the shop detail', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardCarousel shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
