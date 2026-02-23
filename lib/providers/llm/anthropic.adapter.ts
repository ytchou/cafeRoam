import type { ILLMProvider, EnrichmentResult } from './llm.interface';

export class AnthropicAdapter implements ILLMProvider {
  async enrichShop(): Promise<EnrichmentResult> {
    throw new Error('Not implemented');
  }
}
