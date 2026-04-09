import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileTabs } from './profile-tabs';
import type { StampData } from '@/lib/hooks/use-user-stamps';
import type { CheckInData } from '@/lib/hooks/use-user-checkins';

vi.mock('@/components/profile/stamps-tab', () => ({
  StampsTab: () => <div>stamps content</div>,
}));
vi.mock('@/components/profile/lists-tab', () => ({
  ListsTab: () => <div>lists content</div>,
}));
vi.mock('@/components/profile/checkin-history-tab', () => ({
  CheckinHistoryTab: () => <div>checkins content</div>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const defaultProps = {
  stamps: [] as StampData[],
  stampsLoading: false,
  checkins: [] as CheckInData[],
  checkinsLoading: false,
};

describe('ProfileTabs', () => {
  it('renders three tab triggers', () => {
    render(<ProfileTabs {...defaultProps} />);
    expect(screen.getByRole('tab', { name: 'Stamps' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lists' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Check-ins' })).toBeInTheDocument();
  });

  it('shows stamps content by default', () => {
    render(<ProfileTabs {...defaultProps} />);
    expect(screen.getByText('stamps content')).toBeVisible();
  });

  it('shows lists content when defaultTab="lists"', () => {
    render(<ProfileTabs {...defaultProps} defaultTab="lists" />);
    expect(screen.getByText('lists content')).toBeVisible();
  });

  it('switches to lists tab on click', async () => {
    render(<ProfileTabs {...defaultProps} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Lists' }));
    expect(screen.getByText('lists content')).toBeVisible();
  });
});
