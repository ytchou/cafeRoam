'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

interface AnalyticsTermsStatus {
  accepted: boolean;
}

export function useOwnerAnalyticsTerms(shopId: string) {
  const [accepting, setAccepting] = useState(false);

  const { data, isLoading, mutate } = useSWR<AnalyticsTermsStatus>(
    shopId ? `/api/owner/${shopId}/analytics-terms` : null,
    fetchWithAuth
  );

  async function acceptTerms() {
    setAccepting(true);
    try {
      await fetchWithAuth(`/api/owner/${shopId}/analytics-terms`, {
        method: 'POST',
      });
      await mutate({ accepted: true }, false);
    } finally {
      setAccepting(false);
    }
  }

  return {
    accepted: data?.accepted ?? false,
    isLoading,
    accepting,
    acceptTerms,
  };
}
