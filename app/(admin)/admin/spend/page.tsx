'use client';

export const dynamic = 'force-dynamic';

import { SpendHistoryChart } from '../_components/SpendHistoryChart';
import { SpendTab } from '../_components/SpendTab';
import { useAdminAuth } from '../_hooks/use-admin-auth';

export default function SpendPage() {
  const { getToken } = useAdminAuth();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Spend</h1>
      <SpendHistoryChart getToken={getToken} />
      <SpendTab getToken={getToken} />
    </div>
  );
}
