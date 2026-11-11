/**
 * Admin read/write of restaurants (#8). Server-only.
 * - A save replaces the whole editable document in one transaction (row + areas + tags
 *   + hours + menu), recomputes search_text and writes a field-level audit diff.
 * - Status changes are separate calls (verify needs a method; decision #6).
 * - Editors only touch restaurants in their areas, before AND after the change.
 * - Public pages are revalidated (ISR) for every slug/dish/district touched.
 */
import { and, asc, desc, eq, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db/client';
import { latOf, lngOf } from '@/db/point';
import {
  areas,
  auditLog,
  menuItems,
  openingHours,
  photos,
  restaurantAreas,
  restaurantTags,
  restaurants,
  tags,
  users,
} from '@/db/schema';
import { saigonDate } from '@/lib/admin/time';
import { photoUrl } from '@/lib/photo-url';
import { toSearchText } from '@/lib/search/normalize';
import { searchTextFor } from '@/lib/search/search-text';
import { reverifyDueAt } from '@/lib/verification';
import { audit, diffFields } from './audit';
import { canEditAreas, fail } from './guard';
import { VIBES_VERSION, missingForPublish, type RestaurantInputT, type StatusInputT } from './schemas';
import type { AdminUser } from './session';

const R = restaurants;
const DAY_MS = 86_400_000;
/** "Sắp quá hạn" = re-verification due within this many days (decision A list + Monday email). */
export const DUE_SOON_DAYS = 14;

export interface AdminPhoto {
  id: number;
  kind: 'gallery' | 'menu';
  /** 480 px preview for the admin grid. */
  preview: string | null;
  alt: string;
  width: number;
  height: number;
  credit: string | null;
  sortOrder: number;
  isR2: boolean;
}

export interface AdminRestaurant {
  id: number;
  slug: string;
  status: string;
  source: string;
  /** Slug is frozen once published: changing it would break shared links and search results. */
  slugLocked: boolean;
  verifiedAt: string | null;
  verificationMethod: string | null;
  verifiedByName: string | null;
  reverifyDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  areaIds: number[];
  input: RestaurantInputT;
  photos: AdminPhoto[];
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const hhmm = (t: string) => t.slice(0, 5);

function jsonList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') {
    try {
      return jsonList(JSON.parse(v));
    } catch {
      return [];
    }
  }
  return [];
}
function jsonCriteria(v: unknown): { version: string; checked: boolean[] } | null {
  const o = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown; } catch { return null; } })() : v;
  if (o && typeof o === 'object' && Array.isArray((o as { checked?: unknown }).checked)) return o as { version: string; checked: boolean[] };
  return null;
}

export const slugify = (s: string) => toSearchText(s).replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 100).replace(/-$/, '');

// ── Reading ─────────────────────────────────────────────────────────────────

export async function getAdminRestaurant(id: number): Promise<AdminRestaurant | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: R.id,
      slug: R.slug,
      name: R.name,
      status: R.status,
      source: R.source,
      venueType: R.venueType,
      address: R.address,
      lat: latOf(R.location),
      lng: lngOf(R.location),
      priceMin: R.priceMin,
      priceMax: R.priceMax,
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
      verificationMethod: R.verificationMethod,
      verifiedByName: users.displayName,
      reverifyDueAt: R.reverifyDueAt,
      createdAt: R.createdAt,
      updatedAt: R.updatedAt,
    })
    .from(R)
    .leftJoin(users, eq(users.id, R.verifiedBy))
    .where(eq(R.id, id))
    .limit(1);
  if (!row) return null;

  const [areaRows, tagRows, hourRows, menuRows, photoRows] = await Promise.all([
    db
      .select({ id: areas.id, slug: areas.slug, name: areas.name, kind: areas.kind })
      .from(restaurantAreas)
      .innerJoin(areas, eq(areas.id, restaurantAreas.areaId))
      .where(eq(restaurantAreas.restaurantId, id)),
    db
      .select({ slug: tags.slug, kind: tags.kind, isPrimary: restaurantTags.isPrimary, criteria: restaurantTags.criteria })
      .from(restaurantTags)
      .innerJoin(tags, eq(tags.id, restaurantTags.tagId))
      .where(eq(restaurantTags.restaurantId, id))
      .orderBy(desc(restaurantTags.isPrimary), asc(tags.sortOrder)),
    db
      .select({ day: openingHours.day, open: openingHours.opensAt, close: openingHours.closesAt })
      .from(openingHours)
      .where(eq(openingHours.restaurantId, id))
      .orderBy(asc(openingHours.day), asc(openingHours.opensAt)),
    db
      .select({
        group: menuItems.groupName,
        name: menuItems.name,
        desc: menuItems.description,
        price: menuItems.price,
        mustTry: menuItems.mustTry,
        photoId: menuItems.photoId,
      })
      .from(menuItems)
      .where(eq(menuItems.restaurantId, id))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
    db
      .select({
        id: photos.id,
        kind: photos.kind,
        r2Key: photos.r2Key,
        externalUrl: photos.externalUrl,
        alt: photos.alt,
        width: photos.width,
        height: photos.height,
        credit: photos.credit,
        sortOrder: photos.sortOrder,
      })
      .from(photos)
      .where(eq(photos.restaurantId, id))
      .orderBy(asc(photos.sortOrder), asc(photos.id)),
  ]);

  const dishes = tagRows.filter((t) => t.kind === 'dish');
  const primary = dishes.find((t) => t.isPrimary)?.slug ?? dishes[0]?.slug ?? null;
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    source: row.source,
    slugLocked: row.verifiedAt != null,
    verifiedAt: iso(row.verifiedAt),
    verificationMethod: row.verificationMethod,
    verifiedByName: row.verifiedByName,
    reverifyDueAt: iso(row.reverifyDueAt),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    areaIds: areaRows.map((a) => a.id),
    input: {
      name: row.name,
      slug: row.slug,
      venueType: row.venueType,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      district: areaRows.find((a) => a.kind === 'legacy_district')?.slug ?? '',
      ward: areaRows.find((a) => a.kind === 'ward')?.name ?? null,
      priceMin: row.priceMin,
      priceMax: row.priceMax,
      highlight: row.highlight,
      tip: row.tip,
      busyHint: row.busyHint,
      phone: row.phone,
      grabUrl: row.grabUrl,
      shopeeUrl: row.shopeeUrl,
      editorPick: row.editorPick,
      ratingAvg: row.ratingAvg == null ? null : Number(row.ratingAvg),
      ratingCount: row.ratingCount,
      features: jsonList(row.features),
      amenities: jsonList(row.amenities),
      dishes: dishes.map((t) => t.slug),
      primaryDish: primary,
      vibes: tagRows
        .filter((t) => t.kind === 'vibe')
        .map((t) => ({ slug: t.slug, checked: jsonCriteria(t.criteria)?.checked ?? [true, true, true] })),
      hours: hourRows.map((h) => ({ day: h.day, open: hhmm(h.open), close: hhmm(h.close) })),
      menu: menuRows.map((m) => ({ group: m.group, name: m.name, desc: m.desc, price: m.price, mustTry: m.mustTry, photoId: m.photoId })),
      source: row.source === 'osm' ? 'osm' : 'editor',
    },
    photos: photoRows.map((p) => ({
      id: p.id,
      kind: p.kind,
      preview: photoUrl(p, 480),
      alt: p.alt,
      width: p.width,
      height: p.height,
      credit: p.credit,
      sortOrder: p.sortOrder,
      isR2: !!p.r2Key,
    })),
  };
}

export interface AdminListRow {
  id: number;
  slug: string;
  name: string;
  status: string;
  district: string | null;
  verifiedAt: string | null;
  reverifyDueAt: string | null;
  updatedAt: string;
  updatedByName: string | null;
}

/** Editors see only their areas; an editor without areas sees nothing. */
function scopeFor(user: AdminUser): SQL | undefined {
  if (user.isAdmin) return undefined;
  if (!user.areaIds.length) return sql`FALSE`;
  return sql`EXISTS (SELECT 1 FROM restaurant_areas ra WHERE ra.restaurant_id = ${R.id} AND ra.area_id IN (${sql.join(
    user.areaIds.map((a) => sql`${a}`),
    sql`, `,
  )}))`;
}

/** Due for re-verification within DUE_SOON_DAYS (or overdue, or never verified). Verified restaurants only. */
export const dueSoon = (now: Date) =>
  and(eq(R.status, 'verified'), or(isNull(R.reverifyDueAt), lte(R.reverifyDueAt, new Date(now.getTime() + DUE_SOON_DAYS * DAY_MS))));

export async function listAdminRestaurants(
  user: AdminUser,
  f: { q?: string; status?: string; district?: string; due?: boolean },
  now = new Date(),
): Promise<AdminListRow[]> {
  const conds: (SQL | undefined)[] = [scopeFor(user)];
  if (f.q) {
    const term = toSearchText(f.q).replace(/[\\%_]/g, (c) => `\\${c}`);
    if (term) conds.push(sql`${R.searchText} LIKE ${`%${term}%`}`);
  }
  if (f.status && ['draft', 'pending', 'verified', 'temp_closed', 'closed'].includes(f.status)) {
    conds.push(sql`${R.status} = ${f.status}`);
  }
  if (f.district) {
    conds.push(sql`EXISTS (SELECT 1 FROM restaurant_areas ra JOIN areas a ON a.id = ra.area_id WHERE ra.restaurant_id = ${R.id} AND a.slug = ${f.district})`);
  }
  if (f.due) conds.push(dueSoon(now));

  const districtName = sql<string | null>`(SELECT a.name FROM restaurant_areas ra JOIN areas a ON a.id = ra.area_id
    WHERE ra.restaurant_id = ${R.id} AND a.kind = 'legacy_district' LIMIT 1)`;
  const rows = await getDb()
    .select({
      id: R.id,
      slug: R.slug,
      name: R.name,
      status: R.status,
      district: districtName,
      verifiedAt: R.verifiedAt,
      reverifyDueAt: R.reverifyDueAt,
      updatedAt: R.updatedAt,
      updatedByName: users.displayName,
    })
    .from(R)
    .leftJoin(users, eq(users.id, R.updatedBy))
    .where(and(...conds.filter((c): c is SQL => !!c)))
    .orderBy(...(f.due ? [asc(sql`COALESCE(${R.reverifyDueAt}, '1970-01-01')`)] : [desc(R.updatedAt)]), asc(R.id))
    .limit(500);
  return rows.map((r) => ({
    ...r,
    verifiedAt: iso(r.verifiedAt),
    reverifyDueAt: iso(r.reverifyDueAt),
    updatedAt: iso(r.updatedAt)!,
  }));
}

export async function listAreas() {
  return getDb()
    .select({ id: areas.id, slug: areas.slug, name: areas.name, kind: areas.kind, isLive: areas.isLive })
    .from(areas)
    .orderBy(asc(areas.kind), asc(areas.name));
}

export async function restaurantHistory(id: number, limit = 40) {
  const rows = await getDb()
    .select({ id: auditLog.id, action: auditLog.action, diff: auditLog.diff, createdAt: auditLog.createdAt, userName: users.displayName })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(and(eq(auditLog.entity, 'restaurant'), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.id))
    .limit(limit);
  return rows.map((r) => {
    const diff = typeof r.diff === 'string' ? (() => { try { return JSON.parse(r.diff as string) as unknown; } catch { return null; } })() : r.diff;
    return { ...r, diff, createdAt: iso(r.createdAt)! };
  });
}

// ── Writing ─────────────────────────────────────────────────────────────────

async function uniqueSlug(base: string, exceptId: number | null): Promise<string> {
  const root = base || 'quan';
  const rows = await getDb()
    .select({ id: R.id, slug: R.slug })
    .from(R)
    .where(or(eq(R.slug, root), sql`${R.slug} LIKE ${`${root}-%`}`));
  const taken = new Set(rows.filter((r) => r.id !== exceptId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 500; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return fail(409, 'slug_taken', 'Không tạo được slug, hãy đặt slug khác.');
}

/** Public paths a restaurant appears on (ISR). */
export function publicPaths(r: { slug: string; dishes: string[]; district: string }): string[] {
  return [
    `/quan/${r.slug}`,
    ...r.dishes.map((d) => `/mon/${d}`),
    ...(r.district ? [`/khu-vuc/${r.district}`, ...r.dishes.map((d) => `/khu-vuc/${r.district}/${d}`)] : []),
  ];
}

export function revalidateRestaurant(...versions: ({ slug: string; dishes: string[]; district: string } | null | undefined)[]) {
  const paths = new Set(versions.flatMap((v) => (v ? publicPaths(v) : [])));
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch (e) {
      console.error('[admin] revalidatePath failed', p, (e as Error).message);
    }
  }
}

const pub = (r: AdminRestaurant | null) => (r ? { slug: r.slug, dishes: r.input.dishes, district: r.input.district } : null);

export async function saveRestaurant(
  user: AdminUser,
  id: number | null,
  input: RestaurantInputT,
  opts: { revalidate?: boolean } = {},
): Promise<{ id: number; slug: string }> {
  const db = getDb();
  const before = id ? await getAdminRestaurant(id) : null;
  if (id && !before) fail(404, 'not_found', 'Không tìm thấy quán.');
  if (before && !canEditAreas(user, before.areaIds)) fail(403, 'out_of_scope', 'Quán này nằm ngoài khu vực bạn phụ trách.');

  const [district] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.slug, input.district), eq(areas.kind, 'legacy_district')))
    .limit(1);
  if (!district) return fail(400, 'invalid_district', 'Quận không hợp lệ.');

  // Ward (new administrative unit): created on first use so editors are not blocked.
  let wardId: number | null = null;
  if (input.ward) {
    const wardSlug = slugify(input.ward);
    if (!wardSlug) fail(400, 'invalid_ward', 'Tên phường không hợp lệ.');
    await db
      .insert(areas)
      .values({ slug: wardSlug, name: input.ward, kind: 'ward', parentId: district.id, isLive: true })
      .onDuplicateKeyUpdate({ set: { slug: sql`slug` } });
    const [w] = await db.select({ id: areas.id, kind: areas.kind }).from(areas).where(eq(areas.slug, wardSlug)).limit(1);
    if (!w || w.kind !== 'ward') fail(400, 'invalid_ward', 'Tên phường trùng với một khu vực khác.');
    wardId = w!.id;
  }
  const areaIds = [district.id, ...(wardId ? [wardId] : [])];
  if (!canEditAreas(user, areaIds)) fail(403, 'out_of_scope', 'Bạn chỉ được nhập quán trong khu vực phụ trách.');

  const slug = before?.slugLocked ? before.slug : await uniqueSlug(input.slug || slugify(input.name), id);
  const primary = input.primaryDish ?? input.dishes[0] ?? null;
  const dishes = primary ? [primary, ...input.dishes.filter((d) => d !== primary)] : [];

  // Menu photos must belong to this restaurant.
  const photoIds = [...new Set(input.menu.flatMap((m) => (m.photoId ? [m.photoId] : [])))];
  if (photoIds.length) {
    if (!id) fail(400, 'invalid_photo', 'Lưu quán trước rồi mới gắn ảnh cho món.');
    const own = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.restaurantId, id!), inArray(photos.id, photoIds)));
    if (own.length !== photoIds.length) fail(400, 'invalid_photo', 'Ảnh của món không thuộc quán này.');
  }

  const tagRows = await db.select({ id: tags.id, slug: tags.slug, kind: tags.kind }).from(tags);
  const tagId = (kind: string, slug: string) => tagRows.find((t) => t.kind === kind && t.slug === slug)?.id;
  // A vibe tag needs every criterion ticked (ops doc: "phải đạt đủ cả 3 điều kiện").
  const vibes = input.vibes.filter((v) => v.checked.every(Boolean));

  const priceChanged = !before || before.input.priceMin !== input.priceMin || before.input.priceMax !== input.priceMax;
  const values = {
    slug,
    name: input.name,
    venueType: input.venueType,
    address: input.address,
    location: { lat: input.lat, lng: input.lng },
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    ...(priceChanged ? { priceUpdatedAt: saigonDate() } : {}),
    ratingAvg: input.ratingAvg == null ? null : input.ratingAvg.toFixed(1),
    ratingCount: input.ratingCount,
    editorPick: input.editorPick,
    highlight: input.highlight,
    features: input.features,
    amenities: input.amenities,
    tip: input.tip,
    busyHint: input.busyHint,
    phone: input.phone,
    grabUrl: input.grabUrl,
    shopeeUrl: input.shopeeUrl,
    searchText: searchTextFor({ ...input, dishes }),
    updatedBy: user.id,
    ...(before ? {} : { source: input.source, createdBy: user.id, status: 'draft' as const }),
  };

  const savedId = await db.transaction(async (tx) => {
    let rid = id;
    if (rid) {
      await tx.update(R).set(values).where(eq(R.id, rid));
    } else {
      const [res] = await tx.insert(R).values(values);
      rid = Number(res.insertId);
    }
    await tx.delete(restaurantAreas).where(eq(restaurantAreas.restaurantId, rid));
    await tx.insert(restaurantAreas).values(areaIds.map((areaId) => ({ restaurantId: rid!, areaId })));

    await tx.delete(restaurantTags).where(eq(restaurantTags.restaurantId, rid));
    const tagValues = [
      ...dishes.flatMap((d) => {
        const t = tagId('dish', d);
        return t ? [{ restaurantId: rid!, tagId: t, isPrimary: d === primary }] : [];
      }),
      ...vibes.flatMap((v) => {
        const t = tagId('vibe', v.slug);
        return t ? [{ restaurantId: rid!, tagId: t, isPrimary: false, criteria: { version: VIBES_VERSION, checked: v.checked } }] : [];
      }),
    ];
    if (tagValues.length) await tx.insert(restaurantTags).values(tagValues);

    await tx.delete(openingHours).where(eq(openingHours.restaurantId, rid));
    if (input.hours.length) {
      await tx
        .insert(openingHours)
        .values(input.hours.map((h) => ({ restaurantId: rid!, day: h.day, opensAt: `${h.open}:00`, closesAt: `${h.close}:00` })));
    }

    await tx.delete(menuItems).where(eq(menuItems.restaurantId, rid));
    if (input.menu.length) {
      await tx.insert(menuItems).values(
        input.menu.map((m, i) => ({
          restaurantId: rid!,
          groupName: m.group,
          name: m.name,
          description: m.desc,
          price: m.price,
          mustTry: m.mustTry,
          photoId: m.photoId,
          sortOrder: i,
        })),
      );
    }

    const after = { ...input, slug, dishes, primaryDish: primary, vibes };
    await audit(tx, {
      userId: user.id,
      action: before ? 'update' : 'create',
      entity: 'restaurant',
      entityId: rid,
      diff: diffFields(before ? (before.input as unknown as Record<string, unknown>) : null, after as unknown as Record<string, unknown>),
    });
    return rid;
  });

  // The file import (#48) runs outside Next and only writes drafts: nothing public to refresh.
  if (opts.revalidate !== false) revalidateRestaurant(pub(before), { slug, dishes, district: input.district });
  return { id: savedId, slug };
}

export async function setRestaurantStatus(
  user: AdminUser,
  id: number,
  change: StatusInputT,
  now = new Date(),
  opts: { revalidate?: boolean } = {},
): Promise<{ status: string }> {
  const db = getDb();
  const current = await getAdminRestaurant(id);
  if (!current) return fail(404, 'not_found', 'Không tìm thấy quán.');
  if (!canEditAreas(user, current.areaIds)) fail(403, 'out_of_scope', 'Quán này nằm ngoài khu vực bạn phụ trách.');

  let set: Partial<typeof R.$inferInsert>;
  switch (change.action) {
    case 'verify': {
      const missing = missingForPublish(current.input);
      if (missing.length) fail(400, 'incomplete', `Chưa xác minh được, còn thiếu: ${missing.join(', ')}.`);
      set = {
        status: 'verified',
        verifiedAt: now,
        verificationMethod: change.method,
        verifiedBy: user.id,
        reverifyDueAt: reverifyDueAt(now.toISOString()),
      };
      break;
    }
    case 'submit':
      if (current.status !== 'draft') fail(400, 'invalid_transition', 'Chỉ gửi duyệt được quán đang ở trạng thái nháp.');
      set = { status: 'pending' };
      break;
    default:
      set = { status: change.action };
  }

  await db.transaction(async (tx) => {
    await tx.update(R).set({ ...set, updatedBy: user.id }).where(eq(R.id, id));
    await audit(tx, {
      userId: user.id,
      action: change.action === 'verify' ? 'verify' : 'status',
      entity: 'restaurant',
      entityId: id,
      diff: { status: [current.status, set.status], ...(change.action === 'verify' ? { method: change.method } : {}) },
    });
  });
  if (opts.revalidate !== false) revalidateRestaurant(pub(current));
  return { status: set.status! };
}
