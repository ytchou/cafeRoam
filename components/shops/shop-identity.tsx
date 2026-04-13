import { RatingBadge } from './rating-badge';

interface ShopIdentityProps {
  name: string;
  rating?: number | null;
  reviewCount?: number | null;
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
      <h1 className="text-text-primary text-xl font-bold">{name}</h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <RatingBadge
          rating={rating ?? null}
          reviewCount={reviewCount ?? null}
        />
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
        {distance && <span className="text-text-meta text-xs">{distance}</span>}
      </div>

      {address && <p className="text-text-meta mt-1 text-xs">{address}</p>}
    </div>
  );
}
