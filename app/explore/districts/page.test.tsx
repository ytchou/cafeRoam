import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the data-fetching boundary before importing the page
vi.mock('@/lib/api/districts', () => ({
  fetchDistricts: vi.fn(),
}));

// Import after mocks are set up
import { fetchDistricts } from '@/lib/api/districts';
import DistrictsIndexPage from './page';

const mockFetchDistricts = fetchDistricts as ReturnType<typeof vi.fn>;

const DA_AN = {
  id: 'dist-1',
  slug: 'da-an',
  nameZh: '大安',
  nameEn: 'Da-an',
  shopCount: 38,
  descriptionEn: null,
  descriptionZh: null,
  city: 'taipei',
  sortOrder: 1,
};

describe('app/explore/districts/page — districts index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a user browsing districts sees the Chinese and English name for each district', async () => {
    mockFetchDistricts.mockResolvedValueOnce([DA_AN]);

    const ui = await DistrictsIndexPage();
    render(ui);

    expect(screen.getByText('大安')).toBeInTheDocument();
    expect(screen.getByText('Da-an')).toBeInTheDocument();
  });

  it('a user browsing districts sees a shop count badge for each district', async () => {
    mockFetchDistricts.mockResolvedValueOnce([DA_AN]);

    const ui = await DistrictsIndexPage();
    render(ui);

    expect(screen.getByText('38 shops')).toBeInTheDocument();
  });

  it('a user clicking a district card is taken to the correct district landing page', async () => {
    mockFetchDistricts.mockResolvedValueOnce([DA_AN]);

    const ui = await DistrictsIndexPage();
    render(ui);

    const link = screen.getByRole('link', { name: /大安/i });
    expect(link).toHaveAttribute('href', '/explore/districts/da-an');
  });

  it('a user browsing districts sees one card per district returned by the API', async () => {
    const ZHONGSHAN = {
      id: 'dist-2',
      slug: 'zhongshan',
      nameZh: '中山',
      nameEn: 'Zhongshan',
      shopCount: 22,
      descriptionEn: null,
      descriptionZh: null,
      city: 'taipei',
      sortOrder: 2,
    };
    mockFetchDistricts.mockResolvedValueOnce([DA_AN, ZHONGSHAN]);

    const ui = await DistrictsIndexPage();
    render(ui);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('中山')).toBeInTheDocument();
    expect(screen.getByText('22 shops')).toBeInTheDocument();
  });

  it('a user visiting the districts page when no districts exist sees an empty list', async () => {
    mockFetchDistricts.mockResolvedValueOnce([]);

    const ui = await DistrictsIndexPage();
    render(ui);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
