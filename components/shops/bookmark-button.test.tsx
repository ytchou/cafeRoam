import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// Mock useUserLists
const mockIsSaved = vi.fn();
vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({
    lists: [],
    isSaved: mockIsSaved,
    isInList: vi.fn(),
    saveShop: vi.fn(),
    removeShop: vi.fn(),
    createList: vi.fn(),
    deleteList: vi.fn(),
    renameList: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock supabase auth
const mockGetSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/shops/s1',
}));

import { BookmarkButton } from './bookmark-button';

describe('BookmarkButton', () => {
  it('renders filled icon when shop is saved', () => {
    mockIsSaved.mockReturnValue(true);
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    render(<BookmarkButton shopId="s1" />);
    const button = screen.getByRole('button', { name: /saved/i });
    expect(button).toBeInTheDocument();
  });

  it('renders empty icon when shop is not saved', () => {
    mockIsSaved.mockReturnValue(false);
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    render(<BookmarkButton shopId="s1" />);
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated user clicks', async () => {
    mockIsSaved.mockReturnValue(false);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<BookmarkButton shopId="s1" />);
    const button = screen.getByRole('button', { name: /save/i });
    await userEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/login')
    );
  });
});
