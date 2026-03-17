import { describe, it, expect, vi } from 'vitest';
import { generateShareCard } from './share-card';
import type { TarotCardData } from '@/types/tarot';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['test'], { type: 'image/png' })),
  }),
}));

const mockCard: TarotCardData = {
  shopId: 's1',
  tarotTitle: "The Scholar's Refuge",
  flavorText: 'For those who seek quiet.',
  isOpenNow: true,
  distanceKm: 1.2,
  name: '森日咖啡',
  neighborhood: '台北市',
  coverPhotoUrl: null,
  rating: 4.5,
  reviewCount: 142,
  slug: 'sen-ri',
};

describe('generateShareCard', () => {
  it('returns a Blob', async () => {
    const result = await generateShareCard(mockCard);
    expect(result).toBeInstanceOf(Blob);
  });
});
