import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleMapPanel } from '@/components/map/collapsible-map-panel';

// Mock MapView since it requires Mapbox token
vi.mock('@/components/map/map-view', () => ({
  MapView: ({
    shops,
    selectedShopId,
  }: {
    shops: { id: string }[];
    selectedShopId: string | null;
  }) => (
    <div
      data-testid="map-view"
      data-shop-count={shops.length}
      data-selected={selectedShopId}
    />
  ),
}));

const mockShops = [
  { id: 's1', name: 'Cafe A', latitude: 25.033, longitude: 121.565 },
  { id: 's2', name: 'Cafe B', latitude: 25.04, longitude: 121.55 },
];

describe('CollapsibleMapPanel', () => {
  it('renders map expanded by default', () => {
    render(
      <CollapsibleMapPanel
        shops={mockShops}
        selectedShopId={null}
        onPinClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('collapses map when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleMapPanel
        shops={mockShops}
        selectedShopId={null}
        onPinClick={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /收起地圖|hide map/i });
    await user.click(toggle);

    expect(screen.getByTestId('map-container')).toHaveAttribute(
      'data-collapsed',
      'true'
    );
  });

  it('expands map when toggle is clicked again', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleMapPanel
        shops={mockShops}
        selectedShopId={null}
        onPinClick={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /收起地圖|hide map/i });
    await user.click(toggle); // collapse
    await user.click(
      screen.getByRole('button', { name: /顯示地圖|show map/i })
    ); // expand

    expect(screen.getByTestId('map-container')).toHaveAttribute(
      'data-collapsed',
      'false'
    );
  });

  it('passes selectedShopId to MapView', () => {
    render(
      <CollapsibleMapPanel
        shops={mockShops}
        selectedShopId="s1"
        onPinClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('map-view')).toHaveAttribute(
      'data-selected',
      's1'
    );
  });
});
