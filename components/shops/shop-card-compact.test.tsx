import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ShopCardCompact } from './shop-card-compact';
import { makeShop } from '@/lib/test-utils/factories';

const shop = {
  ...makeShop(),
  id: 'shop-brew',
  name: 'The Brew House',
  rating: 4.8,
  photo_urls: ['https://example.com/brew.jpg'],
};

describe('a user interacting with the ShopCardCompact', () => {
  it('a user browsing list view sees the shop name', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText('The Brew House')).toBeInTheDocument();
  });

  it('a user sees the shop rating to help decide where to go', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('a user sees a photo of the shop in the compact card', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(
      screen.getByRole('img', { name: 'The Brew House' })
    ).toBeInTheDocument();
  });

  it('a user sees a chevron arrow indicating the card is tappable for more details', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.getByTestId('compact-card-arrow')).toBeInTheDocument();
  });

  it('a user sees the card highlighted when it corresponds to the selected map pin', () => {
    const { container } = render(
      <ShopCardCompact shop={shop} onClick={() => {}} selected />
    );
    const article = container.querySelector('article');
    expect(article).toHaveAttribute('data-selected', 'true');
  });

  it('a user tapping a compact card triggers navigation to the shop detail', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShopCardCompact shop={shop} onClick={onClick} />);
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('a user browsing search results sees a community snippet on the card', () => {
    const shopWithSummary = {
      ...shop,
      community_summary:
        '顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。咖啡豆選用衣索比亞日曬，果香明顯，適合喜歡手沖的朋友。窗邊座位採光好，插座充足，店員親切有耐心，適合長時間駐足工作或讀書。',
    };
    render(<ShopCardCompact shop={shopWithSummary} onClick={() => {}} />);
    // Should be truncated to ~80 chars with ellipsis
    expect(screen.getByText(/顧客推薦拿鐵/)).toBeInTheDocument();
    expect(screen.getByText(/…/)).toBeInTheDocument();
  });

  it('a user does not see a community snippet when the shop has no summary', () => {
    render(<ShopCardCompact shop={shop} onClick={() => {}} />);
    expect(screen.queryByText(/「/)).not.toBeInTheDocument();
  });

  it('a user browsing sees taxonomy tags as pill chips to understand the shop vibe', () => {
    const shopWithTags = {
      ...shop,
      taxonomyTags: [
        { id: 'outlet', label: 'Has outlets', labelZh: '有插座' },
        { id: 'quiet', label: 'Quiet', labelZh: '安靜' },
        { id: 'late-night', label: 'Late night', labelZh: '深夜營業' },
      ],
    };
    render(<ShopCardCompact shop={shopWithTags} onClick={() => {}} />);
    expect(screen.getByText('有插座')).toBeInTheDocument();
    expect(screen.getByText('安靜')).toBeInTheDocument();
    expect(screen.getByText('深夜營業')).toBeInTheDocument();
  });

  it('a user sees at most 5 tags even when the shop has more', () => {
    const shopWithManyTags = {
      ...shop,
      taxonomyTags: [
        { id: 't1', label: 'Tag 1', labelZh: '標籤一' },
        { id: 't2', label: 'Tag 2', labelZh: '標籤二' },
        { id: 't3', label: 'Tag 3', labelZh: '標籤三' },
        { id: 't4', label: 'Tag 4', labelZh: '標籤四' },
        { id: 't5', label: 'Tag 5', labelZh: '標籤五' },
        { id: 't6', label: 'Tag 6', labelZh: '標籤六' },
        { id: 't7', label: 'Tag 7', labelZh: '標籤七' },
      ],
    };
    render(<ShopCardCompact shop={shopWithManyTags} onClick={() => {}} />);
    expect(screen.getByText('標籤五')).toBeInTheDocument();
    expect(screen.queryByText('標籤六')).not.toBeInTheDocument();
    expect(screen.queryByText('標籤七')).not.toBeInTheDocument();
  });

  it('a user sees no tag row when the shop has no taxonomy tags', () => {
    const { container } = render(
      <ShopCardCompact shop={shop} onClick={() => {}} />
    );
    expect(
      container.querySelector('[data-testid="tag-pills"]')
    ).not.toBeInTheDocument();
  });
});
