import { describe, it, expect } from 'vitest';
import { getGoogleMapsUrl, getAppleMapsUrl } from './maps';

describe('getGoogleMapsUrl', () => {
  it('links to the place page using lat/lng', () => {
    const url = getGoogleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      googlePlaceId: 'ChIJx7x7x7x7',
      address: '台北市大安區',
    });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.033,121.565'
    );
  });

  it('links to the place page using lat/lng when googlePlaceId is null', () => {
    const url = getGoogleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      googlePlaceId: null,
      address: '台北市大安區',
    });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.033,121.565'
    );
  });
});

describe('getAppleMapsUrl', () => {
  it('links to the place page using lat/lng and shop name', () => {
    const url = getAppleMapsUrl({
      name: '咖啡旅人',
      latitude: 25.033,
      longitude: 121.565,
    });
    expect(url).toBe(
      `https://maps.apple.com/?ll=25.033,121.565&q=${encodeURIComponent('咖啡旅人')}`
    );
  });
});
