import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ShopCarousel } from './shop-carousel';
import { makeShop } from '@/lib/test-utils/factories';

vi.mock('next/image', () => ({
  default: ({ ...rest }: Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

const shops = [
  {
    ...makeShop(),
    id: 'shop-1',
    name: 'Brew House',
    photo_urls: ['https://example.com/1.jpg'],
  },
  {
    ...makeShop(),
    id: 'shop-2',
    name: 'Velvet Bean',
    photo_urls: ['https://example.com/2.jpg'],
  },
];

describe('a user interacting with the ShopCarousel', () => {
  it('a user browsing the map sees all nearby shops listed in the carousel', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('Brew House')).toBeInTheDocument();
    expect(screen.getByText('Velvet Bean')).toBeInTheDocument();
  });

  it('a user sees the section heading identifying the nearby shops carousel', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('Nearby Coffee Shops')).toBeInTheDocument();
  });

  it('a user sees how many nearby shops are available', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('2 places')).toBeInTheDocument();
  });

  it('a user can scroll horizontally through the shop cards', () => {
    const { container } = render(
      <ShopCarousel shops={shops} onShopClick={() => {}} />
    );
    expect(
      container.querySelector('[data-testid="carousel-scroll"]')
    ).toBeInTheDocument();
  });

  it('a user tapping a carousel card navigates via onCardClick when provided', async () => {
    const onCardClick = vi.fn();
    const onShopClick = vi.fn();
    render(
      <ShopCarousel
        shops={shops}
        onShopClick={onShopClick}
        onCardClick={onCardClick}
      />
    );
    await userEvent.click(screen.getByText('Brew House'));
    expect(onCardClick).toHaveBeenCalledWith('shop-1');
    expect(onShopClick).not.toHaveBeenCalled();
  });

  it('a user tapping a carousel card falls back to onShopClick when onCardClick is not provided', async () => {
    const onShopClick = vi.fn();
    render(<ShopCarousel shops={shops} onShopClick={onShopClick} />);
    await userEvent.click(screen.getByText('Brew House'));
    expect(onShopClick).toHaveBeenCalledWith('shop-1');
  });
});
