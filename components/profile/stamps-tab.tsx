'use client';

import { useState } from 'react';
import { PolaroidSection } from '@/components/stamps/polaroid-section';
import { StampDetailSheet } from '@/components/stamps/stamp-detail-sheet';
import type { StampData } from '@/lib/hooks/use-user-stamps';

interface StampsTabProps {
  stamps: StampData[];
  isLoading: boolean;
}

export function StampsTab({ stamps, isLoading }: StampsTabProps) {
  const [selectedStamp, setSelectedStamp] = useState<StampData | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  return (
    <>
      <PolaroidSection stamps={stamps} onStampClick={setSelectedStamp} />
      {selectedStamp && (
        <StampDetailSheet
          stamp={selectedStamp}
          onClose={() => setSelectedStamp(null)}
        />
      )}
    </>
  );
}
