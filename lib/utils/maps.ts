interface MapsShop {
  name: string;
  latitude: number;
  longitude: number;
  googlePlaceId: string | null;
  address: string | null;
}

export function getGoogleMapsUrl(shop: MapsShop): string {
  if (shop.googlePlaceId) {
    const name = encodeURIComponent(shop.name).replace(/%20/g, '+');
    return `https://www.google.com/maps/dir/?api=1&destination=${name}&destination_place_id=${shop.googlePlaceId}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
}

export function getAppleMapsUrl(
  shop: Pick<MapsShop, 'latitude' | 'longitude' | 'address'>
): string {
  if (shop.address) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(shop.address)}`;
  }

  return `https://maps.apple.com/?daddr=${shop.latitude},${shop.longitude}`;
}
