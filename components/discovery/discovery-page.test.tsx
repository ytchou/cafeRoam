import { render, screen } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics/ga4-events', () => ({
  trackSearch: vi.fn(),
  trackSignupCtaClick: vi.fn(),
}));
vi.mock('@/lib/hooks/use-search', () => ({ useSearch: vi.fn() }));
vi.mock('@/lib/hooks/use-shops', () => ({ useShops: vi.fn() }));
vi.mock('@/lib/hooks/use-search-state', () => ({ useSearchState: vi.fn() }));
vi.mock('@/lib/hooks/use-user', () => ({ useUser: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/lib/hooks/use-search';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { useShops } from '@/lib/hooks/use-shops';
import { useUser } from '@/lib/hooks/use-user';
import { DiscoveryPage } from './discovery-page';

const renderDiscoveryPage = () =>
  render(
    <Suspense fallback={null}>
      <DiscoveryPage />
    </Suspense>
  );

describe('DiscoveryPage', () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue({
      query: '',
      mode: null,
      setQuery: vi.fn(),
      setMode: vi.fn(),
      filters: [],
      view: 'list',
      toggleFilter: vi.fn(),
      setFilters: vi.fn(),
      setView: vi.fn(),
      clearAll: vi.fn(),
    });

    vi.mocked(useSearch).mockReturnValue({
      results: [],
      queryType: null,
      resultCount: 0,
      isLoading: false,
      error: null,
    });

    vi.mocked(useShops).mockReturnValue({
      shops: [],
      isLoading: false,
      error: null,
    });

    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
    });

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    } as ReturnType<typeof useRouter>);

    vi.mocked(useSearchParams).mockReturnValue({
      get: () => null,
      toString: () => '',
    } as ReturnType<typeof useSearchParams>);

    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('renders brand mark 啡遊', () => {
    renderDiscoveryPage();
    expect(screen.getByText('啡遊')).toBeInTheDocument();
  });

  it('renders headline containing 找到你的 and 理想咖啡廳', () => {
    renderDiscoveryPage();
    expect(screen.getByText('找到你的')).toBeVisible();
    expect(screen.getByText('理想咖啡廳')).toBeVisible();
  });

  it('renders search input with correct placeholder', () => {
    renderDiscoveryPage();
    expect(
      screen.getByPlaceholderText('想找什麼樣的咖啡廳？')
    ).toBeInTheDocument();
  });

  it('renders suggestion chips', () => {
    renderDiscoveryPage();
    expect(screen.getByText('想找安靜可以工作的地方')).toBeInTheDocument();
  });

  it('renders mode chips for 工作 放鬆 社交', () => {
    renderDiscoveryPage();
    expect(screen.getByRole('button', { name: '工作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放鬆' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '社交' })).toBeInTheDocument();
  });

  it('renders 精選咖啡廳 section header when not searching', () => {
    vi.mocked(useSearchState).mockReturnValue({
      query: '',
      mode: null,
      setQuery: vi.fn(),
      setMode: vi.fn(),
      filters: [],
      view: 'list',
      toggleFilter: vi.fn(),
      setFilters: vi.fn(),
      setView: vi.fn(),
      clearAll: vi.fn(),
    });

    renderDiscoveryPage();
    expect(screen.getByText('精選咖啡廳')).toBeInTheDocument();
  });

  it('renders 地圖瀏覽 link pointing to /find', () => {
    renderDiscoveryPage();
    expect(screen.getByRole('link', { name: '地圖瀏覽' })).toHaveAttribute(
      'href',
      expect.stringContaining('/find')
    );
  });

  describe('free search gate (unauthenticated users)', () => {
    const searchState = (query: string) => ({
      query,
      mode: null as null,
      setQuery: vi.fn(),
      setMode: vi.fn(),
      filters: [] as string[],
      view: 'list' as const,
      toggleFilter: vi.fn(),
      setFilters: vi.fn(),
      setView: vi.fn(),
      clearAll: vi.fn(),
    });

    beforeEach(() => {
      localStorage.clear();
    });

    it('burns the free try when an anonymous user performs a semantic search', () => {
      vi.mocked(useSearchState).mockReturnValue(searchState('有插座可以工作的咖啡廳'));
      vi.mocked(useSearch).mockReturnValue({
        results: [],
        queryType: 'semantic',
        resultCount: 0,
        isLoading: false,
        error: null,
      });

      renderDiscoveryPage();
      expect(localStorage.getItem('caferoam_free_search_used')).toBe('true');
    });

    it('does not burn the free try when an anonymous user searches by shop name', () => {
      vi.mocked(useSearchState).mockReturnValue(searchState('木下庵'));
      vi.mocked(useSearch).mockReturnValue({
        results: [],
        queryType: 'name',
        resultCount: 0,
        isLoading: false,
        error: null,
      });

      renderDiscoveryPage();
      expect(localStorage.getItem('caferoam_free_search_used')).toBeNull();
    });

    it('redirects to login when free try is already used and user performs another semantic search', () => {
      localStorage.setItem('caferoam_free_search_used', 'true');
      const pushMock = vi.fn();
      vi.mocked(useRouter).mockReturnValue({
        push: pushMock,
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
      } as ReturnType<typeof useRouter>);
      vi.mocked(useSearchState).mockReturnValue(searchState('安靜有wifi的咖啡廳'));
      vi.mocked(useSearch).mockReturnValue({
        results: [],
        queryType: 'semantic',
        resultCount: 0,
        isLoading: false,
        error: null,
      });

      renderDiscoveryPage();
      expect(pushMock).toHaveBeenCalledWith('/login?returnTo=/');
    });

    it('does not redirect when free try is used but user searches by shop name', () => {
      localStorage.setItem('caferoam_free_search_used', 'true');
      const pushMock = vi.fn();
      vi.mocked(useRouter).mockReturnValue({
        push: pushMock,
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
      } as ReturnType<typeof useRouter>);
      vi.mocked(useSearchState).mockReturnValue(searchState('木下庵'));
      vi.mocked(useSearch).mockReturnValue({
        results: [],
        queryType: 'name',
        resultCount: 0,
        isLoading: false,
        error: null,
      });

      renderDiscoveryPage();
      expect(pushMock).not.toHaveBeenCalledWith('/login?returnTo=/');
    });

    it('does not gate when queryType is not yet known (search in flight)', () => {
      vi.mocked(useSearchState).mockReturnValue(searchState('有插座的咖啡廳'));
      vi.mocked(useSearch).mockReturnValue({
        results: [],
        queryType: null,
        resultCount: 0,
        isLoading: true,
        error: null,
      });

      renderDiscoveryPage();
      expect(localStorage.getItem('caferoam_free_search_used')).toBeNull();
    });
  });
});
