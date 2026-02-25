import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function DELETE(request: NextRequest) {
  return proxyToBackend(request, '/auth/account');
}
