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

import { MapDesktopLayout } from './map-desktop-layout';

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
  {
    id: 'shop-cc22dd',
    name: '慢城咖啡 Slow City',
    address: '台北市中山區林森北路',
    latitude: 25.052,
    longitude: 121.527,
    mrt: '中山',
    rating: 4.4,
    review_count: 198,
    price_range: '$',
    slug: 'slow-city',
    photo_urls: ['https://example.com/slow-city.jpg'],
  },
];

const defaultProps = {
  shops: baseShops,
  count: 2,
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

describe('a user on the desktop map view', () => {
  it('a user sees all shops listed in the side panel', () => {
    render(<MapDesktopLayout {...defaultProps} />);
    expect(screen.getByText('晨光咖啡 Morning Glow')).toBeInTheDocument();
    expect(screen.getByText('慢城咖啡 Slow City')).toBeInTheDocument();
  });

  it('a user sees the shop count in the panel header', () => {
    render(<MapDesktopLayout {...defaultProps} count={2} />);
    expect(screen.getByText('2 places nearby')).toBeInTheDocument();
  });

  it('a user sees the search bar to find shops', () => {
    render(<MapDesktopLayout {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Search coffee shops...')
    ).toBeInTheDocument();
  });

  it('a user clicking a shop card triggers the shop selection callback', async () => {
    const onShopClick = vi.fn();
    render(<MapDesktopLayout {...defaultProps} onShopClick={onShopClick} />);
    await userEvent.click(screen.getByText('晨光咖啡 Morning Glow'));
    expect(onShopClick).toHaveBeenCalledWith('shop-aa11bb');
  });

  it('a user collapsing the side panel hides the shop list', async () => {
    render(<MapDesktopLayout {...defaultProps} />);
    const collapseBtn = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(collapseBtn);
    expect(screen.queryByText('晨光咖啡 Morning Glow')).not.toBeInTheDocument();
  });

  it('a user expanding the panel after collapsing sees the shop list again', async () => {
    render(<MapDesktopLayout {...defaultProps} />);
    const collapseBtn = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(collapseBtn);
    await userEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByText('晨光咖啡 Morning Glow')).toBeInTheDocument();
  });

  it('a user sees the map rendered alongside the panel', () => {
    render(<MapDesktopLayout {...defaultProps} />);
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });
});
