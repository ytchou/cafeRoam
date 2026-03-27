import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  return proxyToBackend(request, `/owner/${shopId}/dashboard`);
}
