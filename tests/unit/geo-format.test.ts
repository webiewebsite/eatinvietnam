import { describe, expect, it } from 'vitest';
import { bboxAround, distanceMeters, inBBox, parseBBox } from '@/lib/geo';
import { formatDistance, formatPrice, formatPriceRange } from '@/lib/format';

describe('geo', () => {
  const benThanh = { lat: 10.7725, lng: 106.698 };

  it('distance is ~0 for the same point and symmetric', () => {
    expect(distanceMeters(benThanh, benThanh)).toBe(0);
    const p = { lat: 10.779, lng: 106.688 };
    expect(Math.round(distanceMeters(benThanh, p))).toBe(Math.round(distanceMeters(p, benThanh)));
  });

  it('1 km bbox contains points within 1 km', () => {
    const box = bboxAround(benThanh, 1000);
    expect(inBBox({ lat: 10.776, lng: 106.701 }, box)).toBe(true);
    expect(inBBox({ lat: 10.8, lng: 106.698 }, box)).toBe(false);
  });

  it('parses Mapbox-order bbox strings', () => {
    expect(parseBBox('106.68,10.75,106.72,10.8')).toEqual({ minLng: 106.68, minLat: 10.75, maxLng: 106.72, maxLat: 10.8 });
    expect(parseBBox('1,2,3')).toBeUndefined();
  });
});

describe('format', () => {
  it('prices', () => {
    expect(formatPrice(45000)).toBe('45.000đ');
    expect(formatPriceRange(45000, 65000)).toBe('45–65k');
    expect(formatPriceRange(50000, 50000)).toBe('50k');
    expect(formatPriceRange(null, null)).toBeNull();
  });

  it('distances', () => {
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(1234)).toBe('1,2 km');
  });
});
