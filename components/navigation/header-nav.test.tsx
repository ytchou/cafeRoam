import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderNav } from './header-nav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('HeaderNav', () => {
  it('renders logo with 啡遊 CafeRoam', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByText('啡遊 CafeRoam')).toBeInTheDocument();
  });

  it('renders 4 nav items', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('shows Find as active when activeTab is find', () => {
    render(<HeaderNav activeTab="find" />);
    const findLink = screen.getByText('Find').closest('a');
    expect(findLink).toHaveAttribute('data-active', 'true');
  });

  it('renders search button', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
