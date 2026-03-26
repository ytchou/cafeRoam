import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FollowButton } from './follow-button';

const mockToggleFollow = vi.fn();
let mockHookReturn = {
  isFollowing: false,
  followerCount: 0,
  showCount: false,
  isLoading: false,
  error: null,
  toggleFollow: mockToggleFollow,
};

vi.mock('@/lib/hooks/use-shop-follow', () => ({
  useShopFollow: () => mockHookReturn,
}));

describe('FollowButton', () => {
  beforeEach(() => {
    mockToggleFollow.mockClear();
    mockHookReturn = {
      isFollowing: false,
      followerCount: 0,
      showCount: false,
      isLoading: false,
      error: null,
      toggleFollow: mockToggleFollow,
    };
  });

  it('renders outline heart when not following', () => {
    render(
      <FollowButton shopId="shop-1" isAuthenticated={true} onRequireAuth={() => {}} />
    );
    const button = screen.getByRole('button', { name: /follow/i });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('[data-following="false"]')).toBeInTheDocument();
  });

  it('renders filled heart when following', () => {
    mockHookReturn = { ...mockHookReturn, isFollowing: true };
    render(
      <FollowButton shopId="shop-1" isAuthenticated={true} onRequireAuth={() => {}} />
    );
    const button = screen.getByRole('button', { name: /unfollow/i });
    expect(button.querySelector('[data-following="true"]')).toBeInTheDocument();
  });

  it('calls toggleFollow when authenticated user clicks', () => {
    render(
      <FollowButton shopId="shop-1" isAuthenticated={true} onRequireAuth={() => {}} />
    );
    fireEvent.click(screen.getByRole('button', { name: /follow/i }));
    expect(mockToggleFollow).toHaveBeenCalledOnce();
  });

  it('calls onRequireAuth instead of toggle when not authenticated', () => {
    const onRequireAuth = vi.fn();
    render(
      <FollowButton shopId="shop-1" isAuthenticated={false} onRequireAuth={onRequireAuth} />
    );
    fireEvent.click(screen.getByRole('button', { name: /follow/i }));
    expect(mockToggleFollow).not.toHaveBeenCalled();
    expect(onRequireAuth).toHaveBeenCalledOnce();
  });

  it('shows follower count when above threshold', () => {
    mockHookReturn = { ...mockHookReturn, followerCount: 42, showCount: true };
    render(
      <FollowButton shopId="shop-1" isAuthenticated={true} onRequireAuth={() => {}} />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('hides follower count when below threshold', () => {
    mockHookReturn = { ...mockHookReturn, followerCount: 3, showCount: false };
    render(
      <FollowButton shopId="shop-1" isAuthenticated={true} onRequireAuth={() => {}} />
    );
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});
