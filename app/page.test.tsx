import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import HomePage from './page';
import { useSearchState } from '@/lib/hooks/use-search-state';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockUseSearch = vi.fn();
vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock('@/lib/analytics/ga4-events', () => ({
  trackSearch: vi.fn(),
  trackSignupCtaClick: vi.fn(),
}));

vi.mock('@/lib/hooks/use-search-state', () => ({
  useSearchState: vi.fn().mockReturnValue({
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
  }),
}));

vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi
    .fn()
    .mockReturnValue({ position: null, requestLocation: vi.fn() }),
}));

vi.mock('@/components/map/map-with-fallback', () => ({
  MapWithFallback: () => <div data-testid="map-with-fallback" />,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseUser = vi.fn();
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => mockUseUser(),
}));

function renderHome() {
  return render(
    <Suspense>
      <HomePage />
    </Suspense>
  );
}

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          target: document.createElement('div'),
        } as unknown as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('HomePage (unified)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
        constructor(_cb: IntersectionObserverCallback) {}
      },
    );
    mockUseUser.mockReturnValue({ user: null, isLoading: false });
    mockUseSearch.mockReturnValue({
      results: [],
      queryType: null,
      resultCount: 0,
      isLoading: false,
      error: null,
    });
    vi.mocked(useSearchState).mockReturnValue({
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
    mockPush.mockClear();
    localStorage.clear();
  });

  it('renders a search bar', () => {
    renderHome();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders mode chips', () => {
    renderHome();
    expect(screen.getAllByText(/工作|休息|社交|特色/).length).toBeGreaterThan(
      0
    );
  });

  it('renders the map/list area', () => {
    renderHome();
    expect(screen.getByTestId('map-with-fallback')).toBeInTheDocument();
  });

  describe('free search gate', () => {
    it('sets free search flag in localStorage when server responds with semantic queryType for unauth user', async () => {
      vi.mocked(useSearchState).mockReturnValue({
        query: '安靜的咖啡廳',
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
      mockUseSearch.mockReturnValue({
        results: [],
        queryType: 'semantic',
        resultCount: 0,
        isLoading: false,
        error: null,
      });
      expect(localStorage.getItem('caferoam_free_search_used')).toBeNull();
      renderHome();
      await waitFor(() => {
        expect(localStorage.getItem('caferoam_free_search_used')).toBe('true');
      });
    });

    it('does not set free search flag for keyword (non-semantic) searches', async () => {
      mockUseSearch.mockReturnValue({
        results: [],
        queryType: 'keyword',
        resultCount: 0,
        isLoading: false,
        error: null,
      });
      renderHome();
      const input = screen.getAllByRole('textbox')[0]!;
      fireEvent.change(input, { target: { value: '星巴克' } });
      fireEvent.submit(screen.getAllByRole('search')[0]!);
      await waitFor(() => {
        expect(localStorage.getItem('caferoam_free_search_used')).toBeNull();
      });
    });

    it('redirects to login when server responds with semantic queryType and free search already used', async () => {
      localStorage.setItem('caferoam_free_search_used', 'true');
      vi.mocked(useSearchState).mockReturnValue({
        query: '有插座的咖啡廳',
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
      mockUseSearch.mockReturnValue({
        results: [],
        queryType: 'semantic',
        resultCount: 0,
        isLoading: false,
        error: null,
      });
      renderHome();
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?returnTo=/');
      });
    });

    it('bypasses gate for authenticated users even when flag is set', async () => {
      mockUseUser.mockReturnValue({ user: { id: 'user-1' }, isLoading: false });
      localStorage.setItem('caferoam_free_search_used', 'true');
      mockUseSearch.mockReturnValue({
        results: [],
        queryType: 'semantic',
        resultCount: 0,
        isLoading: false,
        error: null,
      });
      renderHome();
      const input = screen.getAllByRole('textbox')[0]!;
      fireEvent.change(input, { target: { value: '有插座的咖啡廳' } });
      fireEvent.submit(screen.getAllByRole('search')[0]!);
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalledWith(
          expect.stringContaining('/login')
        );
      });
    });
  });

  describe('sticky search bar visibility', () => {
    it('hides the sticky search bar while the hero is in view', () => {
      const mocks: MockIntersectionObserver[] = [];
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: IntersectionObserverCallback) {
            const m = new MockIntersectionObserver(cb);
            mocks.push(m);
            return m as unknown as IntersectionObserver;
          }
        },
      );
      renderHome();
      const sticky = screen.getByTestId('sticky-search-bar-wrapper');
      expect(sticky.className).toMatch(/invisible/);
    });

    it('shows the sticky search bar once the hero leaves the viewport', () => {
      const mocks: MockIntersectionObserver[] = [];
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: IntersectionObserverCallback) {
            const m = new MockIntersectionObserver(cb);
            mocks.push(m);
            return m as unknown as IntersectionObserver;
          }
        },
      );
      renderHome();
      act(() => mocks[0]!.trigger(false));
      const sticky = screen.getByTestId('sticky-search-bar-wrapper');
      expect(sticky.className).not.toMatch(/invisible/);
    });
  });
});
