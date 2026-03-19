import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { BottomNav } from './bottom-nav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders 4 tabs with Chinese labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('地圖')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('has pill-shaped container', () => {
    const { container } = render(<BottomNav />);
    const pill = container.querySelector('[data-testid="tab-bar-pill"]');
    expect(pill).toBeInTheDocument();
  });

  it('shows active state for current route', () => {
    render(<BottomNav />);
    const findTab = screen.getByText('地圖').closest('[data-tab]');
    expect(findTab).toHaveAttribute('data-active', 'true');
  });

  it('links to correct routes', () => {
    render(<BottomNav />);
    expect(screen.getByText('探索').closest('a')).toHaveAttribute('href', '/explore');
    expect(screen.getByText('收藏').closest('a')).toHaveAttribute('href', '/lists');
    expect(screen.getByText('我的').closest('a')).toHaveAttribute('href', '/profile');
  });
});
