// components/shops/claim-banner.tsx
interface ClaimBannerProps {
  shopId: string;
}

export function ClaimBanner({ shopId }: ClaimBannerProps) {
  return (
    <div className="px-5 py-4 bg-[#FAF7F2] border-t border-[#E5E4E1]">
      <p className="text-sm text-[#6B6560]">
        Is this your café?{' '}
        <a
          href={`mailto:hello@caferoam.tw?subject=Claim+${shopId}`}
          className="font-medium text-[#3B2F2A] underline underline-offset-2"
        >
          Claim this page →
        </a>
      </p>
    </div>
  );
}
