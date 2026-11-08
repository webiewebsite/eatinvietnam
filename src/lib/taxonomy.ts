import taxonomy from '@content/taxonomy.json';
import { toSearchText } from '@/lib/search/normalize';

export interface Dish {
  slug: string;
  label: string;
  group: string;
  origin: string;
  keywords: string[];
}
export interface Group {
  slug: string;
  label: string;
}
export interface District {
  slug: string;
  label: string;
  short: string;
  keywords: string[];
}

export const DISHES: Dish[] = taxonomy.dishes;
export const GROUPS: Group[] = taxonomy.groups;
export const DISTRICTS: District[] = taxonomy.districts;

const dishBySlug = new Map(DISHES.map((d) => [d.slug, d]));
const groupBySlug = new Map(GROUPS.map((g) => [g.slug, g]));
const districtBySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

export const getDish = (slug: string) => dishBySlug.get(slug);
export const getGroup = (slug: string) => groupBySlug.get(slug);
export const getDistrict = (slug: string) => districtBySlug.get(slug);

export const dishLabel = (slug: string) => dishBySlug.get(slug)?.label ?? slug;
export const districtLabel = (slug: string) => districtBySlug.get(slug)?.label ?? slug;

/** Keyword → slug lookup tables, longest phrase first so "bun bo hue" wins over "bun bo". */
export const DISH_KEYWORDS = DISHES.flatMap((d) =>
  [d.label, ...d.keywords].map((k) => ({ key: toSearchText(k), slug: d.slug })),
).sort((a, b) => b.key.length - a.key.length);

export const DISTRICT_KEYWORDS = DISTRICTS.flatMap((d) =>
  [d.label, ...d.keywords].map((k) => ({ key: toSearchText(k), slug: d.slug })),
).sort((a, b) => b.key.length - a.key.length);
