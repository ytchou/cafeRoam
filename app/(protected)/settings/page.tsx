'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Failed to request account deletion');
      }

      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-2xl font-bold">Settings (設定)</h1>

        <section className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Logout (登出)
          </button>
        </section>

        <hr className="border-gray-200" />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-600">
            Deleting your account starts a 30-day grace period. During this
            time, you can recover your account. After 30 days, all your data
            will be permanently removed.
          </p>

          {!showDeleteDialog ? (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full rounded-md border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50"
            >
              Delete Account (刪除帳號)
            </button>
          ) : (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Type <strong>DELETE</strong> to confirm account deletion:
              </p>
              <label htmlFor="confirm-delete" className="sr-only">
                Type DELETE to confirm
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-md border border-red-300 px-3 py-2 text-sm"
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setConfirmText('');
                    setError(null);
                  }}
                  className="flex-1 rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || loading}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
