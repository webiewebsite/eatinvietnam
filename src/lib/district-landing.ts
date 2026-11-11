/**
 * District landing ("Ăn gì ở Quận 1?", #49): numbers and FAQ answers computed from the
 * verified restaurants of one legacy district, plus the editorial copy in content/districts.json.
 * Pure: the page passes the restaurants in.
 */
import districtCopy from '@content/districts.json';
import { formatPriceRange } from '@/lib/format';
import { isLateNight } from '@/lib/hours';
import { DISHES, type District } from '@/lib/taxonomy';
import type { Restaurant } from '@/lib/types';

/** "Dưới 50k" = highest price per person ≤ 50k; restaurants without a price are left out (ops, 09/11). */
export const CHEAP_MAX = 50_000;

export interface DistrictCopy {
  intro?: string;
  /** Optional meta description; otherwise generated from the numbers. */
  description?: string;
  faq?: { q: string; a: string }[];
}

export function getDistrictCopy(slug: string): DistrictCopy {
  return (districtCopy as unknown as Record<string, DistrictCopy | undefined>)[slug] ?? {};
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
};

export interface DistrictStats {
  total: number;
  /** Dishes present in the district, most restaurants first (taxonomy order on ties). */
  dishes: { slug: string; label: string; count: number }[];
  /** Median lowest – median highest price per person, e.g. "35–80k". */
  typicalPrice: string | null;
  picks: Restaurant[];
  late: Restaurant[];
  cheap: Restaurant[];
}

export function districtStats(rs: Restaurant[]): DistrictStats {
  const dishes = DISHES.map((d) => ({ slug: d.slug, label: d.label, count: rs.filter((r) => r.dishes.includes(d.slug)).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count); // stable: taxonomy order on ties
  const mins = rs.flatMap((r) => (r.priceMin != null ? [r.priceMin] : []));
  const maxs = rs.flatMap((r) => (r.priceMax != null ? [r.priceMax] : []));
  return {
    total: rs.length,
    dishes,
    typicalPrice: formatPriceRange(median(mins), median(maxs)),
    picks: rs.filter((r) => r.editorPick),
    late: rs.filter((r) => isLateNight(r.hours)),
    cheap: rs.filter((r) => r.priceMax != null && r.priceMax <= CHEAP_MAX),
  };
}

const names = (rs: Restaurant[], n = 5) => {
  const shown = rs.slice(0, n).map((r) => r.name);
  return rs.length > n ? `${shown.join(', ')} và ${rs.length - n} quán khác` : shown.join(', ');
};

/**
 * FAQ = answers generated from the data (only when there is something to say, so no empty
 * "chưa có" answers reach FAQPage markup) + the editorial questions from content/districts.json.
 */
export function districtFaq(district: District, s: DistrictStats, copy: DistrictCopy): { q: string; a: string }[] {
  const at = district.label;
  const faq: { q: string; a: string }[] = [];
  if (s.dishes.length) {
    const top = s.dishes
      .slice(0, 4)
      .map((d) => `${d.label.toLowerCase()} (${d.count} quán)`)
      .join(', ');
    const picks = s.picks.length ? ` Biên tập chọn: ${names(s.picks, 3)}.` : '';
    faq.push({ q: `Ăn gì ở ${at}?`, a: `Nhiều quán nhất là ${top}.${picks}` });
  }
  if (s.typicalPrice) {
    faq.push({ q: `Ăn ở ${at} tốn khoảng bao nhiêu?`, a: `Giá phổ biến khoảng ${s.typicalPrice}/người, tính từ ${s.total} quán đã xác minh.` });
  }
  if (s.late.length) faq.push({ q: `Ăn khuya ở ${at} ở đâu?`, a: `Mở sau 22:00: ${names(s.late)}.` });
  if (s.cheap.length) faq.push({ q: `Ăn gì dưới 50k ở ${at}?`, a: `Giá cao nhất từ 50k trở xuống: ${names(s.cheap)}.` });
  return [...faq, ...(copy.faq ?? []).filter((f) => f.q && f.a && !/^\[/.test(f.a))];
}

export function districtDescription(district: District, s: DistrictStats, copy: DistrictCopy): string {
  if (copy.description) return copy.description;
  const top = s.dishes
    .slice(0, 3)
    .map((d) => d.label.toLowerCase())
    .join(', ');
  return `${s.total} quán ăn đã được biên tập xác minh ở ${district.label}, Sài Gòn${top ? `: ${top}` : ''}. Xem giờ mở, giá và chỉ đường.`;
}
