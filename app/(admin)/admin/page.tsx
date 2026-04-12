'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from './_hooks/use-admin-auth';

interface OverviewStats {
  pendingSubmissions: number;
  pendingClaims: number;
  todaySpendUsd: number;
}

export default function AdminDashboard() {
  const { getToken } = useAdminAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [overviewRes, spendRes] = await Promise.all([
        fetch('/api/admin/pipeline/overview', { headers }),
        fetch('/api/admin/pipeline/spend', { headers }),
      ]);

      if (!overviewRes.ok || !spendRes.ok) {
        setError('Failed to load dashboard stats');
        setLoading(false);
        return;
      }

      const overview = await overviewRes.json();
      const spend = await spendRes.json();

      setStats({
        pendingSubmissions: overview.pending_review_count ?? 0,
        pendingClaims: overview.pending_claims_count ?? 0,
        todaySpendUsd: spend.today_total_usd ?? 0,
      });
    } catch {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p role="alert" className="text-red-600">{error}</p>;
  if (!stats) return null;

  const cards = [
    {
      label: 'Submissions',
      value: `${stats.pendingSubmissions} pending`,
      href: '/admin/submissions',
    },
    {
      label: 'Claims',
      value: `${stats.pendingClaims} pending`,
      href: '/admin/claims',
    },
    {
      label: 'Spend',
      value: `$${stats.todaySpendUsd.toFixed(2)} today`,
      href: '/admin/spend',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border p-4 hover:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
