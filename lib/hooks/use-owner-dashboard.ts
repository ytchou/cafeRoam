'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

interface DashboardStats {
  checkin_count_30d: number;
  follower_count: number;
  saves_count_30d: number;
  page_views_30d: number;
}

const fetcher = (url: string) => fetchWithAuth(url);

export function useOwnerDashboard(shopId: string) {
  const { data: stats, isLoading, error, mutate } = useSWR<DashboardStats>(
    shopId ? `/api/owner/${shopId}/dashboard` : null,
    fetcher,
  );
  return { stats, isLoading, error, mutate };
}
