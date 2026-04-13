"use client";

import { cn } from "@/lib/utils";
import { LaurelLeft } from "@/components/ui/icons/laurel-left";
import { LaurelRight } from "@/components/ui/icons/laurel-right";
import { Star } from "lucide-react";

interface RatingBadgeProps {
  rating: number | null;
  reviewCount: number | null;
  source?: string;
  className?: string;
}

export function RatingBadge({
  rating,
  reviewCount,
  source = "Google Maps",
  className,
}: RatingBadgeProps) {
  // Return null if no meaningful data to display
  if (rating === null || rating === undefined || !reviewCount || reviewCount === 0) {
    return null;
  }

  const displayRating = rating.toFixed(1);
  const filledStars = Math.round(rating);

  return (
    <div
      className={cn(
        "flex items-center gap-6 py-3",
        className
      )}
    >
      {/* Rating with laurels */}
      <div className="flex items-center gap-1">
        <LaurelLeft
          data-testid="laurel-left"
          className="h-10 w-5 text-text-meta"
        />
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-text-primary">
            {displayRating}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                data-testid="star-icon"
                data-filled={star <= filledStars}
                className={cn(
                  "h-3 w-3",
                  star <= filledStars
                    ? "fill-rating-star text-rating-star"
                    : "fill-text-meta text-text-meta"
                )}
              />
            ))}
          </div>
        </div>
        <LaurelRight
          data-testid="laurel-right"
          className="h-10 w-5 text-text-meta"
        />
      </div>

      {/* Attribution text */}
      <span className="text-sm text-text-secondary">
        {reviewCount} reviews on {source}
      </span>
    </div>
  );
}
