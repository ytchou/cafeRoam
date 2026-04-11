interface MapsShop {
  name: string;
  latitude: number;
  longitude: number;
  googlePlaceId: string | null;
  address: string | null;
}

export function getGoogleMapsUrl(shop: MapsShop): string {
  if (shop.googlePlaceId) {
    return `https://www.google.com/maps/place/?q=place_id:${shop.googlePlaceId}`;
  }
  return `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`;
}

export function getAppleMapsUrl(
  shop: Pick<MapsShop, 'name' | 'latitude' | 'longitude'>
): string {
  return `https://maps.apple.com/?ll=${shop.latitude},${shop.longitude}&q=${encodeURIComponent(shop.name)}`;
}
