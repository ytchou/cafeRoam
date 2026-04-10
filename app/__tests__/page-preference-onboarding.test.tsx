import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted shared state for modal mock — avoids require() inside factory
const modalState = vi.hoisted(() => ({ shouldPrompt: false }));

// Mock IntersectionObserver (not available in jsdom)
const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

// DEBT: This test file mocks ~10 internal hooks and components because app/page.tsx
// is a large top-level orchestrator with no smaller testable unit for modal-mount logic.
// Longer-term fix: extract the PreferenceOnboardingModal mount condition into a smaller
// hook or wrapper component so it can be tested in isolation at the HTTP boundary.
// Tracked as tech debt — do not add more vi.mock() calls here without first considering
// whether the relevant behaviour can be tested closer to the boundary.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: vi.fn(),
}));

vi.mock('@/lib/hooks/use-preference-onboarding', () => ({
  usePreferenceOnboarding: vi.fn(),
}));

vi.mock('@/lib/hooks/use-shops', () => ({
  useShops: vi.fn(),
}));

vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: vi.fn(),
}));

vi.mock('@/lib/hooks/use-search-state', () => ({
  useSearchState: vi.fn(),
}));

vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(),
}));

vi.mock('@/lib/analytics/ga4-events', () => ({
  trackSearch: vi.fn(),
  trackSignupCtaClick: vi.fn(),
}));

vi.mock('@/components/map/map-with-fallback', () => ({
  MapWithFallback: () => <div data-testid="map-with-fallback" />,
}));

vi.mock('@/components/seo/WebsiteJsonLd', () => ({
  WebsiteJsonLd: () => null,
}));

vi.mock('@/components/discovery/mode-chips', () => ({
  ModeChips: () => <div />,
}));

vi.mock('@/components/discovery/search-bar', () => ({
  SearchBar: () => <div />,
}));

vi.mock('@/components/discovery/sticky-search-bar', () => ({
  StickySearchBar: () => <div />,
}));

vi.mock('@/components/discovery/suggestion-chips', () => ({
  SuggestionChips: () => <div />,
}));

vi.mock('@/components/onboarding/preference-modal', () => ({
  PreferenceOnboardingModal: () => {
    if (!modalState.shouldPrompt) return null;
    return <div>what brings you here today</div>;
  },
}));

import { useUser } from '@/lib/hooks/use-user';
import { usePreferenceOnboarding } from '@/lib/hooks/use-preference-onboarding';
import { useShops } from '@/lib/hooks/use-shops';
import { useSearch } from '@/lib/hooks/use-search';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import HomePage from '../page';

const mockUseUser = vi.mocked(useUser);
const mockUsePreferenceOnboarding = vi.mocked(usePreferenceOnboarding);
const mockUseShops = vi.mocked(useShops);
const mockUseSearch = vi.mocked(useSearch);
const mockUseSearchState = vi.mocked(useSearchState);
const mockUseGeolocation = vi.mocked(useGeolocation);
const mockUseIsDesktop = vi.mocked(useIsDesktop);

function setupDefaultMocks() {
  modalState.shouldPrompt = false;
  mockUseUser.mockReturnValue({ user: null, isLoading: false });
  mockUsePreferenceOnboarding.mockReturnValue({
    shouldPrompt: false,
    preferredModes: null,
    preferredVibes: null,
    save: vi.fn(),
    dismiss: vi.fn(),
    isLoading: false,
    error: null,
  });
  mockUseShops.mockReturnValue({ shops: [], isLoading: false, error: null });
  mockUseSearch.mockReturnValue({
    results: [],
    isLoading: false,
    queryType: null,
    resultCount: 0,
    error: null,
  });
  mockUseSearchState.mockReturnValue({
    query: '',
    mode: null,
    filters: [],
    view: 'list',
    setQuery: vi.fn(),
    setMode: vi.fn(),
    toggleFilter: vi.fn(),
    setFilters: vi.fn(),
    setView: vi.fn(),
    clearAll: vi.fn(),
  });
  mockUseGeolocation.mockReturnValue({
    latitude: null,
    longitude: null,
    requestLocation: vi.fn(),
    error: null,
    loading: false,
  });
  mockUseIsDesktop.mockReturnValue(false);
}

describe('HomePage — PreferenceOnboardingModal integration', () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it('renders the preference onboarding modal when user is authenticated and shouldPrompt is true', () => {
    modalState.shouldPrompt = true;
    mockUseUser.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-123', email: 'coffee@lover.tw' } as any,
      isLoading: false,
    });
    mockUsePreferenceOnboarding.mockReturnValue({
      shouldPrompt: true,
      preferredModes: null,
      preferredVibes: null,
      save: vi.fn(),
      dismiss: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(<HomePage />);

    expect(screen.getByText('what brings you here today')).toBeInTheDocument();
  });

  it('does not render the preference onboarding modal when user is unauthenticated', () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false });

    render(<HomePage />);

    expect(
      screen.queryByText('what brings you here today')
    ).not.toBeInTheDocument();
  });

  it('does not render the preference onboarding modal when shouldPrompt is false even if authenticated', () => {
    mockUseUser.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-456', email: 'another@user.tw' } as any,
      isLoading: false,
    });
    mockUsePreferenceOnboarding.mockReturnValue({
      shouldPrompt: false,
      preferredModes: null,
      preferredVibes: null,
      save: vi.fn(),
      dismiss: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(<HomePage />);

    expect(
      screen.queryByText('what brings you here today')
    ).not.toBeInTheDocument();
  });
});
