'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BatchesList } from './_components/BatchesList';
import { RawJobsList } from './_components/RawJobsList';

type Tab = 'batches' | 'raw';

function AdminJobsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [activeTab, setActiveTab] = useState<Tab>(
    initialStatus ? 'raw' : 'batches'
  );

  return (
    <>
      <div className="flex gap-1 border-b">
        {(['batches', 'raw'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'batches' ? 'Batch Runs' : 'Raw Jobs'}
          </button>
        ))}
      </div>

      {activeTab === 'batches' ? (
        <BatchesList />
      ) : (
        <RawJobsList initialStatus={initialStatus ?? undefined} />
      )}
    </>
  );
}

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jobs Queue</h1>
      <Suspense>
        <AdminJobsContent />
      </Suspense>
    </div>
  );
}
