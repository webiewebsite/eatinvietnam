import type { BBox, LatLng } from '@/lib/geo';
import type { Restaurant, SearchFilters } from '@/lib/types';

export type DataSourceKind = 'demo' | 'db';

/**
 * Database when DATABASE_URL is set, demo data otherwise. DATA_SOURCE=demo forces
 * demo data even with a database (escape hatch in hPanel if the DB misbehaves).
 */
export function dataSourceKind(env: Record<string, string | undefined> = process.env): DataSourceKind {
  if (env.DATA_SOURCE === 'demo') return 'demo';
  return env.DATABASE_URL ? 'db' : 'demo';
}

export interface SearchQuery {
  filters: SearchFilters;
  origin: LatLng | null;
  now: Date;
  bbox?: BBox;
  limit: number;
  offset: number;
}

/** Lightweight row for sitemaps / thin-page checks: no hours, photos or menu. */
export interface IndexRow {
  slug: string;
  dishes: string[];
  district: string;
}

export interface OverdueRow {
  slug: string;
  name: string;
  verifiedAt: string;
}

/**
 * Both implementations return only `verified` restaurants and apply the same rules
 * (CI checks them against each other: scripts/db-parity.ts).
 */
export interface RestaurantSource {
  kind: DataSourceKind;
  getBySlug(slug: string): Promise<Restaurant | undefined>;
  /** Any order; unknown or non-public slugs are skipped. */
  getBySlugs(slugs: string[]): Promise<Restaurant[]>;
  listSlugs(): Promise<string[]>;
  /** Every public restaurant's slug, dish slugs and legacy district, in creation order. */
  listIndex(): Promise<IndexRow[]>;
  /** Filtered, sorted and paged. Sort: rating | distance (with origin) | editorial. */
  search(q: SearchQuery): Promise<{ restaurants: Restaurant[]; total: number }>;
  countAll(): Promise<number>;
  countOpen(now: Date): Promise<number>;
  /** Past the re-verification deadline, oldest verification first. */
  overdue(now: Date): Promise<OverdueRow[]>;
}
