/**
 * Demo ↔ DB parity (issue #6). Runs in CI on MariaDB 11.8 and MySQL 8 after the demo
 * seed: every read the pages make must give the same answer from the database as from
 * the in-memory demo list — same restaurants, same order, same totals, same card data.
 *
 * A draft restaurant is inserted first (and removed at the end): it must never show up.
 */
import { deepStrictEqual } from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import { getDb } from '@/db/client';
import { areas, openingHours, restaurantAreas, restaurantTags, restaurants, tags } from '@/db/schema';
import { toCard, toHit } from '@/lib/cards';
import { dbSource } from '@/lib/data/db';
import { demoSource, demoSearchText } from '@/lib/data/demo';
import type { RestaurantSource, SearchQuery } from '@/lib/data/source';
import { bboxAround, type BBox, type LatLng } from '@/lib/geo';
import { parseQuery } from '@/lib/search/rule-parser';
import { DISHES, DISTRICTS, GROUPS } from '@/lib/taxonomy';
import type { Restaurant, SearchFilters } from '@/lib/types';

const DRAFT_SLUG = 'zz-parity-draft';

let checks = 0;
const failures: string[] = [];

function same(label: string, db: unknown, demo: unknown) {
  checks++;
  try {
    deepStrictEqual(db, demo);
  } catch {
    failures.push(`${label}\n    db:   ${JSON.stringify(db).slice(0, 600)}\n    demo: ${JSON.stringify(demo).slice(0, 600)}`);
  }
}

/** Order-insensitive parts and representation-only differences are normalised. */
function norm(r: Restaurant | undefined) {
  if (!r) return r;
  // JSON round-trip drops undefined keys; isDemo only exists on the in-memory list.
  const plain = JSON.parse(JSON.stringify({ ...r, isDemo: undefined })) as Restaurant;
  return {
    ...plain,
    // Primary dish first; the rest in any order (demo lists them by hand, the DB by taxonomy).
    dishes: [r.dish, ...r.dishes.filter((d) => d !== r.dish).sort()],
    // '2026-10-20' (demo) and '2026-10-20T00:00:00.000Z' (DB) are the same instant.
    verifiedAt: Date.parse(r.verifiedAt),
  };
}

// ── Inputs ──────────────────────────────────────────────────────────────────

const BEN_THANH: LatLng = { lat: 10.7725, lng: 106.698 };
const ORIGINS: (LatLng | null)[] = [null, BEN_THANH, { lat: 10.765, lng: 106.604 }, { lat: 10.758, lng: 106.705 }, { lat: 10.9, lng: 106.5 }];

const at = (s: string) => new Date(s);
const TIMES = [
  at('2026-11-09T12:00:00+07:00'), // Monday noon
  at('2026-11-10T00:30:00+07:00'), // after midnight: yesterday's overnight windows
  at('2026-11-10T03:00:00+07:00'),
  at('2026-11-10T05:30:00+07:00'), // exactly an opening time
  at('2026-11-10T21:59:00+07:00'),
  at('2026-11-10T22:00:00+07:00'), // exactly a closing time
  at('2026-11-15T23:45:00+07:00'), // Sunday night
  at('2027-03-01T12:00:00+07:00'), // every demo restaurant past its 90-day re-verification
];

const QUERIES = [
  '',
  'bún bò',
  'bun bo hue',
  'com tam',
  'chả cua',
  'món nước gần đây dưới 50k',
  'ăn khuya q1',
  'ốc đang mở',
  'cà phê q3',
  'quán chay',
  'hủ tiếu gõ ăn khuya',
  'bánh mì dưới 30k',
  'lẩu',
  'xyz không có',
];

const F = (f: Partial<SearchFilters>): SearchFilters => ({ terms: [], dishes: [], ...f });

const FILTERS: SearchFilters[] = [
  ...QUERIES.map((q) => parseQuery(q)),
  ...DISHES.map((d) => F({ dishes: [d.slug] })),
  ...GROUPS.map((g) => F({ group: g.slug })),
  ...DISTRICTS.map((d) => F({ district: d.slug })),
  ...DISTRICTS.map((d) => F({ district: d.slug, sort: 'rating' })),
  F({ dishes: ['bun-bo', 'pho'] }),
  F({ priceMax: 50000 }),
  F({ priceMax: 30000, openNow: true }),
  F({ lateNight: true }),
  F({ openNow: true }),
  F({ openNow: true, lateNight: true }),
  F({ sort: 'rating' }),
  F({ radiusKm: 1 }),
  F({ radiusKm: 2, openNow: true }),
  F({ radiusKm: 5, sort: 'rating' }),
  F({ terms: ['bo'] }),
  F({ terms: ['cha', 'cua'] }),
  F({ terms: ['100%_'] }),
];

/** Map viewports, including one whose edge passes exactly through a restaurant. */
function bboxes(): (BBox | undefined)[] {
  const r = DEMO_RESTAURANTS[0]!;
  return [undefined, bboxAround(BEN_THANH, 1500), { minLat: r.lat, maxLat: r.lat + 0.01, minLng: r.lng - 0.01, maxLng: r.lng + 0.01 }];
}

// ── Checks ──────────────────────────────────────────────────────────────────

async function compareSearch(q: SearchQuery, label: string) {
  const [db, demo] = await Promise.all([dbSource.search(q), demoSource.search(q)]);
  same(`${label} total`, db.total, demo.total);
  same(`${label} slugs`, db.restaurants.map((r) => r.slug), demo.restaurants.map((r) => r.slug));
  // What the pages actually render.
  const cards = (src: Restaurant[]) => src.map((r) => toCard(toHit(r, q.origin, q.now), q.now));
  same(`${label} cards`, cards(db.restaurants), cards(demo.restaurants));
}

async function insertDraft() {
  const db = getDb();
  const src = DEMO_RESTAURANTS[0]!;
  const [res] = await db.insert(restaurants).values({
    slug: DRAFT_SLUG,
    name: `${src.name} (nháp)`,
    status: 'draft',
    venueType: src.venueType,
    address: src.address,
    location: { lat: BEN_THANH.lat, lng: BEN_THANH.lng }, // right where the radius searches look
    priceMin: 10000,
    priceMax: 10000,
    editorPick: true,
    ratingAvg: '5.0',
    searchText: demoSearchText(src),
    verifiedAt: new Date('2026-01-01'),
    reverifyDueAt: new Date('2026-01-02'), // also "overdue": must still stay out of the cron list
  });
  const id = Number(res.insertId);
  const dishTag = (await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, src.dish)))[0];
  const area = (await db.select({ id: areas.id }).from(areas).where(eq(areas.slug, src.district)))[0];
  if (dishTag) await db.insert(restaurantTags).values({ restaurantId: id, tagId: dishTag.id, isPrimary: true });
  if (area) await db.insert(restaurantAreas).values({ restaurantId: id, areaId: area.id });
  await db.insert(openingHours).values([0, 1, 2, 3, 4, 5, 6].map((day) => ({ restaurantId: id, day, opensAt: '00:00:00', closesAt: '23:59:00' })));
}

async function main() {
  await insertDraft();
  const sources: [string, RestaurantSource][] = [
    ['db', dbSource],
    ['demo', demoSource],
  ];

  // Single lookups.
  same('listSlugs', await dbSource.listSlugs(), await demoSource.listSlugs());
  const index = async (s: RestaurantSource) =>
    (await s.listIndex()).map((r) => ({ ...r, dishes: [...r.dishes].sort() }));
  same('listIndex', await index(dbSource), await index(demoSource));
  same('countAll', await dbSource.countAll(), await demoSource.countAll());
  for (const r of DEMO_RESTAURANTS) {
    same(`getBySlug ${r.slug}`, norm(await dbSource.getBySlug(r.slug)), norm(await demoSource.getBySlug(r.slug)));
  }
  for (const [name, s] of sources) {
    same(`${name} hides drafts and unknown slugs`, await s.getBySlug(DRAFT_SLUG), undefined);
  }
  const mixed = [DEMO_RESTAURANTS[3]!.slug, 'khong-ton-tai', DRAFT_SLUG, DEMO_RESTAURANTS[0]!.slug];
  const slugsOf = async (s: RestaurantSource) => (await s.getBySlugs(mixed)).map((r) => r.slug).sort();
  same('getBySlugs', await slugsOf(dbSource), await slugsOf(demoSource));

  for (const now of TIMES) {
    const t = now.toISOString();
    same(`countOpen ${t}`, await dbSource.countOpen(now), await demoSource.countOpen(now));
    const overdue = async (s: RestaurantSource) =>
      (await s.overdue(now)).map((o) => ({ slug: o.slug, name: o.name, verifiedAt: Date.parse(o.verifiedAt) }));
    same(`overdue ${t}`, await overdue(dbSource), await overdue(demoSource));
  }

  // Search matrix: filters × origins × a few times; viewports and paging on a subset.
  for (const [i, filters] of FILTERS.entries()) {
    for (const origin of ORIGINS) {
      const times = filters.openNow ? TIMES : [TIMES[0]!];
      for (const now of times) {
        const label = `search #${i} ${JSON.stringify(filters)} origin=${origin ? `${origin.lat},${origin.lng}` : '-'} at=${now.toISOString()}`;
        await compareSearch({ filters, origin, now, limit: 50, offset: 0 }, label);
      }
    }
  }
  for (const bbox of bboxes()) {
    for (const filters of [F({}), F({ openNow: true }), F({ group: 'mon-nuoc' })]) {
      for (const now of [TIMES[0]!, TIMES[1]!]) {
        await compareSearch({ filters, origin: BEN_THANH, now, bbox, limit: 50, offset: 0 }, `bbox ${JSON.stringify(bbox)} ${JSON.stringify(filters)}`);
      }
    }
  }
  for (const origin of [null, BEN_THANH]) {
    for (const offset of [0, 3, 6, 12, 30]) {
      await compareSearch({ filters: F({}), origin, now: TIMES[0]!, limit: 3, offset }, `paging origin=${!!origin} offset=${offset}`);
    }
  }

  await getDb().delete(restaurants).where(eq(restaurants.slug, DRAFT_SLUG));

  if (failures.length) {
    console.error(`FAIL: ${failures.length}/${checks} parity checks differ (first 15):\n- ${failures.slice(0, 15).join('\n- ')}`);
    process.exit(1);
  }
  console.warn(`OK: ${checks} parity checks — database and demo data agree.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
