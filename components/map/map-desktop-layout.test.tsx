import '@testing-library/jest-dom/vitest';
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

  it('a user sees a filter button in the sidebar header (SearchBar removed from map overlay)', () => {
    const onFilterClick = vi.fn();
    render(
      <MapDesktopLayout {...defaultProps} onFilterClick={onFilterClick} />
    );
    expect(screen.getByRole('button', { name: /篩選/ })).toBeInTheDocument();
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

  it('a user clicking a shop card opens the preview (calls onShopClick, not onCardClick)', async () => {
    const onCardClick = vi.fn();
    const onShopClick = vi.fn();
    render(
      <MapDesktopLayout
        {...defaultProps}
        onShopClick={onShopClick}
        onCardClick={onCardClick}
      />
    );
    await userEvent.click(screen.getByText('晨光咖啡 Morning Glow'));
    expect(onShopClick).toHaveBeenCalledWith('shop-aa11bb');
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('a user clicking a shop card calls onShopClick when onCardClick is not provided', async () => {
    const onShopClick = vi.fn();
    render(<MapDesktopLayout {...defaultProps} onShopClick={onShopClick} />);
    await userEvent.click(screen.getByText('晨光咖啡 Morning Glow'));
    expect(onShopClick).toHaveBeenCalledWith('shop-aa11bb');
  });

  it('a user clicking a map pin triggers onShopClick even when onCardClick is provided', async () => {
    const onCardClick = vi.fn();
    const onShopClick = vi.fn();
    render(
      <MapDesktopLayout
        {...defaultProps}
        onShopClick={onShopClick}
        onCardClick={onCardClick}
      />
    );
    await userEvent.click(screen.getByText('pin-shop-aa11bb'));
    expect(onShopClick).toHaveBeenCalledWith('shop-aa11bb');
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('a user clicking a pin sees the preview card with the shop details', () => {
    render(
      <MapDesktopLayout
        {...defaultProps}
        selectedShopId="shop-aa11bb"
        onCardClick={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /close preview/i })
    ).toBeInTheDocument();
    // With inline rendering, the selected shop appears once as ShopPreviewCard in the sidebar
    expect(
      screen.getAllByText('晨光咖啡 Morning Glow').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('a user does not see a preview card when no pin is selected', () => {
    render(<MapDesktopLayout {...defaultProps} selectedShopId={null} />);
    expect(
      screen.queryByRole('button', { name: /close preview/i })
    ).not.toBeInTheDocument();
  });

  it('a user clicking a pin while the panel is collapsed sees the panel auto-expand', async () => {
    const { rerender } = render(
      <MapDesktopLayout {...defaultProps} selectedShopId={null} />
    );
    await userEvent.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.queryByText('晨光咖啡 Morning Glow')).not.toBeInTheDocument();
    rerender(
      <MapDesktopLayout {...defaultProps} selectedShopId="shop-aa11bb" />
    );
    expect(
      screen.getByRole('button', { name: /collapse/i })
    ).toBeInTheDocument();
  });

  it('a user clicking the X button on the preview card calls onShopClick(null)', async () => {
    const onShopClick = vi.fn();
    render(
      <MapDesktopLayout
        {...defaultProps}
        selectedShopId="shop-aa11bb"
        onShopClick={onShopClick}
        onCardClick={vi.fn()}
      />
    );
    await userEvent.click(screen.getByLabelText('Close preview'));
    expect(onShopClick).toHaveBeenCalledWith(null);
  });

  it('a user clicking View Details on the preview card triggers navigation via onCardClick', async () => {
    const onCardClick = vi.fn();
    render(
      <MapDesktopLayout
        {...defaultProps}
        selectedShopId="shop-aa11bb"
        onCardClick={onCardClick}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /view details/i })
    );
    expect(onCardClick).toHaveBeenCalledWith('shop-aa11bb');
  });

  it('renders the selected shop as a full ShopPreviewCard in the sidebar, not as a floating overlay', () => {
    const shopA = {
      id: 'shop-a001',
      name: '清晨咖啡 Dawn Brew',
      address: '台北市信義區松仁路',
      latitude: 25.033,
      longitude: 121.543,
      mrt: '台北101',
      rating: 4.5,
      review_count: 100,
      price_range: '$$',
      slug: 'dawn-brew',
      photo_urls: ['https://example.com/dawn.jpg'],
    };
    const shopB = {
      id: 'shop-b002',
      name: 'Selected Cafe',
      address: '台北市大安區復興南路',
      latitude: 25.04,
      longitude: 121.55,
      mrt: '大安森林公園',
      rating: 4.8,
      review_count: 250,
      price_range: '$',
      slug: 'selected-cafe',
      photo_urls: ['https://example.com/selected.jpg'],
    };
    render(
      <MapDesktopLayout
        {...defaultProps}
        shops={[shopA, shopB]}
        selectedShopId="shop-b002"
        onShopClick={vi.fn()}
      />
    );
    // ShopPreviewCard renders the shop name in a span, not a heading
    expect(screen.getByText('Selected Cafe')).toBeInTheDocument();
    // No bottom-center floating overlay wrapper
    expect(document.querySelector('.absolute.bottom-6.left-1\\/2')).toBeNull();
  });

  it('auto-scrolls the selected card into view when selection changes', () => {
    // Use the scrollIntoView mock set up in beforeAll on HTMLElement.prototype
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const shopA = {
      id: 'shop-a001',
      name: '清晨咖啡 Dawn Brew',
      address: '台北市信義區松仁路',
      latitude: 25.033,
      longitude: 121.543,
      mrt: '台北101',
      rating: 4.5,
      review_count: 100,
      price_range: '$$',
      slug: 'dawn-brew',
      photo_urls: ['https://example.com/dawn.jpg'],
    };
    const shopB = {
      id: 'shop-b002',
      name: 'Selected Cafe',
      address: '台北市大安區復興南路',
      latitude: 25.04,
      longitude: 121.55,
      mrt: '大安森林公園',
      rating: 4.8,
      review_count: 250,
      price_range: '$',
      slug: 'selected-cafe',
      photo_urls: ['https://example.com/selected.jpg'],
    };
    const { rerender } = render(
      <MapDesktopLayout
        {...defaultProps}
        shops={[shopA, shopB]}
        selectedShopId={null}
      />
    );
    rerender(
      <MapDesktopLayout
        {...defaultProps}
        shops={[shopA, shopB]}
        selectedShopId="shop-b002"
      />
    );
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
    });
  });

  it('does not render the map-overlay SearchBar in the sidebar', () => {
    render(<MapDesktopLayout {...defaultProps} />);
    // SearchBar renders an input[type="search"] / role="searchbox"; after removal it should be gone
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('renders a filter button in the sidebar header that calls onFilterClick', async () => {
    const onFilterClick = vi.fn();
    render(
      <MapDesktopLayout {...defaultProps} onFilterClick={onFilterClick} />
    );
    await userEvent.click(screen.getByRole('button', { name: /篩選/ }));
    expect(onFilterClick).toHaveBeenCalled();
  });
});
