'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
          <select
            aria-label="Claim status"
            value={claimStatusFilter}
            onChange={(e) =>
              setClaimStatusFilter(e.target.value as typeof claimStatusFilter)
            }
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-2">Shop</th>
                <th className="pb-2">Contact</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id} className="border-b">
                  <td className="py-2">{claim.shops?.name ?? '—'}</td>
                  <td className="py-2">
                    <div>{claim.contact_name}</div>
                    <div className="text-xs text-gray-500">
                      {claim.contact_email}
                    </div>
                  </td>
                  <td className="py-2">{claim.role}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        claim.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : claim.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewProof(claim.id)}
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                        >
                          View Proof
                        </button>
                        {claim.status === 'pending' && (
                          <>
                            <button
                              type="button"
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
                              className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              {approvingClaimId === claim.id ? '…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setClaimRejectionReason('invalid_proof');
                                setClaimRejectingId(claim.id);
                              }}
                              className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                      {claimRejectingId === claim.id && (
                        <div className="flex items-center gap-2">
                          <select
                            value={claimRejectionReason}
                            onChange={(e) =>
                              setClaimRejectionReason(e.target.value)
                            }
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="invalid_proof">Invalid proof</option>
                            <option value="not_an_owner">Not an owner</option>
                            <option value="duplicate_request">
                              Duplicate request
                            </option>
                            <option value="other">Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleClaimReject}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setClaimRejectingId(null)}
                            className="text-xs text-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
