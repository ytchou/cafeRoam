interface ShopIdentityProps {
  name: string;
  rating?: number | null;
  reviewCount?: number;
  openNow?: boolean;
  distance?: string;
  address?: string;
}

export function ShopIdentity({
  name,
  rating,
  reviewCount,
  openNow,
  distance,
  address,
}: ShopIdentityProps) {
  return (
    <div className="px-5 py-3">
      <h1 className="text-xl font-bold text-[#1A1918]">{name}</h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {rating != null && (
          <div className="flex items-center gap-1">
            <span className="text-[#E06B3F] text-sm">★</span>
            <span className="text-sm font-medium text-[#1A1918]">{rating.toFixed(1)}</span>
            {reviewCount != null && (
              <span className="text-xs text-[#9E9893]">({reviewCount})</span>
            )}
          </div>
        )}
        {openNow != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              openNow
                ? 'bg-[#EAF3E8] text-[#2D5A27]'
                : 'bg-[#F5E8E8] text-[#8B2222]'
            }`}
          >
            {openNow ? 'Open' : 'Closed'}
          </span>
        )}
        {distance && (
          <span className="text-xs text-[#9E9893]">{distance}</span>
        )}
      </div>

      {address && (
        <p className="mt-1 text-xs text-[#9E9893]">{address}</p>
      )}
    </div>
  );
}
