import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/api/proxy';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest): Promise<Response> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
    return NextResponse.json({ detail: 'Payload too large' }, { status: 413 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_SIZE) {
    return NextResponse.json({ detail: 'Payload too large' }, { status: 413 });
  }

  const headers: HeadersInit = {};
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/admin/shops/import/manual-csv`, {
      method: 'POST',
      headers,
      body,
    });
  } catch {
    return NextResponse.json(
      { detail: 'Backend unavailable' },
      { status: 503 }
    );
  }

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
