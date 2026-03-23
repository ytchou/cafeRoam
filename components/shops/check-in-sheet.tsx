'use client';

import { useState } from 'react';
import { PhotoUploader } from '@/components/checkins/photo-uploader';
import { StarRating } from '@/components/reviews/star-rating';
import { useCheckIn } from '@/lib/hooks/use-check-in';
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
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="border-border-warm flex items-center justify-between border-b px-4 py-3">
          <div>
            <DrawerTitle className="text-base font-semibold">
              Check In 打卡
            </DrawerTitle>
            <p className="text-text-meta mt-0.5 text-xs">{shopName}</p>
          </div>
          <button
            onClick={() => handleClose(false)}
            className="text-text-meta hover:text-text-body"
            aria-label="Close"
          >
            ✕
          </button>
        </DrawerHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label className="text-text-body text-sm font-medium">
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
            <label className="text-text-body text-sm font-medium">
              Rating{' '}
              <span className="text-text-meta text-xs font-normal">
                optional
              </span>
            </label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>

          <div>
            <label className="text-text-body text-sm font-medium">
              Review{' '}
              <span className="text-text-meta text-xs font-normal">
                optional
              </span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience here..."
              rows={3}
              className="bg-surface-section placeholder:text-text-placeholder mt-2 w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-text-body text-sm font-medium">
              How do you feel?{' '}
              <span className="text-text-meta text-xs font-normal">
                optional
              </span>
            </label>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="How are you feeling today? (optional)"
              className="bg-surface-section placeholder:text-text-placeholder mt-2 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="border-border-warm border-t px-4 py-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Check In 打卡"
            className="bg-brand flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Checking in...' : 'Check In 打卡'}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
