export interface EnrichmentResult {
  tags: Array<{ id: string; dimension: string; label: string; labelZh: string }>;
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
