'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import type { VibeCollection } from '@/types/vibes';

export function useVibes(key: string | null = '/api/explore/vibes') {
  const { data, error, isLoading } = useSWR<VibeCollection[]>(
    key,
    fetchPublic,
    { revalidateOnFocus: false }
  );

  return {
    vibes: data ?? [],
    isLoading,
    error,
  };
}
