'use client';

import useSWR from 'swr';
import { fetchPublic } from '@/lib/api/fetch';
import type { District } from '@/types/districts';

export function useDistricts() {
  const { data, error, isLoading } = useSWR<District[]>(
    '/api/explore/districts',
    fetchPublic,
    { revalidateOnFocus: false }
  );

  return {
    districts: data ?? [],
    isLoading,
    error,
  };
}
