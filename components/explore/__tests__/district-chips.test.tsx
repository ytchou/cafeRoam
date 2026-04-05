import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistrictChips } from '@/components/explore/district-chips';

const mockDistricts = [
  { id: 'd1', slug: 'daan', nameZh: '大安', nameEn: 'Daan', shopCount: 20 },
  { id: 'd2', slug: 'xinyi', nameZh: '信義', nameEn: 'Xinyi', shopCount: 15 },
];

describe('DistrictChips', () => {
  it('renders 全部, 附近, and district chips', () => {
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /附近/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '大安' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '信義' })).toBeInTheDocument();
  });

  it("highlights 全部 chip when filter type is 'all'", () => {
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={vi.fn()}
      />
    );

    const allChip = screen.getByRole('button', { name: '全部' });
    expect(allChip).toHaveAttribute('data-active', 'true');
  });

  it('calls onFilterChange with district when district chip is tapped', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={onFilterChange}
      />
    );

    await user.click(screen.getByRole('button', { name: '大安' }));

    expect(onFilterChange).toHaveBeenCalledWith({
      type: 'district',
      districtId: 'd1',
    });
  });

  it("calls onFilterChange with 'nearby' when 附近 chip is tapped", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={onFilterChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /附近/ }));

    expect(onFilterChange).toHaveBeenCalledWith({ type: 'nearby' });
  });
});
