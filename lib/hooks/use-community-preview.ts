'use client';

import useSWR from 'swr';

import { fetchPublic } from '@/lib/api/fetch';
import type { CommunityNoteCard } from '@/types/community';

export function useCommunityPreview() {
  const { data, isLoading, error } = useSWR<CommunityNoteCard[]>(
    '/api/explore/community/preview',
    fetchPublic,
    { revalidateOnFocus: false },
  );

  return {
    notes: data ?? [],
    isLoading,
    error,
  };
}
