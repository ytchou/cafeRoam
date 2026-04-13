'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import {
  PipelineOverview,
  SubmissionsTab,
} from '../_components/SubmissionsTab';
import { useAdminAuth } from '../_hooks/use-admin-auth';

export default function SubmissionsPage() {
  const { getToken } = useAdminAuth();
  const [data, setData] = useState<PipelineOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token || cancelled) return;
      const res = await fetch('/api/admin/pipeline/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (!cancelled) {
          setError(body.detail || 'Failed to load overview');
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setData(await res.json());
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  if (loading) return <p>Loading...</p>;
  if (error)
    return (
      <p role="alert" className="text-red-600">
        {error}
      </p>
    );
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Submissions</h1>
      <SubmissionsTab
        data={data}
        getToken={getToken}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
