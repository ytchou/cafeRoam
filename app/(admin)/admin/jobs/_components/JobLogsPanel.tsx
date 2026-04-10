'use client';

import { useEffect, useRef, useState } from 'react';

interface JobLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, unknown>;
  created_at: string;
}

interface Props {
  jobId: string;
  pollInterval?: number;
}

const TERMINAL_STATUSES = new Set([
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
]);

const levelClass: Record<JobLog['level'], string> = {
  info: 'text-gray-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

export function JobLogsPanel({ jobId, pollInterval = 3000 }: Props) {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const lastTsRef = useRef<string | null>(null);
  const terminalRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (terminalRef.current) return;

    const fetchLogs = async () => {
      if (terminalRef.current) return;
      const params = new URLSearchParams();
      if (lastTsRef.current) params.set('after_ts', lastTsRef.current);
      const qs = params.size ? `?${params}` : '';
      const url = `/api/admin/pipeline/jobs/${jobId}/logs${qs}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.logs?.length) {
          setLogs((prev) => [...prev, ...data.logs]);
          lastTsRef.current = data.logs[data.logs.length - 1].created_at;
        }
        if (TERMINAL_STATUSES.has(data.job_status)) {
          terminalRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // swallow — polling will retry
      }
    };

    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, pollInterval]);

  if (!logs.length) {
    return <p className="text-xs text-gray-500 px-2 py-1">No logs yet.</p>;
  }

  return (
    <div className="max-h-48 overflow-y-auto bg-gray-950 rounded p-2 font-mono text-xs space-y-0.5">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-2">
          <span className="text-gray-600 shrink-0">
            {new Date(log.created_at).toISOString().slice(11, 23)}
          </span>
          <span className={`shrink-0 w-8 ${levelClass[log.level]}`}>
            {log.level}
          </span>
          <span className="text-gray-200">{log.message}</span>
          {Object.keys(log.context).length > 0 && (
            <span className="text-gray-500 truncate">
              {JSON.stringify(log.context)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
