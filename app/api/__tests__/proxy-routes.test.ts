import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock proxyToBackend before importing route handlers
vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: vi.fn(),
}));

import { proxyToBackend } from '@/lib/api/proxy';
import { GET as authGET, POST as authPOST } from '../auth/route';
import {
  GET as checkinsGET,
  POST as checkinsPOST,
} from '../checkins/route';
import { DELETE as listShopDELETE } from '../lists/[listId]/shops/[shopId]/route';
import { POST as listShopsPOST } from '../lists/[listId]/shops/route';
import { DELETE as listDELETE } from '../lists/[listId]/route';
import { GET as listsGET, POST as listsPOST } from '../lists/route';
import { GET as searchGET } from '../search/route';
import { GET as shopGET } from '../shops/[id]/route';
import { GET as shopsGET } from '../shops/route';
import { GET as stampsGET } from '../stamps/route';

const mockProxy = vi.mocked(proxyToBackend);
const mockResponse = new Response('{}', { status: 200 });

function makeRequest(url = 'http://localhost/api/test'): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  mockProxy.mockResolvedValue(mockResponse);
});

describe('auth route', () => {
  it('GET returns 501 not implemented', async () => {
    const res = await authGET();
    expect(res.status).toBe(501);
  });

  it('POST returns 501 not implemented', async () => {
    const res = await authPOST();
    expect(res.status).toBe(501);
  });
});

describe('search route', () => {
  it('GET proxies to /search', async () => {
    await searchGET(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/search');
  });
});

describe('checkins route', () => {
  it('GET proxies to /checkins', async () => {
    await checkinsGET(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/checkins');
  });

  it('POST proxies to /checkins', async () => {
    await checkinsPOST(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/checkins');
  });
});

describe('shops route', () => {
  it('GET proxies to /shops', async () => {
    await shopsGET(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/shops');
  });
});

describe('shops/[id] route', () => {
  it('GET proxies to /shops/:id', async () => {
    await shopGET(makeRequest(), { params: Promise.resolve({ id: 'shop-1' }) });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/shops/shop-1'
    );
  });
});

describe('stamps route', () => {
  it('GET proxies to /stamps', async () => {
    await stampsGET(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/stamps');
  });
});

describe('lists route', () => {
  it('GET proxies to /lists', async () => {
    await listsGET(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/lists');
  });

  it('POST proxies to /lists', async () => {
    await listsPOST(makeRequest());
    expect(mockProxy).toHaveBeenCalledWith(expect.any(NextRequest), '/lists');
  });
});

describe('lists/[listId] route', () => {
  it('DELETE proxies to /lists/:listId', async () => {
    await listDELETE(makeRequest(), {
      params: Promise.resolve({ listId: 'list-1' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/lists/list-1'
    );
  });
});

describe('lists/[listId]/shops route', () => {
  it('POST proxies to /lists/:listId/shops', async () => {
    await listShopsPOST(makeRequest(), {
      params: Promise.resolve({ listId: 'list-1' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/lists/list-1/shops'
    );
  });
});

describe('lists/[listId]/shops/[shopId] route', () => {
  it('DELETE proxies to /lists/:listId/shops/:shopId', async () => {
    await listShopDELETE(makeRequest(), {
      params: Promise.resolve({ listId: 'list-1', shopId: 'shop-1' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/lists/list-1/shops/shop-1'
    );
  });
});
