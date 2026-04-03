import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('Admin role management', () => {
  it('admin can list roles', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"roles":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/admin/roles');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('admin can assign a role', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"ok":true}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', role: 'admin' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('admin requests for listing and assigning roles are forwarded to the roles endpoint', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('{"roles":[]}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 201 }));

    const getRequest = new NextRequest(
      'http://localhost/api/admin/roles?include=permissions'
    );
    const postRequest = new NextRequest('http://localhost/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', role: 'admin' }),
    });

    await GET(getRequest);
    await POST(postRequest);

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/admin/roles'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/admin/roles'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
