import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { FavoritesDesktopLayout } from './favorites-desktop-layout';
import { makeList, makeListItem } from '@/lib/test-utils/factories';

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

describe('FavoritesDesktopLayout', () => {
  it('a user sees the sidebar with list cards', () => {
    render(
      <FavoritesDesktopLayout
        lists={lists}
        pins={[]}
        selectedShopId={null}
        onShopClick={() => {}}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
        onViewList={() => {}}
      />
    );
    expect(screen.getAllByText(/Favorites/).length).toBeGreaterThan(0);
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
  });

  it('a user under the list cap sees the New List button in the sidebar header', () => {
    render(
      <FavoritesDesktopLayout
        lists={lists}
        pins={[]}
        selectedShopId={null}
        onShopClick={() => {}}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
        onViewList={() => {}}
      />
    );
    expect(screen.getByText('New List')).toBeInTheDocument();
  });

  it('a user at the 3-list cap does not see the New List button', () => {
    const threeLists = [
      ...lists,
      makeList({ id: 'list-2', name: 'Weekend' }),
      makeList({ id: 'list-3', name: 'Date Night' }),
    ];
    render(
      <FavoritesDesktopLayout
        lists={threeLists}
        pins={[]}
        selectedShopId={null}
        onShopClick={() => {}}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
        onViewList={() => {}}
      />
    );
    expect(screen.queryByText('New List')).not.toBeInTheDocument();
  });
});
