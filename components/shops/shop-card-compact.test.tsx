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

describe('ShopCardCompact', () => {
  it('renders shop name', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('renders rating and meta text', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('renders shop photo', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByRole('img', { name: 'The Brew House' })).toBeInTheDocument();
  });

  it('renders chevron arrow', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByTestId('compact-card-arrow')).toBeInTheDocument();
  });

  it('shows selected state with accent border and highlight bg', () => {
    const { container } = render(<ShopCardCompact shop={shop} onClick={() => {}} selected />);
    const article = container.querySelector('article');
    expect(article).toHaveAttribute('data-selected', 'true');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardCompact shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
