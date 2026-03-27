import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardOverview } from '../dashboard-overview';

describe('DashboardOverview', () => {
  const stats = {
    checkin_count_30d: 42,
    follower_count: 156,
    saves_count_30d: 23,
    page_views_30d: 890,
  };

  it('displays all four stat tiles', () => {
    render(<DashboardOverview stats={stats} isLoading={false} />);
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('156')).toBeTruthy();
    expect(screen.getByText('890')).toBeTruthy();
  });

  it('shows skeleton state while loading', () => {
    render(<DashboardOverview stats={undefined} isLoading={true} />);
    expect(screen.queryByText('42')).toBeNull();
  });
});
