'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

interface AnalyticsData {
  search_insights: Array<{ query: string; impressions: number }>;
  community_pulse: Array<{ tag: string; count: number }>;
  district_rankings: Array<{ attribute: string; rank: number; total_in_district: number }>;
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useOwnerAnalytics(shopId: string) {
  const { data, isLoading, error, mutate } = useSWR<AnalyticsData>(
    shopId ? `/api/owner/${shopId}/analytics` : null,
    fetcher,
  );
  return { data, isLoading, error, mutate };
}
