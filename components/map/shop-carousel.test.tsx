import { render, screen } from '@testing-library/react';
import { ShopCarousel } from './shop-carousel';
import { makeShop } from '@/lib/test-utils/factories';

const shops = [
  { ...makeShop(), id: 'shop-1', name: 'Brew House', photo_urls: ['https://example.com/1.jpg'] },
  { ...makeShop(), id: 'shop-2', name: 'Velvet Bean', photo_urls: ['https://example.com/2.jpg'] },
];

describe('ShopCarousel', () => {
  it('renders all shop cards', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('Brew House')).toBeInTheDocument();
    expect(screen.getByText('Velvet Bean')).toBeInTheDocument();
  });

  it('renders section header', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('Nearby Coffee Shops')).toBeInTheDocument();
  });

  it('renders shop count', () => {
    render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(screen.getByText('2 places')).toBeInTheDocument();
  });

  it('has horizontal scroll container', () => {
    const { container } = render(<ShopCarousel shops={shops} onShopClick={() => {}} />);
    expect(container.querySelector('[data-testid="carousel-scroll"]')).toBeInTheDocument();
  });
});
