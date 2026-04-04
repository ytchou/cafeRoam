import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDistricts, fetchDistrictShops } from './districts';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const MOCK_DISTRICTS = [
  {
    id: 'dist-1',
    slug: 'da-an',
    nameEn: 'Da-an',
    nameZh: '大安',
    descriptionEn: 'Lively cafes near NTU.',
    descriptionZh: '台大附近充滿活力的咖啡廳。',
    city: 'taipei',
    shopCount: 38,
    sortOrder: 1,
  },
];

const MOCK_DISTRICT_SHOPS = {
  district: MOCK_DISTRICTS[0],
  shops: [
    {
      shopId: 'shop-1',
      name: '森日咖啡',
      slug: 'senri',
      rating: 4.5,
      reviewCount: 80,
      coverPhotoUrl: null,
      address: '台北市大安區',
      mrt: '大安站',
      matchedTagLabels: ['quiet'],
    },
  ],
  totalCount: 1,
};

describe('fetchDistricts', () => {
  it('returns a list of districts from the backend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DISTRICTS,
    });

    const result = await fetchDistricts();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/explore/districts'),
      expect.objectContaining({ next: { revalidate: 300 } })
    );
    expect(result).toEqual(MOCK_DISTRICTS);
  });

  it('throws when the backend responds with an error status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(fetchDistricts()).rejects.toThrow('Failed to fetch districts');
  });
});

describe('fetchDistrictShops', () => {
  it('returns shops for a given district slug', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DISTRICT_SHOPS,
    });

    const result = await fetchDistrictShops('da-an');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/explore/districts/da-an/shops'),
      expect.objectContaining({ next: { revalidate: 300 } })
    );
    expect(result).toEqual(MOCK_DISTRICT_SHOPS);
  });

  it('appends the vibe query param when a vibe slug is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DISTRICT_SHOPS,
    });

    await fetchDistrictShops('da-an', 'study-cave');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('?vibe=study-cave'),
      expect.anything()
    );
  });

  it('returns null when the backend responds with 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await fetchDistrictShops('nonexistent-district');

    expect(result).toBeNull();
  });

  it('throws when the backend responds with a non-404 error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(fetchDistrictShops('da-an')).rejects.toThrow(
      'Failed to fetch district shops'
    );
  });
});
