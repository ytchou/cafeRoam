import type { IMapsProvider } from './maps.interface';
import { MapboxAdapter } from './mapbox.adapter';

export function getMapsProvider(): IMapsProvider {
  const provider = process.env.MAPS_PROVIDER ?? 'mapbox';

  switch (provider) {
    case 'mapbox':
      return new MapboxAdapter();
    default:
      throw new Error(`Unknown maps provider: ${provider}`);
  }
}

export type { IMapsProvider, GeocodingResult } from './maps.interface';
