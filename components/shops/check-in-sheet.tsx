'use client';

import { useState } from 'react';
import { PhotoUploader } from '@/components/checkins/photo-uploader';
import { StarRating } from '@/components/reviews/star-rating';
import { uploadCheckInPhoto } from '@/lib/supabase/storage';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface CheckInSheetProps {
  shopId: string;
  shopName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type SubmitState = 'idle' | 'uploading' | 'submitting';

export function CheckInSheet({
  shopId,
  shopName,
  open,
  onOpenChange,
  onSuccess,
}: CheckInSheetProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [mood, setMood] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = photos.length > 0 && submitState === 'idle';

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      setSubmitState('uploading');
      const uploadedUrls = await Promise.all(
        photos.map((f) => uploadCheckInPhoto(f))
      );
      setSubmitState('submitting');
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
      setSubmitState('idle');
    }
  }

  const busy = submitState !== 'idle';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b border-[#E5E4E1]">
          <div>
            <DrawerTitle className="text-base font-semibold">Check In 打卡</DrawerTitle>
            <p className="text-xs text-[#9E9893] mt-0.5">{shopName}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#9E9893] hover:text-[#3B2F2A]"
            aria-label="Close"
          >
            ✕
          </button>
        </DrawerHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-[#3B2F2A]">
              Photos <span className="text-red-500">*</span>
            </label>
            <div className="mt-2">
              <PhotoUploader
                files={photos}
                onChange={setPhotos}
                maxPhotos={3}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#3B2F2A]">
              Rating <span className="text-xs text-[#9E9893] font-normal">optional</span>
            </label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#3B2F2A]">
              Review <span className="text-xs text-[#9E9893] font-normal">optional</span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience here..."
              rows={3}
              className="mt-2 w-full rounded-lg bg-[#F5F4F2] px-3 py-2 text-sm placeholder:text-[#C4C0BB] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#3B2F2A]">
              How do you feel? <span className="text-xs text-[#9E9893] font-normal">optional</span>
            </label>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="How are you feeling today? (optional)"
              className="mt-2 w-full rounded-lg bg-[#F5F4F2] px-3 py-2 text-sm placeholder:text-[#C4C0BB] focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 py-4 border-t border-[#E5E4E1]">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Check In 打卡"
            className="w-full rounded-full bg-[#2D5A27] py-3.5 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? 'Checking in...' : '📍 打卡 Check In'}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
