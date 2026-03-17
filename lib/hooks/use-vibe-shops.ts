'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import { buildVibeShopsUrl } from '@/lib/api/vibes';
import type { VibeShopsResponse } from '@/types/vibes';

export function useVibeShops(
  slug: string,
  lat: number | null = null,
  lng: number | null = null,
  radiusKm = 5
) {
  const key = buildVibeShopsUrl(slug, lat, lng, radiusKm);

  const { data, error, isLoading } = useSWR<VibeShopsResponse>(
    key,
    fetchPublic,
    { revalidateOnFocus: false }
  );

  return {
    response: data,
    isLoading,
    error,
  };
}
