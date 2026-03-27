import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; checkinId: string }> }
) {
  const { shopId, checkinId } = await params;
  return proxyToBackend(request, `/owner/${shopId}/reviews/${checkinId}/response`);
}
