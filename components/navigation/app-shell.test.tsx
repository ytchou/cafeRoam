import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

const mockUsePathname = vi.fn(() => '/explore');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(),
}));

import { useIsDesktop } from '@/lib/hooks/use-media-query';

describe('AppShell', () => {
  it('on mobile, shows bottom tab bar but not desktop header', () => {
    mockUsePathname.mockReturnValue('/explore');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    // BottomNav renders Chinese tab labels
    expect(screen.getByText('地圖')).toBeInTheDocument();
    // HeaderNav desktop header should not appear
    expect(screen.queryByText('啡遊 CafeRoam')).not.toBeInTheDocument();
  });

  it('on desktop, shows header navigation but not mobile tab bar', () => {
    mockUsePathname.mockReturnValue('/explore');
    vi.mocked(useIsDesktop).mockReturnValue(true);

    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    // HeaderNav renders the logo text
    expect(screen.getByText('啡遊 CafeRoam')).toBeInTheDocument();
    // BottomNav Chinese tabs should not appear
    expect(screen.queryByText('地圖')).not.toBeInTheDocument();
  });

  // Regression tests for DEV-236: home page (/) must show nav/footer, /find must not
  it('on mobile home page (/), BottomNav is rendered', () => {
    mockUsePathname.mockReturnValue('/');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Home content</p>
      </AppShell>
    );

    // BottomNav renders the home tab label
    expect(screen.getByText('首頁')).toBeInTheDocument();
  });

  it('on mobile home page (/), Footer is rendered', () => {
    mockUsePathname.mockReturnValue('/');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Home content</p>
      </AppShell>
    );

    // Footer renders a copyright or brand mark — check via role or text
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('on desktop home page (/), HeaderNav is rendered', () => {
    mockUsePathname.mockReturnValue('/');
    vi.mocked(useIsDesktop).mockReturnValue(true);

    render(
      <AppShell>
        <p>Home content</p>
      </AppShell>
    );

    expect(screen.getByText('啡遊 CafeRoam')).toBeInTheDocument();
  });

  it('on mobile /find page, BottomNav is NOT rendered (map manages its own layout)', () => {
    mockUsePathname.mockReturnValue('/find');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Map content</p>
      </AppShell>
    );

    // BottomNav should not be rendered on the /find page
    expect(screen.queryByText('首頁')).not.toBeInTheDocument();
  });

  it('on /find page, Footer is NOT rendered', () => {
    mockUsePathname.mockReturnValue('/find');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Map content</p>
      </AppShell>
    );

    const footer = document.querySelector('footer');
    expect(footer).not.toBeInTheDocument();
  });
});
