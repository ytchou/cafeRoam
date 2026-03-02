import { proxyToBackend } from '@/lib/api/proxy';

export async function POST(request: Request): Promise<Response> {
  return proxyToBackend(request, '/admin/shops/import/check-urls');
}
