import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomNav } from './bottom-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('BottomNav', () => {
  it('renders four navigation tabs with new labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('highlights 地圖 tab when pathname is /', () => {
    render(<BottomNav />);
    const mapLink = screen.getByText('地圖').closest('a');
    expect(mapLink).toHaveAttribute('data-active', 'true');
  });

  it('tab links navigate to correct routes', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('探索').closest('a')).toHaveAttribute('href', '/explore');
    expect(screen.getByText('收藏').closest('a')).toHaveAttribute('href', '/lists');
    expect(screen.getByText('我的').closest('a')).toHaveAttribute('href', '/profile');
  });
});
