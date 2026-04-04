'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '../../_components/ConfirmDialog';
import {
  PAGE_SIZE,
  Shop,
  SOURCE_LABELS,
  STATUS_LABELS,
} from '../_constants';

interface ShopTableProps {
  shops: Shop[];
  loading: boolean;
  offset: number;
  total: number;
  onPageChange: (newOffset: number) => void;
  getToken: () => Promise<string | null>;
  onRefresh: () => void;
  isReviewFilter: boolean;
}

export function ShopTable({
  shops,
  loading,
  offset,
  total,
  onPageChange,
  getToken,
  onRefresh,
  isReviewFilter,
}: ShopTableProps) {
  const router = useRouter();
  const [selectedShopIds, setSelectedShopIds] = useState<Set<string>>(
    new Set()
  );
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    approveAll: boolean;
  } | null>(null);

  useEffect(() => {
    setSelectedShopIds(new Set());
  }, [offset]);

  function toggleShopSelection(shopId: string) {
    setSelectedShopIds((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) {
        next.delete(shopId);
      } else {
        next.add(shopId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedShopIds.size === shops.length) {
      setSelectedShopIds(new Set());
    } else {
      setSelectedShopIds(new Set(shops.map((s) => s.id)));
    }
  }

  async function handleBulkApprove(approveAll: boolean) {
    setApprovingBulk(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const body = approveAll ? {} : { shop_ids: Array.from(selectedShopIds) };

      const res = await fetch('/api/admin/shops/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Bulk approve failed');
        return;
      }
      toast.success(
        `Approved ${data.approved} shops, queued ${data.queued} scrape jobs`
      );
      setSelectedShopIds(new Set());
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setApprovingBulk(false);
    }
  }

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <>
      {isReviewFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-sm text-amber-800">
            {selectedShopIds.size} selected
          </span>
          <Button
            onClick={() => setBulkConfirm({ approveAll: false })}
            disabled={approvingBulk || selectedShopIds.size === 0}
            variant="default"
          >
            Approve Selected
          </Button>
          <Button
            onClick={() => setBulkConfirm({ approveAll: true })}
            disabled={approvingBulk}
            variant="outline"
          >
            Approve All
          </Button>
        </div>
      )}

      <>
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b text-gray-500">
              {isReviewFilter && (
                <TableHead className="pr-2 pb-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={
                      shops.length > 0 &&
                      selectedShopIds.size === shops.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="pb-2">Name</TableHead>
              <TableHead className="pb-2">Address</TableHead>
              <TableHead className="pb-2">Status</TableHead>
              <TableHead className="pb-2">Source</TableHead>
              <TableHead className="pb-2">Tags</TableHead>
              <TableHead className="pb-2">Embedding</TableHead>
              <TableHead className="pb-2">Enriched</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shops.map((shop) => (
              <TableRow
                key={shop.id}
                onClick={() => router.push(`/admin/shops/${shop.id}`)}
                className="cursor-pointer border-b hover:bg-gray-50"
              >
                {isReviewFilter && (
                  <TableCell
                    className="py-2 pr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${shop.name}`}
                      checked={selectedShopIds.has(shop.id)}
                      onChange={() => toggleShopSelection(shop.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="py-2">{shop.name}</TableCell>
                <TableCell className="py-2 text-gray-600">{shop.address}</TableCell>
                <TableCell className="py-2">
                  {STATUS_LABELS[shop.processing_status] ??
                    shop.processing_status}
                </TableCell>
                <TableCell className="py-2 text-gray-500">
                  {SOURCE_LABELS[shop.source] ?? shop.source}
                </TableCell>
                <TableCell className="py-2 text-gray-500">{shop.tag_count}</TableCell>
                <TableCell className="py-2 text-gray-500">
                  {shop.has_embedding ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                      yes
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      no
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-gray-500">
                  {shop.enriched_at
                    ? new Date(shop.enriched_at).toLocaleDateString()
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
            {!loading && shops.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isReviewFilter ? 8 : 7}
                  className="py-8 text-center text-gray-400"
                >
                  No shops found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {total} shop{total !== 1 ? 's' : ''} total
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!hasPrev}
              onClick={() => onPageChange(offset - PAGE_SIZE)}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={!hasNext}
              onClick={() => onPageChange(offset + PAGE_SIZE)}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      </>

      <ConfirmDialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setBulkConfirm(null);
        }}
        title="Bulk approve shops?"
        description={
          bulkConfirm?.approveAll
            ? 'Approve ALL pending_review shops? This will queue scrape jobs for each.'
            : `Approve ${selectedShopIds.size} selected shop(s)? This will queue scrape jobs for each.`
        }
        confirmLabel="Approve"
        loading={approvingBulk}
        onConfirm={async () => {
          if (bulkConfirm) await handleBulkApprove(bulkConfirm.approveAll);
        }}
      />
    </>
  );
}
