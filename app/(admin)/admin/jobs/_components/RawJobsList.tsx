'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStatusVariant } from '../../_lib/status-badge';
import { ConfirmDialog } from '../../_components/ConfirmDialog';
import { useAdminAuth } from '../../_hooks/use-admin-auth';
import { JobLogsPanel } from './JobLogsPanel';

interface Job {
  id: string;
  job_type: string;
  status: string;
  priority: number;
  attempts: number;
  created_at: string;
  last_error: string | null;
  payload: Record<string, unknown>;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
}

const STATUS_OPTIONS = [
  'all',
  'pending',
  'claimed',
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
] as const;

const JOB_TYPE_OPTIONS = [
  'all',
  'enrich_shop',
  'generate_embedding',
  'scrape_shop',
] as const;

const PAGE_SIZE = 20;

export function RawJobsList({ initialStatus }: { initialStatus?: string }) {
  const { getToken } = useAdminAuth();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && STATUS_OPTIONS.some((o) => o === initialStatus)
      ? initialStatus
      : 'all'
  );
  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel' | 'retry' | 'acknowledge';
    jobId: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (currentPage: number, status: string, jobType: string) => {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        offset: String((currentPage - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (status !== 'all') params.set('status', status);
      if (jobType !== 'all') params.set('job_type', jobType);

      const res = await fetch(`/api/admin/pipeline/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Failed to load jobs');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setError(null);
      setLoading(false);
    },
    [getToken]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchJobs(page, statusFilter, typeFilter);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [page, statusFilter, typeFilter, fetchJobs]);

  async function handleCancel(jobId: string, reason: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/pipeline/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to cancel job');
        return;
      }
      toast.success('Job cancelled');
      fetchJobs(page, statusFilter, typeFilter);
    } catch {
      toast.error('Network error');
    }
  }

  async function handleRetry(jobId: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/pipeline/retry/${jobId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to retry job');
        return;
      }
      toast.success('Job queued for retry');
      fetchJobs(page, statusFilter, typeFilter);
    } catch {
      toast.error('Network error');
    }
  }

  async function handleAcknowledge(jobId: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/pipeline/jobs/${jobId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to acknowledge job');
        return;
      }
      toast.success('Job acknowledged');
      fetchJobs(page, statusFilter, typeFilter);
    } catch {
      toast.error('Network error');
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error)
    return (
      <p role="alert" className="text-red-600">
        {error}
      </p>
    );
  if (!data) return null;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          Status:
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          Type:
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <Table className="w-full text-left text-sm">
        <TableHeader>
          <TableRow className="border-b text-gray-500">
            <TableHead className="pb-2">Type</TableHead>
            <TableHead className="pb-2">Status</TableHead>
            <TableHead className="pb-2">Priority</TableHead>
            <TableHead className="pb-2">Attempts</TableHead>
            <TableHead className="pb-2">Created</TableHead>
            <TableHead className="pb-2">Error</TableHead>
            <TableHead className="pb-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.jobs.map((job) => (
            <Fragment key={job.id}>
              <TableRow
                tabIndex={0}
                aria-expanded={expandedJobId === job.id}
                className="cursor-pointer border-b hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() =>
                  setExpandedJobId(expandedJobId === job.id ? null : job.id)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedJobId(expandedJobId === job.id ? null : job.id);
                  }
                }}
              >
                <TableCell className="py-2">{job.job_type}</TableCell>
                <TableCell className="py-2">
                  <Badge variant={getStatusVariant(job.status)}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">{job.priority}</TableCell>
                <TableCell className="py-2">{job.attempts}</TableCell>
                <TableCell className="py-2 text-gray-500">
                  {new Date(job.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-xs truncate py-2 text-gray-500">
                  {job.last_error
                    ? job.last_error.slice(0, 60) +
                      (job.last_error.length > 60 ? '...' : '')
                    : '-'}
                </TableCell>
                <TableCell className="py-2">
                  {(job.status === 'pending' || job.status === 'claimed') && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelReason('');
                        setConfirmAction({ type: 'cancel', jobId: job.id });
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      Force fail
                    </Button>
                  )}
                  {(job.status === 'failed' ||
                    job.status === 'dead_letter') && (
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({ type: 'retry', jobId: job.id });
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Retry
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                            type: 'acknowledge',
                            jobId: job.id,
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Acknowledge
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
              {expandedJobId === job.id && (
                <TableRow className="border-b bg-gray-50">
                  <TableCell colSpan={7} className="px-4 py-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">
                          Payload
                        </p>
                        <pre className="mt-1 overflow-auto rounded bg-white p-2 text-xs">
                          {JSON.stringify(job.payload, null, 2)}
                        </pre>
                      </div>
                      {job.last_error && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500">
                            Full Error
                          </p>
                          <pre className="mt-1 overflow-auto rounded bg-white p-2 text-xs text-red-600">
                            {job.last_error}
                          </pre>
                        </div>
                      )}
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-500">
                          Logs
                        </p>
                        <JobLogsPanel jobId={job.id} />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            setCancelReason('');
          }
        }}
        title={
          confirmAction?.type === 'cancel'
            ? 'Force fail job?'
            : confirmAction?.type === 'retry'
              ? 'Retry job?'
              : 'Acknowledge job?'
        }
        description={
          confirmAction?.type === 'cancel'
            ? 'This cannot be undone. The job will be cancelled.'
            : confirmAction?.type === 'retry'
              ? 'This will re-queue the failed job for processing.'
              : 'Mark as acknowledged. The job will remain in dead letter and will not be retried.'
        }
        confirmLabel={
          confirmAction?.type === 'cancel'
            ? 'Force fail'
            : confirmAction?.type === 'retry'
              ? 'Retry'
              : 'Acknowledge'
        }
        variant={confirmAction?.type === 'cancel' ? 'destructive' : 'default'}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'cancel')
            await handleCancel(confirmAction.jobId, cancelReason);
          else if (confirmAction.type === 'retry')
            await handleRetry(confirmAction.jobId);
          else await handleAcknowledge(confirmAction.jobId);
        }}
      >
        {confirmAction?.type === 'cancel' && (
          <textarea
            className="mt-2 w-full resize-none rounded border p-2 text-sm"
            rows={3}
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
