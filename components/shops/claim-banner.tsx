interface ClaimBannerProps {
  shopId: string;
  shopName: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ClaimBanner({ shopId: _shopId, shopName }: ClaimBannerProps) {
  return (
    <div className="border-t border-border-warm bg-surface-warm px-5 py-4">
      <p className="text-sm text-text-secondary">
        Is this your café?{' '}
        <a
          href={`mailto:hello@caferoam.tw?subject=${encodeURIComponent('Claim ' + shopName)}`}
          className="font-medium text-text-body underline underline-offset-2"
        >
          Claim this page →
        </a>
      </p>
    </div>
  );
}
