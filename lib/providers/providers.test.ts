import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ILLMProvider } from '@/lib/providers/llm/llm.interface';
import type { IEmbeddingsProvider } from '@/lib/providers/embeddings/embeddings.interface';
import type { IEmailProvider } from '@/lib/providers/email/email.interface';
import type { IMapsProvider } from '@/lib/providers/maps/maps.interface';
import type { IAnalyticsProvider } from '@/lib/providers/analytics/analytics.interface';
import { AnthropicAdapter } from '@/lib/providers/llm/anthropic.adapter';
import { OpenAIEmbeddingsAdapter } from '@/lib/providers/embeddings/openai.adapter';
import { ResendAdapter } from '@/lib/providers/email/resend.adapter';
import { MapboxAdapter } from '@/lib/providers/maps/mapbox.adapter';
import { PostHogAdapter } from '@/lib/providers/analytics/posthog.adapter';

describe('Provider interfaces', () => {
  it('ILLMProvider has enrichShop method', () => {
    expectTypeOf<ILLMProvider>().toHaveProperty('enrichShop');
  });

  it('IEmbeddingsProvider has embed method', () => {
    expectTypeOf<IEmbeddingsProvider>().toHaveProperty('embed');
  });

  it('IEmailProvider has send method', () => {
    expectTypeOf<IEmailProvider>().toHaveProperty('send');
  });

  it('IMapsProvider has geocode method', () => {
    expectTypeOf<IMapsProvider>().toHaveProperty('geocode');
  });

  it('IAnalyticsProvider has track method', () => {
    expectTypeOf<IAnalyticsProvider>().toHaveProperty('track');
  });
});

describe('Provider adapter stubs', () => {
  it('AnthropicAdapter.enrichShop throws Not implemented', async () => {
    const adapter = new AnthropicAdapter();
    await expect(
      adapter.enrichShop({
        name: '',
        reviews: [],
        description: null,
        categories: [],
      })
    ).rejects.toThrow('Not implemented');
  });

  it('OpenAIEmbeddingsAdapter.embed throws Not implemented', async () => {
    const adapter = new OpenAIEmbeddingsAdapter();
    await expect(adapter.embed('test')).rejects.toThrow('Not implemented');
  });

  it('OpenAIEmbeddingsAdapter.embedBatch throws Not implemented', async () => {
    const adapter = new OpenAIEmbeddingsAdapter();
    await expect(adapter.embedBatch(['a', 'b'])).rejects.toThrow(
      'Not implemented'
    );
  });

  it('OpenAIEmbeddingsAdapter exposes dimensions and modelId', () => {
    const adapter = new OpenAIEmbeddingsAdapter();
    expect(adapter.dimensions).toBe(1536);
    expect(adapter.modelId).toBe('text-embedding-3-small');
  });

  it('ResendAdapter.send throws Not implemented', async () => {
    const adapter = new ResendAdapter();
    await expect(
      adapter.send({ to: 'a@b.com', subject: 'test', html: '<p>hi</p>' })
    ).rejects.toThrow('Not implemented');
  });

  it('MapboxAdapter.geocode throws Not implemented', async () => {
    const adapter = new MapboxAdapter();
    await expect(adapter.geocode('Taipei 101')).rejects.toThrow(
      'Not implemented'
    );
  });

  it('MapboxAdapter.reverseGeocode throws Not implemented', async () => {
    const adapter = new MapboxAdapter();
    await expect(adapter.reverseGeocode(25.03, 121.56)).rejects.toThrow(
      'Not implemented'
    );
  });

  it('PostHogAdapter.track throws Not implemented', () => {
    const adapter = new PostHogAdapter();
    expect(() => adapter.track('page_view')).toThrow('Not implemented');
  });

  it('PostHogAdapter.identify throws Not implemented', () => {
    const adapter = new PostHogAdapter();
    expect(() => adapter.identify('user-123')).toThrow('Not implemented');
  });

  it('PostHogAdapter.page throws Not implemented', () => {
    const adapter = new PostHogAdapter();
    expect(() => adapter.page('home')).toThrow('Not implemented');
  });
});
