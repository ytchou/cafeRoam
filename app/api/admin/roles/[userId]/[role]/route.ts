import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; role: string }> }
) {
  const { userId, role } = await params;
  return proxyToBackend(request, `/admin/roles/${userId}/${role}`);
}
