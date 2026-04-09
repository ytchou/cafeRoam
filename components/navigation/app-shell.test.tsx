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

    // BottomNav renders Chinese tab labels (地圖 tab removed in DEV-281)
    expect(screen.getByText('首頁')).toBeInTheDocument();
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

  // Regression tests for DEV-236: root (/) is now the full-bleed map page
  it('on mobile root page (/), BottomNav is NOT rendered (map manages its own layout)', () => {
    mockUsePathname.mockReturnValue('/');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Map content</p>
      </AppShell>
    );

    // BottomNav should not be rendered — root is now the full-bleed map page
    expect(screen.queryByText('首頁')).not.toBeInTheDocument();
  });

  it('on root page (/), Footer is NOT rendered', () => {
    mockUsePathname.mockReturnValue('/');
    vi.mocked(useIsDesktop).mockReturnValue(false);

    render(
      <AppShell>
        <p>Map content</p>
      </AppShell>
    );

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});
