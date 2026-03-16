import type { BrowserContext } from '@playwright/test';

export const TAIPEI_COORDS = { latitude: 25.033, longitude: 121.565 };
export const OUTSIDE_TAIWAN = { latitude: 35.6762, longitude: 139.6503 }; // Tokyo

export async function grantGeolocation(
  context: BrowserContext,
  coords = TAIPEI_COORDS,
) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(coords);
}

export async function denyGeolocation(context: BrowserContext) {
  await context.clearPermissions();
}
