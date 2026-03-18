import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { MapListView } from './map-list-view';

const shops = [
  {
    id: 'shop-abc',
    slug: 'sunlight-coffee',
    name: '日光珈琲 Sunlight Coffee',
    rating: 4.7,
    distance_m: 450,
    is_open: true,
    photo_url: null,
  },
  {
    id: 'shop-def',
    slug: 'spring-roasters',
    name: '春日烘焙 Spring Roasters',
    rating: 4.2,
    distance_m: 820,
    is_open: false,
    photo_url: null,
  },
];

describe('MapListView', () => {
  it('a user browsing list view sees all nearby shops', () => {
    render(<MapListView shops={shops} />);
    expect(screen.getByText('日光珈琲 Sunlight Coffee')).toBeInTheDocument();
    expect(screen.getByText('春日烘焙 Spring Roasters')).toBeInTheDocument();
  });

  it('shows rating and open status for each shop', () => {
    render(<MapListView shops={shops} />);
    expect(screen.getByText('★ 4.7')).toBeInTheDocument();
    expect(screen.getByText(/open/i)).toBeInTheDocument();
    expect(screen.getByText(/closed/i)).toBeInTheDocument();
  });

  it('navigates to shop detail when a row is tapped', async () => {
    render(<MapListView shops={shops} />);
    await userEvent.click(screen.getByText('日光珈琲 Sunlight Coffee'));
    expect(mockPush).toHaveBeenCalledWith('/shops/shop-abc/sunlight-coffee');
  });

  it('a user with no matching shops sees an empty state message', () => {
    render(<MapListView shops={[]} />);
    expect(screen.getByText(/no shops/i)).toBeInTheDocument();
  });
});
