import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function POST(request: NextRequest): Promise<Response> {
  return proxyToBackend(request, '/admin/pipeline/run-batch');
}
