import { customType } from 'drizzle-orm/mysql-core';
import { sql, type SQL } from 'drizzle-orm';
import type { LatLng } from '@/lib/geo';

/**
 * Restaurant location as a spatial POINT with a SPATIAL INDEX (decision #8, 09/11).
 *
 * Hostinger's Web/Cloud plans run **MariaDB**, not MySQL 8. MariaDB has no
 * `SRID 4326` column attribute, no ST_Latitude/ST_Longitude and no axis-order
 * option, so the portable form is used and CI tests it on both engines:
 * - column `POINT NOT NULL` (SRID 0) + SPATIAL INDEX (bounding-box lookups)
 * - x = longitude, y = latitude (standard WKT order)
 * - metres via ST_Distance_Sphere, which on both engines reads x as longitude
 * Read coordinates with lngOf/latOf, never by parsing the raw column.
 */
export const point = customType<{ data: LatLng; driverData: unknown }>({
  dataType() {
    return 'point';
  },
  toDriver(p: LatLng): SQL {
    return pointSql(p);
  },
  fromDriver(): LatLng {
    throw new Error('Select location via latOf/lngOf, not the raw POINT column.');
  },
});

export function pointSql(p: LatLng): SQL {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) throw new Error('Invalid coordinates');
  return sql`ST_GeomFromText(${`POINT(${p.lng} ${p.lat})`})`;
}

export const lngOf = (column: unknown) => sql<number>`ST_X(${column})`.mapWith(Number);
export const latOf = (column: unknown) => sql<number>`ST_Y(${column})`.mapWith(Number);

/** Metres between a POINT column and a viewer location. */
export const distanceTo = (column: unknown, p: LatLng) =>
  sql<number>`ST_Distance_Sphere(${column}, ${pointSql(p)})`.mapWith(Number);

/** Bounding-box pre-filter that can use the SPATIAL INDEX. */
export function withinBox(column: unknown, b: { minLat: number; maxLat: number; minLng: number; maxLng: number }): SQL {
  const ring = `POLYGON((${b.minLng} ${b.minLat}, ${b.maxLng} ${b.minLat}, ${b.maxLng} ${b.maxLat}, ${b.minLng} ${b.maxLat}, ${b.minLng} ${b.minLat}))`;
  return sql`MBRContains(ST_GeomFromText(${ring}), ${column})`;
}
