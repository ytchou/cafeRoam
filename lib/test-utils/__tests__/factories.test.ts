import { describe, it, expect } from 'vitest';
import {
  makeUser,
  makeSession,
  makeShop,
  makeList,
  makeCheckIn,
  makeStamp,
} from '../factories';

describe('test factories', () => {
  it('makeUser returns realistic user with overridable defaults', () => {
    const user = makeUser();
    expect(user.id).toMatch(/^user-/);
    expect(user.app_metadata.pdpa_consented).toBe(true);

    const custom = makeUser({ id: 'user-custom', app_metadata: { pdpa_consented: false } });
    expect(custom.id).toBe('user-custom');
    expect(custom.app_metadata.pdpa_consented).toBe(false);
  });

  it('makeSession returns session with access_token', () => {
    const session = makeSession();
    expect(session.access_token).toBeTruthy();
    expect(typeof session.access_token).toBe('string');
  });

  it('makeShop returns shop with realistic Taiwan data', () => {
    const shop = makeShop();
    expect(shop.name).not.toBe('Test Shop');
    expect(shop.latitude).toBeGreaterThan(20);
    expect(shop.longitude).toBeGreaterThan(100);
  });

  it('makeList returns list with user reference', () => {
    const list = makeList();
    expect(list.id).toMatch(/^list-/);
    expect(list.user_id).toMatch(/^user-/);
  });

  it('makeCheckIn returns check-in with at least one photo', () => {
    const checkIn = makeCheckIn();
    expect(checkIn.photo_urls.length).toBeGreaterThanOrEqual(1);
  });

  it('makeStamp returns stamp with design URL', () => {
    const stamp = makeStamp();
    expect(stamp.design_url).toMatch(/^https:\/\//);
  });
});
