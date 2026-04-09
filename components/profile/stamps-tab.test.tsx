import { render, screen } from '@testing-library/react';
import { StampsTab } from './stamps-tab';
import type { StampData } from '@/lib/hooks/use-user-stamps';

vi.mock('@/components/stamps/polaroid-section', () => ({
  PolaroidSection: ({ stamps }: { stamps: StampData[] }) => (
    <div data-testid="polaroid-section">
      {stamps.map((s) => (
        <span key={s.id}>{s.shop_name}</span>
      ))}
    </div>
  ),
}));

vi.mock('@/components/stamps/stamp-detail-sheet', () => ({
  StampDetailSheet: ({
    onClose,
  }: {
    stamp: StampData;
    onClose: () => void;
  }) => <button onClick={onClose}>close</button>,
}));

const mockStamps: StampData[] = [
  {
    id: 'stamp-1',
    user_id: 'user-1',
    shop_id: 'shop-1',
    check_in_id: 'ci-1',
    design_url: '',
    earned_at: '2026-03-01T10:00:00Z',
    shop_name: 'Coffee Lab',
    photo_url: null,
    district: null,
    diary_note: null,
  },
];

describe('StampsTab', () => {
  it('renders stamp cards when stamps are provided', () => {
    render(<StampsTab stamps={mockStamps} isLoading={false} />);
    expect(screen.getByText('Coffee Lab')).toBeInTheDocument();
  });

  it('shows a loading spinner while loading', () => {
    render(<StampsTab stamps={[]} isLoading={true} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
