'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { getStatusVariant } from '../_lib/status-badge';
import { ConfirmDialog } from './ConfirmDialog';

interface Claim {
  id: string;
  shop_id: string;
  user_id: string;
  status: string;
  contact_name: string;
  contact_email: string;
  role: string;
  created_at: string;
  shops?: { name: string; address?: string };
}

interface ClaimsTabProps {
  getToken: () => Promise<string | null>;
}

export function ClaimsTab({ getToken }: ClaimsTabProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [claimRejectingId, setClaimRejectingId] = useState<string | null>(null);
  const [claimRejectionReason, setClaimRejectionReason] =
    useState<string>('invalid_proof');
  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);
  const [claimStatusFilter, setClaimStatusFilter] = useState<
    'pending' | 'approved' | 'rejected' | 'all'
  >('pending');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve_claim';
    id: string;
    label: string;
  } | null>(null);

  const fetchClaims = useCallback(
    async (
      statusFilter: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
    ) => {
      const token = await getToken();
      if (!token) return;
      setClaimsLoading(true);
      setClaimsError(null);
      try {
        const params = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
        const res = await fetch(`/api/admin/claims${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setClaims(await res.json());
        } else {
          const body = await res.json().catch(() => ({}));
          setClaimsError(body.detail || 'Failed to load claims');
        }
      } catch {
        setClaimsError('Network error loading claims');
      } finally {
        setClaimsLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    fetchClaims('pending');
  }, [fetchClaims]);

  useEffect(() => {
    fetchClaims(claimStatusFilter);
  }, [claimStatusFilter, fetchClaims]);

  async function executeApproveClaim(claimId: string) {
    const token = await getToken();
    if (!token) return;
    setApprovingClaimId(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Claim approved');
        fetchClaims(claimStatusFilter);
      } else {
        toast.error('Failed to approve');
      }
    } finally {
      setApprovingClaimId(null);
    }
  }

  async function handleClaimReject() {
    const token = await getToken();
    if (!token || !claimRejectingId) return;
    const res = await fetch(`/api/admin/claims/${claimRejectingId}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rejectionReason: claimRejectionReason,
      }),
    });
    if (res.ok) {
      toast.success('Claim rejected');
      setClaimRejectingId(null);
      fetchClaims(claimStatusFilter);
    } else {
      toast.error('Failed to reject');
    }
  }

  async function handleViewProof(claimId: string) {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/claims/${claimId}/proof-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const { proofUrl } = await res.json();
      window.open(proofUrl, '_blank');
    }
  }

  async function handleClaimApprove() {
    if (!confirmAction) return;
    await executeApproveClaim(confirmAction.id);
  }

  return (
    <>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Claims</h2>
          <Select
            value={claimStatusFilter}
            onValueChange={(value) =>
              setClaimStatusFilter(value as typeof claimStatusFilter)
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {claimsLoading ? (
          <p>Loading claims...</p>
        ) : claimsError ? (
          <p role="alert" className="text-red-600">
            {claimsError}
          </p>
        ) : claims.length === 0 ? (
          <p className="text-gray-500">No claims found.</p>
        ) : (
          <Table className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="border-b text-gray-500">
                <TableHead className="pb-2">Shop</TableHead>
                <TableHead className="pb-2">Contact</TableHead>
                <TableHead className="pb-2">Role</TableHead>
                <TableHead className="pb-2">Status</TableHead>
                <TableHead className="pb-2">Date</TableHead>
                <TableHead className="pb-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id} className="border-b">
                  <TableCell className="py-2">{claim.shops?.name ?? '—'}</TableCell>
                  <TableCell className="py-2">
                    <div>{claim.contact_name}</div>
                    <div className="text-xs text-gray-500">
                      {claim.contact_email}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">{claim.role}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getStatusVariant(claim.status)}>
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-gray-500">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleViewProof(claim.id)}
                          variant="secondary"
                          size="sm"
                        >
                          View Proof
                        </Button>
                        {claim.status === 'pending' && (
                          <>
                            <Button
                              disabled={approvingClaimId === claim.id}
                              onClick={() => {
                                if (approvingClaimId) return;
                                setConfirmAction({
                                  type: 'approve_claim',
                                  id: claim.id,
                                  label:
                                    claim.shops?.name ?? claim.contact_name,
                                });
                              }}
                              variant="default"
                              size="sm"
                            >
                              {approvingClaimId === claim.id ? '…' : 'Approve'}
                            </Button>
                            <Button
                              onClick={() => {
                                setClaimRejectionReason('invalid_proof');
                                setClaimRejectingId(claim.id);
                              }}
                              variant="destructive"
                              size="sm"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                      {claimRejectingId === claim.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={claimRejectionReason}
                            onValueChange={(value) =>
                              setClaimRejectionReason(value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs" aria-label="Rejection reason">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="invalid_proof">
                                Invalid proof
                              </SelectItem>
                              <SelectItem value="not_an_owner">
                                Not an owner
                              </SelectItem>
                              <SelectItem value="duplicate_request">
                                Duplicate request
                              </SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleClaimReject}
                            variant="destructive"
                            size="sm"
                          >
                            Confirm
                          </Button>
                          <Button
                            onClick={() => setClaimRejectingId(null)}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
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
        title="Approve claim?"
        description={`Approve claim for "${confirmAction?.label}"? This will grant shop_owner role.`}
        confirmLabel="Approve"
        onConfirm={handleClaimApprove}
      />
    </>
  );
}
