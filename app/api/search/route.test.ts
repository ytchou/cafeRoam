import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/search', () => {
  it('returns 501 not implemented', async () => {
    const response = await GET();
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.status).toBe('not_implemented');
  });
});
