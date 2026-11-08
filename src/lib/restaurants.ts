/**
 * Restaurant read layer. Backed by demo data for now; the function signatures are
 * what the MySQL/Drizzle implementation (issues #4, #6) will keep.
 *
 * `origin` is the viewer's location (see lib/location.ts) or null when unknown.
 * Unknown origin → no distances, no radius filter, lists sorted by editorial rank.
 */
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { distanceFields, type DistanceFields } from '@/lib/distance';
import { formatPriceRange } from '@/lib/format';
import { inBBox, type BBox, type LatLng } from '@/lib/geo';
import { isLateNight, openLabel, openState, type OpenState } from '@/lib/hours';
import { matchesAllTerms, toStoredSearchText } from '@/lib/search/normalize';
import { isVerificationOverdue } from '@/lib/verification';
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

export interface RestaurantHit extends DistanceFields {
  restaurant: Restaurant;
  state: OpenState;
}

/** Serializable shape passed to client components (cards, map, saved list). */
export interface CardData extends DistanceFields {
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
  isOpen: boolean;
  /** open → raurau, later today/tomorrow → muted, closed → danger */
  openTone: 'open' | 'later' | 'closed';
  openLabel: string;
  highlight: string;
  editorPick: boolean;
  /** Past the re-verification deadline → shown as "chưa cập nhật". */
  stale: boolean;
  lat: number;
  lng: number;
}

export function toCard(hit: RestaurantHit, now: Date = new Date()): CardData {
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
    distanceLabel: hit.distanceLabel,
    isOpen: hit.state.open,
    openTone: hit.state.open ? 'open' : hit.state.opensAt ? 'later' : 'closed',
    openLabel: openLabel(hit.state),
    highlight: r.highlight,
    editorPick: r.editorPick,
    stale: isVerificationOverdue(r.verifiedAt, now),
    lat: r.lat,
    lng: r.lng,
  };
}

const hit = (r: Restaurant, origin: LatLng | null, now: Date): RestaurantHit => ({
  restaurant: r,
  ...distanceFields(origin, r),
  state: openState(r.hours, now),
});

/** Editorial rank: editor picks first, then rating. Used when there is no distance to sort by. */
const byEditorial = (a: RestaurantHit, b: RestaurantHit) =>
  Number(b.restaurant.editorPick) - Number(a.restaurant.editorPick) || b.restaurant.rating.avg - a.restaurant.rating.avg;

export function getRestaurant(slug: string): Restaurant | undefined {
  return PUBLIC.find((r) => r.slug === slug);
}

export function getHit(slug: string, origin: LatLng | null = null, now = new Date()): RestaurantHit | undefined {
  const r = getRestaurant(slug);
  return r ? hit(r, origin, now) : undefined;
}

export function listSlugs(): string[] {
  return PUBLIC.map((r) => r.slug);
}

export function getCardsBySlugs(slugs: string[], origin: LatLng | null = null, now = new Date()): CardData[] {
  const bySlug = new Map(PUBLIC.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => {
    const r = bySlug.get(s);
    return r ? [toCard(hit(r, origin, now), now)] : [];
  });
}

export interface SearchOptions {
  origin?: LatLng | null;
  now?: Date;
  bbox?: BBox;
  limit?: number;
  offset?: number;
}

export function searchRestaurants(
  filters: SearchFilters,
  { origin = null, now = new Date(), bbox, limit = 20, offset = 0 }: SearchOptions = {},
): { items: RestaurantHit[]; total: number; radiusIgnored: boolean } {
  const matched = PUBLIC.filter((r) => {
    if (filters.dishes.length && !filters.dishes.some((d) => r.dishes.includes(d))) return false;
    if (filters.group && !r.dishes.some((d) => getDish(d)?.group === filters.group)) return false;
    if (filters.district && r.district !== filters.district) return false;
    // "Dưới 50k" (ops, 09/11) = the most a person typically pays is ≤ the limit.
    // Unknown price is excluded: we can't promise "≤ 50k".
    if (filters.priceMax != null) {
      const top = r.priceMax ?? r.priceMin;
      if (top == null || top > filters.priceMax) return false;
    }
    if (filters.lateNight && !isLateNight(r.hours)) return false;
    if (bbox && !inBBox(r, bbox)) return false;
    if (filters.terms.length && !matchesAllTerms(SEARCH_TEXT.get(r.slug) ?? '', filters.terms)) return false;
    return true;
  })
    .map((r) => hit(r, origin, now))
    .filter((h) => !filters.openNow || h.state.open)
    // "Trong 2 km" needs a real origin; without one the filter is reported as ignored.
    .filter((h) => filters.radiusKm == null || h.distance == null || h.distance <= filters.radiusKm * 1000);

  const sorted =
    filters.sort === 'rating'
      ? matched.sort((a, b) => b.restaurant.rating.avg - a.restaurant.rating.avg)
      : origin
        ? matched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
        : matched.sort(byEditorial);

  return {
    items: sorted.slice(offset, offset + limit),
    total: sorted.length,
    radiusIgnored: filters.radiusKm != null && !origin,
  };
}

export const emptyFilters = (): SearchFilters => ({ terms: [], dishes: [] });

export function nearby(origin: LatLng | null, limit = 8, now = new Date()) {
  return searchRestaurants(emptyFilters(), { origin, now, limit }).items;
}

export function lateNight(origin: LatLng | null, limit = 5, now = new Date()) {
  return searchRestaurants({ ...emptyFilters(), lateNight: true }, { origin, now, limit }).items;
}

/** Ranked list for a dish landing page: editor picks first, then rating. */
export function topForDish(dish: string, district?: string, now = new Date()) {
  const { items } = searchRestaurants({ ...emptyFilters(), dishes: [dish], district }, { now, limit: 50 });
  return items.sort(byEditorial);
}

export function countOpen(now = new Date()) {
  return PUBLIC.filter((r) => openState(r.hours, now).open).length;
}

/** Verified restaurants past their re-verification deadline, oldest first (cron + admin). */
export function overdueForReverification(now = new Date()) {
  return PUBLIC.filter((r) => isVerificationOverdue(r.verifiedAt, now))
    .sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt))
    .map((r) => ({ slug: r.slug, name: r.name, verifiedAt: r.verifiedAt }));
}

export function countAll() {
  return PUBLIC.length;
}
