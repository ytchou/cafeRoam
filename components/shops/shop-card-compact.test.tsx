import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ShopCardCompact } from './shop-card-compact';
import { makeShop } from '@/lib/test-utils/factories';

const shop = {
  ...makeShop(),
  id: 'shop-brew',
  name: 'The Brew House',
  rating: 4.8,
  photo_urls: ['https://example.com/brew.jpg'],
};

describe('a user interacting with the ShopCardCompact', () => {
  it('a user browsing list view sees the shop name', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('a user sees the shop rating to help decide where to go', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('a user sees a photo of the shop in the compact card', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByRole('img', { name: 'The Brew House' })).toBeInTheDocument();
  });

  it('a user sees a chevron arrow indicating the card is tappable for more details', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByTestId('compact-card-arrow')).toBeInTheDocument();
  });

  it('a user sees the card highlighted when it corresponds to the selected map pin', () => {
    const { container } = render(<ShopCardCompact shop={shop} onClick={() => {}} selected />);
    const article = container.querySelector('article');
    expect(article).toHaveAttribute('data-selected', 'true');
  });

  it('a user tapping a compact card triggers navigation to the shop detail', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardCompact shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
