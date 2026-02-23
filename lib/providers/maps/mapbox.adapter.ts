import type { IMapsProvider, GeocodingResult } from './maps.interface';

export class MapboxAdapter implements IMapsProvider {
  async geocode(): Promise<GeocodingResult | null> {
    throw new Error('Not implemented');
  }

  async reverseGeocode(): Promise<string | null> {
    throw new Error('Not implemented');
  }
}
