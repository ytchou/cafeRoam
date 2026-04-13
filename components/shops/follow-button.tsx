'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShopFollow } from '@/lib/hooks/use-shop-follow';

interface FollowButtonProps {
  shopId: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

export function FollowButton({
  shopId,
  isAuthenticated,
  onRequireAuth,
}: FollowButtonProps) {
  const { isFollowing, followerCount, showCount, isLoading, toggleFollow } =
    useShopFollow(shopId, isAuthenticated);

  function handleClick() {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    toggleFollow();
  }

  return (
    <Button
      variant="outline"
      loading={isLoading}
      onClick={handleClick}
      aria-label={isFollowing ? 'Unfollow this shop' : 'Follow this shop'}
      className="border-border-warm flex h-11 items-center justify-center gap-1.5 rounded-full border bg-white px-3"
    >
      <Heart
        data-following={isFollowing}
        className={`h-4 w-4 transition-transform duration-300 ${
          isFollowing
            ? 'scale-110 fill-red-500 text-red-500'
            : 'text-text-primary scale-100'
        }`}
      />
      {showCount && (
        <span className="text-text-secondary text-xs tabular-nums">
          {followerCount}
        </span>
      )}
    </Button>
  );
}
