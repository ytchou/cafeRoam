'use client';

import type { District } from '@/types/districts';

interface DistrictPickerProps {
  districts: District[];
  selectedDistrictId: string | null;
  gpsAvailable: boolean;
  isNearMeActive: boolean;
  onSelectDistrict: (districtId: string) => void;
  onSelectNearMe: () => void;
}

const activePill = 'border-amber-700 bg-amber-700 text-white';
const inactivePill = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
const disabledPill =
  'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed';

export function DistrictPicker({
  districts,
  selectedDistrictId,
  gpsAvailable,
  isNearMeActive,
  onSelectDistrict,
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
          onClick={() => onSelectDistrict(district.id)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            selectedDistrictId === district.id && !isNearMeActive
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
