/**
 * Database source (issue #6). Filtering, distance sorting/radius and "đang mở" run in
 * SQL; only the rows of the requested page are then loaded in full (6 small queries).
 * Rules mirror src/lib/data/demo.ts exactly — scripts/db-parity.ts checks both on
 * MariaDB 11.8 and MySQL 8 in CI. Server-only.
 */
import { and, asc, count, desc, eq, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { bootDatabase } from '@/db/boot';
import { getDb } from '@/db/client';
import { distanceTo, latOf, lngOf, withinBox } from '@/db/point';
import { areas, menuItems, openingHours, photos, restaurantAreas, restaurantTags, restaurants, tags } from '@/db/schema';
import { bboxAround } from '@/lib/geo';
import { LATE_NIGHT_AFTER, saigonClock, toMinutes } from '@/lib/hours';
import type { MenuItem, OpeningSlot, Photo, Restaurant } from '@/lib/types';
import type { RestaurantSource, SearchQuery } from './source';

/** Waits for the staging boot hook (migrations) once, then returns the pool-backed client. */
async function db() {
  await bootDatabase();
  return getDb();
}

const R = restaurants;
const isPublic = eq(R.status, 'verified');

// ── Filters (each mirrors a line of demo.ts) ────────────────────────────────

const list = (values: string[]) => sql.join(values.map((v) => sql`${v}`), sql`, `);

const hasDish = (slugs: string[]) =>
  sql`EXISTS (SELECT 1 FROM restaurant_tags rt JOIN tags t ON t.id = rt.tag_id
      WHERE rt.restaurant_id = ${R.id} AND t.kind = 'dish' AND t.slug IN (${list(slugs)}))`;

const hasDishInGroup = (group: string) =>
  sql`EXISTS (SELECT 1 FROM restaurant_tags rt JOIN tags t ON t.id = rt.tag_id
      WHERE rt.restaurant_id = ${R.id} AND t.kind = 'dish' AND t.group_slug = ${group})`;

const inArea = (slug: string) =>
  sql`EXISTS (SELECT 1 FROM restaurant_areas ra JOIN areas a ON a.id = ra.area_id
      WHERE ra.restaurant_id = ${R.id} AND a.slug = ${slug})`;

/** Top of the price range ≤ max; unknown price never matches (NULL comparison is false). */
const priceAtMost = (max: number) => sql`COALESCE(${R.priceMax}, ${R.priceMin}) <= ${max}`;

/** Whole-word match on the padded search_text, one LIKE per term (AND). */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const hasTerm = (term: string) => sql`${R.searchText} LIKE ${`% ${escapeLike(term)} %`}`;

const OPENS = sql.raw('TIME_TO_SEC(oh.opens_at)');
const CLOSES = sql.raw('TIME_TO_SEC(oh.closes_at)');

/** "Ăn khuya": some window runs past midnight or closes after 22:00 (lib/hours isLateNight). */
const lateNight = () =>
  sql`EXISTS (SELECT 1 FROM opening_hours oh WHERE oh.restaurant_id = ${R.id}
      AND (${CLOSES} <= ${OPENS} OR ${CLOSES} > ${toMinutes(LATE_NIGHT_AFTER) * 60}))`;

/**
 * Open at `now` in Saigon time — the same three cases as lib/hours openState:
 * a same-day window, tonight's overnight window, yesterday's overnight window still running.
 */
export function openAt(now: Date): SQL {
  const { day, minutes } = saigonClock(now);
  const t = minutes * 60;
  const yesterday = (day + 6) % 7;
  return sql`EXISTS (SELECT 1 FROM opening_hours oh WHERE oh.restaurant_id = ${R.id} AND (
      (oh.day = ${day} AND ${CLOSES} > ${OPENS} AND ${t} >= ${OPENS} AND ${t} < ${CLOSES})
      OR (oh.day = ${day} AND ${CLOSES} <= ${OPENS} AND ${t} >= ${OPENS})
      OR (oh.day = ${yesterday} AND ${CLOSES} <= ${OPENS} AND ${t} < ${CLOSES})))`;
}

function whereFor({ filters, origin, now, bbox }: SearchQuery): SQL {
  const conds: SQL[] = [isPublic];
  if (filters.dishes.length) conds.push(hasDish(filters.dishes));
  if (filters.group) conds.push(hasDishInGroup(filters.group));
  if (filters.district) conds.push(inArea(filters.district));
  if (filters.priceMax != null) conds.push(priceAtMost(filters.priceMax));
  if (filters.lateNight) conds.push(lateNight());
  if (bbox) conds.push(withinBox(R.location, bbox));
  for (const term of filters.terms) conds.push(hasTerm(term));
  if (filters.openNow) conds.push(openAt(now));
  // Radius needs a real origin; without one it is ignored (reported by lib/restaurants).
  if (filters.radiusKm != null && origin) {
    const meters = filters.radiusKm * 1000;
    conds.push(withinBox(R.location, bboxAround(origin, meters))); // SPATIAL INDEX pre-filter
    conds.push(sql`${distanceTo(R.location, origin)} <= ${meters}`);
  }
  return and(...conds)!;
}

function orderFor({ filters, origin }: SearchQuery): SQL[] {
  const rating = sql`COALESCE(${R.ratingAvg}, 0)`;
  // `id` keeps ties stable (= the order editors created restaurants, like the demo list order).
  if (filters.sort === 'rating') return [desc(rating), asc(R.id)];
  if (origin) return [asc(distanceTo(R.location, origin)), asc(R.id)];
  return [desc(R.editorPick), desc(rating), asc(R.id)];
}

// ── Loading full restaurants ────────────────────────────────────────────────

/** JSON columns come back parsed on MySQL and as text on MariaDB (JSON = LONGTEXT there). */
function stringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') {
    try {
      return stringList(JSON.parse(v));
    } catch {
      return [];
    }
  }
  return [];
}

const hhmm = (time: string) => time.slice(0, 5);
const iso = (d: Date | null) => (d ? d.toISOString() : '');

/** Drop null/false optionals so DB rows have the same shape as the demo objects. */
const opt = <K extends string, V>(key: K, value: V | null | undefined | false) =>
  (value == null || value === false ? {} : { [key]: value }) as Partial<Record<K, V>>;

type PhotoRow = {
  id: number;
  rid: number;
  kind: 'gallery' | 'menu';
  r2Key: string | null;
  externalUrl: string | null;
  width: number;
  height: number;
  alt: string;
  credit: string | null;
  creditUrl: string | null;
};

function toPhoto(p: PhotoRow): Photo | null {
  // R2 keys go through the next/image loader (lib/image-loader.ts); demo photos are full URLs.
  const src = p.r2Key ?? p.externalUrl;
  if (!src) return null;
  return {
    src,
    alt: p.alt,
    width: p.width,
    height: p.height,
    ...(p.credit ? { credit: { name: p.credit, url: p.creditUrl ?? '' } } : {}),
  };
}

function groupBy<T extends { rid: number }>(rows: T[]): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const row of rows) {
    const arr = m.get(row.rid);
    if (arr) arr.push(row);
    else m.set(row.rid, [row]);
  }
  return m;
}

/** Full Restaurant objects for public ids, in the given id order. */
async function load(ids: number[]): Promise<Restaurant[]> {
  if (!ids.length) return [];
  const conn = await db();

  const [base, dishRows, areaRows, hourRows, photoRows, menuRows] = await Promise.all([
    conn
      .select({
        id: R.id,
        slug: R.slug,
        name: R.name,
        venueType: R.venueType,
        address: R.address,
        lat: latOf(R.location),
        lng: lngOf(R.location),
        priceMin: R.priceMin,
        priceMax: R.priceMax,
        priceUpdatedAt: R.priceUpdatedAt,
        ratingAvg: R.ratingAvg,
        ratingCount: R.ratingCount,
        editorPick: R.editorPick,
        highlight: R.highlight,
        features: R.features,
        amenities: R.amenities,
        tip: R.tip,
        busyHint: R.busyHint,
        phone: R.phone,
        grabUrl: R.grabUrl,
        shopeeUrl: R.shopeeUrl,
        verifiedAt: R.verifiedAt,
      })
      .from(R)
      .where(and(isPublic, inArray(R.id, ids))),
    conn
      .select({ rid: restaurantTags.restaurantId, slug: tags.slug, isPrimary: restaurantTags.isPrimary })
      .from(restaurantTags)
      .innerJoin(tags, eq(tags.id, restaurantTags.tagId))
      .where(and(inArray(restaurantTags.restaurantId, ids), eq(tags.kind, 'dish')))
      // Primary dish first, then taxonomy order.
      .orderBy(desc(restaurantTags.isPrimary), asc(tags.sortOrder), asc(tags.id)),
    conn
      .select({ rid: restaurantAreas.restaurantId, slug: areas.slug })
      .from(restaurantAreas)
      .innerJoin(areas, eq(areas.id, restaurantAreas.areaId))
      .where(and(inArray(restaurantAreas.restaurantId, ids), eq(areas.kind, 'legacy_district'))),
    conn
      .select({ rid: openingHours.restaurantId, day: openingHours.day, open: openingHours.opensAt, close: openingHours.closesAt })
      .from(openingHours)
      .where(inArray(openingHours.restaurantId, ids))
      .orderBy(asc(openingHours.day), asc(openingHours.opensAt)),
    conn
      .select({
        id: photos.id,
        rid: photos.restaurantId,
        kind: photos.kind,
        r2Key: photos.r2Key,
        externalUrl: photos.externalUrl,
        width: photos.width,
        height: photos.height,
        alt: photos.alt,
        credit: photos.credit,
        creditUrl: photos.creditUrl,
      })
      .from(photos)
      .where(inArray(photos.restaurantId, ids))
      .orderBy(asc(photos.sortOrder), asc(photos.id)),
    conn
      .select({
        rid: menuItems.restaurantId,
        group: menuItems.groupName,
        name: menuItems.name,
        desc: menuItems.description,
        price: menuItems.price,
        mustTry: menuItems.mustTry,
        photoId: menuItems.photoId,
      })
      .from(menuItems)
      .where(inArray(menuItems.restaurantId, ids))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
  ]);

  const dishesBy = groupBy(dishRows);
  const areaBy = groupBy(areaRows);
  const hoursBy = groupBy(hourRows);
  const photosBy = groupBy(photoRows);
  const menuBy = groupBy(menuRows);
  const photoById = new Map(photoRows.map((p) => [p.id, p]));

  const byId = new Map(
    base.map((b): [number, Restaurant] => {
      const dishes = (dishesBy.get(b.id) ?? []).map((d) => d.slug);
      const hours: OpeningSlot[] = (hoursBy.get(b.id) ?? []).map((h) => ({ day: h.day, open: hhmm(h.open), close: hhmm(h.close) }));
      const gallery = (photosBy.get(b.id) ?? []).filter((p) => p.kind === 'gallery').flatMap((p) => toPhoto(p) ?? []);
      const menu: MenuItem[] = (menuBy.get(b.id) ?? []).map((m) => {
        const photoRow = m.photoId != null ? photoById.get(m.photoId) : undefined;
        return {
          name: m.name,
          ...opt('desc', m.desc),
          price: m.price,
          group: m.group,
          ...opt('mustTry', m.mustTry),
          ...opt('photo', photoRow ? toPhoto(photoRow) : null),
        };
      });
      return [
        b.id,
        {
          slug: b.slug,
          name: b.name,
          status: 'verified',
          dish: dishes[0] ?? '',
          dishes,
          district: areaBy.get(b.id)?.[0]?.slug ?? '',
          venueType: b.venueType,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          priceMin: b.priceMin,
          priceMax: b.priceMax,
          priceUpdatedAt: b.priceUpdatedAt ?? '',
          verifiedAt: iso(b.verifiedAt),
          rating: { avg: b.ratingAvg == null ? 0 : Number(b.ratingAvg), count: b.ratingCount },
          editorPick: b.editorPick,
          highlight: b.highlight,
          ...opt('tip', b.tip),
          features: stringList(b.features),
          amenities: stringList(b.amenities),
          ...opt('busyHint', b.busyHint),
          hours,
          photos: gallery,
          menu,
          ...opt('phone', b.phone),
          ...opt('grabUrl', b.grabUrl),
          ...opt('shopeeUrl', b.shopeeUrl),
        },
      ];
    }),
  );
  return ids.flatMap((id) => byId.get(id) ?? []);
}

async function publicIds(where: SQL): Promise<number[]> {
  const rows = await (await db()).select({ id: R.id }).from(R).where(and(isPublic, where)).orderBy(asc(R.id));
  return rows.map((r) => r.id);
}

export const dbSource: RestaurantSource = {
  kind: 'db',

  async getBySlug(slug) {
    const [r] = await load(await publicIds(eq(R.slug, slug)));
    return r;
  },

  async getBySlugs(slugs) {
    if (!slugs.length) return [];
    return load(await publicIds(inArray(R.slug, slugs)));
  },

  async listSlugs() {
    const rows = await (await db()).select({ slug: R.slug }).from(R).where(isPublic).orderBy(asc(R.id));
    return rows.map((r) => r.slug);
  },

  async listIndex() {
    const conn = await db();
    const [base, dishRows, areaRows] = await Promise.all([
      conn.select({ id: R.id, slug: R.slug }).from(R).where(isPublic).orderBy(asc(R.id)),
      conn
        .select({ rid: restaurantTags.restaurantId, slug: tags.slug })
        .from(restaurantTags)
        .innerJoin(tags, eq(tags.id, restaurantTags.tagId))
        .where(eq(tags.kind, 'dish'))
        .orderBy(desc(restaurantTags.isPrimary), asc(tags.sortOrder), asc(tags.id)),
      conn
        .select({ rid: restaurantAreas.restaurantId, slug: areas.slug })
        .from(restaurantAreas)
        .innerJoin(areas, eq(areas.id, restaurantAreas.areaId))
        .where(eq(areas.kind, 'legacy_district')),
    ]);
    const dishesBy = groupBy(dishRows);
    const areaBy = groupBy(areaRows);
    return base.map((b) => ({
      slug: b.slug,
      dishes: (dishesBy.get(b.id) ?? []).map((d) => d.slug),
      district: areaBy.get(b.id)?.[0]?.slug ?? '',
    }));
  },

  async search(q) {
    const conn = await db();
    const where = whereFor(q);
    const [rows, [totalRow]] = await Promise.all([
      conn
        .select({ id: R.id })
        .from(R)
        .where(where)
        .orderBy(...orderFor(q))
        .limit(q.limit)
        .offset(q.offset),
      conn.select({ n: count() }).from(R).where(where),
    ]);
    return { restaurants: await load(rows.map((r) => r.id)), total: Number(totalRow?.n ?? 0) };
  },

  async countAll() {
    const [row] = await (await db()).select({ n: count() }).from(R).where(isPublic);
    return Number(row?.n ?? 0);
  },

  async countOpen(now) {
    const [row] = await (await db()).select({ n: count() }).from(R).where(and(isPublic, openAt(now)));
    return Number(row?.n ?? 0);
  },

  async overdue(now) {
    // reverify_due_at = verified_at + REVERIFY_DAYS (set by seed/admin); missing → overdue.
    const rows = await (await db())
      .select({ slug: R.slug, name: R.name, verifiedAt: R.verifiedAt })
      .from(R)
      .where(and(isPublic, or(isNull(R.reverifyDueAt), lte(R.reverifyDueAt, now))))
      .orderBy(asc(R.verifiedAt), asc(R.id));
    return rows.map((r) => ({ slug: r.slug, name: r.name, verifiedAt: iso(r.verifiedAt) }));
  },
};
