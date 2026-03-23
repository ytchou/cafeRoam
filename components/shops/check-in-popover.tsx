'use client';

import { useState } from 'react';
import { PhotoUploader } from '@/components/checkins/photo-uploader';
import { StarRating } from '@/components/reviews/star-rating';
import { useCheckIn } from '@/lib/hooks/use-check-in';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CheckInPopoverProps {
  shopId: string;
  shopName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function CheckInPopover({
  shopId,
  shopName: _shopName, // eslint-disable-line @typescript-eslint/no-unused-vars
  open,
  onOpenChange,
  trigger,
  onSuccess,
}: CheckInPopoverProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [mood, setMood] = useState('');
  const { submitStatus, error, submit } = useCheckIn(shopId);

  const busy = submitStatus !== 'idle';
  const canSubmit = photos.length > 0 && !busy;

  function resetForm() {
    setPhotos([]);
    setRating(0);
    setReviewText('');
    setMood('');
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const success = await submit({ photos, rating, reviewText, mood });
    if (success) {
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleClose}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 overflow-hidden rounded-2xl p-0 shadow-xl"
        align="start"
      >
        <div className="border-border-warm flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-text-body text-sm font-semibold">
            Check In 打卡
          </h3>
          <button
            onClick={() => handleClose(false)}
            className="text-text-meta hover:text-text-body text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </div>
          )}
          <PhotoUploader files={photos} onChange={setPhotos} maxPhotos={3} />
          <div>
            <p className="text-text-body mb-1 text-xs font-medium">Rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write your review (optional)..."
            rows={2}
            className="bg-surface-section placeholder:text-text-placeholder w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="How are you feeling today? (optional)"
            className="bg-surface-section placeholder:text-text-placeholder w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Check In 打卡"
            className="bg-espresso w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Checking in...' : 'Check In 打卡'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
