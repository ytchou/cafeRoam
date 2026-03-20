import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CheckInPopover } from './check-in-popover';

vi.mock('@/components/checkins/photo-uploader', () => ({
  PhotoUploader: () => <div>Photo uploader</div>,
}));
vi.mock('@/components/reviews/star-rating', () => ({
  StarRating: () => <div>Star rating</div>,
}));

describe('CheckInPopover', () => {
  it('shows the photo upload zone when open', () => {
    render(
      <CheckInPopover shopId="rufous-coffee-da-an" shopName="Rufous Coffee" open={true} onOpenChange={vi.fn()} trigger={<button>Check In</button>} />
    );
    expect(screen.getByText('Photo uploader')).toBeInTheDocument();
  });

  it('shows the Check In submit button', () => {
    render(
      <CheckInPopover shopId="rufous-coffee-da-an" shopName="Rufous Coffee" open={true} onOpenChange={vi.fn()} trigger={<button>Check In</button>} />
    );
    expect(screen.getByRole('button', { name: /Check In 打卡/i })).toBeInTheDocument();
  });

  it('submit button is disabled when no photo is selected', () => {
    render(
      <CheckInPopover shopId="rufous-coffee-da-an" shopName="Rufous Coffee" open={true} onOpenChange={vi.fn()} trigger={<button>Check In</button>} />
    );
    expect(screen.getByRole('button', { name: /Check In 打卡/i })).toBeDisabled();
  });
});
