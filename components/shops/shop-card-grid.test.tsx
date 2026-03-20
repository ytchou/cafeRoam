import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ShopCardGrid } from './shop-card-grid';
import { makeShop } from '@/lib/test-utils/factories';

const shop = {
  ...makeShop(),
  id: 'shop-brew',
  name: 'The Brew House',
  rating: 4.8,
  review_count: 324,
  photo_urls: ['https://example.com/brew.jpg'],
  taxonomyTags: [
    {
      id: 't1',
      dimension: 'functionality' as const,
      label: 'Quiet',
      labelZh: '安靜',
    },
  ],
};

describe('a user interacting with the ShopCardGrid', () => {
  it('a user browsing grid view sees the shop name', () => {
    render(<ShopCardGrid shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('a user sees a photo of the shop in the grid card', () => {
    render(<ShopCardGrid shop={shop} onClick={() => {}} />);
    expect(
      screen.getByRole('img', { name: 'The Brew House' })
    ).toBeInTheDocument();
  });

  it('a user sees the shop rating in the grid card', () => {
    render(<ShopCardGrid shop={shop} onClick={() => {}} />);
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('a user sees an open status badge when the shop is currently open', () => {
    render(
      <ShopCardGrid shop={{ ...shop, is_open: true }} onClick={() => {}} />
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('a user tapping a grid card triggers navigation to the shop detail', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardGrid shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
