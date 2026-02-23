import { describe, it, expectTypeOf } from 'vitest';
import type { ISearchService } from '@/lib/services/search.service';
import type { ICheckInService } from '@/lib/services/checkin.service';
import type { IListsService } from '@/lib/services/lists.service';

describe('Service interfaces', () => {
  it('ISearchService has search method', () => {
    expectTypeOf<ISearchService>().toHaveProperty('search');
  });

  it('ICheckInService has create method', () => {
    expectTypeOf<ICheckInService>().toHaveProperty('create');
  });

  it('IListsService has getByUser method', () => {
    expectTypeOf<IListsService>().toHaveProperty('getByUser');
  });

  it('IListsService has create method', () => {
    expectTypeOf<IListsService>().toHaveProperty('create');
  });
});
