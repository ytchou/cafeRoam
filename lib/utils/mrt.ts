import stationsData from '@/lib/data/taipei-mrt-stations.json';

export interface MrtStation {
  id: string;
  name_zh: string;
  name_en: string;
  line: string;
  lat: number;
  lng: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type MrtStationWithDistance = MrtStation & { dist: number };

export function nearestMrtStation(lat: number, lng: number): MrtStationWithDistance {
  const stations = stationsData as MrtStation[];
  let nearest: MrtStationWithDistance | undefined;
  for (const station of stations) {
    const dist = haversineKm(lat, lng, station.lat, station.lng);
    if (!nearest || dist < nearest.dist) {
      nearest = { ...station, dist };
    }
  }
  return nearest!;
}
