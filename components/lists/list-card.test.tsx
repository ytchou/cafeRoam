import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link to render as a regular anchor
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { ListCard } from './list-card';

describe('ListCard', () => {
  const defaultProps = {
    id: 'l1',
    name: 'Work spots',
    itemCount: 12,
    onRename: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders list name and shop count', () => {
    render(<ListCard {...defaultProps} />);
    expect(screen.getByText('Work spots')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('shows menu button for list actions', () => {
    render(<ListCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });
});
