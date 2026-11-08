export interface LatLng {
  lat: number;
  lng: number;
}

/** Default centre when location is unknown or denied: Bến Thành, Quận 1. */
export const DEFAULT_CENTER: LatLng = { lat: 10.7725, lng: 106.698 };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres (matches MySQL ST_Distance_Sphere closely enough for UI). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Bounding box around a centre — the cheap pre-filter before computing exact distances in SQL. */
export function bboxAround(center: LatLng, radiusMeters: number): BBox {
  const dLat = (radiusMeters / R) * (180 / Math.PI);
  const dLng = dLat / Math.cos(rad(center.lat));
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  };
}

export const inBBox = (p: LatLng, b: BBox) =>
  p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;

/** "bbox=minLng,minLat,maxLng,maxLat" (Mapbox order). */
export function parseBBox(value: string | null | undefined): BBox | undefined {
  if (!value) return undefined;
  const n = value.split(',').map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return undefined;
  const [minLng, minLat, maxLng, maxLat] = n as [number, number, number, number];
  return { minLat, maxLat, minLng, maxLng };
}

/** Rough scooter time in the city (~18 km/h incl. lights). */
export const scooterMinutes = (meters: number) => Math.max(1, Math.round(meters / 300));
