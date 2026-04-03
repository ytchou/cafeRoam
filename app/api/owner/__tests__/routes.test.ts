import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProxy = vi.hoisted(() =>
  vi.fn().mockResolvedValue(new Response('ok'))
);
vi.mock('@/lib/api/proxy', () => ({ proxyToBackend: mockProxy }));

import { GET as analyticsGET } from '../[shopId]/analytics/route';
import {
  GET as analyticsTermsGET,
  POST as analyticsTermsPOST,
} from '../[shopId]/analytics-terms/route';
import { GET as dashboardGET } from '../[shopId]/dashboard/route';
import { PATCH as infoPATCH } from '../[shopId]/info/route';
import { GET as reviewsGET } from '../[shopId]/reviews/route';
import { POST as reviewResponsePOST } from '../[shopId]/reviews/[checkinId]/response/route';
import { GET as storyGET, PUT as storyPUT } from '../[shopId]/story/route';
import { GET as tagsGET, PUT as tagsPUT } from '../[shopId]/tags/route';

const req = (method = 'GET') =>
  new NextRequest('http://localhost/api/owner/shop-abc', { method });

describe('owner API proxy routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner with a shop proxies analytics request to backend', async () => {
    await analyticsGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/analytics'
    );
  });

  it('owner with a shop proxies dashboard stats request to backend', async () => {
    await dashboardGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/dashboard'
    );
  });

  it('owner updating shop info proxies PATCH to backend', async () => {
    await infoPATCH(req('PATCH'), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/info'
    );
  });

  it('owner viewing reviews proxies GET to backend', async () => {
    await reviewsGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/reviews'
    );
  });

  it('owner posting a review response proxies POST to backend', async () => {
    await reviewResponsePOST(req('POST'), {
      params: Promise.resolve({ shopId: 'shop-abc', checkinId: 'checkin-1' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/reviews/checkin-1/response'
    );
  });

  it('owner reading their story proxies GET to backend', async () => {
    await storyGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/story'
    );
  });

  it('owner saving their story proxies PUT to backend', async () => {
    await storyPUT(req('PUT'), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/story'
    );
  });

  it('owner reading tags proxies GET to backend', async () => {
    await tagsGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/tags'
    );
  });

  it('owner updating tags proxies PUT to backend', async () => {
    await tagsPUT(req('PUT'), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/tags'
    );
  });

  it('owner checking analytics terms status proxies GET to backend', async () => {
    await analyticsTermsGET(req(), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/analytics-terms'
    );
  });

  it('owner accepting analytics terms proxies POST to backend', async () => {
    await analyticsTermsPOST(req('POST'), {
      params: Promise.resolve({ shopId: 'shop-abc' }),
    });
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/owner/shop-abc/analytics-terms'
    );
  });
});
