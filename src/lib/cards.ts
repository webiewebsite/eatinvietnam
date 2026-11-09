/**
 * Client-safe shapes built from a Restaurant. No data source imports here: client
 * components (cards, map, saved list) import from this file, never from lib/restaurants
 * (which can load the database driver).
 */
import { distanceFields, type DistanceFields } from '@/lib/distance';
import { formatPriceRange } from '@/lib/format';
import type { LatLng } from '@/lib/geo';
import { openLabel, openState, type OpenState } from '@/lib/hours';
import { isVerificationOverdue } from '@/lib/verification';
import { dishLabel, districtLabel } from '@/lib/taxonomy';
import type { Photo, Restaurant } from '@/lib/types';

export const OPEN_TONE_CLASS = { open: 'text-raurau', later: 'text-muted', closed: 'text-danger' } as const;

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

/**
 * Distance labels always come from lib/distance (same formula as the client map), even
 * when the database filtered and sorted by ST_Distance_Sphere: both are the haversine
 * formula and differ by a few ppm, so the rounded label is identical on every screen.
 */
export const toHit = (r: Restaurant, origin: LatLng | null, now: Date): RestaurantHit => ({
  restaurant: r,
  ...distanceFields(origin, r),
  state: openState(r.hours, now),
});

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
