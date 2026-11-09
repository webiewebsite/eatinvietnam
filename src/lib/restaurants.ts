/**
 * Restaurant read layer (server-only). Reads the database when DATABASE_URL is set
 * (issue #6) and the demo list otherwise; see lib/data/source.ts. Client components
 * import shapes from lib/cards instead, so the DB driver never reaches the browser.
 *
 * `origin` is the viewer's location (see lib/location.ts) or null when unknown.
 * Unknown origin → no distances, no radius filter, lists sorted by editorial rank.
 */
import { cache } from 'react';
import { toCard, toHit, type CardData, type RestaurantHit } from '@/lib/cards';
import type { BBox, LatLng } from '@/lib/geo';
import type { Restaurant, SearchFilters } from '@/lib/types';
import { demoSource } from './data/demo';
import { dataSourceKind, type RestaurantSource } from './data/source';

export { OPEN_TONE_CLASS, toCard, type CardData, type RestaurantHit } from '@/lib/cards';

/** The DB driver is only loaded when a database is configured (keeps demo/tests light). */
async function source(): Promise<RestaurantSource> {
  if (dataSourceKind() === 'demo') return demoSource;
  return (await import('./data/db')).dbSource;
}

/** Deduplicated per request: generateMetadata and the page share one lookup. */
export const getRestaurant = cache(async (slug: string): Promise<Restaurant | undefined> => (await source()).getBySlug(slug));

export async function getHit(slug: string, origin: LatLng | null = null, now = new Date()): Promise<RestaurantHit | undefined> {
  const r = await getRestaurant(slug);
  return r ? toHit(r, origin, now) : undefined;
}

export async function listSlugs(): Promise<string[]> {
  return (await source()).listSlugs();
}

/** Slug, dishes and district of every public restaurant (sitemap: one pass instead of a query per page). */
export async function listIndex() {
  return (await source()).listIndex();
}

/** Cards in the order of `slugs` (saved lists, shared links). Unknown/unpublished slugs are dropped. */
export async function getCardsBySlugs(slugs: string[], origin: LatLng | null = null, now = new Date()): Promise<CardData[]> {
  const found = await (await source()).getBySlugs(slugs);
  const bySlug = new Map(found.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => {
    const r = bySlug.get(s);
    return r ? [toCard(toHit(r, origin, now), now)] : [];
  });
}

export interface SearchOptions {
  origin?: LatLng | null;
  now?: Date;
  bbox?: BBox;
  limit?: number;
  offset?: number;
}

export async function searchRestaurants(
  filters: SearchFilters,
  { origin = null, now = new Date(), bbox, limit = 20, offset = 0 }: SearchOptions = {},
): Promise<{ items: RestaurantHit[]; total: number; radiusIgnored: boolean }> {
  const { restaurants, total } = await (await source()).search({ filters, origin, now, bbox, limit, offset });
  return {
    items: restaurants.map((r) => toHit(r, origin, now)),
    total,
    radiusIgnored: filters.radiusKm != null && !origin,
  };
}

export const emptyFilters = (): SearchFilters => ({ terms: [], dishes: [] });

export async function nearby(origin: LatLng | null, limit = 8, now = new Date()) {
  return (await searchRestaurants(emptyFilters(), { origin, now, limit })).items;
}

export async function lateNight(origin: LatLng | null, limit = 5, now = new Date()) {
  return (await searchRestaurants({ ...emptyFilters(), lateNight: true }, { origin, now, limit })).items;
}

/** Ranked list for a dish landing page: editor picks first, then rating (no origin → editorial order). */
export async function topForDish(dish: string, district?: string, now = new Date()) {
  return (await searchRestaurants({ ...emptyFilters(), dishes: [dish], district }, { now, limit: 50 })).items;
}

export async function countOpen(now = new Date()) {
  return (await source()).countOpen(now);
}

export async function countAll() {
  return (await source()).countAll();
}

/** Verified restaurants past their re-verification deadline, oldest first (cron + admin). */
export async function overdueForReverification(now = new Date()) {
  return (await source()).overdue(now);
}
