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
  it('When a user opens the app, they see four navigation tabs: 地圖, 探索, 收藏, 我的', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('When a user is on the home page, the 地圖 tab appears active', () => {
    render(<BottomNav />);
    const mapLink = screen.getByText('地圖').closest('a');
    expect(mapLink).toHaveAttribute('data-active', 'true');
  });

  it('When a user taps each tab, they are directed to the correct section of the app', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖').closest('a')).toHaveAttribute('href', '/');
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
});
