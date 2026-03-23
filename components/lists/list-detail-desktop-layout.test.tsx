import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ListDetailDesktopLayout } from './list-detail-desktop-layout';
import { makeShop } from '@/lib/test-utils/factories';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/lists/list-1',
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMapView = () => <div data-testid="map-view">Map</div>;
    return MockMapView;
  },
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: (q: string) => ({
      matches: q.includes('1024'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

const shops = [
  {
    ...makeShop({ id: 'shop-1', name: '晨光咖啡', address: '台北市大安區' }),
    is_open: true,
    taxonomy_tags: [],
  },
];

describe('ListDetailDesktopLayout', () => {
  it('a user sees the back breadcrumb and list title in the left panel', () => {
    render(
      <ListDetailDesktopLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/My Favorites/)).toBeInTheDocument();
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
  });

  it('a user sees the shop count below the list title', () => {
    render(
      <ListDetailDesktopLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/1 shop/)).toBeInTheDocument();
  });

  it('a user sees shop rows in the left panel', () => {
    render(
      <ListDetailDesktopLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('晨光咖啡')).toBeInTheDocument();
  });

  it('a user clicking a shop row triggers the selection callback', async () => {
    const onShopClick = vi.fn();
    render(
      <ListDetailDesktopLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={onShopClick}
        onBack={() => {}}
      />
    );
    await userEvent.click(screen.getByText('晨光咖啡'));
    expect(onShopClick).toHaveBeenCalledWith('shop-1');
  });
});
