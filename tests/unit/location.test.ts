import { describe, expect, it } from 'vitest';
import { distanceFields } from '@/lib/distance';
import { formatLocCookie, parseLocCookie } from '@/lib/location';
import { getCardsBySlugs, nearby, searchRestaurants } from '@/lib/restaurants';
import { parseQuery } from '@/lib/search/rule-parser';

const noon = new Date('2026-11-09T12:00:00+07:00');
const binhTan = { lat: 10.7653, lng: 106.6036 };

describe('location cookie', () => {
  it('rounds to 3 decimals and round-trips', () => {
    expect(formatLocCookie({ lat: 10.765312, lng: 106.603649 })).toBe('10.765,106.604');
    expect(parseLocCookie('10.765,106.604')).toEqual({ lat: 10.765, lng: 106.604 });
    expect(parseLocCookie(encodeURIComponent('10.765,106.604'))).toEqual({ lat: 10.765, lng: 106.604 });
  });

  it('rejects garbage and points outside Vietnam', () => {
    expect(parseLocCookie(undefined)).toBeNull();
    expect(parseLocCookie('abc')).toBeNull();
    expect(parseLocCookie('10.7')).toBeNull();
    expect(parseLocCookie('48.85,2.35')).toBeNull();
  });
});

describe('single distance source', () => {
  it('no origin → no distance anywhere', () => {
    expect(distanceFields(null, binhTan)).toEqual({ distance: null, distanceLabel: null });
    const cards = nearby(null, 20, noon);
    expect(cards.every((h) => h.distance == null && h.distanceLabel == null)).toBe(true);
  });

  it('same origin → same label on list, map recompute and slug lookup', () => {
    const origin = parseLocCookie(formatLocCookie(binhTan));
    const fromList = searchRestaurants({ terms: [], dishes: [] }, { origin, now: noon, limit: 50 }).items.find(
      (h) => h.restaurant.slug === 'chao-ech-dem-sai-gon',
    );
    const [fromApi] = getCardsBySlugs(['chao-ech-dem-sai-gon'], origin, noon);
    const fromMap = distanceFields(origin, { lat: fromApi!.lat, lng: fromApi!.lng });
    expect(fromList?.distanceLabel).toBe(fromApi?.distanceLabel);
    expect(fromMap.distanceLabel).toBe(fromApi?.distanceLabel);
  });

  it('radius filter is ignored (and reported) without an origin', () => {
    const f = parseQuery('món nước gần đây');
    const withoutLoc = searchRestaurants(f, { origin: null, now: noon, limit: 50 });
    expect(withoutLoc.radiusIgnored).toBe(true);
    expect(withoutLoc.total > 0).toBe(true);
    const farAway = searchRestaurants(f, { origin: { lat: 10.9, lng: 106.5 }, now: noon, limit: 50 });
    expect(farAway.radiusIgnored).toBe(false);
    expect(farAway.total).toBe(0);
  });
});
