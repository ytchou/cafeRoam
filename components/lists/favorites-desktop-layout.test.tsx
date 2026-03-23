import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { FavoritesDesktopLayout } from './favorites-desktop-layout';
import { makeList, makeListItem, makeShop } from '@/lib/test-utils/factories';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/lists',
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

const lists = [
  makeList({ id: 'list-1', name: 'Work Spots', items: [makeListItem()] }),
];
const shopsByList = {
  'list-1': [makeShop({ id: 'shop-1', name: '晨光咖啡' })],
};

describe('FavoritesDesktopLayout', () => {
  it('a user sees the sidebar with list title and shop rows', () => {
    render(
      <FavoritesDesktopLayout
        lists={lists}
        shopsByList={shopsByList}
        pins={[]}
        selectedShopId={null}
        onShopClick={() => {}}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.getAllByText(/Favorites/).length).toBeGreaterThan(0);
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
    expect(screen.getByText('晨光咖啡')).toBeInTheDocument();
  });

  it('a user sees the New List button in the sidebar header', () => {
    render(
      <FavoritesDesktopLayout
        lists={lists}
        shopsByList={shopsByList}
        pins={[]}
        selectedShopId={null}
        onShopClick={() => {}}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.getByText('New List')).toBeInTheDocument();
  });
});
