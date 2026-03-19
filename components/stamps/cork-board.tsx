'use client';

import { useState } from 'react';
import { PolaroidCard, PIN_COLORS } from './polaroid-card';
import type { StampData } from '@/lib/hooks/use-user-stamps';

const STORAGE_KEY = 'caferoam:memories_view';
type ViewMode = 'scatter' | 'grid';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const GRID_ROTATIONS = [3, -2, 5, -4, 1, -3, 2];

function getInitialView(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'grid' || stored === 'scatter') return stored;
  } catch {
    // SSR or restricted localStorage
  }
  return 'scatter';
}

interface CorkBoardProps {
  stamps: StampData[];
  onStampClick?: (stamp: StampData) => void;
}

export function CorkBoard({ stamps, onStampClick }: CorkBoardProps) {
  const [view, setView] = useState<ViewMode>(getInitialView);

  function switchView(mode: ViewMode) {
    setView(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // restricted localStorage
    }
  }

  if (stamps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg text-gray-500">No memories yet</p>
        <p className="mt-1 text-sm text-gray-400">Check in to your first cafe to start your memory board</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end gap-1">
        <button
          aria-label="Scattered view"
          onClick={() => switchView('scatter')}
          className={`rounded-lg p-2 ${view === 'scatter' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="2" width="7" height="7" rx="1" fill="currentColor" transform="rotate(-5 4.5 5.5)" />
            <rect x="11" y="1" width="7" height="7" rx="1" fill="currentColor" transform="rotate(3 14.5 4.5)" />
            <rect x="3" y="12" width="7" height="7" rx="1" fill="currentColor" transform="rotate(4 6.5 15.5)" />
            <rect x="12" y="11" width="7" height="7" rx="1" fill="currentColor" transform="rotate(-3 15.5 14.5)" />
          </svg>
        </button>
        <button
          aria-label="Grid view"
          onClick={() => switchView('grid')}
          className={`rounded-lg p-2 ${view === 'grid' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
            <rect x="11" y="1" width="8" height="8" rx="1" fill="currentColor" />
            <rect x="1" y="11" width="8" height="8" rx="1" fill="currentColor" />
            <rect x="11" y="11" width="8" height="8" rx="1" fill="currentColor" />
          </svg>
        </button>
      </div>

      {view === 'scatter' ? (
        <ScatteredView stamps={stamps} onStampClick={onStampClick} />
      ) : (
        <GridView stamps={stamps} onStampClick={onStampClick} />
      )}
    </div>
  );
}

function ScatteredView({
  stamps,
  onStampClick,
}: {
  stamps: StampData[];
  onStampClick?: (stamp: StampData) => void;
}) {
  const ROW_HEIGHT = 220;

  return (
    <div
      data-testid="scatter-view"
      className="relative w-full"
      style={{ minHeight: `${Math.ceil(stamps.length / 2) * ROW_HEIGHT}px` }}
    >
      {stamps.map((stamp, i) => {
        const h = hashCode(stamp.id);
        const xPercent = (h % 48) + 5; // max 52% — keeps card (w-[42%]) within container bounds
        const yBase = Math.floor(i / 2) * ROW_HEIGHT;
        const yJitter = (h % 40) - 20;
        const rotation = (h % 25) - 12;
        const pinColor = PIN_COLORS[i % PIN_COLORS.length];

        return (
          <div
            key={stamp.id}
            className="absolute w-[42%] sm:w-[38%]"
            style={{ left: `${xPercent}%`, top: `${yBase + yJitter}px` }}
          >
            <PolaroidCard
              photoUrl={stamp.photo_url}
              shopName={stamp.shop_name ?? 'Unknown Shop'}
              district={stamp.district}
              earnedAt={stamp.earned_at}
              rotation={rotation}
              pinColor={pinColor}
              showPin
              onClick={() => onStampClick?.(stamp)}
            />
          </div>
        );
      })}
    </div>
  );
}

function GridView({
  stamps,
  onStampClick,
}: {
  stamps: StampData[];
  onStampClick?: (stamp: StampData) => void;
}) {
  return (
    <div data-testid="grid-view" className="grid grid-cols-2 gap-4">
      {stamps.map((stamp, i) => (
        <PolaroidCard
          key={stamp.id}
          photoUrl={stamp.photo_url}
          shopName={stamp.shop_name ?? 'Unknown Shop'}
          district={stamp.district}
          earnedAt={stamp.earned_at}
          rotation={GRID_ROTATIONS[i % GRID_ROTATIONS.length]}
          pinColor={PIN_COLORS[i % PIN_COLORS.length]}
          showPin
          onClick={() => onStampClick?.(stamp)}
        />
      ))}
    </div>
  );
}
