'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import { getRecentlySeenIds } from '@/lib/tarot/recently-seen';
import type { TarotCardData } from '@/types/tarot';

export function useTarotDraw(lat: number | null, lng: number | null) {
  const excludedIds = getRecentlySeenIds();
  const key =
    lat != null && lng != null
      ? `/api/explore/tarot-draw?lat=${lat}&lng=${lng}&radius_km=3&excluded_ids=${excludedIds.join(',')}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<TarotCardData[]>(
    key,
    fetchPublic,
    { revalidateOnFocus: false }
  );

  return {
    cards: data ?? [],
    isLoading,
    error,
    redraw: mutate,
  };
}
