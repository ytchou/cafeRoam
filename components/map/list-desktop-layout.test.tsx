import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/find',
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
  default: ({ fill, priority, ...rest }: Record<string, unknown>) => {
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

import { ListDesktopLayout } from './list-desktop-layout';

const baseShops = [
  {
    id: 'shop-ee33ff',
    name: '鹿鳴咖啡 Deer Song',
    address: '台北市松山區南京東路五段',
    latitude: 25.051,
    longitude: 121.569,
    mrt: '南京三民',
    rating: 4.5,
    review_count: 214,
    price_range: '$$',
    slug: 'deer-song',
    photo_urls: ['https://example.com/deer-song.jpg'],
  },
  {
    id: 'shop-gg44hh',
    name: '靜巷咖啡 Quiet Lane',
    address: '台北市文山區木柵路',
    latitude: 24.998,
    longitude: 121.572,
    mrt: '木柵',
    rating: 4.3,
    review_count: 89,
    price_range: '$',
    slug: 'quiet-lane',
    photo_urls: ['https://example.com/quiet-lane.jpg'],
  },
];

const defaultProps = {
  shops: baseShops,
  count: 2,
  onShopClick: vi.fn(),
  query: '',
  activeFilters: [],
  onFilterToggle: vi.fn(),
  view: 'list' as const,
  onViewChange: vi.fn(),
  onSearch: vi.fn(),
  filterSheetOpen: false,
  onFilterOpen: vi.fn(),
  onFilterClose: vi.fn(),
  onFilterApply: vi.fn(),
};

describe('a user on the desktop list view', () => {
  it('a user sees all shops displayed in the grid', () => {
    render(<ListDesktopLayout {...defaultProps} />);
    expect(screen.getByText('鹿鳴咖啡 Deer Song')).toBeInTheDocument();
    expect(screen.getByText('靜巷咖啡 Quiet Lane')).toBeInTheDocument();
  });

  it('a user sees the shop count in the header', () => {
    render(<ListDesktopLayout {...defaultProps} count={2} />);
    expect(screen.getByText('2 places nearby')).toBeInTheDocument();
  });

  it('a user sees the search bar to refine results', () => {
    render(<ListDesktopLayout {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Search coffee shops...')
    ).toBeInTheDocument();
  });

  it('a user clicking a shop card triggers the navigation callback', async () => {
    const onShopClick = vi.fn();
    render(<ListDesktopLayout {...defaultProps} onShopClick={onShopClick} />);
    await userEvent.click(screen.getByText('鹿鳴咖啡 Deer Song'));
    expect(onShopClick).toHaveBeenCalledWith('shop-ee33ff');
  });

  it('a user sees quick filter tags to narrow down the list', () => {
    render(<ListDesktopLayout {...defaultProps} />);
    // QUICK_FILTERS always renders at least one tag
    const filterButtons = screen
      .getAllByRole('button')
      .filter((b) => b.classList.contains('rounded-full') || b.dataset.active !== undefined);
    expect(filterButtons.length).toBeGreaterThan(0);
  });

  it('a user with a pre-filled query sees it in the search bar', () => {
    render(<ListDesktopLayout {...defaultProps} query="basque cake" />);
    expect(screen.getByDisplayValue('basque cake')).toBeInTheDocument();
  });
});
