'use client';

import type { District } from '@/types/districts';

interface DistrictPickerProps {
  districts: District[];
  selectedDistrictIds: string[];
  gpsAvailable: boolean;
  isNearMeActive: boolean;
  onToggleDistrict: (districtId: string) => void;
  onSelectNearMe: () => void;
}

const activePill = 'border-amber-700 bg-amber-700 text-white';
const inactivePill = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
const disabledPill =
  'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed';

export function DistrictPicker({
  districts,
  selectedDistrictIds,
  gpsAvailable,
  isNearMeActive,
  onToggleDistrict,
  onSelectNearMe,
}: DistrictPickerProps) {
  return (
    <div
      className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label="Location filter"
    >
      <button
        type="button"
        onClick={onSelectNearMe}
        disabled={!gpsAvailable}
        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
          !gpsAvailable
            ? disabledPill
            : isNearMeActive
              ? activePill
              : inactivePill
        }`}
      >
        Near Me
      </button>
      {districts.map((district) => (
        <button
          key={district.id}
          type="button"
          onClick={() => onToggleDistrict(district.id)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            selectedDistrictIds.includes(district.id) && !isNearMeActive
              ? activePill
              : inactivePill
          }`}
        >
          {district.nameZh}
        </button>
      ))}
    </div>
  );
}
