import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderNavNew } from './header-nav-new';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('HeaderNavNew', () => {
  it('renders logo with 啡遊 CafeRoam', () => {
    render(<HeaderNavNew activeTab="find" />);
    expect(screen.getByText('啡遊 CafeRoam')).toBeInTheDocument();
  });

  it('renders 4 nav items', () => {
    render(<HeaderNavNew activeTab="find" />);
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('shows Find as active when activeTab is find', () => {
    render(<HeaderNavNew activeTab="find" />);
    const findLink = screen.getByText('Find').closest('a');
    expect(findLink).toHaveAttribute('data-active', 'true');
  });

  it('renders search button', () => {
    render(<HeaderNavNew activeTab="find" />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
