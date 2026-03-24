import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ShareButton } from './share-button';

describe('ShareButton', () => {
  const props = {
    shopId: 'shop-001',
    shopName: '山小孩咖啡',
    shareUrl: 'https://caferoam.tw/shops/shop-001/shan-xiao-hai-ka-fei',
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders share button', () => {
    render(<ShareButton {...props} />);
    expect(screen.getByRole('button', { name: /分享/i })).toBeInTheDocument();
  });

  it('copies shop URL to clipboard when navigator.share is unavailable', async () => {
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /分享/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(props.shareUrl);
  });

  it('fires shop_url_copied analytics event on click', async () => {
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /分享/i }));

    const analyticsCall = mockFetch.mock.calls.find(
      (c) => c[0] === '/api/analytics/events'
    );
    expect(analyticsCall).toBeDefined();
    const body = JSON.parse(analyticsCall![1].body);
    expect(body.event).toBe('shop_url_copied');
    expect(body.properties).toEqual({
      shop_id: props.shopId,
      copy_method: 'clipboard',
    });
  });
});
