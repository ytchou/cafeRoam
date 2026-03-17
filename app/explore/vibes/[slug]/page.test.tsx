import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VibePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ slug: 'study-cave' }),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({ latitude: null, longitude: null, error: null, loading: false, requestLocation: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-vibe-shops', () => ({
  useVibeShops: () => ({
    response: {
      vibe: { slug: 'study-cave', name: 'Study Cave', nameZh: '讀書洞穴', emoji: '📚', subtitle: 'Quiet · WiFi' },
      shops: [
        { shopId: 'shop-a', name: '森日咖啡', slug: 'sen-ri', rating: 4.5, reviewCount: 120, overlapScore: 0.75, distanceKm: null, coverPhotoUrl: null, matchedTagLabels: [] },
      ],
      totalCount: 1,
    },
    isLoading: false,
    error: null,
  }),
}));

describe('VibePage — /explore/vibes/[slug]', () => {
  it('renders the vibe name as page heading', () => {
    render(<VibePage />);
    expect(screen.getByText('Study Cave')).toBeInTheDocument();
  });

  it('shows the shop count', () => {
    render(<VibePage />);
    expect(screen.getByText(/1 shop/)).toBeInTheDocument();
  });

  it('renders a shop row with name and rating', () => {
    render(<VibePage />);
    expect(screen.getByText('森日咖啡')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    render(<VibePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
