import { describe, it, expect } from 'vitest';
import robots from '../robots';

describe('robots.txt generation', () => {
  it('when crawlers request robots.txt, it allows public pages and blocks private routes', () => {
    const result = robots();
    const wildcardRule = Array.isArray(result.rules)
      ? result.rules.find((r) => r.userAgent === '*')
      : result.rules;

    expect(wildcardRule?.allow).toContain('/');
    expect(wildcardRule?.allow).toContain('/shops/');
    expect(wildcardRule?.allow).toContain('/explore/');
    expect(wildcardRule?.disallow).toContain('/profile');
    expect(wildcardRule?.disallow).toContain('/api/');
  });

  it('when AI bots request robots.txt, they receive the same disallow rules as the wildcard', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

    const aiBots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];
    for (const bot of aiBots) {
      const rule = rules.find((r) => r.userAgent === bot);
      expect(rule, `${bot} rule should exist`).toBeDefined();
      expect(rule?.disallow).toContain('/profile');
      expect(rule?.disallow).toContain('/api/');
    }
  });

  it('when sitemap URL is generated, it points to the correct domain', () => {
    const result = robots();
    expect(result.sitemap).toContain('caferoam.tw');
    expect(result.sitemap).toContain('/sitemap.xml');
  });
});
