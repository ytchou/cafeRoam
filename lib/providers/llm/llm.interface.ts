import type { TaxonomyTag } from '@/lib/types';

export interface EnrichmentResult {
  tags: TaxonomyTag[];
  summary: string;
  confidence: number;
}

export interface ILLMProvider {
  enrichShop(input: {
    name: string;
    reviews: string[];
    description: string | null;
    categories: string[];
  }): Promise<EnrichmentResult>;
}
