import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DirectionsSheet to capture props without rendering the full component
vi.mock('@/components/shops/directions-sheet', () => ({
  DirectionsSheet: vi.fn(() => null),
}));
vi.mock('@/components/shops/directions-inline', () => ({
  DirectionsInline: () => null,
}));

// Hook boundaries
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));
vi.mock('@/lib/hooks/use-shop-reviews', () => ({
  useShopReviews: () => ({
    reviews: [],
    total: 0,
    averageRating: null,
    isLoading: false,
  }),
}));
vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({ isSaved: () => false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Render-only child components — not under test here
vi.mock('@/components/shops/shop-hero', () => ({ ShopHero: () => null }));
vi.mock('@/components/shops/shop-identity', () => ({
  ShopIdentity: () => null,
}));
vi.mock('@/components/shops/attribute-chips', () => ({
  AttributeChips: () => null,
}));
vi.mock('@/components/shops/shop-description', () => ({
  ShopDescription: () => null,
}));
vi.mock('@/components/shops/menu-highlights', () => ({
  MenuHighlights: () => null,
}));
vi.mock('@/components/shops/recent-checkins-strip', () => ({
  RecentCheckinsStrip: () => null,
}));
vi.mock('@/components/shops/shop-map-thumbnail', () => ({
  ShopMapThumbnail: () => null,
}));
vi.mock('@/components/shops/shop-reviews', () => ({ ShopReviews: () => null }));
vi.mock('@/components/shops/shop-actions-row', () => ({
  ShopActionsRow: () => (
    <button aria-label="Check In 打卡">Check In 打卡</button>
  ),
}));
vi.mock('@/components/shops/claim-banner', () => ({
  ClaimBanner: () => <p>Is this your café? Claim this page →</p>,
}));
vi.mock('@/components/shops/community-summary', () => ({
  CommunitySummary: ({ summary }: { summary: string | null }) =>
    summary ? <p data-testid="community-summary">{summary}</p> : null,
}));

import { ShopDetailClient } from './shop-detail-client';
import { DirectionsSheet } from '@/components/shops/directions-sheet';
import { useGeolocation } from '@/lib/hooks/use-geolocation';

const shopWithMap = {
  id: 'shop-abc123',
  name: '日光珈琲',
  latitude: 25.033,
  longitude: 121.565,
};

describe('ShopDetailClient — Get There button', () => {
  beforeEach(() => {
    vi.mocked(DirectionsSheet).mockClear();
  });

  it('a user tapping "Get There" after granting location sees DirectionsSheet with their coordinates', () => {
    const mockRequestLocation = vi.fn();
    vi.mocked(useGeolocation).mockReturnValue({
      latitude: 25.04,
      longitude: 121.55,
      error: null,
      loading: false,
      requestLocation: mockRequestLocation,
    });

    render(<ShopDetailClient shop={shopWithMap} />);
    fireEvent.click(screen.getByRole('button', { name: /get there/i }));

    expect(mockRequestLocation).toHaveBeenCalledOnce();

    const lastProps = vi.mocked(DirectionsSheet).mock.calls.at(-1)?.[0];
    expect(lastProps?.open).toBe(true);
    expect(lastProps?.userLat).toBe(25.04);
    expect(lastProps?.userLng).toBe(121.55);
  });

  it('a user tapping "Get There" before granting location opens DirectionsSheet without coordinates', () => {
    const mockRequestLocation = vi.fn();
    vi.mocked(useGeolocation).mockReturnValue({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      requestLocation: mockRequestLocation,
    });

    render(<ShopDetailClient shop={shopWithMap} />);
    fireEvent.click(screen.getByRole('button', { name: /get there/i }));

    expect(mockRequestLocation).toHaveBeenCalledOnce();

    const lastProps = vi.mocked(DirectionsSheet).mock.calls.at(-1)?.[0];
    expect(lastProps?.open).toBe(true);
    expect(lastProps?.userLat).toBeUndefined();
    expect(lastProps?.userLng).toBeUndefined();
  });

  it('a shop without coordinates does not render a "Get There" button', () => {
    vi.mocked(useGeolocation).mockReturnValue({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });

    const shopWithoutMap = { id: 'shop-xyz', name: '無地圖咖啡' };
    render(<ShopDetailClient shop={shopWithoutMap} />);

    expect(
      screen.queryByRole('button', { name: /get there/i })
    ).not.toBeInTheDocument();
  });
});

describe('ShopDetailClient — new layout components', () => {
  beforeEach(() => {
    vi.mocked(useGeolocation).mockReturnValue({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });
  });

  it('renders the Check In 打卡 button from ShopActionsRow', () => {
    render(<ShopDetailClient shop={shopWithMap} />);
    expect(
      screen.getByRole('button', { name: /Check In 打卡/i })
    ).toBeInTheDocument();
  });

  it('renders the claim banner at the bottom of the shop view', () => {
    render(<ShopDetailClient shop={shopWithMap} />);
    expect(screen.getByText(/Is this your café/i)).toBeInTheDocument();
  });
});

describe('ShopDetailClient — community summary', () => {
  beforeEach(() => {
    vi.mocked(useGeolocation).mockReturnValue({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });
  });

  it('a user sees the community summary when the shop has one', () => {
    const shopWithSummary = {
      ...shopWithMap,
      communitySummary: '顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。',
    };
    render(<ShopDetailClient shop={shopWithSummary} />);
    expect(screen.getByTestId('community-summary')).toBeInTheDocument();
    expect(screen.getByText(/顧客推薦拿鐵/)).toBeInTheDocument();
  });

  it('a user does not see a community summary section when the shop has none', () => {
    render(<ShopDetailClient shop={shopWithMap} />);
    expect(screen.queryByTestId('community-summary')).not.toBeInTheDocument();
  });
});
