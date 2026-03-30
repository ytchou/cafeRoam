import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ alt, ...rest }: Record<string, unknown>) => (
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img alt={alt as string} {...rest} />
  ),
}));

vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

import { ShopPreviewCard } from './shop-preview-card';

const mockShop = {
  id: 'shop-aa11bb',
  name: '晨光咖啡 Morning Glow',
  rating: 4.7,
  photo_urls: ['https://example.com/morning-glow.jpg'],
  distance_m: 350,
  is_open: true,
  latitude: 25.033,
  longitude: 121.543,
  taxonomyTags: [
    { id: 'wifi', label: 'WiFi', labelZh: 'WiFi' },
    { id: 'quiet', label: 'Quiet', labelZh: '安靜' },
    { id: 'no-time-limit', label: 'No time limit', labelZh: '不限時' },
    { id: 'pastries', label: 'Pastries', labelZh: '甜點' },
  ],
};

describe('a user seeing a shop preview card on the map', () => {
  it('displays the shop name and rating', () => {
    render(
      <ShopPreviewCard shop={mockShop} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByText('晨光咖啡 Morning Glow')).toBeInTheDocument();
    expect(screen.getByText(/★ 4\.7/)).toBeInTheDocument();
  });

  it('displays up to 3 taxonomy tags', () => {
    render(
      <ShopPreviewCard shop={mockShop} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('安靜')).toBeInTheDocument();
    expect(screen.getByText('不限時')).toBeInTheDocument();
    expect(screen.queryByText('甜點')).not.toBeInTheDocument();
  });

  it('displays distance and open status', () => {
    render(
      <ShopPreviewCard shop={mockShop} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByText(/350m/)).toBeInTheDocument();
    expect(screen.getByText(/Open/)).toBeInTheDocument();
  });

  it('calls onNavigate when the user clicks View Details', async () => {
    const onNavigate = vi.fn();
    render(
      <ShopPreviewCard shop={mockShop} onClose={vi.fn()} onNavigate={onNavigate} />
    );
    await userEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('calls onClose when the user clicks the close button', async () => {
    const onClose = vi.fn();
    render(
      <ShopPreviewCard shop={mockShop} onClose={onClose} onNavigate={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the user presses Escape', () => {
    const onClose = vi.fn();
    render(
      <ShopPreviewCard shop={mockShop} onClose={onClose} onNavigate={vi.fn()} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows a photo thumbnail when the shop has photos', () => {
    render(
      <ShopPreviewCard shop={mockShop} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    const img = screen.getByAltText('晨光咖啡 Morning Glow');
    expect(img).toBeInTheDocument();
  });

  it('shows a placeholder when the shop has no photos', () => {
    const noPhotoShop = { ...mockShop, photo_urls: [] };
    render(
      <ShopPreviewCard shop={noPhotoShop} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByText('No photo')).toBeInTheDocument();
  });
});
