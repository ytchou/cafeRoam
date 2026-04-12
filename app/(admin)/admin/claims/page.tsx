'use client';

import { ClaimsTab } from '../_components/ClaimsTab';
import { useAdminAuth } from '../_hooks/use-admin-auth';

export default function ClaimsPage() {
  const { getToken } = useAdminAuth();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Claims</h1>
      <ClaimsTab getToken={getToken} />
    </div>
  );
}
