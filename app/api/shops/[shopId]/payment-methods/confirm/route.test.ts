import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/shops/[shopId]/payment-methods/confirm', () => {
  it('a shop owner can confirm their accepted payment methods', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const request = new NextRequest(
      'http://localhost/api/shops/shop-taipei-123/payment-methods/confirm',
      { method: 'POST', body: '{"paymentMethods":["cash","line_pay"]}' }
    );

    await POST(request, {
      params: Promise.resolve({ shopId: 'shop-taipei-123' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/shops/shop-taipei-123/payment-methods/confirm'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('a shop owner receives the backend success response after confirming accepted payment methods', async () => {
    mockFetch.mockReset();
    const responseBody = '{"ok":true}';
    mockFetch.mockResolvedValueOnce(
      new Response(responseBody, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/shops/shop-taipei-123/payment-methods/confirm',
      { method: 'POST', body: '{"paymentMethods":["cash","line_pay"]}' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ shopId: 'shop-taipei-123' }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(responseBody);
  });

  it('a shop owner receives the backend validation error when accepted payment methods cannot be confirmed', async () => {
    mockFetch.mockReset();
    const responseBody = '{"detail":"At least one payment method is required"}';
    mockFetch.mockResolvedValueOnce(
      new Response(responseBody, {
        status: 422,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/shops/shop-taipei-123/payment-methods/confirm',
      { method: 'POST', body: '{"paymentMethods":[]}' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ shopId: 'shop-taipei-123' }),
    });

    expect(response.status).toBe(422);
    await expect(response.text()).resolves.toBe(responseBody);
  });
});
