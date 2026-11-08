/**
 * Restaurant read layer. Backed by demo data for now; the function signatures are
 * what the MySQL/Drizzle implementation (issues #4, #6) will keep.
 */
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { formatDistance, formatPriceRange } from '@/lib/format';
import { DEFAULT_CENTER, distanceMeters, inBBox, type BBox, type LatLng } from '@/lib/geo';
import { isLateNight, openLabel, openState, type OpenState } from '@/lib/hours';
import { matchesAllTerms, toStoredSearchText } from '@/lib/search/normalize';
import { dishLabel, districtLabel, getDish } from '@/lib/taxonomy';
import type { Photo, Restaurant, SearchFilters } from '@/lib/types';

export const OPEN_TONE_CLASS = { open: 'text-raurau', later: 'text-muted', closed: 'text-danger' } as const;

const PUBLIC = DEMO_RESTAURANTS.filter((r) => r.status === 'verified');

const SEARCH_TEXT = new Map(
  PUBLIC.map((r) => [
    r.slug,
    toStoredSearchText(
      r.name,
      r.dishes.map(dishLabel).join(' '),
      districtLabel(r.district),
      r.venueType,
      r.highlight,
      r.features.join(' '),
      r.menu.map((m) => m.name).join(' '),
    ),
  ]),
);

export interface RestaurantHit {
  restaurant: Restaurant;
  distance: number;
  state: OpenState;
}

/** Serializable shape passed to client components (cards, map, saved list). */
export interface CardData {
  slug: string;
  name: string;
  dish: string;
  dishLabel: string;
  district: string;
  districtLabel: string;
  venueType: string;
  photo: Photo | null;
  priceLabel: string | null;
  rating: { avg: number; count: number };
  distance: number;
  distanceLabel: string;
  isOpen: boolean;
  /** open → raurau, later today/tomorrow → muted, closed → danger */
  openTone: 'open' | 'later' | 'closed';
  openLabel: string;
  highlight: string;
  editorPick: boolean;
  lat: number;
  lng: number;
}

export function toCard(hit: RestaurantHit): CardData {
  const r = hit.restaurant;
  return {
    slug: r.slug,
    name: r.name,
    dish: r.dish,
    dishLabel: dishLabel(r.dish),
    district: r.district,
    districtLabel: districtLabel(r.district),
    venueType: r.venueType,
    photo: r.photos[0] ?? null,
    priceLabel: formatPriceRange(r.priceMin, r.priceMax),
    rating: r.rating,
    distance: hit.distance,
    distanceLabel: formatDistance(hit.distance),
    isOpen: hit.state.open,
    openTone: hit.state.open ? 'open' : hit.state.opensAt ? 'later' : 'closed',
    openLabel: openLabel(hit.state),
    highlight: r.highlight,
    editorPick: r.editorPick,
    lat: r.lat,
    lng: r.lng,
  };
}

const hit = (r: Restaurant, center: LatLng, now: Date): RestaurantHit => ({
  restaurant: r,
  distance: distanceMeters(center, r),
  state: openState(r.hours, now),
});

export function getRestaurant(slug: string): Restaurant | undefined {
  return PUBLIC.find((r) => r.slug === slug);
}

export function getHit(slug: string, center: LatLng = DEFAULT_CENTER, now = new Date()): RestaurantHit | undefined {
  const r = getRestaurant(slug);
  return r ? hit(r, center, now) : undefined;
}

export function listSlugs(): string[] {
  return PUBLIC.map((r) => r.slug);
}

export function getCardsBySlugs(slugs: string[], center: LatLng = DEFAULT_CENTER, now = new Date()): CardData[] {
  const bySlug = new Map(PUBLIC.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => {
    const r = bySlug.get(s);
    return r ? [toCard(hit(r, center, now))] : [];
  });
}

export interface SearchOptions {
  center?: LatLng;
  now?: Date;
  bbox?: BBox;
  limit?: number;
  offset?: number;
}

export function searchRestaurants(
  filters: SearchFilters,
  { center = DEFAULT_CENTER, now = new Date(), bbox, limit = 20, offset = 0 }: SearchOptions = {},
): { items: RestaurantHit[]; total: number } {
  const matched = PUBLIC.filter((r) => {
    if (filters.dishes.length && !filters.dishes.some((d) => r.dishes.includes(d))) return false;
    if (filters.group && !r.dishes.some((d) => getDish(d)?.group === filters.group)) return false;
    if (filters.district && r.district !== filters.district) return false;
    // Unknown price is excluded from price filters: we can't promise "≤ 50k".
    if (filters.priceMax != null && (r.priceMin == null || r.priceMin > filters.priceMax)) return false;
    if (filters.lateNight && !isLateNight(r.hours)) return false;
    if (bbox && !inBBox(r, bbox)) return false;
    if (filters.terms.length && !matchesAllTerms(SEARCH_TEXT.get(r.slug) ?? '', filters.terms)) return false;
    return true;
  })
    .map((r) => hit(r, center, now))
    .filter((h) => !filters.openNow || h.state.open)
    .filter((h) => filters.radiusKm == null || h.distance <= filters.radiusKm * 1000);

  const sorted =
    filters.sort === 'rating'
      ? matched.sort((a, b) => b.restaurant.rating.avg - a.restaurant.rating.avg)
      : matched.sort((a, b) => a.distance - b.distance);

  return { items: sorted.slice(offset, offset + limit), total: sorted.length };
}

export const emptyFilters = (): SearchFilters => ({ terms: [], dishes: [] });

export function nearby(center: LatLng = DEFAULT_CENTER, limit = 8, now = new Date()) {
  return searchRestaurants(emptyFilters(), { center, now, limit }).items;
}

export function lateNight(center: LatLng = DEFAULT_CENTER, limit = 5, now = new Date()) {
  return searchRestaurants({ ...emptyFilters(), lateNight: true }, { center, now, limit }).items;
}

/** Ranked list for a dish landing page: editor picks first, then rating. */
export function topForDish(dish: string, district?: string, now = new Date()) {
  const { items } = searchRestaurants(
    { ...emptyFilters(), dishes: [dish], district, sort: 'rating' },
    { now, limit: 50 },
  );
  return items.sort(
    (a, b) =>
      Number(b.restaurant.editorPick) - Number(a.restaurant.editorPick) || b.restaurant.rating.avg - a.restaurant.rating.avg,
  );
}

export function countOpen(now = new Date()) {
  return PUBLIC.filter((r) => openState(r.hours, now).open).length;
}

export function countAll() {
  return PUBLIC.length;
}
