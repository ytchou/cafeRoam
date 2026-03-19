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

describe('a user interacting with the HeaderNav', () => {
  it('a user sees the 啡遊 CafeRoam brand logo in the header', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByText('啡遊 CafeRoam')).toBeInTheDocument();
  });

  it('a user sees all four main navigation destinations in the header', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('a user on the Find page sees the Find tab highlighted as active', () => {
    render(<HeaderNav activeTab="find" />);
    const findLink = screen.getByText('Find').closest('a');
    expect(findLink).toHaveAttribute('data-active', 'true');
  });

  it('a user sees a search button in the header to open search', () => {
    render(<HeaderNav activeTab="find" />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
