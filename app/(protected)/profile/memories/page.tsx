'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useUserStamps } from '@/lib/hooks/use-user-stamps';
import { CorkBoard } from '@/components/stamps/cork-board';
import { StampDetailSheet } from '@/components/stamps/stamp-detail-sheet';
import type { StampData } from '@/lib/hooks/use-user-stamps';

export default function MemoriesPage() {
  const { stamps, isLoading } = useUserStamps();
  const [selectedStamp, setSelectedStamp] = useState<StampData | null>(null);

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{
        backgroundColor: '#C8A97B',
        backgroundImage:
          'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/profile"
            className="text-sm text-gray-700 hover:text-gray-900"
            aria-label="back"
          >
            &larr; Back
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">My Memories</h1>
          <div className="w-12" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          </div>
        ) : (
          <CorkBoard
            stamps={stamps}
            onStampClick={(stamp) => setSelectedStamp(stamp)}
          />
        )}
      </div>

      {selectedStamp && (
        <StampDetailSheet
          stamp={selectedStamp}
          onClose={() => setSelectedStamp(null)}
        />
      )}
    </main>
  );
}
