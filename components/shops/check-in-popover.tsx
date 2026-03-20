'use client';

import { useState } from 'react';
import { PhotoUploader } from '@/components/checkins/photo-uploader';
import { StarRating } from '@/components/reviews/star-rating';
import { uploadCheckInPhoto } from '@/lib/supabase/storage';
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
  shopName: _shopName,
  open,
  onOpenChange,
  trigger,
  onSuccess,
}: CheckInPopoverProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [mood, setMood] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = photos.length > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      const uploadedUrls = await Promise.all(
        photos.map((f) => uploadCheckInPhoto(f))
      );
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          photoUrls: uploadedUrls,
          ...(rating > 0 && { stars: rating }),
          ...(reviewText.trim() && { reviewText: reviewText.trim() }),
          ...(mood.trim() && { moodNote: mood.trim() }),
        }),
      });
      if (!res.ok) throw new Error('Check-in failed');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-xl" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E4E1]">
          <h3 className="text-sm font-semibold text-[#3B2F2A]">Check In 打卡</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#9E9893] hover:text-[#3B2F2A] text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <PhotoUploader files={photos} onChange={setPhotos} maxPhotos={3} />
          <div>
            <p className="text-xs font-medium text-[#3B2F2A] mb-1">Rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write your review (optional)..."
            rows={2}
            className="w-full rounded-lg bg-[#F5F4F2] px-3 py-2 text-sm placeholder:text-[#C4C0BB] focus:outline-none resize-none"
          />
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="How are you feeling today? (optional)"
            className="w-full rounded-lg bg-[#F5F4F2] px-3 py-2 text-sm placeholder:text-[#C4C0BB] focus:outline-none"
          />
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Check In 打卡"
            className="w-full rounded-lg bg-[#1A1918] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Checking in...' : 'Check In 打卡'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
