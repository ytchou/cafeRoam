'use client';

import type { ReactNode } from 'react';

export type VibeFilter =
  | { type: 'all' }
  | { type: 'nearby' }
  | { type: 'district'; districtId: string };

interface DistrictChipsProps {
  districts: { id: string; nameZh: string }[];
  activeFilter: VibeFilter;
  onFilterChange: (filter: VibeFilter) => void;
  isLoading?: boolean;
}

export function DistrictChips({
  districts,
  activeFilter,
  onFilterChange,
  isLoading = false,
}: DistrictChipsProps) {
  const isActive = (type: string, districtId?: string) => {
    if (activeFilter.type !== type) return false;
    if (type === 'district' && 'districtId' in activeFilter) {
      return activeFilter.districtId === districtId;
    }
    return true;
  };

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2">
      <ChipButton
        active={isActive('all')}
        onClick={() => onFilterChange({ type: 'all' })}
        disabled={isLoading}
      >
        全部
      </ChipButton>
      <ChipButton
        active={isActive('nearby')}
        onClick={() => onFilterChange({ type: 'nearby' })}
        disabled={isLoading}
      >
        ⊙ 附近
      </ChipButton>
      {districts.map((d) => (
        <ChipButton
          key={d.id}
          active={isActive('district', d.id)}
          onClick={() => onFilterChange({ type: 'district', districtId: d.id })}
          disabled={isLoading}
        >
          {d.nameZh}
        </ChipButton>
      ))}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-active={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-[#2c1810] text-white shadow-sm'
          : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  );
}
