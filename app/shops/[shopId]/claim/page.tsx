'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type ClaimRole = 'owner' | 'manager' | 'staff';

export default function ClaimPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClaimRole>('owner');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const isValid = name.trim() && email.trim() && proofFile;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !proofFile) return;
    setSubmitting(true);
    setError(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const urlRes = await fetch(`/api/claims/upload-url?shop_id=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, storagePath } = await urlRes.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: proofFile,
        headers: { 'Content-Type': proofFile.type },
      });

      const claimRes = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopId,
          contactName: name,
          contactEmail: email,
          role,
          proofPhotoPath: storagePath,
        }),
      });
      if (!claimRes.ok) {
        const body = await claimRes.json().catch(() => ({}));
        throw new Error(body.detail || '送出失敗，請稍後再試');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-md px-5 py-12">
        <h1 className="mb-4 text-2xl font-bold">已送出認領申請</h1>
        <p className="text-text-secondary">
          感謝您的申請！我們會在 48 小時內完成審核，並以您填寫的信箱通知您結果。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="mb-2 text-2xl font-bold">認領您的咖啡廳</h1>
      <p className="text-text-secondary mb-8 text-sm">
        填寫以下資訊，我們將在 48 小時內完成審核。
      </p>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label htmlFor="claim-name" className="mb-1 block text-sm font-medium">
            姓名 (Name)
          </label>
          <input
            id="claim-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-border-warm w-full rounded-lg border px-4 py-3 text-sm"
            placeholder="您的姓名"
          />
        </div>

        <div>
          <label htmlFor="claim-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="claim-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-border-warm w-full rounded-lg border px-4 py-3 text-sm"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="claim-role" className="mb-1 block text-sm font-medium">
            身份 (Role)
          </label>
          <select
            id="claim-role"
            value={role}
            onChange={(e) => setRole(e.target.value as ClaimRole)}
            className="border-border-warm w-full rounded-lg border px-4 py-3 text-sm"
          >
            <option value="owner">店主 (Owner)</option>
            <option value="manager">店長 (Manager)</option>
            <option value="staff">員工 (Staff)</option>
          </select>
        </div>

        <div>
          <label htmlFor="claim-proof" className="mb-1 block text-sm font-medium">
            證明照片 (Proof Photo)
          </label>
          <p className="text-text-secondary mb-2 text-xs">
            在店內拍的照片、名片、有店名的菜單、或 Google 商家截圖（最大 10MB）
          </p>
          <input
            id="claim-proof"
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            required
            className="w-full text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="bg-primary w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? '送出中…' : '送出認領申請 (Submit)'}
        </button>
      </form>
    </main>
  );
}
