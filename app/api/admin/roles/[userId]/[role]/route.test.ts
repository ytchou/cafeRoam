import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE } from './route';

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DELETE /api/admin/roles/[userId]/[role]', () => {
  it('admin can revoke a user role', async () => {
    const backendResponse = new Response(null, { status: 200 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: backendResponse.body,
      headers: backendResponse.headers,
    });

    const request = new NextRequest(
      'http://localhost/api/admin/roles/user-123/editor',
      { method: 'DELETE' }
    );

    await DELETE(request, {
      params: Promise.resolve({ userId: 'user-123', role: 'editor' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/roles/user-123/editor'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('admin receives the backend success response after revoking a role', async () => {
    const responseBody = '{"ok":true}';
    const backendResponse = new Response(responseBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: backendResponse.body,
      headers: backendResponse.headers,
    });

    const request = new NextRequest(
      'http://localhost/api/admin/roles/user-123/editor',
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ userId: 'user-123', role: 'editor' }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(responseBody);
  });
});
