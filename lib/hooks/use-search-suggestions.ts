'use client';

import { useEffect, useState } from 'react';
import type { SuggestTag } from '@/lib/types';

interface SearchSuggestions {
  completions: string[];
  tags: SuggestTag[];
  isLoading: boolean;
}

export function useSearchSuggestions(query: string): SearchSuggestions {
  const [completions, setCompletions] = useState<string[]>([]);
  const [tags, setTags] = useState<SuggestTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setCompletions([]);
      setTags([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setCompletions(data.completions ?? []);
          setTags(data.tags ?? []);
        }
      } catch (err) {
        // Ignore AbortError — a newer request superseded this one.
        if (err instanceof Error && err.name !== 'AbortError') {
          throw err;
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { completions, tags, isLoading };
}
