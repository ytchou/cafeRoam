interface ClaimBannerProps {
  shopId: string;
  shopName: string;
}

export function ClaimBanner({ shopId: _shopId, shopName }: ClaimBannerProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  return (
    <div className="border-t border-[#E5E4E1] bg-[#FAF7F2] px-5 py-4">
      <p className="text-sm text-[#6B6560]">
        Is this your café?{' '}
        <a
          href={`mailto:hello@caferoam.tw?subject=${encodeURIComponent('Claim ' + shopName)}`}
          className="font-medium text-[#3B2F2A] underline underline-offset-2"
        >
          Claim this page →
        </a>
      </p>
    </div>
  );
}
