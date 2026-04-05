'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import {
  getRecentlySeenIds,
  clearRecentlySeen,
} from '@/lib/tarot/recently-seen';
import type { TarotCardData } from '@/types/tarot';

export function useTarotDraw(
  lat: number | null,
  lng: number | null,
  districtIds?: string[] | null
) {
  const [radiusKm, setRadiusKm] = useState(3);
  const [excludedIds, setExcludedIds] = useState<string[]>(() =>
    getRecentlySeenIds()
  );

  const key = (() => {
    const excludedParam = excludedIds.join(',');
    if (lat != null && lng != null) {
      return `/api/explore/tarot-draw?lat=${lat}&lng=${lng}&radius_km=${radiusKm}&excluded_ids=${excludedParam}`;
    }
    if (districtIds && districtIds.length > 0) {
      return `/api/explore/tarot-draw?district_ids=${districtIds
        .slice()
        .sort()
        .join(',')}&radius_km=${radiusKm}&excluded_ids=${excludedParam}`;
    }
    return null;
  })();

  const { data, error, isLoading } = useSWR<TarotCardData[]>(key, fetchPublic, {
    revalidateOnFocus: false,
  });

  // Auto-clear seen list when all nearby shops have been exhausted.
  // The cascading render (clear → new key → refetch) is intentional here.
  useEffect(() => {
    if (data && data.length === 0 && excludedIds.length > 0) {
      clearRecentlySeen();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExcludedIds([]);
    }
  }, [data, excludedIds.length]);

  const redraw = useCallback(() => {
    setExcludedIds(getRecentlySeenIds());
  }, []);

  return {
    cards: data ?? [],
    isLoading,
    error,
    redraw,
    radiusKm,
    setRadiusKm,
  };
}
