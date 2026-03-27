import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ shopId: 'shop-abc' }),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: vi.fn(),
}));
vi.mock('@/lib/hooks/use-owner-dashboard', () => ({
  useOwnerDashboard: vi.fn(() => ({ stats: undefined, isLoading: false })),
}));
vi.mock('@/lib/hooks/use-owner-content', () => ({
  useOwnerContent: vi.fn(() => ({
    story: null,
    tags: [],
    saveStory: vi.fn(),
    saveTags: vi.fn(),
  })),
}));
vi.mock('@/lib/hooks/use-owner-reviews', () => ({
  useOwnerReviews: vi.fn(() => ({
    reviews: [],
    isLoading: false,
    postResponse: vi.fn(),
  })),
}));
vi.mock('@/lib/hooks/use-owner-analytics', () => ({
  useOwnerAnalytics: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

import OwnerDashboardPage from './page';
import { useUser } from '@/lib/hooks/use-user';

const mockUseUser = vi.mocked(useUser);

describe('OwnerDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading spinner while auth state is being resolved', () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<OwnerDashboardPage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('unauthenticated user is redirected to login with return URL', async () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false });
    render(<OwnerDashboardPage />);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/login?next=/owner/shop-abc/dashboard'
      )
    );
  });

  it('authenticated owner sees dashboard sections', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-1' } as never,
      isLoading: false,
    });
    render(<OwnerDashboardPage />);
    expect(screen.getByText('店家管理')).toBeTruthy();
    expect(screen.getByText('搜尋與社群洞察')).toBeTruthy();
    expect(screen.getByText('編輯店家資訊')).toBeTruthy();
    expect(screen.getByText('顧客評論')).toBeTruthy();
  });
});
