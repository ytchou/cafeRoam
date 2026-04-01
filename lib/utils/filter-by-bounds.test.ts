import { describe, expect, it } from 'vitest';
import { filterByBounds, type MapBounds } from '@/lib/utils/filter-by-bounds';

const SHOPS = [
  {
    id: 'a',
    name: '湛盧咖啡 Zhanlu Coffee',
    latitude: 25.03,
    longitude: 121.55,
  },
  {
    id: 'b',
    name: '山頂咖啡 Summit Coffee',
    latitude: 25.1,
    longitude: 121.55,
  },
  {
    id: 'c',
    name: '有著落咖啡 Landed Coffee',
    latitude: 25.03,
    longitude: 121.7,
  },
  { id: 'd', name: '無座標咖啡 No Coords', latitude: null, longitude: null },
];

describe('filterByBounds', () => {
  const bounds: MapBounds = {
    north: 25.06,
    south: 25.01,
    east: 121.58,
    west: 121.53,
  };

  it('a user panning the map sees only shops inside the viewport', () => {
    const result = filterByBounds(SHOPS, bounds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('shops without coordinates are excluded from viewport filtering', () => {
    const result = filterByBounds(SHOPS, bounds);
    expect(result.find((s) => s.id === 'd')).toBeUndefined();
  });

  it('when bounds are null all shops are returned (map not yet loaded)', () => {
    const result = filterByBounds(SHOPS, null);
    expect(result).toHaveLength(4);
  });
});
