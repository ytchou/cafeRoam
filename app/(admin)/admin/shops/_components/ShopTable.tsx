'use client';

import { MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ADMIN_REJECTION_REASONS } from '@/lib/constants/rejection-reasons';
import { ConfirmDialog } from '../../_components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PAGE_SIZE, Shop, SOURCE_LABELS, STATUS_LABELS } from '../_constants';

const RETRYABLE_STATUSES_SET = new Set([
  'scraping',
  'enriching',
  'embedding',
  'publishing',
  'timed_out',
  'failed',
]);

function hasRowActions(status: string): boolean {
  return status === 'pending_review' || RETRYABLE_STATUSES_SET.has(status);
}

interface ShopTableProps {
  shops: Shop[];
  loading: boolean;
  offset: number;
  total: number;
  onPageChange: (newOffset: number) => void;
  getToken: () => Promise<string | null>;
  onRefresh: () => void;
  isReviewFilter?: boolean;
}

export function ShopTable({
  shops,
  loading,
  offset,
  total,
  onPageChange,
  getToken,
  onRefresh,
  isReviewFilter = false,
}: ShopTableProps) {
  const router = useRouter();
  const [selectedShopIds, setSelectedShopIds] = useState<Set<string>>(
    new Set()
  );
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    approveAll: boolean;
    overrideIds?: string[];
  } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [runningPipelineSelected, setRunningPipelineSelected] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('not_a_cafe');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectConfirmShopIds, setRejectConfirmShopIds] = useState<Set<string>>(
    new Set()
  );

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

  function handleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedShopIds(new Set());
    } else {
      setSelectedShopIds(new Set(shops.map((s) => s.id)));
    }
  }

  async function handleBulkApprove(
    approveAll: boolean,
    overrideIds?: string[]
  ) {
    setApprovingBulk(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const body = approveAll
        ? {}
        : { shop_ids: overrideIds ?? Array.from(selectedShopIds) };

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

  async function handleRetry(shopIds: string[]) {
    setRetrying(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/shops/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shop_ids: shopIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Retry failed');
        return;
      }
      const msg =
        data.skipped > 0
          ? `${data.reset} shop(s) reset to pending, ${data.skipped} skipped`
          : `${data.reset} shop(s) reset to pending`;
      toast.success(msg);
      setSelectedShopIds(new Set());
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setRetrying(false);
    }
  }

  function handleBulkRetry() {
    return handleRetry(Array.from(selectedShopIds));
  }

  async function handleRunPipelineForSelected() {
    setRunningPipelineSelected(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/pipeline/run-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shop_ids: Array.from(selectedShopIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to queue pipeline run');
        return;
      }
      toast.success(`Pipeline queued for ${selectedShopIds.size} shop(s)`);
      setSelectedShopIds(new Set());
    } catch {
      toast.error('Network error');
    } finally {
      setRunningPipelineSelected(false);
    }
  }

  async function handleBulkReject(shopIds: Set<string>, reason: string) {
    setBulkRejecting(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/shops/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shop_ids: Array.from(shopIds),
          rejection_reason: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Bulk reject failed');
        return;
      }
      toast.success(`${data.rejected} shop(s) rejected`);
      setSelectedShopIds(new Set());
      setShowRejectDialog(false);
      setRejectConfirmShopIds(new Set());
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setBulkRejecting(false);
    }
  }

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <>
      {isReviewFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <Button
            onClick={() => setBulkConfirm({ approveAll: true })}
            disabled={approvingBulk}
            variant="outline"
          >
            Approve All
          </Button>
        </div>
      )}

      {selectedShopIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm text-blue-800">
            {selectedShopIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkRetry}
            disabled={retrying}
          >
            Retry Selected
          </Button>
          <Button
            onClick={handleRunPipelineForSelected}
            disabled={runningPipelineSelected}
            variant="default"
            data-testid="run-pipeline-selected"
          >
            {runningPipelineSelected ? 'Queuing…' : 'Run Pipeline'}
          </Button>
        </div>
      )}

      <>
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b text-gray-500">
              <TableHead className="pr-2 pb-2">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={
                    shops.length > 0 && selectedShopIds.size === shops.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className="pb-2">Name</TableHead>
              <TableHead className="pb-2">Address</TableHead>
              <TableHead className="pb-2">Status</TableHead>
              <TableHead className="pb-2">Source</TableHead>
              <TableHead className="pb-2">Tags</TableHead>
              <TableHead className="pb-2">Embedding</TableHead>
              <TableHead className="pb-2">Enriched</TableHead>
              <TableHead className="w-10 pb-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shops.map((shop) => (
              <TableRow
                key={shop.id}
                tabIndex={0}
                onClick={() => router.push(`/admin/shops/${shop.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/admin/shops/${shop.id}`);
                  }
                }}
                className="cursor-pointer border-b hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
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
                <TableCell className="py-2">{shop.name}</TableCell>
                <TableCell className="py-2 text-gray-600">
                  {shop.address}
                </TableCell>
                <TableCell className="py-2">
                  {STATUS_LABELS[shop.processing_status] ??
                    shop.processing_status}
                </TableCell>
                <TableCell className="py-2 text-gray-500">
                  {SOURCE_LABELS[shop.source] ?? shop.source}
                </TableCell>
                <TableCell className="py-2 text-gray-500">
                  {shop.tag_count}
                </TableCell>
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
                <TableCell
                  className="w-10 px-2 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {hasRowActions(shop.processing_status) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {shop.processing_status === 'pending_review' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setBulkConfirm({
                                  approveAll: false,
                                  overrideIds: [shop.id],
                                });
                              }}
                            >
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRejectConfirmShopIds(new Set([shop.id]));
                                setShowRejectDialog(true);
                              }}
                            >
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {RETRYABLE_STATUSES_SET.has(shop.processing_status) && (
                          <DropdownMenuItem
                            onClick={() => handleRetry([shop.id])}
                          >
                            Retry
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && shops.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
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
            : `Approve ${bulkConfirm?.overrideIds?.length ?? selectedShopIds.size} selected shop(s)? This will queue scrape jobs for each.`
        }
        confirmLabel="Approve"
        loading={approvingBulk}
        onConfirm={async () => {
          if (bulkConfirm) {
            await handleBulkApprove(
              bulkConfirm.approveAll,
              bulkConfirm.overrideIds
            );
          }
        }}
      />
      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRejectDialog(false);
            setRejectConfirmShopIds(new Set());
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              Reject{' '}
              {rejectConfirmShopIds.size > 0
                ? rejectConfirmShopIds.size
                : selectedShopIds.size}{' '}
              shop(s)
            </DialogTitle>
            <DialogDescription>
              Select a rejection reason to apply to all selected shops.
            </DialogDescription>
          </DialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_REJECTION_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectConfirmShopIds(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const ids =
                  rejectConfirmShopIds.size > 0
                    ? rejectConfirmShopIds
                    : selectedShopIds;
                handleBulkReject(ids, rejectReason);
              }}
              disabled={bulkRejecting}
            >
              {bulkRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
