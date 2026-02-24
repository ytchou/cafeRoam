import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/checkins');
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/checkins');
}
