/**
 * In-memory source over src/data/demo-restaurants.ts. Used when DATABASE_URL is
 * unset (local dev, CI build/screenshots) and as the reference the DB source is
 * checked against in CI (scripts/db-parity.ts).
 */
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { toHit, type RestaurantHit } from '@/lib/cards';
import { inBBox } from '@/lib/geo';
import { isLateNight, openState } from '@/lib/hours';
import { matchesAllTerms, toStoredSearchText } from '@/lib/search/normalize';
import { dishLabel, districtLabel, getDish } from '@/lib/taxonomy';
import type { Restaurant } from '@/lib/types';
import { isVerificationOverdue } from '@/lib/verification';
import type { RestaurantSource, SearchQuery } from './source';

/** Same text the seed writes into restaurants.search_text. */
export const demoSearchText = (r: Restaurant) =>
  toStoredSearchText(
    r.name,
    r.dishes.map(dishLabel).join(' '),
    districtLabel(r.district),
    r.venueType,
    r.highlight,
    r.features.join(' '),
    r.menu.map((m) => m.name).join(' '),
  );

const PUBLIC = DEMO_RESTAURANTS.filter((r) => r.status === 'verified');
const SEARCH_TEXT = new Map(PUBLIC.map((r) => [r.slug, demoSearchText(r)]));

/** Editorial rank: editor picks first, then rating. Ties keep list order (= insertion id in the DB). */
const byEditorial = (a: RestaurantHit, b: RestaurantHit) =>
  Number(b.restaurant.editorPick) - Number(a.restaurant.editorPick) || b.restaurant.rating.avg - a.restaurant.rating.avg;

function search({ filters, origin, now, bbox, limit, offset }: SearchQuery) {
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
    .map((r) => toHit(r, origin, now))
    .filter((h) => !filters.openNow || h.state.open)
    // "Trong 2 km" needs a real origin; without one the filter is ignored (reported by lib/restaurants).
    .filter((h) => filters.radiusKm == null || h.distance == null || h.distance <= filters.radiusKm * 1000);

  const sorted =
    filters.sort === 'rating'
      ? matched.sort((a, b) => b.restaurant.rating.avg - a.restaurant.rating.avg)
      : origin
        ? matched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
        : matched.sort(byEditorial);

  return { restaurants: sorted.slice(offset, offset + limit).map((h) => h.restaurant), total: sorted.length };
}

export const demoSource: RestaurantSource = {
  kind: 'demo',
  getBySlug: async (slug) => PUBLIC.find((r) => r.slug === slug),
  getBySlugs: async (slugs) => PUBLIC.filter((r) => slugs.includes(r.slug)),
  listSlugs: async () => PUBLIC.map((r) => r.slug),
  listIndex: async () => PUBLIC.map((r) => ({ slug: r.slug, dishes: r.dishes, district: r.district })),
  search: async (q) => search(q),
  countAll: async () => PUBLIC.length,
  countOpen: async (now) => PUBLIC.filter((r) => openState(r.hours, now).open).length,
  overdue: async (now) =>
    PUBLIC.filter((r) => isVerificationOverdue(r.verifiedAt, now))
      .sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt))
      .map((r) => ({ slug: r.slug, name: r.name, verifiedAt: r.verifiedAt })),
};
