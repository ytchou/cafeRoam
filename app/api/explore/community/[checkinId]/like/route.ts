import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/lib/api/proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checkinId: string }> }
) {
  const { checkinId } = await params;
  return proxyToBackend(request, `/explore/community/${checkinId}/like`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkinId: string }> }
) {
  const { checkinId } = await params;
  return proxyToBackend(request, `/explore/community/${checkinId}/like`);
}
