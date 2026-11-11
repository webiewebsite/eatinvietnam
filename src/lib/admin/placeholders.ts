/**
 * Markers the file import (#48) leaves on data an editor still has to check. Pure (used by
 * the admin form, the API and the import script). `missingForPublish` refuses to verify a
 * restaurant while any marker is still there, so imported guesses never reach public pages.
 */

/**
 * Stand-in coordinates per legacy district, used when a row has none (`location` is NOT NULL
 * for the spatial index). Deliberately odd decimals so a real pin never equals one by chance.
 */
export const PLACEHOLDER_COORDS: Record<string, { lat: number; lng: number }> = {
  'quan-1': { lat: 10.775551, lng: 106.700119 },
  'quan-2': { lat: 10.787771, lng: 106.749991 },
  'quan-3': { lat: 10.783331, lng: 106.686661 },
  'quan-4': { lat: 10.759991, lng: 106.704441 },
  'binh-thanh': { lat: 10.810011, lng: 106.709991 },
};
/** Fallback when the district has no entry above (city centre, same odd-decimal pattern). */
export const PLACEHOLDER_CITY = { lat: 10.776661, lng: 106.700991 };

export const placeholderFor = (district: string) => PLACEHOLDER_COORDS[district] ?? PLACEHOLDER_CITY;

const same = (a: number, b: number) => Math.abs(a - b) < 1e-7;
export function isPlaceholderCoords(c: { lat: number; lng: number }): boolean {
  return [...Object.values(PLACEHOLDER_COORDS), PLACEHOLDER_CITY].some((p) => same(p.lat, c.lat) && same(p.lng, c.lng));
}

/**
 * Menu group for items copied from a delivery app: delivery prices, unchecked names. The
 * editor renames the group (or deletes the items) once checked at the restaurant.
 */
export const UNCHECKED_MENU_GROUP = 'Cần kiểm tra (từ ShopeeFood)';
