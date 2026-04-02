import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

// NOTE: This endpoint is not currently referenced by any admin UI page.
// The RawJobsList component filters dead-letter jobs via GET /admin/pipeline/jobs?status=dead_letter.
// This dedicated endpoint is retained for direct API access and external tooling.

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/admin/pipeline/dead-letter');
}
