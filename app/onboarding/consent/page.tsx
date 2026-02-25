'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { safeReturnTo } from '@/lib/utils';

const DISCLOSURE_ITEMS = [
  { label: '帳號資訊', detail: '（Email 或社群帳號 ID）' },
  { label: '打卡記錄與照片', detail: '（您在各家咖啡廳的打卡內容）' },
  { label: '您建立的咖啡廳清單', detail: '' },
];

const PURPOSE_ITEMS = [
  '提供個人化的咖啡廳推薦體驗',
  '運作 CafeRoam 的核心功能（打卡、集章、清單）',
  '商家資訊的數據充實（菜單照片可能被用於商家資料更新）',
];

const RIGHTS_ITEMS = [
  '隨時查看、修改或刪除您的個人資料',
  '撤回同意並申請刪除帳號',
];

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
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

      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? 'Failed to record consent');
      }

      await supabase.auth.refreshSession();
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">
        {'PDPA 個人資料說明'}
      </h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        {'CafeRoam 在提供服務過程中，會處理以下個人資料：'}
      </p>

      <section className="mt-6 w-full space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">
          {'我們收集的資料'}
        </h2>

        <ul className="list-disc space-y-2 pl-5 text-sm">
          {DISCLOSURE_ITEMS.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              {item.detail}
            </li>
          ))}
        </ul>

        <h2 className="text-lg font-semibold">{'使用目的'}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {PURPOSE_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="text-lg font-semibold">{'資料保存期限'}</h2>
        <p className="text-sm">
          {'您的資料將在帳號存續期間保存。當您申請刪除帳號時，所有個人資料將在 30 天內完全刪除。'}
        </p>

        <h2 className="text-lg font-semibold">{'您的權利'}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {RIGHTS_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>
            {'詳細資訊請參閱 '}
            <Link href="/privacy" className="text-blue-600 underline">
              {'隱私權政策'}
            </Link>
          </li>
        </ul>
      </section>

      <div className="mt-6 flex w-full items-start gap-3">
        <input
          type="checkbox"
          id="consent-checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <label htmlFor="consent-checkbox" className="text-sm">
          {'我已閱讀並同意上述說明'}
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={!agreed || submitting}
        className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? '處理中...' : '確認並繼續'}
      </button>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
