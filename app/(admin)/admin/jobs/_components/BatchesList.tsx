'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminAuth } from '../../_hooks/use-admin-auth';
import { BatchDetail } from './BatchDetail';

interface BatchStatusCounts {
  [status: string]: number;
}

interface Batch {
  batch_id: string;
  created_at: string;
  shop_count: number;
  status_counts: BatchStatusCounts;
}

interface BatchesResponse {
  batches: Batch[];
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  scraping: 'bg-blue-100 text-blue-700',
  enriching: 'bg-purple-100 text-purple-700',
  embedding: 'bg-indigo-100 text-indigo-700',
  publishing: 'bg-cyan-100 text-cyan-700',
  live: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 20;

export function BatchesList() {
  const { getToken } = useAdminAuth();
  const [data, setData] = useState<BatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const fetchBatches = useCallback(
    async (authToken: string, currentPage: number) => {
      const params = new URLSearchParams({
        offset: String((currentPage - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/admin/pipeline/batches?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Failed to load batches');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setError(null);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    async function load() {
      const authToken = await getToken();
      if (!authToken) {
        setLoading(false);
        return;
      }
      setToken(authToken);
      fetchBatches(authToken, page);
    }
    load();
  }, [page, fetchBatches, getToken]);

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
    <div className="space-y-4">
      {data.batches.length === 0 ? (
        <p className="text-sm text-gray-500">
          No batch runs yet. Approve some shops to create a batch.
        </p>
      ) : (
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b text-gray-500">
              <TableHead className="pb-2">Date</TableHead>
              <TableHead className="pb-2">Shops</TableHead>
              <TableHead className="pb-2">Status Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.batches.map((batch) => (
              <Fragment key={batch.batch_id}>
                <TableRow
                  className="cursor-pointer border-b hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  tabIndex={0}
                  aria-expanded={expandedBatchId === batch.batch_id}
                  onClick={() =>
                    setExpandedBatchId(
                      expandedBatchId === batch.batch_id ? null : batch.batch_id
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedBatchId(
                        expandedBatchId === batch.batch_id
                          ? null
                          : batch.batch_id
                      );
                    }
                  }}
                >
                  <TableCell className="py-2 text-gray-500">
                    {new Date(batch.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2">{batch.shop_count}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(batch.status_counts).map(
                        ([status, count]) => (
                          <span
                            key={status}
                            className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {status}: {count}
                          </span>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedBatchId === batch.batch_id && token && (
                  <TableRow className="border-b bg-gray-50">
                    <TableCell colSpan={3} className="px-4 py-3">
                      <BatchDetail batchId={batch.batch_id} token={token} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}

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
    </div>
  );
}
