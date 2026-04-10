import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';

// Mock the device capability hook — it has its own dedicated test file
vi.mock('@/lib/hooks/use-device-capability', () => ({
  useDeviceCapability: vi.fn(() => ({ isLowEnd: false, deviceMemory: 8 })),
}));

// Mock next/dynamic at the Next.js boundary to prevent WebGL canvas errors in jsdom
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMapView = () => <div data-testid="map-view" />;
    MockMapView.displayName = 'MockMapView';
    return MockMapView;
  },
}));

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

// Mock layout components — real layouts transitively depend on next/navigation,
// window.matchMedia, and other browser APIs beyond the scope of this component test.
// The boundary mock for the actual map renderer is next/dynamic above; these are
// isolation mocks so MapWithFallback can be tested without its full dependency tree.
vi.mock('@/components/map/map-mobile-layout', () => ({
  MapMobileLayout: ({ onFilterClick }: { onFilterClick?: () => void }) => (
    <div data-testid="map-mobile-layout">
      <button type="button" onClick={onFilterClick}>
        filter-mobile
      </button>
    </div>
  ),
}));
vi.mock('@/components/map/map-desktop-layout', () => ({
  MapDesktopLayout: ({ onFilterClick }: { onFilterClick?: () => void }) => (
    <div data-testid="map-desktop-layout">
      <button type="button" onClick={onFilterClick}>
        filter-desktop
      </button>
    </div>
  ),
}));
vi.mock('@/components/map/list-mobile-layout', () => ({
  ListMobileLayout: () => <div data-testid="list-mobile-layout" />,
}));
vi.mock('@/components/map/list-desktop-layout', () => ({
  ListDesktopLayout: () => <div data-testid="list-desktop-layout" />,
}));

import { useDeviceCapability } from '@/lib/hooks/use-device-capability';
import { MapWithFallback } from '../map-with-fallback';

const mockUseDeviceCapability = useDeviceCapability as Mock;

const defaultProps = {
  shops: [],
  count: 0,
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
  isDesktop: false,
  onCardClick: vi.fn(),
};

describe('MapWithFallback', () => {
  it('on a low-end device, shows list view with "載入地圖" button instead of loading the map', () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: true,
      deviceMemory: 2,
    });
    render(<MapWithFallback {...defaultProps} />);
    expect(screen.getByTestId('list-container')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /載入地圖/i })
    ).toBeInTheDocument();
  });

  it('on a low-end desktop, shows list view with "載入地圖" button', () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: true,
      deviceMemory: 1,
    });
    render(<MapWithFallback {...defaultProps} isDesktop={true} />);
    expect(screen.getByTestId('list-container')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /載入地圖/i })
    ).toBeInTheDocument();
  });

  it('on a capable device, initially shows list then transitions to map once loaded', async () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: false,
      deviceMemory: 8,
    });
    render(<MapWithFallback {...defaultProps} />);
    // List shows first (progressive loading)
    expect(screen.getByTestId('list-container')).toBeInTheDocument();
    // Map appears after dynamic import resolves
    await waitFor(() =>
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    );
  });

  it('on a capable device, shows list when view is list', () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: false,
      deviceMemory: 8,
    });
    render(<MapWithFallback {...defaultProps} view="list" />);
    expect(screen.getByTestId('list-container')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /載入地圖/i })
    ).not.toBeInTheDocument();
  });

  it('low-end user can force map to load by tapping "載入地圖"', async () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: true,
      deviceMemory: 2,
    });
    const user = userEvent.setup();
    render(<MapWithFallback {...defaultProps} />);

    const loadBtn = screen.getByRole('button', { name: /載入地圖/i });
    await user.click(loadBtn);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /載入地圖/i })
    ).not.toBeInTheDocument();
  });

  it('forwards onFilterOpen as onFilterClick to mobile map layout so the filter button is functional', async () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: false,
      deviceMemory: 8,
    });
    const onFilterOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MapWithFallback
        {...defaultProps}
        onFilterOpen={onFilterOpen}
        isDesktop={false}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'filter-mobile' }));
    expect(onFilterOpen).toHaveBeenCalledOnce();
  });

  it('forwards onFilterOpen as onFilterClick to desktop map layout so the filter button is functional', async () => {
    mockUseDeviceCapability.mockReturnValue({
      isLowEnd: false,
      deviceMemory: 8,
    });
    const onFilterOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MapWithFallback
        {...defaultProps}
        onFilterOpen={onFilterOpen}
        isDesktop={true}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'filter-desktop' }));
    expect(onFilterOpen).toHaveBeenCalledOnce();
  });
});
