'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SchedulerJob {
  id: string;
  next_run: string | null;
}

interface SchedulerStatus {
  status: string;
  registered_jobs: number;
  jobs: SchedulerJob[];
  last_poll_at: string | null;
}

export function SchedulerHealth() {
  const [data, setData] = useState<SchedulerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/pipeline/scheduler-health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Failed to load scheduler status');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            data.status === 'ok'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {data.status}
        </span>
        <span className="text-sm text-gray-600">
          {data.registered_jobs} jobs registered
        </span>
        <span className="text-sm text-gray-500">
          Last poll:{' '}
          {data.last_poll_at
            ? new Date(data.last_poll_at).toLocaleString()
            : 'never'}
        </span>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="pb-2">Job ID</th>
            <th className="pb-2">Next Run</th>
          </tr>
        </thead>
        <tbody>
          {data.jobs.map((job) => (
            <tr key={job.id} className="border-b">
              <td className="py-2 font-mono text-xs">{job.id}</td>
              <td className="py-2 text-gray-600">
                {job.next_run
                  ? new Date(job.next_run).toLocaleString()
                  : 'not scheduled'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
