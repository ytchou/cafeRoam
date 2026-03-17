import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExplorePage from './page';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({ latitude: null, longitude: null, error: null, loading: false, requestLocation: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-tarot-draw', () => ({
  useTarotDraw: () => ({ cards: [], isLoading: false, error: null, redraw: vi.fn(), setRadiusKm: vi.fn() }),
}));
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-vibes', () => ({
  useVibes: () => ({
    vibes: [
      { slug: 'study-cave', name: 'Study Cave', nameZh: '讀書洞穴', emoji: '📚', subtitle: 'Quiet · WiFi' },
      { slug: 'first-date', name: 'First Date', nameZh: '約會聖地', emoji: '💕', subtitle: 'Cozy · Pretty' },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('Explore page', () => {
  it('When a user opens the Explore tab, they see the explore section', () => {
    render(<ExplorePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('ExplorePage — vibe strip', () => {
  it('renders the Browse by Vibe section heading', () => {
    render(<ExplorePage />);
    expect(screen.getByText('Browse by Vibe')).toBeInTheDocument();
  });

  it('renders vibe cards with name and subtitle', () => {
    render(<ExplorePage />);
    expect(screen.getByText('Study Cave')).toBeInTheDocument();
    expect(screen.getByText('Quiet · WiFi')).toBeInTheDocument();
    expect(screen.getByText('First Date')).toBeInTheDocument();
  });
});
