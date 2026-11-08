/**
 * The viewer's location — ONE source for every distance shown in the app.
 *
 * Stored in the `eiv_loc` cookie, rounded to 3 decimals (~110 m) so it is not a
 * precise trace of the person, and so server and client compute the exact same
 * distances. Set only after the person grants geolocation (button or /ban-do).
 * No location → no distances are shown anywhere (never "from Q1" disguised as
 * "from you").
 */
import type { LatLng } from '@/lib/geo';

export const LOC_COOKIE = 'eiv_loc';
export const LOC_MAX_AGE = 60 * 60 * 24; // 1 day: people move

// Generous Vietnam bounding box; anything outside is ignored (bad/forged value).
const VN = { minLat: 8, maxLat: 24, minLng: 102, maxLng: 110 };

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function roundLocation(p: LatLng): LatLng {
  return { lat: round3(p.lat), lng: round3(p.lng) };
}

export function formatLocCookie(p: LatLng): string {
  const r = roundLocation(p);
  return `${r.lat},${r.lng}`;
}

export function parseLocCookie(value: string | null | undefined): LatLng | null {
  if (!value) return null;
  const parts = decodeURIComponent(value).split(',');
  if (parts.length !== 2) return null;
  const [lat, lng] = parts.map(Number) as [number, number];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < VN.minLat || lat > VN.maxLat || lng < VN.minLng || lng > VN.maxLng) return null;
  return roundLocation({ lat, lng });
}
