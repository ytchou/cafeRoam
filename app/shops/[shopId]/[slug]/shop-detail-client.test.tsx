import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Hook boundaries
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, isLoading: false }),
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

const mockShop = {
  id: 'shop-abc123',
  name: '日光珈琲',
  latitude: 25.033,
  longitude: 121.565,
  googlePlaceId: null as string | null,
  address: '台北市大安區復興南路一段107巷5弄6號' as string | null,
  instagramUrl: null as string | null,
  facebookUrl: null as string | null,
  threadsUrl: null as string | null,
};

describe('ShopDetailClient — new layout components', () => {
  it('renders the Check In 打卡 button from ShopActionsRow', () => {
    render(<ShopDetailClient shop={mockShop} />);
    expect(
      screen.getByRole('button', { name: /Check In 打卡/i })
    ).toBeInTheDocument();
  });

  it('renders the claim banner at the bottom of the shop view', () => {
    render(<ShopDetailClient shop={mockShop} />);
    expect(screen.getByText(/Is this your café/i)).toBeInTheDocument();
  });
});

describe('ShopDetailClient — community summary', () => {
  it('a user sees the community summary when the shop has one', () => {
    const shopWithSummary = {
      ...mockShop,
      communitySummary: '顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。',
    };
    render(<ShopDetailClient shop={shopWithSummary} />);
    expect(screen.getByTestId('community-summary')).toBeInTheDocument();
    expect(screen.getByText(/顧客推薦拿鐵/)).toBeInTheDocument();
  });

  it('a user does not see a community summary section when the shop has none', () => {
    render(<ShopDetailClient shop={mockShop} />);
    expect(screen.queryByTestId('community-summary')).not.toBeInTheDocument();
  });
});

describe('navigation links', () => {
  it('renders Google Maps link to place page', () => {
    render(
      <ShopDetailClient shop={{ ...mockShop, googlePlaceId: 'ChIJtest' }} />
    );
    const links = screen.getAllByRole('link', { name: /google maps/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringContaining('maps/search')
    );
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute(
      'rel',
      expect.stringContaining('noopener')
    );
  });

  it('renders Google Maps link to place page when no place_id', () => {
    render(<ShopDetailClient shop={{ ...mockShop, googlePlaceId: null }} />);
    const links = screen.getAllByRole('link', { name: /google maps/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringContaining('maps/search')
    );
  });

  it('renders Apple Maps link', () => {
    render(<ShopDetailClient shop={mockShop} />);
    const links = screen.getAllByRole('link', { name: /apple maps/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringContaining('maps.apple.com')
    );
    expect(links[0]).toHaveAttribute('target', '_blank');
  });
});

describe('Links section', () => {
  it('a user can click through to Instagram when the shop has an Instagram URL', () => {
    render(
      <ShopDetailClient
        shop={{ ...mockShop, instagramUrl: 'https://www.instagram.com/rufous_coffee' }}
      />
    );
    expect(
      screen.getByRole('link', { name: 'Instagram' })
    ).toHaveAttribute('href', 'https://www.instagram.com/rufous_coffee');
  });

  it('a user does not see an Instagram link when the shop has no Instagram URL', () => {
    render(<ShopDetailClient shop={{ ...mockShop, instagramUrl: null }} />);
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument();
  });

  it('renders Google Maps link using googlePlaceId when available', () => {
    render(
      <ShopDetailClient shop={{ ...mockShop, googlePlaceId: 'ChIJ_test123' }} />
    );
    expect(
      screen.getByRole('link', { name: '在 Google Maps 查看' })
    ).toHaveAttribute(
      'href',
      'https://www.google.com/maps/place/?q=place_id:ChIJ_test123'
    );
  });

  it('renders Google Maps link using lat/lng when no googlePlaceId', () => {
    render(
      <ShopDetailClient
        shop={{ ...mockShop, googlePlaceId: null, latitude: 25.04, longitude: 121.53 }}
      />
    );
    expect(
      screen.getByRole('link', { name: '在 Google Maps 查看' })
    ).toHaveAttribute('href', 'https://www.google.com/maps?q=25.04,121.53');
  });

  it('hides website link when website is already shown as Instagram icon', () => {
    render(
      <ShopDetailClient
        shop={{
          ...mockShop,
          website: 'https://www.instagram.com/rufous_coffee',
          instagramUrl: 'https://www.instagram.com/rufous_coffee',
        }}
      />
    );
    expect(screen.queryByRole('link', { name: '官方網站' })).not.toBeInTheDocument();
  });

  it('shows website link when website is a non-social URL', () => {
    render(
      <ShopDetailClient shop={{ ...mockShop, website: 'https://www.rufous.com.tw' }} />
    );
    expect(
      screen.getByRole('link', { name: '官方網站' })
    ).toHaveAttribute('href', 'https://www.rufous.com.tw');
  });
});
