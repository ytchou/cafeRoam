import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('GET /api/shops/[shopId]/payment-methods', () => {
  it('visitor can view a shop accepted payment methods', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"paymentMethods":["cash","line_pay"]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/shops/shop-taipei-123/payment-methods'
    );

    await GET(request, {
      params: Promise.resolve({ shopId: 'shop-taipei-123' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/shops/shop-taipei-123/payment-methods'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('visitor receives the accepted payment methods returned by the shop page', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"paymentMethods":["cash","credit_card","line_pay"]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const request = new NextRequest(
      'http://localhost/api/shops/shop-taipei-123/payment-methods'
    );
    const response = await GET(request, {
      params: Promise.resolve({ shopId: 'shop-taipei-123' }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      '{"paymentMethods":["cash","credit_card","line_pay"]}'
    );
  });
});
