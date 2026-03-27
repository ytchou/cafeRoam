import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardReviews } from './dashboard-reviews';

const reviews = [
  {
    id: 'checkin-1',
    review_text: '咖啡非常棒，環境安靜。',
    owner_response: null,
  },
  {
    id: 'checkin-2',
    review_text: '很推薦這裡的拿鐵！',
    owner_response: '感謝您的支持！',
  },
];

describe('DashboardReviews', () => {
  const onPostResponse = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => vi.clearAllMocks());

  it('shows loading skeleton while reviews are being fetched', () => {
    const { container } = render(
      <DashboardReviews
        reviews={[]}
        isLoading={true}
        onPostResponse={onPostResponse}
      />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state message when shop has no reviews yet', () => {
    render(
      <DashboardReviews
        reviews={[]}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    expect(screen.getByText('尚無評論')).toBeTruthy();
  });

  it('displays review text for each review', () => {
    render(
      <DashboardReviews
        reviews={reviews}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    expect(screen.getByText('咖啡非常棒，環境安靜。')).toBeTruthy();
    expect(screen.getByText('很推薦這裡的拿鐵！')).toBeTruthy();
  });

  it('shows existing owner response inline without a reply button', () => {
    render(
      <DashboardReviews
        reviews={reviews}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    expect(screen.getByText('感謝您的支持！')).toBeTruthy();
    expect(screen.getByText('店家回覆')).toBeTruthy();
  });

  it('owner clicks reply and sees response textarea', async () => {
    render(
      <DashboardReviews
        reviews={reviews}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '回覆' }));
    expect(screen.getByPlaceholderText('回覆顧客...')).toBeTruthy();
  });

  it('owner submits a response and response is posted', async () => {
    render(
      <DashboardReviews
        reviews={reviews}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '回覆' }));
    await userEvent.type(
      screen.getByPlaceholderText('回覆顧客...'),
      '謝謝您！'
    );
    await userEvent.click(screen.getByRole('button', { name: '送出回覆' }));
    await waitFor(() =>
      expect(onPostResponse).toHaveBeenCalledWith('checkin-1', '謝謝您！')
    );
  });

  it('owner cancels reply and textarea disappears', async () => {
    render(
      <DashboardReviews
        reviews={reviews}
        isLoading={false}
        onPostResponse={onPostResponse}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '回覆' }));
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByPlaceholderText('回覆顧客...')).toBeNull();
  });
});
