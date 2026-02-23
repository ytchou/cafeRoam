import type { SearchQuery, SearchResult } from '@/lib/types';

export interface ISearchService {
  search(query: SearchQuery): Promise<SearchResult[]>;
}
