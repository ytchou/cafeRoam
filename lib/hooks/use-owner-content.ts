'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch';

interface OwnerStory {
  id: string;
  title: string | null;
  body: string;
  photo_url: string | null;
  is_published: boolean;
  updated_at: string;
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useOwnerContent(shopId: string) {
  const {
    data: story,
    isLoading,
    mutate,
  } = useSWR<OwnerStory | null>(
    shopId ? `/api/owner/${shopId}/story` : null,
    fetcher
  );
  const { data: tagsData, mutate: mutateTags } = useSWR<{ tags: string[] }>(
    shopId ? `/api/owner/${shopId}/tags` : null,
    fetcher
  );

  const saveStory = useCallback(
    async (data: Partial<OwnerStory>) => {
      const prev = story;
      mutate({ ...prev, ...data } as OwnerStory, false);
      try {
        await fetchWithAuth(`/api/owner/${shopId}/story`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        mutate();
      } catch (err) {
        mutate(prev, false);
        throw err;
      }
    },
    [shopId, story, mutate]
  );

  const saveTags = useCallback(
    async (tags: string[]) => {
      await fetchWithAuth(`/api/owner/${shopId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });
      mutateTags();
    },
    [shopId, mutateTags]
  );

  return {
    story: story ?? null,
    tags: tagsData?.tags ?? [],
    isLoading,
    saveStory,
    saveTags,
  };
}
