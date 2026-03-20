import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/explore'),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(),
}));

import { useIsDesktop } from '@/lib/hooks/use-media-query';

describe('AppShell', () => {
  it('on mobile, shows bottom tab bar but not desktop header', () => {
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
});
