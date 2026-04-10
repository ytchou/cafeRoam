import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/find',
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMap = (props: Record<string, unknown>) => (
      <div
        data-testid="map-view"
        data-selected={props.selectedShopId as string}
      >
        {(props.shops as Array<{ id: string }>)?.map((s) => (
          <button
            key={s.id}
            onClick={() => (props.onPinClick as (id: string) => void)?.(s.id)}
          >
            pin-{s.id}
          </button>
        ))}
      </div>
    );
    MockMap.displayName = 'MockMapView';
    return MockMap;
  },
}));

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Handle: () => null,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  },
}));

vi.mock('next/image', () => ({
  default: ({ ...rest }: Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

import { MapMobileLayout } from './map-mobile-layout';

const baseShops = [
  {
    id: 'shop-aa11bb',
    name: '晨光咖啡 Morning Glow',
    address: '台北市大安區信義路四段',
    latitude: 25.033,
    longitude: 121.543,
    mrt: '大安',
    rating: 4.7,
    review_count: 312,
    price_range: '$$',
    slug: 'morning-glow',
    photo_urls: ['https://example.com/morning-glow.jpg'],
  },
];

const defaultProps = {
  shops: baseShops,
  count: 1,
  selectedShopId: null,
  onShopClick: vi.fn(),
  query: '',
  activeFilters: [],
  onFilterToggle: vi.fn(),
  view: 'map' as const,
  onViewChange: vi.fn(),
  onSearch: vi.fn(),
  filterSheetOpen: false,
  onFilterOpen: vi.fn(),
  onFilterClose: vi.fn(),
  onFilterApply: vi.fn(),
};

describe('a user on the mobile map view', () => {
  it('does not render the map-overlay SearchBar on mobile', () => {
    render(<MapMobileLayout {...defaultProps} />);
    expect(screen.queryByPlaceholderText('Search coffee shops...')).toBeNull();
  });

  it('renders a standalone floating filter button that calls onFilterClick', async () => {
    const onFilterClick = vi.fn();
    render(<MapMobileLayout {...defaultProps} onFilterClick={onFilterClick} />);
    await userEvent.click(screen.getByRole('button', { name: /篩選/ }));
    expect(onFilterClick).toHaveBeenCalled();
  });
});
