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
      <h1 className="text-xl font-bold text-text-primary">{name}</h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {rating != null && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-brand">★</span>
            <span className="text-sm font-medium text-text-primary">
              {rating.toFixed(1)}
            </span>
            {reviewCount != null && (
              <span className="text-xs text-text-meta">({reviewCount})</span>
            )}
          </div>
        )}
        {openNow != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              openNow
                ? 'bg-status-open-bg text-status-open-text'
                : 'bg-status-closed-bg text-status-closed-text'
            }`}
          >
            {openNow ? 'Open' : 'Closed'}
          </span>
        )}
        {distance && <span className="text-xs text-text-meta">{distance}</span>}
      </div>

      {address && <p className="mt-1 text-xs text-text-meta">{address}</p>}
    </div>
  );
}
