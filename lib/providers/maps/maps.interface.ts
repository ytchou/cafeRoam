export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface IMapsProvider {
  geocode(address: string): Promise<GeocodingResult | null>;
  reverseGeocode(lat: number, lng: number): Promise<string | null>;
  readonly accessToken: string;
}
