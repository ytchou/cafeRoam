import { describe, it, expect } from 'vitest';

describe('llms.txt route', () => {
  it('returns plain text with site description and taxonomy', async () => {
    const { GET } = await import('@/app/llms.txt/route');
    const response = await GET();

    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8'
    );

    const text = await response.text();

    // Site identity
    expect(text).toContain('CafeRoam');
    expect(text).toContain('Taiwan');
    expect(text).toContain('coffee');

    // Taxonomy dimensions
    expect(text).toContain('functionality');
    expect(text).toContain('ambience');
    expect(text).toContain('mode');

    // Mode scores
    expect(text).toContain('work');
    expect(text).toContain('rest');
    expect(text).toContain('social');

    // Actionable info
    expect(text).toContain('/sitemap.xml');
  });
});
