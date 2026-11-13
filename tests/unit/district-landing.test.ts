import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { CHEAP_MAX, districtDescription, districtFaq, districtStats, getDistrictCopy } from '@/lib/district-landing';
import { isLateNight } from '@/lib/hours';
import { getDistrict } from '@/lib/taxonomy';
import type { Restaurant } from '@/lib/types';

const q1 = getDistrict('quan-1')!;
const inQ1 = DEMO_RESTAURANTS.filter((r) => r.district === 'quan-1');

describe('districtStats', () => {
  const s = districtStats(inQ1);
  it('counts dishes, most restaurants first', () => {
    expect(s.total).toBe(inQ1.length);
    expect(s.dishes.length).toBeGreaterThan(0);
    for (const d of s.dishes) expect(d.count).toBe(inQ1.filter((r) => r.dishes.includes(d.slug)).length);
    expect(s.dishes.map((d) => d.count)).toEqual([...s.dishes.map((d) => d.count)].sort((a, b) => b - a));
  });
  it('finds late-night, cheap and picked restaurants', () => {
    expect(s.late).toEqual(inQ1.filter((r) => isLateNight(r.hours)));
    expect(s.cheap.every((r) => r.priceMax != null && r.priceMax <= CHEAP_MAX)).toBe(true);
    expect(s.picks.every((r) => r.editorPick)).toBe(true);
  });
  it('uses medians for the typical price', () => {
    const r = (priceMin: number | null, priceMax: number | null) => ({ ...inQ1[0]!, priceMin, priceMax }) as Restaurant;
    expect(districtStats([r(30000, 50000), r(40000, 90000), r(100000, 200000)]).typicalPrice).toBe('40–90k');
    expect(districtStats([r(null, null)]).typicalPrice).toBeNull();
  });
  it('handles an empty district', () => {
    expect(districtStats([])).toMatchObject({ total: 0, dishes: [], typicalPrice: null });
  });
});

describe('districtFaq', () => {
  it('only asks questions the data can answer, then editorial ones', () => {
    const empty = districtFaq(q1, districtStats([]), {});
    expect(empty).toEqual([]);
    const faq = districtFaq(q1, districtStats(inQ1), { faq: [{ q: 'Ăn gần chợ Bến Thành?', a: 'Có.' }, { q: 'Chưa viết?', a: '[Câu trả lời biên tập]' }] });
    expect(faq[0]!.q).toBe('Ăn gì ở Quận 1?');
    expect(faq.at(-1)).toEqual({ q: 'Ăn gần chợ Bến Thành?', a: 'Có.' });
    expect(faq.some((f) => f.a.startsWith('['))).toBe(false);
  });
});

describe('copy', () => {
  it('has an intro for every launch district and a generated description', () => {
    for (const slug of ['quan-1', 'quan-3', 'quan-4']) expect(getDistrictCopy(slug).intro?.length).toBeGreaterThan(40);
    const desc = districtDescription(q1, districtStats(inQ1), {});
    expect(desc).toMatch(/^\d+ quán ăn đã được biên tập xác minh ở Quận 1/);
  });
});
