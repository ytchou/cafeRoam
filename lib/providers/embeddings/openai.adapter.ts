import type { IEmbeddingsProvider } from './embeddings.interface';

export class OpenAIEmbeddingsAdapter implements IEmbeddingsProvider {
  readonly dimensions = 1536;
  readonly modelId = 'text-embedding-3-small';

  async embed(): Promise<number[]> {
    throw new Error('Not implemented');
  }

  async embedBatch(): Promise<number[][]> {
    throw new Error('Not implemented');
  }
}
