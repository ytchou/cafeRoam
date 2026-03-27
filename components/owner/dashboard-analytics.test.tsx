import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardAnalytics } from './dashboard-analytics';

const analyticsData = {
  search_insights: [
    { query: '安靜咖啡廳', impressions: 42 },
    { query: '插座 WiFi', impressions: 19 },
  ],
  community_pulse: [
    { tag: '安靜', count: 8 },
    { tag: '插座充足', count: 5 },
  ],
  district_rankings: [
    { attribute: 'has_wifi', rank: 2, total_in_district: 30 },
  ],
};

describe('DashboardAnalytics', () => {
  it('shows loading skeleton while analytics data is being fetched', () => {
    const { container } = render(
      <DashboardAnalytics data={undefined} isLoading={true} />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders nothing when data is unavailable', () => {
    const { container } = render(
      <DashboardAnalytics data={undefined} isLoading={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays search impression queries and counts', () => {
    render(<DashboardAnalytics data={analyticsData} isLoading={false} />);
    expect(screen.getByText('安靜咖啡廳')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('插座 WiFi')).toBeTruthy();
  });

  it('displays community pulse tags with counts', () => {
    render(<DashboardAnalytics data={analyticsData} isLoading={false} />);
    expect(screen.getByText('安靜 · 8')).toBeTruthy();
    expect(screen.getByText('插座充足 · 5')).toBeTruthy();
  });

  it('renders without errors when search_insights is empty', () => {
    render(
      <DashboardAnalytics
        data={{ ...analyticsData, search_insights: [] }}
        isLoading={false}
      />
    );
    expect(screen.queryByText('搜尋曝光')).toBeNull();
  });

  it('renders without errors when community_pulse is empty', () => {
    render(
      <DashboardAnalytics
        data={{ ...analyticsData, community_pulse: [] }}
        isLoading={false}
      />
    );
    expect(screen.queryByText('社群反饋')).toBeNull();
  });
});
