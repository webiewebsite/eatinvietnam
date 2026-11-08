import { describe, expect, it } from 'vitest';
import { matchesAllTerms, toSearchText, toStoredSearchText } from '@/lib/search/normalize';
import { parseQuery } from '@/lib/search/rule-parser';
import { describeFilters, filtersToQuery, readSearchParams, withoutFilter } from '@/lib/search/url';
import { searchRestaurants } from '@/lib/restaurants';

describe('toSearchText', () => {
  it('strips diacritics, đ and punctuation', () => {
    expect(toSearchText('Cơm tấm Sườn  Mộc')).toBe('com tam suon moc');
    expect(toSearchText('ĐẶC SẢN Đà Nẵng!')).toBe('dac san da nang');
    expect(toSearchText('dưới 50k, gần đây…')).toBe('duoi 50k gan day');
  });

  it('matches whole words only', () => {
    const hay = toStoredSearchText('Bún bò Huế O Xuân');
    expect(matchesAllTerms(hay, ['bun', 'bo'])).toBe(true);
    expect(matchesAllTerms(hay, ['bo', 'ne'])).toBe(false);
    expect(matchesAllTerms(toStoredSearchText('Bò né'), ['bo'])).toBe(true);
    expect(matchesAllTerms(toStoredSearchText('Bơ'), ['bo', 'ne'])).toBe(false);
  });
});

describe('parseQuery', () => {
  it('understands the canvas example', () => {
    const f = parseQuery('Thèm món nước, gần đây, dưới 50k');
    expect(f.group).toBe('mon-nuoc');
    expect(f.radiusKm).toBe(2);
    expect(f.priceMax).toBe(50000);
    expect(f.terms).toEqual([]);
  });

  it('works without diacritics and with district shorthand', () => {
    const f = parseQuery('bun bo q1 dang mo');
    expect(f.dishes).toEqual(['bun-bo']);
    expect(f.district).toBe('quan-1');
    expect(f.openNow).toBe(true);
  });

  it('prefers the longest dish phrase', () => {
    expect(parseQuery('bún bò huế').dishes).toEqual(['bun-bo']);
    expect(parseQuery('hủ tiếu gõ ăn khuya').dishes).toEqual(['hu-tieu']);
    expect(parseQuery('hủ tiếu gõ ăn khuya').lateNight).toBe(true);
  });

  it('keeps unknown words as terms', () => {
    expect(parseQuery('chả cua').terms).toEqual(['cha', 'cua']);
  });
});

describe('URL state', () => {
  it('explicit params override the parsed query', () => {
    const { filters } = readSearchParams({ q: 'phở dưới 50k', gia: '80000' });
    expect(filters.dishes).toEqual(['pho']);
    expect(filters.priceMax).toBe(80000);
  });

  it('removing a parsed filter rewrites the URL to explicit params', () => {
    const { filters } = readSearchParams({ q: 'món nước gần đây dưới 50k' });
    expect(filtersToQuery(withoutFilter(filters, 'priceMax'))).toBe('?nhom=mon-nuoc&r=2');
  });

  it('describes filters for the "Hiểu là" strip', () => {
    const { filters } = readSearchParams({ q: 'món nước gần đây dưới 50k' });
    expect(describeFilters(filters).map((c) => c.label)).toEqual(['món nước', '≤ 50.000đ', 'trong 2 km']);
  });
});

describe('searchRestaurants (demo data)', () => {
  const noon = new Date('2026-11-09T12:00:00+07:00');

  it('finds by keyword without diacritics', () => {
    const { items } = searchRestaurants(parseQuery('com tam'), { now: noon });
    expect(items.map((h) => h.restaurant.slug)).toContain('com-tam-suon-moc');
  });

  it('excludes unknown prices from price filters', () => {
    const { items } = searchRestaurants({ terms: [], dishes: [], priceMax: 1_000_000 }, { now: noon, limit: 50 });
    expect(items.map((h) => h.restaurant.slug)).not.toContain('che-co-sau');
  });

  it('late-night filter keeps overnight places', () => {
    const { items } = searchRestaurants({ terms: [], dishes: [], lateNight: true }, { now: noon, limit: 50 });
    expect(items.map((h) => h.restaurant.slug)).toContain('chao-ech-dem-sai-gon');
    expect(items.map((h) => h.restaurant.slug)).not.toContain('ca-phe-phin-goc-pho');
  });

  it('sorts by distance when the viewer location is known', () => {
    const origin = { lat: 10.7725, lng: 106.698 };
    const { items } = searchRestaurants({ terms: [], dishes: [] }, { origin, now: noon, limit: 50 });
    const d = items.map((h) => h.distance ?? 0);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });

  it('sorts editor picks first when the location is unknown', () => {
    const { items } = searchRestaurants({ terms: [], dishes: [] }, { now: noon, limit: 50 });
    const firstNonPick = items.findIndex((h) => !h.restaurant.editorPick);
    expect(items.slice(firstNonPick).some((h) => h.restaurant.editorPick)).toBe(false);
  });
});
