/**
 * OpenStreetMap suggestions for the "Thêm quán" form (#30, decision #4): OSM is a hint only.
 * An editor searches by name, picks a candidate to prefill name/address/coordinates, then
 * checks everything at the restaurant. No OSM id is stored, nothing is imported in bulk.
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * an identifying User-Agent, at most 1 request per second for the whole app, cache results,
 * and no search-as-you-type — the form searches only when the editor presses "Tìm".
 * Data © OpenStreetMap contributors, ODbL — the admin shows the attribution.
 */
import { siteUrl } from '@/lib/seo';

export interface OsmSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** e.g. "restaurant", "cafe", "fast_food" */
  kind: string;
  cuisine: string | null;
  /** Raw OSM opening_hours ("Mo-Su 06:00-21:00"): shown to the editor, never parsed into hours. */
  openingHours: string | null;
  phone: string | null;
  /** Link for the editor to look at the object on openstreetmap.org (not stored). */
  osmUrl: string;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
// HCMC (west, north, east, south) — the launch city.
const VIEWBOX = '106.35,11.20,107.05,10.35';
const FOOD = new Set(['restaurant', 'cafe', 'fast_food', 'food_court', 'bar', 'pub', 'ice_cream', 'bakery', 'deli', 'confectionery', 'pastry']);

interface NominatimItem {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

/** Pure: Nominatim jsonv2 → suggestions, food places first. Exported for tests. */
export function parseNominatim(items: unknown): OsmSuggestion[] {
  if (!Array.isArray(items)) return [];
  const out = (items as NominatimItem[]).flatMap((it): OsmSuggestion[] => {
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    const name = (it.name ?? '').trim() || (it.display_name ?? '').split(',')[0]!.trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const a = it.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const address = [street, a.quarter ?? a.neighbourhood ?? a.suburb, a.city_district, a.city ?? a.state]
      .filter((x, i, arr) => x && arr.indexOf(x) === i)
      .join(', ');
    const t = it.extratags ?? {};
    return [
      {
        name,
        address: address || (it.display_name ?? ''),
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        kind: it.type ?? it.category ?? '',
        cuisine: t.cuisine ?? null,
        openingHours: t.opening_hours ?? null,
        phone: t.phone ?? t['contact:phone'] ?? null,
        osmUrl: it.osm_type && it.osm_id ? `https://www.openstreetmap.org/${it.osm_type}/${it.osm_id}` : 'https://www.openstreetmap.org/',
      },
    ];
  });
  return out.sort((x, y) => Number(FOOD.has(y.kind)) - Number(FOOD.has(x.kind)));
}

// ── Throttle + cache (one Node process on Hostinger) ────────────────────────

const MIN_GAP_MS = 1100;
const CACHE_MS = 24 * 3600_000;
const g = globalThis as unknown as {
  __eivOsm?: { queue: Promise<unknown>; last: number; cache: Map<string, { at: number; value: OsmSuggestion[] }> };
};
const state = () => (g.__eivOsm ??= { queue: Promise.resolve(), last: 0, cache: new Map() });

/** Runs `fn` after every earlier call, at least MIN_GAP_MS after the previous one started. */
function throttled<T>(fn: () => Promise<T>, now: () => number, sleep: (ms: number) => Promise<void>): Promise<T> {
  const s = state();
  const run = s.queue.then(async () => {
    const wait = s.last + MIN_GAP_MS - now();
    if (wait > 0) await sleep(wait);
    s.last = now();
    return fn();
  });
  s.queue = run.catch(() => undefined);
  return run;
}

export const normaliseQuery = (q: string) => q.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export async function searchOsm(
  query: string,
  deps: { fetch?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<OsmSuggestion[]> {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const key = normaliseQuery(query);
  const s = state();
  const hit = s.cache.get(key);
  if (hit && now() - hit.at < CACHE_MS) return hit.value;

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    countrycodes: 'vn',
    viewbox: VIEWBOX,
    bounded: '1',
    addressdetails: '1',
    extratags: '1',
    limit: '8',
    'accept-language': 'vi',
  }).toString();

  const value = await throttled(
    async () => {
      const res = await doFetch(url, {
        headers: { 'User-Agent': `EatInVietnam-admin/1.0 (+${siteUrl()})`, Referer: siteUrl() },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      return parseNominatim(await res.json());
    },
    now,
    sleep,
  );
  if (s.cache.size > 500) s.cache.clear();
  s.cache.set(key, { at: now(), value });
  return value;
}

/** Test hook. */
export const resetOsmState = () => {
  g.__eivOsm = undefined;
};
