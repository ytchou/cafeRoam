import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation before any imports that use it
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// Mock the API boundary
vi.mock('@/lib/api/districts', () => ({
  fetchDistrictShops: vi.fn(),
}));

// Mock DistrictJsonLd — it's an SEO side-effect, not user-visible content
vi.mock('@/components/seo/DistrictJsonLd', () => ({
  DistrictJsonLd: () => null,
}));

// Mock next/image to render a plain <img> so jsdom can process it
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Import after mocks are registered
import DistrictPage, { generateMetadata } from './page';
import { fetchDistrictShops } from '@/lib/api/districts';
import type { DistrictShopsResponse } from '@/types/districts';

// ---------------------------------------------------------------------------
// Realistic mock data
// ---------------------------------------------------------------------------

const mockDistrict: DistrictShopsResponse['district'] = {
  id: 'c1e2a3b4-1234-5678-abcd-ef0123456789',
  slug: 'da-an',
  nameEn: 'Da-an',
  nameZh: '大安',
  descriptionEn: 'A leafy, university-rich district packed with specialty cafes.',
  descriptionZh: '綠意盎然、大學林立的大安區，充滿精品咖啡廳。',
  city: 'Taipei',
  shopCount: 2,
  sortOrder: 1,
};

const mockShops: DistrictShopsResponse['shops'] = [
  {
    shopId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: '禾多咖啡 Hoto Cafe',
    slug: 'hoto-cafe',
    rating: 4.7,
    reviewCount: 312,
    coverPhotoUrl: 'https://example.com/hoto.jpg',
    address: '台北市大安區復興南路一段107巷5弄14號',
    mrt: '大安站',
    matchedTagLabels: ['laptop-friendly', 'pour-over'],
  },
  {
    shopId: 'a1b2c3d4-0000-1111-2222-333344445555',
    name: '木下庵 Kino',
    slug: 'kino-coffee',
    rating: 4.5,
    reviewCount: 87,
    coverPhotoUrl: null,
    address: '台北市大安區溫州街70巷3號',
    mrt: '台電大樓站',
    matchedTagLabels: ['cozy', 'japanese-style'],
  },
];

const mockResponse: DistrictShopsResponse = {
  district: mockDistrict,
  shops: mockShops,
  totalCount: 2,
};

const defaultParams = {
  params: Promise.resolve({ slug: 'da-an' }),
  searchParams: Promise.resolve({}),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedFetch = fetchDistrictShops as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('app/explore/districts/[slug]/page — district detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a user visiting a district page sees the district name in Chinese', async () => {
    mockedFetch.mockResolvedValueOnce(mockResponse);

    const jsx = await DistrictPage(defaultParams);
    render(jsx);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('大安');
  });

  it('a user visiting a district page sees all shop names listed', async () => {
    mockedFetch.mockResolvedValueOnce(mockResponse);

    const jsx = await DistrictPage(defaultParams);
    render(jsx);

    expect(
      screen.getByText('禾多咖啡 Hoto Cafe')
    ).toBeInTheDocument();
    expect(screen.getByText('木下庵 Kino')).toBeInTheDocument();
  });

  it('a user navigating to an unknown district slug sees a 404 page', async () => {
    mockedFetch.mockResolvedValueOnce(null);

    await expect(
      DistrictPage({
        params: Promise.resolve({ slug: 'non-existent-district' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('a user visiting a district with no matching shops sees an empty state message', async () => {
    mockedFetch.mockResolvedValueOnce({
      ...mockResponse,
      shops: [],
      totalCount: 0,
    });

    const jsx = await DistrictPage(defaultParams);
    render(jsx);

    expect(
      screen.getByText('No shops found in this district.')
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // generateMetadata
  // -------------------------------------------------------------------------

  describe('generateMetadata', () => {
    it('returns a localized title when the district exists', async () => {
      mockedFetch.mockResolvedValueOnce(mockResponse);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'da-an' }),
      });

      expect(metadata.title).toBe('大安咖啡廳推薦 | Da-an Cafes — 啡遊');
    });

    it('returns a fallback title when the district is not found', async () => {
      mockedFetch.mockResolvedValueOnce(null);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'ghost-district' }),
      });

      expect(metadata.title).toBe('District not found');
    });
  });
});
