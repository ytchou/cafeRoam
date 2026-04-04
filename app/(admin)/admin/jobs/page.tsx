'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BatchesList } from './_components/BatchesList';
import { RawJobsList } from './_components/RawJobsList';
import { SchedulerHealth } from './_components/SchedulerHealth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const TAB_LABELS: Record<'batches' | 'raw' | 'scheduler', string> = {
  batches: 'Batch Runs',
  raw: 'Raw Jobs',
  scheduler: 'Scheduler',
};

function AdminJobsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');

  return (
    <Tabs defaultValue={initialStatus ? 'raw' : 'batches'}>
      <TabsList>
        <TabsTrigger value="batches">{TAB_LABELS.batches}</TabsTrigger>
        <TabsTrigger value="raw">{TAB_LABELS.raw}</TabsTrigger>
        <TabsTrigger value="scheduler">{TAB_LABELS.scheduler}</TabsTrigger>
      </TabsList>
      <TabsContent value="batches">
        <BatchesList />
      </TabsContent>
      <TabsContent value="raw">
        <RawJobsList initialStatus={initialStatus ?? undefined} />
      </TabsContent>
      <TabsContent value="scheduler">
        <SchedulerHealth />
      </TabsContent>
    </Tabs>
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
