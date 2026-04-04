'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '../_components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROLE_OPTIONS = [
  'blogger',
  'member',
  'partner',
  'admin',
  'shop_owner',
] as const;
type Role = (typeof ROLE_OPTIONS)[number];

interface RoleGrant {
  user_id: string;
  role: string;
  email: string;
  granted_at: string;
}

export default function RolesPage() {
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const tokenRef = useRef('');

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState<Role>('member');
  const [granting, setGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<RoleGrant | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchRoles = useCallback(async (role?: string) => {
    setLoading(true);
    setError(null);
    const url = role
      ? `/api/admin/roles?role=${encodeURIComponent(role)}`
      : '/api/admin/roles';
    const res = await fetch(url, {
      headers: tokenRef.current
        ? { Authorization: `Bearer ${tokenRef.current}` }
        : {},
    });
    if (res.ok) {
      setGrants(await res.json());
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? 'Failed to load roles');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (session) {
        tokenRef.current = session.access_token;
        fetchRoles(filterRole || undefined);
      }
    }
    load();
  }, [fetchRoles]);

  useEffect(() => {
    async function refetch() {
      await fetchRoles(filterRole || undefined);
    }
    if (tokenRef.current) refetch();
  }, [filterRole, fetchRoles]);

  async function handleGrant() {
    setGranting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenRef.current
            ? { Authorization: `Bearer ${tokenRef.current}` }
            : {}),
        },
        body: JSON.stringify({ user_id: grantEmail, role: grantRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail ?? 'Failed to grant role');
        return;
      }
      setGrantDialogOpen(false);
      setGrantEmail('');
      setGrantRole('member');
      fetchRoles(filterRole || undefined);
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/admin/roles/${revokeTarget.user_id}/${revokeTarget.role}`,
        {
          method: 'DELETE',
          headers: tokenRef.current
            ? { Authorization: `Bearer ${tokenRef.current}` }
            : {},
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail ?? 'Failed to revoke role');
        throw new Error(body.detail ?? 'Failed to revoke role');
      }
      setRevokeTarget(null);
      fetchRoles(filterRole || undefined);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
        <Button onClick={() => setGrantDialogOpen(true)}>Grant Role</Button>
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor="role-filter"
          className="text-sm font-medium text-gray-700"
        >
          Filter by role
        </label>
        <select
          id="role-filter"
          aria-label="Filter by role"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <TableRow>
                <TableHead className="px-4 py-3">User</TableHead>
                <TableHead className="px-4 py-3">Role</TableHead>
                <TableHead className="px-4 py-3">Granted</TableHead>
                <TableHead className="px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 bg-white">
              {grants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    No role grants found.
                  </TableCell>
                </TableRow>
              ) : (
                grants.map((grant) => (
                  <TableRow key={`${grant.user_id}-${grant.role}`}>
                    <TableCell className="px-4 py-3">{grant.email}</TableCell>
                    <TableCell className="px-4 py-3">{grant.role}</TableCell>
                    <TableCell className="px-4 py-3">
                      {new Date(grant.granted_at).toLocaleDateString('en-CA')}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeTarget(grant)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label
                htmlFor="grant-identifier"
                className="text-sm font-medium text-gray-700"
              >
                User ID or email
              </label>
              <input
                id="grant-identifier"
                aria-label="User ID or email"
                type="text"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                placeholder="user@example.com or UUID"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="grant-role"
                className="text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <select
                id="grant-role"
                aria-label="Role"
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value as Role)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGrant}
              disabled={granting || !grantEmail.trim()}
            >
              {granting ? 'Granting...' : 'Grant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke Role"
        description={
          revokeTarget
            ? `Remove the "${revokeTarget.role}" role from ${revokeTarget.email}?`
            : ''
        }
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
        loading={revoking}
      />
    </div>
  );
}
