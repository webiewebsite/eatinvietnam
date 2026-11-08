/**
 * The only place a displayed distance is computed (server lists, client map, ISR pages).
 * Same rounded origin + same formula = same number on every screen.
 */
import { formatDistance } from '@/lib/format';
import { distanceMeters, type LatLng } from '@/lib/geo';

export interface DistanceFields {
  /** Metres from the viewer, or null when the viewer's location is unknown. */
  distance: number | null;
  distanceLabel: string | null;
}

export function distanceFields(origin: LatLng | null, p: LatLng): DistanceFields {
  if (!origin) return { distance: null, distanceLabel: null };
  const d = distanceMeters(origin, p);
  return { distance: d, distanceLabel: formatDistance(d) };
}
