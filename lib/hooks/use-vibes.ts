'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import type { VibeCollection } from '@/types/vibes';

export function useVibes() {
  const { data, error, isLoading } = useSWR<VibeCollection[]>(
    '/api/explore/vibes',
    fetchPublic,
    { revalidateOnFocus: false }
  );

  return {
    vibes: data ?? [],
    isLoading,
    error,
  };
}
