import { describe, it, expectTypeOf } from 'vitest';
import type { ILLMProvider } from '@/lib/providers/llm/llm.interface';
import type { IEmbeddingsProvider } from '@/lib/providers/embeddings/embeddings.interface';
import type { IEmailProvider } from '@/lib/providers/email/email.interface';
import type { IMapsProvider } from '@/lib/providers/maps/maps.interface';
import type { IAnalyticsProvider } from '@/lib/providers/analytics/analytics.interface';

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
