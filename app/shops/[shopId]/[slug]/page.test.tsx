import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  redirect: vi.fn(),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/shops/shop-actions-row', () => ({
  ShopActionsRow: () => null,
}));
vi.mock('@/components/shops/claim-banner', () => ({
  ClaimBanner: () => null,
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    requestLocation: vi.fn(),
  }),
}));
vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({ isSaved: () => false }),
}));
vi.mock('@/components/shops/shop-map-thumbnail', () => ({
  ShopMapThumbnail: () => <div data-testid="shop-map-thumbnail" />,
}));
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}));
vi.mock('@/lib/hooks/use-shop-reviews', () => ({
  useShopReviews: () => ({
    reviews: [],
    total: 0,
    averageRating: 0,
    isLoading: false,
  }),
}));

import { ShopDetailClient } from './shop-detail-client';

const MOCK_SHOP = {
  id: 'shop-001',
  name: '山小孩咖啡',
  slug: 'shan-xiao-hai-ka-fei',
  address: '台北市大安區',
  latitude: 25.033,
  longitude: 121.543,
  rating: 4.6,
  reviewCount: 287,
  description: 'A cozy coffee shop',
  photoUrls: ['https://example.com/photo.jpg'],
  taxonomyTags: [
    { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜', confidence: 0.9 },
    { id: 'cozy', dimension: 'ambience', label: 'Cozy', labelZh: '溫馨', confidence: 0.8 },
    { id: 'natural_light', dimension: 'ambience', label: 'Natural Light', labelZh: '採光好', confidence: 0.7 },
  ],
  modeScores: { work: 0.8, rest: 0.6, social: 0.3 },
};

describe('ShopDetailClient', () => {
  it('a visitor can see the shop name and rating', () => {
    render(<ShopDetailClient shop={MOCK_SHOP} />);
    expect(screen.getByText('山小孩咖啡')).toBeInTheDocument();
    expect(screen.getByText(/4\.6/)).toBeInTheDocument();
  });

  it("a visitor sees the shop's attribute tags at a glance", () => {
    render(<ShopDetailClient shop={MOCK_SHOP} />);
    expect(screen.getByText('安靜')).toBeInTheDocument();
  });

  it('a visitor can read the shop description', () => {
    render(<ShopDetailClient shop={MOCK_SHOP} />);
    expect(screen.getByText('A cozy coffee shop')).toBeInTheDocument();
  });
});
