import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import NotFoundPage from '../not-found';

describe('NotFoundPage', () => {
  it('tells the user the page was not found in Traditional Chinese', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('找不到頁面')).toBeInTheDocument();
  });

  it('shows a link back to home so the user can continue browsing cafés', () => {
    render(<NotFoundPage />);
    const link = screen.getByRole('link', { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
