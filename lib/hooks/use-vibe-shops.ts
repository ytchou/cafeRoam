'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import { buildVibeShopsUrl } from '@/lib/api/vibes';
import type { VibeShopsResponse } from '@/types/vibes';

interface VibeShopsFilter {
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
  districtIds?: string[] | null;
}

export function useVibeShops(
  slug: string | undefined,
  filter?: VibeShopsFilter
) {
  const key = slug ? buildVibeShopsUrl(slug, filter) : null;

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
