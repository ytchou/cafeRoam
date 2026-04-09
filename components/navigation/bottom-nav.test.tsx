import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
  it('a user sees the three main navigation tabs in Chinese', () => {
    render(<BottomNav />);
    expect(screen.getByText('首頁')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });

  it('a user sees the nav bar as a pill-shaped tab bar', () => {
    const { container } = render(<BottomNav />);
    const pill = container.querySelector('[data-testid="tab-bar-pill"]');
    expect(pill).toBeInTheDocument();
  });

  it('a user tapping a tab navigates to the correct section of the app', () => {
    render(<BottomNav />);
    expect(screen.getByText('探索').closest('a')).toHaveAttribute(
      'href',
      '/explore'
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
    expect(nav).not.toHaveClass('fixed');
    expect(nav).not.toHaveClass('z-40');
  });

  it('renders 3 navigation tabs in correct order without 地圖 or 収藏', () => {
    render(<BottomNav />);
    const tabs = screen.getAllByRole('link');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('首頁');
    expect(tabs[1]).toHaveTextContent('探索');
    expect(tabs[2]).toHaveTextContent('我的');
    expect(screen.queryByText('地圖')).not.toBeInTheDocument();
    expect(screen.queryByText('収藏')).not.toBeInTheDocument();
  });

  it('links to correct routes', () => {
    render(<BottomNav />);
    const tabs = screen.getAllByRole('link');
    expect(tabs[0]).toHaveAttribute('href', '/');
    expect(tabs[1]).toHaveAttribute('href', '/explore');
    expect(tabs[2]).toHaveAttribute('href', '/profile');
  });
});
