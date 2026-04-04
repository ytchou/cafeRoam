'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface ShopDetail {
  shop_id: string;
  name: string;
  processing_status: string;
  last_error: string | null;
  failed_at_stage: string | null;
}

interface BatchDetailResponse {
  batch_id: string;
  shops: ShopDetail[];
  total: number;
  status_summary: Record<string, number>;
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

const ALL_STATUSES = [
  'pending',
  'scraping',
  'enriching',
  'embedding',
  'publishing',
  'live',
  'failed',
];
const ALL_STATUSES_VALUE = 'all';

const PAGE_SIZE = 20;

export function BatchDetail({
  batchId,
  token,
}: {
  batchId: string;
  token: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function doFetch() {
      setLoading(true);
      const params = new URLSearchParams({
        offset: String((page - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      try {
        const res = await fetch(
          `/api/admin/pipeline/batches/${batchId}?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.detail || 'Failed to load batch detail');
        } else {
          setData(await res.json());
          setError(null);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('Failed to load batch detail');
        }
      } finally {
        setLoading(false);
      }
    }

    doFetch();
    return () => controller.abort();
  }, [batchId, token, debouncedSearch, statusFilter, page]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-3">
      {/* Status summary bar */}
      {data?.status_summary && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(data.status_summary).map(([st, count]) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(statusFilter === st ? '' : st);
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-xs ring-1 ring-transparent transition ${
                STATUS_COLORS[st] || 'bg-gray-100 text-gray-700'
              } ${statusFilter === st ? 'ring-current' : 'opacity-80 hover:opacity-100'}`}
            >
              {st}: {count}
            </button>
          ))}
        </div>
      )}

      {/* Search + filter controls */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search jobs"
          className="flex-1"
        />
        <Select
          value={statusFilter || ALL_STATUSES_VALUE}
          onValueChange={(value) => {
            setStatusFilter(
              value === ALL_STATUSES_VALUE ? '' : value
            );
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !data || data.shops.length === 0 ? (
        <p className="text-sm text-gray-500">
          No shops match the current filter.
        </p>
      ) : (
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="text-gray-500">
              <TableHead className="pb-1">Shop</TableHead>
              <TableHead className="pb-1">Status</TableHead>
              <TableHead className="pb-1">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.shops.map((shop) => (
              <TableRow
                key={shop.shop_id}
                tabIndex={0}
                className="cursor-pointer border-t hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => router.push(`/admin/shops/${shop.shop_id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/admin/shops/${shop.shop_id}`);
                  }
                }}
              >
                <TableCell className="py-1">{shop.name || shop.shop_id}</TableCell>
                <TableCell className="py-1">
                  <Badge variant={getStatusVariant(shop.processing_status)}>
                    {shop.processing_status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate py-1 text-xs text-red-600">
                  {shop.last_error
                    ? `[${shop.failed_at_stage}] ${shop.last_error.slice(0, 80)}${shop.last_error.length > 80 ? '…' : ''}`
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
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
