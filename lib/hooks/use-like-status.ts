'use client';

import { useEffect, useState } from 'react';

import { fetchWithAuth } from '@/lib/api/fetch';

export function useLikeStatus(checkinIds: string[]) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(checkinIds.length > 0);

  const key = checkinIds.join(',');

  useEffect(() => {
    if (checkinIds.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all(
      checkinIds.map((id) =>
        fetchWithAuth(`/api/explore/community/${id}/like`)
          .then((data: { liked: boolean }) => ({ id, liked: data.liked }))
          .catch(() => ({ id, liked: false }))
      )
    ).then((results) => {
      setLikedIds(new Set(results.filter((r) => r.liked).map((r) => r.id)));
      setIsLoading(false);
    });
    // key is a stable join of the IDs — intentional dep instead of array ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { likedIds, isLoading };
}
