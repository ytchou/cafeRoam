'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClaimsTab } from './_components/ClaimsTab';
import {
  PipelineOverview,
  SubmissionsTab,
} from './_components/SubmissionsTab';
import { useAdminAuth } from './_hooks/use-admin-auth';

export default function AdminDashboard() {
  const { getToken } = useAdminAuth();
  const [data, setData] = useState<PipelineOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'submissions' | 'claims'>('submissions');

  const fetchOverview = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/pipeline/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || 'Failed to load overview');
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    async function load() {
      await fetchOverview();
    }
    void load();
  }, [fetchOverview]);

  if (loading) return <p>Loading...</p>;
  if (error)
    return (
      <p role="alert" className="text-red-600">
        {error}
      </p>
    );
  if (!data) return null;

  const statuses = ['pending', 'claimed', 'completed', 'failed', 'dead_letter'];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Pipeline Dashboard</h1>

      <div className="flex gap-4 border-b pb-2">
        <button
          type="button"
          onClick={() => setTab('submissions')}
          className={
            tab === 'submissions'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500'
          }
        >
          Submissions
        </button>
        <button
          type="button"
          onClick={() => setTab('claims')}
          className={
            tab === 'claims'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500'
          }
        >
          Claims
        </button>
      </div>

      {tab === 'submissions' && (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold">Job Queue</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {statuses.map((status) => (
                <div key={status} className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{status}</p>
                  <p className="text-2xl font-bold">
                    {data.job_counts[status] || 0}
                  </p>
                </div>
              ))}
            </div>
            {(data.job_counts.failed || 0) > 0 && (
              <Link
                href="/admin/jobs?status=failed"
                className="mt-2 inline-block text-sm text-red-600 hover:underline"
              >
                View {data.job_counts.failed} failed jobs
              </Link>
            )}
          </section>

          <SubmissionsTab data={data} getToken={getToken} onRefresh={fetchOverview} />
        </>
      )}

      {tab === 'claims' && <ClaimsTab getToken={getToken} />}
    </div>
  );
}
