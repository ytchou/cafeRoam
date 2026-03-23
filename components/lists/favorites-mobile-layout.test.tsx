import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FavoritesMobileLayout } from './favorites-mobile-layout';
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
vi.mock('react-map-gl/mapbox', () => {
  const MockMap = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="minimap">{children}</div>
  );
  const MockMarker = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return { default: MockMap, Marker: MockMarker };
});

const lists = [
  makeList({
    id: 'list-1',
    name: 'Work Spots',
    items: [makeListItem({ shop_id: 'shop-1' }), makeListItem({ shop_id: 'shop-2' })],
  }),
  makeList({
    id: 'list-2',
    name: 'Weekend Cafes',
    items: [makeListItem({ shop_id: 'shop-3' })],
  }),
];
const pins = [
  { listId: 'list-1', shopId: 'shop-1', lat: 25.033, lng: 121.565 },
  { listId: 'list-1', shopId: 'shop-2', lat: 25.040, lng: 121.570 },
];

describe('FavoritesMobileLayout', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test'));
  afterEach(() => vi.unstubAllEnvs());

  it('a user sees the 收藏 header with list count badge', () => {
    render(
      <FavoritesMobileLayout
        lists={lists}
        pins={pins}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.getByRole('heading', { name: '收藏' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('a user sees list cards for each list', () => {
    render(
      <FavoritesMobileLayout
        lists={lists}
        pins={pins}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
    expect(screen.getByText('Weekend Cafes')).toBeInTheDocument();
  });

  it('a user with fewer than 3 lists sees an empty slot card', () => {
    render(
      <FavoritesMobileLayout
        lists={lists}
        pins={pins}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.getByText('Create a new list')).toBeInTheDocument();
    expect(screen.getByText('1 slot remaining')).toBeInTheDocument();
  });

  it('a user at the 3-list cap does not see an empty slot card', () => {
    const threeLists = [...lists, makeList({ id: 'list-3', name: 'Third List' })];
    render(
      <FavoritesMobileLayout
        lists={threeLists}
        pins={pins}
        onCreateList={() => {}}
        onDeleteList={() => {}}
        onRenameList={() => {}}
      />
    );
    expect(screen.queryByText('Create a new list')).not.toBeInTheDocument();
  });
});
