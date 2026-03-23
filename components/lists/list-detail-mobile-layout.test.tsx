import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListDetailMobileLayout } from './list-detail-mobile-layout';
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
vi.mock('react-map-gl/mapbox', () => {
  const MockMap = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  );
  const MockMarker = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pin">{children}</div>
  );
  return { default: MockMap, Marker: MockMarker };
});

const shops = [
  { ...makeShop({ id: 'shop-1', name: '湛盧咖啡', address: '台北市信義區' }), is_open: true, taxonomy_tags: [] },
  { ...makeShop({ id: 'shop-2', name: '慢城咖啡', address: '台北市大安區' }), is_open: false, taxonomy_tags: [] },
];

describe('ListDetailMobileLayout', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test'));
  afterEach(() => vi.unstubAllEnvs());

  it('a user sees the list name in the top overlay', () => {
    render(
      <ListDetailMobileLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getAllByText('Work Spots').length).toBeGreaterThan(0);
  });

  it('a user sees the shop count badge', () => {
    render(
      <ListDetailMobileLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('2 shops')).toBeInTheDocument();
  });

  it('a user sees shop rows in the bottom sheet', () => {
    render(
      <ListDetailMobileLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('湛盧咖啡')).toBeInTheDocument();
    expect(screen.getByText('慢城咖啡')).toBeInTheDocument();
  });

  it('a user sees map pins for each shop', () => {
    render(
      <ListDetailMobileLayout
        listName="Work Spots"
        shops={shops}
        selectedShopId={null}
        onShopClick={() => {}}
        onBack={() => {}}
      />
    );
    expect(screen.getAllByTestId('pin')).toHaveLength(2);
  });
});
