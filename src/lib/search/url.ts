/**
 * Search state lives in the URL so results are shareable and Back works.
 * `q` is free text; the other params are explicit filters. Effective filters =
 * parse(q) overridden by explicit params. Removing a filter that came from `q`
 * rewrites the URL into explicit params + leftover terms.
 */
import { formatPrice } from '@/lib/format';
import { dishLabel, districtLabel, getGroup } from '@/lib/taxonomy';
import type { SearchFilters } from '@/lib/types';
import { parseQuery } from './rule-parser';

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readSearchParams(sp: RawParams): { q: string; filters: SearchFilters; page: number } {
  const q = (first(sp.q) ?? '').slice(0, 200);
  const f = q ? parseQuery(q) : { terms: [], dishes: [] };

  const mon = first(sp.mon);
  if (mon) f.dishes = mon.split(',').filter(Boolean);
  const nhom = first(sp.nhom);
  if (nhom) f.group = nhom;
  const quan = first(sp.quan);
  if (quan) f.district = quan;
  const gia = Number(first(sp.gia));
  if (Number.isFinite(gia) && gia > 0) f.priceMax = gia;
  const r = Number(first(sp.r));
  if (Number.isFinite(r) && r > 0) f.radiusKm = r;
  if (first(sp.mo) === '1') f.openNow = true;
  if (first(sp.khuya) === '1') f.lateNight = true;
  const sap = first(sp.sap);
  if (sap === 'danh-gia') f.sort = 'rating';

  const page = Math.max(1, Number(first(sp.trang)) || 1);
  return { q, filters: f, page };
}

/** Serialises filters as explicit params (terms go back into `q`). */
export function filtersToQuery(f: SearchFilters): string {
  const p = new URLSearchParams();
  if (f.terms.length) p.set('q', f.terms.join(' '));
  if (f.dishes.length) p.set('mon', f.dishes.join(','));
  if (f.group) p.set('nhom', f.group);
  if (f.district) p.set('quan', f.district);
  if (f.priceMax) p.set('gia', String(f.priceMax));
  if (f.radiusKm) p.set('r', String(f.radiusKm));
  if (f.openNow) p.set('mo', '1');
  if (f.lateNight) p.set('khuya', '1');
  if (f.sort === 'rating') p.set('sap', 'danh-gia');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export type FilterKey = 'terms' | 'dishes' | 'group' | 'district' | 'priceMax' | 'radiusKm' | 'openNow' | 'lateNight';

export interface FilterChip {
  key: FilterKey;
  label: string;
}

/** Human labels for the "Hiểu là: …" strip, in a stable order. */
export function describeFilters(f: SearchFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.dishes.length) chips.push({ key: 'dishes', label: f.dishes.map(dishLabel).join(', ').toLowerCase() });
  if (f.group) chips.push({ key: 'group', label: (getGroup(f.group)?.label ?? f.group).toLowerCase() });
  if (f.priceMax) chips.push({ key: 'priceMax', label: `≤ ${formatPrice(f.priceMax)}` });
  if (f.radiusKm) chips.push({ key: 'radiusKm', label: `trong ${f.radiusKm} km` });
  if (f.district) chips.push({ key: 'district', label: districtLabel(f.district) });
  if (f.openNow) chips.push({ key: 'openNow', label: 'đang mở' });
  if (f.lateNight) chips.push({ key: 'lateNight', label: 'mở khuya' });
  if (f.terms.length) chips.push({ key: 'terms', label: `“${f.terms.join(' ')}”` });
  return chips;
}

export function withoutFilter(f: SearchFilters, key: FilterKey): SearchFilters {
  const next: SearchFilters = { ...f, terms: [...f.terms], dishes: [...f.dishes] };
  if (key === 'terms') next.terms = [];
  else if (key === 'dishes') next.dishes = [];
  else delete next[key];
  return next;
}

export const hasAnyFilter = (f: SearchFilters) => describeFilters(f).length > 0;
