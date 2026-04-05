import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistrictPicker } from './district-picker';

const mockDistricts = [
  {
    id: 'd1',
    slug: 'daan',
    nameEn: 'Da-an',
    nameZh: '大安',
    descriptionEn: null,
    descriptionZh: null,
    city: 'Taipei',
    shopCount: 25,
    sortOrder: 1,
  },
  {
    id: 'd2',
    slug: 'xinyi',
    nameEn: 'Xinyi',
    nameZh: '信義',
    descriptionEn: null,
    descriptionZh: null,
    city: 'Taipei',
    shopCount: 18,
    sortOrder: 2,
  },
];

describe('DistrictPicker', () => {
  it('renders Near Me pill and district pills', () => {
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={[]}
        gpsAvailable={true}
        isNearMeActive={true}
        onToggleDistrict={vi.fn()}
        onSelectNearMe={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /near me/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /大安/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /信義/i })).toBeInTheDocument();
  });

  it('disables Near Me when GPS is unavailable', () => {
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={['d1']}
        gpsAvailable={false}
        isNearMeActive={false}
        onToggleDistrict={vi.fn()}
        onSelectNearMe={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /near me/i })).toBeDisabled();
  });

  it('highlights the selected district', () => {
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={['d1']}
        gpsAvailable={true}
        isNearMeActive={false}
        onToggleDistrict={vi.fn()}
        onSelectNearMe={vi.fn()}
      />
    );
    const daanBtn = screen.getByRole('button', { name: /大安/i });
    expect(daanBtn).toHaveClass('bg-amber-700');
  });

  it('highlights multiple selected districts', () => {
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={['d1', 'd2']}
        gpsAvailable={true}
        isNearMeActive={false}
        onToggleDistrict={vi.fn()}
        onSelectNearMe={vi.fn()}
      />
    );
    const daanBtn = screen.getByRole('button', { name: /大安/i });
    const xinyiBtn = screen.getByRole('button', { name: /信義/i });
    expect(daanBtn).toHaveClass('bg-amber-700');
    expect(xinyiBtn).toHaveClass('bg-amber-700');
  });

  it('calls onToggleDistrict when a district is clicked', async () => {
    const onToggleDistrict = vi.fn();
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={[]}
        gpsAvailable={true}
        isNearMeActive={true}
        onToggleDistrict={onToggleDistrict}
        onSelectNearMe={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /大安/i }));
    expect(onToggleDistrict).toHaveBeenCalledWith('d1');
  });

  it('calls onSelectNearMe when Near Me is clicked', async () => {
    const onNearMe = vi.fn();
    render(
      <DistrictPicker
        districts={mockDistricts}
        selectedDistrictIds={['d1']}
        gpsAvailable={true}
        isNearMeActive={false}
        onToggleDistrict={vi.fn()}
        onSelectNearMe={onNearMe}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /near me/i }));
    expect(onNearMe).toHaveBeenCalled();
  });
});
