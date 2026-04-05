import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistrictChips } from './district-chips';
import type { VibeFilter } from './district-chips';

const mockDistricts = [
  { id: 'd1', nameZh: '大安' },
  { id: 'd2', nameZh: '信義' },
];

describe('DistrictChips', () => {
  it('renders All, Nearby, and district chips', () => {
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /全部/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /附近/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /大安/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /信義/i })).toBeInTheDocument();
  });

  it('highlights active district chips in multi-select', () => {
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'districts', districtIds: ['d1', 'd2'] }}
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /大安/i })).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByRole('button', { name: /信義/i })).toHaveAttribute(
      'data-active',
      'true'
    );
  });

  it('adds a district to selection on click', async () => {
    const onChange = vi.fn();
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'all' }}
        onFilterChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /大安/i }));
    expect(onChange).toHaveBeenCalledWith({ type: 'districts', districtIds: ['d1'] });
  });

  it('adds to existing selection on click', async () => {
    const onChange = vi.fn();
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'districts', districtIds: ['d1'] }}
        onFilterChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /信義/i }));
    expect(onChange).toHaveBeenCalledWith({ type: 'districts', districtIds: ['d1', 'd2'] });
  });

  it('removes a district on toggle-off click', async () => {
    const onChange = vi.fn();
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'districts', districtIds: ['d1', 'd2'] }}
        onFilterChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /大安/i }));
    expect(onChange).toHaveBeenCalledWith({ type: 'districts', districtIds: ['d2'] });
  });

  it('reverts to all when last district is deselected', async () => {
    const onChange = vi.fn();
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'districts', districtIds: ['d1'] }}
        onFilterChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /大安/i }));
    expect(onChange).toHaveBeenCalledWith({ type: 'all' });
  });

  it('fires all filter on All click', async () => {
    const onChange = vi.fn();
    render(
      <DistrictChips
        districts={mockDistricts}
        activeFilter={{ type: 'districts', districtIds: ['d1'] }}
        onFilterChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /全部/i }));
    expect(onChange).toHaveBeenCalledWith({ type: 'all' });
  });
});
