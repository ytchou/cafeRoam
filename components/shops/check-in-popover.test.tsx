import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckInPopover } from './check-in-popover';

const { mockUseCheckIn } = vi.hoisted(() => ({
  mockUseCheckIn: vi.fn(),
}));

vi.mock('@/lib/hooks/use-check-in', () => ({
  useCheckIn: mockUseCheckIn,
}));

vi.mock('@/components/checkins/photo-uploader', () => ({
  PhotoUploader: () => <div>Photo uploader</div>,
}));
vi.mock('@/components/reviews/star-rating', () => ({
  StarRating: () => <div>Star rating</div>,
}));

describe('CheckInPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCheckIn.mockReturnValue({
      submitStatus: 'idle',
      error: null,
      submit: vi.fn(),
    });
  });

  it('shows the photo upload zone when open', () => {
    render(
      <CheckInPopover
        shopId="rufous-coffee-da-an"
        shopName="Rufous Coffee"
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Check In</button>}
      />
    );
    expect(screen.getByText('Photo uploader')).toBeInTheDocument();
  });

  it('shows the Check In submit button', () => {
    render(
      <CheckInPopover
        shopId="rufous-coffee-da-an"
        shopName="Rufous Coffee"
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Check In</button>}
      />
    );
    expect(
      screen.getByRole('button', { name: /Check In 打卡/i })
    ).toBeInTheDocument();
  });

  it('submit button is disabled when no photo is selected', () => {
    render(
      <CheckInPopover
        shopId="rufous-coffee-da-an"
        shopName="Rufous Coffee"
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Check In</button>}
      />
    );
    expect(
      screen.getByRole('button', { name: /Check In 打卡/i })
    ).toBeDisabled();
  });

  it('given a check-in is submitting, the submit button shows aria-busy and "Checking in..." text with stable aria-label', () => {
    mockUseCheckIn.mockReturnValue({
      submitStatus: 'submitting',
      error: null,
      submit: vi.fn(),
    });

    render(
      <CheckInPopover
        shopId="rufous-coffee-da-an"
        shopName="Rufous Coffee"
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Check In</button>}
      />
    );

    const btn = screen.getByRole('button', { name: /Check In 打卡/i });

    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveTextContent('Checking in...');
  });
});
