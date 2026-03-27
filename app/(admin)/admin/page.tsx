'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_REJECTION_REASONS } from '@/lib/constants/rejection-reasons';

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
  const [claimRejectionReason, setClaimRejectionReason] = useState<string>('invalid_proof');
  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const fetchClaims = useCallback(async (token: string) => {
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const res = await fetch('/api/admin/claims?status=pending', {
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
    try {
      const res = await fetch(`/api/admin/pipeline/${action}/${submissionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || `Failed to ${action} submission`);
        return;
      }
      toast.success(`Submission ${action}d`);
      fetchOverview(tokenRef.current);
    } catch {
      toast.error('Network error');
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
          className={tab === 'submissions' ? 'font-semibold border-b-2 border-black' : 'text-gray-500'}
        >
          Submissions
        </button>
        <button
          type="button"
          onClick={() => { setTab('claims'); if (tokenRef.current) fetchClaims(tokenRef.current); }}
          className={tab === 'claims' ? 'font-semibold border-b-2 border-black' : 'text-gray-500'}
        >
          Claims
        </button>
      </div>

      {tab === 'submissions' && (<>
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
      </>)}

      {tab === 'claims' && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Pending Claims</h2>
          {claimsLoading ? (
            <p>Loading claims...</p>
          ) : claimsError ? (
            <p role="alert" className="text-red-600">{claimsError}</p>
          ) : claims.length === 0 ? (
            <p className="text-gray-500">No pending claims.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-2">Shop</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Role</th>
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
                      <div className="text-xs text-gray-500">{claim.contact_email}</div>
                    </td>
                    <td className="py-2">{claim.role}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/claims/${claim.id}/proof-url`, {
                                headers: { Authorization: `Bearer ${tokenRef.current}` },
                              });
                              if (res.ok) {
                                const { proofUrl } = await res.json();
                                window.open(proofUrl, '_blank');
                              }
                            }}
                            className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            View Proof
                          </button>
                          <button
                            type="button"
                            disabled={approvingClaimId === claim.id}
                            onClick={async () => {
                              if (approvingClaimId) return;
                              setApprovingClaimId(claim.id);
                              try {
                                const res = await fetch(`/api/admin/claims/${claim.id}/approve`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${tokenRef.current}` },
                                });
                                if (res.ok) {
                                  toast.success('Claim approved');
                                  if (tokenRef.current) fetchClaims(tokenRef.current);
                                } else {
                                  toast.error('Failed to approve');
                                }
                              } finally {
                                setApprovingClaimId(null);
                              }
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
                        </div>
                        {claimRejectingId === claim.id && (
                          <div className="flex items-center gap-2">
                            <select
                              value={claimRejectionReason}
                              onChange={(e) => setClaimRejectionReason(e.target.value)}
                              className="rounded border px-2 py-1 text-xs"
                            >
                              <option value="invalid_proof">Invalid proof</option>
                              <option value="not_an_owner">Not an owner</option>
                              <option value="duplicate_request">Duplicate request</option>
                              <option value="other">Other</option>
                            </select>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/claims/${claimRejectingId}/reject`, {
                                  method: 'POST',
                                  headers: {
                                    Authorization: `Bearer ${tokenRef.current}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ rejectionReason: claimRejectionReason }),
                                });
                                if (res.ok) {
                                  toast.success('Claim rejected');
                                  setClaimRejectingId(null);
                                  if (tokenRef.current) fetchClaims(tokenRef.current);
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
    </div>
  );
}
