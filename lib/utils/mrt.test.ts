import { describe, it, expect } from 'vitest';
import { nearestMrtStation } from './mrt';

describe('nearestMrtStation', () => {
  it('returns the closest station to a given coordinate', () => {
    // Yongkang Street area (~25.0330, 121.5298) — nearest is Dongmen
    const result = nearestMrtStation(25.033, 121.5298);
    expect(result.name_en).toBe('Dongmen');
    expect(result.dist).toBeGreaterThan(0);
    expect(result.dist).toBeLessThan(1); // less than 1km
  });

  it('includes station line and lat/lng in the result', () => {
    const result = nearestMrtStation(25.0478, 121.517); // near Gongguan area
    expect(result).toHaveProperty('name_zh');
    expect(result).toHaveProperty('line');
    expect(result).toHaveProperty('lat');
    expect(result).toHaveProperty('lng');
  });
});
