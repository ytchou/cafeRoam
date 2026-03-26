import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { FollowButton } from './follow-button';

// Mock at HTTP boundaries — never mock the internal useShopFollow hook.
// vi.hoisted() ensures refs are available inside the vi.mock() factory.
const { mockFetchPublic, mockFetchWithAuth } = vi.hoisted(() => ({
  mockFetchPublic: vi.fn(),
  mockFetchWithAuth: vi.fn(),
}));

vi.mock('@/lib/api/fetch', () => ({
  fetchPublic: mockFetchPublic,
  fetchWithAuth: mockFetchWithAuth,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: 'test-token-abc123' } } }),
    },
  }),
}));

function renderButton(props: Partial<React.ComponentProps<typeof FollowButton>> = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <FollowButton
        shopId="shop-d4e5f6"
        isAuthenticated={true}
        onRequireAuth={() => {}}
        {...props}
      />
    </SWRConfig>
  );
}

describe('Shop follow button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user, not following, below visibility threshold
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/count')) {
        return Promise.resolve({ count: 0, visible: false, isFollowing: false });
      }
      return Promise.resolve({ following: true, followerCount: 1, visible: false });
    });
    mockFetchPublic.mockResolvedValue({ count: 0, visible: false, isFollowing: null });
  });

  it('shows a follow button when the user has not yet followed this shop', async () => {
    renderButton({ isAuthenticated: true });
    const button = await waitFor(() =>
      screen.getByRole('button', { name: /follow this shop/i })
    );
    expect(button).toBeInTheDocument();
    expect(button.querySelector('[data-following="false"]')).toBeInTheDocument();
  });

  it('shows an unfollow button when the user already follows this shop', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/count')) {
        return Promise.resolve({ count: 15, visible: true, isFollowing: true });
      }
      return Promise.resolve({ following: false, followerCount: 14, visible: true });
    });
    renderButton({ isAuthenticated: true });
    const button = await waitFor(() =>
      screen.getByRole('button', { name: /unfollow this shop/i })
    );
    expect(button.querySelector('[data-following="true"]')).toBeInTheDocument();
  });

  it('an authenticated user clicking the button triggers a follow action', async () => {
    renderButton({ isAuthenticated: true });
    const button = await waitFor(() => {
      const btn = screen.getByRole('button', { name: /follow this shop/i });
      expect(btn).not.toBeDisabled();
      return btn;
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/shops/shop-d4e5f6/follow',
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('an unauthenticated user clicking the button is prompted to sign in instead of following', async () => {
    mockFetchPublic.mockResolvedValue({ count: 0, visible: false, isFollowing: null });
    const onRequireAuth = vi.fn();
    renderButton({ isAuthenticated: false, onRequireAuth });
    const button = await waitFor(() =>
      screen.getByRole('button', { name: /follow this shop/i })
    );
    fireEvent.click(button);
    expect(onRequireAuth).toHaveBeenCalledOnce();
  });

  it('displays the follower count once the shop reaches the visibility threshold', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes('/count')) {
        return Promise.resolve({ count: 42, visible: true, isFollowing: false });
      }
      return Promise.resolve({ following: true, followerCount: 43, visible: true });
    });
    renderButton({ isAuthenticated: true });
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('hides the follower count for shops with few followers', async () => {
    mockFetchPublic.mockResolvedValue({ count: 3, visible: false, isFollowing: null });
    renderButton({ isAuthenticated: false });
    await waitFor(() =>
      screen.getByRole('button', { name: /follow this shop/i })
    );
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});
