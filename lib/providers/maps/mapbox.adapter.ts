import type { IMapsProvider, GeocodingResult } from './maps.interface';

export class MapboxAdapter implements IMapsProvider {
  get accessToken(): string {
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  }

  async geocode(): Promise<GeocodingResult | null> {
    throw new Error('Not implemented');
  }

  async reverseGeocode(): Promise<string | null> {
    throw new Error('Not implemented');
  }
}
