import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Provider factories', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('LLM factory throws when provider is unknown', async () => {
    vi.stubEnv('LLM_PROVIDER', 'unknown');
    const { getLLMProvider } = await import('@/lib/providers/llm');
    expect(() => getLLMProvider()).toThrow('Unknown LLM provider: unknown');
  });

  it('LLM factory returns AnthropicAdapter for "anthropic"', async () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    const { getLLMProvider } = await import('@/lib/providers/llm');
    const provider = getLLMProvider();
    expect(provider).toBeDefined();
  });

  it('Embeddings factory throws when provider is unknown', async () => {
    vi.stubEnv('EMBEDDINGS_PROVIDER', 'unknown');
    const { getEmbeddingsProvider } =
      await import('@/lib/providers/embeddings');
    expect(() => getEmbeddingsProvider()).toThrow(
      'Unknown embeddings provider: unknown'
    );
  });

  it('Email factory throws when provider is unknown', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'unknown');
    const { getEmailProvider } = await import('@/lib/providers/email');
    expect(() => getEmailProvider()).toThrow('Unknown email provider: unknown');
  });

  it('Maps factory throws when provider is unknown', async () => {
    vi.stubEnv('MAPS_PROVIDER', 'unknown');
    const { getMapsProvider } = await import('@/lib/providers/maps');
    expect(() => getMapsProvider()).toThrow('Unknown maps provider: unknown');
  });

  it('Analytics factory throws when provider is unknown', async () => {
    vi.stubEnv('ANALYTICS_PROVIDER', 'unknown');
    const { getAnalyticsProvider } = await import('@/lib/providers/analytics');
    expect(() => getAnalyticsProvider()).toThrow(
      'Unknown analytics provider: unknown'
    );
  });
});
