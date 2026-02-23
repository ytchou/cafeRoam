import type { IEmbeddingsProvider } from './embeddings.interface';
import { OpenAIEmbeddingsAdapter } from './openai.adapter';

export function getEmbeddingsProvider(): IEmbeddingsProvider {
  const provider = process.env.EMBEDDINGS_PROVIDER ?? 'openai';

  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddingsAdapter();
    default:
      throw new Error(`Unknown embeddings provider: ${provider}`);
  }
}

export type { IEmbeddingsProvider } from './embeddings.interface';
