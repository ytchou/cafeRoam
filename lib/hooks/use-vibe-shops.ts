'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import { buildVibeShopsUrl } from '@/lib/api/vibes';
import type { VibeShopsResponse } from '@/types/vibes';

export function useVibeShops(
  slug: string | undefined,
  lat: number | null = null,
  lng: number | null = null,
  radiusKm = 5,
  geoLoading = false
) {
  const key =
    slug && !geoLoading ? buildVibeShopsUrl(slug, lat, lng, radiusKm) : null;

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
