import type { ILLMProvider } from './llm.interface';
import { AnthropicAdapter } from './anthropic.adapter';

export function getLLMProvider(): ILLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';

  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter();
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export type { ILLMProvider, EnrichmentResult } from './llm.interface';
