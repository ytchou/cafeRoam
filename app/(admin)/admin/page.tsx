'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface PipelineOverview {
  job_counts: Record<string, number>;
  recent_submissions: Array<{
    id: string;
    google_maps_url: string;
    status: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<PipelineOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/pipeline/overview', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Failed to load overview');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

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

      <section>
        <h2 className="mb-4 text-lg font-semibold">Job Queue</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statuses.map((status) => (
            <div key={status} className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">{status}</p>
              <p className="text-2xl font-bold">{data.job_counts[status] || 0}</p>
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

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent Submissions</h2>
        {data.recent_submissions.length === 0 ? (
          <p className="text-gray-500">No submissions yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-2">URL</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_submissions.map((sub) => (
                <tr key={sub.id} className="border-b">
                  <td className="max-w-xs truncate py-2">{sub.google_maps_url}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        sub.status === 'live'
                          ? 'bg-green-100 text-green-700'
                          : sub.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
