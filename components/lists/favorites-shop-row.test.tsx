import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FavoritesShopRow } from './favorites-shop-row';

const shop = {
  id: 'shop-d4e5f6',
  name: '山小孩咖啡',
  address: '台北市大安區溫州街74巷5弄2號',
  latitude: 25.0216,
  longitude: 121.5312,
  rating: 4.6,
  review_count: 287,
  photo_urls: ['https://example.com/photo1.jpg'],
  taxonomy_tags: [],
  is_open: true,
};

describe('FavoritesShopRow', () => {
  it('a user sees the shop name and district in the row', () => {
    render(
      <FavoritesShopRow shop={shop} onClick={() => {}} />
    );
    expect(screen.getByText('山小孩咖啡')).toBeInTheDocument();
    expect(screen.getByText(/大安/)).toBeInTheDocument();
  });

  it('a user sees the distance when provided', () => {
    render(
      <FavoritesShopRow shop={shop} distanceText="0.3 km" onClick={() => {}} />
    );
    expect(screen.getByText('0.3 km')).toBeInTheDocument();
  });

  it('a user sees the open status indicator', () => {
    render(
      <FavoritesShopRow shop={shop} onClick={() => {}} />
    );
    expect(screen.getByText(/Open/)).toBeInTheDocument();
  });

  it('a user clicking the row triggers the onClick callback', async () => {
    const onClick = vi.fn();
    render(<FavoritesShopRow shop={shop} onClick={onClick} />);
    await userEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalled();
  });

  it('a selected row shows the highlighted state', () => {
    render(
      <FavoritesShopRow shop={shop} onClick={() => {}} selected />
    );
    const row = screen.getByRole('article');
    expect(row.dataset.selected).toBeDefined();
  });

  it('a shop without a photo shows a placeholder', () => {
    render(
      <FavoritesShopRow
        shop={{ ...shop, photo_urls: [] }}
        onClick={() => {}}
      />
    );
    expect(screen.getByText('No photo')).toBeInTheDocument();
  });
});
