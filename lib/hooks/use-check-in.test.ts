import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckIn } from './use-check-in';

vi.mock('@/lib/supabase/storage', () => ({
  uploadCheckInPhoto: vi.fn(),
}));

import { uploadCheckInPhoto } from '@/lib/supabase/storage';

const SHOP_ID = 'rufous-coffee-da-an';
const PHOTO = new File(['photo'], 'checkin.jpg', { type: 'image/jpeg' });

describe('useCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns idle status initially', () => {
    const { result } = renderHook(() => useCheckIn(SHOP_ID));
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('given a photo, when submit succeeds, returns true and clears error', async () => {
    vi.mocked(uploadCheckInPhoto).mockResolvedValue(
      'https://cdn.caferoam.tw/photo1.jpg'
    );
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useCheckIn(SHOP_ID));
    let success!: boolean;
    await act(async () => {
      success = await result.current.submit({
        photos: [PHOTO],
        rating: 4,
        reviewText: 'Great place to work',
        mood: 'focused',
      });
    });

    expect(success).toBe(true);
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('given no photos, submit returns false immediately without calling fetch', async () => {
    const { result } = renderHook(() => useCheckIn(SHOP_ID));
    let success!: boolean;
    await act(async () => {
      success = await result.current.submit({
        photos: [],
        rating: 0,
        reviewText: '',
        mood: '',
      });
    });

    expect(success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('when the API returns a non-ok response, sets error and returns false', async () => {
    vi.mocked(uploadCheckInPhoto).mockResolvedValue(
      'https://cdn.caferoam.tw/photo1.jpg'
    );
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useCheckIn(SHOP_ID));
    let success!: boolean;
    await act(async () => {
      success = await result.current.submit({
        photos: [PHOTO],
        rating: 0,
        reviewText: '',
        mood: '',
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Check-in failed');
    expect(result.current.submitStatus).toBe('idle');
  });
});
