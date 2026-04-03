'use client';

import Link from 'next/link';

interface AnalyticsTermsBannerProps {
  onAccept: () => void;
  accepting: boolean;
}

export function AnalyticsTermsBanner({
  onAccept,
  accepting,
}: AnalyticsTermsBannerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Analytics data usage terms"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-surface-card w-full max-w-md rounded-xl p-6 shadow-lg">
        <h2 className="text-text-body text-base font-semibold">
          Analytics Data Usage Terms
        </h2>
        <p className="text-text-meta mt-3 text-sm leading-relaxed">
          Analytics data is aggregate and anonymized. By accessing this
          dashboard, you agree to CafeRoam&apos;s{' '}
          <Link
            href="/owner/data-terms"
            target="_blank"
            className="text-blue-600 underline"
          >
            Data Usage Terms
          </Link>
          . You may not attempt to re-identify individual users or redistribute
          this data.
        </p>
        <button
          onClick={onAccept}
          disabled={accepting}
          className="bg-brand focus-visible:ring-offset-brand mt-5 w-full rounded-full py-3 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {accepting ? 'Processing...' : 'I understand'}
        </button>
      </div>
    </div>
  );
}
