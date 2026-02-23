import { describe, it, expect } from 'vitest';
import { GET, POST } from './route';

describe('GET /api/auth', () => {
  it('returns 501 not implemented', async () => {
    const response = await GET();
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.status).toBe('not_implemented');
  });
});

describe('POST /api/auth', () => {
  it('returns 501 not implemented', async () => {
    const response = await POST();
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.status).toBe('not_implemented');
  });
});
