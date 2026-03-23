interface ClaimBannerProps {
  shopId: string;
  shopName: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ClaimBanner({ shopId: _shopId, shopName }: ClaimBannerProps) {
  return (
    <div className="border-border-warm bg-surface-warm border-t px-5 py-4">
      <p className="text-text-secondary text-sm">
        Is this your café?{' '}
        <a
          href={`mailto:hello@caferoam.tw?subject=${encodeURIComponent('Claim ' + shopName)}`}
          className="text-text-body font-medium underline underline-offset-2"
        >
          Claim this page →
        </a>
      </p>
    </div>
  );
}
