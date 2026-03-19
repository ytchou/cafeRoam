import { describe, it, expect } from 'vitest';
import { nearestMrtStation } from './mrt';

describe('nearestMrtStation', () => {
  it('a shop on Yongkang Street resolves to Dongmen station within 1km', () => {
    const result = nearestMrtStation(25.033, 121.5298);
    expect(result.name_en).toBe('Dongmen');
    expect(result.dist).toBeGreaterThan(0);
    expect(result.dist).toBeLessThan(1);
  });

  it('station result carries all fields needed to render the MRT row in DirectionsSheet', () => {
    const result = nearestMrtStation(25.0478, 121.517); // near Gongguan area
    expect(result).toHaveProperty('name_zh');
    expect(result).toHaveProperty('line');
    expect(result).toHaveProperty('lat');
    expect(result).toHaveProperty('lng');
  });
});
