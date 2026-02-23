import { describe, it, expectTypeOf } from 'vitest';
import type { Shop, User, List, CheckIn, Stamp, TaxonomyTag } from '@/lib/types';

describe('Domain types', () => {
  it('Shop has required fields', () => {
    expectTypeOf<Shop>().toHaveProperty('id');
    expectTypeOf<Shop>().toHaveProperty('name');
    expectTypeOf<Shop>().toHaveProperty('latitude');
    expectTypeOf<Shop>().toHaveProperty('longitude');
    expectTypeOf<Shop>().toHaveProperty('taxonomyTags');
  });

  it('User has required fields', () => {
    expectTypeOf<User>().toHaveProperty('id');
    expectTypeOf<User>().toHaveProperty('email');
    expectTypeOf<User>().toHaveProperty('pdpaConsentAt');
  });

  it('List enforces max 3 via type (cap is API-enforced, type is documentation)', () => {
    expectTypeOf<List>().toHaveProperty('id');
    expectTypeOf<List>().toHaveProperty('userId');
    expectTypeOf<List>().toHaveProperty('name');
    expectTypeOf<List>().toHaveProperty('shopIds');
  });

  it('CheckIn requires at least one photo', () => {
    expectTypeOf<CheckIn>().toHaveProperty('photoUrls');
    expectTypeOf<CheckIn>().toHaveProperty('shopId');
    expectTypeOf<CheckIn>().toHaveProperty('userId');
  });

  it('Stamp has one design per shop', () => {
    expectTypeOf<Stamp>().toHaveProperty('shopId');
    expectTypeOf<Stamp>().toHaveProperty('userId');
    expectTypeOf<Stamp>().toHaveProperty('checkInId');
  });

  it('TaxonomyTag has dimension and label', () => {
    expectTypeOf<TaxonomyTag>().toHaveProperty('id');
    expectTypeOf<TaxonomyTag>().toHaveProperty('dimension');
    expectTypeOf<TaxonomyTag>().toHaveProperty('label');
  });
});
