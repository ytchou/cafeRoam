'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch';
import { REJECTION_REASONS } from '@/lib/constants/rejection-reasons';

interface Submission {
  id: string;
  google_maps_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const MAPS_URL_PATTERN =
  /^https?:\/\/(www\.)?(google\.(com|com\.tw)\/maps|maps\.google\.(com|com\.tw)|goo\.gl\/maps|maps\.app\.goo\.gl)/;

const STATUS_LABELS: Record<string, string> = {
  pending: '處理中',
  processing: '處理中',
  pending_review: '審核中',
  live: '已上線',
  rejected: '未通過',
  failed: '處理失敗',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusColor(status: string): string {
  if (status === 'live') return 'bg-green-100 text-green-700';
  if (status === 'rejected' || status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}

export default function SubmitPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/api/submissions');
      setSubmissions(data as Submission[]);
    } catch {
      // Silently fail — history is non-critical
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!MAPS_URL_PATTERN.test(url)) {
      setError('請輸入有效的 Google Maps 連結');
      return;
    }

    setSubmitting(true);
    try {
      await fetchWithAuth('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({ google_maps_url: url }),
      });
      setSuccess(true);
      setUrl('');
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface-warm min-h-screen px-4 py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-xl font-bold">推薦咖啡廳</h1>
        <p className="mb-6 text-sm text-gray-500">
          貼上 Google Maps 連結，我們會將它加入 CafeRoam。
        </p>

        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="貼上 Google Maps 連結"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-terracotta-400 focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">
              感謝推薦！我們正在處理中。
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !url}
            className="bg-terracotta-500 hover:bg-terracotta-600 w-full rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? '送出中…' : '送出'}
          </button>
        </form>

        {submissions.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">我的推薦紀錄</h2>
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-gray-100 bg-white p-4"
                >
                  <p className="mb-1 max-w-full truncate text-sm text-gray-700">
                    {sub.google_maps_url}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${statusColor(sub.status)}`}
                    >
                      {statusLabel(sub.status)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(sub.created_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  {sub.status === 'rejected' && sub.rejection_reason && (
                    <p className="mt-1 text-xs text-red-500">
                      {REJECTION_REASONS[sub.rejection_reason] ?? sub.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
