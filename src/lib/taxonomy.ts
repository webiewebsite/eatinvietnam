import taxonomy from '@content/taxonomy.json';
import { toSearchText } from '@/lib/search/normalize';

/** Icon badge colours (ops doc item 9): background + glyph, light and dark. */
export interface DishColor {
  bg: string;
  fg: string;
  bgDark: string;
  fgDark: string;
}
export interface Dish {
  slug: string;
  label: string;
  group: string;
  origin: string;
  keywords: string[];
  /** Missing → the group's colour (dishes added later). */
  color?: DishColor;
}
export interface Group {
  slug: string;
  label: string;
  color?: DishColor;
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

/** The dish's own colour, else its group's; null for an unknown slug. */
export const dishColor = (slug: string): DishColor | null => {
  const d = dishBySlug.get(slug);
  if (!d) return null;
  return d.color ?? groupBySlug.get(d.group)?.color ?? null;
};

export const dishLabel = (slug: string) => dishBySlug.get(slug)?.label ?? slug;
export const districtLabel = (slug: string) => districtBySlug.get(slug)?.label ?? slug;

/** Keyword → slug lookup tables, longest phrase first so "bun bo hue" wins over "bun bo". */
export const DISH_KEYWORDS = DISHES.flatMap((d) =>
  [d.label, ...d.keywords].map((k) => ({ key: toSearchText(k), slug: d.slug })),
).sort((a, b) => b.key.length - a.key.length);

export const DISTRICT_KEYWORDS = DISTRICTS.flatMap((d) =>
  [d.label, ...d.keywords].map((k) => ({ key: toSearchText(k), slug: d.slug })),
).sort((a, b) => b.key.length - a.key.length);
