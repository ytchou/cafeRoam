'use client';

import type { District } from '@/types/districts';

type GpsStatus = 'loading' | 'active' | 'denied' | 'district-selected';

interface DistrictPickerProps {
  districts: District[];
  selectedDistrictIds: string[];
  gpsAvailable: boolean;
  isNearMeActive: boolean;
  gpsStatus: GpsStatus;
  radiusKm: number;
  onToggleDistrict: (districtId: string) => void;
  onSelectNearMe: () => void;
}

const activePill = 'border-amber-700 bg-amber-700 text-white';
const inactivePill = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
const disabledPill =
  'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed';
const loadingPill =
  'border-gray-200 bg-gray-100 text-gray-600 cursor-wait animate-pulse';

function getStatusMessage(
  gpsStatus: GpsStatus,
  radiusKm: number
): string | null {
  switch (gpsStatus) {
    case 'loading':
      return 'Finding your location…';
    case 'active':
      return `Within ${radiusKm} km of you`;
    case 'denied':
      return 'Location unavailable — pick a district to explore';
    case 'district-selected':
      return null;
  }
}

export function DistrictPicker({
  districts,
  selectedDistrictIds,
  gpsAvailable,
  isNearMeActive,
  gpsStatus,
  radiusKm,
  onToggleDistrict,
  onSelectNearMe,
}: DistrictPickerProps) {
  const statusMessage = getStatusMessage(gpsStatus, radiusKm);

  return (
    <div className="mb-3">
      <div
        className="scrollbar-hide flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Location filter"
      >
        <button
          type="button"
          onClick={onSelectNearMe}
          disabled={!gpsAvailable && gpsStatus !== 'loading'}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            gpsStatus === 'loading'
              ? loadingPill
              : !gpsAvailable
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
      {statusMessage && (
        <p
          className="mt-1.5 text-xs text-gray-500"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
