import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mock } from 'vitest';

// Mock the device capability hook at the module boundary
vi.mock('@/lib/hooks/use-device-capability', () => ({
  useDeviceCapability: vi.fn(() => ({ isLowEnd: false, deviceMemory: 8 })),
}));

// Mock map layouts to avoid loading Mapbox GL
vi.mock('@/components/map/map-mobile-layout', () => ({
  MapMobileLayout: () => <div data-testid="map-mobile-layout" data-view="map" />,
}));
vi.mock('@/components/map/map-desktop-layout', () => ({
  MapDesktopLayout: () => <div data-testid="map-desktop-layout" data-view="map" />,
}));
vi.mock('@/components/map/list-mobile-layout', () => ({
  ListMobileLayout: () => <div data-testid="list-mobile-layout" data-view="list" />,
}));
vi.mock('@/components/map/list-desktop-layout', () => ({
  ListDesktopLayout: () => <div data-testid="list-desktop-layout" data-view="list" />,
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
  it('shows list view with "載入地圖" button on low-end devices', () => {
    mockUseDeviceCapability.mockReturnValue({ isLowEnd: true, deviceMemory: 2 });
    render(<MapWithFallback {...defaultProps} />);
    expect(screen.getByTestId('list-mobile-layout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /載入地圖/i })).toBeInTheDocument();
  });

  it('shows list view with "載入地圖" button on low-end desktop', () => {
    mockUseDeviceCapability.mockReturnValue({ isLowEnd: true, deviceMemory: 1 });
    render(<MapWithFallback {...defaultProps} isDesktop={true} />);
    expect(screen.getByTestId('list-desktop-layout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /載入地圖/i })).toBeInTheDocument();
  });

  it('renders map layout on capable mobile device when view is map', () => {
    mockUseDeviceCapability.mockReturnValue({ isLowEnd: false, deviceMemory: 8 });
    render(<MapWithFallback {...defaultProps} />);
    expect(screen.getByTestId('map-mobile-layout')).toBeInTheDocument();
  });

  it('renders list layout on capable device when view is list', () => {
    mockUseDeviceCapability.mockReturnValue({ isLowEnd: false, deviceMemory: 8 });
    render(<MapWithFallback {...defaultProps} view="list" />);
    expect(screen.getByTestId('list-mobile-layout')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /載入地圖/i })).not.toBeInTheDocument();
  });

  it('loads map when low-end user taps "載入地圖"', async () => {
    mockUseDeviceCapability.mockReturnValue({ isLowEnd: true, deviceMemory: 2 });
    const user = userEvent.setup();
    render(<MapWithFallback {...defaultProps} />);

    const loadBtn = screen.getByRole('button', { name: /載入地圖/i });
    await user.click(loadBtn);

    // After clicking, should show map layout
    expect(screen.getByTestId('map-mobile-layout')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /載入地圖/i })).not.toBeInTheDocument();
  });
});
