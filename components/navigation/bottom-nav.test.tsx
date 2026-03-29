import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { BottomNav } from './bottom-nav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('a user interacting with the BottomNav', () => {
  it('a user sees the four main navigation tabs in Chinese', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('a user sees the nav bar as a pill-shaped tab bar', () => {
    const { container } = render(<BottomNav />);
    const pill = container.querySelector('[data-testid="tab-bar-pill"]');
    expect(pill).toBeInTheDocument();
  });

  it('a user on the map page sees the map tab highlighted as active', () => {
    render(<BottomNav />);
    const findTab = screen.getByText('地圖').closest('[data-tab]');
    expect(findTab).toHaveAttribute('data-active', 'true');
  });

  it('a user tapping a tab navigates to the correct section of the app', () => {
    render(<BottomNav />);
    expect(screen.getByText('探索').closest('a')).toHaveAttribute(
      'href',
      '/explore'
    );
    expect(screen.getByText('收藏').closest('a')).toHaveAttribute(
      'href',
      '/lists'
    );
    expect(screen.getByText('我的').closest('a')).toHaveAttribute(
      'href',
      '/profile'
    );
  });

  it('when embedded in a layout, the nav renders as a static element without fixed positioning', () => {
    const { container } = render(<BottomNav embedded />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav!.className).not.toContain('fixed');
    expect(nav!.className).not.toContain('z-40');
    expect(nav!.style.paddingBottom).toBe('');
  });
});
