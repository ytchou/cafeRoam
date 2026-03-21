import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import useSWR from 'swr';
import VibePage from './page';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ slug: 'study-cave' }),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    requestLocation: vi.fn(),
  }),
}));
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));

const MOCK_VIBE = {
  slug: 'study-cave',
  name: 'Study Cave',
  nameZh: '讀書洞穴',
  emoji: '📚',
  subtitle: 'Quiet · WiFi',
  tagIds: ['quiet', 'wifi'],
  sortOrder: 1,
};

const MOCK_SHOP = {
  shopId: 'shop-a',
  name: '森日咖啡',
  slug: 'sen-ri',
  rating: 4.5,
  reviewCount: 120,
  overlapScore: 0.75,
  distanceKm: null,
  coverPhotoUrl: null,
  matchedTagLabels: ['quiet', 'wifi'],
};

const MOCK_RESPONSE = {
  vibe: MOCK_VIBE,
  shops: [MOCK_SHOP],
  totalCount: 1,
};

function mockVibeShopsLoaded() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: MOCK_RESPONSE,
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsLoading() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: undefined,
        isLoading: true,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsEmpty() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: { vibe: MOCK_VIBE, shops: [], totalCount: 0 },
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsWithDistance() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: {
          vibe: MOCK_VIBE,
          shops: [{ ...MOCK_SHOP, distanceKm: 1.2 }],
          totalCount: 1,
        },
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VibePage — /explore/vibes/[slug]', () => {
  it('renders the vibe name as page heading', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('Study Cave')).toBeInTheDocument();
  });

  it('renders circle back button', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
  });

  it('renders subtitle as tag chips', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('Quiet')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('renders shop count badge with shops nearby text', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText(/shops nearby/)).toBeInTheDocument();
  });

  it('renders a shop row with name and star rating', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('森日咖啡')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders bookmark icon on shop rows', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getAllByLabelText('Save shop').length).toBeGreaterThan(0);
  });

  it('shows loading skeletons while data is being fetched', () => {
    mockVibeShopsLoading();
    render(<VibePage />);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('shows empty state message when no shops match the vibe', () => {
    mockVibeShopsEmpty();
    render(<VibePage />);
    expect(
      screen.getByText('No shops found for this vibe.')
    ).toBeInTheDocument();
  });

  it('shows distance badge when distanceKm is present', () => {
    mockVibeShopsWithDistance();
    render(<VibePage />);
    expect(screen.getByText('1.2 km')).toBeInTheDocument();
  });
});
