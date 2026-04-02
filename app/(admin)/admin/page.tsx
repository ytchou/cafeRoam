'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_REJECTION_REASONS } from '@/lib/constants/rejection-reasons';
import { ConfirmDialog } from './_components/ConfirmDialog';

interface Submission {
  id: string;
  google_maps_url: string;
  status: string;
  submitted_by: string | null;
  created_at: string;
}

interface PipelineOverview {
  job_counts: Record<string, number>;
  recent_submissions: Submission[];
}

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

export default function AdminDashboard() {
  const [data, setData] = useState<PipelineOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'submissions' | 'claims'>('submissions');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('not_a_cafe');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [claimRejectingId, setClaimRejectingId] = useState<string | null>(null);
  const [claimRejectionReason, setClaimRejectionReason] =
    useState<string>('invalid_proof');
  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);
  const [claimStatusFilter, setClaimStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve_submission' | 'approve_claim';
    id: string;
    label: string;
  } | null>(null);
  const tokenRef = useRef<string | null>(null);

  const fetchClaims = useCallback(async (token: string, statusFilter: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') => {
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
  }, []);

  const fetchOverview = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/pipeline/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || 'Failed to load overview');
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      tokenRef.current = session.access_token;
      fetchOverview(session.access_token);
    }
    load();
  }, [fetchOverview]);

  useEffect(() => {
    if (tab === 'claims' && tokenRef.current) {
      fetchClaims(tokenRef.current, claimStatusFilter);
    }
  }, [claimStatusFilter, fetchClaims, tab]);

  async function handleSubmissionAction(
    submissionId: string,
    action: 'approve' | 'reject'
  ) {
    if (!tokenRef.current) return;
    if (action === 'reject') {
      setRejectionReason('not_a_cafe');
      setRejectingId(submissionId);
      return;
    }
    setConfirmAction({ type: 'approve_submission', id: submissionId, label: 'submission' });
  }

  async function executeApproveSubmission(submissionId: string) {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(`/api/admin/pipeline/approve/${submissionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to approve submission');
        return;
      }
      toast.success('Submission approved');
      fetchOverview(tokenRef.current);
    } catch {
      toast.error('Network error');
    }
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve_submission') {
      await executeApproveSubmission(confirmAction.id);
    } else if (confirmAction.type === 'approve_claim') {
      await executeApproveClaim(confirmAction.id);
    }
  }

  async function executeApproveClaim(claimId: string) {
    if (!tokenRef.current) return;
    setApprovingClaimId(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.ok) {
        toast.success('Claim approved');
        if (tokenRef.current) fetchClaims(tokenRef.current, claimStatusFilter);
      } else {
        toast.error('Failed to approve');
      }
    } finally {
      setApprovingClaimId(null);
    }
  }

  async function confirmReject() {
    if (!tokenRef.current || !rejectingId) return;
    try {
      const res = await fetch(`/api/admin/pipeline/reject/${rejectingId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
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
      fetchOverview(tokenRef.current);
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

  const statuses = ['pending', 'claimed', 'completed', 'failed', 'dead_letter'];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Pipeline Dashboard</h1>

      <div className="flex gap-4 border-b pb-2">
        <button
          type="button"
          onClick={() => setTab('submissions')}
          className={
            tab === 'submissions'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500'
          }
        >
          Submissions
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('claims');
            if (tokenRef.current) fetchClaims(tokenRef.current, claimStatusFilter);
          }}
          className={
            tab === 'claims'
              ? 'border-b-2 border-black font-semibold'
              : 'text-gray-500'
          }
        >
          Claims
        </button>
      </div>

      {tab === 'submissions' && (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold">Job Queue</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {statuses.map((status) => (
                <div key={status} className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{status}</p>
                  <p className="text-2xl font-bold">
                    {data.job_counts[status] || 0}
                  </p>
                </div>
              ))}
            </div>
            {(data.job_counts.failed || 0) > 0 && (
              <Link
                href="/admin/jobs?status=failed"
                className="mt-2 inline-block text-sm text-red-600 hover:underline"
              >
                View {data.job_counts.failed} failed jobs
              </Link>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Recent Submissions</h2>
            {data.recent_submissions.length === 0 ? (
              <p className="text-gray-500">No submissions yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2">URL</th>
                    <th className="pb-2">Submitted By</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_submissions.map((sub) => (
                    <tr key={sub.id} className="border-b">
                      <td className="max-w-xs truncate py-2">
                        {sub.google_maps_url}
                      </td>
                      <td className="py-2 text-gray-500">
                        {sub.submitted_by ?? '—'}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            sub.status === 'live'
                              ? 'bg-green-100 text-green-700'
                              : sub.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : sub.status === 'pending_review'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {(sub.status === 'pending' ||
                          sub.status === 'processing' ||
                          sub.status === 'pending_review') && (
                          <div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSubmissionAction(sub.id, 'approve')
                                }
                                className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSubmissionAction(sub.id, 'reject')
                                }
                                className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </div>
                            {rejectingId === sub.id && (
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  value={rejectionReason}
                                  onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                  }
                                  className="rounded border px-2 py-1 text-xs"
                                >
                                  {ADMIN_REJECTION_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                      {r.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={confirmReject}
                                  className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingId(null)}
                                  className="text-xs text-gray-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {tab === 'claims' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Claims</h2>
            <select
              aria-label="Claim status"
              value={claimStatusFilter}
              onChange={(e) => setClaimStatusFilter(e.target.value as typeof claimStatusFilter)}
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
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>{claim.status}</span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(
                                `/api/admin/claims/${claim.id}/proof-url`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${tokenRef.current}`,
                                  },
                                }
                              );
                              if (res.ok) {
                                const { proofUrl } = await res.json();
                                window.open(proofUrl, '_blank');
                              }
                            }}
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
                                    label: claim.shops?.name ?? claim.contact_name,
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
                              <option value="invalid_proof">
                                Invalid proof
                              </option>
                              <option value="not_an_owner">Not an owner</option>
                              <option value="duplicate_request">
                                Duplicate request
                              </option>
                              <option value="other">Other</option>
                            </select>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/admin/claims/${claimRejectingId}/reject`,
                                  {
                                    method: 'POST',
                                    headers: {
                                      Authorization: `Bearer ${tokenRef.current}`,
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      rejectionReason: claimRejectionReason,
                                    }),
                                  }
                                );
                                if (res.ok) {
                                  toast.success('Claim rejected');
                                  setClaimRejectingId(null);
                                  if (tokenRef.current)
                                    fetchClaims(tokenRef.current, claimStatusFilter);
                                } else {
                                  toast.error('Failed to reject');
                                }
                              }}
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
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.type === 'approve_submission' ? 'Approve submission?' : 'Approve claim?'}
        description={
          confirmAction?.type === 'approve_submission'
            ? 'This will set the shop live and notify the submitter.'
            : `Approve claim for "${confirmAction?.label}"? This will grant shop_owner role.`
        }
        confirmLabel="Approve"
        onConfirm={handleConfirmedAction}
      />
    </div>
  );
}
