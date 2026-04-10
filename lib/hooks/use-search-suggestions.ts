'use client';

import { useEffect, useState } from 'react';

interface SuggestTag {
  id: string;
  label: string;
}

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

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setCompletions(data.completions ?? []);
          setTags(data.tags ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { completions, tags, isLoading };
}
