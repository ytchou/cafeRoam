import Link from 'next/link';

interface ClaimBannerProps {
  shopId: string;
  shopName: string;
  claimStatus: 'pending' | 'approved' | 'rejected' | null;
}

export function ClaimBanner({ shopId, claimStatus }: ClaimBannerProps) {
  if (claimStatus === 'approved') return null;

  if (claimStatus === 'pending') {
    return (
      <div className="border-border-warm bg-surface-warm border-t px-5 py-4">
        <p className="text-text-secondary text-sm">認領申請審核中，我們會在 48 小時內回覆。</p>
      </div>
    );
  }

  return (
    <div className="border-border-warm bg-surface-warm border-t px-5 py-4">
      <p className="text-text-secondary text-sm">
        Is this your cafe?{' '}
        <Link
          href={`/shops/${shopId}/claim`}
          className="text-text-body font-medium underline underline-offset-2"
        >
          Claim this page →
        </Link>
      </p>
    </div>
  );
}
