'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getStatusVariant } from '../_lib/status-badge';
import { ConfirmDialog } from './ConfirmDialog';

interface Submission {
  id: string;
  google_maps_url: string;
  status: string;
  submitted_by: string | null;
  created_at: string;
}

export interface PipelineOverview {
  job_counts: Record<string, number>;
  recent_submissions: Submission[];
}

interface SubmissionsTabProps {
  data: PipelineOverview | null;
  getToken: () => Promise<string | null>;
  onRefresh: () => void;
}

export function SubmissionsTab({
  data,
  getToken,
  onRefresh,
}: SubmissionsTabProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('not_a_cafe');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve_submission';
    id: string;
    label: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] =
    useState<string>('not_a_cafe');
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);

  async function handleSubmissionAction(
    submissionId: string,
    action: 'approve' | 'reject'
  ) {
    const token = await getToken();
    if (!token) return;
    if (action === 'reject') {
      setRejectionReason('not_a_cafe');
      setRejectingId(submissionId);
      return;
    }
    setConfirmAction({
      type: 'approve_submission',
      id: submissionId,
      label: 'submission',
    });
  }

  async function executeApproveSubmission(submissionId: string) {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/pipeline/approve/${submissionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to approve submission');
        return;
      }
      toast.success('Submission approved');
      onRefresh();
    } catch {
      toast.error('Network error');
    }
  }

  async function confirmReject() {
    const token = await getToken();
    if (!token || !rejectingId) return;
    try {
      const res = await fetch(`/api/admin/pipeline/reject/${rejectingId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to reject submission');
        return;
      }
      toast.success('Submission rejected');
      setRejectingId(null);
      onRefresh();
    } catch {
      toast.error('Network error');
    }
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return;
    await executeApproveSubmission(confirmAction.id);
  }

  const actionableSubmissions = (data?.recent_submissions ?? []).filter((s) =>
    ['pending', 'processing', 'pending_review'].includes(s.status)
  );
  const isAllSelected =
    actionableSubmissions.length > 0 &&
    actionableSubmissions.every((s) => selectedIds.has(s.id));

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(actionableSubmissions.map((s) => s.id)) : new Set()
    );
  }

  async function handleBulkApproveSelected() {
    setBulkApproving(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/pipeline/approve-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submission_ids: Array.from(selectedIds) }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.detail || 'Bulk approve failed');
        return;
      }
      toast.success(`${resData.approved} submission(s) approved`);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setBulkApproving(false);
    }
  }

  async function handleBulkRejectSelected() {
    setBulkRejecting(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/pipeline/reject-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submission_ids: Array.from(selectedIds),
          rejection_reason: bulkRejectReason,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.detail || 'Bulk reject failed');
        return;
      }
      toast.success(`${resData.rejected} submission(s) rejected`);
      setSelectedIds(new Set());
      setShowBulkRejectDialog(false);
      onRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setBulkRejecting(false);
    }
  }

  return (
    <>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent Submissions</h2>
        {selectedIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded border-b border-amber-200 bg-amber-50 px-4 py-2">
            <span className="text-sm text-amber-800">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkApproveSelected}
              disabled={bulkApproving}
            >
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkRejectDialog(true)}
            >
              Reject Selected
            </Button>
          </div>
        )}
        {data?.recent_submissions.length === 0 ? (
          <p className="text-gray-500">No submissions yet.</p>
        ) : (
          <Table className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="border-b text-gray-500">
                <TableHead className="w-8 px-2">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="pb-2">URL</TableHead>
                <TableHead className="pb-2">Submitted By</TableHead>
                <TableHead className="pb-2">Status</TableHead>
                <TableHead className="pb-2">Date</TableHead>
                <TableHead className="pb-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recent_submissions.map((sub) => (
                <TableRow key={sub.id} className="border-b">
                  <TableCell
                    className="w-8 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['pending', 'processing', 'pending_review'].includes(
                      sub.status
                    ) && (
                      <Checkbox
                        checked={selectedIds.has(sub.id)}
                        onCheckedChange={() => toggleSelection(sub.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate py-2">
                    <Link href={sub.google_maps_url}>
                      {sub.google_maps_url}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2 text-gray-500">
                    {sub.submitted_by ?? '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getStatusVariant(sub.status)}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2">
                    {(sub.status === 'pending' ||
                      sub.status === 'processing' ||
                      sub.status === 'pending_review') && (
                      <div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleSubmissionAction(sub.id, 'approve')
                            }
                            variant="default"
                            size="sm"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() =>
                              handleSubmissionAction(sub.id, 'reject')
                            }
                            variant="destructive"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                        {rejectingId === sub.id && (
                          <div className="mt-2 flex items-center gap-2">
                            <Select
                              value={rejectionReason}
                              onValueChange={(value) =>
                                setRejectionReason(value)
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-xs"
                                aria-label="Rejection reason"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ADMIN_REJECTION_REASONS.map((r) => (
                                  <SelectItem
                                    key={r.value}
                                    value={r.value}
                                    className="text-xs"
                                  >
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={confirmReject}
                              variant="destructive"
                              size="sm"
                            >
                              Confirm
                            </Button>
                            <Button
                              onClick={() => setRejectingId(null)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title="Approve submission?"
        description="This will set the shop live and notify the submitter."
        confirmLabel="Approve"
        onConfirm={handleConfirmedAction}
      />
      {showBulkRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">
              Reject {selectedIds.size} submission(s)
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Select a rejection reason to apply to all selected submissions.
            </p>
            <Select
              value={bulkRejectReason}
              onValueChange={setBulkRejectReason}
            >
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
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkRejectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkRejectSelected}
                disabled={bulkRejecting}
              >
                {bulkRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
