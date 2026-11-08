/**
 * CI smoke test against a real MariaDB / MySQL after migrate + seed:
 * spatial index exists, coordinates round-trip, ST_Distance_Sphere agrees with
 * lib/geo (the formula the UI uses), bbox pre-filter returns the right rows.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { getDb } from '@/db/client';
import { distanceTo, latOf, lngOf, withinBox } from '@/db/point';
import { restaurants } from '@/db/schema';
import { bboxAround, distanceMeters } from '@/lib/geo';

const fail = (msg: string): never => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

async function main() {
  const db = getDb();
  const origin = { lat: 10.7725, lng: 106.698 }; // Bến Thành

  const [version] = (await db.execute(sql`SELECT VERSION() AS v`)) as unknown as [[{ v: string }]];
  console.warn(`Engine: ${version[0]?.v}`);

  const [idx] = (await db.execute(
    sql`SELECT INDEX_NAME AS name FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurants' AND INDEX_TYPE = 'SPATIAL'`,
  )) as unknown as [{ name: string }[]];
  if (!idx.length) fail('no SPATIAL index on restaurants.location');

  const rows = await db
    .select({ slug: restaurants.slug, lat: latOf(restaurants.location), lng: lngOf(restaurants.location), d: distanceTo(restaurants.location, origin) })
    .from(restaurants)
    .where(and(eq(restaurants.status, 'verified'), withinBox(restaurants.location, bboxAround(origin, 2000))))
    .orderBy(asc(distanceTo(restaurants.location, origin)));

  const expected = DEMO_RESTAURANTS.filter((r) => distanceMeters(origin, r) <= 2000 * 1.0).map((r) => r.slug);
  if (rows.length === 0) fail('bbox query returned nothing');

  for (const row of rows) {
    const demo = DEMO_RESTAURANTS.find((r) => r.slug === row.slug) ?? fail(`unknown slug ${row.slug}`);
    if (Math.abs(row.lat - demo.lat) > 1e-6 || Math.abs(row.lng - demo.lng) > 1e-6) {
      fail(`${row.slug}: coordinates did not round-trip (${row.lat},${row.lng}) vs (${demo.lat},${demo.lng})`);
    }
    const js = distanceMeters(origin, demo);
    // Earth radius differs slightly between engines and lib/geo; 0.5% is far below what the UI shows.
    if (Math.abs(row.d - js) > Math.max(5, js * 0.005)) fail(`${row.slug}: DB ${row.d.toFixed(0)} m vs JS ${js.toFixed(0)} m`);
  }
  const sorted = rows.every((r, i) => i === 0 || rows[i - 1]!.d <= r.d);
  if (!sorted) fail('results not sorted by distance');
  for (const slug of expected) {
    if (!rows.some((r) => r.slug === slug)) fail(`${slug} is within 2 km but missing from the bbox query`);
  }

  console.warn(`OK: ${rows.length} restaurants within the box, distances match lib/geo, spatial index "${idx[0]!.name}".`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
