'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStatusVariant } from '../_lib/status-badge';
import { ConfirmDialog } from '../_components/ConfirmDialog';
import { useAdminAuth } from '../_hooks/use-admin-auth';

interface TagFrequency {
  tag_id: string;
  shop_count: number;
  avg_confidence: number;
  dimension: string;
}

interface LowConfidenceShop {
  id: string;
  name: string;
  max_confidence: number;
}

interface MissingEmbeddingShop {
  id: string;
  name: string;
  processing_status: string;
}

interface TaxonomyStats {
  total_shops: number;
  shops_with_tags: number;
  shops_with_embeddings: number;
  shops_missing_tags: number;
  shops_missing_embeddings: number;
  tag_frequency: TagFrequency[];
  low_confidence_shops: LowConfidenceShop[];
  missing_embeddings: MissingEmbeddingShop[];
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function confidenceColor(value: number): string {
  if (value < 0.3) return 'text-red-600';
  if (value < 0.4) return 'text-orange-500';
  return 'text-yellow-600';
}

type SortKey = keyof Pick<
  TagFrequency,
  'tag_id' | 'dimension' | 'shop_count' | 'avg_confidence'
>;
type SortDir = 'asc' | 'desc';

export default function TaxonomyPage() {
  const { getToken } = useAdminAuth();
  const [data, setData] = useState<TaxonomyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('shop_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [enqueuingIds, setEnqueuingIds] = useState<Set<string>>(new Set());
  const [confirmEnqueue, setConfirmEnqueue] = useState<{
    shopId: string;
    shopName: string;
    jobType: string;
    label: string;
  } | null>(null);
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/admin/taxonomy/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || 'Failed to load taxonomy stats');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    }
    load();
  }, [getToken]);

  async function handleEnqueue(shopId: string, jobType: string) {
    setEnqueuingIds((prev) => new Set(prev).add(shopId));
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/shops/${shopId}/enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ job_type: jobType }),
      });
      if (!res.ok) throw new Error('Failed to enqueue');
      toast.success(`Queued ${jobType.replace(/_/g, ' ')} job`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enqueue');
    } finally {
      setEnqueuingIds((prev) => {
        const next = new Set(prev);
        next.delete(shopId);
        return next;
      });
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

  const missingCoverage =
    data.shops_missing_tags + data.shops_missing_embeddings;

  const sortedTags = [...data.tag_frequency].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Taxonomy Coverage</h1>

      <section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Shops</p>
            <p className="text-2xl font-bold">{data.total_shops}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">With Tags</p>
            <p className="text-2xl font-bold">{data.shops_with_tags}</p>
            <p className="text-sm text-green-600">
              {pct(data.shops_with_tags, data.total_shops)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">With Embeddings</p>
            <p className="text-2xl font-bold">{data.shops_with_embeddings}</p>
            <p className="text-sm text-green-600">
              {pct(data.shops_with_embeddings, data.total_shops)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Missing Coverage</p>
            <p className="text-2xl font-bold">{missingCoverage}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Tag Frequency</h2>
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b text-gray-500">
              {(
                [
                  ['tag_id', 'Tag ID'],
                  ['dimension', 'Dimension'],
                  ['shop_count', 'Shop Count'],
                  ['avg_confidence', 'Avg Confidence'],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <TableHead
                  key={key}
                  aria-sort={
                    sortKey === key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  tabIndex={0}
                  className="cursor-pointer pb-2 select-none hover:text-gray-800 focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => handleSort(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(key);
                    }
                  }}
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-xs">
                      {sortDir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTags.map((tag) => (
              <TableRow key={tag.tag_id} className="border-b">
                <TableCell className="py-2">{tag.tag_id}</TableCell>
                <TableCell className="py-2 text-gray-500">{tag.dimension}</TableCell>
                <TableCell className="py-2">{tag.shop_count}</TableCell>
                <TableCell className="py-2">
                  {tag.avg_confidence?.toFixed(2) ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Low Confidence Shops</h2>
        {data.low_confidence_shops.length === 0 ? (
          <p className="text-gray-500">No low confidence shops.</p>
        ) : (
          <ul className="space-y-2">
            {data.low_confidence_shops.map((shop) => (
              <li
                key={shop.id}
                className="flex items-center justify-between rounded border px-4 py-2"
              >
                <span>{shop.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-sm ${confidenceColor(shop.max_confidence)}`}
                  >
                    {shop.max_confidence.toFixed(2)}
                  </span>
                  <Button
                    onClick={() =>
                      setConfirmEnqueue({
                        shopId: shop.id,
                        shopName: shop.name,
                        jobType: 'enrich_shop',
                        label: 'Re-enrich',
                      })
                    }
                    disabled={enqueuingIds.has(shop.id)}
                    variant="secondary"
                    size="sm"
                  >
                    {enqueuingIds.has(shop.id) ? 'Queued...' : 'Re-enrich'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Missing Embeddings</h2>
        {data.missing_embeddings.length === 0 ? (
          <p className="text-gray-500">All shops have embeddings.</p>
        ) : (
          <ul className="space-y-2">
            {data.missing_embeddings.map((shop) => (
              <li
                key={shop.id}
                className="flex items-center justify-between rounded border px-4 py-2"
              >
                <span>{shop.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(shop.processing_status)}>
                    {shop.processing_status}
                  </Badge>
                  <Button
                    onClick={() =>
                      setConfirmEnqueue({
                        shopId: shop.id,
                        shopName: shop.name,
                        jobType: 'generate_embedding',
                        label: 'Generate Embedding',
                      })
                    }
                    disabled={enqueuingIds.has(shop.id)}
                    variant="secondary"
                    size="sm"
                  >
                    {enqueuingIds.has(shop.id)
                      ? 'Queued...'
                      : 'Generate Embedding'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmEnqueue !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmEnqueue(null);
        }}
        title={`${confirmEnqueue?.label}?`}
        description={`Queue a ${confirmEnqueue?.label?.toLowerCase()} job for "${confirmEnqueue?.shopName}".`}
        confirmLabel={confirmEnqueue?.label ?? 'Confirm'}
        onConfirm={async () => {
          if (confirmEnqueue)
            await handleEnqueue(confirmEnqueue.shopId, confirmEnqueue.jobType);
        }}
      />
    </div>
  );
}
