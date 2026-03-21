'use client';

import { useState } from 'react';
import { uploadCheckInPhoto } from '@/lib/supabase/storage';

type SubmitStatus = 'idle' | 'uploading' | 'submitting';

interface CheckInPayload {
  photos: File[];
  rating: number;
  reviewText: string;
  mood: string;
}

export function useCheckIn(shopId: string) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: CheckInPayload): Promise<boolean> {
    if (payload.photos.length === 0 || submitStatus !== 'idle') return false;
    setError(null);
    try {
      setSubmitStatus('uploading');
      const uploadedUrls = await Promise.all(
        payload.photos.map((f) => uploadCheckInPhoto(f))
      );
      setSubmitStatus('submitting');
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          photoUrls: uploadedUrls,
          ...(payload.rating > 0 && { stars: payload.rating }),
          ...(payload.reviewText.trim() && {
            reviewText: payload.reviewText.trim(),
          }),
          ...(payload.mood.trim() && { moodNote: payload.mood.trim() }),
        }),
      });
      if (!res.ok) throw new Error('Check-in failed');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setSubmitStatus('idle');
    }
  }

  return { submitStatus, error, submit };
}
