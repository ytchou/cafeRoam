import { describe, it, expect } from 'vitest';
import { getGoogleMapsUrl, getAppleMapsUrl } from './maps';

describe('getGoogleMapsUrl', () => {
  it('uses destination_place_id when googlePlaceId is available', () => {
    const url = getGoogleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      googlePlaceId: 'ChIJx7x7x7x7',
      address: '台北市大安區',
    });
    expect(url).toContain('destination_place_id=ChIJx7x7x7x7');
    expect(url).toContain('destination=Cafe+Roam');
  });

  it('falls back to lat/lng when googlePlaceId is null', () => {
    const url = getGoogleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      googlePlaceId: null,
      address: '台北市大安區',
    });
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=25.033,121.565'
    );
  });
});

describe('getAppleMapsUrl', () => {
  it('uses address when available', () => {
    const url = getAppleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      address: '台北市大安區信義路三段',
    });
    expect(url).toContain('daddr=');
    expect(url).toContain(encodeURIComponent('台北市大安區信義路三段'));
  });

  it('falls back to lat/lng when address is missing', () => {
    const url = getAppleMapsUrl({
      name: 'Cafe Roam',
      latitude: 25.033,
      longitude: 121.565,
      address: null,
    });
    expect(url).toBe('https://maps.apple.com/?daddr=25.033,121.565');
  });
});
