export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function filterByBounds<
  T extends { latitude: number | null; longitude: number | null },
>(shops: T[], bounds: MapBounds | null): T[] {
  if (!bounds) return shops;
  return shops.filter((s) => {
    if (s.latitude == null || s.longitude == null) return false;
    return (
      s.latitude >= bounds.south &&
      s.latitude <= bounds.north &&
      s.longitude >= bounds.west &&
      s.longitude <= bounds.east
    );
  });
}
